"""Routines — recurring work a teammate schedules for itself.

A crew routine **is** a Hermes cron job in that teammate's profile. It is not a
parallel scheduler, and that is the load-bearing decision here: Hermes's cron
scheduler runs inside the ``hermes gateway`` process
(``gateway/run.py`` → ``cron.scheduler_provider``), and "always-on" is the whole
product promise. A routine that only fired while a browser tab was open would
be a reminder, not a teammate.

Consequences worth knowing:

* A routine fires whether or not the dashboard is running. The turn executes in
  the gateway process, with the teammate's profile config — which is why
  ``roster.configure_profile_for_crew`` enables the ``crew`` toolset there.
  The crew tools then write their chips straight into ``crew.db``, so the
  report is waiting in the thread when the operator next looks. Nothing has to
  be delivered anywhere.
* ``deliver="local"`` for exactly that reason: the thread already has the
  output, so a second copy pushed to Telegram would be a duplicate.
* Routines show up in ``hermes cron list`` and on the dashboard's Cron page
  too. That is a feature — one scheduler, one place to see everything.

Jobs are tagged with a ``crew:<bot_id>:`` name prefix so the crew can pick its
own out of a profile's cron list without a second store to keep in sync.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from crew import roster
from crew.schedule import describe_schedule, is_valid_schedule

log = logging.getLogger(__name__)

_NAME_PREFIX = "crew:"


class CrewRoutineError(ValueError):
    """A routine that cannot be created, with a message meant for the model."""


def job_name(bot_id: str, name: str) -> str:
    return f"{_NAME_PREFIX}{bot_id}:{name.strip()}"


def parse_job_name(raw: str) -> Optional[tuple[str, str]]:
    """Split a crew job name back into ``(bot_id, name)``, or ``None``."""
    if not raw.startswith(_NAME_PREFIX):
        return None
    rest = raw[len(_NAME_PREFIX):]
    bot_id, sep, name = rest.partition(":")
    if not sep or not bot_id:
        return None
    return bot_id, name


def _in_profile(bot_id: str):
    """Scope cron reads/writes to one teammate's profile."""
    import contextlib

    @contextlib.contextmanager
    def _scope():
        from hermes_constants import reset_hermes_home_override, set_hermes_home_override

        token = set_hermes_home_override(str(roster.profile_dir(bot_id)))
        try:
            yield
        finally:
            reset_hermes_home_override(token)

    return _scope()


def create_routine(*, bot_id: str, name: str, schedule: str, instructions: str) -> dict:
    """Register a recurring turn for this teammate.

    Raises :class:`CrewRoutineError` with a message the model can act on — an
    unparseable cron expression comes back as "that is not a schedule I can
    read", not as a stack trace it will retry verbatim.
    """
    clean_name = (name or "").strip()
    clean_schedule = (schedule or "").strip()
    clean_instructions = (instructions or "").strip()

    if not clean_name:
        raise CrewRoutineError("Give the routine a short name.")
    if not clean_instructions:
        raise CrewRoutineError("Say what to do each time it fires.")
    if not is_valid_schedule(clean_schedule):
        raise CrewRoutineError(
            f"{clean_schedule!r} is not a schedule I can read. Use a five-field cron "
            f'expression like "0 9 * * 1", or an interval like "every 30m".'
        )

    from crew.prompts import routine_seed

    with _in_profile(bot_id):
        from cron.jobs import create_job

        try:
            job = create_job(
                prompt=routine_seed(clean_name, clean_instructions),
                schedule=clean_schedule,
                name=job_name(bot_id, clean_name),
                deliver="local",
                # The turn needs the crew tools to file its report as a chip.
                # Pinning them here rather than inheriting the profile's full
                # set also keeps a routine's token cost down.
                enabled_toolsets=_routine_toolsets(bot_id),
            )
        except Exception as exc:  # noqa: BLE001
            raise CrewRoutineError(f"Could not schedule that: {exc}") from exc

    return {
        "id": job.get("id"),
        "name": clean_name,
        "cron": clean_schedule,
        "instructions": clean_instructions,
        "human": describe_schedule(clean_schedule),
    }


def _routine_toolsets(bot_id: str) -> list[str]:
    from hermes_cli.config import load_config_readonly

    configured = [t for t in (load_config_readonly().get("toolsets") or []) if isinstance(t, str)]
    if "crew" not in configured:
        configured.append("crew")
    return configured


def list_routines(bot_id: str) -> list[dict]:
    """Return this teammate's routines, newest first.

    Reads the profile's cron store directly — there is no second copy to drift.
    Jobs the operator created by hand with ``hermes cron`` are filtered out by
    the name prefix; they are real jobs, just not routines this teammate owns.
    """
    with _in_profile(bot_id):
        try:
            from cron.jobs import list_jobs

            jobs = list_jobs()
        except Exception:
            log.debug("crew: could not list routines for %s", bot_id, exc_info=True)
            return []

    routines = []
    for job in jobs or []:
        parsed = parse_job_name(str(job.get("name") or ""))
        if not parsed or parsed[0] != bot_id:
            continue
        schedule = job.get("schedule") or {}
        expr = (
            schedule.get("expr")
            or schedule.get("display")
            or schedule.get("value")
            or ""
        ) if isinstance(schedule, dict) else str(schedule)
        routines.append(
            {
                "id": job.get("id"),
                "name": parsed[1],
                "cron": expr,
                "human": describe_schedule(expr),
                "enabled": bool(job.get("enabled", True)),
                "last_run_at": job.get("last_run_at"),
                "next_run_at": job.get("next_run_at"),
            }
        )
    return list(reversed(routines))


def delete_routine(bot_id: str, job_id: str) -> bool:
    with _in_profile(bot_id):
        try:
            from cron.jobs import delete_job

            return bool(delete_job(job_id))
        except Exception:
            log.debug("crew: could not delete routine %s for %s", job_id, bot_id, exc_info=True)
            return False


def set_routine_enabled(bot_id: str, job_id: str, enabled: bool) -> bool:
    with _in_profile(bot_id):
        try:
            from cron.jobs import update_job

            update_job(job_id, enabled=enabled)
            return True
        except Exception:
            log.debug("crew: could not toggle routine %s for %s", job_id, bot_id, exc_info=True)
            return False


def routine_thread_hint(job: dict[str, Any]) -> Optional[str]:
    """Which crew thread a fired cron job belongs to, if any.

    Used by the routine's turn to know where to post. The prefix in the job
    name is the only link, which keeps the cron store free of crew-specific
    columns.
    """
    parsed = parse_job_name(str(job.get("name") or ""))
    if not parsed:
        return None
    from crew.db import dm_thread_id

    return dm_thread_id(parsed[0])
