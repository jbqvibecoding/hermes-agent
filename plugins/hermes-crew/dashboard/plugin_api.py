"""Hermes Crew dashboard plugin — backend API routes.

Mounted at ``/api/plugins/hermes-crew/`` by the dashboard plugin system
(``hermes_cli/web_server.py::_mount_plugin_api_routes``).

Everything under ``/v1`` speaks **Errand's domain model**
(``errand/src/domain/CloudAgentsClient.ts``), in Errand's own camelCase, so the
browser client is a thin fetch-and-return and the vendored React components and
``useCrewController`` state machine need no translation layer. The shaping all
happens in :mod:`crew.contract`; nothing in this file builds a wire shape by
hand.

Three route groups, and the split is the architecture:

* **Contract reads** (``/v1/agents``, ``/v1/conversations/...``) are plain
  synchronous reads of ``crew.db``.
* **Commands** are 202-shaped in spirit: they never wait for a turn. The one
  exception is ``sendMessage``, which *must* return the ``{turn}:user`` message
  synchronously — the client parses that id to learn which ``{turn}:agent``
  its optimistic reply bubble will become. It still does not wait for the turn;
  it waits only for one INSERT.
* **The event stream** (``/v1/events``) is two tails plus a broadcast: the
  ``messages`` table by rowid, the ``activities`` table by ``seq``, and the
  in-process sink the orchestrator pushes token deltas and status into.
  Anything any process writes reaches the browser — including chips written by
  a routine that fired in the gateway while the dashboard was closed. See
  ``crew/db.py`` for why the database is the bus.

Crew-native routes that Errand has no concept of live alongside without a
prefix: ``/sections`` (the org chart), ``/status`` and ``/seed`` (onboarding),
``/screenshots/...``, and routines.

Two methods of ``CloudAgentsClient`` have no route here on purpose.
``setAgentUnread`` has nothing to write — we do not track unread, and Errand's
own client implements it as a re-read of the agent. ``reconnect`` is a client
concern: it re-opens the socket and re-lists.

Security note
-------------
HTTP routes go through the dashboard's session-token auth middleware
(``web_server.auth_middleware``) like every other ``/api/...`` route. The
WebSocket cannot — browsers cannot set headers on an upgrade — so it delegates
to the dashboard's canonical WS gate, exactly as the kanban plugin does. Do not
replace that with a bespoke token comparison: the canonical gate is what keeps
loopback, OAuth-gated, and server-internal modes all working.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

# See the plugin's __init__.py: this file is exec'd as a flat module with no
# package context, so `crew.*` has to be importable by absolute name.
_PLUGIN_ROOT = str(Path(__file__).resolve().parent.parent)
if _PLUGIN_ROOT not in sys.path:
    sys.path.insert(0, _PLUGIN_ROOT)

from crew import activity as crew_activity  # noqa: E402
from crew import approvals as crew_approvals  # noqa: E402
from crew import artifacts as crew_artifacts  # noqa: E402
from crew import audit as crew_audit  # noqa: E402
from crew import computer as crew_computer  # noqa: E402
from crew import contract  # noqa: E402
from crew import db as crew_db  # noqa: E402
from crew import grants as crew_grants  # noqa: E402
from crew import pages as crew_pages  # noqa: E402
from crew import tasks as crew_tasks  # noqa: E402
from crew import orchestrator, roster, routines, sections  # noqa: E402

log = logging.getLogger(__name__)

router = APIRouter()

# How often the event tail polls for new rows. 400ms keeps chips and activities
# feeling live without spinning two SELECTs per frame; token deltas do not wait
# on it at all — they arrive on the in-process sink and are sent immediately.
_TAIL_INTERVAL_S = 0.4


def _conn():
    """Open the crew DB, creating the schema on first use.

    Every handler goes through this so a fresh install self-heals instead of
    showing "no such table" to whoever opens ``/crew`` first.
    """
    return crew_db.connect()


def _bot_or_404(conn, bot_id: str) -> dict:
    bot = crew_db.get_bot(conn, bot_id)
    if bot is None:
        raise HTTPException(status_code=404, detail=f"No teammate called {bot_id}.")
    return bot


def _ws_upgrade_authorized(ws: WebSocket) -> bool:
    """Delegate to the dashboard's canonical WebSocket auth gate.

    Imported lazily so the plugin still loads under a bare-FastAPI test
    harness, where there is no dashboard context and accepting keeps the tail
    loop testable — same contract as ``plugins/kanban``.
    """
    try:
        from hermes_cli import web_server as _ws
    except Exception:
        return True
    return bool(_ws._ws_auth_ok(ws))  # noqa: SLF001 — the documented gate


# ---------------------------------------------------------------------------
# Transient fan-out
#
# Chips and activities reach the browser through their table tails. Token
# deltas, stream boundaries and teammate status have no durable row to tail —
# they are transients, not history — so they ride a tiny in-process broadcast
# instead. A delta lost to a restart is not worth persisting; the message row
# carries the settled text, and the next turn re-emits status.
# ---------------------------------------------------------------------------

_subscribers: set[asyncio.Queue] = set()
_loop: Optional[asyncio.AbstractEventLoop] = None

#: A slow or wedged browser must not become backpressure on a running turn.
#: Past this depth the socket is considered hopeless and its queue is left to
#: be cleaned up when the reader notices; dropping frames beats blocking the
#: agent that is producing them.
_QUEUE_LIMIT = 2000


def _broadcast(event: dict) -> None:
    """Push one frame to every open socket, from any thread."""
    if _loop is None:
        return
    for queue in list(_subscribers):
        if queue.qsize() > _QUEUE_LIMIT:
            continue
        try:
            _loop.call_soon_threadsafe(queue.put_nowait, event)
        except Exception:
            pass


def _on_status(bot_id: str, state: str) -> None:
    _broadcast(contract.status_changed(bot_id, state))


orchestrator.set_status_sink(_on_status)
orchestrator.set_event_sink(_broadcast)


# ---------------------------------------------------------------------------
# /v1 — agents
# ---------------------------------------------------------------------------


@router.get("/v1/model-providers")
def v1_model_providers():
    return contract.model_provider_catalog(roster.model_providers())


@router.get("/v1/agents")
def v1_list_agents():
    return [contract.agent(view) for view in roster.list_teammates(_conn())]


@router.get("/v1/agents/{agent_id}")
def v1_get_agent(agent_id: str):
    conn = _conn()
    bot = _bot_or_404(conn, agent_id)
    working = agent_id in orchestrator.working_bot_ids()
    return contract.agent(roster.teammate_view(conn, bot, working=working))


class CreateAgentBody(BaseModel):
    """Errand's ``CreateAgentInput`` plus the fields our product has and its does not."""

    name: str
    role: str = ""
    emoji: str = "🤖"
    modelProviderId: str = ""
    systemPrompt: str = ""
    groupId: Optional[str] = None
    withComputer: bool = True


@router.post("/v1/agents", status_code=201)
def v1_create_agent(body: CreateAgentBody):
    """Hire a teammate: a name and one line of job description.

    Deliberately synchronous, unlike every other command here. Creating the
    profile seeds skills and can take a few seconds, and the operator is
    looking at a modal waiting for the teammate to appear — a 202 would mean
    showing them an empty sidebar and hoping.
    """
    conn = _conn()
    try:
        view = roster.hire(
            conn,
            name=body.name,
            role=body.role,
            emoji=body.emoji,
            group_id=body.groupId,
            with_computer=body.withComputer,
            soul=body.systemPrompt or None,
            model_provider=body.modelProviderId,
        )
    except roster.HireError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return contract.agent(view)


class UpdateAgentBody(BaseModel):
    """Errand's ``UpdateAgentInput``. ``pinned`` is absent on purpose.

    Our sidebar organiser is the org chart (``/sections``), which is strictly
    more than a pin, so there is nothing here for a pin to mean. ``goal`` and
    ``role`` are the same sentence for us — whichever arrives wins.
    """

    name: Optional[str] = None
    role: Optional[str] = None
    goal: Optional[str] = None
    emoji: Optional[str] = None
    sectionId: Optional[str] = None
    proactive: Optional[bool] = None


@router.patch("/v1/agents/{agent_id}")
def v1_update_agent(agent_id: str, body: UpdateAgentBody):
    conn = _conn()
    _bot_or_404(conn, agent_id)
    bot = crew_db.update_bot(
        conn,
        agent_id,
        name=body.name,
        role=body.role if body.role is not None else body.goal,
        emoji=body.emoji,
        section_id=body.sectionId,
        proactive=body.proactive,
    )
    working = agent_id in orchestrator.working_bot_ids()
    return contract.agent(roster.teammate_view(conn, bot, working=working))  # type: ignore[arg-type]


@router.post("/v1/agents/{agent_id}/duplicate", status_code=201)
def v1_duplicate_agent(agent_id: str):
    conn = _conn()
    _bot_or_404(conn, agent_id)
    try:
        return contract.agent(roster.duplicate(conn, agent_id))
    except roster.HireError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/v1/agents/{agent_id}", status_code=204)
def v1_delete_agent(agent_id: str, delete_profile: bool = Query(False)):
    """Remove a teammate from the crew.

    The profile — its memory, skills, and session history — survives by
    default. ``delete_profile=true`` is the destructive variant, and the UI
    asks separately before sending it, because "take them off the board" and
    "erase everything they ever learned" are different intentions.
    """
    conn = _conn()
    _bot_or_404(conn, agent_id)
    crew_db.delete_bot(conn, agent_id)
    orchestrator.reset_agent(crew_db.dm_thread_id(agent_id))
    if delete_profile:
        try:
            from hermes_cli.profiles import delete_profile as _delete_profile

            _delete_profile(agent_id, yes=True)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=500, detail=f"Removed from the crew, but the profile remains: {exc}"
            ) from exc
    return None


# ---------------------------------------------------------------------------
# /v1 — conversations
# ---------------------------------------------------------------------------


@router.get("/v1/conversations")
def v1_list_conversations(agentId: str = Query("")):
    """Every thread, or just one teammate's.

    Unfiltered is the crew sidebar's call — group threads belong to nobody, so
    a per-agent listing can never show them.
    """
    conn = _conn()
    views = roster.conversations_for(conn, agentId) if agentId else roster.list_conversations(conn)
    return [contract.conversation(view) for view in views]


@router.get("/v1/conversations/{conversation_id}")
def v1_get_conversation(conversation_id: str, limit: int = Query(200, ge=1, le=1000)):
    conn = _conn()
    view = next(
        (c for c in roster.list_conversations(conn) if c["id"] == conversation_id), None
    )
    if view is None:
        raise HTTPException(status_code=404, detail=f"No thread called {conversation_id}.")
    rows = crew_db.list_messages(conn, conversation_id, limit)
    return {
        "conversation": contract.conversation(view),
        "messages": [contract.message(row) for row in rows],
        # The turn's tool calls, so a thread reopened mid-run shows the work in
        # progress rather than a bare spinner. `useCrewController` keeps
        # activities in their own list and clears it on agent switch.
        "activities": [
            contract.activity(event)
            for event in crew_activity.list_activities(conn, conversation_id)
        ],
    }


class SendMessageBody(BaseModel):
    text: str


@router.post("/v1/conversations/{conversation_id}/messages", status_code=201)
def v1_send_message(conversation_id: str, body: SendMessageBody):
    """Accept a typed message and return it. The reply arrives over /v1/events."""
    try:
        row = orchestrator.handle_user_message(conversation_id, body.text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return contract.message(row)


# ---------------------------------------------------------------------------
# /v1 — approvals
#
# This is the half Errand shipped a UI for and never implemented
# (`listApprovalRequests` returns [], `respondToApproval` throws). Its detail
# panel renders these shapes already.
# ---------------------------------------------------------------------------


@router.get("/v1/approvals")
def v1_list_approvals(agentId: str = Query("")):
    rows = crew_approvals.list_approvals(_conn(), agentId or None)
    return [contract.approval(row) for row in rows]


class RespondApprovalBody(BaseModel):
    decision: str
    note: str = ""
    contentHash: str = ""


@router.post("/v1/approvals/{approval_id}/respond")
def v1_respond_to_approval(approval_id: int, body: RespondApprovalBody):
    """Allow or deny a held action.

    409 on a second decision is load-bearing, not pedantry: it is what makes a
    double-clicked Allow send one email instead of two. The idempotency is
    enforced in SQL (``crew/approvals.py``), not here.

    ``contentHash`` is the fingerprint of the card the client actually
    rendered. When it no longer matches, this refuses rather than deciding: the
    operator would be approving something other than what they read, which is
    the single failure the whole mechanism exists to prevent. Clients that omit
    it still work — a chat reply or a curl has no rendered card to stake — so
    this hardens the panel without breaking the typed path.

    ``note`` now reaches the teammate through the continuation seed. An
    operator who allows with "yes, but use the finance address" has given an
    instruction, and dropping it left the teammate doing the wrong thing with a
    consent record saying otherwise.
    """
    try:
        decision = contract.approval_decision(body.decision)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    outcome = orchestrator.settle_approval(
        approval_id, decision, expect_hash=body.contentHash, note=body.note
    )
    if outcome == "gone":
        raise HTTPException(status_code=404, detail="No such approval.")
    if outcome == "stale":
        raise HTTPException(
            status_code=409,
            detail="This request changed since you opened it. Read the latest version before deciding.",
        )
    if outcome == "settled":
        raise HTTPException(status_code=409, detail="That was already decided.")

    row = crew_approvals.get_approval(_conn(), approval_id)
    resolved = contract.approval(row)  # type: ignore[arg-type]
    if body.note:
        resolved["responseNote"] = body.note
    return resolved


# ---------------------------------------------------------------------------
# /v1 — the computer
# ---------------------------------------------------------------------------


@router.get("/v1/agents/{agent_id}/computer")
def v1_get_computer(agent_id: str):
    """Report a teammate's computer. Never starts anything.

    The client polls this every two seconds while the machine is not online, so
    it has to stay a pure read — a poll that booted a container would start one
    per tick.
    """
    conn = _conn()
    _bot_or_404(conn, agent_id)
    return crew_computer.cloud_computer(agent_id)


@router.post("/v1/agents/{agent_id}/computer/open")
def v1_open_computer(agent_id: str):
    """A screen to watch. Starts the container if it is not up.

    This is the cold-start path as well as the preview path: ``getComputer``
    deliberately never starts anything, so "show me their screen" on an offline
    teammate has to land here.
    """
    return _session_or_503(agent_id)


@router.post("/v1/agents/{agent_id}/computer/takeover")
def v1_take_over_computer(agent_id: str):
    """The wheel. Same session; the client decides ``viewOnly``.

    Identical to ``open`` on purpose — with websockify on loopback there is no
    second, more-privileged channel to hand out, and pretending otherwise would
    imply a guarantee we do not enforce. What differs is the client: the
    preview mounts ``VncSurface`` with ``viewOnly``, the takeover modal does
    not. This is the route ``ask_for_login`` sends the operator to.
    """
    return _session_or_503(agent_id)


def _session_or_503(agent_id: str) -> dict:
    conn = _conn()
    _bot_or_404(conn, agent_id)
    session = crew_computer.vnc_session(agent_id, start=True)
    if session is None:
        info = crew_computer.endpoints(agent_id)
        raise HTTPException(
            status_code=503,
            detail=info.get("error") or "This teammate's computer has no screen to show yet.",
        )
    return session


# ---------------------------------------------------------------------------
# Crew-native: what each teammate may reach
#
# Errand has no concept of this — it assumes an agent may do whatever its tools
# allow. These routes are the operator's side of `crew/grants.py`.
# ---------------------------------------------------------------------------


@router.get("/bots/{bot_id}/grants")
def get_grants(bot_id: str):
    """Every tool this teammate can call, with how it is currently decided.

    Returns the defaults too, not only the rows. A panel that showed only
    explicit grants would present an empty list for a brand-new teammate and
    read as "this one may do nothing", when in fact the risk table is deciding
    every call — which is precisely the misunderstanding a permissions screen
    exists to prevent.
    """
    conn = _conn()
    _bot_or_404(conn, bot_id)
    tools = _tools_for(bot_id)
    return {"grants": crew_grants.describe(conn, bot_id, tools)}


def _tools_for(bot_id: str) -> list[str]:
    """Every tool name this teammate's turn would actually be offered.

    Read from the host's toolset registry for the toolsets this profile has
    enabled, rather than from a list kept here: a permissions screen that names
    tools this build does not have, or misses ones it does, is worse than no
    screen at all.
    """
    names: list[str] = []
    try:
        from toolsets import TOOLSETS

        with orchestrator.profile_scope(bot_id):
            enabled = orchestrator.toolsets_for(
                bot_id, has_computer=orchestrator.has_computer(bot_id)
            )
        for toolset in enabled:
            names.extend(TOOLSETS.get(toolset, {}).get("tools") or ())
    except Exception:
        log.debug("crew: could not enumerate tools for %s", bot_id, exc_info=True)
    return names


class GrantBody(BaseModel):
    mode: str
    note: str = ""


@router.put("/bots/{bot_id}/grants/{tool}")
def put_grant(bot_id: str, tool: str, body: GrantBody):
    """Pin one tool to deny / ask / allow for this teammate."""
    conn = _conn()
    _bot_or_404(conn, bot_id)
    try:
        crew_grants.set_grant(conn, bot_id, tool, body.mode, body.note)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    crew_audit.record(
        conn, event_type="grant.changed", bot_id=bot_id,
        actor=crew_audit.ACTOR_OPERATOR, tool=tool,
        subject=f"{tool} set to {body.mode}", detail=body.note, status=body.mode,
    )
    return _decision(conn, bot_id, tool)


@router.delete("/bots/{bot_id}/grants/{tool}")
def delete_grant(bot_id: str, tool: str):
    """Drop the explicit row and fall back to the risk table."""
    conn = _conn()
    _bot_or_404(conn, bot_id)
    crew_grants.clear_grant(conn, bot_id, tool)
    crew_audit.record(
        conn, event_type="grant.changed", bot_id=bot_id,
        actor=crew_audit.ACTOR_OPERATOR, tool=tool,
        subject=f"{tool} back to the default",
    )
    return _decision(conn, bot_id, tool)


def _decision(conn, bot_id: str, tool: str) -> dict:
    decision = crew_grants.decide(conn, bot_id, tool)
    return {
        "tool": tool,
        "mode": decision.mode,
        "why": decision.why,
        "source": decision.source,
        "protected": tool in crew_grants.CRITICAL_TOOLS,
    }


# ---------------------------------------------------------------------------
# Crew-native: the ledger
# ---------------------------------------------------------------------------


@router.get("/audit")
def get_audit(
    bot_id: str = Query(""),
    event_type: str = Query(""),
    before_id: int = Query(0),
    limit: int = Query(100, ge=1, le=500),
):
    """The ledger, newest first, keyset-paged on id.

    ``event_type`` takes a comma-separated list on purpose. "Was anything
    stopped?" spans ``tool.refused``, ``tool.held`` and ``approval.expired``,
    and a single-value filter would quietly answer a third of the question
    while looking like it answered all of it.
    """
    types = tuple(t.strip() for t in event_type.split(",") if t.strip())
    rows = crew_audit.query(
        _conn(), bot_id=bot_id, event_types=types,
        before_id=before_id or None, limit=limit,
    )
    return {
        "events": rows,
        "nextBeforeId": rows[-1]["id"] if len(rows) == limit else None,
    }


# ---------------------------------------------------------------------------
# Crew-native: routines
# ---------------------------------------------------------------------------


@router.get("/bots/{bot_id}/routines")
def get_routines(bot_id: str):
    return {"routines": routines.list_routines(bot_id)}


@router.delete("/bots/{bot_id}/routines/{job_id}")
def delete_routine(bot_id: str, job_id: str):
    if not routines.delete_routine(bot_id, job_id):
        raise HTTPException(status_code=404, detail="No such routine.")
    return {"ok": True}


class RoutineEnabledBody(BaseModel):
    enabled: bool


@router.patch("/bots/{bot_id}/routines/{job_id}")
def set_routine_enabled(bot_id: str, job_id: str, body: RoutineEnabledBody):
    """Pause or resume a routine.

    `set_routine_enabled` has existed since the first crew commit and has never
    had a route — nor a caller anywhere else — so "always-on" has meant "on,
    with no off switch". A teammate whose morning digest has started firing at
    a bad time could only be silenced by deleting the routine and rebuilding
    it from memory.
    """
    try:
        changed = routines.set_routine_enabled(bot_id, job_id, body.enabled)
    except ValueError as exc:
        # Resuming a one-shot whose time has passed. A real answer, not a
        # failure to look — the host raises it and we pass it through.
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if not changed:
        raise HTTPException(status_code=404, detail="No such routine.")
    return {"ok": True, "enabled": body.enabled}


#: A screenshot larger than this is not a screenshot. The cap exists because
#: this route now buffers the file, and a teammate that can write to the
#: directory can write a very large file into it.
_MAX_SCREENSHOT_BYTES = 32 * 1024 * 1024


@router.get("/screenshots/{bot_id}/{filename}")
def get_screenshot(bot_id: str, filename: str):
    """Serve a screenshot a teammate posted as evidence.

    Both path components are matched against strict allowlists in
    ``crew/computer.py`` before anything touches the filesystem — this route is
    reachable from a browser and a traversal here would serve ``crew.db``.
    """
    path = crew_computer.screenshot_file_path(bot_id, filename)
    if path is None:
        raise HTTPException(status_code=404, detail="Not found")
    # Read it ourselves rather than handing the path to FileResponse. The
    # resolver already refused every symlink it could see, but that is
    # check-then-use and the teammate owns the directory — this open is the
    # same decision made at the moment of the read, and on any platform with
    # O_NOFOLLOW it cannot be raced. Screenshots are small, so buffering one
    # costs nothing worth trading for that.
    from crew.paths import open_no_follow

    try:
        fd = open_no_follow(path)
        try:
            data = os.read(fd, _MAX_SCREENSHOT_BYTES + 1)
        finally:
            os.close(fd)
    except OSError:
        raise HTTPException(status_code=404, detail="Not found") from None
    if len(data) > _MAX_SCREENSHOT_BYTES:
        raise HTTPException(status_code=404, detail="Not found")
    return Response(
        data, media_type="image/png", headers={"Cache-Control": "immutable, max-age=31536000"}
    )


# ---------------------------------------------------------------------------
# Crew-native: what a teammate is working through
# ---------------------------------------------------------------------------


@router.get("/bots/{bot_id}/tasks")
def get_tasks(bot_id: str, limit: int = Query(20, ge=1, le=200)):
    """This teammate's tasks, newest first, with their plans and evidence."""
    conn = _conn()
    _bot_or_404(conn, bot_id)
    return {"tasks": [contract.task(row) for row in crew_tasks.list_tasks(conn, bot_id, limit)]}


# ---------------------------------------------------------------------------
# Crew-native: the files a teammate produced
#
# The teammate's `/workspace` is a real directory on this host — the container
# side of a bind mount — so these are ordinary reads of it. What they are not
# is a file browser: the path guard in `crew/artifacts.py` is what keeps a route
# reachable from a browser from serving `crew.db`.
# ---------------------------------------------------------------------------


@router.get("/bots/{bot_id}/files")
def get_files(bot_id: str, refresh: bool = Query(True)):
    """What this teammate has produced.

    ``refresh`` re-scans the workspace before answering, which is the default
    because a teammate can write a file from a routine in another process and
    the panel would otherwise show yesterday's list. Turning it off is for a
    caller polling this often enough that the walk would cost more than it is
    worth.
    """
    conn = _conn()
    _bot_or_404(conn, bot_id)
    if refresh:
        try:
            crew_artifacts.record_turn_output(
                conn, bot_id, thread_id=crew_db.dm_thread_id(bot_id), turn_id="", since_ms=0,
            )
        except Exception:
            log.debug("crew: could not re-scan %s's workspace", bot_id, exc_info=True)
    return {"files": [contract.artifact(row) for row in crew_artifacts.list_artifacts(conn, bot_id)]}


@router.get("/bots/{bot_id}/files/{rel_path:path}")
def download_file(bot_id: str, rel_path: str):
    """Hand one file back.

    ``Content-Disposition: attachment`` on everything, deliberately. A teammate
    writes files from things it read on the web, and an `.html` or `.svg` served
    inline would run as script on the dashboard's own origin — the file panel is
    for downloading work, not for rendering whatever a teammate saved.
    """
    path = crew_artifacts.artifact_file_path(bot_id, rel_path)
    if path is None:
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(
        path,
        media_type="application/octet-stream",
        # Starlette builds the `attachment` disposition from this, and encodes a
        # non-ASCII name correctly — which matters, because a teammate working
        # in Chinese will name the file in Chinese.
        filename=path.name,
        headers={"X-Content-Type-Options": "nosniff"},
    )


class SecretBody(BaseModel):
    """What the operator submits. ``value`` is the only field that matters and
    the only one that is never stored *unless* ``remember`` says to."""

    ref: str
    value: str
    #: Save this for next time, so a teammate stuck on the same field at the
    #: same site does not have to wake anybody. Off by default: putting a
    #: credential on disk is a decision, and it is the operator's to make at
    #: the moment they are already looking at the field it belongs to.
    remember: bool = False
    #: Shown back in the saved-credentials list so two accounts at one site can
    #: be told apart. Stored lossily — see `crew.vault.account_hint`.
    account: str = ""


@router.post("/bots/{bot_id}/secret")
def submit_secret(bot_id: str, body: SecretBody):
    """Type a value the teammate asked for straight into its page.

    The value lives for the length of this call. It is not written to the
    database, not posted to the thread, not returned in the response, and not
    included in any log line — which is why the failure cases below say what
    happened to the *request* and never quote what came in.
    """
    from crew.secrets import control, fill_secret

    conn = _conn()
    _bot_or_404(conn, bot_id)

    request = control.take_request(bot_id, body.ref)
    if request is None:
        # Claimed by ref, so a box that was replaced or has expired is reported
        # rather than filled. Somebody typing a password deserves to know it
        # went nowhere.
        raise HTTPException(status_code=409, detail="That request is no longer open.")

    if not fill_secret(bot_id, request, body.value):
        raise HTTPException(status_code=502, detail="Could not reach the screen to type it in.")

    # Only after it landed. Saving a value that could not be typed in would
    # fill the vault with credentials nobody has ever seen work, and the next
    # teammate would use them unattended.
    remembered = _remember_secret(bot_id, request, body) if body.remember else None

    thread_id = crew_db.dm_thread_id(bot_id)

    # Close the card itself, for the screens that are not this one.
    #
    # The chip tracks "sending / sent" in React state, which is right for the
    # browser that typed the password and says nothing to any other. A second
    # open client — a phone, a colleague, the same person's other tab — keeps
    # showing a live password box for a request that has already been answered,
    # with a message underneath saying it went in. Marking the row and
    # re-emitting it is enough: `message.updated` is the frame `_settle_reply`
    # already uses for a row whose rowid cannot re-deliver it through the tail.
    _close_login_chip(conn, thread_id, body.ref)

    # The thread records that the field was filled, and nothing else about it.
    crew_db.insert_message(
        conn,
        thread_id=thread_id,
        sender=bot_id,
        kind="text",
        content=(
            f"Thanks — {request.field_label} for {request.site} went into the page."
            + (f" Saved for {remembered} — this one will not need asking again."
               if remembered else "")
        ),
    )
    return {"filled": True, "remembered": remembered}


def _remember_secret(bot_id: str, request, body: SecretBody) -> Optional[str]:
    """Save what was just typed, bound to the origin the page is actually at.

    Returns the origin it was saved for, or ``None`` when it was not saved —
    and not saving is never an error on this route. The operator's actual
    request was "type this in", and that has already succeeded; turning a
    failed bookkeeping step into a 500 would tell them the password did not go
    in when it did.

    The origin comes from the live page for the same reason the filling path
    reads it there: ``request.site`` is a label a *model* wrote. Saving against
    it would let a teammate that had been talked onto a lookalike have the
    operator's real credential filed under the real site's name.
    """
    from crew import secrets as crew_secrets
    from crew import tools as crew_tools
    from crew import vault as crew_vault

    try:
        kind = crew_tools._vault_kind(request.field_label)
        if not kind:
            log.info(
                "crew: not saving %r for %s — it is not a kind the vault fills",
                request.field_label, bot_id,
            )
            return None
        cdp_url = (crew_computer.endpoints(bot_id) or {}).get("cdp_url")
        origin = crew_secrets.page_origin(cdp_url) if cdp_url else None
        if not origin:
            return None
        item = crew_vault.save(
            _conn(), bot_id=bot_id, origin=origin, kind=kind,
            secret=body.value, account=body.account, label=request.site,
        )
        return item["origin"]
    except Exception:
        # Never the payload: an exception here can quote the value.
        log.warning("crew: could not save the %s for %s", request.field_label, bot_id)
        return None


def _close_login_chip(conn, thread_id: str, ref: str) -> None:
    """Mark the login card answered and tell every open client.

    Best-effort: the value has already reached the page by the time this runs,
    so failing here leaves a stale card somewhere, not an unsigned-in teammate.
    Raising would turn a cosmetic problem into a 500 on a request that
    succeeded.
    """
    from crew import contract as crew_contract
    from crew.orchestrator import emit_event

    try:
        for message in reversed(crew_db.list_messages(conn, thread_id)):
            payload = message.get("payload") or {}
            if message.get("kind") != "login_request" or payload.get("ref") != ref:
                continue
            updated = {**payload, "filled": True}
            crew_db.update_message_payload(conn, int(message["id"]), updated)
            emit_event(crew_contract.message_updated({**message, "payload": updated}))
            return
    except Exception:
        log.debug("crew: could not close the login card for %s", thread_id, exc_info=True)


@router.post("/bots/{bot_id}/control")
def set_control(bot_id: str, body: dict):
    """The operator takes or releases the teammate's screen.

    Only a person can take control: there is no route by which the teammate
    asks for a human to be put in front of a page. `crew/secrets.py` says why
    at more length — briefly, a bot that can hand itself over can also hand
    somebody a page they did not ask to see.
    """
    from crew.secrets import control

    conn = _conn()
    _bot_or_404(conn, bot_id)
    if bool(body.get("held")):
        control.take(bot_id)
    else:
        control.release(bot_id)
    return {"holder": control.holder(bot_id)}


# ---------------------------------------------------------------------------
# Crew-native: sidebar sections (the org chart)
# ---------------------------------------------------------------------------


@router.get("/sections")
def get_sections():
    conn = _conn()
    bot_ids = [b["id"] for b in crew_db.list_bots(conn)]
    stored = sections.with_unassigned(sections.load_sections(conn), bot_ids)
    return {"sections": [s.as_dict() for s in stored]}


@router.put("/sections")
def put_sections(payload: list[dict]):
    """Replace the sidebar layout.

    Returns what was *stored*, not what was sent: normalisation may have
    dropped a double-claimed teammate, and the client must render the truth
    rather than its own optimistic version.
    """
    conn = _conn()
    saved = sections.save_sections(conn, sections.sections_from_payload(payload))
    bot_ids = [b["id"] for b in crew_db.list_bots(conn)]
    return {"sections": [s.as_dict() for s in sections.with_unassigned(saved, bot_ids)]}


# ---------------------------------------------------------------------------
# Crew-native: setup
# ---------------------------------------------------------------------------


@router.get("/status")
def get_status():
    """What the /crew page needs to decide whether to show onboarding."""
    conn = _conn()
    bots = crew_db.list_bots(conn)
    try:
        from tools.environments.docker import find_docker

        docker_available = bool(find_docker())
    except Exception:
        docker_available = False
    return {
        "ready": bool(bots),
        "bot_count": len(bots),
        "chief_id": roster.chief_id(),
        "docker_available": docker_available,
        "computer_image": crew_computer.crew_image(),
        "seed_teammates": [
            {"id": bot_id, "emoji": emoji, "role": role}
            for bot_id, emoji, role in roster.SEED_TEAMMATES
        ],
    }


class SeedBody(BaseModel):
    create_profiles: bool = True


@router.post("/seed")
def post_seed(body: SeedBody):
    """Bring the shipped teammates onto the board.

    Creating four profiles unasked on first launch would seed four sets of
    skills and write four shell aliases for someone who may only want one
    teammate, so this is an explicit action from the onboarding screen rather
    than something that happens at import time.
    """
    seeded = roster.seed_from_disk(_conn(), create_profiles=body.create_profiles)
    return {"seeded": seeded}


# ---------------------------------------------------------------------------
# Spaces — shared documents
#
# The operator's side. These routes do no `bot_spaces` check: every Space is
# the operator's, and the invitation table decides what *teammates* reach (see
# `crew.pages.resolve`). What they do carry is the revision token, because the
# whole point is that the person and the teammate can both be writing.
# ---------------------------------------------------------------------------


def _page_error(exc: Exception) -> HTTPException:
    """A page failure as the status the editor needs.

    409 in particular: `autosave` treats a conflict as a terminal state and
    stops retrying, and it can only do that if the status says so. Flattening
    these to 400 would have it retry a stale write forever.
    """
    status = getattr(exc, "status", 400)
    return HTTPException(status_code=status, detail=str(exc))


class SpaceBody(BaseModel):
    name: str


@router.get("/spaces")
def list_spaces():
    conn = _conn()
    return {
        "spaces": [
            {**space, "bot_ids": _space_members(conn, space["id"])}
            for space in crew_pages.list_spaces(conn)
        ]
    }


def _space_members(conn, space_id: str) -> list[str]:
    return [
        row["bot_id"]
        for row in conn.execute(
            "SELECT bot_id FROM bot_spaces WHERE space_id=? ORDER BY bot_id", (space_id,)
        )
    ]


@router.post("/spaces", status_code=201)
def create_space(body: SpaceBody):
    try:
        return crew_pages.create_space(_conn(), name=body.name)
    except crew_pages.PageError as exc:
        raise _page_error(exc) from exc


@router.delete("/spaces/{space_id}", status_code=204)
def delete_space(space_id: str):
    if not crew_pages.delete_space(_conn(), space_id):
        raise HTTPException(status_code=404, detail="There is no Space with that id.")
    return Response(status_code=204)


@router.put("/spaces/{space_id}/members/{bot_id}", status_code=204)
def add_space_member(space_id: str, bot_id: str):
    """Invite a teammate into a Space."""
    conn = _conn()
    _bot_or_404(conn, bot_id)
    try:
        crew_pages.grant_space(conn, bot_id=bot_id, space_id=space_id)
    except crew_pages.PageError as exc:
        raise _page_error(exc) from exc
    crew_audit.record(
        conn, event_type="space.access_changed", bot_id=bot_id,
        actor=crew_audit.ACTOR_OPERATOR,
        subject=f"invited into the Space '{space_id}'", status="allow",
    )
    return Response(status_code=204)


@router.delete("/spaces/{space_id}/members/{bot_id}", status_code=204)
def remove_space_member(space_id: str, bot_id: str):
    """Take the invitation back. In force on the teammate's next tool call,
    not its next turn — see `crew.pages.resolve`."""
    conn = _conn()
    if crew_pages.revoke_space(conn, bot_id=bot_id, space_id=space_id):
        crew_audit.record(
            conn, event_type="space.access_changed", bot_id=bot_id,
            actor=crew_audit.ACTOR_OPERATOR,
            subject=f"removed from the Space '{space_id}'", status="deny",
        )
    return Response(status_code=204)


@router.get("/spaces/{space_id}/pages")
def list_space_pages(space_id: str, query: str = Query("")):
    conn = _conn()
    crew_pages.get_space(conn, space_id)
    found = (
        crew_pages.search(conn, space_id=space_id, query=query)
        if query.strip()
        else crew_pages.list_pages(conn, space_id)
    )
    # Bodies are dropped from a listing: the library view renders a tree of
    # titles, and forty documents is a lot of bytes to send so one can be read.
    return {
        "pages": [
            {k: v for k, v in page.items() if k != "content"} for page in found
        ]
    }


@router.get("/spaces/{space_id}/pages/{page_id}")
def get_space_page(space_id: str, page_id: str):
    """The page with its body, unfenced.

    The fence `read_space_page` adds is for a *model* reading somebody else's
    writing mid-turn. A person opening their own document in an editor needs
    the document.
    """
    try:
        return crew_pages.get_page(_conn(), space_id=space_id, page_id=page_id)
    except crew_pages.PageError as exc:
        raise _page_error(exc) from exc


class CreatePageBody(BaseModel):
    title: str
    content: str = ""
    parent_id: Optional[str] = None


@router.post("/spaces/{space_id}/pages", status_code=201)
def create_space_page(space_id: str, body: CreatePageBody):
    try:
        return crew_pages.create_page(
            _conn(), space_id=space_id, title=body.title,
            content=body.content, parent_id=body.parent_id,
        )
    except crew_pages.PageError as exc:
        raise _page_error(exc) from exc


class PatchPageBody(BaseModel):
    expected_revision: int
    title: Optional[str] = None
    content: Optional[str] = None
    #: Sentinel-free on the wire: the editor sends `parent_id` only when it
    #: means to move the page, and `"root"` is how it asks for the top level.
    #: A bare `null` cannot carry that distinction through JSON.
    parent_id: Optional[str] = None
    move: bool = False


@router.patch("/spaces/{space_id}/pages/{page_id}")
def patch_space_page(space_id: str, page_id: str, body: PatchPageBody):
    kwargs = {}
    if body.move:
        kwargs["parent_id"] = None if body.parent_id in (None, "", "root") else body.parent_id
    try:
        return crew_pages.update_page(
            _conn(), space_id=space_id, page_id=page_id,
            expected_revision=body.expected_revision,
            title=body.title, content=body.content, **kwargs,
        )
    except crew_pages.PageError as exc:
        raise _page_error(exc) from exc


@router.delete("/spaces/{space_id}/pages/{page_id}", status_code=204)
def delete_space_page(space_id: str, page_id: str):
    if not crew_pages.delete_page(_conn(), space_id=space_id, page_id=page_id):
        raise HTTPException(status_code=404, detail="That page is not in this Space.")
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# Live events
# ---------------------------------------------------------------------------


@router.websocket("/v1/events")
async def events_ws(ws: WebSocket):
    """Stream Errand ``ConversationEvent`` frames for the whole crew.

    One socket, three sources: a rowid tail of ``messages``, a ``seq`` tail of
    ``activities``, and the in-process broadcast the orchestrator pushes into.
    The two tails are what make this work across processes — a routine that
    fired in the gateway wrote rows, not events, and they arrive here anyway.

    ``seq`` rather than rowid for activities is not a detail: an activity is
    *upserted* from running to completed under the same id, and an UPDATE
    leaves the rowid where it was, so a rowid tail would never re-deliver the
    completion and the spinner would spin forever.

    Both cursors start at "now". The client has just fetched the thread it is
    looking at over HTTP, so replaying history here would duplicate every chip.
    """
    global _loop

    if not _ws_upgrade_authorized(ws):
        await ws.close(code=4401)
        return
    await ws.accept()

    _loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()
    _subscribers.add(queue)

    conn = _conn()
    message_cursor = crew_db.max_message_id(conn)
    activity_cursor = crew_db.max_activity_seq(conn)

    def _poll() -> tuple[list[dict], list[dict]]:
        return (
            crew_db.messages_after(conn, message_cursor),
            crew_db.activities_after(conn, activity_cursor),
        )

    try:
        await ws.send_text(json.dumps({"type": "connection.changed", "state": "connected"}))
        while True:
            # Drain transients first — deltas are what make a reply look alive,
            # and they must not queue behind a DB poll.
            while not queue.empty():
                await ws.send_text(json.dumps(queue.get_nowait()))

            rows, activities = await asyncio.to_thread(_poll)
            for row in rows:
                message_cursor = max(message_cursor, int(row["id"]))
                await ws.send_text(json.dumps(contract.message_created(row)))
            for event in activities:
                activity_cursor = max(activity_cursor, int(event["seq"]))
                await ws.send_text(json.dumps(contract.activity_updated(event)))

            try:
                event = await asyncio.wait_for(queue.get(), timeout=_TAIL_INTERVAL_S)
                await ws.send_text(json.dumps(event))
            except asyncio.TimeoutError:
                pass
    except WebSocketDisconnect:
        pass
    except Exception:
        log.debug("crew: event stream ended", exc_info=True)
    finally:
        _subscribers.discard(queue)
