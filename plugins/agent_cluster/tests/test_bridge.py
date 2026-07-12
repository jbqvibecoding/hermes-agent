"""ClawTeam bridge tests: tool naming, parsing, degradation."""
from __future__ import annotations

import json

import pytest

from plugins.agent_cluster.cluster.clawteam_bridge import (
    ClawTeamBridge,
    ClawTeamUnavailable,
    normalize_keys,
)


def test_tool_name_prefixing():
    bridge = ClawTeamBridge(lambda name, args: "[]", server="claw2")
    assert bridge.tool_name("task_create") == "mcp__claw2__task_create"


def test_normalize_keys_camel_to_snake():
    payload = {"blockedBy": ["a"], "nested": [{"createdAt": "x", "plain": 1}]}
    assert normalize_keys(payload) == {
        "blocked_by": ["a"],
        "nested": [{"created_at": "x", "plain": 1}],
    }


def test_call_parses_json_and_normalizes():
    def dispatch(name, args):
        assert name == "mcp__clawteam__task_get"
        return json.dumps({"id": "t1", "blockedBy": ["t0"]})

    bridge = ClawTeamBridge(dispatch)
    result = bridge.call("task_get", team_name="x", task_id="t1")
    assert result == {"id": "t1", "blocked_by": ["t0"]}


def test_missing_tool_raises_unavailable_with_hint():
    def dispatch(name, args):
        raise KeyError(f"unknown tool {name}")

    bridge = ClawTeamBridge(dispatch)
    with pytest.raises(ClawTeamUnavailable) as excinfo:
        bridge.call("task_list", team_name="x")
    message = str(excinfo.value)
    assert "pip install clawteam" in message
    assert "mcp_servers.clawteam" in message


def test_workspace_degrades_without_cli(monkeypatch):
    monkeypatch.setattr("shutil.which", lambda name: None)
    bridge = ClawTeamBridge(lambda n, a: "[]")
    result = bridge.workspace_create("team", "agent", "/repo")
    assert result["ok"] is False
    assert "not on PATH" in result["error"]
