"""Hermes Crew — "working" as a lease instead of a flag in somebody's memory.

The sidebar's badge read ``orchestrator._working``, a dict in **the asking
process's** memory. That is right only when the process being asked started the
turn, and since routines moved to the gateway it usually was not: a routine
burning there rendered as *idle* in the dashboard, to whoever was deciding
whether to interrupt it.

The obvious fix — persist a flag — trades that for a worse error. A flag needs
somebody to clear it, and the case where nobody does is the case that matters:
kill the gateway mid-turn and the teammate says "working" until a person edits
the row. rowboat's ``agent-activity.ts`` makes the claim expire instead, so a
process that dies stops claiming without any shutdown path having to run.

So the tests below are mostly about the expiry: that it releases a claim
nobody renewed, that a renewal actually holds one open, and that a renewal
cannot resurrect a claim a newer turn has taken over.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew import presence  # noqa: E402


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    crew_db.close_all()
    connection = crew_db.connect()
    for bot_id, name in (("ada", "Ada"), ("scout", "Scout")):
        crew_db.upsert_bot(connection, bot_id=bot_id, name=name)
        crew_db.ensure_dm_thread(connection, bot_id)
    yield connection
    crew_db.close_all()


# ---------------------------------------------------------------------------
# The claim
# ---------------------------------------------------------------------------


def test_nobody_is_working_until_somebody_claims_it(conn):
    assert presence.working(conn) == {}
    assert not presence.is_working(conn, "ada")


def test_a_claim_is_visible_to_a_reader_that_did_not_make_it(conn):
    """**The reason this exists.** The reader here is standing in for the
    dashboard process, which never ran the turn and previously had no way to
    know one was running."""
    presence.begin(conn, "ada", what="routine: standup", thread_id="dm:ada")

    busy = presence.working(conn)
    assert set(busy) == {"ada"}
    assert busy["ada"]["what"] == "routine: standup"
    assert busy["ada"]["thread_id"] == "dm:ada"


def test_what_it_is_doing_travels_with_the_claim(conn):
    """"Working" is a colour; "routine: standup" is an answer. Carrying the
    label on the claim is what lets the sidebar say which of the several things
    a teammate can be mid-way through it is actually mid-way through."""
    presence.begin(conn, "ada", what="in Launch room")
    presence.begin(conn, "scout", what="replying")
    labels = {b: row["what"] for b, row in presence.working(conn).items()}
    assert labels == {"ada": "in Launch room", "scout": "replying"}


def test_one_teammates_claim_is_not_anothers(conn):
    presence.begin(conn, "ada")
    assert presence.is_working(conn, "ada")
    assert not presence.is_working(conn, "scout")


# ---------------------------------------------------------------------------
# The expiry — the part a flag cannot do
# ---------------------------------------------------------------------------


def test_a_claim_nobody_renews_stops_being_true(conn):
    """**The whole argument for a lease.** Nothing ran to clear this: no
    shutdown hook, no startup sweep, no `finally`. That is the point — the
    process that made the claim is modelled here as having been killed, and
    killed processes do not run cleanup."""
    presence.begin(conn, "ada")
    later = time.time() + presence.LEASE_S + 1
    assert presence.working(conn, now=later) == {}
    assert not presence.is_working(conn, "ada", now=later)


def test_renewing_holds_the_claim_open(conn):
    """The pair to the test above: a turn that is genuinely still running must
    not blink out of the sidebar every `LEASE_S` seconds."""
    holder = presence.begin(conn, "ada")
    mid = time.time() + presence.LEASE_S - 1
    assert presence.renew(conn, "ada", holder, now=mid) is True

    still_running = mid + presence.LEASE_S - 1
    assert presence.is_working(conn, "ada", now=still_running)


def test_an_expired_claim_is_filtered_rather_than_deleted(conn):
    """Reading is the hot path — every roster render calls it — and a read that
    writes puts the sidebar in contention with the turns it is describing. The
    table is keyed by teammate, so it stays bounded without a reaper."""
    presence.begin(conn, "ada")
    presence.working(conn, now=time.time() + presence.LEASE_S + 1)
    assert conn.execute("SELECT COUNT(*) AS n FROM presence").fetchone()["n"] == 1


def test_a_stale_holder_cannot_renew_after_a_newer_turn_took_over(conn):
    """A slow heartbeat from the previous turn must not extend the new turn's
    badge under the old turn's label — the row would then outlive both and say
    the wrong thing about what is running."""
    old = presence.begin(conn, "ada", what="replying")
    new = presence.begin(conn, "ada", what="routine: standup")

    assert presence.renew(conn, "ada", old) is False
    assert presence.renew(conn, "ada", new) is True
    assert presence.working(conn)["ada"]["what"] == "routine: standup"


def test_releasing_is_scoped_to_the_holder(conn):
    """Same reason as the renewal: an old turn unwinding late must not clear
    the badge of the turn that replaced it."""
    old = presence.begin(conn, "ada")
    presence.begin(conn, "ada")

    presence.end(conn, "ada", old)
    assert presence.is_working(conn, "ada"), "the newer claim still stands"


def test_releasing_clears_it_immediately(conn):
    """The expiry is the safety net for a process that dies, not the normal
    path. A teammate that finished should go grey now, not in a lease."""
    holder = presence.begin(conn, "ada")
    presence.end(conn, "ada", holder)
    assert presence.working(conn) == {}


def test_two_holders_of_the_same_run_are_never_the_same_string():
    """Pids are reused. Without the random half, a restarted gateway with a
    recycled pid could renew or release a claim a previous life had made."""
    assert presence._holder() != presence._holder()


# ---------------------------------------------------------------------------
# The Lease helper
# ---------------------------------------------------------------------------


def test_the_lease_claims_on_entry_and_releases_on_exit(conn):
    with presence.Lease("ada", what="replying"):
        assert presence.is_working(conn, "ada")
    assert not presence.is_working(conn, "ada")


def test_a_lease_that_cannot_reach_the_database_does_not_break_the_turn(conn, monkeypatch):
    """This is a display property. A teammate whose badge could not be set
    still has to do the work it was asked to do."""
    monkeypatch.setattr(presence, "begin", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("no db")))
    with presence.Lease("ada") as lease:
        assert lease.holder == ""
    assert not presence.is_working(conn, "ada")


# ---------------------------------------------------------------------------
# The orchestrator's edges
# ---------------------------------------------------------------------------


def test_a_turn_claims_the_badge_and_gives_it_back(conn):
    from crew import orchestrator

    orchestrator._mark_working("ada", +1, what="replying", thread_id="dm:ada")
    assert presence.working(conn)["ada"]["what"] == "replying"

    orchestrator._mark_working("ada", -1)
    assert presence.working(conn) == {}


def test_a_nested_turn_does_not_re_claim_or_early_release(conn):
    """A teammate can be mid-DM and mid-group-round at once. Re-claiming would
    hand the row a new holder that the outer turn's release then cannot match,
    leaving a claim to expire on its own with somebody right there to end it —
    and releasing on the inner turn would grey out a teammate still working.
    """
    from crew import orchestrator

    orchestrator._mark_working("ada", +1, what="replying")
    holder = conn.execute("SELECT holder FROM presence WHERE bot_id='ada'").fetchone()["holder"]

    orchestrator._mark_working("ada", +1, what="in Launch room")
    assert conn.execute(
        "SELECT holder, what FROM presence WHERE bot_id='ada'"
    ).fetchone()["holder"] == holder, "the outer turn still owns the claim"

    orchestrator._mark_working("ada", -1)
    assert presence.is_working(conn, "ada"), "still mid-turn"

    orchestrator._mark_working("ada", -1)
    assert not presence.is_working(conn, "ada")


def test_the_roster_helper_reads_across_processes(conn):
    """`working_bot_ids` is what the HTTP handlers call. It used to answer from
    this module's memory; the point of the change is that it no longer does."""
    from crew import orchestrator

    presence.begin(conn, "scout", what="routine: standup")   # "another process"
    assert orchestrator.working_bot_ids(conn) == frozenset({"scout"})


# ---------------------------------------------------------------------------
# What the roster shows
# ---------------------------------------------------------------------------


def test_the_roster_sees_a_turn_it_did_not_start(conn, monkeypatch):
    """The regression in one line. Before the lease this read a dict in this
    module's memory, so a turn started anywhere else — the gateway, a platform
    adapter, the worker tick — rendered as `idle`."""
    from crew import roster

    monkeypatch.setattr(roster, "profile_dir", lambda bot_id: Path("/nonexistent"))
    presence.begin(conn, "ada", what="routine: standup")

    rows = {row["id"]: row for row in roster.list_teammates(conn)}
    assert rows["ada"]["status"] == "working"
    assert rows["ada"]["working_on"] == "routine: standup"
    assert rows["scout"]["status"] != "working"
    assert rows["scout"]["working_on"] == ""


def test_the_roster_goes_quiet_again_once_the_claim_lapses(conn, monkeypatch):
    from crew import roster

    monkeypatch.setattr(roster, "profile_dir", lambda bot_id: Path("/nonexistent"))
    presence.begin(conn, "ada", what="routine: standup")
    # The process that made the claim is gone. Nothing releases it.
    conn.execute("UPDATE presence SET expires_at = 1 WHERE bot_id = 'ada'")
    conn.commit()

    rows = {row["id"]: row for row in roster.list_teammates(conn)}
    assert rows["ada"]["status"] != "working"
    assert rows["ada"]["working_on"] == ""
