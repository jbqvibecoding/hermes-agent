"""TOML team-template tests (vendored ClawTeam archetypes)."""
from __future__ import annotations

from plugins.agent_cluster.cluster import templates


def test_render_preserves_unknown_placeholders():
    out = templates.render_text("goal={goal} keep={unknown}", {"goal": "X"})
    assert out == "goal=X keep={unknown}"


def test_list_and_load_builtins():
    names = {t["name"] for t in templates.list_templates()}
    assert {"software-dev", "code-review", "hedge-fund"} <= names
    template = templates.load_template("software-dev")
    assert template["name"] == "software-dev"
    assert template["leader"]["name"] == "tech-lead"
    assert templates.load_template("no-such-template") is None
    assert templates.load_template("../evil") is None


def test_user_dir_overrides_builtin(tmp_path):
    (tmp_path / "software-dev.toml").write_text(
        '[template]\nname = "software-dev"\n\n'
        '[template.leader]\nname = "custom-lead"\ntype = "lead"\ntask = "lead {goal}"\n',
        encoding="utf-8",
    )
    template = templates.load_template("software-dev", user_dir=tmp_path)
    assert template["leader"]["name"] == "custom-lead"


def test_to_plan_maps_roles_and_gates_leader(built_roster):
    template = {
        "name": "mini",
        "leader": {"name": "tech-lead", "type": "tech-lead", "task": "coordinate {goal}"},
        "agents": [
            {"name": "backend-architect", "type": "backend", "task": "build {goal} as {agent_name}"},
        ],
        "tasks": [
            {"subject": "Synthesize for {team_name}", "owner": "tech-lead"},
            {"subject": "Backend work", "owner": "backend-architect"},
        ],
    }
    plan = templates.to_plan(template, goal="ship v1", team_name="mini-1", agents=built_roster)
    assert plan["success"] is True
    roles = {r["role"]: r for r in plan["roles"]}
    assert roles["tech-lead"]["roster_slug"] == "tech-lead"
    assert roles["backend-architect"]["roster_slug"] == "backend-architect"
    tasks = plan["tasks"]
    assert tasks[0]["subject"] == "Synthesize for mini-1"
    # Leader task is gated on all worker tasks.
    assert tasks[0]["blocked_by"] == [1]
    assert "blocked_by" not in tasks[1]
    # Role instructions travel in the task description with goal substituted.
    assert "build ship v1 as backend-architect" in tasks[1]["description"]


def test_to_plan_reports_unmapped_roles(built_roster):
    template = {
        "name": "bad",
        "agents": [{"name": "zzzqqq", "type": "xxyyzz", "task": ""}],
        "tasks": [],
    }
    plan = templates.to_plan(template, goal="g", team_name="t", agents=built_roster)
    assert plan["success"] is False
    assert "zzzqqq" in plan["error"]


def test_to_plan_rejects_unknown_task_owner(built_roster):
    template = {
        "name": "bad-owner",
        "leader": {"name": "tech-lead", "type": "lead", "task": ""},
        "tasks": [{"subject": "x", "owner": "nobody"}],
    }
    plan = templates.to_plan(template, goal="g", team_name="t", agents=built_roster)
    assert plan["success"] is False
    assert "nobody" in plan["error"]


def test_builtin_software_dev_expands_against_committed_roster():
    template = templates.load_template("software-dev")
    plan = templates.to_plan(template, goal="build a todo app", team_name="sd-1")
    assert plan["success"] is True, plan.get("error")
    assert plan["tasks"], "software-dev template should seed tasks"
    leader_tasks = [t for t in plan["tasks"] if t.get("blocked_by")]
    assert leader_tasks, "leader synthesis task should be dependency-gated"
