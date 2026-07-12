"""End-to-end plugin surface tests with a FakeCtx (no Hermes runtime)."""
from __future__ import annotations

import json

import pytest

import plugins.agent_cluster as plugin
from .conftest import FakeCtx


EXPECTED_TOOLS = {
    "cluster_search",
    "cluster_inspect",
    "cluster_load",
    "cluster_delegate",
    "cluster_pipeline",
    "cluster_verify",
    "cluster_knowledge",
    "cluster_plan",
    "cluster_swarm",
    "cluster_board",
    "cluster_template",
}


@pytest.fixture
def ctx(tmp_path, monkeypatch):
    monkeypatch.setattr(
        plugin.cluster_config, "get_config",
        lambda: {**plugin.cluster_config.DEFAULTS, "data_dir": str(tmp_path)},
    )
    fake = FakeCtx()
    plugin.register(fake)
    return fake


def test_registers_expected_tools_and_hooks(ctx):
    assert set(ctx.tools) == EXPECTED_TOOLS
    assert all(entry["toolset"] == "agent_cluster" for entry in ctx.tools.values())
    assert "pre_tool_call" in ctx.hooks
    assert "subagent_stop" in ctx.hooks


def test_search_inspect_load_flow(ctx):
    found = ctx.call("cluster_search", query="backend architect", limit=3)
    assert found["success"] and found["results"]
    slug = found["results"][0]["slug"]

    inspected = ctx.call("cluster_inspect", slug=slug, include_body=True)
    assert inspected["success"] and inspected["body"]

    loaded = ctx.call("cluster_load", slug=slug, task="design a service")
    assert loaded["success"]
    assert "## Task" in loaded["prompt"]
    assert "Safety rules" in loaded["prompt"]


def test_search_requires_query(ctx):
    assert ctx.call("cluster_search", query="")["success"] is False


def test_delegate_single_records_execution(ctx):
    result = ctx.call("cluster_delegate", agent="coder", task="implement api endpoint")
    assert result["success"] is True and result["delegated"] is True
    tool_name, args = ctx.dispatched[0]
    assert tool_name == "delegate_task"
    assert args["goal"] == "implement api endpoint"
    assert "Specialist instructions" in args["context"]
    # Execution recorded into evolution log.
    knowledge = ctx.call("cluster_knowledge", query="api endpoint")
    assert knowledge["reflections"]


def test_delegate_batch_fanout(ctx):
    result = ctx.call(
        "cluster_delegate",
        assignments=[
            {"agent": "coder", "goal": "implement feature"},
            {"agent": "tester", "goal": "write regression tests"},
        ],
        role="leaf",
    )
    assert result["success"] is True
    tool_name, args = ctx.dispatched[0]
    assert tool_name == "delegate_task"
    assert len(args["tasks"]) == 2
    assert all(task["role"] == "leaf" for task in args["tasks"])


def test_delegate_unknown_agent(ctx):
    assert ctx.call("cluster_delegate", agent="ghost-agent-x", task="x")["success"] is False


def test_pipeline_with_final_verifier(ctx):
    ctx._results = [
        json.dumps({"results": [{"status": "success", "result": "design done"}]}),
        json.dumps({"results": [{"status": "success", "result": "code done"}]}),
        json.dumps({"results": [{"status": "success", "result": "1. PASS\nVERDICT: PASS"}]}),
    ]
    result = ctx.call(
        "cluster_pipeline",
        stages=[
            {"agent": "system-architect", "goal": "design it"},
            {"agent": "coder", "goal": "build it"},
        ],
        verify_goal="feature shipped",
        verify_criteria=["code done"],
        gate="G2",
    )
    assert result["success"] is True
    assert result["verification"]["verdict"] == "pass"
    assert len(ctx.dispatched) == 3


def test_pipeline_verifier_fail_marks_failure(ctx):
    ctx._results = [
        json.dumps({"results": [{"status": "success", "result": "code done"}]}),
        json.dumps({"results": [{"status": "success", "result": "VERDICT: FAIL — no tests"}]}),
    ]
    result = ctx.call(
        "cluster_pipeline",
        stages=[{"agent": "coder", "goal": "build it"}],
        verify_goal="feature shipped",
        verify_criteria=["tests pass"],
    )
    assert result["success"] is False
    assert result["verification"]["verdict"] == "fail"


def test_verify_tool_requires_criteria_or_gate(ctx):
    assert ctx.call("cluster_verify", goal="done?")["success"] is False
    ctx._results = [json.dumps({"results": [{"status": "success", "result": "VERDICT: PASS"}]})]
    assert ctx.call("cluster_verify", goal="done?", gate="G3")["success"] is True


def test_guard_hook_blocks_via_ctx(ctx):
    callback = ctx.hooks["pre_tool_call"][0]
    blocked = callback(tool_name="terminal", args={"command": "git push --force origin main"})
    assert blocked["action"] == "block"
    assert callback(tool_name="terminal", args={"command": "echo hi"}) is None


def test_subagent_stop_fallback_records_unattributed(ctx):
    callback = ctx.hooks["subagent_stop"][0]
    callback(child_summary="did something", child_status="success")
    knowledge = ctx.call("cluster_knowledge", query="did something")
    assert any(r["slug"] == "_unattributed" for r in knowledge["reflections"])
