"""The record of what each teammate did, and what it was stopped from doing.

Separate from the activity stream on purpose. Activities are a *view* — they
exist so the operator can watch a turn happen, they are keyed on the tool call
so start and finish collapse into one row, and they are scoped to a thread.
This is a *ledger*: append-only, one row per attempt, including the attempts
that were refused, and readable long after the thread has scrolled away.

Ported from OpenBot's ``server/src/audit.ts`` (its event vocabulary and the
three-way allowed/refused/failed split) and octop's
``infra/db/repos/audit.py`` (the reserved actor sentinels). Three of its
decisions are not obvious and are the reason to copy rather than invent:

**Allowed is not the same as happened.** A permitted action that then fails
gets its own row. A ledger that cannot tell "we let it" from "it worked"
misleads exactly when somebody is reading it to find out what went wrong.

**The boundary in force is written down at boot.** Grants live in SQLite but
the risk table lives in this build, so an upgrade can change what "default"
means without any row changing. ``crew.policy_loaded`` records the shape of
the rules each time the plugin loads, so a later reader can interpret earlier
decisions against the deployment they were made under.

**A model that refuses before calling anything leaves no trace here.** The
hook only sees tool calls. ``crew.bot_declined`` exists for that, is written by
the teammate itself, and says in its own payload that it is self-reported —
it is evidence, not a control.

On arguments: this stores a digest and a one-line human-readable subject, never
the raw arguments. OpenBot redacts 28 key names on the way past and then says
the quiet part in its own comment — relying on redaction means the secret was
placed in the payload and caught in transit. A teammate's tool calls carry
tokens and passwords, and a table the dashboard can read is the wrong place for
them to be at all.
"""

from __future__ import annotations

import hashlib
import json
import sqlite3
from typing import Any, Optional

#: Who did it. Reserved names cannot collide with a teammate id because
#: ``roster.slugify_bot_id`` strips leading underscores.
ACTOR_SYSTEM = "_system"
ACTOR_OPERATOR = "_operator"

#: The closed vocabulary. Adding one means teaching the reader to show it.
EVENT_TYPES = (
    "tool.allowed",       # ran, or was cleared to run
    "tool.refused",       # a grant said no; it did not run
    "tool.held",          # needs the operator; it did not run
    "tool.failed",        # was allowed, ran, and did not work
    "approval.decided",   # the operator approved or discarded a held action
    "approval.expired",   # nobody decided in time
    "grant.changed",      # the operator moved a tool between deny/ask/allow
    "crew.policy_loaded", # the rules in force, written at every plugin load
    "crew.bot_declined",  # self-reported: the teammate refused before any tool
)

#: A digest is 12 hex chars: enough to match two calls against each other,
#: far too few to attack the arguments with.
_DIGEST_CHARS = 12
_SUBJECT_LIMIT = 300


def args_digest(args: Any) -> str:
    """A stable fingerprint of a tool call's arguments.

    Sorted keys so the same call digests identically across runs, and the raw
    values never leave this function.
    """
    try:
        canonical = json.dumps(args or {}, sort_keys=True, ensure_ascii=False, default=str)
    except (TypeError, ValueError):
        canonical = repr(args)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:_DIGEST_CHARS]


def record(
    conn: sqlite3.Connection,
    *,
    event_type: str,
    bot_id: str,
    actor: str = ACTOR_SYSTEM,
    thread_id: str = "",
    turn_id: str = "",
    tool_call_id: str = "",
    tool: str = "",
    args: Any = None,
    subject: str = "",
    detail: str = "",
    status: str = "",
    duration_ms: Optional[int] = None,
) -> int:
    """Append one row. Returns its id."""
    from crew.db import now_ms

    if event_type not in EVENT_TYPES:
        raise ValueError(f"unknown audit event type: {event_type!r}")
    cur = conn.execute(
        """
        INSERT INTO audit (bot_id, actor, thread_id, turn_id, tool_call_id, event_type,
                           tool, args_digest, subject, detail, status, duration_ms, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            bot_id, actor, thread_id, turn_id, tool_call_id, event_type, tool,
            args_digest(args) if args is not None else "",
            (subject or "")[:_SUBJECT_LIMIT], (detail or "")[:_SUBJECT_LIMIT],
            status, duration_ms, now_ms(),
        ),
    )
    conn.commit()
    return int(cur.lastrowid)


def record_policy_loaded(conn: sqlite3.Connection) -> None:
    """Write the rules in force. Called once when the plugin registers.

    Without this, a reader looking at last month's refusals has no way to know
    which risk table produced them — the grants are in the database but the
    defaults are in the build.
    """
    from crew import grants

    summary = {
        "rules": len(grants._RISK_RULES),  # noqa: SLF001 — our own module
        "critical": sorted(grants.CRITICAL_TOOLS),
        "unknown_tool_mode": grants._UNKNOWN_MODE,  # noqa: SLF001
    }
    record(
        conn,
        event_type="crew.policy_loaded",
        bot_id="",
        subject=f"{summary['rules']} risk rules; unknown tools default to {summary['unknown_tool_mode']}",
        detail=json.dumps(summary, ensure_ascii=False),
    )


def query(
    conn: sqlite3.Connection,
    *,
    bot_id: str = "",
    event_types: tuple[str, ...] = (),
    before_id: Optional[int] = None,
    limit: int = 100,
) -> list[dict]:
    """Newest first, keyset-paged on id.

    ``event_types`` takes several on purpose. "Was anything stopped?" spans
    ``tool.refused``, ``tool.held`` and ``approval.expired``; a single-value
    filter would quietly hide two thirds of the answer.
    """
    clauses: list[str] = []
    params: list[Any] = []
    if bot_id:
        clauses.append("bot_id = ?")
        params.append(bot_id)
    if event_types:
        clauses.append(f"event_type IN ({','.join('?' * len(event_types))})")
        params.extend(event_types)
    if before_id:
        clauses.append("id < ?")
        params.append(before_id)
    where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    params.append(max(1, min(limit, 500)))
    rows = conn.execute(
        f"SELECT * FROM audit {where} ORDER BY id DESC LIMIT ?", params
    ).fetchall()
    return [dict(r) for r in rows]


def prune(conn: sqlite3.Connection, before_ms: int) -> int:
    """Drop rows older than a cutoff. Retention is a call, not a policy engine."""
    cur = conn.execute("DELETE FROM audit WHERE created_at < ?", (before_ms,))
    conn.commit()
    return cur.rowcount
