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


class FakeCtx:
    """Stand-in for hermes PluginContext capturing registrations/dispatches."""

    def __init__(self, dispatch_results=None):
        self.tools = {}
        self.hooks = {}
        self.dispatched = []
        self._results = list(dispatch_results or [])

    def register_tool(self, name, toolset, schema, handler, **kwargs):
        self.tools[name] = {"toolset": toolset, "schema": schema, "handler": handler, **kwargs}

    def register_hook(self, hook_name, callback):
        self.hooks.setdefault(hook_name, []).append(callback)

    def dispatch_tool(self, tool_name, args, **kwargs):
        self.dispatched.append((tool_name, args))
        if self._results:
            return self._results.pop(0)
        return json.dumps({"results": [{"status": "success", "result": "child done"}]})

    def call(self, tool, **args):
        return json.loads(self.tools[tool]["handler"](args))
