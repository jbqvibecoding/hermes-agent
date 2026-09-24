"""Hermes Crew — the lease, and what it buys.

The crew plugin loads in three kinds of process: the CLI, the gateway (where
routines fire) and the dashboard (where the operator watches). None of them can
see whether another is alive. The lease exists so that none of them has to:
a worker that dies stops renewing, and whoever notices next takes over.

The tests that matter most here are the races and the refusals — a lease that
looks like it works but lets two workers both believe they won, or lets a
replaced worker write over its replacement, is worse than no lease, because the
corruption is silent and arrives under load.
"""

from __future__ import annotations

import sys
import threading
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew import tasks as crew_tasks  # noqa: E402


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    crew_db.close_all()
    connection = crew_db.connect()
    crew_db.upsert_bot(connection, bot_id="scout", name="Scout", role="research")
    yield connection
    crew_db.close_all()


def queued(conn, **over):
    payload = {"bot_id": "scout", "kind": "routine", "title": "Morning digest"}
    payload.update(over)
    return crew_tasks.enqueue(conn, **payload)


def expire(conn, task_id: str) -> None:
    """Make a running task's lease look dead, as a killed process would."""
    conn.execute(
        "UPDATE tasks SET lease_until = ? WHERE id = ?",
        (crew_db.now_ms() - 1000, task_id),
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Due selection
# ---------------------------------------------------------------------------


def test_a_running_task_whose_lease_lapsed_is_up_for_grabs(conn):
    """The entire crash-recovery mechanism, in one clause. Nothing here knows
    or needs to know which process died."""
    task = queued(conn)
    claimed = crew_tasks.claim(conn, task)
    assert crew_tasks.due(conn) == []          # a live lease is not due

    expire(conn, claimed["id"])
    assert [t["id"] for t in crew_tasks.due(conn)] == [claimed["id"]]


def test_a_scheduled_task_waits_for_its_time(conn):
    later = queued(conn, status="scheduled", next_run_at=crew_db.now_ms() + 60_000)
    assert crew_tasks.due(conn) == []

    conn.execute(
        "UPDATE tasks SET next_run_at = ? WHERE id = ?",
        (crew_db.now_ms() - 1, later["id"]),
    )
    conn.commit()
    assert [t["id"] for t in crew_tasks.due(conn)] == [later["id"]]


def test_a_finished_task_is_never_due_again(conn):
    task = queued(conn)
    claimed = crew_tasks.claim(conn, task)
    crew_tasks.release(conn, claimed["id"], claimed["lease_id"], status="succeeded")
    assert crew_tasks.due(conn) == []


def test_a_paused_task_is_not_due_but_is_also_not_finished(conn):
    """`paused` is deliberately outside the terminal set: it is waiting for a
    person, which is a different thing from being over."""
    task = queued(conn)
    conn.execute("UPDATE tasks SET status = 'paused' WHERE id = ?", (task["id"],))
    conn.commit()
    assert crew_tasks.due(conn) == []
    assert crew_tasks.get(conn, task["id"])["status"] not in crew_tasks.TERMINAL


# ---------------------------------------------------------------------------
# The claim
# ---------------------------------------------------------------------------


def test_claiming_takes_ownership_and_counts_the_attempt(conn):
    task = queued(conn)
    claimed = crew_tasks.claim(conn, task)
    assert claimed["status"] == "running"
    assert claimed["lease_id"]
    assert claimed["attempts"] == 1


def test_only_one_of_two_workers_racing_the_same_queued_task_wins(conn):
    task = queued(conn)
    results: list = []
    barrier = threading.Barrier(2)

    def race():
        own = crew_db.connect()          # per-thread connection, as in production
        barrier.wait()
        results.append(crew_tasks.claim(own, crew_tasks.get(own, task["id"])))

    threads = [threading.Thread(target=race) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert sum(1 for r in results if r is not None) == 1


def test_only_one_of_two_workers_racing_the_same_expired_lease_wins(conn):
    first = crew_tasks.claim(conn, queued(conn))
    expire(conn, first["id"])

    stale = crew_tasks.get(conn, first["id"])   # what both workers would read
    results = [crew_tasks.claim(conn, stale), crew_tasks.claim(conn, stale)]

    assert sum(1 for r in results if r is not None) == 1


def test_an_owner_that_was_only_slow_keeps_its_task_against_a_would_be_taker(conn):
    """This is what pinning `lease_until` in the takeover predicate is for, and
    it is not the two-takers case — `lease_id` alone settles that one.

    The dangerous race is a taker against an owner that was never dead, only
    slow: a long tool call, a stopped-world GC, a paused container. The taker
    reads the lapsed row and decides to take over; meanwhile the owner comes
    back and renews. `lease_id` is unchanged, so without the `lease_until` pin
    the taker's WHERE still matches and *both* run the same task — the exact
    double-execution the lease exists to prevent.
    """
    owner = crew_tasks.claim(conn, queued(conn))
    expire(conn, owner["id"])
    stale = crew_tasks.get(conn, owner["id"])       # what the taker read

    assert crew_tasks.renew(conn, owner["id"], owner["lease_id"]) is True   # owner wakes up

    assert crew_tasks.claim(conn, stale) is None
    still = crew_tasks.get(conn, owner["id"])
    assert still["lease_id"] == owner["lease_id"]
    assert still["attempts"] == 1                   # never handed over


def test_a_task_taken_over_too_many_times_fails_instead_of_looping(conn):
    """Hermes's own scheduler makes recurring cron at-most-once because
    "missing one run is far better than firing dozens of times in a crash
    loop". Taking work over reverses that, so the cap is what keeps the
    reversal honest."""
    task = queued(conn)
    for _ in range(crew_tasks.MAX_ATTEMPTS):
        claimed = crew_tasks.claim(conn, crew_tasks.get(conn, task["id"]))
        assert claimed is not None
        expire(conn, task["id"])

    assert crew_tasks.claim(conn, crew_tasks.get(conn, task["id"])) is None
    settled = crew_tasks.get(conn, task["id"])
    assert settled["status"] == "failed"
    assert "kept being interrupted" in settled["error"]


def test_a_terminal_task_cannot_be_claimed(conn):
    task = queued(conn)
    claimed = crew_tasks.claim(conn, task)
    crew_tasks.release(conn, claimed["id"], claimed["lease_id"], status="succeeded")
    assert crew_tasks.claim(conn, crew_tasks.get(conn, task["id"])) is None


# ---------------------------------------------------------------------------
# Holding it
# ---------------------------------------------------------------------------


def test_checkpointing_after_losing_the_lease_raises_rather_than_overwriting(conn):
    """The failure this prevents is the expensive one: a replaced worker's
    checkpoint landing on top of its replacement's progress, with state from a
    run nobody is watching."""
    first = crew_tasks.claim(conn, queued(conn))
    expire(conn, first["id"])
    second = crew_tasks.claim(conn, crew_tasks.get(conn, first["id"]))
    assert second is not None

    with pytest.raises(crew_tasks.LostLease):
        crew_tasks.checkpoint(conn, first["id"], first["lease_id"], {"title": "stale"})

    assert crew_tasks.get(conn, first["id"])["title"] == "Morning digest"


def test_checkpointing_writes_progress_under_a_live_lease(conn):
    claimed = crew_tasks.claim(conn, queued(conn))
    updated = crew_tasks.checkpoint(
        conn, claimed["id"], claimed["lease_id"],
        {"plan": [{"id": "0", "title": "Read the inbox", "status": "running"}]},
    )
    assert updated["plan"][0]["title"] == "Read the inbox"


def test_checkpoint_refuses_a_column_that_does_not_exist(conn):
    claimed = crew_tasks.claim(conn, queued(conn))
    with pytest.raises(ValueError):
        crew_tasks.checkpoint(conn, claimed["id"], claimed["lease_id"], {"nonsense": 1})


def test_guard_passes_while_we_hold_it_and_raises_once_we_do_not(conn):
    claimed = crew_tasks.claim(conn, queued(conn))
    crew_tasks.guard(conn, claimed["id"], claimed["lease_id"])

    conn.execute("UPDATE tasks SET status = 'cancelled' WHERE id = ?", (claimed["id"],))
    conn.commit()
    with pytest.raises(crew_tasks.LostLease):
        crew_tasks.guard(conn, claimed["id"], claimed["lease_id"])


def test_renewing_pushes_the_lease_out_and_fails_once_it_is_gone(conn):
    claimed = crew_tasks.claim(conn, queued(conn))
    expire(conn, claimed["id"])
    assert crew_tasks.renew(conn, claimed["id"], claimed["lease_id"]) is True
    assert crew_tasks.get(conn, claimed["id"])["lease_until"] > crew_db.now_ms()

    assert crew_tasks.renew(conn, claimed["id"], "not-our-lease") is False


def test_losing_a_lease_requeues_rather_than_failing(conn):
    """Losing a lease says nothing about whether the work can succeed — it
    usually means this process is going away."""
    claimed = crew_tasks.claim(conn, queued(conn))
    crew_tasks.requeue(conn, claimed["id"], claimed["lease_id"])
    assert crew_tasks.get(conn, claimed["id"])["status"] == "queued"


def test_requeueing_cannot_drag_back_a_task_somebody_else_took_over(conn):
    first = crew_tasks.claim(conn, queued(conn))
    expire(conn, first["id"])
    second = crew_tasks.claim(conn, crew_tasks.get(conn, first["id"]))

    crew_tasks.requeue(conn, first["id"], first["lease_id"])   # the loser, late

    still = crew_tasks.get(conn, first["id"])
    assert still["status"] == "running"
    assert still["lease_id"] == second["lease_id"]


# ---------------------------------------------------------------------------
# No startup sweep
# ---------------------------------------------------------------------------


def test_nothing_touches_a_running_task_on_a_fresh_connection(conn, tmp_path):
    """OpenMuse's rule, and the reason it applies to us even harder: no
    statement run at boot can tell "the run I crashed out of" from "a run a
    healthy peer is in the middle of", and every process here loads the same
    plugin. Expiry answers both without knowing which."""
    claimed = crew_tasks.claim(conn, queued(conn))

    crew_db.close_all()
    fresh = crew_db.connect()            # a restart, as far as the schema knows

    still = crew_tasks.get(fresh, claimed["id"])
    assert still["status"] == "running"
    assert still["lease_id"] == claimed["lease_id"]


# ---------------------------------------------------------------------------
# Enqueueing
# ---------------------------------------------------------------------------


def test_the_same_work_enqueued_twice_is_one_task(conn):
    """A routine that fires while its previous run is still going must not
    stack a second copy of itself."""
    first = queued(conn, idem_key="routine:scout:digest")
    second = queued(conn, idem_key="routine:scout:digest")
    assert first["id"] == second["id"]
    assert len(crew_tasks.list_tasks(conn, "scout")) == 1


def test_json_columns_survive_the_round_trip(conn):
    task = queued(conn, input={"instructions": "读一下收件箱"}, plan=[{"id": "0"}])
    read = crew_tasks.get(conn, task["id"])
    assert read["input"]["instructions"] == "读一下收件箱"
    assert read["plan"] == [{"id": "0"}]
    assert read["state"] == {}
    assert read["evidence"] == []


def test_an_unknown_status_is_refused(conn):
    with pytest.raises(ValueError):
        queued(conn, status="probably-fine")
