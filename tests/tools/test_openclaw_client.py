from __future__ import annotations

from tools import openclaw_client as oc
from tools import worker_adapter as wa


def _req(**over) -> wa.OpenClawRequest:
    base = dict(
        session_key="hermes-t1",
        model="m",
        message="## Task\nDo it",
        tools_allow=["read", "web"],
        tools_deny=["delegate_task", "execute_code"],
        subagent_role="leaf",
        auth_profile="finance",
        timeout_ms=120000,
        idempotency_key="t1",
        workspace=".",
    )
    base.update(over)
    return wa.OpenClawRequest(**base)


# ---- frame builders -------------------------------------------------------

def test_sessions_create_params():
    p = oc.sessions_create_params(_req(), parent_session_key="lead")
    assert p == {"key": "hermes-t1", "message": "## Task\nDo it", "model": "m", "parentSessionKey": "lead"}


def test_sessions_create_omits_model_when_none():
    p = oc.sessions_create_params(_req(model=None))
    assert "model" not in p and "parentSessionKey" not in p


def test_sessions_patch_shapes_tools_and_role():
    p = oc.sessions_patch_params(_req())
    assert p["inheritedToolAllow"] == ["read", "web"]
    assert p["inheritedToolDeny"] == ["delegate_task", "execute_code"]
    assert p["subagentRole"] == "leaf"
    assert p["model"] == "m"


def test_sessions_patch_omits_empty_tool_arrays():
    p = oc.sessions_patch_params(_req(tools_allow=[], tools_deny=[]))
    assert "inheritedToolAllow" not in p and "inheritedToolDeny" not in p


def test_chat_send_params():
    p = oc.chat_send_params(_req())
    assert p == {
        "sessionKey": "hermes-t1",
        "message": "## Task\nDo it",
        "idempotencyKey": "t1",
        "timeoutMs": 120000,
    }


# ---- terminal parsing -----------------------------------------------------

def test_is_final():
    assert oc.is_final({"state": "final"})
    assert oc.is_final({"state": "error"})
    assert oc.is_final({"status": "ok"})
    assert not oc.is_final({"state": "running"})
    assert not oc.is_final({"seq": 3})


def test_parse_final_chatfinalevent():
    out = oc.parse_final({"state": "final", "message": "all done", "usage": {"tokens": 100}})
    assert out.ok and out.text == "all done"


def test_parse_final_gateway_response_payloads():
    out = oc.parse_final({"status": "completed", "result": {"payloads": [{"text": "part1"}, {"text": "part2"}]}})
    assert out.ok and out.text == "part1\npart2"


def test_parse_final_error_state():
    out = oc.parse_final({"state": "error", "message": "boom"})
    assert not out.ok and out.error_kind == "error" and "boom" in out.error_note


def test_parse_final_aborted():
    out = oc.parse_final({"state": "aborted"})
    assert not out.ok and out.error_kind == "crashed"


def test_parse_final_nonsuccess_status():
    out = oc.parse_final({"status": "timeout"})
    assert not out.ok and out.error_kind == "timeout"


# ---- client orchestration (stub transport) --------------------------------

class _StubTransport:
    def __init__(self, final, *, fail_on=None):
        self.calls = []
        self._final = final
        self._fail_on = fail_on

    def _record(self, name, params):
        self.calls.append((name, params))
        if self._fail_on == name:
            raise oc.OpenClawTransportError(f"{name} failed")

    def sessions_create(self, params):
        self._record("create", params)
        return {"ok": True}

    def sessions_patch(self, params):
        self._record("patch", params)
        return {"ok": True}

    def chat_send(self, params):
        self._record("chat", params)
        return self._final

    def sessions_abort(self, params):
        self._record("abort", params)
        return {"ok": True}


def test_client_run_happy_path():
    t = _StubTransport({"state": "final", "message": "worker done"})
    client = oc.OpenClawWorkerClient(t, parent_session_key="lead")
    out = client.run(_req())
    assert out.ok and out.text == "worker done"
    # full create → patch → chat sequence executed, in order.
    assert [c[0] for c in t.calls] == ["create", "patch", "chat"]
    assert t.calls[0][1]["parentSessionKey"] == "lead"
    assert t.calls[1][1]["inheritedToolAllow"] == ["read", "web"]


def test_client_run_transport_failure_is_crashed():
    t = _StubTransport({"state": "final"}, fail_on="chat")
    out = oc.OpenClawWorkerClient(t).run(_req())
    assert not out.ok and out.error_kind == "crashed"


def test_client_plugs_into_adapter():
    # The whole point: client.run satisfies OpenClawRunner.
    t = _StubTransport({"state": "final", "message": "ok"})
    client = oc.OpenClawWorkerClient(t)
    adapter = wa.OpenClawWorkerAdapter(client.run)
    from hermes_cli.subagent_spec import SubagentSpec

    spec = SubagentSpec(id="spec-finance-a-v1", name="A", domain="finance", tools=["read"])
    result = adapter.run(spec, wa.WorkerTask(id="t1", title="Go"), None)
    assert result.outcome == wa.OUTCOME_PASS
    assert result.metadata["runtime"] == "openclaw_worker"
