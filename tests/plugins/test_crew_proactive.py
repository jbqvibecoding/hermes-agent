"""Hermes Crew — the teammate that speaks before it is spoken to.

Three things are pinned here beyond "it works", because each is a way this
could quietly stop being true:

* **The scheduler is a pure function**, so its edges are asserted directly
  rather than by running it and hoping — including the two that only show up
  at boundaries: a candidate outside the active window, and a window that
  wraps past midnight.
* **The dedup record is written after the message, never before.** The other
  order loses an item permanently the first time a write fails, and it fails
  silently, which is the worst combination available.
* **The wait lives in the database.** octop's equivalent sleeps inside an
  asyncio task and re-rolls every agent's time on restart, so a gateway that
  restarts often can starve a teammate forever with silence as the only
  symptom. A test reads the column back through a fresh connection.
"""

from __future__ import annotations

import random
import sys
from datetime import datetime, time, timedelta, timezone
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew.proactive import picker as crew_picker  # noqa: E402
from crew.proactive import scheduler as crew_scheduler  # noqa: E402
from crew.proactive import service as crew_service  # noqa: E402

DAY = crew_picker.DAY_MS


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    crew_db.close_all()
    connection = crew_db.connect()
    crew_db.upsert_bot(connection, bot_id="scout", name="Scout", role="research")
    crew_db.ensure_dm_thread(connection, "scout")
    yield connection
    crew_db.close_all()


def _at(now_ms: int, days_ago: float) -> int:
    return int(now_ms - days_ago * DAY)


# ---------------------------------------------------------------------------
# The scheduler: a pure function, tested at its edges
# ---------------------------------------------------------------------------

_NINE = time(9, 0)
_NINE_PM = time(21, 0)


def _trigger(now: datetime, *, seed: int = 0, lo: float = 4, hi: float = 12, **kw) -> datetime:
    return crew_scheduler.compute_next_trigger(
        now=now,
        active_start=kw.get("start", _NINE),
        active_end=kw.get("end", _NINE_PM),
        min_interval_hours=lo,
        max_interval_hours=hi,
        rng=random.Random(seed),
    )


def test_a_time_inside_the_window_is_used_as_is():
    """The common path: 10am plus an hour or two is still working hours, so the
    random interval is used unchanged rather than deferred anywhere."""
    now = datetime(2026, 3, 4, 10, 0, tzinfo=timezone.utc)
    nxt = _trigger(now, lo=1, hi=2)
    assert now + timedelta(hours=1) <= nxt <= now + timedelta(hours=2)
    assert crew_scheduler.in_active_hours(nxt, start=_NINE, end=_NINE_PM)


def test_a_time_past_the_window_moves_to_the_next_morning():
    """8pm plus four-to-twelve hours lands in the night. It waits."""
    now = datetime(2026, 3, 4, 20, 0, tzinfo=timezone.utc)
    nxt = _trigger(now)
    assert nxt.date() == datetime(2026, 3, 5).date()
    assert _NINE <= nxt.time() <= time(11, 0), "next morning, within the spread"


def test_deferred_teammates_are_spread_rather_than_stacked_on_the_hour():
    """**Why the spread exists.**

    Clamping a deferred teammate to the window boundary would put every one of
    them at 09:00 exactly — the single moment a person is least able to absorb
    three unprompted notes at once. Different seeds must give different minutes.
    """
    now = datetime(2026, 3, 4, 23, 30, tzinfo=timezone.utc)
    minutes = {_trigger(now, seed=seed).time() for seed in range(8)}
    assert len(minutes) > 1, "every deferred teammate landed on the same minute"


def test_a_window_that_wraps_past_midnight_is_read_as_wrapping():
    """`22:00`–`06:00` is a real night-shift window. Read naively as
    `start <= t < end` it is empty, and an empty window means a teammate that
    is never allowed to speak and never explains why."""
    assert crew_scheduler.in_active_hours(
        datetime(2026, 3, 4, 23, 0, tzinfo=timezone.utc), start=time(22, 0), end=time(6, 0),
    )
    assert crew_scheduler.in_active_hours(
        datetime(2026, 3, 4, 2, 0, tzinfo=timezone.utc), start=time(22, 0), end=time(6, 0),
    )
    assert not crew_scheduler.in_active_hours(
        datetime(2026, 3, 4, 12, 0, tzinfo=timezone.utc), start=time(22, 0), end=time(6, 0),
    )


def test_a_zero_interval_does_not_produce_something_immediately_due():
    """**The anti-spin guard**, ported from octop's `_MIN_SLEEP_SECONDS`.

    A `min_interval_hours` of 0 is a plausible thing for somebody to type
    meaning "as often as you like". Without the floor it means "every time the
    worker comes round", which is every few seconds — a teammate talking
    continuously because of one config value.
    """
    now = datetime(2026, 3, 4, 10, 0, tzinfo=timezone.utc)
    nxt = _trigger(now, lo=0, hi=0)
    assert (nxt - now).total_seconds() >= crew_scheduler.MIN_LEAD_S


def test_unreadable_quiet_hours_fall_back_rather_than_raise():
    """A typo in a config value must not stop a teammate speaking forever."""
    assert crew_scheduler.parse_hhmm("nonsense", time(9, 0)) == time(9, 0)
    assert crew_scheduler.parse_hhmm("", time(9, 0)) == time(9, 0)
    assert crew_scheduler.parse_hhmm("07:30", time(9, 0)) == time(7, 30)


# ---------------------------------------------------------------------------
# The picker: scoring, dedup, and widening rather than falling silent
# ---------------------------------------------------------------------------


def _candidate(subject: str, kind: str, *, now_ms: int, days_ago: float) -> crew_picker.Candidate:
    return crew_picker.Candidate(
        subject=subject, kind=kind, summary=subject, at_ms=_at(now_ms, days_ago),
    )


def test_the_two_time_weights_pull_against_each_other():
    """Not redundant: `intensity` rises with age and `recency_weight` falls.

    The tension is the design. Something stuck for two days should beat both
    something stuck for two hours (not yet worth a note) and something stuck
    since last month (visibly abandoned, and saying so again helps nobody)."""
    now = 10 * DAY
    fresh = _candidate("a", "task_failed", now_ms=now, days_ago=0.5)
    middle = _candidate("b", "task_failed", now_ms=now, days_ago=2)
    old = _candidate("c", "task_failed", now_ms=now, days_ago=8)

    assert crew_picker.intensity(fresh, now) < crew_picker.intensity(old, now)
    assert crew_picker.recency_weight(fresh, now) > crew_picker.recency_weight(old, now)
    assert crew_picker.score(middle, now) > crew_picker.score(fresh, now)


def test_the_intensity_of_a_forgotten_item_stops_climbing():
    """Without the cap, one item forgotten a year ago outranks everything that
    happened this week, forever."""
    now = 400 * DAY
    a_month = _candidate("a", "task_failed", now_ms=now, days_ago=30)
    a_year = _candidate("b", "task_failed", now_ms=now, days_ago=365)
    assert crew_picker.intensity(a_month, now) == crew_picker.intensity(a_year, now)


def test_an_outcome_nobody_saw_outranks_a_plain_failure():
    """The 1.5 tier is not 'important', it is 'a person has to go and look and
    does not know it'. A failure says nothing happened; an unknown outcome says
    the email may well have gone out."""
    now = 10 * DAY
    unknown = _candidate("a", "approval_outcome_unknown", now_ms=now, days_ago=1)
    failed = _candidate("b", "task_failed", now_ms=now, days_ago=1)
    assert crew_picker.score(unknown, now) > crew_picker.score(failed, now)


def test_one_thing_is_raised_once_per_note():
    """Dedup by subject — ours for octop's dedup by person. Same intent: a
    single note must not say the same thing three times."""
    now = 10 * DAY
    picked = crew_picker.pick(
        [
            _candidate("routine:j1", "routine_suspended", now_ms=now, days_ago=1),
            _candidate("routine:j1", "routine_suspended", now_ms=now, days_ago=2),
            _candidate("task:t1", "task_failed", now_ms=now, days_ago=1),
        ],
        raised=set(), now_ms=now,
    )
    assert [c.subject for c in picked.candidates] == ["routine:j1", "task:t1"]


def test_at_most_three_things_in_one_note():
    now = 10 * DAY
    picked = crew_picker.pick(
        [_candidate(f"task:{n}", "task_failed", now_ms=now, days_ago=1) for n in range(9)],
        raised=set(), now_ms=now,
    )
    assert len(picked.candidates) == crew_picker.TOP_K


def test_when_everything_recent_was_already_raised_it_looks_further_back():
    """**octop's nicest touch, kept.**

    A teammate whose only news is eight days old should say "this is still
    sitting there", not go quiet for a week. Widening only after the near
    window comes back empty keeps recent things winning when there are any.
    """
    now = 40 * DAY
    candidates = [
        _candidate("task:new", "task_failed", now_ms=now, days_ago=2),
        _candidate("task:old", "task_failed", now_ms=now, days_ago=20),
    ]
    picked = crew_picker.pick(candidates, raised={"task:new"}, now_ms=now)

    assert [c.subject for c in picked.candidates] == ["task:old"]
    assert picked.window_days == crew_picker.FALLBACK_DAYS


def test_recent_news_wins_while_there_is_any():
    now = 40 * DAY
    picked = crew_picker.pick(
        [
            _candidate("task:new", "task_failed", now_ms=now, days_ago=2),
            _candidate("task:old", "approval_outcome_unknown", now_ms=now, days_ago=20),
        ],
        raised=set(), now_ms=now,
    )
    assert [c.subject for c in picked.candidates] == ["task:new"]
    assert picked.window_days == crew_picker.WINDOW_DAYS


def test_nothing_to_say_is_a_valid_answer():
    now = 40 * DAY
    picked = crew_picker.pick(
        [_candidate("task:x", "task_failed", now_ms=now, days_ago=1)],
        raised={"task:x"}, now_ms=now,
    )
    assert picked.candidates == ()


# ---------------------------------------------------------------------------
# Reading the material out of crew.db
# ---------------------------------------------------------------------------


def test_the_material_is_the_state_we_already_keep(conn):
    """No new extraction step. An approval nobody saw through, a task that
    failed and a suspended routine are all already rows."""
    now = crew_db.now_ms()
    conn.execute(
        "INSERT INTO approvals (thread_id, bot_id, action, status, created_at) "
        "VALUES ('dm:scout', 'scout', 'Send the invoice', 'outcome_unknown', ?)",
        (_at(now, 1),),
    )
    conn.execute(
        "INSERT INTO tasks (id, bot_id, kind, title, status, error, created_at, updated_at) "
        "VALUES ('t1', 'scout', 'routine', 'Morning digest', 'failed', 'API was down', ?, ?)",
        (_at(now, 1), _at(now, 1)),
    )
    conn.execute(
        "INSERT INTO routine_health (job_id, bot_id, failures, last_error, notified_at) "
        "VALUES ('j1', 'scout', 5, 'no such host', ?)",
        (_at(now, 2),),
    )
    conn.commit()

    kinds = {c.kind for c in crew_picker.candidates_for(conn, "scout", now_ms=now)}
    assert kinds == {"approval_outcome_unknown", "task_failed", "routine_suspended"}


def test_another_teammates_standstill_is_not_this_ones_to_raise(conn):
    now = crew_db.now_ms()
    crew_db.upsert_bot(conn, bot_id="scribe", name="Scribe")
    conn.execute(
        "INSERT INTO tasks (id, bot_id, kind, title, status, created_at, updated_at) "
        "VALUES ('t1', 'scribe', 'routine', 'Theirs', 'failed', ?, ?)",
        (_at(now, 1), _at(now, 1)),
    )
    conn.commit()
    assert crew_picker.candidates_for(conn, "scout", now_ms=now) == []


# ---------------------------------------------------------------------------
# The run: order of operations
# ---------------------------------------------------------------------------


@pytest.fixture()
def one_failed_task(conn):
    now = crew_db.now_ms()
    conn.execute(
        "INSERT INTO tasks (id, bot_id, kind, title, status, error, created_at, updated_at) "
        "VALUES ('t1', 'scout', 'routine', 'Morning digest', 'failed', 'API was down', ?, ?)",
        (_at(now, 1), _at(now, 1)),
    )
    conn.commit()
    return conn


def test_it_posts_the_note_and_only_then_remembers_it(one_failed_task, monkeypatch):
    conn = one_failed_task
    monkeypatch.setattr(crew_service, "compose", lambda bot, cands: "The digest is still broken.")

    message = crew_service.run_once(conn, {"id": "scout"})
    assert message is not None

    contents = [m["content"] for m in crew_db.list_messages(conn, "dm:scout")]
    assert "The digest is still broken." in contents
    assert crew_picker.already_raised(conn, "scout", now_ms=crew_db.now_ms()) == {"task:t1"}


def test_a_note_that_could_not_be_written_is_not_recorded_as_raised(one_failed_task, monkeypatch):
    """**The ordering that matters most.**

    Recording first is the obvious way round and it is wrong: a push that fails
    after the record lands means this item is never raised again — silently,
    permanently, and with no trace that anything went missing. So a failed
    compose must leave the dedup table untouched and the item must come round
    again on the next run.
    """
    conn = one_failed_task
    monkeypatch.setattr(crew_service, "compose", lambda bot, cands: "")

    assert crew_service.run_once(conn, {"id": "scout"}) is None
    assert crew_picker.already_raised(conn, "scout", now_ms=crew_db.now_ms()) == set()
    assert crew_db.list_messages(conn, "dm:scout") == []

    monkeypatch.setattr(crew_service, "compose", lambda bot, cands: "Now I can say it.")
    assert crew_service.run_once(conn, {"id": "scout"}) is not None


def test_the_same_thing_is_not_raised_twice(one_failed_task, monkeypatch):
    conn = one_failed_task
    monkeypatch.setattr(crew_service, "compose", lambda bot, cands: "Still broken.")

    assert crew_service.run_once(conn, {"id": "scout"}) is not None
    assert crew_service.run_once(conn, {"id": "scout"}) is None


def test_nothing_to_say_posts_nothing(conn, monkeypatch):
    monkeypatch.setattr(crew_service, "compose", lambda bot, cands: "should not be called")
    assert crew_service.run_once(conn, {"id": "scout"}) is None
    assert crew_db.list_messages(conn, "dm:scout") == []


def test_a_long_note_is_trimmed_without_cutting_a_word_in_half():
    trimmed = crew_service._trim("word " * 400)
    assert len(trimmed) <= crew_service.MAX_CHARS + 1
    assert not trimmed.rstrip("…").endswith("wor")


# ---------------------------------------------------------------------------
# Scheduling: default on, opt out, and a wait that survives a restart
# ---------------------------------------------------------------------------


def test_a_new_teammate_may_speak_by_default(conn):
    """Chosen deliberately: a teammate that only ever answers is a command line
    with a face. It is affordable as a default because the note lands in a
    thread rather than on somebody's phone."""
    [bot] = [dict(r) for r in conn.execute("SELECT * FROM bots WHERE id = 'scout'")]
    assert bot["proactive"] == 1


def test_a_teammate_turned_off_is_never_due(conn):
    conn.execute("UPDATE bots SET proactive = 0 WHERE id = 'scout'")
    conn.commit()
    assert crew_service.due(conn, now_ms=crew_db.now_ms()) == []


def test_a_teammate_that_has_never_been_scheduled_is_due_at_once(conn):
    """`next_speak_at = 0` is what every existing row reads as after the
    migration. They are picked up on the first tick and given a real time —
    switching this on gives everybody a time, it does not make everybody
    speak at once."""
    assert [b["id"] for b in crew_service.due(conn, now_ms=crew_db.now_ms())] == ["scout"]


def test_the_wait_is_stored_so_a_restart_does_not_reroll_it(conn):
    """**Where this departs from what it was ported from.**

    octop holds the next time in an asyncio task that sleeps for hours and
    re-rolls every agent on restart, so a gateway that restarts often can
    starve a teammate indefinitely — with silence as the only symptom, which
    nobody reports. Reading it back through a fresh connection is the whole
    difference.
    """
    when = crew_service.reschedule(conn, "scout")
    assert when > crew_db.now_ms()

    crew_db.close_all()
    reopened = crew_db.connect()
    [row] = reopened.execute("SELECT next_speak_at FROM bots WHERE id = 'scout'").fetchall()
    assert row["next_speak_at"] == when
    assert crew_service.due(reopened, now_ms=crew_db.now_ms()) == []


def test_a_teammate_with_nothing_to_say_is_still_given_a_next_time(conn, monkeypatch):
    """Otherwise it stays due forever and every tick pays for the query that
    finds it — a few seconds apart, indefinitely."""
    monkeypatch.setattr(crew_service, "compose", lambda bot, cands: "unused")
    assert crew_service.tick(conn) == 0
    [row] = conn.execute("SELECT next_speak_at FROM bots WHERE id = 'scout'").fetchall()
    assert row["next_speak_at"] > crew_db.now_ms()


def test_a_run_that_blows_up_still_reschedules(conn, monkeypatch):
    """The `finally` earns its place: without it one bad row means a teammate
    retried every few seconds forever."""
    def _explode(*_args, **_kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(crew_service, "run_once", _explode)
    assert crew_service.tick(conn) == 0
    [row] = conn.execute("SELECT next_speak_at FROM bots WHERE id = 'scout'").fetchall()
    assert row["next_speak_at"] > crew_db.now_ms()


def test_turning_it_off_globally_stops_the_sweep(conn, monkeypatch):
    monkeypatch.setattr(crew_service, "settings", lambda: {**crew_service._DEFAULTS, "enabled": False})
    assert crew_service.tick(conn) == 0
    [row] = conn.execute("SELECT next_speak_at FROM bots WHERE id = 'scout'").fetchall()
    assert row["next_speak_at"] == 0, "a disabled sweep does not touch anybody's schedule"


def test_nothing_speaks_outside_the_gateway(monkeypatch):
    """The proactive sweep rides `worker.tick()`, which only the gateway runs.
    This is the gate restated for the thing that now depends on it: no
    scheduling happens merely because the plugin was imported."""
    from crew import worker as crew_worker

    monkeypatch.delenv("_HERMES_GATEWAY", raising=False)
    assert crew_worker.should_run() is False


def test_a_note_that_could_not_be_posted_is_not_recorded_as_raised(one_failed_task, monkeypatch):
    """**The half of the ordering that the compose test does not reach.**

    A failed compose returns before either step, so it cannot tell the two
    orders apart — swapping them leaves that test green. The order only shows
    itself when the *post* fails: record-then-post loses the item permanently,
    silently, with nothing to show anything went missing. So the write has to
    blow up and the dedup table has to still be empty afterwards.
    """
    conn = one_failed_task
    monkeypatch.setattr(crew_service, "compose", lambda bot, cands: "The digest is still broken.")

    def _no_write(*_args, **_kwargs):
        raise RuntimeError("the database went away")

    monkeypatch.setattr(crew_db, "insert_message", _no_write)
    with pytest.raises(RuntimeError):
        crew_service.run_once(conn, {"id": "scout"})

    assert crew_picker.already_raised(conn, "scout", now_ms=crew_db.now_ms()) == set()

    # And the proof it is not lost: the same item comes round again.
    monkeypatch.undo()
    monkeypatch.setattr(crew_service, "compose", lambda bot, cands: "Second time lucky.")
    assert crew_service.run_once(conn, {"id": "scout"}) is not None
