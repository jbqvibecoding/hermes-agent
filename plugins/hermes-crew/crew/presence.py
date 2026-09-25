"""Who is actually working right now, across every process.

The sidebar's "working" badge has been reading a dictionary that lives in
**the asking process's own memory** (``orchestrator._working``). That is right
exactly when the turn was started by the process being asked, and wrong the
rest of the time — which, since Phase F, is most of the time:

* a routine burning in the gateway shows as **idle** in the dashboard;
* a teammate answering someone on Telegram shows as **idle** in the dashboard;
* the proactive speaker and the memory gardener, both of which run on the
  gateway's worker tick, show as idle while they run.

"Idle" is not a cosmetic wrong answer here. It is the answer somebody acts on
when they are deciding whether to interrupt, whether the thing they asked for
is moving, or whether this teammate is stuck — and Phase G exists precisely
because a teammate that looks idle while it waits is the failure mode people
notice last.

Taken from rowboat's ``skills/spaces/agent-activity.ts``, whose design is a
**lease** rather than a flag:

    Being busy is a claim with an expiry, renewed while the work runs.

A flag needs somebody to clear it, and the case where nobody does is exactly
the case where it matters: SIGKILL the gateway mid-turn and a flag says
"working" until a human goes and fixes the row. A lease that is not renewed
stops being true on its own, without a startup sweep, a shutdown hook, or
anything else that a crash gets to skip. The cost is that "working" can lag
reality by up to :data:`LEASE_S`, which is the right direction to be wrong: a
teammate that finished a second ago still reading as busy is a refresh away
from correct, and one that died reading as busy forever is a support ticket.

``crew.db`` is already the cross-process bus for approvals, tasks and
routines, so this needs no new transport.
"""

from __future__ import annotations

import logging
import os
import sqlite3
import threading
import time
import uuid
from typing import Optional

log = logging.getLogger(__name__)

#: How long a claim stands without being renewed. Comfortably more than three
#: renew intervals, so one slow tick — a checkpoint, a GC pause, a busy
#: database — does not make a running teammate blink out of the sidebar.
LEASE_S = 45

#: How often the heartbeat renews. rowboat renews at 10s against a 30s lease;
#: the ratio is what matters and this keeps it.
RENEW_S = 15


def _holder() -> str:
    """Who is making the claim.

    The pid alone would not do: pids are reused, and a restarted gateway with
    the same pid could renew or release a claim that a previous life made. The
    random half makes a claim belong to one *run* of one process.
    """
    return f"{os.getpid()}:{uuid.uuid4().hex[:8]}"


def begin(
    conn: sqlite3.Connection,
    bot_id: str,
    *,
    what: str = "",
    thread_id: str = "",
    now: Optional[float] = None,
) -> str:
    """Claim that this teammate is working, and return the claim's holder id.

    Replaces any existing claim rather than refusing. A stale claim from a
    process that died is the common case, and a teammate that could not be
    marked busy because of a lease nobody will ever release is the flag problem
    wearing a lease's clothes.
    """
    started = int((now or time.time()) * 1000)
    holder = _holder()
    conn.execute(
        """
        INSERT INTO presence (bot_id, holder, what, thread_id, started_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(bot_id) DO UPDATE SET
            holder=excluded.holder, what=excluded.what, thread_id=excluded.thread_id,
            started_at=excluded.started_at, expires_at=excluded.expires_at
        """,
        (bot_id, holder, what, thread_id, started, started + LEASE_S * 1000),
    )
    conn.commit()
    return holder


def renew(
    conn: sqlite3.Connection, bot_id: str, holder: str, *, now: Optional[float] = None,
) -> bool:
    """Push the expiry out. False when somebody else now holds the claim.

    The holder is in the ``WHERE``, so a renewal cannot resurrect a claim that
    a newer turn has taken over — the second turn's claim is the true one and
    the first one's heartbeat learns it has nothing to renew.
    """
    stamp = int((now or time.time()) * 1000)
    cur = conn.execute(
        "UPDATE presence SET expires_at=? WHERE bot_id=? AND holder=?",
        (stamp + LEASE_S * 1000, bot_id, holder),
    )
    conn.commit()
    return cur.rowcount > 0


def end(conn: sqlite3.Connection, bot_id: str, holder: str) -> None:
    """Give up the claim. Scoped to the holder for the same reason as renew."""
    conn.execute("DELETE FROM presence WHERE bot_id=? AND holder=?", (bot_id, holder))
    conn.commit()


def working(conn: sqlite3.Connection, *, now: Optional[float] = None) -> dict[str, dict]:
    """Every teammate with a live claim, by bot id.

    Expired rows are filtered rather than deleted. Reading is the hot path —
    every roster render calls this — and a read that writes turns the sidebar
    into a source of write contention on a database that turns are trying to
    use. The rows are keyed by bot id, so the table is bounded by the roster
    whether or not anything reaps it.
    """
    stamp = int((now or time.time()) * 1000)
    rows = conn.execute(
        "SELECT bot_id, holder, what, thread_id, started_at, expires_at "
        "FROM presence WHERE expires_at > ?",
        (stamp,),
    ).fetchall()
    return {row["bot_id"]: dict(row) for row in rows}


def is_working(conn: sqlite3.Connection, bot_id: str, *, now: Optional[float] = None) -> bool:
    stamp = int((now or time.time()) * 1000)
    row = conn.execute(
        "SELECT 1 FROM presence WHERE bot_id=? AND expires_at > ?", (bot_id, stamp),
    ).fetchone()
    return row is not None


class Lease:
    """Holds a presence claim for as long as a block of work runs.

    Shaped like :class:`crew.tasks.Heartbeat` deliberately — same background
    thread, same "never raise into the work" rule. The difference is what a
    failure means. Losing a task lease means somebody else may now be running
    your task, which the work has to hear about; losing a presence claim means
    the sidebar is briefly wrong, which it does not. So this one has no
    ``lost`` event and nothing to check: it renews while it can and stays out
    of the way.
    """

    def __init__(self, bot_id: str, *, what: str = "", thread_id: str = "",
                 max_run_s: float = 6 * 3600):
        self.bot_id = bot_id
        self.what = what
        self.thread_id = thread_id
        self.holder = ""
        self._stop = threading.Event()
        self._max_run_s = max_run_s
        self._thread: Optional[threading.Thread] = None

    def start(self) -> "Lease":
        from crew import db as crew_db

        try:
            self.holder = begin(
                crew_db.connect(), self.bot_id, what=self.what, thread_id=self.thread_id,
            )
        except Exception:
            # A teammate that cannot be marked busy still has to run. This is a
            # display property; it is never worth failing a turn over.
            log.debug("crew: could not claim presence for %s", self.bot_id, exc_info=True)
            return self
        self._thread = threading.Thread(
            target=self._run, name=f"crew-presence-{self.bot_id}", daemon=True,
        )
        self._thread.start()
        return self

    def _run(self) -> None:
        from crew import db as crew_db

        deadline = time.monotonic() + self._max_run_s
        while not self._stop.wait(RENEW_S):
            if time.monotonic() > deadline:
                # Same reason as the task heartbeat: nothing stops a plugin
                # thread at shutdown, so it stops itself rather than holding a
                # claim open for a turn that is never ending.
                log.warning("crew: presence lease for %s gave up after its limit", self.bot_id)
                return
            try:
                if not renew(crew_db.connect(), self.bot_id, self.holder):
                    return  # somebody else owns the badge now
            except Exception:
                log.debug("crew: presence renewal failed for %s", self.bot_id, exc_info=True)
                return

    def stop(self) -> None:
        from crew import db as crew_db

        self._stop.set()
        if not self.holder:
            return
        try:
            end(crew_db.connect(), self.bot_id, self.holder)
        except Exception:
            # Nothing to do about it, and nothing needs doing: the lease
            # expires on its own. That is the point of it being a lease.
            log.debug("crew: could not release presence for %s", self.bot_id, exc_info=True)

    def __enter__(self) -> "Lease":
        return self.start()

    def __exit__(self, *exc: object) -> None:
        self.stop()
