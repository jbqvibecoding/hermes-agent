"""Bringing an answer back to the teammate that asked for it.

``orchestrator.relay`` hands work from one teammate to another. What it does
is write a ``bot_ref`` chip into the **receiver's** thread and start their
turn there, then return ``{"delivered": True}`` immediately. Which means:

    You ask Ada something. Ada says "I've passed that to Scout." Nothing else
    ever appears in Ada's thread.

Scout's answer is in Scout's thread. To read it you have to know the handoff
happened, know who it went to, and go and look — and whether Scout says
anything back to Ada at all depends on whether the model decides, unprompted,
to call ``message_bot`` a second time. Nothing structural makes it happen.

octop's ``agent-interop-mailbox.md`` describes the fix, and the part worth
taking is what it *refuses* to do: it does not relay B's text to the user as
though B were speaking to them. It calls **A again, on A's own thread, with
B's result in hand**, so the answer arrives in the voice of the teammate the
operator was talking to. A is the one who knows why the question was asked.

The record is a row rather than a callback because the two turns are separate
agent runs — B's may be on another thread of execution, and on the recovery
path it may be in another process entirely.
"""

from __future__ import annotations

import logging
import sqlite3
from typing import Optional

log = logging.getLogger(__name__)


def record(
    conn: sqlite3.Connection, *, from_bot_id: str, to_bot_id: str,
    from_thread_id: str, ask: str, hop: int,
) -> int:
    """Note that ``from_bot_id`` is owed an answer, and return the row id.

    ``hop`` is the receiver's hop, not the asker's, so the reply is bounded by
    the same budget ``crew.a2a`` already spends on the dispatch.
    """
    from crew import db as crew_db

    cur = conn.execute(
        """
        INSERT INTO handoffs (from_bot_id, to_bot_id, from_thread_id, ask, hop, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (from_bot_id, to_bot_id, from_thread_id, ask, int(hop), crew_db.now_ms()),
    )
    conn.commit()
    return int(cur.lastrowid)


def pending_for(conn: sqlite3.Connection, to_bot_id: str) -> Optional[dict]:
    """The oldest unanswered handoff this teammate owes, if any.

    Oldest first, and one at a time. Two people asking the same teammate at
    once is rare and the alternative — trying to match an answer to the right
    question — would need the model to say which it was answering, which it has
    no reliable way to do. First in, first answered is at least predictable.
    """
    row = conn.execute(
        "SELECT * FROM handoffs WHERE to_bot_id = ? AND answered_at = 0 "
        "ORDER BY id ASC LIMIT 1",
        (to_bot_id,),
    ).fetchone()
    return dict(row) if row else None


def close(conn: sqlite3.Connection, handoff_id: int) -> bool:
    """Mark it answered. False when somebody already did.

    The ``answered_at = 0`` in the WHERE is what makes the reply happen once:
    two turns settling at the same moment both read the same pending row, and
    only the one whose UPDATE changes a row goes on to wake the asker.
    """
    from crew import db as crew_db

    cur = conn.execute(
        "UPDATE handoffs SET answered_at = ? WHERE id = ? AND answered_at = 0",
        (crew_db.now_ms(), int(handoff_id)),
    )
    conn.commit()
    return cur.rowcount > 0
