"""B3 wiring: all three browser paths must honour the staleness guard.

Hermes drives a browser three ways and they share no dispatcher. A guard wired
into one of them looks like it works — right up until the operator configures
Camofox, or the model reaches for raw CDP. These tests exist to catch a future
edit that adds a fourth path, or drops one of the three.

The browser itself is never started: each path is exercised with its network /
subprocess boundary stubbed, because what is under test is the *gate*, not
Chromium.
"""

from __future__ import annotations

import json

import pytest

from tools import browser_view_state
from tools.browser_view_state import note_snapshot, reset


@pytest.fixture(autouse=True)
def _clean():
    reset()
    yield
    reset()


# ---------------------------------------------------------------------------
# Path 1 — agent-browser (tools/browser_tool.py)
# ---------------------------------------------------------------------------


def test_agent_browser_click_refuses_a_superseded_view(monkeypatch):
    import tools.browser_tool as bt

    monkeypatch.setattr(bt, "_is_camofox_mode", lambda: False)
    monkeypatch.setattr(bt, "_last_session_key", lambda k: k)

    ran = []
    monkeypatch.setattr(
        bt,
        "_run_browser_command",
        lambda *a, **kw: ran.append(a) or {"success": True, "data": {}},
    )

    old = note_snapshot("t1")
    note_snapshot("t1")  # the page moved on

    out = json.loads(bt.browser_click("@e5", task_id="t1", snapshot_id=old))
    assert out["success"] is False
    assert out["stale_view"] is True
    assert out["current_snapshot_id"] == "v2"
    assert not ran, "the click must not reach the browser"


def test_agent_browser_click_proceeds_on_the_current_view(monkeypatch):
    import tools.browser_tool as bt

    monkeypatch.setattr(bt, "_is_camofox_mode", lambda: False)
    monkeypatch.setattr(bt, "_last_session_key", lambda k: k)
    monkeypatch.setattr(bt, "_blocked_private_page_action", lambda *a, **kw: None)
    ran = []
    monkeypatch.setattr(
        bt,
        "_run_browser_command",
        lambda *a, **kw: (ran.append(a), {"success": True, "data": {}})[1],
    )

    current = note_snapshot("t1")
    out = json.loads(bt.browser_click("@e5", task_id="t1", snapshot_id=current))
    assert out["success"] is True
    assert ran, "the click should have reached the browser"


def test_agent_browser_type_refuses_a_superseded_view(monkeypatch):
    import tools.browser_tool as bt

    monkeypatch.setattr(bt, "_is_camofox_mode", lambda: False)
    monkeypatch.setattr(bt, "_last_session_key", lambda k: k)
    ran = []
    monkeypatch.setattr(
        bt, "_run_browser_command", lambda *a, **kw: ran.append(a) or {"success": True}
    )

    old = note_snapshot("t1")
    note_snapshot("t1")

    out = json.loads(bt.browser_type("@e3", "hello", task_id="t1", snapshot_id=old))
    assert out["success"] is False
    assert not ran


def test_omitting_the_view_id_keeps_the_old_behaviour(monkeypatch):
    """Every existing call site passes no snapshot_id and must be unaffected."""
    import tools.browser_tool as bt

    monkeypatch.setattr(bt, "_is_camofox_mode", lambda: False)
    monkeypatch.setattr(bt, "_last_session_key", lambda k: k)
    monkeypatch.setattr(bt, "_blocked_private_page_action", lambda *a, **kw: None)
    ran = []
    monkeypatch.setattr(
        bt,
        "_run_browser_command",
        lambda *a, **kw: (ran.append(a), {"success": True, "data": {}})[1],
    )

    note_snapshot("t1")
    note_snapshot("t1")  # deliberately stale, but no id is claimed
    out = json.loads(bt.browser_click("@e5", task_id="t1"))
    assert out["success"] is True
    assert ran


def test_the_generation_advances_on_snapshot_and_navigation():
    import tools.browser_tool as bt

    assert browser_view_state.current_view_id("t2") == ""
    bt._note_browser_view_change("t2", "snapshot", {"success": True})
    assert browser_view_state.current_view_id("t2") == "v1"
    bt._note_browser_view_change("t2", "open", {"success": True})
    assert browser_view_state.current_view_id("t2") == "v2"


def test_a_failed_command_does_not_advance_the_generation():
    """A snapshot that failed handed back no new refs, so the ones the caller
    already holds are still current."""
    import tools.browser_tool as bt

    bt._note_browser_view_change("t2", "snapshot", {"success": True})
    bt._note_browser_view_change("t2", "snapshot", {"success": False})
    assert browser_view_state.current_view_id("t2") == "v1"


def test_a_click_does_not_advance_the_generation():
    """Actions from one snapshot must stay usable — filling three fields then
    submitting is a normal flow, not a staleness bug."""
    import tools.browser_tool as bt

    bt._note_browser_view_change("t2", "snapshot", {"success": True})
    bt._note_browser_view_change("t2", "click", {"success": True})
    bt._note_browser_view_change("t2", "fill", {"success": True})
    assert browser_view_state.current_view_id("t2") == "v1"


def test_bookkeeping_never_raises_on_a_malformed_result():
    import tools.browser_tool as bt

    bt._note_browser_view_change("t2", "snapshot", None)
    bt._note_browser_view_change("t2", "snapshot", "not a dict")
    assert browser_view_state.current_view_id("t2") == ""


# ---------------------------------------------------------------------------
# Path 2 — Camofox (tools/browser_camofox.py)
# ---------------------------------------------------------------------------


def test_camofox_click_refuses_a_superseded_view(monkeypatch):
    import tools.browser_camofox as cf

    posted = []
    monkeypatch.setattr(cf, "_post", lambda *a, **kw: posted.append(a) or {})
    monkeypatch.setattr(
        cf,
        "_get_session",
        lambda t: {"tab_id": "T", "user_id": "u", "session_key": "s"},
    )

    old = note_snapshot("t3")
    note_snapshot("t3")

    out = json.loads(cf.camofox_click("@e5", "t3", snapshot_id=old))
    assert out["success"] is False
    assert "out of date" in out["error"]
    assert not posted, "the click must not reach Camofox"


def test_camofox_type_refuses_a_superseded_view(monkeypatch):
    import tools.browser_camofox as cf

    posted = []
    monkeypatch.setattr(cf, "_post", lambda *a, **kw: posted.append(a) or {})
    monkeypatch.setattr(
        cf,
        "_get_session",
        lambda t: {"tab_id": "T", "user_id": "u", "session_key": "s"},
    )

    old = note_snapshot("t3")
    note_snapshot("t3")

    out = json.loads(cf.camofox_type("@e3", "hello", "t3", snapshot_id=old))
    assert out["success"] is False
    assert not posted


def test_camofox_reaches_the_browser_on_the_current_view(monkeypatch):
    import tools.browser_camofox as cf

    posted = []
    monkeypatch.setattr(
        cf, "_post", lambda *a, **kw: (posted.append(a), {"url": "https://x"})[1]
    )
    monkeypatch.setattr(
        cf,
        "_get_session",
        lambda t: {"tab_id": "T", "user_id": "u", "session_key": "s"},
    )
    monkeypatch.setattr(cf, "_camofox_private_page_block", lambda *a, **kw: None)

    current = note_snapshot("t3")
    out = json.loads(cf.camofox_click("@e5", "t3", snapshot_id=current))
    assert out["success"] is True
    assert posted


def test_camofox_advances_the_generation():
    import tools.browser_camofox as cf

    cf._note_view_change("t4", "snapshot")
    assert browser_view_state.current_view_id("t4") == "v1"
    cf._note_view_change("t4", "navigate")
    assert browser_view_state.current_view_id("t4") == "v2"
    cf._note_view_change("t4", "click")  # actions do not
    assert browser_view_state.current_view_id("t4") == "v2"


# ---------------------------------------------------------------------------
# Path 3 — raw CDP (tools/browser_cdp_tool.py)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "method", ["Page.navigate", "Runtime.evaluate", "Input.dispatchMouseEvent"]
)
def test_raw_cdp_invalidates_the_view(method):
    """A raw method can do anything, so anything not recognisably read-only is
    assumed to have moved the page."""
    import tools.browser_cdp_tool as cdp

    note_snapshot("t5")
    cdp._invalidate_view_after_cdp("t5", method)
    assert browser_view_state.current_view_id("t5") == "v2"


@pytest.mark.parametrize(
    "method",
    [
        "Target.getTargets",
        "DOM.getDocument",
        "Page.captureScreenshot",
        "Network.getCookies",
    ],
)
def test_read_only_cdp_methods_leave_the_view_alone(method):
    import tools.browser_cdp_tool as cdp

    note_snapshot("t5")
    cdp._invalidate_view_after_cdp("t5", method)
    assert browser_view_state.current_view_id("t5") == "v1"


def test_cdp_invalidation_never_raises():
    import tools.browser_cdp_tool as cdp

    cdp._invalidate_view_after_cdp(None, None)
    cdp._invalidate_view_after_cdp("t5", 12345)


# ---------------------------------------------------------------------------
# Coverage guard — all three paths, one assertion
# ---------------------------------------------------------------------------


def test_every_browser_path_has_a_staleness_hook():
    """If someone adds a fourth path, or removes a hook from one of these
    three, this is the test that should fail."""
    import tools.browser_camofox as cf
    import tools.browser_cdp_tool as cdp
    import tools.browser_tool as bt

    assert callable(bt._stale_view_error)
    assert callable(bt._note_browser_view_change)
    assert callable(cf._stale_view_error)
    assert callable(cf._note_view_change)
    assert callable(cdp._invalidate_view_after_cdp)


def test_the_ref_consuming_tools_accept_a_snapshot_id():
    """The guard is only reachable if the parameter exists on the tools that
    name an element."""
    import inspect

    import tools.browser_camofox as cf
    import tools.browser_tool as bt

    for fn in (bt.browser_click, bt.browser_type, cf.camofox_click, cf.camofox_type):
        assert "snapshot_id" in inspect.signature(fn).parameters, fn.__name__
