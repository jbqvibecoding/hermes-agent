from __future__ import annotations

import pytest

from hermes_cli import spec_registry as reg
from hermes_cli.subagent_spec import SubagentSpec
from tools import merlion_classify, orchestrate
from tools.worker_adapter import OUTCOME_PASS, WorkerResult


@pytest.fixture
def conn(tmp_path):
    c = orchestrate.open_conn(tmp_path / "kanban.db")
    yield c
    c.close()


def _seed_spec(conn, domain, slug="lead", **over):
    base = dict(
        id=reg.make_spec_id(domain, slug, 1),
        name=f"{domain} {slug}",
        domain=domain,
        status="active",
        provenance="preset",
        trust_preset="trusted",
    )
    base.update(over)
    spec = SubagentSpec(**base)
    reg.upsert_spec(conn, spec)
    return spec


class _StubAdapter:
    runtime = "in_process"

    def __init__(self, outcome=OUTCOME_PASS):
        self._outcome = outcome

    def run(self, spec, task, contract):
        if self._outcome == OUTCOME_PASS:
            return WorkerResult(outcome=OUTCOME_PASS, summary=f"done {spec.id}")
        return WorkerResult(outcome="fail", failure_note="stub failure")


def _org(depts):
    return merlion_classify.Classification(
        tier="very_complex", scale="org", suggested_departments=list(depts)
    )


# ---- classify + select ----------------------------------------------------

def test_classify_brief_marks_venture_very_complex(conn):
    cls = orchestrate.classify_brief("Build and launch a fintech banking app")
    assert cls.tier == "very_complex"
    assert cls.scale == "org"


def test_select_spec_finds_seeded(conn):
    seeded = _seed_spec(conn, "finance")
    spec, match = orchestrate.select_spec(conn, "finance", "financial model")
    assert spec is not None and spec.id == seeded.id
    assert 0.0 <= match <= 1.0


def test_select_spec_empty_domain(conn):
    spec, match = orchestrate.select_spec(conn, "nonexistent", "x")
    assert spec is None and match == 0.0


# ---- build_plan -----------------------------------------------------------

def test_build_plan_org_dag_with_synthesis(conn):
    _seed_spec(conn, "eng")
    plan = orchestrate.build_plan(conn, "ship it", _org(["eng", "finance"]))
    # 2 department steps + 1 synthesis
    assert len(plan.steps) == 3
    syn = plan.steps[-1]
    assert syn.subtask.is_synthesis
    assert syn.subtask.deps == ["st0", "st1"]
    # eng has a spec; finance has none → finance flagged needs_generation
    eng, fin = plan.steps[0], plan.steps[1]
    assert eng.subtask.spec_id is not None
    assert fin.subtask.spec_id is None
    assert "finance" in plan.needs_generation


def test_build_plan_simple_single_step(conn):
    cls = merlion_classify.Classification(tier="simple", scale="small")
    plan = orchestrate.build_plan(conn, "summarize this", cls)
    assert len(plan.steps) == 1
    assert not plan.steps[0].subtask.is_synthesis


def test_build_plan_caps_departments_by_scale(conn):
    cls = merlion_classify.Classification(
        tier="complex", scale="small",
        suggested_departments=["a", "b", "c", "d", "e"],
    )
    plan = orchestrate.build_plan(conn, "x", cls)
    # small caps at 3 departments (+ synthesis)
    assert len(plan.departments) == 3
    assert len(plan.steps) == 4


# ---- start_run + snapshot -------------------------------------------------

def test_start_run_materializes_kanban_dag(conn):
    _seed_spec(conn, "eng")
    _seed_spec(conn, "finance")
    plan = orchestrate.build_plan(conn, "ship", _org(["eng", "finance"]), run_id="run_x")
    run_id = orchestrate.start_run(conn, plan)
    assert run_id == "run_x"
    assert len(plan.task_map) == 3
    from hermes_cli import kanban_db as kb

    # department tasks ready (no parents); synthesis todo (parents not done)
    dept_tids = [plan.task_map["st0"], plan.task_map["st1"]]
    assert all(kb.get_task(conn, t).status == "ready" for t in dept_tids)
    assert kb.get_task(conn, plan.task_map["syn"]).status == "todo"


def test_run_snapshot_merges_status(conn):
    _seed_spec(conn, "eng")
    plan = orchestrate.build_plan(conn, "ship", _org(["eng"]), run_id="run_s")
    orchestrate.start_run(conn, plan)
    snap = orchestrate.run_snapshot(conn, "run_s")
    assert snap["runId"] == "run_s"
    assert snap["tier"] == "very_complex"
    ids = {st["id"] for st in snap["subtasks"]}
    assert {"st0", "syn"} <= ids
    assert all("status" in st for st in snap["subtasks"])


def test_run_snapshot_missing_run(conn):
    assert orchestrate.run_snapshot(conn, "nope") is None


# ---- advance_run ----------------------------------------------------------

def _drive(conn, run_id, resolver, max_ticks=50):
    all_events = []
    for _ in range(max_ticks):
        events, complete = orchestrate.advance_run(conn, run_id, resolve_adapter=resolver)
        all_events.extend(events)
        if complete:
            return all_events, True
    return all_events, False


def test_advance_run_completes_all_pass(conn):
    _seed_spec(conn, "eng")
    _seed_spec(conn, "finance")
    plan = orchestrate.build_plan(conn, "ship", _org(["eng", "finance"]), run_id="run_ok")
    orchestrate.start_run(conn, plan)
    events, complete = _drive(conn, "run_ok", lambda spec: _StubAdapter(OUTCOME_PASS))
    assert complete is True
    assert any(e["event"] == "run.done" and e["status"] == "done" for e in events)
    snap = orchestrate.run_snapshot(conn, "run_ok")
    assert snap["status"] == "done"
    assert all(st["status"] == "done" for st in snap["subtasks"])


def test_advance_run_blocks_on_worker_failure(conn):
    _seed_spec(conn, "eng")
    plan = orchestrate.build_plan(conn, "ship", _org(["eng"]), run_id="run_fail")
    orchestrate.start_run(conn, plan)
    events, complete = _drive(conn, "run_fail", lambda spec: _StubAdapter("fail"))
    assert complete is True
    assert any(e["event"] == "run.done" and e["status"] == "failed" for e in events)
    assert any(e["event"] == "task.failed" for e in events)


def test_advance_run_synthesis_fans_in(conn):
    _seed_spec(conn, "eng")
    plan = orchestrate.build_plan(conn, "ship", _org(["eng"]), run_id="run_syn")
    orchestrate.start_run(conn, plan)
    events, _ = _drive(conn, "run_syn", lambda spec: _StubAdapter(OUTCOME_PASS))
    # synthesis step completes (deterministic fan-in, no spec) → task.done for syn
    syn_done = [e for e in events if e["event"] == "task.done" and e["subtask_id"] == "syn"]
    assert syn_done


# ---- reverse control ------------------------------------------------------

from tools.multica_reconciler import ControlSignal  # noqa: E402


class _RecordingStub:
    runtime = "in_process"

    def __init__(self, spec, sink):
        self._spec = spec
        self._sink = sink

    def run(self, spec, task, contract):
        self._sink.append(spec.id)
        return WorkerResult(outcome=OUTCOME_PASS, summary=f"done {spec.id}")


def _drive_ctrl(conn, run_id, resolver, control, max_ticks=50):
    events = []
    for _ in range(max_ticks):
        evs, done = orchestrate.advance_run(
            conn, run_id, resolve_adapter=resolver, control=control
        )
        events.extend(evs)
        if done:
            return events, True
    return events, False


def test_build_plan_flags_approval_for_risk_depts(conn):
    _seed_spec(conn, "compliance")
    _seed_spec(conn, "eng")
    plan = orchestrate.build_plan(conn, "x", _org(["compliance", "eng"]))
    by = {s.subtask.dept: s for s in plan.steps}
    assert by["compliance"].needs_approval is True
    assert by["eng"].needs_approval is False


def test_control_cancel_run_blocks_everything(conn):
    _seed_spec(conn, "eng")
    _seed_spec(conn, "finance")
    plan = orchestrate.build_plan(conn, "x", _org(["eng", "finance"]), run_id="run_kill")
    orchestrate.start_run(conn, plan)
    events, complete = _drive_ctrl(
        conn, "run_kill", lambda s: _StubAdapter(), lambda: ControlSignal(cancel_run=True)
    )
    assert complete is True
    assert any(e["event"] == "run.cancelled" for e in events)
    assert orchestrate.run_snapshot(conn, "run_kill")["status"] == "cancelled"


def test_control_cancel_subtask_stops_only_that_branch(conn):
    _seed_spec(conn, "eng")
    _seed_spec(conn, "finance")
    plan = orchestrate.build_plan(conn, "x", _org(["eng", "finance"]), run_id="run_cx")
    orchestrate.start_run(conn, plan)
    events, complete = _drive_ctrl(
        conn, "run_cx", lambda s: _StubAdapter(),
        lambda: ControlSignal(cancel_subtasks={"st0"}),
    )
    assert complete is True
    assert any(e["event"] == "task.cancelled" and e["subtask_id"] == "st0" for e in events)
    snap = {s["id"]: s["status"] for s in orchestrate.run_snapshot(conn, "run_cx")["subtasks"]}
    assert snap["st0"] == "blocked"     # cancelled branch
    assert snap["st1"] == "done"         # the other department still ran


def test_control_approval_gate_blocks_until_approved(conn):
    _seed_spec(conn, "compliance")
    _seed_spec(conn, "eng")
    plan = orchestrate.build_plan(conn, "x", _org(["compliance", "eng"]), run_id="run_appr")
    orchestrate.start_run(conn, plan)
    # st0 = compliance (needs approval). Never approve → run cannot complete.
    _e, complete = _drive_ctrl(
        conn, "run_appr", lambda s: _StubAdapter(), lambda: ControlSignal(), max_ticks=8
    )
    assert complete is False
    snap = {s["id"]: s["status"] for s in orchestrate.run_snapshot(conn, "run_appr")["subtasks"]}
    assert snap["st0"] != "done"   # compliance parked awaiting approval
    assert snap["st1"] == "done"   # eng ran freely

    # Now approve st0 → it runs and the whole run completes.
    _e2, complete2 = _drive_ctrl(
        conn, "run_appr", lambda s: _StubAdapter(),
        lambda: ControlSignal(approve_subtasks={"st0"}),
    )
    assert complete2 is True
    snap2 = {s["id"]: s["status"] for s in orchestrate.run_snapshot(conn, "run_appr")["subtasks"]}
    assert snap2["st0"] == "done"


def test_control_reassign_routes_to_new_spec(conn):
    eng = _seed_spec(conn, "eng")
    finance = _seed_spec(conn, "finance")
    plan = orchestrate.build_plan(conn, "x", _org(["eng", "finance"]), run_id="run_re")
    orchestrate.start_run(conn, plan)
    ran_specs: list[str] = []
    # reassign st0 (eng) to the finance spec
    control = lambda: ControlSignal(reassign={"st0": finance.id})  # noqa: E731
    events, complete = _drive_ctrl(
        conn, "run_re", lambda s: _RecordingStub(s, ran_specs), control
    )
    assert complete is True
    assert any(e["event"] == "task.reassigned" and e["subtask_id"] == "st0" for e in events)
    # st0 was reassigned away from eng → the eng spec must never have run.
    assert eng.id not in ran_specs
    assert finance.id in ran_specs
