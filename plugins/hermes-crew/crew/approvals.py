"""The draft-and-hold approval ledger — ported from OpenGrokBot's ``approvals.ts``.

A teammate prepares an outward-facing action in full, then stops at the door:
``hold_for_approval`` writes a row here plus an ``approval_request`` chip, and
the turn **ends**. The operator's Approve/Discard starts a fresh turn with a
continuation seed. Nothing leaves the workspace in between.

**This is not Hermes's ``tools/approval.py``.** That one gates dangerous shell
commands *inside* a turn: the tool call blocks, the operator answers, the same
turn continues. Both exist and neither replaces the other. The distinction is
the time scale — a dangerous `rm` is answered in seconds by whoever is at the
keyboard, while "send these four drafts" may sit unanswered until tomorrow
morning, and holding a turn open overnight would pin a model context, burn the
prompt cache, and lose the work to any restart.

**Idempotency is a SQL guard, not application logic.** ``UPDATE ... WHERE id=?
AND status='pending'`` means a double-click, a replayed request, or two browser
tabs racing all collapse to one decision: the second one changes zero rows and
the caller returns 409. Checking status first and then updating would leave a
window between the two statements.
"""

from __future__ import annotations

import re
import sqlite3
from typing import Literal, Optional

from crew.db import now_ms

Decision = Literal["approve", "discard"]


def create_approval(
    conn: sqlite3.Connection,
    *,
    thread_id: str,
    bot_id: str,
    action: str,
    detail: str = "",
) -> dict:
    cur = conn.execute(
        """
        INSERT INTO approvals (thread_id, bot_id, action, detail, status, created_at)
        VALUES (?, ?, ?, ?, 'pending', ?)
        """,
        (thread_id, bot_id, action, detail, now_ms()),
    )
    conn.commit()
    return get_approval(conn, int(cur.lastrowid))  # type: ignore[return-value]


def attach_approval_message(conn: sqlite3.Connection, approval_id: int, message_id: int) -> None:
    """Record which chip represents this approval.

    The chip cannot carry its own id until after it is inserted, so the
    orchestrator inserts the chip, then backfills the link here. Without it the
    resolve path has no way to flip *that* chip in place and the operator gets
    a second chip instead of an answered first one.
    """
    conn.execute("UPDATE approvals SET message_id = ? WHERE id = ?", (message_id, approval_id))
    conn.commit()


def get_approval(conn: sqlite3.Connection, approval_id: int) -> Optional[dict]:
    row = conn.execute("SELECT * FROM approvals WHERE id = ?", (approval_id,)).fetchone()
    return dict(row) if row else None


def latest_pending_approval(conn: sqlite3.Connection, thread_id: str) -> Optional[dict]:
    row = conn.execute(
        "SELECT * FROM approvals WHERE thread_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1",
        (thread_id,),
    ).fetchone()
    return dict(row) if row else None


def resolve_approval(
    conn: sqlite3.Connection, approval_id: int, decision: Decision
) -> Optional[dict]:
    """Settle a pending approval. Returns ``None`` when it was already settled.

    A ``None`` return is the caller's signal to answer 409 and — crucially —
    to **not** fire the continuation turn a second time. That is what stops a
    double-clicked Approve from sending the same email twice.
    """
    status = "approved" if decision == "approve" else "discarded"
    cur = conn.execute(
        "UPDATE approvals SET status = ?, resolved_at = ? WHERE id = ? AND status = 'pending'",
        (status, now_ms(), approval_id),
    )
    conn.commit()
    if cur.rowcount == 0:
        return None
    return get_approval(conn, approval_id)


def list_pending(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM approvals WHERE status = 'pending' ORDER BY id DESC"
    ).fetchall()
    return [dict(r) for r in rows]


def list_approvals(
    conn: sqlite3.Connection, bot_id: Optional[str] = None, limit: int = 50
) -> list[dict]:
    """Recent approvals, newest first, optionally for one teammate.

    Decided ones are included rather than filtered to pending: the panel shows
    only what is still open, but a decision the operator made a minute ago
    disappearing from the record entirely is how "did I approve that?" becomes
    unanswerable.
    """
    if bot_id:
        rows = conn.execute(
            "SELECT * FROM approvals WHERE bot_id = ? ORDER BY id DESC LIMIT ?",
            (bot_id, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM approvals ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in rows]


# A bare 👍 in the thread releases the newest pending approval, because that is
# what people actually type. Strip the modifiers a keyboard may attach — skin
# tone (U+1F3FB..U+1F3FF), the emoji/text variation selectors, and ZWJ — and
# what must remain is exactly the one code point. "👍 do it" is a message, not
# a decision, so anything left over disqualifies it.
_THUMB_MODIFIERS = re.compile("[\U0001F3FB-\U0001F3FF︎️‍]")


def is_thumbs_up(text: str) -> bool:
    return _THUMB_MODIFIERS.sub("", text or "").strip() == "👍"
