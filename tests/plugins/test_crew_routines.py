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


@pytest.mark.parametrize("dow", ["0", "7"])
def test_our_parser_and_the_hosts_validator_agree_about_sunday(dow):
    """The other half of the test above, which used to be only a claim.

    That docstring asserts the host means Unix semantics because it validates
    with croniter — but nothing checked it, so the two parsers could have
    drifted apart and both tests would still pass. They are used together on
    one schedule string: ours humanises it for the approval card, croniter
    decides when it actually fires. A disagreement means the card says Sunday
    and the job runs Monday, which is the worst available outcome because the
    person who approved it has no way to notice.
    """
    from croniter import croniter

    from crew.schedule import compile_cron_matcher

    expression = f"0 9 * * {dow}"
    matcher = compile_cron_matcher(expression)
    assert matcher is not None

    # 2026-09-27 is a Sunday. Ask croniter for the next fire from Saturday.
    from datetime import datetime

    nxt = croniter(expression, datetime(2026, 9, 26, 12, 0)).get_next(datetime)
    assert nxt.weekday() == 6, "croniter agrees this is Sunday (Python's Sun == 6)"
    assert nxt.day == 27 and nxt.hour == 9


def test_a_real_cron_expression_survives_the_whole_routine_path(profiles):
    """Everything else in this file schedules with ``every 30m``.

    That was a workaround for a container with no croniter, not a decision —
    and it meant the one schedule format an operator is most likely to type
    was never carried end to end. This is the same path with a real
    expression.
    """
    routine = crew_routines.create_routine(
        bot_id="scout", name="Weekday digest", schedule="0 9 * * 1-5",
        instructions="Summarise overnight.",
    )
    assert routine["id"]

    [listed] = [r for r in crew_routines.list_routines("scout") if r["id"] == routine["id"]]
    assert listed["enabled"] is True
    assert listed["cron"] == "0 9 * * 1-5", "the expression survives the round trip"
    # The humanised line is what the approval card shows, so it has to say
    # something a person can check the schedule against.
    assert listed["human"] == "Weekdays at 9:00 AM"


# ---------------------------------------------------------------------------
# Routine type: a reminder should not cost a model call
# ---------------------------------------------------------------------------


def test_a_text_routine_never_reaches_a_model(profiles):
    """"Stand-up at 09:45" has no business waking an agent to be read back.

    The job is created as the host's own no_agent shape with `deliver_prompt`,
    so the scheduler short-circuits before it constructs an AIAgent at all —
    and the stored prompt is the operator's words, not a seed wrapped around
    them, because those words are what gets delivered.
    """
    crew_routines.create_routine(
        bot_id="scout", name="Standup", schedule="every 30m",
        instructions="Stand-up in 15 minutes.", task_type="text",
    )
    job = jobs_in(profiles["scout"])[0]
    assert job["no_agent"] is True
    assert job["deliver_prompt"] is True
    assert job["prompt"] == "Stand-up in 15 minutes."
    assert not job.get("enabled_toolsets")


def test_an_agent_routine_still_wakes_the_teammate(profiles):
    """The default, and the pair that keeps the test above honest."""
    crew_routines.create_routine(
        bot_id="scout", name="Digest", schedule="every 30m",
        instructions="Summarise the overnight news.", with_computer=False,
    )
    job = jobs_in(profiles["scout"])[0]
    assert not job.get("no_agent")
    assert not job.get("deliver_prompt")
    assert "Summarise the overnight news." in job["prompt"]


def test_a_type_nobody_recognises_is_refused_rather_than_guessed(profiles):
    """The input half of octop's asymmetry. Quietly turning "reminder" into an
    agent routine means the caller is billed for model calls they thought they
    had opted out of, and is never told the word meant nothing."""
    with pytest.raises(crew_routines.CrewRoutineError) as caught:
        crew_routines.create_routine(
            bot_id="scout", name="Ping", schedule="every 30m",
            instructions="Ping me.", task_type="reminder",
        )
    assert "not a routine type" in str(caught.value)


def test_a_stored_type_nobody_recognises_still_runs():
    """The read half, and it goes the other way on purpose. A row already on
    disk with a value we do not know must not stop the routine from firing —
    refusing to run because of a typo in metadata is worse than running the
    general way."""
    assert crew_routines.normalize_task_type("reminder") == "agent"
    assert crew_routines.normalize_task_type(None) == "agent"
    assert crew_routines.normalize_task_type("TEXT") == "text"


# ---------------------------------------------------------------------------
# A routine must not schedule a routine
# ---------------------------------------------------------------------------


def test_a_routine_cannot_create_a_routine(profiles, monkeypatch):
    """Otherwise it breeds: every fire leaves another job behind, and each of
    those fires too.

    The refusal is at creation — `cron/lifecycle_guard.py`'s shape — but the
    test is structural, not textual. That guard anchors on a command shape
    because a shell command has one; "set up a daily digest" is prose, and its
    own comment explains why matching prose would be leaky in both directions.
    """
    monkeypatch.setattr(crew_routines, "running_routine", lambda bot_id: "Morning digest")
    with pytest.raises(crew_routines.CrewRoutineError) as caught:
        crew_routines.create_routine(
            bot_id="scout", name="Another", schedule="every 30m",
            instructions="And another one.", with_computer=False,
        )
    assert "cannot create another routine" in str(caught.value)
    assert jobs_in(profiles["scout"]) == []


def test_instructions_that_merely_mention_scheduling_are_not_refused(profiles):
    """The false positive the structural check is designed to avoid. A routine
    whose job is to *talk about* schedules is a normal routine."""
    crew_routines.create_routine(
        bot_id="scout", name="Cron review", schedule="every 30m",
        instructions="Review our cron jobs and suggest which routines to add.",
        with_computer=False,
    )
    assert len(jobs_in(profiles["scout"])) == 1


# ---------------------------------------------------------------------------
# Health: backing off, and stopping rather than failing forever
# ---------------------------------------------------------------------------


@pytest.fixture()
def health_db(tmp_path, monkeypatch):
    """A crew.db of its own. The routine store and the health record are two
    different places on purpose — see the table's comment."""
    from crew import db as crew_db

    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    crew_db.close_all()
    conn = crew_db.connect()
    crew_db.upsert_bot(conn, bot_id="scout", name="Scout", role="research")
    yield conn
    crew_db.close_all()


def test_the_two_timestamps_mean_different_things(health_db):
    """**The distinction the host does not make.**

    `mark_job_run` writes `last_run_at` on success *and* on failure, so its
    field answers "when did we last try". Keeping the success timestamp
    separate is what makes "this routine has not worked since Tuesday"
    expressible at all — with one column, a routine that has failed forty
    times looks freshly successful.
    """
    crew_routines.record_attempt(health_db, job_id="j1", bot_id="scout")
    after_attempt = crew_routines.health(health_db, "j1")
    assert after_attempt["last_attempt_at"] > 0
    assert after_attempt["last_run_at"] == 0, "a failure must not look like a success"

    crew_routines.record_outcome(health_db, job_id="j1", bot_id="scout", success=True)
    assert crew_routines.health(health_db, "j1")["last_run_at"] > 0


def test_the_backoff_ladder_climbs_and_then_stops_climbing():
    """OpenMuse's `min(60, 2 ** failures)`. The cap matters as much as the
    ladder: without it a routine that has failed all week is scheduled for
    some time next year."""
    assert crew_routines.backoff_minutes(0) == 0
    assert crew_routines.backoff_minutes(1) == 2
    assert crew_routines.backoff_minutes(3) == 8
    assert crew_routines.backoff_minutes(40) == 60


def test_one_failure_defers_the_next_run_rather_than_suspending(health_db):
    outcome = crew_routines.record_outcome(
        health_db, job_id="j1", bot_id="scout", success=False, error="API down",
    )
    assert outcome["failures"] == 1
    assert outcome["defer_minutes"] == 2
    assert outcome["suspend"] is False
    assert outcome["announce"] == ""


def test_a_success_clears_the_run_of_failures(health_db):
    """Consecutive, not cumulative. A routine that fails twice a week and works
    the rest of the time is not a routine anybody should be asked about."""
    for _ in range(3):
        crew_routines.record_outcome(
            health_db, job_id="j1", bot_id="scout", success=False, error="flaky",
        )
    crew_routines.record_outcome(health_db, job_id="j1", bot_id="scout", success=True)
    assert crew_routines.health(health_db, "j1")["failures"] == 0

    again = crew_routines.record_outcome(
        health_db, job_id="j1", bot_id="scout", success=False, error="flaky",
    )
    assert again["failures"] == 1


def test_it_gives_up_at_the_threshold_and_says_so_exactly_once(health_db):
    """**The "once" is the point.**

    A teammate that reports the same broken routine every ten minutes trains
    its operator to skim past it — and the next real message goes past with it.
    So the announcement fires on the transition into suspension and never
    again, however many more times the job is fired while it is off.
    """
    announcements = []
    for _ in range(crew_routines.MAX_CONSECUTIVE_FAILURES + 3):
        outcome = crew_routines.record_outcome(
            health_db, job_id="j1", bot_id="scout", success=False, error="no such host",
        )
        if outcome["announce"]:
            announcements.append(outcome["announce"])

    assert len(announcements) == 1, "told once, not once per fire"
    assert "no such host" in announcements[0]
    assert outcome["suspend"] is True
    assert outcome["defer_minutes"] == 0, "a suspended routine is not also deferred"


def test_suspension_notices_start_again_after_a_recovery(health_db):
    """Once per suspension, not once per lifetime. A routine that was fixed and
    then broke again is news."""
    for _ in range(crew_routines.MAX_CONSECUTIVE_FAILURES):
        crew_routines.record_outcome(
            health_db, job_id="j1", bot_id="scout", success=False, error="down",
        )
    crew_routines.record_outcome(health_db, job_id="j1", bot_id="scout", success=True)

    for _ in range(crew_routines.MAX_CONSECUTIVE_FAILURES):
        outcome = crew_routines.record_outcome(
            health_db, job_id="j1", bot_id="scout", success=False, error="down again",
        )
    assert outcome["announce"], "a second outage is worth saying"


def test_a_deferral_actually_moves_the_hosts_next_run(profiles, health_db):
    """**Where the backoff lives.**

    A plugin cannot veto a fire: the lifecycle emitter swallows what a hook
    raises and ignores what it returns, deliberately. So the backoff moves the
    host's own `next_run_at` — which also means the deferral shows up in
    `hermes cron list`, where the person it is being done to can see it.
    """
    from datetime import datetime

    created = crew_routines.create_routine(
        bot_id="scout", name="Digest", schedule="every 30m",
        instructions="Summarise.", with_computer=False,
    )
    before = jobs_in(profiles["scout"])[0]["next_run_at"]

    assert crew_routines.defer_next_run("scout", created["id"], 90) is True
    after = jobs_in(profiles["scout"])[0]["next_run_at"]
    assert datetime.fromisoformat(after) > datetime.fromisoformat(before)


def test_a_deferral_never_pulls_a_run_closer(profiles):
    """The host has already recomputed `next_run_at` from the schedule by the
    time this runs. For an hourly routine that is further out than a two-minute
    backoff, and writing the earlier time would turn a backoff into an
    acceleration — exactly backwards on a job that is already failing."""
    created = crew_routines.create_routine(
        bot_id="scout", name="Hourly", schedule="every 2h",
        instructions="Check.", with_computer=False,
    )
    before = jobs_in(profiles["scout"])[0]["next_run_at"]

    assert crew_routines.defer_next_run("scout", created["id"], 2) is False
    assert jobs_in(profiles["scout"])[0]["next_run_at"] == before


def test_the_listing_says_which_routines_are_reminders(profiles):
    """A reminder and a piece of scheduled work read very differently to
    somebody deciding whether to keep one."""
    crew_routines.create_routine(
        bot_id="scout", name="Standup", schedule="every 30m",
        instructions="Stand-up in 15.", task_type="text",
    )
    crew_routines.create_routine(
        bot_id="scout", name="Digest", schedule="every 2h",
        instructions="Summarise.", with_computer=False,
    )
    by_name = {r["name"]: r for r in crew_routines.list_routines("scout")}
    assert by_name["Standup"]["task_type"] == "text"
    assert by_name["Digest"]["task_type"] == "agent"
