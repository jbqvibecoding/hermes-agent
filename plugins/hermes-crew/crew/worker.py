"""The thread that picks up work nobody is running any more.

Small on purpose. Everything interesting is in :mod:`crew.tasks`; this is the
loop that calls it, plus — and this is most of the file — the question of when
it is allowed to exist at all.

**Only the gateway runs one.** Not because the dashboard could not, but because
there would be nothing for it to do: routines fire in the gateway, the gateway
is the only thing that produces tasks, and if it is not running there is no
work to recover. The dashboard is where you watch from, not where things run.

That also avoids a real hazard. The crew plugin is a bundled ``kind: backend``
plugin, so it loads unconditionally — including under pytest, where the root
conftest resets the plugin manager for every test and ``register()`` therefore
runs many times per file. And ``dashboard/plugin_api.py`` is exec'd by every
test that imports ``hermes_cli.web_server`` (dozens), plus ten more times by
the crew contract tests' own fixture. A worker started from either would be
started over and over inside the test suite.

The damage would not be a hang — daemon threads do not hold up interpreter
shutdown — it would be silent corruption. ``crew_db_path()`` resolves at call
time and the root conftest does not clear ``HERMES_CREW_DB``, so a thread that
outlives its test writes into the developer's real ``~/.hermes/crew.db``.
``tests/agent/test_curator.py`` carries the same incident, written up at
length. Hence the pytest guard below, belt to the gateway's braces.

Nothing in this repository stops a plugin thread at shutdown — there is no
plugin shutdown lifecycle of any kind — so the loop is a daemon, takes a stop
event for the callers that can use one, and gives itself a deadline.
"""

from __future__ import annotations

import logging
import os
import threading
import time
from typing import Optional

log = logging.getLogger(__name__)

#: How long the loop sleeps between sweeps. Tasks are recovered, not dispatched
#: — nobody is waiting on a stopwatch — so this is deliberately unhurried.
DEFAULT_INTERVAL_S = 5.0

#: The thread retires after this long rather than run forever unattended.
MAX_LIFETIME_S = 24 * 3600

_worker_thread: Optional[threading.Thread] = None
_worker_stop = threading.Event()
_worker_lock = threading.Lock()


def should_run() -> bool:
    """Whether this process is allowed to run the worker.

    Three gates, each closing a different hole:

    * the gateway, because that is where routines fire and where the work is;
    * never under pytest — plugin discovery re-runs for every test, so without
      this the suite would start a worker per test and any straggler would
      write into the developer's real crew database;
    * an escape hatch, because a background thread somebody cannot turn off is
      a support problem waiting to happen.
    """
    if os.environ.get("HERMES_CREW_WORKER", "").strip() == "0":
        return False
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return False
    return os.environ.get("_HERMES_GATEWAY") == "1"


def ensure_worker() -> bool:
    """Start the worker once. Returns whether this call started it.

    Idempotent because ``register()`` can genuinely be called more than once in
    a process — the plugin manager re-runs its sweep on ``force=True`` and
    after a failed sweep — and a second worker would double every takeover.
    Shaped after ``hermes_cli/nous_auth_keepalive.py``: module global, lock,
    liveness check.
    """
    global _worker_thread
    if not should_run():
        return False
    with _worker_lock:
        if _worker_thread is not None and _worker_thread.is_alive():
            return False
        _worker_stop.clear()
        _worker_thread = threading.Thread(
            target=run_worker, args=(_worker_stop,), name="crew-tasks", daemon=True,
        )
        _worker_thread.start()
    log.info("crew: task worker started")
    return True


def stop_worker(timeout: float = 5.0) -> None:
    """Ask the worker to stop and wait briefly. Safe to call when none runs."""
    global _worker_thread
    with _worker_lock:
        thread = _worker_thread
        _worker_thread = None
    _worker_stop.set()
    if thread is not None and thread.is_alive():
        thread.join(timeout=timeout)


def run_worker(stop_event: threading.Event, *, interval: float = DEFAULT_INTERVAL_S) -> None:
    """Sweep for abandoned work until asked to stop.

    Takes the stop event and the interval as arguments so a test can drive the
    loop directly with ``interval=0`` rather than starting a thread and hoping
    — the pattern ``tests/cron/test_scheduler_provider.py`` uses for the
    desktop ticker.
    """
    from crew import db as crew_db

    deadline = time.monotonic() + MAX_LIFETIME_S
    try:
        while not stop_event.wait(interval):
            if time.monotonic() > deadline:
                log.info("crew: task worker retiring after its lifetime")
                return
            try:
                tick()
            except Exception:
                # One bad sweep must not end the worker; the next one may well
                # succeed, and there is nobody to restart it if it stops.
                log.debug("crew: task sweep failed", exc_info=True)
    finally:
        # The only chance this thread's connection ever gets closed.
        # `close_all` is thread-local and has no production callers anywhere
        # else, so without this the handle lives until the interpreter dies.
        try:
            crew_db.close_all()
        except Exception:
            log.debug("crew: could not close the worker's database handles", exc_info=True)


def tick() -> int:
    """One sweep. Returns how many tasks were taken over."""
    from crew import db as crew_db
    from crew import tasks as crew_tasks

    # Re-resolved every sweep rather than hoisted, so a database path that
    # changes under us cannot strand the worker on a stale handle.
    conn = crew_db.connect()
    taken = 0
    for task in crew_tasks.due(conn):
        if crew_tasks.is_held(task["id"]):
            continue                      # this process is already running it
        claimed = crew_tasks.claim(conn, task)
        if claimed is None:
            continue                      # somebody else got there first
        taken += 1
        _run(conn, claimed)
    return taken


def _run(conn, task: dict) -> None:
    """Carry out one claimed task, holding its lease for the duration."""
    from crew import tasks as crew_tasks

    task_id, lease_id = task["id"], task["lease_id"]
    crew_tasks.hold(task_id)
    crew_tasks.set_current(task["bot_id"], task_id, lease_id)
    heartbeat = crew_tasks.Heartbeat(task_id, lease_id).start()
    try:
        _dispatch(task)
        crew_tasks.release(conn, task_id, lease_id, status="succeeded")
    except crew_tasks.LostLease:
        # Somebody else owns this now, or it was paused or cancelled under us.
        # Not a failure — put it back and let whoever holds it get on with it.
        log.info("crew: lost the lease on %s mid-run; requeueing", task_id)
        crew_tasks.requeue(conn, task_id, lease_id)
    except Exception as exc:
        log.warning("crew: task %s failed", task_id, exc_info=True)
        crew_tasks.release(conn, task_id, lease_id, status="failed", error=str(exc))
    finally:
        heartbeat.stop()
        crew_tasks.clear_current(task["bot_id"])
        crew_tasks.unhold(task_id)


def _dispatch(task: dict) -> None:
    """Do whatever this kind of task is.

    A routine's task carries the cron job's own prompt, so re-running it is the
    same turn the gateway would have run — not a reconstruction of it.
    """
    from crew import orchestrator

    if task["kind"] != "routine":
        raise ValueError(f"no runner for task kind {task['kind']!r}")

    prompt = (task["input"] or {}).get("prompt") or ""
    if not prompt.strip():
        raise ValueError("this routine's task has no prompt to run")

    orchestrator.start_turn(
        task["bot_id"], task["thread_id"], prompt, persist_user_message=False,
    )
