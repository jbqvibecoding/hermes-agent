#!/usr/bin/env python3
"""Kill a teammate mid-routine and watch another process finish the job.

Every other test of this machinery simulates the crash: a unit test sets
``lease_until`` to a past timestamp and calls it a dead worker. That proves the
SQL, and it cannot prove the thing the design actually claims — that a real
process, killed with ``SIGKILL`` while holding a real lease, is picked up by a
different real process reading the same SQLite file.

So this one does it for real:

1. **Process A** opens a routine's task, claims the lease, starts the
   heartbeat and the presence claim, and then kills itself with signal 9. No
   ``finally``, no shutdown hook, no chance to tidy up — which is the whole
   point, because a crash does not run cleanup.
2. The parent watches the *presence* claim lapse on its own (45s), then the
   *task* lease lapse (60s). Nothing runs to make either happen.
3. **Process B** sweeps, takes the task over, runs it, and settles it
   ``succeeded`` with the delivered text in the thread.

It needs no model and no container: the routine is a ``text`` routine, the
path F6 added so that "stand-up at 09:45" does not wake an agent to be read
back. That is what makes this runnable anywhere, and it is also the path most
likely to be wrong, because it is the one nobody exercises by hand.

Run it directly. It is not a pytest test: it takes about two minutes, most of
that spent waiting for two leases to expire in real time, and a suite that
waits two minutes for one assertion is a suite people start skipping.
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
PLUGIN = REPO / "plugins" / "hermes-crew"
sys.path.insert(0, str(PLUGIN))

JOB_ID = "crash-check-1"
BOT = "scout"
PROMPT = "Stand-up in five minutes — bring the deploy numbers."


#: Process B. ``tick()`` is called directly rather than through
#: ``ensure_worker()``: the three gates on that function are about whether a
#: *background thread* should exist in this process, and here the sweep is the
#: whole point of the process.
WORKER = r'''
import sys
sys.path.insert(0, %(plugin)r)
from crew import worker as crew_worker
print("TOOK", crew_worker.tick())
'''


# ---------------------------------------------------------------------------
# Process A: claim the work, then die without warning
# ---------------------------------------------------------------------------

CHILD = r'''
import os, signal, sys, time
sys.path.insert(0, %(plugin)r)
from crew import db as crew_db, hooks as crew_hooks, tasks as crew_tasks

conn = crew_db.connect()
crew_db.upsert_bot(conn, bot_id=%(bot)r, name="Scout")
crew_db.ensure_dm_thread(conn, %(bot)r)

crew_hooks.on_cron_job_fired(
    job_id=%(job)r, job_name="crew:%(bot)s:Stand-up", prompt=%(prompt)r,
    deliver_prompt=True,
)

[task] = crew_tasks.list_tasks(conn, %(bot)r)
# flush before the kill, or the claim we just made is invisible to the parent:
# SIGKILL does not drain a pipe's buffer.
print("CLAIMED", task["id"], task["status"], flush=True)

# Signal 9 to our own pid: no atexit, no finally, no lease release, no
# presence release. Exactly what a killed gateway leaves behind.
os.kill(os.getpid(), signal.SIGKILL)
time.sleep(30)
'''


def main() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="crew-crash-"))
    db = tmp / "crew.db"
    env = dict(os.environ, HERMES_CREW_DB=str(db), PYTHONDONTWRITEBYTECODE="1")
    env.pop("PYTEST_CURRENT_TEST", None)

    from crew import db as crew_db
    from crew import presence, tasks as crew_tasks

    os.environ["HERMES_CREW_DB"] = str(db)

    print(f"database: {db}")
    print("\n[1] process A claims the work and is killed mid-run")
    child = subprocess.run(
        [sys.executable, "-c", CHILD % {
            "plugin": str(PLUGIN), "bot": BOT, "job": JOB_ID, "prompt": PROMPT,
        }],
        env=env, capture_output=True, text=True, timeout=120,
    )
    print("   ", (child.stdout or "").strip() or "(no output)")
    if child.returncode != -9:
        print("    stderr:", (child.stderr or "").strip()[-1500:])
    assert child.returncode == -9, f"expected SIGKILL, got {child.returncode}"
    print("    process A died with SIGKILL (returncode -9)")

    conn = crew_db.connect(db)

    tasks = crew_tasks.list_tasks(conn, BOT)
    assert len(tasks) == 1, tasks
    task = tasks[0]
    assert task["status"] == "running", task["status"]
    print(f"    task {task['id']} reads 'running' with a lease nobody holds")

    busy = presence.working(conn)
    assert BOT in busy, "the dashboard should still see it as working"
    print(f"    presence says: {busy[BOT]['what']!r} (read from another process)")

    assert crew_tasks.due(conn) == [], "the lease has not lapsed yet"
    print("    nothing is claimable yet — the lease is still live")

    print(f"\n[2] waiting {presence.LEASE_S}s for the presence claim to lapse "
          f"(nothing runs to clear it)")
    _wait_until(lambda: not presence.working(crew_db.connect(db)),
                timeout=presence.LEASE_S + 20, label="presence")
    print("    presence is empty — the badge cleared itself")

    print(f"\n[3] waiting for the task lease to lapse")
    _wait_until(lambda: bool(crew_tasks.due(crew_db.connect(db))),
                timeout=crew_tasks.LEASE_MS / 1000 + 30, label="lease")
    print("    the task is claimable again")

    print("\n[4] process B sweeps and finishes it")
    worker = subprocess.run(
        [sys.executable, "-c", WORKER % {"plugin": str(PLUGIN)}],
        env=env, capture_output=True, text=True, timeout=180,
    )
    print("   ", (worker.stdout or "").strip() or (worker.stderr or "").strip()[-400:])

    conn = crew_db.connect(db)
    [task] = crew_tasks.list_tasks(conn, BOT)
    messages = crew_db.list_messages(conn, crew_db.dm_thread_id(BOT))
    delivered = [m for m in messages if PROMPT in (m["content"] or "")]

    print(f"\n    task status : {task['status']}")
    print(f"    attempts    : {task['attempts']}")
    print(f"    messages    : {len(messages)}")
    for m in messages:
        print(f"      [{m['kind']}] {m['sender']}: {(m['content'] or '')[:70]}")

    ok = task["status"] == "succeeded" and bool(delivered)
    print("\nRESULT:", "PASS — a killed routine finished itself in another process"
          if ok else "FAIL — see above")
    return 0 if ok else 1


def _wait_until(predicate, *, timeout: float, label: str) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if predicate():
            return
        time.sleep(2)
    raise AssertionError(f"{label} did not lapse within {timeout}s")


if __name__ == "__main__":
    sys.exit(main())
