"""What a turn changed outside the chat — the record, not the model's account.

A teammate finishes a turn and files a report: ``✓ mail → sent the export · 3``.
That line is **prose the model typed**. `crew/report.py` validates its shape and
nothing else, and `contract.preview_text` renders it verbatim. Nothing anywhere
derived, from what the tools actually did, what changed in the operator's world
— so the one account of an unattended turn was also the one source that can be
wrong about it.

The model is conch-agent's ``ActivityEffect``
(``packages/protocol/src/activity.ts``, MIT), kept close to the original: a
closed ``kind`` vocabulary, ``text`` in plain words, an optional ``target``, and
an optional ``undo`` that — in its words — "names the change set that puts it
back, when one does". Its ``purchase`` is dropped; the crew has no tool that
spends money, and a kind nothing can produce is a kind the renderer has to
handle for nothing.

This is deliberately the mirror of `crew/plan.py::evidence_from_call`, which
records what a teammate *read*. Same signature, same "``None`` means this call
is not one of mine" contract. Read evidence answers "where did that come from";
effects answer "what did it do".

Two things this is not:

* **Not the activity strip.** `crew/activity.py` writes one row per tool call,
  keyed by ``tool_call_id``, so the operator can watch a spinner resolve. Its
  kinds are tool *categories* (``browser``/``terminal``/``file``). An effect is
  a change that outlives the turn, and most tool calls produce none.
* **Not a guard.** Nothing here decides whether a call may proceed —
  `crew/policy.py` did that before the call ran. A missing effect row cannot
  open a hole; it can only mislead a person. That is why the write is
  best-effort, and also why a *lost* row has to be visible rather than simply
  absent (see `record_loss`): silently showing a short list is the exact lie
  this module exists to prevent.

**What is deliberately not claimed.** For a shell command only recognisable
shapes are named — ``git commit``, ``git push``, a package install, a delete.
``echo x > file`` changed a file and is reported as nothing, because the
alternative is parsing a shell to guess, and a wrong "what changed" line is
worse than a missing one. The audit ledger keeps every command in full.
"""

from __future__ import annotations

import json
import logging
import re
import threading
from typing import Any, Optional

log = logging.getLogger(__name__)

#: conch's vocabulary, minus ``purchase``. Closed, like ``ACTIVITY_KINDS``:
#: the renderer keys an icon off each one, so a tenth kind added here without
#: touching the component renders as nothing.
EFFECT_KINDS = (
    "file", "commit", "push", "install",
    "send", "schedule", "delete", "publish", "other",
)

#: conch's own limits. Long enough for "Sent mail to dana@henley.example",
#: short enough that a turn's list stays a list rather than a transcript.
TEXT_LIMIT = 200
TARGET_LIMIT = 300


def _as_dict(result: Any) -> dict:
    """A tool result as a dict. Handlers return JSON strings."""
    if isinstance(result, dict):
        return result
    if isinstance(result, str):
        try:
            parsed = json.loads(result)
        except (ValueError, TypeError):
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _clean(value: Any, limit: int) -> str:
    """Collapse whitespace and clip. A title with a newline in it would
    otherwise break the line it is rendered on."""
    if not isinstance(value, str):
        return ""
    return " ".join(value.split())[:limit]


def _quoted(value: str) -> str:
    """A title as it reads in a sentence. Curly quotes because the text is
    prose for a person, not a key."""
    return f"“{value}”" if value else ""


# ---------------------------------------------------------------------------
# Shell commands — only the shapes that can be named without guessing
# ---------------------------------------------------------------------------

#: Order matters: `git commit` before the generic install/delete patterns, and
#: `push` checked separately so `git commit && git push` reports the push (the
#: one with a reader outside this machine).
_COMMAND_SHAPES: tuple[tuple[str, re.Pattern[str], str], ...] = (
    ("push", re.compile(r"\bgit\s+push\b"), "Pushed to a remote"),
    ("commit", re.compile(r"\bgit\s+commit\b"), "Committed to git"),
    ("install", re.compile(
        r"\b(?:npm|yarn|pnpm|pip|pip3|uv|apt|apt-get|brew|cargo|go)\s+"
        r"(?:install|add|get)\b"), "Installed a package"),
    ("delete", re.compile(r"\brm\s+-[a-z]*[rf]|\bgit\s+clean\b|\bdrop\s+table\b"),
     "Deleted files"),
)


def _command_effect(command: str) -> Optional[tuple[str, str]]:
    """``(kind, text)`` for a command whose shape we can name, else ``None``."""
    text = " ".join((command or "").split())
    if not text:
        return None
    for kind, pattern, phrase in _COMMAND_SHAPES:
        if pattern.search(text):
            return kind, phrase
    return None


# ---------------------------------------------------------------------------
# The classifier
# ---------------------------------------------------------------------------

#: Tools whose *name* says they mutate a file. `crew/plan.py::_WRITE_VERBS`
#: exists for the read side's "skip the writes" test, but it is tuned for false
#: negatives being harmless there and misses `save_*`, so it is not reused as a
#: gate here — a missed effect is the failure this module is about.
_FILE_WRITE = re.compile(r"^(write|create)_file$|^patch$|^edit_file$|^remove_file$")
_SEND = re.compile(r"^send_|_send$|^reply|^post_|sms|^notify")

#: The crew's own tools that *are* the conversation. conch's effects are what
#: happened **outside** the chat, and a report, a plan, a pause for approval and
#: a request to sign in all happen inside it — listing them under "What changed"
#: would bury the one send that did.
#:
#: Spelled out rather than left to the backstop below, because the risk table
#: has no rule for them: they fall to its unknown-tool default (``ask``), which
#: reads as privileged, and `message_user` — the report itself — would head the
#: list of changes on every single turn.
_CONVERSATION_ONLY = frozenset({
    "message_user", "set_plan", "hold_for_approval", "ask_for_login",
})


def effect_from_call(tool_name: str, args: Any, result: Any) -> Optional[dict]:
    """One world effect from a successful tool call, or ``None``.

    ``None`` means "this call changed nothing outside the chat" — a read, a
    `todo`, a message to the operator (which *is* the chat). The caller records
    whatever comes back; deciding is entirely this function's job.
    """
    name = (tool_name or "").strip().lower()
    if not name or name in _CONVERSATION_ONLY:
        return None
    data = args if isinstance(args, dict) else {}
    out = _as_dict(result)

    # The crew's own tools, where the plain words can be good because we know
    # exactly what the call meant.
    if name == "create_space_page":
        title = _clean(data.get("title"), TARGET_LIMIT)
        undo = None
        if out.get("id") and out.get("space_id"):
            undo = {"op": "delete_page", "page_id": out["id"], "space_id": out["space_id"]}
        return _effect(
            "publish", f"Created the page {_quoted(title)}".strip(), title, undo,
        )
    if name == "edit_space_page":
        # No undo: putting a page back needs the body as it was before the
        # edit, and nothing stores it — `pages.revision` is an
        # optimistic-concurrency token, not a changelog. An undo built from
        # the page's *current* previous state would restore whatever was there
        # last, which after an operator's own edit is the teammate's text. A
        # button that does the opposite of what it says is worse than no
        # button, so this records the change and offers nothing.
        title = _clean(out.get("title") or data.get("title"), TARGET_LIMIT)
        return _effect("publish", f"Edited the page {_quoted(title)}".strip(), title)
    if name == "create_routine":
        rname = _clean(data.get("name"), TARGET_LIMIT)
        cron = _clean(data.get("cron"), 60)
        text = f"Scheduled {_quoted(rname)}" + (f" ({cron})" if cron else "")
        undo = {"op": "delete_routine", "job_id": out["id"]} if out.get("id") else None
        return _effect("schedule", text.strip(), rname, undo)
    if name == "save_memory_rule":
        rule = _clean(data.get("rule"), TEXT_LIMIT)
        return _effect("other", f"Saved a standing rule: {rule}", rule)
    if name == "message_bot":
        to = _clean(data.get("to"), TARGET_LIMIT)
        return _effect("send", f"Handed off to @{to}" if to else "Handed off", to)

    # Host tools.
    if _FILE_WRITE.search(name):
        path = _clean(data.get("path") or data.get("file_path"), TARGET_LIMIT)
        verb = "Deleted" if name == "remove_file" else (
            "Wrote" if name in ("write_file", "create_file") else "Edited")
        kind = "delete" if name == "remove_file" else "file"
        return _effect(kind, f"{verb} {path}".strip(), path)
    if name in ("terminal", "execute_code", "process"):
        command = data.get("command") or data.get("code") or ""
        shape = _command_effect(str(command))
        if shape is None:
            return None
        kind, phrase = shape
        return _effect(kind, phrase, _clean(command, TARGET_LIMIT))
    if _SEND.search(name):
        target = _clean(
            data.get("to") or data.get("recipient") or data.get("chat_id"), TARGET_LIMIT
        )
        subject = _clean(data.get("subject"), 120)
        text = "Sent" + (f" to {target}" if target else "") + (f": {subject}" if subject else "")
        return _effect("send", text, target)

    # Anything else the risk table considers outward. Without this, a tool
    # added next month reaches people and leaves no line in "What changed" —
    # the drift this module cannot afford. A generic line is honest; silence
    # is not.
    try:
        from crew import provenance

        privileged, _why = provenance.is_privileged(name)
    except Exception:  # pragma: no cover - the risk table is a regex, not a DB
        log.debug("crew: could not classify %s for effects", name, exc_info=True)
        return None
    if privileged:
        return _effect("other", f"Ran {tool_name}", "")
    return None


def _effect(kind: str, text: str, target: str, undo: Any = None) -> dict:
    return {
        "kind": kind if kind in EFFECT_KINDS else "other",
        "text": _clean(text, TEXT_LIMIT),
        "target": _clean(target, TARGET_LIMIT),
        "undo": undo,
    }


# ---------------------------------------------------------------------------
# Storage
#
# A write that fails must not fail the turn — this is a record, not a guard.
# But it must not vanish either: "What changed" showing two of three changes,
# with nothing to say so, is worse than the report it was built to check. So a
# failed write leaves a marker and the reader renders it as a row it cannot
# name. Same shape as `provenance.record_loss`, for the same reason, with the
# stakes read differently: there the loss had to *refuse* an outward call, here
# it only has to be visible.
# ---------------------------------------------------------------------------

_lost: set[str] = set()
_lost_lock = threading.Lock()


def record_loss(turn_id: str) -> None:
    if turn_id:
        with _lost_lock:
            _lost.add(str(turn_id))


def forget_losses() -> None:
    """Test seam — losses are process-local and must not leak between turns."""
    with _lost_lock:
        _lost.clear()


def lost(turn_id: str) -> bool:
    with _lost_lock:
        return str(turn_id) in _lost


def record(conn, *, turn_id: str, thread_id: str, bot_id: str, effect: dict) -> None:
    """Append one effect. Raises; the caller decides what a failure means."""
    import time
    import uuid

    with conn:
        conn.execute(
            "INSERT INTO effects (id, turn_id, thread_id, bot_id, kind, text, "
            "target, undo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                uuid.uuid4().hex,
                str(turn_id),
                str(thread_id),
                str(bot_id),
                effect.get("kind") or "other",
                effect.get("text") or "",
                effect.get("target") or "",
                json.dumps(effect["undo"], ensure_ascii=False) if effect.get("undo") else None,
                int(time.time()),
            ),
        )


def get(conn, effect_id: str) -> Optional[dict]:
    """One effect by id, with its ``undo`` parsed, or ``None``."""
    row = conn.execute(
        "SELECT id, turn_id, thread_id, bot_id, kind, text, target, undo, "
        "undone_at, created_at FROM effects WHERE id = ?",
        (str(effect_id),),
    ).fetchone()
    if row is None:
        return None
    item = dict(row)
    item["undo"] = json.loads(item["undo"]) if item.get("undo") else None
    return item


def mark_undone(conn, effect_id: str) -> None:
    """Note that the inverse ran. The row itself is left as it was: the change
    did happen, and a history that says otherwise is a different lie from the
    one this module set out to fix."""
    import time

    with conn:
        conn.execute(
            "UPDATE effects SET undone_at = ? WHERE id = ?",
            (int(time.time()), str(effect_id)),
        )


#: What the reader shows for a row that could not be written. It names the one
#: thing it knows — that something happened — and does not pretend to know what.
UNRECORDED = {
    "id": "",
    "kind": "other",
    "text": "A change could not be recorded",
    "target": "",
    "undo": None,
    "undoable": False,
    "unrecorded": True,
}


def for_turn(conn, turn_id: str) -> list[dict]:
    """Every effect of one turn, oldest first, with any loss marker first.

    A ledger that cannot be *read* is the same failure as one that could not be
    written, and gets the same row — a turn we cannot account for is not a turn
    with nothing in it.
    """
    rows: list[dict] = []
    try:
        cursor = conn.execute(
            "SELECT id, bot_id, kind, text, target, undo, undone_at, created_at "
            "FROM effects WHERE turn_id = ? ORDER BY created_at, rowid",
            (str(turn_id),),
        )
        for row in cursor:
            item = dict(row)
            raw = item.get("undo")
            item["undo"] = json.loads(raw) if raw else None
            # What the renderer draws a button from: an inverse we hold *and*
            # have not already run. Both halves, so a second click cannot ask
            # for something that is already gone.
            item["undoable"] = bool(item["undo"]) and not item.get("undone_at")
            rows.append(item)
    except Exception:
        log.warning("crew: the effects ledger could not be read back", exc_info=True)
        return [dict(UNRECORDED)]

    if lost(turn_id):
        rows.insert(0, dict(UNRECORDED))
    return rows
