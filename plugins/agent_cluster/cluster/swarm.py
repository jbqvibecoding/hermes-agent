"""DAG swarm scheduling on ClawTeam's task board (via the MCP bridge).

The dependency mechanics live entirely in ClawTeam's ``FileTaskStore``:
tasks created with ``blocked_by`` start blocked, cycles are rejected, and
completing a task automatically flips its dependents to ``pending``
(``store/file.py _resolve_dependents_unlocked``). This module adds the two
halves ClawTeam leaves to its workers:

- ``plan_tasks`` — create the team + seed the DAG (deps given as indices
  into the submitted batch, translated to real task ids), owners validated
  against the cluster roster;
- ``run_swarm`` — a leader-side scheduler loop: poll ready (pending) tasks,
  delegate each to its owner specialist through Hermes ``delegate_task``
  (parallel batch), mark completed/failed, and let the store's auto-unblock
  fan out the next wave. Every execution is recorded into the evolution
  memory; an optional final verifier (with G0-G6 gates) seals the run.

Optional git-worktree isolation reuses ClawTeam's workspace CLI: each owner
gets a ``clawteam/{team}/{agent}`` branch worktree, delegated children are
pointed at it, and completed branches are merged back (abort on conflict).
"""
from __future__ import annotations

import json
from typing import Any, Callable, Dict, List, Optional

from . import orchestrator, prompts, roster
from .clawteam_bridge import ClawTeamBridge
from .evolution import ClusterEvolution

TERMINAL_OUTCOME_KEY = "cluster_outcome"  # metadata key marking failed-final tasks


def plan_tasks(
    bridge: ClawTeamBridge,
    team: str,
    tasks: List[Dict[str, Any]],
    agents: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Create the team and seed a task DAG.

    Each task: {subject, description?, agent (roster slug), priority?,
    blocked_by?: [indices into this batch]}. Returns the created tasks with
    real ids, or an error before anything half-created when validation fails.
    """
    if not tasks:
        return {"success": False, "error": "tasks is required"}

    # Validate everything up front — owners against the roster, dep indices
    # against the batch — so we never leave a half-seeded board.
    resolved_owners: List[Dict[str, Any]] = []
    for index, item in enumerate(tasks):
        subject = str(item.get("subject", "")).strip()
        if not subject:
            return {"success": False, "error": f"task {index}: subject is required"}
        identifier = str(item.get("agent", "")).strip()
        agent = roster.lookup(identifier, agents)
        if agent is None:
            return {"success": False, "error": f"task {index}: agent not found in roster: {identifier}"}
        resolved_owners.append(agent)
        for dep in item.get("blocked_by", []) or []:
            try:
                dep_index = int(dep)
            except Exception:
                return {"success": False, "error": f"task {index}: blocked_by entries must be batch indices"}
            if dep_index == index or not 0 <= dep_index < len(tasks):
                return {"success": False, "error": f"task {index}: invalid blocked_by index {dep_index}"}

    bridge.team_create(team)
    seen_owners: set = set()
    for agent in resolved_owners:
        slug = agent["slug"]
        if slug not in seen_owners:
            seen_owners.add(slug)
            try:
                bridge.member_add(team, slug, agent_id=slug, agent_type=agent.get("division", "specialist"))
            except Exception:
                pass  # already a member from a previous plan on the same team

    created: List[Dict[str, Any]] = []
    for index, item in enumerate(tasks):
        deps = [created[int(dep)]["id"] for dep in (item.get("blocked_by") or [])]
        task = bridge.task_create(
            team,
            subject=str(item["subject"]).strip(),
            description=str(item.get("description", "")).strip(),
            owner=resolved_owners[index]["slug"],
            priority=str(item.get("priority", "")).strip() or None,
            blocked_by=deps or None,
        )
        created.append(task)
    return {
        "success": True,
        "team": team,
        "tasks": [
            {
                "id": task.get("id"),
                "subject": task.get("subject"),
                "owner": task.get("owner"),
                "status": task.get("status"),
                "blocked_by": task.get("blocked_by", []),
            }
            for task in created
        ],
    }


def board_snapshot(bridge: ClawTeamBridge, team: str) -> Dict[str, Any]:
    tasks = bridge.task_list(team)
    columns: Dict[str, List[Dict[str, Any]]] = {}
    for task in tasks:
        columns.setdefault(str(task.get("status", "unknown")), []).append(
            {
                "id": task.get("id"),
                "subject": task.get("subject"),
                "owner": task.get("owner"),
                "blocked_by": task.get("blocked_by", []),
                "outcome": (task.get("metadata") or {}).get(TERMINAL_OUTCOME_KEY, ""),
            }
        )
    stats = bridge.task_stats(team)
    return {"team": team, "stats": stats, "columns": columns}


def _workspace_note(workspace: Dict[str, Any]) -> str:
    return (
        f"## Isolated workspace\nWork ONLY inside the git worktree branch "
        f"`{workspace.get('branch')}`"
        + (f" at `{workspace['path']}`" if workspace.get("path") else "")
        + ". Commit your changes there; merging is handled by the orchestrator."
    )


def run_swarm(
    bridge: ClawTeamBridge,
    dispatch: Callable[[str, Dict[str, Any]], Any],
    team: str,
    context: str = "",
    parallel: int = 3,
    max_rounds: int = 20,
    max_retries: int = 1,
    evolution: Optional[ClusterEvolution] = None,
    agents: Optional[List[Dict[str, Any]]] = None,
    workspace_repo: str = "",
    verify_goal: str = "",
    verify_criteria: Optional[List[str]] = None,
    gate: str = "",
) -> Dict[str, Any]:
    """Drive the team's DAG to convergence. Returns a full run report."""
    rounds: List[Dict[str, Any]] = []
    workspaces: Dict[str, Dict[str, Any]] = {}
    workspace_reports: List[Dict[str, Any]] = []

    def _ensure_workspace(slug: str) -> Optional[Dict[str, Any]]:
        if not workspace_repo:
            return None
        if slug not in workspaces:
            result = bridge.workspace_create(team, slug, workspace_repo)
            workspaces[slug] = result
            if not result.get("ok"):
                workspace_reports.append({"agent": slug, "action": "create", **result})
        entry = workspaces[slug]
        return entry if entry.get("ok") else None

    for round_index in range(1, max_rounds + 1):
        ready = [
            task
            for task in bridge.task_list(team, status="pending", sort_by_priority=True)
            if not (task.get("metadata") or {}).get(TERMINAL_OUTCOME_KEY)
        ]
        if not ready:
            remaining = bridge.task_list(team)
            blocked = [t for t in remaining if t.get("status") == "blocked"]
            in_progress = [t for t in remaining if t.get("status") == "in_progress"]
            if in_progress:
                # A previous run died mid-task; reset and continue.
                for task in in_progress:
                    bridge.task_update(team, task["id"], status="pending", caller="cluster-swarm", force=True)
                continue
            if blocked and any(not (t.get("metadata") or {}).get(TERMINAL_OUTCOME_KEY) for t in blocked):
                return _finish(
                    bridge, team, rounds, workspace_reports,
                    success=False,
                    error="deadlock: blocked tasks remain but nothing is ready "
                          "(failed dependencies or unsatisfiable blocked_by)",
                )
            break  # all done (or only failed-final leftovers)

        batch = ready[: max(1, parallel)]
        round_report: Dict[str, Any] = {"round": round_index, "tasks": []}

        # Compose one delegate_task fan-out for the whole wave.
        delegate_tasks: List[Dict[str, Any]] = []
        wave: List[Dict[str, Any]] = []
        for task in batch:
            slug = str(task.get("owner", "")).strip()
            agent = roster.lookup(slug, agents)
            if agent is None:
                bridge.task_update(
                    team, task["id"], status="blocked", caller="cluster-swarm", force=True,
                    metadata={TERMINAL_OUTCOME_KEY: "failed", "failure_reason": f"owner not in roster: {slug}"},
                )
                round_report["tasks"].append({"id": task["id"], "owner": slug, "outcome": "failed", "reason": "owner not in roster"})
                continue
            goal = str(task.get("subject", "")).strip()
            description = str(task.get("description", "")).strip()
            full_goal = f"{goal}\n\n{description}" if description else goal
            workspace = _ensure_workspace(agent["slug"])
            handover = _workspace_note(workspace) if workspace else ""
            composed = prompts.specialist_prompt(agent, task=full_goal, evolution=evolution, handover=handover)
            if context:
                composed += "\n\n## Additional context\n" + context
            bridge.task_update(team, task["id"], status="in_progress", owner=agent["slug"], caller="cluster-swarm", force=True)
            delegate_tasks.append({"goal": goal, "context": composed})
            wave.append({"task": task, "agent": agent, "goal": goal})

        if wave:
            raw = dispatch("delegate_task", {"tasks": delegate_tasks})
            results = _split_results(raw, len(wave))
            for entry, result in zip(wave, results):
                task, agent = entry["task"], entry["agent"]
                failed = bool(result.get("error")) or result.get("status") in {"failed", "error"}
                summary = str(
                    result.get("result") or result.get("summary") or result.get("error") or ""
                )
                if evolution is not None:
                    try:
                        evolution.record_execution(
                            agent["slug"], entry["goal"],
                            "failure" if failed else "success",
                            summary[:1500], kind="swarm",
                        )
                    except Exception:
                        pass
                if not failed:
                    bridge.task_update(
                        team, task["id"], status="completed", caller="cluster-swarm", force=True,
                        metadata={"result_summary": summary[:1000]},
                    )
                    round_report["tasks"].append({"id": task["id"], "owner": agent["slug"], "outcome": "success"})
                else:
                    retries = int((task.get("metadata") or {}).get("retries", 0)) + 1
                    if retries <= max_retries:
                        bridge.task_update(
                            team, task["id"], status="pending", caller="cluster-swarm", force=True,
                            metadata={"retries": retries, "last_error": summary[:500]},
                        )
                        round_report["tasks"].append({"id": task["id"], "owner": agent["slug"], "outcome": "retry", "attempt": retries})
                    else:
                        bridge.task_update(
                            team, task["id"], status="blocked", caller="cluster-swarm", force=True,
                            metadata={TERMINAL_OUTCOME_KEY: "failed", "failure_reason": summary[:500]},
                        )
                        round_report["tasks"].append({"id": task["id"], "owner": agent["slug"], "outcome": "failed"})
        rounds.append(round_report)
    else:
        return _finish(
            bridge, team, rounds, workspace_reports,
            success=False, error=f"max_rounds ({max_rounds}) reached before convergence",
        )

    # Merge worktrees back (only owners whose workspace was actually created).
    if workspace_repo:
        for slug, workspace in workspaces.items():
            if not workspace.get("ok"):
                continue
            merge = bridge.workspace_merge(team, slug, workspace_repo)
            workspace_reports.append({"agent": slug, "action": "merge", **merge})
            if merge.get("ok"):
                cleanup = bridge.workspace_cleanup(team, slug, workspace_repo)
                workspace_reports.append({"agent": slug, "action": "cleanup", **cleanup})

    report = _finish(bridge, team, rounds, workspace_reports, success=True)
    failed_final = [
        task for column in report["board"]["columns"].values() for task in column
        if task.get("outcome") == "failed"
    ]
    if failed_final:
        report["success"] = False
        report["error"] = f"{len(failed_final)} task(s) failed permanently"
    elif verify_goal:
        evidence = json.dumps(report["board"]["columns"], ensure_ascii=False)[:4000]
        verification = orchestrator.run_verifier(
            dispatch, verify_goal, [str(c) for c in (verify_criteria or []) if str(c).strip()],
            gate=gate, evidence=evidence,
        )
        report["verification"] = verification
        if verification.get("verdict") == "fail":
            report["success"] = False
            report["error"] = "final verification failed — see verification.report"
    return report


def _split_results(raw: Any, count: int) -> List[Dict[str, Any]]:
    """Map a delegate_task batch result onto per-task dicts (index order)."""
    if isinstance(raw, str):
        try:
            payload = json.loads(raw)
        except Exception:
            payload = {"results": [{"status": "success", "result": raw}]}
    elif isinstance(raw, dict):
        payload = raw
    else:
        payload = {}
    results = payload.get("results")
    if not isinstance(results, list):
        if payload.get("error"):
            return [{"status": "error", "error": str(payload["error"])}] * count
        results = [payload]
    normalized = [item if isinstance(item, dict) else {"result": str(item)} for item in results]
    while len(normalized) < count:
        normalized.append({"status": "error", "error": "missing result for task"})
    return normalized[:count]


def _finish(
    bridge: ClawTeamBridge,
    team: str,
    rounds: List[Dict[str, Any]],
    workspace_reports: List[Dict[str, Any]],
    success: bool,
    error: str = "",
) -> Dict[str, Any]:
    report: Dict[str, Any] = {
        "success": success,
        "team": team,
        "rounds": rounds,
        "board": board_snapshot(bridge, team),
    }
    if workspace_reports:
        report["workspaces"] = workspace_reports
    if error:
        report["error"] = error
    return report
