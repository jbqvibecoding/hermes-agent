"""Guard (dangerous-command interception) tests."""
from __future__ import annotations

import json

from plugins.agent_cluster.cluster.guard import Guard, check_command


BLOCKED = [
    "npx kill-port 3000",
    "taskkill /F /IM node.exe",
    "powershell Stop-Process -Name node",
    "git commit --no-verify -m 'wip'",
    "git push --force origin main",
    "git push -f origin master",
    "git push origin main --force",
    "git push --force-with-lease origin main",
]

ALLOWED = [
    "npm run test",
    "git push -u origin claude/agent-cluster-orchestration-kztdr2",
    "git push --force origin feature/my-branch",
    "kill 1234",
    "ls -la",
]


def test_forbidden_patterns_blocked():
    for cmd in BLOCKED:
        assert check_command(cmd) is not None, f"should block: {cmd}"


def test_normal_commands_pass():
    for cmd in ALLOWED:
        assert check_command(cmd) is None, f"should allow: {cmd}"


def test_hook_blocks_and_logs(tmp_path):
    guard = Guard(tmp_path)
    result = guard.pre_tool_call(tool_name="terminal", args={"command": "npx kill-port 8080"})
    assert result["action"] == "block"
    assert "kill-port" in result["message"]
    entries = [
        json.loads(line)
        for line in (tmp_path / "guard-log.jsonl").read_text().strip().splitlines()
    ]
    assert entries[0]["result"] == "blocked"
    assert entries[0]["rule"] == "kill-port"


def test_hook_ignores_non_command_tools(tmp_path):
    guard = Guard(tmp_path)
    assert guard.pre_tool_call(tool_name="read_file", args={"path": "kill-port"}) is None
    assert guard.pre_tool_call(tool_name="terminal", args={}) is None


def test_hook_disabled(tmp_path):
    guard = Guard(tmp_path, enabled=False)
    assert guard.pre_tool_call(tool_name="terminal", args={"command": "npx kill-port 1"}) is None
