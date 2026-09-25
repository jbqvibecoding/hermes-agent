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


def test_the_guard_does_not_rest_on_a_per_test_variable(monkeypatch):
    """``PYTEST_CURRENT_TEST`` is set per test and is therefore **unset during
    collection**, which is when the leak happened. A guard resting on it alone
    would not have stopped this, so removing it must not change the answer."""
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "_crew_plugin_under_test", PLUGIN_ROOT / "__init__.py",
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)
    assert module._is_test_process() is True
