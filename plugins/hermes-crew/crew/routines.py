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
import threading
from typing import Any, Optional

from crew import roster
from crew.schedule import describe_schedule, is_valid_schedule

log = logging.getLogger(__name__)

_NAME_PREFIX = "crew:"

#: Serialises every crew read/write of the cron store in this process.
#:
#: Needed because :func:`_in_profile` rebinds module-level state in
#: ``cron.jobs`` (see its docstring). Two teammates creating routines
#: concurrently would otherwise interleave rebinds and write into each other's
#: files. Cron's own ``_jobs_lock()`` guards the file across processes; this
#: guards the rebind inside ours. These calls are short and rare, so
#: serialising them costs nothing.
_cron_lock = threading.RLock()


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
    """Scope cron reads/writes to one teammate's profile.

    The ``HERMES_HOME`` override alone is not enough, and that is the whole
    reason this function is more than three lines.

    ``cron/jobs.py`` resolves its paths **once, at import time**::

        HERMES_DIR = get_hermes_home().resolve()
        CRON_DIR   = HERMES_DIR / "cron"
        JOBS_FILE  = CRON_DIR / "jobs.json"

    So the override only takes effect for whichever profile happens to import
    ``cron.jobs`` first in a given process — and in the dashboard, that is
    whichever teammate was touched first, or the default profile if anything
    else imported it during startup. Every later teammate's routines were
    being written into the first one's ``jobs.json``. Its own comment names
    per-profile isolation as the security boundary (#4707), which is exactly
    what the frozen constants defeat once a second profile is in play.

    ``cron/scheduler.py`` solves this properly with call-time
    ``_get_hermes_home()`` / ``_get_lock_paths()``. The real fix belongs there
    too; until it lands, we rebind the four path constants for the duration of
    the call, under :data:`_cron_lock`, and restore them in ``finally``.
    ``OUTPUT_DIR`` is in the set because ``remove_job`` deletes a directory
    under it — getting that one wrong deletes another teammate's job output.
    """
    import contextlib

    @contextlib.contextmanager
    def _scope():
        from hermes_constants import reset_hermes_home_override, set_hermes_home_override

        home = roster.profile_dir(bot_id)
        with _cron_lock:
            token = set_hermes_home_override(str(home))
            try:
                from cron import jobs as cron_jobs

                cron_dir = home / "cron"
                saved = {
                    "HERMES_DIR": cron_jobs.HERMES_DIR,
                    "CRON_DIR": cron_jobs.CRON_DIR,
                    "JOBS_FILE": cron_jobs.JOBS_FILE,
                    "OUTPUT_DIR": cron_jobs.OUTPUT_DIR,
                }
                cron_jobs.HERMES_DIR = home.resolve()
                cron_jobs.CRON_DIR = cron_dir
                cron_jobs.JOBS_FILE = cron_dir / "jobs.json"
                cron_jobs.OUTPUT_DIR = cron_dir / "output"
                try:
                    yield
                finally:
                    for name, value in saved.items():
                        setattr(cron_jobs, name, value)
            finally:
                reset_hermes_home_override(token)

    return _scope()


def create_routine(
    *, bot_id: str, name: str, schedule: str, instructions: str, with_computer: bool = True
) -> dict:
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
                enabled_toolsets=_routine_toolsets(bot_id, with_computer=with_computer),
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


def _routine_toolsets(bot_id: str, *, with_computer: bool) -> list[str]:
    """The toolsets a fired routine gets.

    Delegates to the orchestrator rather than keeping a second copy. The copy
    that used to live here had drifted: it returned ``configured + crew`` and
    never added ``terminal``/``files``/``browser``, so a routine could not run
    a script or open a page. "Generate the weekly deck every Friday" — the
    thing Phase E just made possible — silently could not work on a schedule,
    which is the one place it matters most.

    ``with_computer=False`` is for the reminder-shaped routines, where loading
    three more tool schemas every fire buys nothing.
    """
    from crew import orchestrator

    if not with_computer:
        from hermes_cli.config import load_config_readonly

        configured = [
            t for t in (load_config_readonly().get("toolsets") or []) if isinstance(t, str)
        ]
        if "crew" not in configured:
            configured.append("crew")
        return configured
    return orchestrator.toolsets_for(bot_id, has_computer=orchestrator.has_computer(bot_id))


def list_routines(bot_id: str) -> list[dict]:
    """Return this teammate's routines, newest first.

    Reads the profile's cron store directly — there is no second copy to drift.
    Jobs the operator created by hand with ``hermes cron`` are filtered out by
    the name prefix; they are real jobs, just not routines this teammate owns.
    """
    with _in_profile(bot_id):
        try:
            from cron.jobs import list_jobs

            # `include_disabled=True` or the `enabled` field below is a
            # constant. The host filters disabled jobs out by default, so a
            # paused routine simply vanished from the panel — which reads as
            # "it was deleted" rather than "it is paused", and leaves no way to
            # resume it.
            jobs = list_jobs(include_disabled=True)
        except Exception:
            log.debug("crew: could not list routines for %s", bot_id, exc_info=True)
            return []

    routines = []
    for job in jobs or []:
        parsed = parse_job_name(str(job.get("name") or ""))
        if not parsed:
            continue
        if parsed[0] != bot_id:
            # Another teammate's routine sitting in this profile's store. That
            # is the residue of the frozen-path bug `_in_profile` now fixes —
            # it cannot happen to newly created routines, but an install that
            # ran the old code has these, and they still fire here. Invisible
            # to both panels, so say so once rather than let it stay a mystery.
            log.warning(
                "crew: %s's cron store holds a routine owned by %s (%r) — "
                "left by the pre-fix profile bug; remove it with `hermes cron`",
                bot_id, parsed[0], job.get("name"),
            )
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
    """Cancel a routine. ``False`` means there was no such job.

    No ``try/except`` around the call. The previous version wrapped this in a
    bare ``except Exception: return False`` and imported ``delete_job``, which
    does not exist — the host's function is ``remove_job``. The ``ImportError``
    was caught and reported as "no such routine", so the dashboard's delete
    button returned 404 every time and looked like a missing job rather than a
    broken call. A swallowed exception turns a crash into a lie.
    """
    with _in_profile(bot_id):
        from cron.jobs import remove_job

        return bool(remove_job(job_id))


def set_routine_enabled(bot_id: str, job_id: str, enabled: bool) -> bool:
    """Pause or resume a routine. ``False`` means there was no such job.

    ``pause_job``/``resume_job`` rather than ``update_job``: they also set
    ``state``, ``paused_at`` and recompute ``next_run_at``, which a bare
    ``enabled`` flip does not. Resuming a job whose one-shot time has passed
    raises in the host, and that is allowed to propagate — it is a real answer,
    not a failure to look.
    """
    with _in_profile(bot_id):
        from cron.jobs import pause_job, resume_job

        job = resume_job(job_id) if enabled else pause_job(job_id, "paused from the crew panel")
        return job is not None


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
