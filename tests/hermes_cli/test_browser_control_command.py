"""B1 CLI surface: /browser take and /browser release.

A takeover gate with no way for a person to take control is unreachable
machinery. These tests drive the command handlers directly — the CLI class
carries a lot of session state that is irrelevant here, so the handler methods
are exercised on a bare object.
"""

from __future__ import annotations

import pytest

# The mixin's module imports `rich` at import time, which the minimal test venv
# does not carry. Skip rather than fail: this is an environment gap, not a
# defect, and the handover logic itself is covered without a CLI in
# tests/tools/test_browser_control.py.
pytest.importorskip("rich", reason="hermes_cli.cli_commands_mixin requires rich")

from hermes_cli.cli_commands_mixin import CLICommandsMixin  # noqa: E402
from tools import browser_control  # noqa: E402


class _Fake(CLICommandsMixin):
    """Just enough object to call the handover handlers on."""


@pytest.fixture
def cli(capsys):
    browser_control.reset()
    yield _Fake(), capsys
    browser_control.reset()


def test_taking_the_wheel_from_the_cli(cli):
    obj, capsys = cli
    obj._handle_browser_take("take")
    assert browser_control.human_may_drive("default")
    assert "You have the wheel" in capsys.readouterr().out


def test_the_prompt_explains_refused_not_queued(cli):
    """The user needs to know the agent is not silently piling up actions."""
    obj, capsys = cli
    obj._handle_browser_take("take")
    out = capsys.readouterr().out
    assert "REFUSED, not queued" in out
    assert "read the page" in out  # and that it can still see


def test_a_reason_can_be_given_and_is_recorded(cli):
    obj, capsys = cli
    obj._handle_browser_take("take it was about to delete the wrong row")
    assert "delete the wrong row" in browser_control.get_state("default").reason


def test_releasing_hands_it_back(cli):
    obj, capsys = cli
    obj._handle_browser_take("take")
    capsys.readouterr()
    obj._handle_browser_release()
    assert not browser_control.human_may_drive("default")
    assert "Handed back" in capsys.readouterr().out


def test_releasing_when_the_agent_already_has_it_says_so(cli):
    obj, capsys = cli
    obj._handle_browser_release()
    assert "already has the browser" in capsys.readouterr().out


def test_status_shows_a_pending_help_request(cli):
    obj, capsys = cli
    browser_control.request_help("default", "stuck on a login wall")
    obj._print_browser_control_status()
    out = capsys.readouterr().out
    assert "asked for help" in out
    assert "stuck on a login wall" in out
    assert "/browser take" in out


def test_status_shows_who_is_driving(cli):
    obj, capsys = cli
    browser_control.take("default", "logging in")
    obj._print_browser_control_status()
    out = capsys.readouterr().out
    assert "You have the wheel" in out
    assert "/browser release" in out


def test_status_shows_a_waiting_secret_request(cli):
    from tools import browser_secret

    obj, capsys = cli
    browser_secret.reset()
    browser_secret.request_secret("default", "@e7", "the admin password")
    try:
        obj._print_browser_control_status()
        out = capsys.readouterr().out
        assert "@e7" in out
        assert "admin password" in out
    finally:
        browser_secret.reset()


def test_status_is_quiet_when_there_is_nothing_to_say(cli):
    obj, capsys = cli
    obj._print_browser_control_status()
    out = capsys.readouterr().out
    assert "wheel" not in out
    assert "asked for help" not in out


def test_the_handlers_never_raise_when_the_modules_are_missing(cli, monkeypatch):
    """A CLI command must not traceback because an import failed."""
    import builtins

    real_import = builtins.__import__

    def _blocked(name, *args, **kwargs):
        if name.startswith("tools.browser_"):
            raise ImportError("simulated")
        return real_import(name, *args, **kwargs)

    obj, capsys = cli
    monkeypatch.setattr(builtins, "__import__", _blocked)
    obj._handle_browser_take("take")
    obj._handle_browser_release()
    obj._print_browser_control_status()
