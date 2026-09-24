"""Tests for ``deliver_prompt`` — a no_agent job whose prompt IS the message.

``no_agent`` already covers "run a script on a timer and send its stdout".
The other shape it did not cover is the plain reminder: there is nothing to
run, the text is the whole point, and spending a model call to have it read
back is pure waste.

The interesting part of this feature is what it deliberately does **not** do.
The obvious implementation — treat "no_agent with no script" as "deliver the
prompt" — would have turned an existing loud error into a silent success: a
job whose script path was mistyped or moved would stop failing and start
posting its prompt text every tick, a misconfiguration wearing the costume of
a working job. So it is a separate opt-in, and the old error stays exactly
where it was. Two of the tests below exist only to keep that true.
"""

from __future__ import annotations

import pytest


@pytest.fixture
def hermes_env(tmp_path, monkeypatch):
    """Isolate HERMES_HOME so jobs don't leak between tests."""
    home = tmp_path / ".hermes"
    home.mkdir()
    (home / "scripts").mkdir()
    (home / "cron").mkdir()

    monkeypatch.setenv("HERMES_HOME", str(home))

    import importlib

    import hermes_constants
    importlib.reload(hermes_constants)
    import cron.jobs
    importlib.reload(cron.jobs)
    import cron.scheduler
    importlib.reload(cron.scheduler)

    return home


# ---------------------------------------------------------------------------
# create_job
# ---------------------------------------------------------------------------


def test_a_prompt_only_job_can_be_created(hermes_env):
    """The case that was impossible before: no script, no agent, just words."""
    from cron.jobs import create_job

    job = create_job(
        prompt="Stand-up in 15 minutes.",
        schedule="every 30m",
        name="standup",
        no_agent=True,
        deliver_prompt=True,
    )
    assert job["no_agent"] is True
    assert job["deliver_prompt"] is True
    assert job["prompt"] == "Stand-up in 15 minutes."


def test_no_agent_without_a_script_still_fails(hermes_env):
    """**The guard this feature was not allowed to weaken.**

    A `no_agent` job with a script path that was mistyped, moved or never set
    fails loudly at create time. Inferring "no script means deliver the
    prompt" would have converted that into a job that silently posts its
    prompt on schedule — and nobody would look, because it appears to work.
    """
    from cron.jobs import create_job

    with pytest.raises(ValueError, match="requires a script"):
        create_job(prompt="check the disk", schedule="every 30m", no_agent=True)


def test_delivering_a_prompt_needs_a_prompt(hermes_env):
    """Whitespace is not a message. Caught after normalisation, so `"   "`
    fails the same way an absent prompt does."""
    from cron.jobs import create_job

    with pytest.raises(ValueError, match="needs a prompt"):
        create_job(prompt="   ", schedule="every 30m", no_agent=True, deliver_prompt=True)


def test_deliver_prompt_is_meaningless_with_an_agent(hermes_env):
    """An agent job already decides what to say. Accepting the flag there
    would mean quietly ignoring it, which is how a user ends up believing
    they turned something on."""
    from cron.jobs import create_job

    with pytest.raises(ValueError, match="only applies to no_agent"):
        create_job(prompt="summarise my inbox", schedule="every 30m", deliver_prompt=True)


def test_the_flag_survives_a_round_trip_through_storage(hermes_env):
    """It has to be readable by the scheduler in another process, which is the
    only place it is ever acted on."""
    from cron.jobs import create_job, get_job

    created = create_job(
        prompt="Water the plants.",
        schedule="every 30m",
        name="plants",
        no_agent=True,
        deliver_prompt=True,
    )
    assert get_job(created["id"])["deliver_prompt"] is True


# ---------------------------------------------------------------------------
# run_job
# ---------------------------------------------------------------------------


def test_running_it_delivers_the_prompt_verbatim(hermes_env):
    """Verbatim is the contract. A reminder that came back reworded would be
    worse than one that did not arrive — the user wrote those words on
    purpose."""
    from cron.jobs import create_job
    from cron.scheduler import run_job

    job = create_job(
        prompt="Stand-up in 15 minutes. Bring the migration numbers.",
        schedule="every 30m",
        name="standup",
        no_agent=True,
        deliver_prompt=True,
    )
    success, doc, final_response, error = run_job(job)

    assert success is True
    assert error is None
    assert final_response == "Stand-up in 15 minutes. Bring the migration numbers."
    assert "no_agent (prompt)" in doc


def test_running_it_never_reaches_the_agent(hermes_env, monkeypatch):
    """The whole point. If this path ever imported AIAgent the feature would
    have cost exactly what it was built to avoid, and nothing else in the
    test would notice."""
    import cron.scheduler as scheduler

    def _explode(*_args, **_kwargs):
        raise AssertionError("the agent path must not be reached")

    monkeypatch.setattr(scheduler, "_run_job_script", _explode)

    from cron.jobs import create_job

    job = create_job(
        prompt="Take a break.",
        schedule="every 30m",
        name="break",
        no_agent=True,
        deliver_prompt=True,
    )
    success, _doc, final_response, _error = scheduler.run_job(job)
    assert success is True
    assert final_response == "Take a break."


def test_a_stored_job_with_no_prompt_fails_rather_than_delivering_nothing(hermes_env):
    """create_job rejects this, but a hand-edited jobs.json can still produce
    it. Silence would read as a healthy run of a reminder nobody receives."""
    from cron.scheduler import run_job

    job = {
        "id": "handmade",
        "name": "empty",
        "prompt": "",
        "no_agent": True,
        "deliver_prompt": True,
        "schedule": {"kind": "interval"},
    }
    success, _doc, _final, error = run_job(job)
    assert success is False
    assert "no prompt" in error
