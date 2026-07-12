"""Plugin configuration — read from ``plugins.entries.agent_cluster`` in
Hermes config.yaml, with safe defaults so the plugin works unconfigured.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

PLUGIN_ID = "agent_cluster"

DEFAULTS: Dict[str, Any] = {
    # Where reflections / promoted playbooks / guard audit logs live.
    "data_dir": "",  # empty -> <HERMES_HOME>/agent-cluster
    # Reflections in the same domain needed before a playbook is promoted
    # (OpenOPC EmployeeEvolutionManager.LEARNED_SKILL_THRESHOLD parity).
    "promotion_threshold": 2,
    # How many recent reflections to summarize into a specialist prompt.
    "reflection_context_limit": 3,
    # Dangerous-command interception (pre_tool_call hook).
    "guard_enabled": True,
    # Max characters of a stage result carried into the next pipeline stage.
    "handover_note_limit": 4000,
    # ClawTeam MCP bridge (DAG swarm): name of the mcp_servers entry whose
    # tools register as mcp__<server>__*.
    "clawteam_server": "clawteam",
    # Max ready tasks delegated per swarm round (also bounded by Hermes'
    # delegation.max_concurrent_children).
    "swarm_parallel": 3,
    # Hard cap on swarm scheduler rounds before returning a board snapshot.
    "swarm_max_rounds": 20,
    # Failed-task retries before the task is marked blocked/failed.
    "swarm_max_retries": 1,
}


def _load_entry() -> Dict[str, Any]:
    try:
        from hermes_cli.config import load_config

        cfg = load_config() or {}
        entries = (cfg.get("plugins") or {}).get("entries") or {}
        entry = entries.get(PLUGIN_ID) or {}
        return entry if isinstance(entry, dict) else {}
    except Exception:
        return {}


def get_config() -> Dict[str, Any]:
    merged = dict(DEFAULTS)
    merged.update(_load_entry())
    return merged


def get_data_dir(cfg: Dict[str, Any] | None = None) -> Path:
    cfg = cfg or get_config()
    configured = str(cfg.get("data_dir") or "").strip()
    if configured:
        return Path(configured).expanduser()
    try:
        from hermes_constants import get_hermes_home

        return Path(get_hermes_home()) / "agent-cluster"
    except Exception:
        return Path.home() / ".hermes" / "agent-cluster"
