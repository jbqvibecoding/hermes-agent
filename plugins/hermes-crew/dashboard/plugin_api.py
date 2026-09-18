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
import sys
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from pydantic import BaseModel

# See the plugin's __init__.py: this file is exec'd as a flat module with no
# package context, so `crew.*` has to be importable by absolute name.
_PLUGIN_ROOT = str(Path(__file__).resolve().parent.parent)
if _PLUGIN_ROOT not in sys.path:
    sys.path.insert(0, _PLUGIN_ROOT)

from crew import activity as crew_activity  # noqa: E402
from crew import approvals as crew_approvals  # noqa: E402
from crew import computer as crew_computer  # noqa: E402
from crew import contract  # noqa: E402
from crew import db as crew_db  # noqa: E402
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


@router.post("/v1/approvals/{approval_id}/respond")
def v1_respond_to_approval(approval_id: int, body: RespondApprovalBody):
    """Allow or deny a held action.

    409 on a second decision is load-bearing, not pedantry: it is what makes a
    double-clicked Allow send one email instead of two. The idempotency is
    enforced in SQL (``crew/approvals.py``), not here.

    ``note`` is accepted and echoed back because Errand's panel collects one,
    but it is **not** yet fed to the teammate — doing that means changing the
    continuation seed, which is a prompt change and belongs with the rest of
    them rather than smuggled in here.
    """
    try:
        decision = contract.approval_decision(body.decision)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    outcome = orchestrator.settle_approval(approval_id, decision)
    if outcome == "gone":
        raise HTTPException(status_code=404, detail="No such approval.")
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


@router.get("/screenshots/{bot_id}/{filename}")
def get_screenshot(bot_id: str, filename: str):
    """Serve a screenshot a teammate posted as evidence.

    Both path components are matched against strict allowlists in
    ``crew/computer.py`` before anything touches the filesystem — this route is
    reachable from a browser and a traversal here would serve ``crew.db``.
    """
    path = crew_computer.screenshot_file_path(bot_id, filename)
    if path is None or not path.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(
        path, media_type="image/png", headers={"Cache-Control": "immutable, max-age=31536000"}
    )


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
