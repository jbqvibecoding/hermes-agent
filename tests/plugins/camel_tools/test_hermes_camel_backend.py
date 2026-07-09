"""Tests for the host-model backend shim (hermes_camel_backend.py) and the
catalog's ``needs_model`` wiring.

The shim's request logic (``run_via_call_llm``) lazily does
``from agent.auxiliary_client import call_llm``. Rather than import the real
(dependency-heavy) module, the tests inject a fake ``agent.auxiliary_client``
into ``sys.modules`` — fully isolated and camel-free. The camel-subclass
factory is exercised via a fake ``camel.models`` module the same way.
"""

from __future__ import annotations

import sys
import types

import pytest

from plugins.camel_tools import hermes_camel_backend as hcb
from plugins.camel_tools.catalog import ToolkitSpec


def _install_fake_call_llm(monkeypatch, fn):
    """Inject a fake ``agent.auxiliary_client`` exposing ``call_llm=fn``."""
    mod = types.ModuleType("agent.auxiliary_client")
    mod.call_llm = fn
    monkeypatch.setitem(sys.modules, "agent.auxiliary_client", mod)


def test_run_via_call_llm_forwards_task_and_messages(monkeypatch):
    captured = {}

    def fake_call_llm(**kwargs):
        captured.update(kwargs)
        return "RESP"

    _install_fake_call_llm(monkeypatch, fake_call_llm)

    msgs = [{"role": "user", "content": "hi"}]
    out = hcb.run_via_call_llm(msgs, task="vision")
    assert out == "RESP"
    assert captured["task"] == "vision"
    assert captured["messages"] == msgs
    assert "tools" not in captured
    assert "temperature" not in captured


def test_run_via_call_llm_forwards_optional_args(monkeypatch):
    captured = {}
    _install_fake_call_llm(monkeypatch, lambda **kw: captured.update(kw) or "ok")
    hcb.run_via_call_llm(
        [{"role": "user", "content": "x"}],
        task="web_extract",
        tools=[{"type": "function"}],
        temperature=0.2,
        timeout=30.0,
    )
    assert captured["tools"] == [{"type": "function"}]
    assert captured["temperature"] == 0.2
    assert captured["timeout"] == 30.0
    assert captured["task"] == "web_extract"


@pytest.fixture
def fake_camel(monkeypatch):
    """Inject a minimal fake ``camel.models`` exposing a BaseModelBackend."""
    camel_pkg = types.ModuleType("camel")
    models_mod = types.ModuleType("camel.models")

    class FakeBaseModelBackend:
        def __init__(self, model_type=None, model_config_dict=None, **kwargs):
            self.model_type = model_type
            self.model_config_dict = model_config_dict

    models_mod.BaseModelBackend = FakeBaseModelBackend
    camel_pkg.models = models_mod
    monkeypatch.setitem(sys.modules, "camel", camel_pkg)
    monkeypatch.setitem(sys.modules, "camel.models", models_mod)
    return FakeBaseModelBackend


def test_make_backend_subclasses_camel_base(fake_camel):
    backend = hcb.make_hermes_camel_backend(task="vision", model_type="gpt-4o")
    assert isinstance(backend, fake_camel)
    assert backend.model_type == "gpt-4o"


def test_backend_run_delegates_to_call_llm(fake_camel, monkeypatch):
    captured = {}
    _install_fake_call_llm(monkeypatch, lambda **kw: captured.update(kw) or "RESULT")
    backend = hcb.make_hermes_camel_backend(task="vision")
    msgs = [{"role": "user", "content": "describe"}]
    assert backend.run(msgs) == "RESULT"
    assert captured["task"] == "vision"
    assert captured["messages"] == msgs


def test_backend_run_forwards_tools_kwarg(fake_camel, monkeypatch):
    captured = {}
    _install_fake_call_llm(monkeypatch, lambda **kw: captured.update(kw) or "R")
    backend = hcb.make_hermes_camel_backend()
    backend.run([{"role": "user", "content": "x"}], tools=[{"type": "function"}])
    assert captured["tools"] == [{"type": "function"}]


def test_needs_model_spec_injects_backend(fake_camel, monkeypatch):
    """A needs_model=True spec injects model= into the toolkit constructor."""
    captured = {}

    class FakeToolkit:
        def __init__(self, **kwargs):
            captured.update(kwargs)

        def get_tools(self):
            return []

    fake_toolkits = types.ModuleType("camel.toolkits")
    fake_toolkits.ImageAnalysisToolkit = FakeToolkit
    monkeypatch.setitem(sys.modules, "camel.toolkits", fake_toolkits)
    _install_fake_call_llm(monkeypatch, lambda **kw: "x")

    spec = ToolkitSpec(
        cls="ImageAnalysisToolkit", toolset="camel_vision", needs_model=True
    )
    spec.build()
    assert "model" in captured
    assert isinstance(captured["model"], fake_camel)


def test_model_agnostic_spec_injects_no_backend(monkeypatch):
    captured = {}

    class FakeToolkit:
        def __init__(self, **kwargs):
            captured.update(kwargs)

        def get_tools(self):
            return []

    fake_toolkits = types.ModuleType("camel.toolkits")
    fake_toolkits.MathToolkit = FakeToolkit
    monkeypatch.setitem(sys.modules, "camel.toolkits", fake_toolkits)

    ToolkitSpec(cls="MathToolkit", toolset="camel_math").build()
    assert "model" not in captured


def test_catalog_multimodal_specs_present():
    from plugins.camel_tools.catalog import TOOLKIT_SPECS

    model_specs = {s.cls for s in TOOLKIT_SPECS if s.needs_model}
    assert {
        "ImageAnalysisToolkit",
        "VideoAnalysisToolkit",
        "AudioAnalysisToolkit",
        "BrowserToolkit",
    } <= model_specs
