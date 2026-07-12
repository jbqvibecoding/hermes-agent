"""Swarm engine tests on the in-memory fake ClawTeam board."""
from __future__ import annotations

import json

from plugins.agent_cluster.cluster import swarm
from plugins.agent_cluster.cluster.clawteam_bridge import ClawTeamBridge
from plugins.agent_cluster.cluster.evolution import ClusterEvolution
from plugins.agent_cluster.cluster.skill_store import SkillStore
from .conftest import FakeCtx


def _bridge(ctx: FakeCtx) -> ClawTeamBridge:
    return ClawTeamBridge(ctx.dispatch_tool)


def test_plan_tasks_builds_dag(built_roster):
    ctx = FakeCtx()
    result = swarm.plan_tasks(
        _bridge(ctx),
        "team-a",
        [
            {"subject": "design", "agent": "backend-architect"},
            {"subject": "build", "agent": "coder", "blocked_by": [0]},
            {"subject": "test", "agent": "tech-lead", "blocked_by": [1]},
        ],
        agents=built_roster,
    )
    assert result["success"] is True
    tasks = result["tasks"]
    assert tasks[0]["status"] == "pending"
    assert tasks[1]["status"] == "blocked"
    assert tasks[1]["blocked_by"] == [tasks[0]["id"]]
    assert tasks[2]["blocked_by"] == [tasks[1]["id"]]


def test_plan_tasks_validates_before_creating(built_roster):
    ctx = FakeCtx()
    result = swarm.plan_tasks(
        _bridge(ctx), "team-a",
        [{"subject": "x", "agent": "ghost-agent"}], agents=built_roster,
    )
    assert result["success"] is False and "not found" in result["error"]
    assert ctx.board.tasks == {}  # nothing half-created

    result = swarm.plan_tasks(
        _bridge(ctx), "team-a",
        [{"subject": "x", "agent": "coder", "blocked_by": [5]}], agents=built_roster,
    )
    assert result["success"] is False and "invalid blocked_by" in result["error"]


def test_swarm_runs_diamond_dag_in_dependency_order(built_roster, tmp_path):
    ctx = FakeCtx()
    bridge = _bridge(ctx)
    evo = ClusterEvolution(tmp_path, skill_store=SkillStore(tmp_path, workflows_dir=tmp_path / "w"))
    plan = swarm.plan_tasks(
        bridge, "diamond",
        [
            {"subject": "design api", "agent": "backend-architect"},
            {"subject": "build backend", "agent": "coder", "blocked_by": [0]},
            {"subject": "build frontend", "agent": "tech-lead", "blocked_by": [0]},
            {"subject": "integration test", "agent": "openopc--backend-architect", "blocked_by": [1, 2]},
        ],
        agents=built_roster,
    )
    assert plan["success"] is True, plan.get("error")
    report = swarm.run_swarm(
        bridge, ctx.dispatch_tool, "diamond",
        parallel=3, evolution=evo, agents=built_roster,
    )
    assert report["success"] is True
    # Round 1: only the root; round 2: the two unblocked siblings in one
    # parallel batch; round 3: the join task.
    waves = [[t["id"] for t in r["tasks"]] for r in report["rounds"] if r["tasks"]]
    assert len(waves) == 3
    assert len(waves[1]) == 2
    board = report["board"]
    assert board["stats"]["by_status"] == {"completed": 4}
    # Every execution was recorded as a knowledge asset.
    assert len(evo.recent_reflections(limit=10)) == 4


def test_swarm_retry_then_fail_blocks_dependents(built_roster, tmp_path):
    ctx = FakeCtx(dispatch_results=[
        json.dumps({"results": [{"status": "failed", "error": "boom 1"}]}),
        json.dumps({"results": [{"status": "failed", "error": "boom 2"}]}),
    ])
    bridge = _bridge(ctx)
    swarm.plan_tasks(
        bridge, "flaky",
        [
            {"subject": "implement api", "agent": "coder"},
            {"subject": "test api", "agent": "tech-lead", "blocked_by": [0]},
        ],
        agents=built_roster,
    )
    report = swarm.run_swarm(
        bridge, ctx.dispatch_tool, "flaky",
        parallel=1, max_retries=1, agents=built_roster,
    )
    assert report["success"] is False
    columns = report["board"]["columns"]
    failed = [t for t in columns.get("blocked", []) if t["outcome"] == "failed"]
    assert len(failed) == 1  # root failed permanently after 1 retry
    # Dependent never ran and stays blocked.
    assert any(not t["outcome"] for t in columns.get("blocked", []))
    outcomes = [t["outcome"] for r in report["rounds"] for t in r["tasks"]]
    assert outcomes == ["retry", "failed"]


def test_swarm_unknown_owner_marked_failed(built_roster):
    ctx = FakeCtx()
    bridge = _bridge(ctx)
    bridge.team_create("bad")
    ctx.board.task_create("bad", subject="orphan", owner="who-is-this")
    report = swarm.run_swarm(bridge, ctx.dispatch_tool, "bad", agents=built_roster)
    blocked = report["board"]["columns"].get("blocked", [])
    assert blocked and blocked[0]["outcome"] == "failed"
    assert report["success"] is False


def test_swarm_final_verifier(built_roster):
    ctx = FakeCtx(dispatch_results=[
        json.dumps({"results": [{"status": "success", "result": "done"}]}),
        json.dumps({"results": [{"status": "success", "result": "1. PASS\nVERDICT: PASS"}]}),
    ])
    bridge = _bridge(ctx)
    swarm.plan_tasks(bridge, "v", [{"subject": "ship it", "agent": "coder"}], agents=built_roster)
    report = swarm.run_swarm(
        bridge, ctx.dispatch_tool, "v",
        agents=built_roster, verify_goal="shipped", verify_criteria=["works"], gate="G3",
    )
    assert report["success"] is True
    assert report["verification"]["verdict"] == "pass"


def test_swarm_workspace_injects_branch_and_merges(built_roster, monkeypatch):
    ctx = FakeCtx()
    bridge = _bridge(ctx)
    created, merged, cleaned = [], [], []
    monkeypatch.setattr(bridge, "workspace_create", lambda team, agent, repo: (
        created.append(agent) or {"ok": True, "branch": f"clawteam/{team}/{agent}"}
    ))
    monkeypatch.setattr(bridge, "workspace_merge", lambda team, agent, repo: (
        merged.append(agent) or {"ok": True, "output": "merged"}
    ))
    monkeypatch.setattr(bridge, "workspace_cleanup", lambda team, agent, repo: (
        cleaned.append(agent) or {"ok": True}
    ))
    swarm.plan_tasks(bridge, "ws", [{"subject": "edit code", "agent": "coder"}], agents=built_roster)
    report = swarm.run_swarm(
        bridge, ctx.dispatch_tool, "ws",
        agents=built_roster, workspace_repo="/some/repo",
    )
    assert report["success"] is True
    assert created == merged == cleaned == ["coder"]
    delegate_calls = [args for name, args in ctx.dispatched if name == "delegate_task"]
    assert "clawteam/ws/coder" in delegate_calls[0]["tasks"][0]["context"]
    assert any(w["action"] == "merge" for w in report["workspaces"])
