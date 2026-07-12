"""Shared fixtures for agent_cluster plugin tests — all offline."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

# Make the hermes-agent repo root importable when tests run from anywhere.
_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))


AGENCY_AGENT_MD = """---
name: Backend Architect
description: Senior backend architect specializing in scalable system design
color: blue
emoji: "🏗️"
vibe: Designs the systems that hold everything up
---
# Backend Architect Agent Personality
You are **Backend Architect**.
"""

AGENTHUB_AGENT_MD = """---
name: tech-lead
description: L1 部門領導。負責技術決策、架構設計。
level: L1
department: engineering
color: green
tools: Read, Write, Bash
manages:
  - backend-architect
  - frontend-developer
reports_to: boss
coordinates_with:
  - product-manager
model: opus
---
你是技術主管。
"""

RUFLO_AGENT_MD = """---
name: coder
description: Implementation specialist for writing clean, efficient code
---
# Code Implementation Agent
You are a senior software engineer.
"""

OPENOPC_AGENT_MD = """---
name: Backend Architect
description: Talent persona duplicated with agency to exercise dedup
color: "#B45309"
emoji: 📚
vibe: history rhymes
---
# Talent body
"""


@pytest.fixture
def source_repos(tmp_path: Path) -> dict:
    """Minimal fake checkouts of the four source repos."""
    agency = tmp_path / "agency"
    (agency / "engineering").mkdir(parents=True)
    (agency / "divisions.json").write_text(
        json.dumps({"divisions": {"engineering": {}}}), encoding="utf-8"
    )
    (agency / "engineering" / "backend-architect.md").write_text(
        AGENCY_AGENT_MD, encoding="utf-8"
    )

    ruflo = tmp_path / "ruflo"
    (ruflo / ".claude" / "agents" / "core").mkdir(parents=True)
    (ruflo / ".claude" / "agents" / "core" / "coder.md").write_text(
        RUFLO_AGENT_MD, encoding="utf-8"
    )

    agenthub = tmp_path / "agenthub"
    (agenthub / "agents" / "definitions" / "engineering").mkdir(parents=True)
    (agenthub / "agents" / "definitions" / "engineering" / "tech-lead.md").write_text(
        AGENTHUB_AGENT_MD, encoding="utf-8"
    )
    (agenthub / "agents" / "definitions" / "engineering" / "plain-role.md").write_text(
        "# Plain Role\n\n## Description\nA frontmatter-less role file.\n\n## Details\nMore.\n",
        encoding="utf-8",
    )

    openopc = tmp_path / "openopc"
    (openopc / ".opc" / "prompts" / "talent").mkdir(parents=True)
    (openopc / ".opc" / "prompts" / "talent" / "engineering-backend-architect.md").write_text(
        OPENOPC_AGENT_MD, encoding="utf-8"
    )

    return {"agency": agency, "ruflo": ruflo, "agenthub": agenthub, "openopc": openopc}


@pytest.fixture
def built_roster(source_repos, tmp_path: Path):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
    import build_roster

    out = tmp_path / "roster.json"
    build_roster.build(source_repos, out)
    return json.loads(out.read_text(encoding="utf-8"))


class FakeTaskBoard:
    """In-memory stand-in for ClawTeam's FileTaskStore behind its MCP tools.

    Implements the semantics the swarm engine depends on: tasks created with
    blocked_by start blocked, completing a task removes it from dependents'
    blocked_by and flips them to pending, and simple cycle rejection.
    """

    def __init__(self):
        self.teams = {}
        self.tasks = {}
        self._next = 0

    def _new_id(self):
        self._next += 1
        return f"t{self._next:03d}"

    def handle(self, tool, args):
        method = getattr(self, tool, None)
        if method is None:
            raise KeyError(f"unknown clawteam tool: {tool}")
        return json.dumps(method(**args), ensure_ascii=False)

    # -- tool implementations (mirror clawteam/mcp/tools signatures) --------

    def team_list(self):
        return sorted(self.teams)

    def team_create(self, team_name, leader_name="", leader_id="", **kwargs):
        self.teams.setdefault(team_name, {"members": []})
        return {"name": team_name}

    def team_member_add(self, team_name, member_name, agent_id, **kwargs):
        self.teams.setdefault(team_name, {"members": []})["members"].append(member_name)
        return {"name": member_name}

    def task_create(self, team_name, subject, description="", owner="",
                    priority=None, blocks=None, blocked_by=None, metadata=None):
        blocked_by = list(blocked_by or [])
        for dep in blocked_by:
            if dep not in self.tasks:
                raise ValueError(f"unknown dependency {dep}")
        task = {
            "id": self._new_id(),
            "subject": subject,
            "description": description,
            "owner": owner,
            "priority": priority or "medium",
            "status": "blocked" if blocked_by else "pending",
            # camelCase like ClawTeam's by_alias serialization
            "blockedBy": blocked_by,
            "metadata": dict(metadata or {}),
        }
        self.tasks[task["id"]] = task
        return task

    def task_update(self, team_name, task_id, status=None, owner=None,
                    subject=None, description=None, priority=None,
                    add_blocks=None, add_blocked_by=None, metadata=None,
                    caller="", force=False):
        task = self.tasks[task_id]
        if owner is not None:
            task["owner"] = owner
        if subject is not None:
            task["subject"] = subject
        if metadata:
            task["metadata"].update(metadata)
        if status is not None:
            task["status"] = status
            if status == "completed":
                for other in self.tasks.values():
                    if task_id in other["blockedBy"]:
                        other["blockedBy"] = [d for d in other["blockedBy"] if d != task_id]
                        if not other["blockedBy"] and other["status"] == "blocked" \
                                and not other["metadata"].get("cluster_outcome"):
                            other["status"] = "pending"
        return task

    def task_list(self, team_name, status=None, owner=None, priority=None,
                  sort_by_priority=False):
        tasks = list(self.tasks.values())
        if status:
            tasks = [t for t in tasks if t["status"] == status]
        if owner:
            tasks = [t for t in tasks if t["owner"] == owner]
        return tasks

    def task_stats(self, team_name):
        counts = {}
        for task in self.tasks.values():
            counts[task["status"]] = counts.get(task["status"], 0) + 1
        return {"total": len(self.tasks), "by_status": counts}


class FakeCtx:
    """Stand-in for hermes PluginContext capturing registrations/dispatches.

    delegate_task calls consume queued results (or a canned success);
    mcp__<server>__* calls are served by an in-memory FakeTaskBoard.
    """

    def __init__(self, dispatch_results=None, clawteam_server="clawteam"):
        self.tools = {}
        self.hooks = {}
        self.dispatched = []
        self._results = list(dispatch_results or [])
        self.board = FakeTaskBoard()
        self._mcp_prefix = f"mcp__{clawteam_server}__"

    def register_tool(self, name, toolset, schema, handler, **kwargs):
        self.tools[name] = {"toolset": toolset, "schema": schema, "handler": handler, **kwargs}

    def register_hook(self, hook_name, callback):
        self.hooks.setdefault(hook_name, []).append(callback)

    def dispatch_tool(self, tool_name, args, **kwargs):
        self.dispatched.append((tool_name, args))
        if tool_name.startswith(self._mcp_prefix):
            return self.board.handle(tool_name[len(self._mcp_prefix):], args)
        if self._results:
            return self._results.pop(0)
        # Mirror real delegate_task: one result entry per task in a batch.
        count = len(args.get("tasks") or []) or 1
        return json.dumps(
            {"results": [{"status": "success", "result": "child done"}] * count}
        )

    def call(self, tool, **args):
        return json.loads(self.tools[tool]["handler"](args))
