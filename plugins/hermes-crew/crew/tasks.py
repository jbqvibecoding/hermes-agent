"""Work that survives the process that started it.

Ported in mechanism from OpenMuse's ``apps/server/src/engine/worker.ts`` and
``db.ts`` (MIT), rewritten against SQLite. What was taken is the lease, and the
lease is worth taking because it answers a question we could not otherwise
answer: **which process owns this work?**

The crew plugin loads in the CLI, in the gateway, and in the dashboard. A
routine fires in the gateway; the operator watches from the dashboard. If the
gateway dies mid-run there is nothing in either process that can tell, and a
statement run at startup cannot help either — OpenMuse's design note is the
clearest statement of why:

    No startup statement can distinguish "the run I crashed out of" from "a run
    a healthy peer is in the middle of".

So there is no startup sweep here. A claim writes a ``lease_id`` and a
``lease_until`` a minute out, a heartbeat renews it, and a worker that dies
simply stops renewing. The next tick in *any* process sees the stale lease and
takes over. Nobody has to know whose run it was.

**The one subtle line** is in :func:`claim`: when taking over a ``running``
task, the CAS predicate also pins ``lease_until``. It is worth being precise
about what that buys, because the obvious answer is wrong. Two *takers* racing
are already settled by ``lease_id`` — the winner changes it, so the loser stops
matching. The race the pin actually covers is a taker against an owner that was
never dead, only **slow**: a long tool call, a stopped-world GC, a paused
container. The taker reads the lapsed row and decides to take over; meanwhile
the owner wakes and renews. ``lease_id`` is unchanged, so without the pin the
taker's ``WHERE`` still matches and both run the same task.

**Retries are capped.** Hermes's own scheduler deliberately makes recurring
cron jobs at-most-once, and says why: "missing one run is far better than
firing dozens of times in a crash loop" (``cron/scheduler.py``). Taking work
over after a crash reverses that, so the cap is not a detail — it is the part
that keeps the reversal honest. Past :data:`MAX_ATTEMPTS` a task fails and says
so rather than being picked up again forever.
"""

from __future__ import annotations

import json
import logging
import secrets
import sqlite3
import threading
import time
import uuid
from typing import Any, Optional

log = logging.getLogger(__name__)

#: How long a claim is good for. Long enough that a slow tool call does not
#: look like a dead worker, short enough that a real crash is picked up while
#: somebody is still waiting.
LEASE_MS = 60_000

#: Renew at a third of the lease, so two renewals can fail before it lapses.
HEARTBEAT_S = LEASE_MS / 3000.0

#: How often a worker looks for due work.
POLL_S = 2.0

#: Claimed per tick. A cap keeps one busy teammate from starving the others.
MAX_PER_TICK = 3

#: After this many claims a task is failed rather than taken over again. This
#: is the bound on the crash loop the host's at-most-once choice was avoiding.
MAX_ATTEMPTS = 3

#: Terminal. `paused` is deliberately not here — a paused task is waiting for a
#: person, not finished.
TERMINAL = ("succeeded", "failed", "cancelled")

STATUSES = (
    "queued", "running", "waiting_approval", "waiting_input",
    "scheduled", "paused", "succeeded", "failed", "cancelled",
)


class LostLease(RuntimeError):
    """This worker no longer owns the task: paused, cancelled, or taken over."""


def _now() -> int:
    from crew.db import now_ms

    return now_ms()


def _loads(raw: Any, fallback: Any) -> Any:
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except (ValueError, TypeError):
        return fallback


def _row(row: Optional[sqlite3.Row]) -> Optional[dict]:
    if row is None:
        return None
    task = dict(row)
    task["input"] = _loads(task.get("input"), {})
    task["state"] = _loads(task.get("state"), {})
    task["plan"] = _loads(task.get("plan"), [])
    task["evidence"] = _loads(task.get("evidence"), [])
    return task


# ---------------------------------------------------------------------------
# Creating and reading
# ---------------------------------------------------------------------------


def enqueue(
    conn: sqlite3.Connection,
    *,
    bot_id: str,
    kind: str = "agent",
    title: str = "",
    thread_id: str = "",
    input: Optional[dict] = None,
    plan: Optional[list] = None,
    status: str = "queued",
    idem_key: Optional[str] = None,
    next_run_at: Optional[int] = None,
) -> dict:
    """Put work on the queue. Returns the existing task when ``idem_key`` repeats.

    The idempotency key is what stops a routine that fires while the previous
    run is still going from stacking a second copy of itself.
    """
    if status not in STATUSES:
        raise ValueError(f"unknown task status: {status!r}")
    if idem_key:
        existing = _row(conn.execute(
            "SELECT * FROM tasks WHERE idem_key = ?", (idem_key,)
        ).fetchone())
        if existing is not None:
            return existing

    ts = _now()
    task_id = f"task_{uuid.uuid4().hex[:16]}"
    conn.execute(
        """
        INSERT INTO tasks (id, bot_id, thread_id, kind, title, input, state, status,
                           plan, evidence, attempts, next_run_at, created_at, updated_at, idem_key)
        VALUES (?, ?, ?, ?, ?, ?, '{}', ?, ?, '[]', 0, ?, ?, ?, ?)
        """,
        (
            task_id, bot_id, thread_id, kind, title,
            json.dumps(input or {}, ensure_ascii=False), status,
            json.dumps(plan or [], ensure_ascii=False), next_run_at, ts, ts, idem_key,
        ),
    )
    conn.commit()
    return get(conn, task_id)  # type: ignore[return-value]


def get(conn: sqlite3.Connection, task_id: str) -> Optional[dict]:
    return _row(conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone())


def get_by_idem(conn: sqlite3.Connection, idem_key: str) -> Optional[dict]:
    if not idem_key:
        return None
    return _row(conn.execute(
        "SELECT * FROM tasks WHERE idem_key = ?", (idem_key,)
    ).fetchone())


def list_tasks(conn: sqlite3.Connection, bot_id: str = "", limit: int = 50) -> list[dict]:
    if bot_id:
        rows = conn.execute(
            "SELECT * FROM tasks WHERE bot_id = ? ORDER BY updated_at DESC LIMIT ?",
            (bot_id, max(1, min(limit, 500))),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM tasks ORDER BY updated_at DESC LIMIT ?",
            (max(1, min(limit, 500)),),
        ).fetchall()
    return [_row(r) for r in rows]  # type: ignore[misc]


def due(conn: sqlite3.Connection, limit: int = MAX_PER_TICK) -> list[dict]:
    """Work that wants a worker right now.

    Four cases, and the third is the one that matters: a ``running`` task whose
    lease has lapsed is not running at all — whoever held it is gone. That
    clause is the entire crash-recovery mechanism, and it needs no knowledge of
    which process died.
    """
    now = _now()
    rows = conn.execute(
        """
        SELECT * FROM tasks
         WHERE status = 'queued'
            OR (status = 'scheduled'   AND next_run_at IS NOT NULL AND next_run_at <= ?)
            OR (status = 'running'     AND lease_until IS NOT NULL AND lease_until <= ?)
            OR  status = 'waiting_approval'
         ORDER BY updated_at ASC
         LIMIT ?
        """,
        (now, now, max(1, limit)),
    ).fetchall()
    return [_row(r) for r in rows]  # type: ignore[misc]


# ---------------------------------------------------------------------------
# The lease
# ---------------------------------------------------------------------------


def claim(conn: sqlite3.Connection, task: dict) -> Optional[dict]:
    """Take ownership. ``None`` means somebody else got there first.

    Losing is silent and normal — two workers polling the same database will
    race constantly, and a loss is not an error, it is the other one winning.

    The predicate is built from the task as it was read. For a takeover it
    also pins ``lease_until``, which guards the case ``lease_id`` cannot: an
    owner that was only slow, not dead, waking up and renewing between our read
    and our write. See the module docstring.
    """
    previous_status = task["status"]
    if previous_status in TERMINAL:
        return None

    # An unattended task that has already been taken over MAX_ATTEMPTS times is
    # not going to succeed on the next one. Failing it here is the cap that
    # keeps takeover from becoming the crash loop the host chose to avoid.
    if task["attempts"] >= MAX_ATTEMPTS:
        _fail_exhausted(conn, task)
        return None

    ts = _now()
    lease_id = secrets.token_hex(8)
    params: list[Any] = [
        "running", lease_id, ts + LEASE_MS, ts, task["id"], previous_status,
    ]
    predicate = "id = ? AND status = ?"
    if task.get("lease_id") is None:
        predicate += " AND lease_id IS NULL"
    else:
        predicate += " AND lease_id = ?"
        params.append(task["lease_id"])
    if previous_status == "running":
        predicate += " AND lease_until = ?"
        params.append(task["lease_until"])

    cur = conn.execute(
        f"""
        UPDATE tasks
           SET status = ?, lease_id = ?, lease_until = ?, updated_at = ?,
               attempts = attempts + 1
         WHERE {predicate}
        """,
        params,
    )
    conn.commit()
    if cur.rowcount == 0:
        return None
    return get(conn, task["id"])


def _fail_exhausted(conn: sqlite3.Connection, task: dict) -> None:
    conn.execute(
        """
        UPDATE tasks SET status = 'failed', error = ?, lease_id = NULL,
                         lease_until = NULL, updated_at = ?
         WHERE id = ? AND status NOT IN ('succeeded', 'failed', 'cancelled')
        """,
        (
            f"Gave up after {task['attempts']} attempts — this kept being "
            f"interrupted before it could finish.",
            _now(), task["id"],
        ),
    )
    conn.commit()


def renew(conn: sqlite3.Connection, task_id: str, lease_id: str) -> bool:
    """Push the lease out. ``False`` means it is no longer ours."""
    cur = conn.execute(
        """
        UPDATE tasks SET lease_until = ?, updated_at = ?
         WHERE id = ? AND lease_id = ? AND status = 'running'
        """,
        (_now() + LEASE_MS, _now(), task_id, lease_id),
    )
    conn.commit()
    return cur.rowcount > 0


def checkpoint(
    conn: sqlite3.Connection, task_id: str, lease_id: str, patch: dict
) -> dict:
    """Write progress, under the lease. Raises :class:`LostLease` if it is gone.

    Raising rather than writing anyway is the point. A worker that lost its
    lease has been replaced; letting its checkpoint land would have it overwrite
    the progress of the worker that took over, with state from a run nobody is
    watching any more.
    """
    fields = {"updated_at": _now()}
    for key, value in patch.items():
        if key in ("input", "state", "plan", "evidence"):
            fields[key] = json.dumps(value, ensure_ascii=False)
        elif key in ("status", "title", "error", "next_run_at", "thread_id"):
            fields[key] = value
        else:
            raise ValueError(f"tasks has no column {key!r}")

    assignments = ", ".join(f"{name} = ?" for name in fields)
    cur = conn.execute(
        f"UPDATE tasks SET {assignments} WHERE id = ? AND lease_id = ? AND status = 'running'",
        [*fields.values(), task_id, lease_id],
    )
    conn.commit()
    if cur.rowcount == 0:
        raise LostLease(f"task {task_id} is no longer ours")
    return get(conn, task_id)  # type: ignore[return-value]


def guard(conn: sqlite3.Connection, task_id: str, lease_id: str) -> None:
    """Raise :class:`LostLease` unless this worker still owns the task.

    Called before anything the outside world can see. In practice the call site
    is Phase D's ``pre_tool_call`` hook, which already fires in every process
    before every tool call — which is exactly the definition of "before an
    externally visible effect", so no new mechanism was needed.
    """
    row = conn.execute(
        "SELECT lease_id, status FROM tasks WHERE id = ?", (task_id,)
    ).fetchone()
    if row is None or row["lease_id"] != lease_id or row["status"] != "running":
        raise LostLease(f"task {task_id} is no longer ours")


def release(
    conn: sqlite3.Connection, task_id: str, lease_id: str, *,
    status: str, error: str = "",
) -> Optional[dict]:
    """Finish a task and drop the lease, in one statement."""
    if status not in STATUSES:
        raise ValueError(f"unknown task status: {status!r}")
    cur = conn.execute(
        """
        UPDATE tasks SET status = ?, error = ?, lease_id = NULL, lease_until = NULL,
                         updated_at = ?
         WHERE id = ? AND lease_id = ?
        """,
        (status, error, _now(), task_id, lease_id),
    )
    conn.commit()
    return get(conn, task_id) if cur.rowcount else None


def requeue(conn: sqlite3.Connection, task_id: str, lease_id: str) -> None:
    """Put a task back after losing its lease.

    Predicated on still holding the lease, so it no-ops when another worker has
    already taken over — otherwise this would drag their running task back to
    ``queued`` underneath them.

    Requeue, not fail: losing a lease says nothing about whether the work can
    succeed. It usually means this process is going away.
    """
    conn.execute(
        """
        UPDATE tasks SET status = 'queued', lease_id = NULL, lease_until = NULL,
                         updated_at = ?
         WHERE id = ? AND lease_id = ? AND status = 'running'
        """,
        (_now(), task_id, lease_id),
    )
    conn.commit()


# ---------------------------------------------------------------------------
# What this process is already running
# ---------------------------------------------------------------------------

#: Task ids this process holds a live lease for. The lease alone is not enough
#: to keep a worker off them, and the gap is specific: in the gateway, the task
#: a routine opened is running *in this same process*. One hiccup in its
#: heartbeat — a brief database lock is enough — and this process's own worker
#: reads a lapsed lease, decides the owner is gone, and runs the routine a
#: second time. The thread lock in the orchestrator would serialise the two, so
#: it is a re-run rather than a collision, but a re-run is exactly what the
#: lease is for.
#:
#: Not durable, and it should not be: it describes live work in this
#: interpreter. After a restart there is none, and the lease is the right
#: authority again.
_held: set[str] = set()
_held_lock = threading.Lock()


def hold(task_id: str) -> None:
    with _held_lock:
        _held.add(task_id)


def unhold(task_id: str) -> None:
    with _held_lock:
        _held.discard(task_id)


def is_held(task_id: str) -> bool:
    with _held_lock:
        return task_id in _held


# ---------------------------------------------------------------------------
# Heartbeat
# ---------------------------------------------------------------------------


class Heartbeat:
    """Renews a lease in the background for as long as the work runs.

    A failed renewal does **not** raise into the work — it could not, it is on
    another thread. It sets :attr:`lost`, which the next ``guard()`` or
    ``checkpoint()`` turns into a :class:`LostLease` at a point where the
    caller can actually handle it. That deferral is OpenMuse's design and the
    reason the worker never has to defend against an exception arriving from
    nowhere.
    """

    def __init__(self, task_id: str, lease_id: str, *, max_run_s: float = 6 * 3600):
        self.task_id = task_id
        self.lease_id = lease_id
        self.lost = threading.Event()
        self._stop = threading.Event()
        self._max_run_s = max_run_s
        self._thread: Optional[threading.Thread] = None

    def start(self) -> "Heartbeat":
        self._thread = threading.Thread(
            target=self._run, name=f"crew-lease-{self.task_id}", daemon=True,
        )
        self._thread.start()
        return self

    def _run(self) -> None:
        from crew import db as crew_db

        deadline = time.monotonic() + self._max_run_s
        while not self._stop.wait(HEARTBEAT_S):
            if time.monotonic() > deadline:
                # Nothing stops a plugin thread at shutdown, so it stops itself
                # rather than renewing a lease for a run that is never ending.
                log.warning("crew: lease heartbeat for %s gave up after its limit", self.task_id)
                self.lost.set()
                return
            try:
                if not renew(crew_db.connect(), self.task_id, self.lease_id):
                    self.lost.set()
                    return
            except Exception:
                # A database we cannot reach is indistinguishable from a lease
                # we have lost, and the safe reading is that we lost it.
                log.debug("crew: lease renewal failed for %s", self.task_id, exc_info=True)
                self.lost.set()
                return

    def stop(self) -> None:
        self._stop.set()

    def __enter__(self) -> "Heartbeat":
        return self.start()

    def __exit__(self, *exc: Any) -> None:
        self.stop()
