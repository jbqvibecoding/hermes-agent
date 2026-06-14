from __future__ import annotations

import json

import pytest

from hermes_cli import spec_registry as reg
from hermes_cli.subagent_spec import SubagentSpec
from tools import merlion_events, merlion_plan, orchestrate, tournament
from tools import orchestrate_store as store
from tools.worker_adapter import OUTCOME_PASS, WorkerResult


@pytest.fixture
def conn(tmp_path):
    c = orchestrate.open_conn(tmp_path / "kanban.db")
    yield c
    c.close()


def _seed(conn, dept):
    spec = SubagentSpec(
        id=reg.make_spec_id(dept, "lead", 1), name=f"{dept} lead", domain=dept,
        status="active", provenance="preset", trust_preset="trusted",
    )
    reg.upsert_spec(conn, spec)
    return spec


_ALPHA = json.dumps(
    {
        "tier": "complex", "scale": "org", "departments": ["eng", "finance"],
        "subtasks": [
            {"id": "st0", "dept": "eng", "goal": "build api", "deps": [], "rationale": "core"},
            {"id": "st1", "dept": "finance", "goal": "model costs", "deps": ["st0"], "rationale": "after api"},
        ],
        "rationale": "eng then finance",
    }
)
_BETA = json.dumps(
    {
        "tier": "very_complex", "scale": "org", "departments": ["research", "product", "eng"],
        "subtasks": [
            {"id": "st0", "dept": "research", "goal": "market scan", "deps": []},
            {"id": "st1", "dept": "product", "goal": "spec", "deps": ["st0"]},
            {"id": "st2", "dept": "eng", "goal": "build", "deps": ["st0", "st1"]},
        ],
    }
)


def _fake_llm(table):
    def _llm(model, prompt):
        v = table[model]  # KeyError → caught upstream as a failed candidate
        if isinstance(v, Exception):
            raise v
        return v

    return _llm


def _step(sid, dept, match, *, needs_gen=False, needs_appr=False, est=2):
    return orchestrate.PlanStep(
        subtask=merlion_plan.build_subtask(sid, sid, spec_id="x", dept=dept, est=est),
        capability_match=match, needs_generation=needs_gen, needs_approval=needs_appr,
    )


# ---- candidate generation -------------------------------------------------

def test_generate_candidate_authors_distinct_plans(conn):
    for d in ("eng", "finance", "research", "product"):
        _seed(conn, d)
    llm = _fake_llm({"alpha": _ALPHA, "beta": _BETA})
    a = tournament.generate_candidate(conn, "ship", "alpha", llm=llm)
    b = tournament.generate_candidate(conn, "ship", "beta", llm=llm)
    assert a.ok and b.ok
    a_depts = {s.subtask.dept for s in a.plan.steps if not s.subtask.is_synthesis}
    b_depts = {s.subtask.dept for s in b.plan.steps if not s.subtask.is_synthesis}
    assert a_depts == {"eng", "finance"}
    assert b_depts == {"research", "product", "eng"}
    assert a_depts != b_depts
    # canonical synthesis fan-in appended over all authored steps
    syn = a.plan.steps[-1].subtask
    assert syn.is_synthesis and syn.deps == ["st0", "st1"]


def test_malformed_response_is_failed_candidate(conn):
    c = tournament.generate_candidate(conn, "ship", "bad", llm=_fake_llm({"bad": "totally not json"}))
    assert c.ok is False
    assert c.error
    assert c.plan is None


def test_deps_to_unknown_ids_are_dropped(conn):
    _seed(conn, "eng")
    bad_deps = json.dumps(
        {
            "tier": "complex", "scale": "org",
            "subtasks": [{"id": "st0", "dept": "eng", "goal": "x", "deps": ["ghost", "st0"]}],
        }
    )
    c = tournament.generate_candidate(conn, "ship", "m", llm=_fake_llm({"m": bad_deps}))
    assert c.ok
    # dangling + self deps dropped; only the synthesis step references st0
    assert c.plan.steps[0].subtask.deps == []


# ---- scoring --------------------------------------------------------------

def test_score_plan_dimensions():
    good = orchestrate.OrchestrationPlan(
        "r", "b", "complex", "org", ["eng", "finance"],
        [_step("st0", "eng", 1.0), _step("st1", "finance", 1.0)],
    )
    s = tournament.score_plan(good)
    assert s.feasibility == 1.0
    assert s.risk == 0.0
    assert s.impact == pytest.approx(2 / 6)

    bad = orchestrate.OrchestrationPlan(
        "r", "b", "complex", "org", ["eng"], [_step("st0", "eng", 0.0, needs_gen=True)]
    )
    s2 = tournament.score_plan(bad)
    assert s2.feasibility == 0.0
    assert s2.risk == 1.0

    empty = orchestrate.OrchestrationPlan("r", "b", "complex", "org", [], [])
    s3 = tournament.score_plan(empty)
    assert s3.feasibility == 0.0 and s3.impact == 0.0


# ---- the tournament -------------------------------------------------------

def test_run_tournament_ranks_keeps_baseline_and_does_not_execute(conn):
    for d in ("eng", "finance", "research", "product"):
        _seed(conn, d)
    llm = _fake_llm({"alpha": _ALPHA, "beta": _BETA, "bad": "nope"})
    res = tournament.run_tournament(conn, "ship it", ["alpha", "beta", "bad"], llm=llm)

    models = [c.model for c in res.candidates]
    assert tournament.BASELINE_MODEL in models  # floor always entered

    bad = next(c for c in res.candidates if c.model == "bad")
    assert bad.ok is False  # one bad model never sinks the tournament

    ok = [c for c in res.candidates if c.ok]
    assert res.recommended_model == ok[0].model
    overalls = [c.overall for c in ok]
    assert overalls == sorted(overalls, reverse=True)  # best-first
    assert all(c.ok for c in res.candidates[: len(ok)])  # failures appended after

    # tournament scores + recommends only — it must not start/persist any run.
    assert res.recommended_plan is not None
    assert store.get_run(conn, res.recommended_plan.run_id) is None


def test_run_tournament_baseline_only_offline(conn):
    # No models / no LLM → still a valid recommendation (the deterministic floor).
    res = tournament.run_tournament(conn, "summarize this doc", [])
    assert res.recommended_model == tournament.BASELINE_MODEL
    assert res.recommended_plan is not None


# ---- execution: auto-distributed models -----------------------------------

def test_assign_exec_models_round_robin(conn):
    for d in ("eng", "finance", "research"):
        _seed(conn, d)
    three = json.dumps(
        {
            "tier": "complex", "scale": "org",
            "subtasks": [
                {"id": "st0", "dept": "eng", "goal": "a", "deps": []},
                {"id": "st1", "dept": "finance", "goal": "b", "deps": []},
                {"id": "st2", "dept": "research", "goal": "c", "deps": []},
            ],
        }
    )
    cand = tournament.generate_candidate(conn, "x", "m", llm=_fake_llm({"m": three}))
    assert cand.ok
    mapping = tournament.assign_exec_models(cand.plan, ["A", "B"])
    assert len(mapping) == 3  # three distinct dept specs
    vals = list(mapping.values())
    assert vals.count("A") == 2 and vals.count("B") == 1  # round-robin A,B,A
    assert cand.plan.steps[-1].subtask.spec_id is None  # synthesis unassigned
    assert tournament.assign_exec_models(cand.plan, []) == {}


def test_selected_plan_executes_with_assigned_models(conn):
    for d in ("eng", "finance"):
        _seed(conn, d)
    cand = tournament.generate_candidate(conn, "ship", "m", llm=_fake_llm({"m": _ALPHA}))
    assert cand.ok
    plan = cand.plan
    spec_model = tournament.assign_exec_models(plan, ["modelX", "modelY"])

    seen: dict[str, str] = {}

    class _Rec:
        runtime = "in_process"

        def run(self, spec, task, contract):
            seen[spec.id] = spec.model  # capture the model the resolver assigned
            return WorkerResult(outcome=OUTCOME_PASS, summary="ok")

    resolver = tournament.make_model_assigning_resolver(lambda spec: _Rec(), spec_model)
    orchestrate.start_run(conn, plan)
    for _ in range(50):
        _ev, complete = orchestrate.advance_run(conn, plan.run_id, resolve_adapter=resolver)
        if complete:
            break

    snap = orchestrate.run_snapshot(conn, plan.run_id)
    assert snap["status"] == "done"
    assert len(seen) == 2  # eng + finance ran (synthesis is a no-spec fan-in)
    for spec_id, model in seen.items():
        assert spec_model[spec_id] == model  # each ran on its assigned LLM


def test_tournament_events_registered():
    for e in ("tournament.candidates", "tournament.recommended", "tournament.selected"):
        assert merlion_events.is_merlion_event(e)
