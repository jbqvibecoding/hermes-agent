"""Every parameter a browser tool's schema declares must reach its function.

This exists because of a real defect. `browser_click` and `browser_type` grew a
`snapshot_id` parameter, the schema told the model "always pass it", and the
registry handler lambdas quietly dropped it — so the B3 staleness gate was
dead on arrival for both tools while looking, from the outside, exactly like a
working feature.

A schema is a promise to the model. This test checks the promise is kept, for
every browser tool, so the next parameter added to one of them cannot go
missing the same way.
"""

from __future__ import annotations

import inspect

import pytest

from tools.browser_tool import BROWSER_TOOL_SCHEMAS
from tools.registry import registry

_BROWSER_TOOL_NAMES = sorted(s["name"] for s in BROWSER_TOOL_SCHEMAS)


def _declared_params(schema: dict) -> set:
    props = (schema.get("parameters") or {}).get("properties") or {}
    return set(props)


@pytest.mark.parametrize("name", _BROWSER_TOOL_NAMES)
def test_every_schema_parameter_is_forwarded_by_the_handler(name):
    """Drive the registered handler and assert each declared parameter arrives.

    The handler is called with a sentinel per parameter and an underlying
    function that records what it was given, so this tests the *wiring* rather
    than re-reading the lambda's source.
    """
    entry = registry.get_entry(name)
    if entry is None:
        pytest.skip(f"{name} is not registered in this environment")

    schema = next(s for s in BROWSER_TOOL_SCHEMAS if s["name"] == name)
    declared = _declared_params(schema)
    if not declared:
        pytest.skip(f"{name} declares no parameters")

    import tools.browser_tool as bt

    received: dict = {}

    def _spy(*args, **kwargs):
        received.update(kwargs)
        # Positional args would defeat the check; the handlers all use keywords.
        assert not args, f"{name} handler passed positional args: {args}"
        return "{}"

    # Sentinels are distinguishable strings so a handler that forwards the
    # *wrong* argument under the right name is caught too.
    sent = {param: f"__sentinel_{param}__" for param in declared}

    target = name  # every browser tool's function shares its tool name
    if not hasattr(bt, target):
        pytest.skip(f"no module-level function named {target}")

    original = getattr(bt, target)
    setattr(bt, target, _spy)
    try:
        entry.handler(dict(sent), task_id="t1")
    except Exception as exc:  # pragma: no cover - a wiring fault, not a pass
        pytest.fail(f"{name} handler raised while forwarding: {exc!r}")
    finally:
        setattr(bt, target, original)

    # A handler may legitimately rename a schema key onto a different keyword
    # (browser_console's "expression" is not a positional match), so compare on
    # the sentinel *values* that arrived rather than on keyword names.
    arrived = {v for v in received.values() if isinstance(v, str)}
    missing = {p for p, s in sent.items() if s not in arrived}
    assert not missing, (
        f"{name}: schema declares {sorted(declared)} but the registry handler "
        f"never forwards {sorted(missing)}. The model is told to send these; "
        "dropping one makes a feature look present while doing nothing."
    )


def test_click_and_type_forward_snapshot_id():
    """The specific regression, named so a failure is self-explaining."""
    for name in ("browser_click", "browser_type"):
        schema = next(s for s in BROWSER_TOOL_SCHEMAS if s["name"] == name)
        assert "snapshot_id" in _declared_params(schema)
        fn = getattr(__import__("tools.browser_tool", fromlist=[name]), name)
        assert "snapshot_id" in inspect.signature(fn).parameters


def test_the_stale_gate_is_actually_reachable_through_the_registry(monkeypatch):
    """End to end through the registry: a superseded view must be refused.

    Before the fix this passed the click straight through, because the handler
    discarded the id the model had been told to send.
    """
    import json

    import tools.browser_tool as bt
    from tools import browser_view_state

    browser_view_state.reset()
    monkeypatch.setattr(bt, "_is_camofox_mode", lambda: False)
    monkeypatch.setattr(bt, "_last_session_key", lambda k: k)
    reached = []
    monkeypatch.setattr(
        bt, "_run_browser_command", lambda *a, **kw: reached.append(a) or {"success": True}
    )

    old = browser_view_state.note_snapshot("t1")
    browser_view_state.note_snapshot("t1")  # the page moved on

    entry = registry.get_entry("browser_click")
    out = json.loads(entry.handler({"ref": "@e5", "snapshot_id": old}, task_id="t1"))

    browser_view_state.reset()
    assert out["success"] is False
    assert out.get("stale_view") is True
    assert not reached, "the click reached the browser despite a stale view"
