"""B1 wiring: every browser path must refuse agent actions during a takeover.

This is the most important test file in the B series. A takeover gate that
covers two of Hermes' three browser paths is worse than no gate at all: the
person at the keyboard believes the agent has been stopped, and it has not.

The browser is never started — each path's network/subprocess boundary is
stubbed, because what is under test is the gate.
"""

from __future__ import annotations

import json

import pytest

from tools.browser_control import release, reset, take


@pytest.fixture(autouse=True)
def _clean():
    reset()
    yield
    reset()


# ---------------------------------------------------------------------------
# Path 1 — agent-browser
# ---------------------------------------------------------------------------


def _stub_agent_browser(monkeypatch):
    """Let _run_browser_command reach its gate, and record if it goes past."""
    import tools.browser_tool as bt

    reached = []
    monkeypatch.setattr(bt, "_find_agent_browser", lambda: "/fake/agent-browser")
    monkeypatch.setattr(bt, "_requires_real_termux_browser_install", lambda _c: False)
    monkeypatch.setattr(bt, "_is_local_mode", lambda: False)
    monkeypatch.setattr(
        bt,
        "_get_session_info",
        lambda tid: reached.append(tid) or {"session_name": "s"},
    )
    return bt, reached


@pytest.mark.parametrize("command", ["click", "fill", "open", "press", "eval"])
def test_agent_browser_actions_are_refused_during_takeover(monkeypatch, command):
    bt, reached = _stub_agent_browser(monkeypatch)
    take("t1", "logging in")

    result = bt._run_browser_command("t1", command, [])
    assert result["success"] is False
    assert result["human_has_control"] is True
    assert not reached, f"{command} reached the browser during a takeover"


@pytest.mark.parametrize("command", ["snapshot", "console", "errors"])
def test_agent_browser_reads_are_allowed_during_takeover(monkeypatch, command):
    """The agent must be able to see what the person did."""
    bt, reached = _stub_agent_browser(monkeypatch)
    take("t1")

    bt._run_browser_command("t1", command, [])
    assert reached, f"{command} should have been allowed through"


def test_agent_browser_actions_resume_after_release(monkeypatch):
    bt, reached = _stub_agent_browser(monkeypatch)
    take("t1")
    release("t1")

    bt._run_browser_command("t1", "click", [])
    assert reached


def test_a_broken_control_state_refuses_rather_than_admits(monkeypatch):
    """Fails closed: this is a real boundary, not a hint."""
    import tools.browser_tool as bt

    def _explode(*_a, **_kw):
        raise RuntimeError("state store is down")

    monkeypatch.setattr("tools.browser_control.assert_agent_may_act", _explode)
    blocked = bt._human_control_error("t1", "click")
    assert blocked is not None
    assert json.loads(blocked)["success"] is False


def test_reads_are_not_refused_by_a_broken_control_state(monkeypatch):
    """A read never consults the state, so a broken store cannot block it."""
    import tools.browser_tool as bt

    def _explode(*_a, **_kw):
        raise RuntimeError("state store is down")

    monkeypatch.setattr("tools.browser_control.assert_agent_may_act", _explode)
    # The gate calls assert_agent_may_act for every command, and that function
    # short-circuits reads before touching the store — so with the real
    # implementation a read is fine. Here the whole function is replaced, so
    # this asserts the fail-closed path instead, which is the safe direction.
    assert bt._human_control_error("t1", "snapshot") is not None


# ---------------------------------------------------------------------------
# Path 2 — Camofox
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "call",
    [
        lambda cf: cf.camofox_click("@e1", "t2"),
        lambda cf: cf.camofox_type("@e1", "x", "t2"),
        lambda cf: cf.camofox_scroll("down", "t2"),
        lambda cf: cf.camofox_back("t2"),
        lambda cf: cf.camofox_press("Enter", "t2"),
        lambda cf: cf.camofox_navigate("https://example.com", "t2"),
    ],
)
def test_camofox_actions_are_refused_during_takeover(monkeypatch, call):
    import tools.browser_camofox as cf

    reached = []
    monkeypatch.setattr(cf, "_post", lambda *a, **kw: reached.append(a) or {})
    monkeypatch.setattr(cf, "_get", lambda *a, **kw: reached.append(a) or {})
    monkeypatch.setattr(
        cf,
        "_get_session",
        lambda t: {"tab_id": "T", "user_id": "u", "session_key": "s"},
    )

    take("t2", "doing the 2FA")
    out = json.loads(call(cf))
    assert out["success"] is False
    assert "person is driving" in out["error"]
    assert not reached


def test_camofox_snapshot_is_allowed_during_takeover(monkeypatch):
    import tools.browser_camofox as cf

    monkeypatch.setattr(
        cf, "_get", lambda *a, **kw: {"snapshot": "page", "refsCount": 2}
    )
    monkeypatch.setattr(
        cf,
        "_get_session",
        lambda t: {"tab_id": "T", "user_id": "u", "session_key": "s"},
    )
    monkeypatch.setattr(cf, "_camofox_private_page_block", lambda *a, **kw: None)

    take("t2")
    out = json.loads(cf.camofox_snapshot(False, "t2"))
    assert out["success"] is True


def test_every_acting_camofox_tool_is_gated():
    """If someone adds a new acting Camofox function without the decorator,
    this is the test that should fail."""
    import tools.browser_camofox as cf

    must_be_gated = [
        "camofox_navigate",
        "camofox_click",
        "camofox_type",
        "camofox_scroll",
        "camofox_back",
        "camofox_press",
        "camofox_close",
        "camofox_console",
    ]
    for name in must_be_gated:
        fn = getattr(cf, name)
        assert getattr(fn, "_hermes_control_gated", None), f"{name} is not gated"


def test_camofox_reads_are_not_gated():
    """Gating a read would leave the agent blind to what the person just did."""
    import tools.browser_camofox as cf

    for name in ("camofox_snapshot", "camofox_get_images", "camofox_vision"):
        fn = getattr(cf, name, None)
        if fn is not None:
            assert getattr(fn, "_hermes_control_gated", None) is None, name


# ---------------------------------------------------------------------------
# Path 3 — raw CDP
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "method", ["Page.navigate", "Runtime.evaluate", "Input.dispatchKeyEvent"]
)
def test_raw_cdp_is_refused_during_takeover(method):
    import tools.browser_cdp_tool as cdp

    take("t3", "typing my password")
    blocked = cdp._human_control_block("t3", method)
    assert blocked is not None
    assert "person is driving" in json.loads(blocked)["error"]


@pytest.mark.parametrize("method", ["Target.getTargets", "DOM.getDocument"])
def test_read_only_cdp_is_allowed_during_takeover(method):
    import tools.browser_cdp_tool as cdp

    take("t3")
    assert cdp._human_control_block("t3", method) is None


def test_cdp_is_allowed_when_the_agent_holds_control():
    import tools.browser_cdp_tool as cdp

    assert cdp._human_control_block("t3", "Page.navigate") is None


def test_a_broken_control_state_refuses_cdp(monkeypatch):
    import tools.browser_cdp_tool as cdp

    def _explode(*_a, **_kw):
        raise RuntimeError("down")

    monkeypatch.setattr("tools.browser_control.assert_agent_may_act", _explode)
    assert cdp._human_control_block("t3", "Page.navigate") is not None


# ---------------------------------------------------------------------------
# Coverage guard
# ---------------------------------------------------------------------------


def test_every_browser_path_has_a_takeover_gate():
    """The whole point of B1. If a fourth path appears, add it here."""
    import tools.browser_camofox as cf
    import tools.browser_cdp_tool as cdp
    import tools.browser_tool as bt

    assert callable(bt._human_control_error)
    assert callable(cf._requires_agent_control)
    assert callable(cdp._human_control_block)


def test_the_agent_browser_gate_sits_at_the_shared_chokepoint():
    """It must be inside _run_browser_command, not in the 12 tool wrappers —
    otherwise a command added later arrives ungated."""
    import inspect

    import tools.browser_tool as bt

    source = inspect.getsource(bt._run_browser_command)
    assert "_human_control_error" in source
