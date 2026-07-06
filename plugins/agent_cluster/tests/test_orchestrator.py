"""Pipeline handover + verifier tests using a fake dispatch."""
from __future__ import annotations

import json

from plugins.agent_cluster.cluster import orchestrator
from plugins.agent_cluster.cluster.evolution import ClusterEvolution
from plugins.agent_cluster.cluster.skill_store import SkillStore


def _fake_dispatch(results):
    calls = []
    queue = list(results)

    def dispatch(tool_name, args):
        calls.append((tool_name, args))
        return queue.pop(0) if queue else json.dumps(
            {"results": [{"status": "success", "result": "ok"}]}
        )

    dispatch.calls = calls
    return dispatch


def test_pipeline_carries_handover_between_stages(built_roster, tmp_path):
    evo = ClusterEvolution(tmp_path, skill_store=SkillStore(tmp_path, workflows_dir=tmp_path / "w"))
    dispatch = _fake_dispatch([
        json.dumps({"results": [{"status": "success", "result": "DESIGN: schema v1"}]}),
        json.dumps({"results": [{"status": "success", "result": "CODE: implemented"}]}),
    ])
    report = orchestrator.run_pipeline(
        dispatch,
        stages=[
            {"agent": "backend-architect", "goal": "design the schema"},
            {"agent": "coder", "goal": "implement the schema"},
        ],
        context="project X",
        evolution=evo,
        agents=built_roster,
    )
    assert report["success"] is True
    assert [s["agent"] for s in report["stages"]] == ["backend-architect", "coder"]
    # Stage 2's delegated context must contain stage 1's handover note.
    stage2_context = dispatch.calls[1][1]["context"]
    assert "Handover from Backend Architect" in stage2_context
    assert "DESIGN: schema v1" in stage2_context
    # Both executions recorded.
    assert len(evo.recent_reflections(limit=10)) == 2


def test_pipeline_stops_on_failure(built_roster, tmp_path):
    dispatch = _fake_dispatch([
        json.dumps({"results": [{"status": "failed", "error": "boom"}]}),
    ])
    report = orchestrator.run_pipeline(
        dispatch,
        stages=[
            {"agent": "backend-architect", "goal": "design"},
            {"agent": "coder", "goal": "implement"},
        ],
        agents=built_roster,
    )
    assert report["success"] is False
    assert len(dispatch.calls) == 1  # second stage never ran


def test_pipeline_unknown_agent(built_roster):
    dispatch = _fake_dispatch([])
    report = orchestrator.run_pipeline(
        dispatch, stages=[{"agent": "ghost", "goal": "x"}], agents=built_roster
    )
    assert report["success"] is False
    assert "not found" in report["error"]


def test_verifier_prompt_locks_criteria_and_gate():
    prompt = orchestrator.build_verifier_prompt(
        "Ship feature Y",
        ["tests pass", "docs updated"],
        gate="G2",
        evidence="see run.log",
    )
    assert "1. tests pass" in prompt
    assert "2. docs updated" in prompt
    assert "SQL 注入防護" in prompt  # G2 checklist folded in
    assert "Quality gate: G2" in prompt
    assert "see run.log" in prompt
    assert "VERDICT" in prompt


def test_run_verifier_parses_verdict():
    passing = _fake_dispatch([
        json.dumps({"results": [{"status": "success", "result": "1. PASS — ok\nVERDICT: PASS"}]}),
    ])
    result = orchestrator.run_verifier(passing, "goal", ["c1"])
    assert result["verdict"] == "pass"
    # Verifier children must be leaf (cannot re-delegate).
    assert passing.calls[0][1]["role"] == "leaf"

    failing = _fake_dispatch([
        json.dumps({"results": [{"status": "success", "result": "1. FAIL — missing\nVERDICT: FAIL — gaps"}]}),
    ])
    assert orchestrator.run_verifier(failing, "goal", ["c1"])["verdict"] == "fail"


def test_gate_criteria_known_and_unknown():
    assert orchestrator.gate_criteria("g3")
    assert orchestrator.gate_criteria("G9") == []
