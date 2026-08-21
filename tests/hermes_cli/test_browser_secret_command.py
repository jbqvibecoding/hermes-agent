"""B5.3: /browser secret — the person types it, the agent never sees it."""

from __future__ import annotations

import pytest

pytest.importorskip("rich", reason="hermes_cli.cli_commands_mixin requires rich")

from hermes_cli.cli_commands_mixin import CLICommandsMixin  # noqa: E402
from tools import browser_secret  # noqa: E402

SECRET = "hunter2-correct-horse-battery"


class _Fake(CLICommandsMixin):
    """Stands in for the CLI. `_app` absent → the non-TUI prompt path."""

    _app = None


@pytest.fixture
def cli(capsys):
    browser_secret.reset()
    yield _Fake(), capsys
    browser_secret.reset()


# ---------------------------------------------------------------------------
# Nothing pending
# ---------------------------------------------------------------------------


def test_with_nothing_pending_it_says_so_instead_of_opening_a_prompt(cli, monkeypatch):
    obj, capsys = cli
    opened = []
    monkeypatch.setattr(
        obj, "_prompt_browser_secret_value", lambda label: opened.append(label)
    )
    obj._handle_browser_secret()
    out = capsys.readouterr().out
    assert "Nothing is waiting for a secret" in out
    assert "browser_ask_human" in out  # tells you how one gets requested
    assert not opened, "a masked prompt was opened with nothing to fill"


# ---------------------------------------------------------------------------
# The happy path
# ---------------------------------------------------------------------------


def test_the_value_reaches_the_filler_and_not_the_output(cli, monkeypatch):
    obj, capsys = cli
    filled = []
    monkeypatch.setattr(obj, "_prompt_browser_secret_value", lambda label: SECRET)
    monkeypatch.setattr(
        "tools.browser_secret_fill.fill_secret",
        lambda key, ref, value: filled.append((ref, value)),
    )

    browser_secret.request_secret("default", "@e7", "admin password")
    obj._handle_browser_secret()

    out = capsys.readouterr().out
    assert filled == [("@e7", SECRET)]
    assert SECRET not in out
    assert "Filled @e7" in out


def test_the_prompt_shows_what_is_being_asked_for(cli, monkeypatch):
    obj, capsys = cli
    monkeypatch.setattr(obj, "_prompt_browser_secret_value", lambda label: SECRET)
    monkeypatch.setattr("tools.browser_secret_fill.fill_secret", lambda *a: None)

    browser_secret.request_secret("default", "@e7", "the VPN password")
    obj._handle_browser_secret()

    out = capsys.readouterr().out
    assert "@e7" in out
    assert "the VPN password" in out
    assert "will not see what you type" in out


def test_the_request_is_consumed(cli, monkeypatch):
    obj, _ = cli
    monkeypatch.setattr(obj, "_prompt_browser_secret_value", lambda label: SECRET)
    monkeypatch.setattr("tools.browser_secret_fill.fill_secret", lambda *a: None)

    browser_secret.request_secret("default", "@e7")
    obj._handle_browser_secret()
    assert browser_secret.pending_secret("default") is None


# ---------------------------------------------------------------------------
# Cancelling
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("returned", [None, ""])
def test_cancelling_does_not_type_an_empty_string_into_the_page(
    cli, monkeypatch, returned
):
    """ESC or an empty Enter must abort, not submit a blank password."""
    obj, capsys = cli
    filled = []
    monkeypatch.setattr(obj, "_prompt_browser_secret_value", lambda label: returned)
    monkeypatch.setattr(
        "tools.browser_secret_fill.fill_secret",
        lambda key, ref, value: filled.append(value),
    )

    browser_secret.request_secret("default", "@e7")
    obj._handle_browser_secret()

    assert not filled
    assert "Cancelled" in capsys.readouterr().out


def test_cancelling_leaves_the_request_open_for_another_go(cli, monkeypatch):
    obj, _ = cli
    monkeypatch.setattr(obj, "_prompt_browser_secret_value", lambda label: None)
    browser_secret.request_secret("default", "@e7")
    obj._handle_browser_secret()
    assert browser_secret.pending_secret("default") is not None


# ---------------------------------------------------------------------------
# Failures never leak the value
# ---------------------------------------------------------------------------


def test_a_fill_failure_is_reported_without_the_value(cli, monkeypatch):
    from tools.browser_secret_fill import SecretFillUnavailable

    obj, capsys = cli
    monkeypatch.setattr(obj, "_prompt_browser_secret_value", lambda label: SECRET)
    monkeypatch.setattr(
        "tools.browser_secret_fill.fill_secret",
        lambda *a: (_ for _ in ()).throw(SecretFillUnavailable("no tab open")),
    )

    browser_secret.request_secret("default", "@e7")
    obj._handle_browser_secret()

    out = capsys.readouterr().out
    assert SECRET not in out
    assert "no tab open" in out


def test_an_unexpected_failure_reports_only_the_exception_type(cli, monkeypatch):
    obj, capsys = cli
    monkeypatch.setattr(obj, "_prompt_browser_secret_value", lambda label: SECRET)
    monkeypatch.setattr(
        "tools.browser_secret_fill.fill_secret",
        lambda *a: (_ for _ in ()).throw(RuntimeError(f"boom while typing {SECRET}")),
    )

    browser_secret.request_secret("default", "@e7")
    obj._handle_browser_secret()

    out = capsys.readouterr().out
    assert SECRET not in out


def test_the_argv_warning_is_surfaced_when_it_applies(cli, monkeypatch):
    obj, capsys = cli
    monkeypatch.setattr(
        "tools.browser_secret_fill.secret_exposure_warning",
        lambda: "Note: visible in the process list.",
    )
    monkeypatch.setattr(obj, "_prompt_browser_secret_value", lambda label: None)

    browser_secret.request_secret("default", "@e7")
    obj._handle_browser_secret()
    assert "visible in the process list" in capsys.readouterr().out


# ---------------------------------------------------------------------------
# The prompt itself
# ---------------------------------------------------------------------------


def test_without_a_tui_the_masked_reader_is_used(cli, monkeypatch):
    """`hermes -p`, a pipe, a non-interactive shell — still masked, not input()."""
    obj, _ = cli
    called = []
    monkeypatch.setattr(
        "hermes_cli.callbacks.masked_secret_prompt",
        lambda prompt: called.append(prompt) or SECRET,
    )
    assert obj._prompt_browser_secret_value("a password") == SECRET
    assert called and "hidden" in called[0]


def test_the_masked_prompt_never_calls_input(monkeypatch):
    """input() deadlocks inside prompt_toolkit's event loop — the repo says so
    in two places. This asserts the browser path does not reintroduce it."""
    import inspect

    from hermes_cli import callbacks

    source = inspect.getsource(callbacks.prompt_for_secret_value)
    assert "input(" not in source


def test_a_broken_prompt_is_reported_not_raised(cli, monkeypatch):
    obj, capsys = cli
    monkeypatch.setattr(
        "hermes_cli.callbacks.prompt_for_secret_value",
        lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("tty gone")),
    )
    assert obj._prompt_browser_secret_value("x") is None
    assert "Could not open a masked prompt" in capsys.readouterr().out
