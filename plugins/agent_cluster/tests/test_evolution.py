"""Evolution (self-growth) tests: recording, promotion, delta context."""
from __future__ import annotations

import json

from plugins.agent_cluster.cluster.evolution import ClusterEvolution, extract_domains, normalize_outcome
from plugins.agent_cluster.cluster.skill_store import SkillStore


def _evolution(tmp_path, threshold=2):
    store = SkillStore(tmp_path, workflows_dir=tmp_path / "no-workflows")
    return ClusterEvolution(tmp_path, skill_store=store, promotion_threshold=threshold)


def test_outcome_normalization():
    assert normalize_outcome("Success") == "success"
    assert normalize_outcome("partial") == "partial_success"
    assert normalize_outcome("boom") == "failure"
    assert normalize_outcome("done") == "success"


def test_domain_extraction():
    assert "backend" in extract_domains("Design the REST API endpoints")
    assert "testing" in extract_domains("寫單元測試")
    assert extract_domains("something unrelated entirely") == ["general"]


def test_record_execution_updates_profile_and_log(tmp_path):
    evo = _evolution(tmp_path)
    info = evo.record_execution(
        "backend-architect", "Build the API schema", "success", "did it",
        strengths=["clear handoff"],
    )
    assert info["outcome"] == "success"
    assert info["pattern_key"] == "backend-architect::backend"
    profile = evo.load_profile()
    record = profile["agents"]["backend-architect"]
    assert record["successes"] == 1
    assert record["domains"]["backend"]["successes"] == 1
    lines = (tmp_path / "evolution" / "executions.jsonl").read_text().strip().splitlines()
    assert len(lines) == 1
    assert json.loads(lines[0])["slug"] == "backend-architect"


def test_playbook_promoted_at_threshold(tmp_path):
    evo = _evolution(tmp_path, threshold=2)
    first = evo.record_execution("coder", "implement api endpoint", "success", "done a")
    assert first["playbook"] == ""
    second = evo.record_execution("coder", "extend api server", "success", "done b")
    assert second["playbook"] == "coder-backend-playbook"
    skill_md = tmp_path / "skills" / "coder-backend-playbook" / "SKILL.md"
    assert skill_md.exists()
    text = skill_md.read_text(encoding="utf-8")
    assert "Distilled from 2 recorded executions" in text
    # Third execution reuses the existing playbook without duplicating it.
    third = evo.record_execution("coder", "another api task", "success", "done c")
    assert third["playbook"] == "coder-backend-playbook"


def test_delta_context_injects_history_and_playbook(tmp_path):
    evo = _evolution(tmp_path)
    evo.record_execution("coder", "implement api endpoint", "success", "shipped endpoints")
    evo.record_execution("coder", "extend api server", "failure", "missed edge case")
    delta = evo.build_agent_delta_context("coder", "add another backend api route")
    assert "Track record" in delta
    assert "successes=1" in delta and "failures=1" in delta
    assert "Learned playbook: coder-backend-playbook" in delta
    # Unknown agent -> empty context
    assert evo.build_agent_delta_context("nobody") == ""


def test_search_knowledge_finds_reflections_and_skills(tmp_path):
    evo = _evolution(tmp_path)
    evo.record_execution("coder", "implement api endpoint", "success", "shipped endpoints")
    evo.record_execution("coder", "extend api server", "success", "more endpoints")
    results = evo.search_knowledge("api endpoint")
    assert results["reflections"]
    playbooks = evo.search_knowledge("backend playbook")
    assert any(s["name"] == "coder-backend-playbook" for s in playbooks["skills"])
