"""Hermes Crew — noticing that a teammate has gone quiet.

Everything else judges a turn once it has ended. Nothing looked at one that is
still running, so a teammate twenty minutes into a hung tool call and one
twenty minutes into real work rendered identically: a pulsing green dot and
the word "working".

OpenBot's framing is what these tests pin — **watch the silence, not the
duration**. A time limit caps how much work a teammate may do, which nobody
asked for; a silence limit caps how long somebody is left staring at a spinner
with no idea whether anything is happening, which is the actual complaint. So
the tests that matter most here are the ones where it stays quiet: a long turn
that is visibly working must never be interrupted with a notice, or people
learn to ignore the notice.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew import presence, watchdog  # noqa: E402

MINUTE = 60 * 1000


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    crew_db.close_all()
    connection = crew_db.connect()
    crew_db.upsert_bot(connection, bot_id="scout", name="Scout")
    crew_db.ensure_dm_thread(connection, "scout")
    yield connection
    crew_db.close_all()


def _claim(conn, *, started_ago_ms: int, what: str = "replying") -> None:
    """A teammate that began a turn ``started_ago_ms`` ago and still holds it."""
    presence.begin(conn, "scout", what=what, thread_id="dm:scout")
    now = crew_db.now_ms()
    conn.execute(
        "UPDATE presence SET started_at = ?, expires_at = ? WHERE bot_id = 'scout'",
        (now - started_ago_ms, now + 60_000),
    )
    conn.commit()


def _notices(conn) -> list[dict]:
    return [
        m for m in crew_db.list_messages(conn, "dm:scout")
        if "nothing has happened" in (m["content"] or "")
    ]


# ---------------------------------------------------------------------------
# When it stays quiet — the half that keeps the notice worth reading
# ---------------------------------------------------------------------------


def test_a_turn_that_just_started_is_not_reported(conn):
    _claim(conn, started_ago_ms=30 * 1000)
    assert watchdog.tick(conn) == 0
    assert _notices(conn) == []


def test_a_long_turn_that_is_visibly_working_is_not_reported(conn):
    """**The test that earns the feature.**

    Two hours of real work is a good outcome, not a fault. Reporting on
    duration would fire here, and a notice that fires on healthy turns is one
    people learn to scroll past — which is the exact failure this exists to
    fix, arriving by the other road.
    """
    from crew import activity as crew_activity

    _claim(conn, started_ago_ms=120 * MINUTE)
    crew_activity.upsert_activity(
        conn, tool_call_id="a1", thread_id="dm:scout", turn_id="t1",
        tool_name="terminal", args={"command": "pytest"}, status="running",
    )

    assert watchdog.tick(conn) == 0
    assert _notices(conn) == []


def test_a_teammate_that_is_not_running_anything_is_not_reported(conn):
    """No claim, nothing to be quiet about. An idle teammate's thread has been
    quiet for days and that is not a fault."""
    assert watchdog.tick(conn) == 0


def test_the_claim_lapsing_ends_the_watch(conn):
    """A turn whose process died stops being watched when its lease does —
    otherwise a crashed gateway would produce a "still running" notice about a
    turn that is not running."""
    _claim(conn, started_ago_ms=60 * MINUTE)
    conn.execute("UPDATE presence SET expires_at = 1 WHERE bot_id = 'scout'")
    conn.commit()
    assert watchdog.tick(conn) == 0


# ---------------------------------------------------------------------------
# When it speaks
# ---------------------------------------------------------------------------


def test_a_turn_with_nothing_to_show_for_itself_is_reported(conn):
    _claim(conn, started_ago_ms=20 * MINUTE, what="routine: Morning digest")

    assert watchdog.tick(conn) == 1
    [notice] = _notices(conn)
    assert "Scout" in notice["content"]
    assert "routine: Morning digest" in notice["content"], "say what it was doing"
    assert "Interrupt it" in notice["content"], "the operator's move, not ours"
    assert notice["sender"] == "scout"


def test_silence_is_measured_from_the_last_sign_of_life(conn):
    """A turn that worked for an hour and then stopped ten minutes ago is
    reported; the hour it spent working is not held against it."""
    from crew import activity as crew_activity

    _claim(conn, started_ago_ms=60 * MINUTE)
    crew_activity.upsert_activity(
        conn, tool_call_id="a1", thread_id="dm:scout", turn_id="t1",
        tool_name="terminal", args={"command": "deploy"}, status="completed",
    )
    conn.execute(
        "UPDATE activities SET updated_at = ? WHERE turn_id = 't1'",
        (crew_db.now_ms() - 5 * MINUTE,),
    )
    conn.commit()
    assert watchdog.tick(conn) == 0, "something happened five minutes ago"

    conn.execute(
        "UPDATE activities SET updated_at = ? WHERE turn_id = 't1'",
        (crew_db.now_ms() - 30 * MINUTE,),
    )
    conn.commit()
    assert watchdog.tick(conn) == 1


def test_streamed_text_counts_as_a_sign_of_life(conn):
    """A teammate reasoning at length streams tokens and calls no tools. Only
    counting activities would call that silence and report a turn that is
    visibly producing an answer."""
    _claim(conn, started_ago_ms=60 * MINUTE)
    crew_db.insert_message(
        conn, thread_id="dm:scout", sender="scout", kind="text",
        content="thinking out loud", streaming=True, turn_id="t1",
    )
    assert watchdog.tick(conn) == 0


def test_it_says_so_once_and_not_on_every_sweep(conn):
    """The sweep runs every few seconds. Without this the operator would get a
    line about the same stuck turn twenty times a minute, which is how a real
    warning becomes noise — the same reason `routine_health.notified_at`
    exists."""
    _claim(conn, started_ago_ms=20 * MINUTE)

    assert watchdog.tick(conn) == 1
    assert watchdog.tick(conn) == 0
    assert watchdog.tick(conn) == 0
    assert len(_notices(conn)) == 1


def test_two_sweeps_that_overlap_still_produce_one_line(conn, monkeypatch):
    """The `warned_at` read and the write are two statements, and the sweep can
    run in more than one process. Two of them reading "not warned yet" before
    either writes is the whole reason the claim is a conditional UPDATE whose
    result is checked, rather than a write followed by a message.

    Frozen rather than threaded: handing both sweeps the same stale snapshot
    *is* the race, without depending on when the scheduler switches. The
    sequential test above cannot see this — the second sweep re-reads
    `warned_at` and skips for the other reason.
    """
    from crew import presence as crew_presence

    _claim(conn, started_ago_ms=20 * MINUTE)
    stale = crew_presence.working(conn)
    assert stale["scout"]["warned_at"] == 0
    monkeypatch.setattr(watchdog, "crew_presence", crew_presence, raising=False)
    monkeypatch.setattr(crew_presence, "working", lambda *a, **k: stale)

    assert watchdog.tick(conn) == 1
    assert watchdog.tick(conn) == 0, "the second sweep loses the claim and says nothing"
    assert len(_notices(conn)) == 1


def test_the_next_turn_can_be_reported_again(conn):
    """"Once" means once per turn, not once ever. The marker lives on the
    presence row, so it goes when the turn does — no reset to forget."""
    _claim(conn, started_ago_ms=20 * MINUTE)
    assert watchdog.tick(conn) == 1

    presence.end(conn, "scout", presence.working(conn)["scout"]["holder"])
    _claim(conn, started_ago_ms=20 * MINUTE)
    assert watchdog.tick(conn) == 1
    assert len(_notices(conn)) == 2


def test_it_never_stops_the_turn(conn):
    """Killing a run that is waiting on a slow API costs the work and fixes
    nothing. The operator can already interrupt; the notice is so they can
    decide to."""
    _claim(conn, started_ago_ms=20 * MINUTE)
    watchdog.tick(conn)
    assert presence.is_working(conn, "scout"), "still running, by design"
