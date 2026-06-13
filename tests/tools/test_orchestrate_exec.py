from __future__ import annotations

import json

from hermes_cli.subagent_spec import SubagentSpec
from tools import orchestrate_exec as ex
from tools.worker_adapter import (
    InProcessAdapter,
    InProcessRequest,
    OpenClawWorkerAdapter,
    RuntimeOutcome,
)


# ---- parse_delegate_result ------------------------------------------------

def test_parse_ok_result():
    raw = json.dumps({"results": [{"status": "ok", "summary": "done"}]})
    out = ex.parse_delegate_result(raw)
    assert out.ok is True
    assert out.text == "done"


def test_parse_error_result():
    raw = json.dumps({"results": [{"status": "error", "error": "boom"}]})
    out = ex.parse_delegate_result(raw)
    assert out.ok is False
    assert out.error_kind == "crashed"
    assert out.error_note == "boom"


def test_parse_timeout_result():
    raw = json.dumps({"results": [{"status": "timeout"}]})
    out = ex.parse_delegate_result(raw)
    assert out.ok is False
    assert out.error_kind == "timeout"


def test_parse_empty_results_fails_closed():
    out = ex.parse_delegate_result(json.dumps({"results": []}))
    assert out.ok is False


def test_parse_unparseable_fails_closed():
    out = ex.parse_delegate_result("not json")
    assert out.ok is False
    assert out.error_kind == "error"


def test_parse_falls_back_to_output_field():
    raw = json.dumps({"results": [{"status": "ok", "output": "from-output"}]})
    assert ex.parse_delegate_result(raw).text == "from-output"


# ---- make_delegate_runner -------------------------------------------------

def test_delegate_runner_invokes_fn_with_parent():
    captured = {}

    def fake_delegate(**kwargs):
        captured.update(kwargs)
        return json.dumps({"results": [{"status": "ok", "summary": "hi"}]})

    runner = ex.make_delegate_runner("PARENT", delegate_fn=fake_delegate)
    req = InProcessRequest(
        goal="g", context="c", toolsets=["web"], model="m", role="leaf",
        max_iterations=5, ephemeral_system_prompt="sp",
    )
    out = runner(req)
    assert out.ok is True and out.text == "hi"
    assert captured["parent_agent"] == "PARENT"
    assert captured["goal"] == "g"
    assert captured["role"] == "leaf"


# ---- make_adapter_resolver ------------------------------------------------

def _spec(runtime_hint="either", **over):
    base = dict(id="spec-eng-x-v1", name="X", domain="eng", runtime_hint=runtime_hint)
    base.update(over)
    return SubagentSpec(**base)


def _stub_delegate(**kwargs):
    return json.dumps({"results": [{"status": "ok", "summary": "ok"}]})


def test_resolver_defaults_to_inprocess():
    resolve = ex.make_adapter_resolver("P", delegate_fn=_stub_delegate)
    adapter = resolve(_spec(runtime_hint="in_process"))
    assert isinstance(adapter, InProcessAdapter)


def test_resolver_uses_openclaw_when_available():
    def openclaw_runner(req):
        return RuntimeOutcome(ok=True, text="ran")

    resolve = ex.make_adapter_resolver(
        "P", delegate_fn=_stub_delegate, openclaw_runner=openclaw_runner,
        gateway_available=True,
    )
    adapter = resolve(_spec(runtime_hint="openclaw_worker"))
    assert isinstance(adapter, OpenClawWorkerAdapter)


def test_resolver_degrades_to_inprocess_without_runner():
    # openclaw-hinted spec but no runner/gateway → in-process fallback
    resolve = ex.make_adapter_resolver("P", delegate_fn=_stub_delegate)
    adapter = resolve(_spec(runtime_hint="openclaw_worker"))
    assert isinstance(adapter, InProcessAdapter)
