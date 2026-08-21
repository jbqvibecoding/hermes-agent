"""B5.4: the value reaches the field, by the right route, and leaves no copy.

The two backends normalise the element ref in **opposite** directions —
agent-browser wants a leading ``@``, Camofox wants it stripped. Getting that
backwards types the password into the wrong element, or nowhere, so both
directions are asserted explicitly.
"""

from __future__ import annotations

import pytest

from tools import browser_secret_fill
from tools.browser_secret_fill import (
    SecretFillUnavailable,
    backend_name,
    fill_secret,
    secret_exposure_warning,
)

SECRET = "hunter2-correct-horse-battery"


# ---------------------------------------------------------------------------
# Camofox path
# ---------------------------------------------------------------------------


@pytest.fixture
def camofox(monkeypatch):
    monkeypatch.setattr(browser_secret_fill, "_camofox_active", lambda: True)
    import tools.browser_camofox as cf

    posted = []
    monkeypatch.setattr(cf, "_post", lambda path, body, **kw: posted.append((path, body)))
    monkeypatch.setattr(
        cf, "_get_session", lambda t: {"tab_id": "T1", "user_id": "u1", "session_key": "s"}
    )
    return posted


def test_camofox_receives_the_value_in_the_request_body(camofox):
    fill_secret("t", "@e7", SECRET)
    (path, body), = camofox
    assert path == "/tabs/T1/type"
    assert body["text"] == SECRET
    assert body["userId"] == "u1"


def test_camofox_strips_the_at_sign(camofox):
    fill_secret("t", "@e7", SECRET)
    assert camofox[0][1]["ref"] == "e7"


def test_camofox_accepts_a_ref_that_already_lacks_the_at_sign(camofox):
    fill_secret("t", "e7", SECRET)
    assert camofox[0][1]["ref"] == "e7"


def test_camofox_without_an_open_tab_refuses_rather_than_guessing(monkeypatch):
    monkeypatch.setattr(browser_secret_fill, "_camofox_active", lambda: True)
    import tools.browser_camofox as cf

    posted = []
    monkeypatch.setattr(cf, "_post", lambda *a, **kw: posted.append(a))
    monkeypatch.setattr(cf, "_get_session", lambda t: {"tab_id": None, "user_id": "u"})

    with pytest.raises(SecretFillUnavailable):
        fill_secret("t", "@e7", SECRET)
    assert not posted


# ---------------------------------------------------------------------------
# agent-browser path
# ---------------------------------------------------------------------------


@pytest.fixture
def agent_browser(monkeypatch):
    monkeypatch.setattr(browser_secret_fill, "_camofox_active", lambda: False)
    import tools.browser_tool as bt

    calls = []

    def _run(task_id, command, args, **kw):
        calls.append((task_id, command, list(args)))
        return {"success": True}

    monkeypatch.setattr(bt, "_run_browser_command", _run)
    monkeypatch.setattr(bt, "_last_session_key", lambda k: k)
    return calls


def test_agent_browser_uses_the_fill_verb(agent_browser):
    fill_secret("t", "@e7", SECRET)
    (task_id, command, args), = agent_browser
    assert task_id == "t"
    assert command == "fill"
    assert args[1] == SECRET


def test_agent_browser_adds_the_at_sign(agent_browser):
    """The opposite normalisation from Camofox — this is the easy one to invert."""
    fill_secret("t", "e7", SECRET)
    assert agent_browser[0][2][0] == "@e7"


def test_agent_browser_leaves_an_existing_at_sign_alone(agent_browser):
    fill_secret("t", "@e7", SECRET)
    assert agent_browser[0][2][0] == "@e7"


def test_a_rejected_fill_raises(monkeypatch):
    monkeypatch.setattr(browser_secret_fill, "_camofox_active", lambda: False)
    import tools.browser_tool as bt

    monkeypatch.setattr(
        bt, "_run_browser_command", lambda *a, **kw: {"success": False, "error": SECRET}
    )
    monkeypatch.setattr(bt, "_last_session_key", lambda k: k)

    with pytest.raises(SecretFillUnavailable) as excinfo:
        fill_secret("t", "@e7", SECRET)
    # The backend's error can echo what it was given; carrying it out would be
    # a second copy of the value in a second place.
    assert SECRET not in str(excinfo.value)


# ---------------------------------------------------------------------------
# Backend selection and the honest warning
# ---------------------------------------------------------------------------


def test_the_backend_is_reported(monkeypatch):
    monkeypatch.setattr(browser_secret_fill, "_camofox_active", lambda: True)
    assert backend_name() == "camofox"
    monkeypatch.setattr(browser_secret_fill, "_camofox_active", lambda: False)
    assert backend_name() == "agent-browser"


def test_the_argv_warning_is_shown_only_where_it_applies(monkeypatch):
    """Warning on every backend would train people to ignore it."""
    monkeypatch.setattr(browser_secret_fill, "_camofox_active", lambda: False)
    warning = secret_exposure_warning()
    assert "command-line argument" in warning
    assert "Camofox" in warning

    monkeypatch.setattr(browser_secret_fill, "_camofox_active", lambda: True)
    assert secret_exposure_warning() == ""


def test_an_undeterminable_backend_falls_back_to_agent_browser(monkeypatch):
    """Falling back to the *more* cautious warning is the safe direction."""
    import tools.browser_tool as bt

    monkeypatch.setattr(
        bt, "_is_camofox_mode", lambda: (_ for _ in ()).throw(RuntimeError("x"))
    )
    assert backend_name() == "agent-browser"


# ---------------------------------------------------------------------------
# End to end through browser_secret
# ---------------------------------------------------------------------------


def test_the_whole_exchange_puts_the_value_only_in_the_field(agent_browser):
    import json

    from tools import browser_secret

    browser_secret.reset()
    try:
        browser_secret.request_secret("t", "@e7", "admin password")
        result = browser_secret.supply_secret(
            "t", SECRET, filler=lambda ref, value: fill_secret("t", ref, value)
        )
        assert result["supplied"] is True
        assert result["characters"] == len(SECRET)
        assert SECRET not in json.dumps(result)
        assert agent_browser[0][2][1] == SECRET  # it did reach the browser
    finally:
        browser_secret.reset()


def test_the_module_returns_nothing_a_caller_could_log():
    """No result object means no accidental second copy."""
    import inspect

    source = inspect.getsource(fill_secret)
    assert "-> None" in source
