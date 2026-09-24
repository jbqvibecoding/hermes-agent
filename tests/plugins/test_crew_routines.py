"""Hermes Crew — the routine path, which is what "always-on" actually rests on.

Every test here is a regression guard for something that was shipped broken.
The common shape of all four bugs is worth naming, because it is the reason
they survived: each one failed *quietly*. A swallowed `ImportError` reads as
"no such routine". A default argument reads as "there are no paused routines".
A module constant frozen at import reads as "your routine was created" while
writing it into somebody else's file. None of them raised, so nothing caught
them.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import routines as crew_routines  # noqa: E402


@pytest.fixture()
def profiles(tmp_path, monkeypatch):
    """Two teammates with real, separate profile directories on disk.

    Schedules here are intervals (``every 30m``) rather than cron expressions.
    The host validates cron with ``croniter``, which is an optional dependency;
    none of these tests are about cron syntax, so depending on it would make
    them skip in environments where the thing they actually guard still works.
    The one test that *is* about cron semantics uses our own pure-Python
    matcher.
    """
    root = tmp_path / "profiles"
    made: dict[str, Path] = {}
    for bot_id in ("scout", "scribe"):
        home = root / bot_id
        (home / "cron").mkdir(parents=True)
        made[bot_id] = home

    monkeypatch.setattr(crew_routines.roster, "profile_dir", lambda bot_id: made[bot_id])
    # The orchestrator would try to reach a container; routines only need the
    # toolset list, which is the part under test elsewhere.
    monkeypatch.setattr(
        "crew.orchestrator.has_computer", lambda bot_id: False, raising=False
    )
    return made


def jobs_in(home: Path) -> list[dict]:
    path = home / "cron" / "jobs.json"
    if not path.is_file():
        return []
    raw = json.loads(path.read_text())
    return raw.get("jobs", raw) if isinstance(raw, dict) else raw


# ---------------------------------------------------------------------------
# The profile bug — two teammates must not share one file
# ---------------------------------------------------------------------------


def test_two_teammates_routines_land_in_their_own_stores(profiles):
    """The bug that mattered most, because it is silent and it is data loss.

    `cron/jobs.py` resolves JOBS_FILE at import time, so the HERMES_HOME
    override only bound whichever profile imported it first. Every later
    teammate's routine was written into the first one's jobs.json — reported as
    created, findable by nobody.
    """
    crew_routines.create_routine(
        bot_id="scout", name="Morning digest", schedule="every 30m",
        instructions="Summarise the overnight news.", with_computer=False,
    )
    crew_routines.create_routine(
        bot_id="scribe", name="Weekly report", schedule="every 2h",
        instructions="Write up the week.", with_computer=False,
    )

    scout_jobs = jobs_in(profiles["scout"])
    scribe_jobs = jobs_in(profiles["scribe"])
    assert [j["name"] for j in scout_jobs] == ["crew:scout:Morning digest"]
    assert [j["name"] for j in scribe_jobs] == ["crew:scribe:Weekly report"]


def test_each_teammate_only_sees_its_own_routines(profiles):
    crew_routines.create_routine(
        bot_id="scout", name="Morning digest", schedule="every 30m",
        instructions="Summarise.", with_computer=False,
    )
    crew_routines.create_routine(
        bot_id="scribe", name="Weekly report", schedule="every 2h",
        instructions="Write up.", with_computer=False,
    )
    assert [r["name"] for r in crew_routines.list_routines("scout")] == ["Morning digest"]
    assert [r["name"] for r in crew_routines.list_routines("scribe")] == ["Weekly report"]


def test_the_cron_paths_are_restored_after_the_call(profiles):
    """The rebind is scoped. Leaving it applied would redirect every later cron
    read in this process — including the gateway's own ticker."""
    from cron import jobs as cron_jobs

    before = (cron_jobs.HERMES_DIR, cron_jobs.CRON_DIR, cron_jobs.JOBS_FILE, cron_jobs.OUTPUT_DIR)
    crew_routines.create_routine(
        bot_id="scout", name="Morning digest", schedule="every 30m",
        instructions="Summarise.", with_computer=False,
    )
    after = (cron_jobs.HERMES_DIR, cron_jobs.CRON_DIR, cron_jobs.JOBS_FILE, cron_jobs.OUTPUT_DIR)
    assert before == after


def test_the_paths_are_restored_even_when_the_call_raises(profiles, monkeypatch):
    from cron import jobs as cron_jobs

    before = cron_jobs.JOBS_FILE

    def boom(**kwargs):
        raise RuntimeError("cron store is on fire")

    monkeypatch.setattr(cron_jobs, "create_job", boom)
    with pytest.raises(crew_routines.CrewRoutineError):
        crew_routines.create_routine(
            bot_id="scout", name="Morning digest", schedule="every 30m",
            instructions="Summarise.", with_computer=False,
        )
    assert cron_jobs.JOBS_FILE == before


# ---------------------------------------------------------------------------
# Delete and pause — both of which never worked
# ---------------------------------------------------------------------------


def test_a_routine_can_actually_be_deleted(profiles):
    """`delete_routine` imported `delete_job`, which does not exist. The
    ImportError was swallowed and reported as "no such routine", so the
    dashboard's delete button 404'd every single time."""
    created = crew_routines.create_routine(
        bot_id="scout", name="Morning digest", schedule="every 30m",
        instructions="Summarise.", with_computer=False,
    )
    assert crew_routines.delete_routine("scout", created["id"]) is True
    assert crew_routines.list_routines("scout") == []


def test_deleting_something_that_is_not_there_says_so(profiles):
    assert crew_routines.delete_routine("scout", "nope") is False


def test_a_paused_routine_is_still_visible_and_can_be_resumed(profiles):
    """Two bugs in one path. `set_routine_enabled` passed a keyword where the
    host takes a dict (TypeError, swallowed), and `list_routines` used the
    host's default `include_disabled=False` — so a paused routine vanished,
    which reads as deleted and leaves nothing to resume."""
    created = crew_routines.create_routine(
        bot_id="scout", name="Morning digest", schedule="every 30m",
        instructions="Summarise.", with_computer=False,
    )

    assert crew_routines.set_routine_enabled("scout", created["id"], False) is True
    [paused] = crew_routines.list_routines("scout")
    assert paused["enabled"] is False

    assert crew_routines.set_routine_enabled("scout", created["id"], True) is True
    [resumed] = crew_routines.list_routines("scout")
    assert resumed["enabled"] is True


def test_pausing_something_that_is_not_there_says_so(profiles):
    assert crew_routines.set_routine_enabled("scout", "nope", False) is False


# ---------------------------------------------------------------------------
# What a fired routine can reach
# ---------------------------------------------------------------------------


def test_a_routine_gets_the_teammates_computer_by_default(profiles, monkeypatch):
    """The copy of `toolsets_for` that used to live in routines.py had drifted:
    it never added terminal/files/browser, so "build the weekly deck every
    Friday" could not work — on a schedule, which is where it matters most."""
    monkeypatch.setattr("crew.orchestrator.has_computer", lambda bot_id: True)
    monkeypatch.setattr(
        "crew.orchestrator.toolsets_for",
        lambda bot_id, *, has_computer: ["crew", "terminal", "files", "browser"],
    )
    assert crew_routines._routine_toolsets("scout", with_computer=True) == [
        "crew", "terminal", "files", "browser",
    ]


def test_a_reminder_routine_can_leave_the_computer_out(profiles, monkeypatch):
    monkeypatch.setattr(
        "hermes_cli.config.load_config_readonly", lambda: {"toolsets": ["memory"]}
    )
    assert crew_routines._routine_toolsets("scout", with_computer=False) == ["memory", "crew"]


# ---------------------------------------------------------------------------
# Schedules
# ---------------------------------------------------------------------------


def test_an_unreadable_schedule_is_refused_with_something_the_model_can_act_on(profiles):
    with pytest.raises(crew_routines.CrewRoutineError) as caught:
        crew_routines.create_routine(
            bot_id="scout", name="Whenever", schedule="sometimes",
            instructions="Do the thing.", with_computer=False,
        )
    assert "not a schedule I can read" in str(caught.value)


@pytest.mark.parametrize("dow", ["0", "7"])
def test_both_unix_spellings_of_sunday_mean_sunday(dow):
    """Not a bug we have — the host validates cron with croniter, which is Unix
    semantics, and our own parser already folds 7 to 0. This pins it, because a
    scheduler swap would reintroduce it silently: APScheduler 3 reads a numeric
    day-of-week as 0=Monday, so `0 9 * * 0` would quietly start firing on
    Mondays and the humanised description would still say Sunday.
    """
    from crew.schedule import compile_cron_matcher, describe_schedule

    matcher = compile_cron_matcher(f"0 9 * * {dow}")
    assert matcher is not None
    assert matcher.day_of_week == {0}
    assert "Sunday" in describe_schedule(f"0 9 * * {dow}")
