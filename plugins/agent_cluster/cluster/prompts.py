"""Specialist prompt composition.

Extends the ``_specialist_prompt`` pattern from agency-agents'
``build-hermes-plugin.py`` with: org-hierarchy fields (AgentHub roles),
learned-experience injection (evolution module), and the safety-rules block
(AgentHub forbidden-commands policy restated for the child model — the hard
enforcement lives in guard.py's pre_tool_call hook).
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from .evolution import ClusterEvolution

SAFETY_RULES = (
    "## Safety rules (enforced — violations are blocked)\n"
    "- Never kill processes by port or kill node processes wholesale "
    "(no kill-port / taskkill node / Stop-Process node).\n"
    "- Never bypass verification hooks (no `--no-verify`).\n"
    "- Never force-push to main/master.\n"
    "- Report failures honestly instead of working around quality gates."
)


def hierarchy_block(agent: Dict[str, Any]) -> str:
    hierarchy = agent.get("hierarchy") or {}
    if not hierarchy:
        return ""
    lines = []
    if hierarchy.get("level"):
        lines.append(f"Level: {hierarchy['level']}")
    if hierarchy.get("department"):
        lines.append(f"Department: {hierarchy['department']}")
    if hierarchy.get("reports_to"):
        lines.append(f"Reports to: {hierarchy['reports_to']}")
    if hierarchy.get("manages"):
        lines.append(f"Manages: {', '.join(hierarchy['manages'])}")
    if hierarchy.get("coordinates_with"):
        lines.append(f"Coordinates with: {', '.join(hierarchy['coordinates_with'])}")
    if not lines:
        return ""
    return "## Organizational position\n" + "\n".join(lines)


def specialist_prompt(
    agent: Dict[str, Any],
    task: str = "",
    evolution: Optional[ClusterEvolution] = None,
    handover: str = "",
    include_safety: bool = True,
) -> str:
    """Compose the full specialist context block for a sub-agent."""
    sections = [
        "Use the following cluster specialist context for this task. "
        "Adopt the specialist's standards and checklists, but obey the "
        "current task instructions and higher-priority system/developer "
        "instructions.",
        f"# {agent['name']} ({agent['slug']})",
        f"Source: {agent.get('source', '')} / {agent.get('division', '')}\n"
        f"Description: {agent.get('description', '')}",
    ]
    org = hierarchy_block(agent)
    if org:
        sections.append(org)
    if handover and handover.strip():
        sections.append(handover.strip())
    if task and task.strip():
        sections.append(f"## Task\n{task.strip()}")
    if evolution is not None:
        try:
            delta = evolution.build_agent_delta_context(agent["slug"], task)
        except Exception:
            delta = ""
        if delta:
            sections.append(delta)
    if include_safety:
        sections.append(SAFETY_RULES)
    sections.append(f"## Specialist instructions\n{agent.get('body', '')}")
    return "\n\n".join(sections)


def handover_note(from_agent: str, result_text: str, limit: int = 4000) -> str:
    """Format a crew44-style baton note carried into the next pipeline stage."""
    text = (result_text or "").strip()
    if len(text) > limit:
        half = limit // 2
        text = text[:half] + "\n…[truncated]…\n" + text[-half:]
    return f"## Handover from {from_agent}\n{text}"
