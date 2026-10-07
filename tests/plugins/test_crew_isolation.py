"""Hermes Crew — a test run must not touch the developer's real database.

This is a regression test for a defect that was never red. The plugin is a
bundled backend, so it registers while pytest is still *importing* test
modules — before any fixture has run, while ``HERMES_HOME`` is still unset.
``crew.db.crew_home()`` therefore fell back to the platform default, and two
boot-time writes in ``register()`` — the policy ledger line and the
interrupted-release recovery — went into the developer's real
``~/.hermes/crew.db``. Twenty-eight rows had accumulated there by the time
anybody looked, and every one of those writes *succeeded*, which is why the
suite stayed green.

``crew.worker.should_run`` was already built to stop exactly this for the
worker thread. Its docstring even names the outcome — *"any straggler would
write into the developer's real crew database"*. The thread was gated; the two
synchronous writers beside it were not.

**How this is checked, and why not the obvious way.** The first version of
this test pointed ``HOME`` at a tmpdir and asserted no ``crew.db`` appeared
under it. It passed against the broken build: with an empty fake home the
plugin never gets as far as registering, so nothing writes and the test proves
nothing. What works instead is to let the subprocess keep the real home — the
state a real suite actually runs in — and pin ``HERMES_CREW_DB`` at a tmp
path. Registration then happens for real, and the pin catches the write
somewhere harmless instead of in somebody's home directory.

**The second leak, and why the bottom half of this file exists.** The guard
that stopped the above asked ``"pytest" in sys.modules``. The first full-suite
run with the plugin installed produced a fresh ``crew.db`` in the run's
``$HOME`` anyway, with exactly one ``audit`` row in it. Tests spawn
subprocesses; those subprocesses load plugins; in them pytest is not imported
and ``HERMES_HOME`` is not inherited, so the guard answered "not a test" and
wrote. The fix was to stop guessing from absence and require the gateway's own
marker, and the tests below drive that shape directly — a plain ``python``
with a fake ``$HOME``, once without the marker and once with it. The second
run is the control: it must still write, or "no database" would also be
satisfied by registration having quietly stopped doing anything.
"""

from __future__ import annotations

import os
import sqlite3
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PLUGIN_ROOT = PROJECT_ROOT / "plugins" / "hermes-crew"


def _audit_rows(db: Path) -> int:
    """Rows in the audit ledger, or -1 when the file was never created."""
    if not db.exists():
        return -1
    conn = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
    try:
        return int(conn.execute("SELECT COUNT(*) FROM audit").fetchone()[0])
    except sqlite3.Error:
        return 0
    finally:
        conn.close()


def _load_plugin_module():
    """Load ``plugins/hermes-crew/__init__.py`` as a standalone module.

    By file path rather than by import name because that is how the plugin
    loader itself reaches it — there is no ``hermes_plugins`` package to import
    from in a test process.
    """
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "_crew_plugin_under_test", PLUGIN_ROOT / "__init__.py",
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _collect_only(db: Path) -> subprocess.CompletedProcess:
    """A real pytest collection run with crew's database pinned at ``db``.

    ``--collect-only`` on purpose: no test body executes, so anything this
    catches happened during *import*. That is the window the bug lived in and
    the one window no fixture can reach.
    """
    env = dict(os.environ)
    env["HERMES_CREW_DB"] = str(db)
    env.pop("PYTEST_CURRENT_TEST", None)
    return subprocess.run(
        [sys.executable, "-m", "pytest", "tests/cron/",
         "--collect-only", "-q", "-p", "no:cacheprovider"],
        cwd=PROJECT_ROOT, env=env, capture_output=True, text=True, timeout=600,
    )


def test_collecting_tests_writes_nothing_to_crews_database(tmp_path):
    """**The property.** Not "the guard returns True" — that would pass against
    a build where some other writer leaks tomorrow. What matters is that the
    file stays untouched.

    ``tests/cron/`` is the target rather than a crew test because crew's own
    tests import ``crew.*`` off ``sys.path`` directly and never go through the
    plugin loader, so they register nothing. This is the suite whose
    *collection* was observed writing a row.
    """
    db = tmp_path / "crew.db"

    result = _collect_only(db)
    assert result.returncode == 0, result.stdout[-2000:] + result.stderr[-2000:]

    assert not db.exists(), (
        f"collecting tests created {db} with {_audit_rows(db)} audit rows. "
        f"Something in register() writes at import time, where no fixture has "
        f"redirected anything yet — so in a run without this pin, that file is "
        f"the developer's own ~/.hermes/crew.db."
    )


def test_the_check_above_would_notice_a_write(tmp_path):
    """The positive control, and this suite needs one.

    A test that asserts a file was *not* created passes just as happily when
    nothing could have created it — which is exactly how the first version of
    the test above went wrong. This drives the same writer directly at the same
    pinned path, so "no file" above means "the guard held" rather than "the
    write path was never live".
    """
    db = tmp_path / "crew.db"
    if str(PLUGIN_ROOT) not in sys.path:
        sys.path.insert(0, str(PLUGIN_ROOT))

    from crew import audit as crew_audit
    from crew import db as crew_db

    crew_audit.record_policy_loaded(crew_db.connect(db))

    assert db.exists(), "the pin is honoured and the writer works"
    assert _audit_rows(db) == 1


def test_the_guard_holds_even_when_a_test_sets_the_gateway_marker(monkeypatch):
    """The gateway's own tests set ``_HERMES_GATEWAY=1`` on purpose.

    ``tests/plugins/test_crew_tasks.py`` does exactly that to assert
    ``should_run()`` is True. Registration must still refuse to write there:
    the marker says "a gateway would be allowed to", not "this process is one".
    Pinning this keeps the pytest half of the gate from being tidied away as
    redundant once the positive gate is in place.
    """
    module = _load_plugin_module()

    monkeypatch.setenv("_HERMES_GATEWAY", "1")
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    assert module._is_gateway_boot() is False


# ---------------------------------------------------------------------------
# The second leak: a subprocess that is not pytest at all
# ---------------------------------------------------------------------------

_REGISTER_IN_BARE_PYTHON = """
import importlib.util, sys
spec = importlib.util.spec_from_file_location("_crew_plugin", sys.argv[1])
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class _Ctx:
    def register_tool(self, *a, **k): pass
    def register_hook(self, *a, **k): pass
    def register_cli_command(self, *a, **k): pass


assert "pytest" not in sys.modules, "this probe must not look like a test"
module.register(_Ctx())
"""


def _register_in_bare_python(home: Path, *, as_gateway: bool) -> subprocess.CompletedProcess:
    """Register the plugin in a plain ``python``, with ``home`` as ``$HOME``.

    This is the shape that leaked past the ``sys.modules`` guard: no pytest
    anywhere, and ``HERMES_HOME`` unset, so ``crew.db.crew_home()`` falls back
    to ``$HOME/.hermes`` — which in a real suite is the developer's own.
    ``HERMES_CREW_DB`` is cleared deliberately: pinning it would hide the very
    fallback under test.
    """
    env = dict(os.environ)
    env["HOME"] = str(home)
    for name in ("HERMES_HOME", "HERMES_CREW_DB", "PYTEST_CURRENT_TEST"):
        env.pop(name, None)
    # The worker is gated separately and would write on its own schedule;
    # switching it off keeps this about the two synchronous writers.
    env["HERMES_CREW_WORKER"] = "0"
    if as_gateway:
        env["_HERMES_GATEWAY"] = "1"
    else:
        env.pop("_HERMES_GATEWAY", None)
    return subprocess.run(
        [sys.executable, "-c", _REGISTER_IN_BARE_PYTHON, str(PLUGIN_ROOT / "__init__.py")],
        cwd=PROJECT_ROOT, env=env, capture_output=True, text=True, timeout=300,
    )


def test_registering_outside_the_gateway_writes_nothing(tmp_path):
    """Found by the first full-suite run: a fresh ``crew.db`` in the run's HOME.

    It carried exactly one ``audit`` row — the ledger line from ``register()``
    — which is how it was traced back here. Tests spawn subprocesses, those
    subprocesses load plugins, and in them neither pytest nor ``HERMES_HOME``
    is present, so a guard that asks "is this pytest?" answers no and writes.
    """
    home = tmp_path / "home"
    home.mkdir()

    result = _register_in_bare_python(home, as_gateway=False)
    assert result.returncode == 0, result.stdout[-2000:] + result.stderr[-2000:]

    leaked = home / ".hermes" / "crew.db"
    assert not leaked.exists(), (
        f"registering the plugin in a plain python created {leaked} with "
        f"{_audit_rows(leaked)} audit rows. In a real test run $HOME is the "
        f"developer's own, so that file is theirs."
    )


def test_the_gateway_itself_still_writes(tmp_path):
    """The positive control for the test above, and the reason it is not vacuous.

    Same subprocess, same fake ``$HOME``, one environment variable different.
    Without this, "no database" above would be satisfied just as well by a
    build where registration had quietly stopped doing anything at all — which
    is the second way this suite could have fooled itself, after the fake-home
    version described at the top of the file.
    """
    home = tmp_path / "home"
    home.mkdir()

    result = _register_in_bare_python(home, as_gateway=True)
    assert result.returncode == 0, result.stdout[-2000:] + result.stderr[-2000:]

    written = home / ".hermes" / "crew.db"
    assert written.exists(), "the gateway must still record its boot-time ledger line"
    assert _audit_rows(written) == 1
