from __future__ import annotations

import pytest

from hermes_cli import spec_registry as reg
from hermes_cli.subagent_spec import FourPartContract, SubagentSpec
from tools import worker_adapter as wa


@pytest.fixture
def conn(tmp_path):
    c = reg.connect(db_path=tmp_path / "kanban.db")
    yield c
    c.close()


def _spec(**over) -> SubagentSpec:
    base = dict(
        id="spec-finance-analyst-v1",
        name="Analyst",
        domain="finance",
        system_prompt="You are an analyst.",
        tools=["read", "web"],
        max_turns=30,
        timeout_seconds=120,
        role="leaf",
    )
    base.update(over)
    return SubagentSpec(**base)


def _task(**over) -> wa.WorkerTask:
    base = dict(id="t1", title="Build a forecast", body="context here", tenant=None)
    base.update(over)
    return wa.WorkerTask(**base)


# ---- model resolution -----------------------------------------------------

def test_resolve_model_explicit_wins():
    assert wa.resolve_model(_spec(model="x-model"), {"default": "y"}) == "x-model"


def test_resolve_model_profile_lookup():
    spec = _spec(model=None, model_profile="cheap")
    assert wa.resolve_model(spec, {"cheap": "c", "default": "d"}) == "c"


def test_resolve_model_none_when_unmapped():
    assert wa.resolve_model(_spec(model=None), None) is None


# ---- in-process adapter ---------------------------------------------------

def test_in_process_adapter_maps_spec_to_request():
    captured = {}

    def runner(req: wa.InProcessRequest) -> wa.RuntimeOutcome:
        captured["req"] = req
        return wa.RuntimeOutcome(ok=True, text="done", cost_cents=12, latency_ms=900)

    adapter = wa.InProcessAdapter(runner, profiles={"default": "m"})
    contract = FourPartContract(objective="Model it")
    result = adapter.run(_spec(), _task(), contract)

    req = captured["req"]
    assert "Build a forecast" in req.goal and "Model it" in req.goal
    assert req.toolsets == ["read", "web"]
    assert req.model == "m"
    assert req.max_iterations == 30
    assert req.ephemeral_system_prompt == "You are an analyst."
    assert result.outcome == wa.OUTCOME_PASS
    assert result.cost_cents == 12
    assert result.metadata["runtime"] == "in_process"


def test_in_process_failure_classes():
    def timeout_runner(req):
        return wa.RuntimeOutcome(ok=False, error_kind="timeout", error_note="too slow")

    res = wa.InProcessAdapter(timeout_runner).run(_spec(), _task(), None)
    assert res.outcome == wa.OUTCOME_TIMEOUT
    assert res.failure_class == "timeout"

    def err_runner(req):
        return wa.RuntimeOutcome(ok=False, error_kind="error", error_note="boom")

    res2 = wa.InProcessAdapter(err_runner).run(_spec(), _task(), None)
    assert res2.outcome == wa.OUTCOME_FAIL


# ---- openclaw adapter -----------------------------------------------------

def test_openclaw_adapter_shapes_session():
    captured = {}

    def runner(req: wa.OpenClawRequest) -> wa.RuntimeOutcome:
        captured["req"] = req
        return wa.RuntimeOutcome(ok=True, text="worker done", latency_ms=5000)

    adapter = wa.OpenClawWorkerAdapter(runner, profiles={"default": "m"})
    spec = _spec(auth_profile="finance-apis")
    result = adapter.run(spec, _task(id="t9"), FourPartContract(objective="Go"))

    req = captured["req"]
    assert req.session_key == "hermes-t9"
    assert req.tools_allow == ["read", "web"]
    # the default deny-list floor flows through to inheritedToolDeny
    assert "delegate_task" in req.tools_deny
    assert req.subagent_role == "leaf"
    assert req.auth_profile == "finance-apis"
    assert req.timeout_ms == 120_000
    assert req.idempotency_key == "t9"
    assert result.outcome == wa.OUTCOME_PASS
    assert result.metadata["runtime"] == "openclaw_worker"


def test_openclaw_crash_maps_to_crashed():
    def runner(req):
        return wa.RuntimeOutcome(ok=False, error_kind="crashed", error_note="gateway gone")

    res = wa.OpenClawWorkerAdapter(runner).run(_spec(), _task(), None)
    assert res.outcome == wa.OUTCOME_CRASHED


# ---- run_and_record (Memory Graph) ----------------------------------------

def test_run_and_record_persists_outcome(conn):
    reg.upsert_spec(conn, _spec())

    def runner(req):
        return wa.RuntimeOutcome(ok=True, text="ok", cost_cents=20, latency_ms=1500)

    adapter = wa.InProcessAdapter(runner)
    res = wa.run_and_record(conn, adapter, _spec(), _task())
    assert res.outcome == wa.OUTCOME_PASS

    stats = reg.get_stats(conn, "spec-finance-analyst-v1", None)
    assert stats.sample_size == 1
    assert stats.win_rate == 1.0
    assert stats.avg_cost_cents == 20.0


def test_run_and_record_fills_latency_when_missing(conn):
    reg.upsert_spec(conn, _spec())

    def runner(req):
        return wa.RuntimeOutcome(ok=True, text="ok")  # no latency reported

    res = wa.run_and_record(conn, wa.InProcessAdapter(runner), _spec(), _task())
    assert res.latency_ms is not None and res.latency_ms >= 0


def test_run_and_record_failure_writes_failure_memory(conn):
    reg.upsert_spec(conn, _spec())

    def runner(req):
        return wa.RuntimeOutcome(ok=False, error_kind="error", error_note="bad tool")

    wa.run_and_record(
        conn, wa.InProcessAdapter(runner), _spec(),
        _task(id="t2", tenant="ws-1"),
    )
    fails = reg.recent_failures(conn, "spec-finance-analyst-v1", tenant="ws-1")
    assert len(fails) == 1
    assert fails[0]["failure_note"] == "bad tool"


def test_run_and_record_can_skip_persist(conn):
    reg.upsert_spec(conn, _spec())
    wa.run_and_record(
        conn, wa.InProcessAdapter(lambda r: wa.RuntimeOutcome(ok=True)),
        _spec(), _task(), persist=False,
    )
    assert reg.get_stats(conn, "spec-finance-analyst-v1", None).sample_size == 0
