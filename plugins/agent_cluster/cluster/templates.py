"""Team-template loading — ClawTeam TOML archetypes, zero-dependency.

Parses the same TOML schema as ``clawteam/templates/__init__.py``
(``[template]`` + ``[template.leader]`` + ``[[template.agents]]`` +
``[[template.tasks]]``) with stdlib ``tomllib`` (Hermes requires
Python ≥3.11). Six ClawTeam built-ins are vendored under
``assets/templates/``; user templates in ``<data_dir>/templates/`` override
built-ins by name (same precedence rule as ClawTeam).

``to_plan()`` adapts a template to the cluster: every role is mapped onto a
roster specialist (exact slug/name lookup first, then best search match),
and the seeded tasks become a ``swarm.plan_tasks`` batch.
"""
from __future__ import annotations

import re
import tomllib
from pathlib import Path
from typing import Any, Dict, List, Optional

from . import roster

_BUILTIN_DIR = Path(__file__).resolve().parent.parent / "assets" / "templates"

_PLACEHOLDER_RE = re.compile(r"\{(\w+)\}")


def render_text(text: str, variables: Dict[str, str]) -> str:
    """Substitute known {placeholders}; unknown ones are preserved verbatim
    (same safe-substitution behavior as ClawTeam's ``render_task``)."""

    def _sub(match: re.Match) -> str:
        key = match.group(1)
        return str(variables[key]) if key in variables else match.group(0)

    return _PLACEHOLDER_RE.sub(_sub, text or "")


def list_templates(user_dir: Optional[Path] = None) -> List[Dict[str, str]]:
    names: Dict[str, str] = {}
    for base, origin in ((_BUILTIN_DIR, "builtin"), (user_dir, "user")):
        if base is None or not Path(base).is_dir():
            continue
        for path in sorted(Path(base).glob("*.toml")):
            names[path.stem] = origin
    return [{"name": name, "origin": origin} for name, origin in sorted(names.items())]


def load_template(name: str, user_dir: Optional[Path] = None) -> Optional[Dict[str, Any]]:
    """Load a template by name; user dir overrides built-ins."""
    name = (name or "").strip()
    if not name or "/" in name or "\\" in name or ".." in name:
        return None
    for base in (user_dir, _BUILTIN_DIR):
        if base is None:
            continue
        path = Path(base) / f"{name}.toml"
        if path.is_file():
            data = tomllib.loads(path.read_text(encoding="utf-8"))
            template = data.get("template")
            if isinstance(template, dict):
                template.setdefault("name", name)
                template["_source_path"] = str(path)
                return template
    return None


def _map_role(
    name: str, role_type: str, agents: Optional[List[Dict[str, Any]]]
) -> Dict[str, Any]:
    """Map a template role onto a roster specialist."""
    for identifier in (name, role_type):
        found = roster.lookup(identifier, agents)
        if found:
            return {"slug": found["slug"], "matched_by": "lookup", "query": identifier}
    # Hyphenated role names tokenize as single tokens ("qa-engineer") that
    # rarely match roster text — search on the space-split words instead.
    query = f"{name} {role_type}".replace("-", " ").strip()
    results = roster.search(query, limit=1, agents=agents)
    if results:
        return {"slug": results[0]["slug"], "matched_by": "search", "query": query}
    return {"slug": "", "matched_by": "none", "query": query}


def to_plan(
    template: Dict[str, Any],
    goal: str,
    team_name: str,
    agents: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Expand a template into role mappings + a ``plan_tasks`` batch.

    Template roles (leader + agents) become roster-mapped members; template
    ``tasks`` (owner referencing a role name) become the plan batch. Role
    ``task`` texts (the per-role standing instructions) are attached as each
    seeded task's description prefix so the specialist gets the archetype's
    process guidance in addition to its roster persona.
    """
    variables = {"goal": goal, "team_name": team_name}
    roles: List[Dict[str, Any]] = []
    leader = template.get("leader")
    if isinstance(leader, dict):
        roles.append({**leader, "_is_leader": True})
    for agent_def in template.get("agents", []) or []:
        if isinstance(agent_def, dict):
            roles.append(dict(agent_def))

    mapped_roles: List[Dict[str, Any]] = []
    role_by_name: Dict[str, Dict[str, Any]] = {}
    unmapped: List[str] = []
    for role in roles:
        role_name = str(role.get("name", "")).strip()
        role_type = str(role.get("type", "")).strip()
        mapping = _map_role(role_name, role_type, agents)
        entry = {
            "role": role_name,
            "type": role_type,
            "leader": bool(role.get("_is_leader")),
            "roster_slug": mapping["slug"],
            "matched_by": mapping["matched_by"],
            "instructions": render_text(
                str(role.get("task", "")),
                {**variables, "agent_name": role_name},
            ),
        }
        mapped_roles.append(entry)
        role_by_name[role_name] = entry
        if not mapping["slug"]:
            unmapped.append(role_name)

    if unmapped:
        return {
            "success": False,
            "error": f"template roles could not be mapped to the roster: {', '.join(unmapped)}",
            "roles": mapped_roles,
        }

    plan_batch: List[Dict[str, Any]] = []
    for task_def in template.get("tasks", []) or []:
        if not isinstance(task_def, dict):
            continue
        owner_role = str(task_def.get("owner", "")).strip()
        entry = role_by_name.get(owner_role)
        if entry is None:
            return {
                "success": False,
                "error": f"template task owner '{owner_role}' is not a defined role",
                "roles": mapped_roles,
            }
        description_parts = [
            render_text(str(task_def.get("description", "")), variables).strip(),
        ]
        if entry["instructions"]:
            description_parts.append("## Role instructions (from template)\n" + entry["instructions"])
        plan_batch.append(
            {
                "subject": render_text(str(task_def.get("subject", "")), variables).strip(),
                "description": "\n\n".join(part for part in description_parts if part),
                "agent": entry["roster_slug"],
                "_leader": entry["leader"],
            }
        )

    # In ClawTeam the leader's coordination task polls live workers; in our
    # swarm model it becomes a synthesis step, so gate every leader-owned
    # task on all worker tasks via DAG dependencies.
    worker_indices = [i for i, task in enumerate(plan_batch) if not task["_leader"]]
    for task in plan_batch:
        if task.pop("_leader") and worker_indices:
            task["blocked_by"] = worker_indices

    return {
        "success": True,
        "template": template.get("name", ""),
        "goal": goal,
        "team": team_name,
        "roles": mapped_roles,
        "tasks": plan_batch,
    }
