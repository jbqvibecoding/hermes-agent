"""Hermes Crew — always-on AI teammates, each a profile with its own computer.

Registers the ``crew`` toolset: the six tools that turn a Hermes agent into a
GrokBot-shaped teammate (report grammar, draft-and-hold approvals, visible
memory, routines, allowlisted handoffs, takeover login). Everything else a
teammate needs — shell, files, browser, memory, skills, MCP — is already a
Hermes tool; see ``crew/tools.py`` for why there are only six.

The dashboard half of the plugin lives in ``dashboard/`` and is discovered
separately by the web server (``manifest.json`` + ``plugin_api.py``).

**Import bootstrap.** This plugin's two entry points are loaded in different
ways by Hermes: ``__init__.py`` becomes the package
``hermes_plugins.hermes_crew`` (so relative imports would work), while
``dashboard/plugin_api.py`` is exec'd as a *flat* module with no package
context (so they would not). Putting the plugin root on ``sys.path`` lets both
— and the test suite — spell it the same way: ``from crew import ...``.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

_PLUGIN_ROOT = str(Path(__file__).resolve().parent)
if _PLUGIN_ROOT not in sys.path:
    sys.path.insert(0, _PLUGIN_ROOT)

log = logging.getLogger(__name__)


def register(ctx) -> None:
    """Register the ``crew`` toolset. Called once by the plugin loader."""
    from crew.tools import CREW_TOOLS, crew_tools_available

    for name, schema, handler, emoji in CREW_TOOLS:
        ctx.register_tool(
            name=name,
            toolset="crew",
            schema=schema,
            handler=handler,
            check_fn=crew_tools_available,
            emoji=emoji,
        )

    from crew import hooks as crew_hooks

    ctx.register_hook("pre_tool_call", crew_hooks.on_pre_tool_call)
    ctx.register_hook("post_tool_call", crew_hooks.on_post_tool_call)
    ctx.register_hook("cron_job_fired", crew_hooks.on_cron_job_fired)
    ctx.register_hook("cron_job_finished", crew_hooks.on_cron_job_finished)

    _start_task_worker()

    _register_skills(ctx)

    # Both of these write to crew.db, and only a booting gateway may do that.
    # See `_is_gateway_boot` for why this is a positive test for the gateway
    # rather than a test for "not pytest" — the second shape leaked twice.
    if _is_gateway_boot():
        _record_policy()
        _recover_interrupted_releases()

    log.debug("crew: registered %d tools and 4 hooks", len(CREW_TOOLS))


def _is_gateway_boot() -> bool:
    """Whether a real Hermes gateway is starting, and may therefore write.

    This gate has been wrong twice, in the same direction both times, and the
    shape of the mistake is the part worth keeping.

    **First try: ``PYTEST_CURRENT_TEST``.** pytest sets that per *test*; this
    plugin is a bundled backend, so it registers while pytest is still
    **importing test modules**. No fixture has run, ``HERMES_HOME`` is still
    unset, and ``crew.db.crew_home()`` falls back to the platform default —
    the developer's real ``~/.hermes``. 27 ``crew.policy_loaded`` rows landed
    in a real database and nothing was ever red: the writes succeeded.

    **Second try: ``"pytest" in sys.modules``.** True from the moment
    collection starts, so it closed that hole. The first full-suite run with
    this plugin installed showed it was still not enough: a fresh ``crew.db``
    appeared in the run's ``$HOME``, carrying exactly one ``audit`` row — the
    ledger line below, which is how it was traced back here. Tests spawn
    subprocesses, those subprocesses load plugins, and in them pytest is *not*
    imported and ``HERMES_HOME`` is *not* inherited. Reproduced directly: a
    bare ``python`` that imports this module and calls ``register()`` creates
    ``~/.hermes/crew.db``.

    The lesson is not "find a better test for pytest". Both tries asked *is
    this a test?* and wrote when the answer was no — and the set of processes
    that are neither the gateway nor a test is open: CLI runs, ``hermes``
    subprocesses, a doctest, somebody's script. It cannot be enumerated, so a
    guard built by elimination will keep losing to the next process shape.

    So ask the other question. The gateway, and only the gateway, can be
    recognised *positively*: it sets ``_HERMES_GATEWAY=1`` at import of
    ``gateway/run.py``, before plugin discovery. ``crew.worker.should_run``
    has rested on that marker since the worker was written;
    ``is_gateway_process`` is that half of it, shared rather than restated.

    The pytest check stays as a second condition, because the gateway's own
    tests set the marker deliberately (``tests/plugins/test_crew_tasks.py``)
    and those must not start writing to a real home either.
    """
    import os

    if "pytest" in sys.modules or os.environ.get("PYTEST_CURRENT_TEST"):
        return False
    try:
        from crew import worker as crew_worker

        return crew_worker.is_gateway_process()
    except Exception:
        # Cannot tell → do not write. A missing ledger line is a cosmetic gap;
        # a row in somebody's real database is the bug described above.
        log.debug("crew: could not tell whether this is a gateway boot", exc_info=True)
        return False


def _start_task_worker() -> None:
    """Pick up work whose process died, but only where that makes sense.

    ``crew.worker.should_run`` decides: the gateway only, never under pytest,
    and an environment switch to turn it off. This call is unconditional
    because that function owns the policy — putting half the gates here would
    split one decision across two files.
    """
    try:
        from crew import worker as crew_worker

        crew_worker.ensure_worker()
    except Exception:
        log.debug("crew: task worker not started", exc_info=True)


def _recover_interrupted_releases() -> None:
    """Turn every approval still reading ``executing`` into ``outcome_unknown``.

    A row in that state means a process was told to go ahead with a held
    action, went ahead, and never came back to say how it went. The tool call
    was dispatched; whether it landed is genuinely unknown.

    Safe to do at startup precisely because a released approval has no peer —
    it was spent in one process on one tool call. The task engine's recovery
    deliberately works the other way (`crew/tasks.py`): a task *can* be running
    healthily in a peer, so no boot-time statement may touch it.
    """
    try:
        from crew import approvals as crew_approvals
        from crew import db as crew_db

        recovered = crew_approvals.recover_executing(crew_db.connect())
        if recovered:
            log.warning(
                "crew: %d approved action(s) were interrupted mid-flight; "
                "they are marked outcome_unknown and need checking", recovered,
            )
    except Exception:
        log.debug("crew: could not recover interrupted releases", exc_info=True)


def _register_skills(ctx) -> None:
    """Make the plugin's own skills loadable as ``hermes-crew:<name>``.

    Plugin skills are explicit loads — they do not enter the profile's flat
    skills tree and are not listed in the system prompt's index. That is the
    right shape here: the house style for a deck is worth several hundred words
    when a teammate is making one, and worth nothing in the prompt of one that
    never will.
    """
    skills_root = Path(__file__).resolve().parent / "skills"
    if not skills_root.is_dir():
        return
    for skill_dir in sorted(skills_root.iterdir()):
        if not (skill_dir / "SKILL.md").is_file():
            continue
        try:
            ctx.register_skill(name=skill_dir.name, path=skill_dir)
        except Exception:
            log.debug("crew: could not register the skill %s", skill_dir.name, exc_info=True)


def _record_policy() -> None:
    """Write the boundary in force at this boot into the audit ledger.

    Grants live in SQLite, but the risk table that decides everything without a
    grant lives in this build. An upgrade can therefore change what a teammate
    may do without a single row changing, and somebody reading last month's
    refusals would have no way to know which rules produced them. One row at
    load time is the whole fix.

    Best-effort: a plugin that fails to register because the audit table is
    unavailable would take the teammates down with it, which is a much worse
    outcome than a missing ledger line.
    """
    try:
        from crew import audit as crew_audit
        from crew import db as crew_db

        crew_audit.record_policy_loaded(crew_db.connect())
    except Exception:
        log.debug("crew: policy not recorded at load", exc_info=True)
