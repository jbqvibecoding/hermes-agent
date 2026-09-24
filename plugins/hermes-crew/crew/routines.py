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


#: The two shapes a routine can take. ``agent`` runs a turn; ``text`` posts its
#: instructions verbatim and never reaches a model — "stand-up at 09:45" has no
#: business spending a model call to be read back.
TASK_TYPES = ("agent", "text")

#: Consecutive failures before a routine is suspended rather than retried
#: forever. Five is the point past which the problem is configuration, not
#: luck, and a routine that fails every ten minutes until somebody notices is
#: worse than one that stops and says so.
MAX_CONSECUTIVE_FAILURES = 5

#: The backoff ladder, in minutes: 2, 4, 8, 16, 32, capped at an hour.
#: OpenMuse's ``min(60, 2 ** failures)``.
_BACKOFF_CAP_MINUTES = 60


class CrewRoutineError(ValueError):
    """A routine that cannot be created, with a message meant for the model."""


def normalize_task_type(raw: Any) -> str:
    """Read path: whatever is stored, coerced to something runnable.

    Falls back to ``agent`` without complaint, on purpose. This is called
    against rows that already exist, and a stored value nobody recognises must
    not stop a routine from running — a routine that refuses to fire because
    of a typo in its own metadata is a worse outcome than one that runs the
    general way.
    """
    value = str(raw or "").strip().lower()
    return value if value in TASK_TYPES else "agent"


def require_task_type(raw: Any) -> str:
    """Input path: reject what we do not understand, loudly.

    The asymmetry with :func:`normalize_task_type` is deliberate and is octop's
    (``infra/cron/task_type.py``). Being lenient about data already on disk
    keeps old rows working; being lenient about *new input* means a caller who
    asked for ``"reminder"`` gets an agent routine, is billed for it, and is
    never told the word they used meant nothing.
    """
    value = str(raw or "").strip().lower()
    if value not in TASK_TYPES:
        raise CrewRoutineError(
            f"{raw!r} is not a routine type. Use \"agent\" to run a turn, or "
            f"\"text\" to post the instructions as they are."
        )
    return value


def backoff_minutes(failures: int) -> int:
    """How long to hold a routine off after this many consecutive failures."""
    if failures <= 0:
        return 0
    # The exponent is clamped before the shift so a corrupted counter cannot
    # ask Python for a several-thousand-bit integer on its way to being capped.
    return min(_BACKOFF_CAP_MINUTES, 2 ** min(failures, 12))


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


def running_routine(bot_id: str) -> Optional[str]:
    """The name of the routine this teammate is executing right now, if any.

    Structural, not textual. It asks what this process is currently doing, not
    what any instruction says it might do.
    """
    try:
        from crew import db as crew_db
        from crew import tasks as crew_tasks

        held = crew_tasks.current(bot_id)
        if held is None:
            return None
        task = crew_tasks.get(crew_db.connect(), held[0])
        if task is None or task.get("kind") != "routine":
            return None
        return str(task.get("title") or "a routine")
    except Exception:
        log.debug("crew: could not tell whether %s is inside a routine", bot_id, exc_info=True)
        return None


def create_routine(
    *,
    bot_id: str,
    name: str,
    schedule: str,
    instructions: str,
    with_computer: bool = True,
    task_type: str = "agent",
) -> dict:
    """Register recurring work for this teammate.

    Raises :class:`CrewRoutineError` with a message the model can act on — an
    unparseable cron expression comes back as "that is not a schedule I can
    read", not as a stack trace it will retry verbatim.
    """
    clean_name = (name or "").strip()
    clean_schedule = (schedule or "").strip()
    clean_instructions = (instructions or "").strip()
    kind = require_task_type(task_type)

    if not clean_name:
        raise CrewRoutineError("Give the routine a short name.")
    if not clean_instructions:
        raise CrewRoutineError("Say what to do each time it fires.")
    if not is_valid_schedule(clean_schedule):
        raise CrewRoutineError(
            f"{clean_schedule!r} is not a schedule I can read. Use a five-field cron "
            f'expression like "0 9 * * 1", or an interval like "every 30m".'
        )

    # A routine must not schedule a routine. One that does breeds: every fire
    # leaves another job behind, and by the time anybody looks the profile's
    # cron store has hundreds of them, all firing.
    #
    # The shape is `cron/lifecycle_guard.py`'s — refuse at *creation* rather
    # than hope the run fails — but the test is deliberately not its test. That
    # guard matches a command shape because a shell command has one; "set up a
    # daily digest" is prose, and its own comment explains why matching prose
    # would be both leaky and full of false positives. So this asks a
    # structural question instead: is this process inside a routine right now?
    # The answer is a fact, not an interpretation.
    inside = running_routine(bot_id)
    if inside:
        raise CrewRoutineError(
            f"You are running inside the routine {inside!r}, and a routine cannot "
            f"create another routine — each fire would leave one more behind. "
            f"Say what schedule you think is needed and let your operator set it up."
        )

    from crew.prompts import routine_seed

    with _in_profile(bot_id):
        from cron.jobs import create_job

        # A text routine has no turn to run, so it carries none of the agent
        # machinery: no toolsets to load, no seed wrapping, no model call. The
        # host delivers the prompt as written.
        extra: dict[str, Any] = (
            {"prompt": clean_instructions, "no_agent": True, "deliver_prompt": True}
            if kind == "text"
            else {
                "prompt": routine_seed(clean_name, clean_instructions),
                "enabled_toolsets": _routine_toolsets(bot_id, with_computer=with_computer),
            }
        )
        try:
            job = create_job(
                schedule=clean_schedule,
                name=job_name(bot_id, clean_name),
                deliver="local",
                **extra,
            )
        except Exception as exc:  # noqa: BLE001
            raise CrewRoutineError(f"Could not schedule that: {exc}") from exc

    return {
        "id": job.get("id"),
        "name": clean_name,
        "cron": clean_schedule,
        "instructions": clean_instructions,
        "human": describe_schedule(clean_schedule),
        "task_type": kind,
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
                # A reminder and a piece of scheduled work read very
                # differently to somebody deciding whether to keep one.
                "task_type": "text" if job.get("deliver_prompt") else "agent",
                "last_run_at": job.get("last_run_at"),
                "next_run_at": job.get("next_run_at"),
                # Why a paused routine is paused. Without it, a routine the
                # crew suspended looks identical to one somebody turned off.
                "last_status": job.get("last_status"),
                "last_error": job.get("last_error") or "",
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


# ---------------------------------------------------------------------------
# Health: backoff, and stopping rather than failing forever
# ---------------------------------------------------------------------------
#
# The host has no retry, no backoff and no failure counter: `mark_job_run`
# writes a single `last_status` slot and recomputes `next_run_at` from the
# schedule, so a routine that fails every time keeps its original cadence
# forever. That is the right default for cron — a scheduler should not invent
# policy — but it is the wrong experience for a teammate, where a broken
# routine reports the same failure into somebody's thread every ten minutes.
#
# The backoff is applied by moving the host's own `next_run_at`, not by adding
# a gate. A plugin cannot veto a fire: the lifecycle emitter swallows
# everything a hook raises and ignores what it returns, deliberately — "a
# misbehaving observer must never change whether a cron job runs". Moving the
# time is better than a gate anyway: `hermes cron list` shows the deferral, so
# the mechanism is visible to the person it is being done for.


def record_attempt(conn, *, job_id: str, bot_id: str) -> None:
    """Stamp the attempt, before the run.

    This is rowboat's first timestamp, and the whole reason there are two. The
    host's ``last_run_at`` is written whether the run worked or not, so it
    answers "when did we last try". Knowing when it last *succeeded* is a
    different question, and the one that says whether a routine is working.
    """
    from crew import db as crew_db

    conn.execute(
        "INSERT INTO routine_health (job_id, bot_id, last_attempt_at) VALUES (?, ?, ?) "
        "ON CONFLICT(job_id) DO UPDATE SET last_attempt_at = excluded.last_attempt_at, "
        "bot_id = excluded.bot_id",
        (job_id, bot_id, crew_db.now_ms()),
    )
    conn.commit()


def health(conn, job_id: str) -> dict:
    """This routine's record. Absent rows read as a healthy routine."""
    row = conn.execute(
        "SELECT job_id, bot_id, failures, last_attempt_at, last_run_at, notified_at, "
        "last_error FROM routine_health WHERE job_id = ?",
        (job_id,),
    ).fetchone()
    if row is None:
        return {
            "job_id": job_id, "bot_id": "", "failures": 0, "last_attempt_at": 0,
            "last_run_at": 0, "notified_at": 0, "last_error": "",
        }
    return dict(row)


def record_outcome(conn, *, job_id: str, bot_id: str, success: bool, error: str = "") -> dict:
    """Update the record and say what should happen next.

    Returns ``{"failures", "defer_minutes", "suspend", "announce"}``.
    Deciding here and acting in the caller keeps this testable without a cron
    store, and keeps the policy in one readable place rather than spread
    through a hook.

    ``announce`` is set exactly once per suspension, never per failure. A
    teammate that reports the same broken routine every ten minutes teaches
    its operator to skim past it, which is the state in which the next real
    message gets missed too.
    """
    from crew import db as crew_db

    now = crew_db.now_ms()
    if success:
        conn.execute(
            "INSERT INTO routine_health (job_id, bot_id, failures, last_run_at, notified_at, "
            "last_error) VALUES (?, ?, 0, ?, 0, '') "
            "ON CONFLICT(job_id) DO UPDATE SET failures = 0, last_run_at = excluded.last_run_at, "
            "notified_at = 0, last_error = '', bot_id = excluded.bot_id",
            (job_id, bot_id, now),
        )
        conn.commit()
        return {"failures": 0, "defer_minutes": 0, "suspend": False, "announce": ""}

    failures = int(health(conn, job_id)["failures"]) + 1
    suspend = failures >= MAX_CONSECUTIVE_FAILURES
    already_told = bool(health(conn, job_id)["notified_at"])
    conn.execute(
        "INSERT INTO routine_health (job_id, bot_id, failures, last_error, notified_at) "
        "VALUES (?, ?, ?, ?, ?) "
        "ON CONFLICT(job_id) DO UPDATE SET failures = excluded.failures, "
        "last_error = excluded.last_error, notified_at = excluded.notified_at, "
        "bot_id = excluded.bot_id",
        (job_id, bot_id, failures, (error or "")[:500], now if suspend else 0),
    )
    conn.commit()

    announce = ""
    if suspend and not already_told:
        announce = (
            f"I have paused one of my routines: it failed {failures} times in a row. "
            f"The last error was: {error or 'no detail'}. "
            f"Resume it from the panel once whatever it needs is working again."
        )
    return {
        "failures": failures,
        "defer_minutes": 0 if suspend else backoff_minutes(failures),
        "suspend": suspend,
        "announce": announce,
    }


def defer_next_run(bot_id: str, job_id: str, minutes: int) -> bool:
    """Push this routine's next fire out. ``False`` if nothing moved.

    Only ever moves it **later**. The host has already recomputed
    ``next_run_at`` from the schedule by the time this runs, and for a routine
    that fires hourly that is further out than a two-minute backoff — pulling
    it in would turn the backoff into an acceleration.
    """
    if minutes <= 0:
        return False
    from datetime import timedelta

    with _in_profile(bot_id):
        from cron.jobs import _hermes_now, get_job, update_job

        job = get_job(job_id)
        if job is None:
            return False
        target = _hermes_now() + timedelta(minutes=minutes)
        current = _parse_iso(job.get("next_run_at"))
        try:
            if current is not None and current >= target:
                return False
        except TypeError:
            # One side naive, the other aware. Comparing them is meaningless,
            # so fall through and set the time: a deferral that was not needed
            # costs one skipped fire, and skipping the deferral on a routine
            # that is failing costs the retry storm this exists to prevent.
            pass
        update_job(job_id, {"next_run_at": target.isoformat()})
    return True


def _parse_iso(raw: Any):
    """A stored timestamp, or ``None`` when it cannot be read.

    Unreadable means "we do not know when it was going to fire", and the
    caller treats that as a reason to set the time rather than to leave it —
    a routine with an unparseable next run is already in trouble.
    """
    from datetime import datetime

    if not raw:
        return None
    try:
        return datetime.fromisoformat(str(raw))
    except (TypeError, ValueError):
        return None


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
