"""Hermes Crew dashboard plugin — backend API routes.

Mounted at ``/api/plugins/hermes-crew/`` by the dashboard plugin system
(``hermes_cli/web_server.py::_mount_plugin_api_routes``).

Two shapes of endpoint, and the split is the architecture:

* **Commands** (send a message, resolve an approval, hire a teammate) return
  **202 immediately**. They never wait for a turn. This is what keeps the
  browser responsive while a teammate spends four minutes on its computer, and
  it is why the UI has no loading spinner on send.
* **The event stream** (``/events``) is a tail of ``crew.db``'s ``messages``
  table by rowid. Everything the operator sees arrives here — including chips
  written by a *different process*, such as a routine that fired in the gateway
  while the dashboard was closed. See ``crew/db.py`` for why the database is
  the bus.

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

from crew import computer as crew_computer  # noqa: E402
from crew import db as crew_db  # noqa: E402
from crew import orchestrator, roster, routines, sections  # noqa: E402

log = logging.getLogger(__name__)

router = APIRouter()

# How often the event tail polls for new rows. 400ms keeps a streamed reply
# feeling live without spinning a SELECT per frame; the rows themselves are
# whole chips, not tokens, so there is nothing finer-grained to wait for.
_TAIL_INTERVAL_S = 0.4


def _conn():
    """Open the crew DB, creating the schema on first use.

    Every handler goes through this so a fresh install self-heals instead of
    showing "no such table" to whoever opens ``/crew`` first.
    """
    return crew_db.connect()


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
# Status fan-out
#
# Message chips reach the browser through the DB tail. "thinking"/"idle" has no
# row to tail — it is not history, it is a transient — so it rides a tiny
# in-process broadcast instead. A status lost to a restart is not worth
# persisting; the next turn re-emits it.
# ---------------------------------------------------------------------------

_status_subscribers: set[asyncio.Queue] = set()
_status_loop: Optional[asyncio.AbstractEventLoop] = None


def _on_status(bot_id: str, state: str) -> None:
    """Called from turn worker threads, so it hops back onto the loop."""
    if _status_loop is None:
        return
    event = {"type": "status", "bot_id": bot_id, "state": state}
    for queue in list(_status_subscribers):
        try:
            _status_loop.call_soon_threadsafe(queue.put_nowait, event)
        except Exception:
            pass


orchestrator.set_status_sink(_on_status)


# ---------------------------------------------------------------------------
# Roster + conversations
# ---------------------------------------------------------------------------


@router.get("/bots")
def get_bots():
    return {"bots": roster.list_teammates(_conn())}


@router.get("/conversations")
def get_conversations():
    return {"conversations": roster.list_conversations(_conn())}


class HireBody(BaseModel):
    name: str
    role: str = ""
    emoji: str = "🤖"
    group_id: Optional[str] = None
    with_computer: bool = True


@router.post("/bots", status_code=201)
def post_bot(body: HireBody):
    """Hire a teammate: a name and one line of job description.

    Creating the profile seeds skills and can take a few seconds, so this is
    the one command that is deliberately synchronous — the operator is looking
    at a modal waiting for the teammate to appear in the sidebar, and a 202
    here would mean showing them an empty list.
    """
    try:
        return roster.hire(
            _conn(),
            name=body.name,
            role=body.role,
            emoji=body.emoji,
            group_id=body.group_id,
            with_computer=body.with_computer,
        )
    except roster.HireError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete("/bots/{bot_id}")
def delete_bot(bot_id: str, delete_profile: bool = Query(False)):
    """Remove a teammate from the crew.

    The profile — its memory, skills, and session history — survives by
    default. ``delete_profile=true`` is the destructive variant, and the UI
    asks separately before sending it, because "take them off the board" and
    "erase everything they ever learned" are different intentions.
    """
    conn = _conn()
    if crew_db.get_bot(conn, bot_id) is None:
        raise HTTPException(status_code=404, detail=f"No teammate called {bot_id}.")
    crew_db.delete_bot(conn, bot_id)
    orchestrator.reset_agent(crew_db.dm_thread_id(bot_id))
    if delete_profile:
        try:
            from hermes_cli.profiles import delete_profile as _delete_profile

            _delete_profile(bot_id, yes=True)
        except Exception as exc:  # noqa: BLE001
            raise HTTPException(
                status_code=500, detail=f"Removed from the crew, but the profile remains: {exc}"
            ) from exc
    return {"ok": True}


# ---------------------------------------------------------------------------
# Threads
# ---------------------------------------------------------------------------


@router.get("/threads/{thread_id}/messages")
def get_messages(thread_id: str, limit: int = Query(200, ge=1, le=1000)):
    return {"messages": crew_db.list_messages(_conn(), thread_id, limit)}


class MessageBody(BaseModel):
    text: str


@router.post("/threads/{thread_id}/messages", status_code=202)
def post_message(thread_id: str, body: MessageBody):
    """Accept a typed message. 202 always — the reply arrives over /events."""
    try:
        return orchestrator.handle_user_message(thread_id, body.text)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


# ---------------------------------------------------------------------------
# Approvals
# ---------------------------------------------------------------------------


class ApprovalBody(BaseModel):
    decision: str


@router.post("/approvals/{approval_id}", status_code=202)
def post_approval(approval_id: int, body: ApprovalBody):
    """Approve or discard a held action.

    409 on a second decision is load-bearing, not pedantry: it is what makes a
    double-clicked Approve send one email instead of two. The idempotency is
    enforced in SQL (``crew/approvals.py``), not here.
    """
    if body.decision not in ("approve", "discard"):
        raise HTTPException(status_code=400, detail="decision must be 'approve' or 'discard'")
    outcome = orchestrator.settle_approval(approval_id, body.decision)
    if outcome == "gone":
        raise HTTPException(status_code=404, detail="No such approval.")
    if outcome == "settled":
        raise HTTPException(status_code=409, detail="That was already decided.")
    return {"ok": True}


# ---------------------------------------------------------------------------
# The computer
# ---------------------------------------------------------------------------


@router.get("/bots/{bot_id}/computer")
def get_computer(bot_id: str, start: bool = Query(False)):
    """Report (and optionally start) a teammate's computer.

    ``start=true`` is what the panel sends when the operator opens it, so the
    screen is live by the time it renders. Reads are cheap and never start
    anything, so the sidebar can poll.
    """
    conn = _conn()
    if crew_db.get_bot(conn, bot_id) is None:
        raise HTTPException(status_code=404, detail=f"No teammate called {bot_id}.")
    info = crew_computer.ensure(bot_id) if start else crew_computer.endpoints(bot_id)
    return {"bot_id": bot_id, **info, "routines": routines.list_routines(bot_id)}


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
    return FileResponse(path, media_type="image/png", headers={"Cache-Control": "immutable, max-age=31536000"})


# ---------------------------------------------------------------------------
# Sidebar sections (the org chart)
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
# Setup
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


@router.websocket("/events")
async def events_ws(ws: WebSocket):
    """Stream new chips and teammate status to the browser.

    Two sources, one socket: a rowid tail of ``messages`` (which picks up
    whatever any process wrote) and the in-process status broadcast. The client
    upserts messages **by id**, which is what lets an approval chip flip from
    pending to decided in place when its payload is rewritten and re-sent.
    """
    global _status_loop

    if not _ws_upgrade_authorized(ws):
        await ws.close(code=4401)
        return
    await ws.accept()

    _status_loop = asyncio.get_running_loop()
    queue: asyncio.Queue = asyncio.Queue()
    _status_subscribers.add(queue)

    conn = _conn()
    # Start from "now": the client has just fetched the thread it is looking at
    # over HTTP, so replaying history here would duplicate every chip.
    cursor = crew_db.max_message_id(conn)

    try:
        await ws.send_text(json.dumps({"type": "hello", "cursor": cursor}))
        while True:
            # Drain status events first — they are what makes the sidebar feel
            # alive, and they must not queue behind a slow DB poll.
            while not queue.empty():
                await ws.send_text(json.dumps(queue.get_nowait()))

            rows = await asyncio.to_thread(crew_db.messages_after, conn, cursor)
            for row in rows:
                cursor = max(cursor, int(row["id"]))
                await ws.send_text(
                    json.dumps({"type": "message", "thread_id": row["thread_id"], "message": row})
                )

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
        _status_subscribers.discard(queue)
