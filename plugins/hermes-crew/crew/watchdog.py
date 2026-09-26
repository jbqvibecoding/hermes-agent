"""Saying something when a teammate has gone quiet for too long.

Everything built so far judges a turn **once it has ended**: `crew.verdict`
sorts the four endings that look like answers and are not, the delivery check
asks whether the files it claimed exist, the routine health table counts what
keeps failing. None of them help while a turn is still running. A teammate
that has been going for twenty minutes without emitting a word or calling a
tool is, from the operator's side, indistinguishable from one that has hung —
and the interface says "working" the whole time, with a pulsing green dot.

Taken from OpenBot's ``turn-watchdog.ts`` / ``stall-guard.ts``, whose framing
is the part worth keeping:

    **Watch the silence, not the duration.**

A time limit caps how much work a teammate is allowed to do, which nobody
asked for — a genuine two-hour job is a good outcome, not a fault. A silence
limit caps how long somebody is left watching a spinner with no idea whether
anything is happening, and *that* is the thing people actually complain about.

So this never stops a turn. Killing a run that is waiting on a slow API costs
the work and fixes nothing; the operator can already interrupt, and now they
can do it knowing something rather than guessing.

It needs no new instrumentation. "Something happened" is already written down
twice — `crew.activity` gets a row per tool call, and the reply row is updated
as tokens stream in — so the question is only how long ago the most recent of
those was.
"""

from __future__ import annotations

import logging
import sqlite3
from typing import Optional

log = logging.getLogger(__name__)

#: How long a teammate may say and do nothing before the thread is told.
#:
#: Ten minutes is chosen against the *pause* it is measuring, not against how
#: long a turn may take: a model call, a page load and a long shell command all
#: finish well inside it, so a healthy turn emits something first. Shorter and
#: the notice fires on an honest slow step, which trains people to ignore it —
#: the failure mode this is supposed to fix, arriving by the other road.
SILENCE_MS = 10 * 60 * 1000


def _last_sign_of_life(conn: sqlite3.Connection, thread_id: str) -> int:
    """The most recent moment this thread produced anything, or 0.

    Both signals, because either alone has a blind spot: a teammate reasoning
    at length streams tokens and calls nothing, and one grinding through shell
    commands may not stream a word until the end.
    """
    row = conn.execute(
        "SELECT MAX(updated_at) AS t FROM activities WHERE thread_id = ?", (thread_id,),
    ).fetchone()
    latest = int((row["t"] if row and row["t"] else 0) or 0)

    # Only rows that belong to a turn. Without that clause this counts **its
    # own notice** as a sign of life, which resets the very clock it just read
    # — a test caught it firing once and then never again, for any later turn.
    # The rule it replaces the accident with is the right one anyway: a sign of
    # life is something a turn produced, and a row with no turn attached (a
    # watchdog notice, an unprompted message, a delivered reminder) was not
    # produced by one.
    row = conn.execute(
        "SELECT MAX(created_at) AS t FROM messages WHERE thread_id = ? AND turn_id != ''",
        (thread_id,),
    ).fetchone()
    return max(latest, int((row["t"] if row and row["t"] else 0) or 0))


def silent_for(
    conn: sqlite3.Connection, claim: dict, *, now_ms: Optional[int] = None,
) -> int:
    """How long this running turn has been quiet, in milliseconds.

    Measured from the last sign of life **or** the turn's start, whichever is
    later. The start matters: a teammate that has not managed to do anything at
    all since it began is the clearest case there is, and measuring from a
    thread's older messages would call it quiet for hours.
    """
    from crew import db as crew_db

    stamp = crew_db.now_ms() if now_ms is None else now_ms
    since = max(int(claim.get("started_at") or 0),
                _last_sign_of_life(conn, str(claim.get("thread_id") or "")))
    return max(0, stamp - since)


def tick(conn: sqlite3.Connection, *, now_ms: Optional[int] = None) -> int:
    """Warn about every turn that has gone quiet. Returns how many were told.

    Rides the worker sweep for the reason everything else does: the gates that
    decide a background thread may exist here were paid for once, and a second
    thread would need them copied along with its own shutdown.
    """
    from crew import db as crew_db
    from crew import presence as crew_presence

    told = 0
    for bot_id, claim in crew_presence.working(conn).items():
        if int(claim.get("warned_at") or 0):
            continue
        if silent_for(conn, claim, now_ms=now_ms) < SILENCE_MS:
            continue
        thread_id = str(claim.get("thread_id") or crew_db.dm_thread_id(bot_id))
        if not thread_id:
            continue
        # Claim the right to speak before speaking, so two overlapping sweeps
        # produce one message rather than two.
        if not crew_presence.mark_warned(conn, bot_id):
            continue
        bot = crew_db.get_bot(conn, bot_id)
        crew_db.insert_message(
            conn,
            thread_id=thread_id,
            sender=bot_id,
            kind="text",
            content=_notice(
                (bot or {}).get("name") or bot_id,
                str(claim.get("what") or ""),
                silent_for(conn, claim, now_ms=now_ms),
            ),
        )
        told += 1
    return told


def _notice(name: str, what: str, silence_ms: int) -> str:
    """What the thread is told.

    It says what the teammate was doing and how long ago anything last
    happened, because "still working" is what the spinner already says and is
    the thing being doubted. It does not apologise and does not guess at a
    cause: the honest content is the timestamp.
    """
    minutes = max(1, silence_ms // 60_000)
    doing = f" ({what})" if what else ""
    return (
        f"⏳ {name} is still running{doing}, but nothing has happened for "
        f"{minutes} minutes — no output and no tool calls. It may be waiting on "
        f"something slow. Interrupt it if you would rather not wait."
    )
