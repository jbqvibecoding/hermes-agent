"""Tool activity — making a working teammate visible.

Until this existed, a teammate could spend four minutes on its computer and the
thread showed *nothing* until the final reply landed. The operator could not
tell working from hung, and "see the work happen" is half of what the product
promises.

Hermes's ``AIAgent`` has offered the hooks all along
(``tool_start_callback`` / ``tool_complete_callback`` in
``agent/tool_executor.py``); what was missing was somewhere to put them and a
vocabulary to render them in. Both come from Errand
(``src/domain/types.ts::ActivityEvent`` and the ``toolActivityKind`` classifier
in ``src/clients/http/RuntaCloudAgentsClient.ts``), which is why the five kinds
here are exactly its five: the ported React components key their icons off that
closed set.

An activity is keyed by the model's ``tool_call_id``, so start and completion
**upsert the same row** rather than appending two. That is what lets the UI show
one line that goes from a spinner to a result, instead of a growing log.
"""

from __future__ import annotations

import json
import logging
import re
import sqlite3
from typing import Any, Optional

log = logging.getLogger(__name__)

#: Errand's closed vocabulary. The renderer maps each to an icon
#: (``Globe2 / Terminal / FileText / Cloud / Cloud``); adding a sixth here
#: without touching the component would render as nothing.
ACTIVITY_KINDS = ("browser", "terminal", "file", "handoff", "status")

ACTIVITY_STATUSES = ("running", "completed", "failed")

# Ported from Errand's toolActivityKind. Order matters — the first match wins,
# and `browser` is checked before `terminal` so `browser_navigate` is not
# classified as a command by the `nav`-free but `run`-adjacent patterns below.
_KIND_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("browser", re.compile(r"browser|web|fetch|url|screenshot|page|scrape")),
    ("terminal", re.compile(r"terminal|command|shell|bash|exec|run|process|code")),
    ("file", re.compile(r"file|read|write|edit|patch|search|grep|glob|ls|dir")),
    ("handoff", re.compile(r"agent|task|handoff|delegate|message_bot|subagent|kanban")),
)

#: Argument names worth showing next to the tool name, most specific first.
#: ``path`` before ``command`` because a file tool that also carries a command
#: is still about the file. Errand looks at ``path``/``file_path``/``command``;
#: the rest are Hermes tools' own argument names.
_SUBJECT_KEYS = (
    "path",
    "file_path",
    "url",
    "command",
    "query",
    "rule",
    "site",
    "to",
    "name",
    "pattern",
)

#: Titles go into a one-line summary; anything longer is the tool being
#: chatty, not information.
_TITLE_LIMIT = 500
#: Output is shown in an expandable disclosure, so it can be longer — but a
#: 2MB shell dump has no business in SQLite or in a React prop.
_OUTPUT_LIMIT = 4000


def tool_activity_kind(tool_name: str) -> str:
    """Classify a tool name into one of Errand's five activity kinds."""
    normalized = (tool_name or "").lower()
    for kind, pattern in _KIND_PATTERNS:
        if pattern.search(normalized):
            return kind
    return "status"


def _stringify(value: Any) -> Optional[str]:
    if isinstance(value, str):
        return value.strip() or None
    if isinstance(value, (int, float, bool)):
        return str(value)
    return None


def activity_title(tool_name: str, args: Any) -> str:
    """Render "what is it doing right now" in one line.

    ``terminal: npm test`` rather than ``terminal``. Errand drops the tool name
    when it is ``bash`` (the command speaks for itself); the same applies to our
    ``terminal``, so the line reads as the command the operator would have typed.
    """
    name = (tool_name or "tool").strip() or "tool"
    subject = None
    if isinstance(args, dict):
        for key in _SUBJECT_KEYS:
            subject = _stringify(args.get(key))
            if subject:
                break

    if not subject:
        return name[:_TITLE_LIMIT]
    if name in ("terminal", "bash", "shell_exec", "execute_code"):
        return subject[:_TITLE_LIMIT]
    return f"{name} {subject}"[:_TITLE_LIMIT]


def tool_result_text(result: Any) -> Optional[str]:
    """Extract something worth showing from a tool result.

    Hermes tools return JSON strings; some return the content-block arrays that
    Errand's ``toolResultText`` was written for. Handle both, and fall back to
    the raw string rather than showing nothing — a result the operator cannot
    read is still better than a result they cannot see.
    """
    if result is None:
        return None

    if isinstance(result, str):
        text = result.strip()
        if not text:
            return None
        # Most Hermes tools return a JSON envelope. Surface its error or its
        # payload rather than making the operator read braces.
        if text.startswith("{") or text.startswith("["):
            try:
                parsed = json.loads(text)
            except (ValueError, TypeError):
                return text[:_OUTPUT_LIMIT]
            return tool_result_text(parsed)
        return text[:_OUTPUT_LIMIT]

    if isinstance(result, dict):
        for key in ("error", "output", "stdout", "result", "note", "content", "message"):
            value = result.get(key)
            text = tool_result_text(value) if not isinstance(value, str) else value.strip()
            if text:
                return text[:_OUTPUT_LIMIT]
        try:
            return json.dumps(result, ensure_ascii=False)[:_OUTPUT_LIMIT]
        except (TypeError, ValueError):
            return None

    if isinstance(result, list):
        # Content-block arrays: [{"type": "text", "text": "..."}, ...]
        parts = [
            item.get("text", "")
            for item in result
            if isinstance(item, dict) and item.get("type") == "text"
        ]
        joined = "\n".join(p for p in parts if p).strip()
        if joined:
            return joined[:_OUTPUT_LIMIT]
        try:
            return json.dumps(result, ensure_ascii=False)[:_OUTPUT_LIMIT]
        except (TypeError, ValueError):
            return None

    return _stringify(result)


def looks_failed(result: Any) -> bool:
    """Whether a tool result should render as a failure.

    Conservative on purpose: a tool that merely *mentions* an error in its
    output is not a failed tool, so this only trusts an explicit error field or
    a JSON envelope whose ``success`` is false.
    """
    payload = result
    if isinstance(result, str):
        text = result.strip()
        if not (text.startswith("{") or text.startswith("[")):
            return False
        try:
            payload = json.loads(text)
        except (ValueError, TypeError):
            return False
    if not isinstance(payload, dict):
        return False
    if payload.get("success") is False:
        return True
    error = payload.get("error")
    return bool(error) and error is not True


def activity_id(tool_call_id: str) -> str:
    """Errand's id shape, so ported components need no translation."""
    return f"tool:{tool_call_id}"


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------


def upsert_activity(
    conn: sqlite3.Connection,
    *,
    tool_call_id: str,
    thread_id: str,
    turn_id: str,
    tool_name: str,
    args: Any = None,
    status: str = "running",
    output: Optional[str] = None,
) -> dict:
    """Record one tool call, creating or updating the row for this call id.

    A completion may arrive without the arguments the start event had, in which
    case :func:`activity_title` can only produce the bare tool name — and
    overwriting ``npm test`` with ``terminal`` halfway through would lose the
    only thing on the line worth reading. The ``ON CONFLICT`` clause therefore
    keeps the stored title whenever the incoming one degenerated to the tool
    name, which is exactly ``title = detail``.
    """
    from crew.db import next_seq, now_ms

    if status not in ACTIVITY_STATUSES:
        raise ValueError(f"unknown activity status: {status!r}")

    row_id = activity_id(tool_call_id)
    kind = tool_activity_kind(tool_name)
    title = activity_title(tool_name, args)
    ts = now_ms()
    # A fresh sequence on every write, including the completion update, so the
    # event tail re-delivers the row and the UI can flip the spinner.
    seq = next_seq(conn)

    conn.execute(
        """
        INSERT INTO activities (id, seq, thread_id, turn_id, kind, title, detail, output, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            seq        = excluded.seq,
            status     = excluded.status,
            output     = COALESCE(excluded.output, activities.output),
            title      = CASE WHEN excluded.title IN ('', excluded.detail)
                              THEN activities.title ELSE excluded.title END,
            updated_at = excluded.updated_at
        """,
        (row_id, seq, thread_id, turn_id, kind, title, tool_name, output, status, ts, ts),
    )
    conn.commit()
    return get_activity(conn, row_id)  # type: ignore[return-value]


def get_activity(conn: sqlite3.Connection, row_id: str) -> Optional[dict]:
    row = conn.execute("SELECT * FROM activities WHERE id = ?", (row_id,)).fetchone()
    return _to_event(row) if row else None


def list_activities(conn: sqlite3.Connection, thread_id: str, limit: int = 200) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM activities WHERE thread_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?",
        (thread_id, limit),
    ).fetchall()
    return [_to_event(r) for r in reversed(rows)]


def interrupt_running(conn: sqlite3.Connection, turn_id: str) -> list[dict]:
    """Mark this turn's still-running activities as failed.

    Called when a turn ends — a tool left in ``running`` because the turn was
    interrupted or the process died would otherwise spin forever in the UI,
    which reads as "still working" long after nothing is.
    """
    from crew.db import next_seq, now_ms

    rows = conn.execute(
        "SELECT id FROM activities WHERE turn_id = ? AND status = 'running'", (turn_id,)
    ).fetchall()
    if not rows:
        return []
    ts = now_ms()
    for row in rows:
        conn.execute(
            "UPDATE activities SET status = 'failed', seq = ?, updated_at = ? WHERE id = ?",
            (next_seq(conn), ts, row["id"]),
        )
    conn.commit()
    return [get_activity(conn, r["id"]) for r in rows]  # type: ignore[misc]


def _to_event(row: sqlite3.Row) -> dict:
    from crew.db import iso

    """Shape a row as Errand's ``ActivityEvent``.

    ``conversationId`` is our ``thread_id`` — the renderer filters activities by
    it (``Conversation.tsx``'s ``activities.filter(a => a.conversationId === …)``),
    so the names have to line up even though ours is the more accurate one.
    """
    return {
        "id": row["id"],
        # Not part of Errand's ActivityEvent — the event tail's cursor rides
        # here so `activities_after` can advance without a second query, and
        # `contract.activity_updated` strips it before the frame goes out.
        "seq": row["seq"],
        "conversationId": row["thread_id"],
        "turnId": row["turn_id"],
        "kind": row["kind"],
        "title": row["title"],
        "detail": row["detail"],
        "output": row["output"],
        "status": row["status"],
        "createdAt": iso(row["created_at"]),
        "updatedAt": iso(row["updated_at"]),
    }
