"""Hermes plugin: agent-cluster router + orchestrator.

Exposes a small fixed tool surface over a 576-agent sub-agent roster
(agency-agents + ruflo + AgentHub + OpenOPC, unified by
``scripts/build_roster.py``). Execution goes through Hermes' own
``delegate_task``; orchestration adds crew44-style sequential pipelines and
an isolated goal verifier gated by AgentHub's G0-G6 checklists; every
execution is recorded via the OpenOPC-ported evolution module and recurring
lessons are auto-promoted into reusable playbook SKILL.md files.
"""
from __future__ import annotations

import json
import logging
import threading
from typing import Any, Dict, List, Optional

from .cluster import config as cluster_config
from .cluster import orchestrator, prompts, roster
from .cluster.evolution import ClusterEvolution
from .cluster.guard import Guard
from .cluster.skill_store import SkillStore

logger = logging.getLogger(__name__)

TOOLSET = "agent_cluster"

# Counts cluster-tool delegations currently in flight so the subagent_stop
# fallback hook doesn't double-record executions the tools already recorded.
_inflight_lock = threading.Lock()
_inflight = 0


def _json(payload: Dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2)


def _identifier(args: Dict[str, Any]) -> str:
    # Accept "agent" or "slug" — search results are keyed by "slug", so both
    # chain naturally (same convention as the agency-agents router).
    return str(args.get("agent") or args.get("slug") or "").strip()


def _not_found(identifier: str) -> Dict[str, Any]:
    return {
        "success": False,
        "error": "agent not found" if identifier else "agent or slug is required",
        "agent": identifier or None,
    }


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

SEARCH_SCHEMA = {
    "type": "object",
    "properties": {
        "query": {"type": "string", "description": "Natural-language search query (English or Chinese)."},
        "source": {"type": "string", "description": "Optional source filter: agency, ruflo, agenthub, openopc."},
        "division": {"type": "string", "description": "Optional division/department filter, e.g. engineering, marketing, testing."},
        "limit": {"type": "integer", "description": "Maximum results, default 8, max 25."},
    },
    "required": ["query"],
}

INSPECT_SCHEMA = {
    "type": "object",
    "properties": {
        "agent": {"type": "string", "description": "Agent slug or exact display name."},
        "slug": {"type": "string", "description": "Alias for agent. Pass the slug from cluster_search results."},
        "include_body": {"type": "boolean", "description": "Include the full specialist instructions."},
    },
    "required": [],
}

LOAD_SCHEMA = {
    "type": "object",
    "properties": {
        "agent": {"type": "string", "description": "Agent slug or exact display name."},
        "slug": {"type": "string", "description": "Alias for agent."},
        "task": {"type": "string", "description": "The task to pair with the specialist context."},
    },
    "required": [],
}

DELEGATE_SCHEMA = {
    "type": "object",
    "properties": {
        "agent": {"type": "string", "description": "Agent slug or name for a single delegation."},
        "slug": {"type": "string", "description": "Alias for agent."},
        "task": {"type": "string", "description": "Concrete task for the specialist (single mode)."},
        "assignments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "agent": {"type": "string", "description": "Agent slug or name."},
                    "goal": {"type": "string", "description": "Task for this agent."},
                    "context": {"type": "string", "description": "Extra task-specific context."},
                },
                "required": ["agent", "goal"],
            },
            "description": "Parallel fan-out: multiple specialists run as one delegate_task batch.",
        },
        "context": {"type": "string", "description": "Shared background context for the task(s)."},
        "role": {
            "type": "string",
            "enum": ["leaf", "orchestrator"],
            "description": "Child role. 'orchestrator' children may further delegate (bounded by delegation.max_spawn_depth).",
        },
    },
    "required": [],
}

PIPELINE_SCHEMA = {
    "type": "object",
    "properties": {
        "stages": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "agent": {"type": "string", "description": "Agent slug or name for this stage."},
                    "goal": {"type": "string", "description": "What this stage must accomplish."},
                    "context": {"type": "string", "description": "Stage-specific extra context."},
                },
                "required": ["agent", "goal"],
            },
            "description": "Sequential stages; each stage receives a handover note summarizing the previous stage's result.",
        },
        "context": {"type": "string", "description": "Shared background context injected into every stage."},
        "verify_goal": {"type": "string", "description": "If set, run an independent verifier over this goal after the last stage."},
        "verify_criteria": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Locked acceptance criteria for the final verifier (used with verify_goal).",
        },
        "gate": {"type": "string", "description": "Optional quality gate for the final verifier: G0-G6."},
    },
    "required": ["stages"],
}

VERIFY_SCHEMA = {
    "type": "object",
    "properties": {
        "goal": {"type": "string", "description": "The goal whose completion must be verified."},
        "criteria": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Locked acceptance criteria — the verifier judges exactly these.",
        },
        "gate": {"type": "string", "description": "Optional AgentHub quality gate to include: G0 needs-confirm, G1 design, G2 code review, G3 testing, G4 docs, G5 deploy-ready, G6 release."},
        "evidence": {"type": "string", "description": "Evidence produced by the team (paths, logs, summaries)."},
    },
    "required": ["goal"],
}

KNOWLEDGE_SCHEMA = {
    "type": "object",
    "properties": {
        "query": {"type": "string", "description": "Search accumulated reflections, learned playbooks, and workflow templates."},
        "agent": {"type": "string", "description": "Optional agent slug to scope reflection search."},
        "limit": {"type": "integer", "description": "Maximum results per category, default 8."},
    },
    "required": ["query"],
}


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

def register(ctx) -> None:
    cfg = cluster_config.get_config()
    data_dir = cluster_config.get_data_dir(cfg)
    skill_store = SkillStore(data_dir)
    evolution = ClusterEvolution(
        data_dir,
        skill_store=skill_store,
        promotion_threshold=int(cfg.get("promotion_threshold", 2)),
    )
    guard = Guard(data_dir, enabled=bool(cfg.get("guard_enabled", True)))
    handover_limit = int(cfg.get("handover_note_limit", 4000))

    # -- search / inspect / load ------------------------------------------

    def search(args: Dict[str, Any], **kwargs) -> str:
        del kwargs
        query = str(args.get("query", "")).strip()
        if not query:
            return _json({"success": False, "error": "query is required"})
        try:
            limit = min(max(int(args.get("limit", 8)), 1), 25)
        except Exception:
            limit = 8
        results = roster.search(
            query,
            source=str(args.get("source", "")),
            division=str(args.get("division", "")),
            limit=limit,
        )
        return _json({"success": True, "query": query, "count": len(results), "results": results})

    def inspect(args: Dict[str, Any], **kwargs) -> str:
        del kwargs
        identifier = _identifier(args)
        agent = roster.lookup(identifier)
        if not agent:
            return _json(_not_found(identifier))
        payload: Dict[str, Any] = {"success": True, "agent": roster.summary(agent)}
        if bool(args.get("include_body", False)):
            payload["body"] = agent.get("body", "")
        return _json(payload)

    def load(args: Dict[str, Any], **kwargs) -> str:
        del kwargs
        identifier = _identifier(args)
        agent = roster.lookup(identifier)
        if not agent:
            return _json(_not_found(identifier))
        return _json({
            "success": True,
            "agent": roster.summary(agent),
            "prompt": prompts.specialist_prompt(
                agent, task=str(args.get("task", "")), evolution=evolution
            ),
        })

    # -- delegate (single / parallel batch) ---------------------------------

    def _dispatch_tracked(tool_name: str, tool_args: Dict[str, Any]) -> Any:
        global _inflight
        with _inflight_lock:
            _inflight += 1
        try:
            return ctx.dispatch_tool(tool_name, tool_args)
        finally:
            with _inflight_lock:
                _inflight -= 1

    def delegate(args: Dict[str, Any], **kwargs) -> str:
        del kwargs
        assignments = args.get("assignments")
        shared_context = str(args.get("context", "")).strip()
        role = str(args.get("role", "")).strip() or None

        if isinstance(assignments, list) and assignments:
            tasks: List[Dict[str, Any]] = []
            resolved: List[Dict[str, Any]] = []
            for item in assignments:
                if not isinstance(item, dict):
                    return _json({"success": False, "error": "each assignment must be an object"})
                agent = roster.lookup(str(item.get("agent", "")).strip())
                goal = str(item.get("goal", "")).strip()
                if not agent:
                    return _json(_not_found(str(item.get("agent", ""))))
                if not goal:
                    return _json({"success": False, "error": "each assignment needs a goal"})
                composed = prompts.specialist_prompt(agent, task=goal, evolution=evolution)
                extra = str(item.get("context", "")).strip()
                parts = [part for part in (shared_context, extra) if part]
                if parts:
                    composed += "\n\n## Additional context\n" + "\n\n".join(parts)
                task_entry: Dict[str, Any] = {"goal": goal, "context": composed}
                if role:
                    task_entry["role"] = role
                tasks.append(task_entry)
                resolved.append(agent)
            try:
                raw = _dispatch_tracked("delegate_task", {"tasks": tasks})
            except Exception as exc:
                return _json({"success": False, "error": f"delegate_task unavailable: {exc}"})
            result_text = orchestrator.extract_result_text(raw)
            failed = orchestrator.delegate_result_failed(raw)
            for agent, task_entry in zip(resolved, tasks):
                try:
                    evolution.record_execution(
                        agent["slug"],
                        task_entry["goal"],
                        "failure" if failed else "success",
                        result_text[:1500],
                        kind="delegate-batch",
                    )
                except Exception:
                    logger.debug("evolution record failed", exc_info=True)
            return _json({
                "success": not failed,
                "agents": [roster.summary(agent) for agent in resolved],
                "result": result_text,
            })

        identifier = _identifier(args)
        agent = roster.lookup(identifier)
        task = str(args.get("task", "")).strip()
        if not agent:
            return _json(_not_found(identifier))
        if not task:
            return _json({"success": False, "error": "task is required"})
        composed = prompts.specialist_prompt(agent, task=task, evolution=evolution)
        if shared_context:
            composed += "\n\n## Additional context\n" + shared_context
        delegate_args: Dict[str, Any] = {"goal": task, "context": composed}
        if role:
            delegate_args["role"] = role
        try:
            raw = _dispatch_tracked("delegate_task", delegate_args)
        except Exception as exc:
            # Degrade to returning the composed prompt (agency-router parity)
            # so the main agent can still adopt the specialist inline.
            return _json({
                "success": True,
                "agent": roster.summary(agent),
                "delegated": False,
                "warning": f"delegate_task unavailable: {exc}",
                "prompt": composed,
            })
        result_text = orchestrator.extract_result_text(raw)
        failed = orchestrator.delegate_result_failed(raw)
        try:
            evolution.record_execution(
                agent["slug"], task,
                "failure" if failed else "success",
                result_text[:1500],
                kind="delegate",
            )
        except Exception:
            logger.debug("evolution record failed", exc_info=True)
        return _json({
            "success": not failed,
            "agent": roster.summary(agent),
            "delegated": True,
            "result": result_text,
        })

    # -- pipeline ------------------------------------------------------------

    def pipeline(args: Dict[str, Any], **kwargs) -> str:
        del kwargs
        stages = args.get("stages")
        if not isinstance(stages, list) or not stages:
            return _json({"success": False, "error": "stages is required"})
        try:
            report = orchestrator.run_pipeline(
                _dispatch_tracked,
                stages,
                context=str(args.get("context", "")),
                evolution=evolution,
                handover_note_limit=handover_limit,
            )
        except Exception as exc:
            return _json({"success": False, "error": f"pipeline failed: {exc}"})
        verify_goal = str(args.get("verify_goal", "")).strip()
        if report.get("success") and verify_goal:
            criteria = [str(c) for c in (args.get("verify_criteria") or []) if str(c).strip()]
            evidence = "\n\n".join(
                f"[stage {s['stage']} — {s['agent']}]\n{s['result'][:1200]}"
                for s in report.get("stages", [])
            )
            verification = orchestrator.run_verifier(
                _dispatch_tracked,
                verify_goal,
                criteria,
                gate=str(args.get("gate", "")),
                evidence=evidence,
            )
            report["verification"] = verification
            if verification.get("verdict") == "fail":
                report["success"] = False
                report["error"] = "final verification failed — see verification.report for gaps"
        return _json(report)

    # -- verify ---------------------------------------------------------------

    def verify(args: Dict[str, Any], **kwargs) -> str:
        del kwargs
        goal = str(args.get("goal", "")).strip()
        if not goal:
            return _json({"success": False, "error": "goal is required"})
        criteria = [str(c) for c in (args.get("criteria") or []) if str(c).strip()]
        gate = str(args.get("gate", "")).strip()
        if not criteria and not gate:
            return _json({"success": False, "error": "provide criteria and/or a gate (G0-G6)"})
        try:
            verification = orchestrator.run_verifier(
                _dispatch_tracked,
                goal,
                criteria,
                gate=gate,
                evidence=str(args.get("evidence", "")),
            )
        except Exception as exc:
            return _json({"success": False, "error": f"verifier failed: {exc}"})
        return _json({"success": True, **verification})

    # -- knowledge -------------------------------------------------------------

    def knowledge(args: Dict[str, Any], **kwargs) -> str:
        del kwargs
        query = str(args.get("query", "")).strip()
        if not query:
            return _json({"success": False, "error": "query is required"})
        try:
            limit = min(max(int(args.get("limit", 8)), 1), 25)
        except Exception:
            limit = 8
        results = evolution.search_knowledge(query, slug=str(args.get("agent", "")).strip(), limit=limit)
        return _json({"success": True, "query": query, **results})

    # -- hooks -------------------------------------------------------------------

    def on_subagent_stop(**kwargs) -> None:
        """Fallback recorder for delegations made outside cluster tools."""
        with _inflight_lock:
            if _inflight > 0:
                return  # a cluster tool is mid-delegation and records itself
        try:
            evolution.record_execution(
                "_unattributed",
                str(kwargs.get("child_summary") or "")[:500],
                "success" if str(kwargs.get("child_status") or "") == "success" else "failure",
                kind="subagent_stop",
            )
        except Exception:
            logger.debug("subagent_stop fallback record failed", exc_info=True)

    ctx.register_tool(
        name="cluster_search",
        toolset=TOOLSET,
        schema=SEARCH_SCHEMA,
        handler=search,
        description=(
            "Search the unified agent-cluster roster (576 specialists from "
            "agency-agents, ruflo, AgentHub, and OpenOPC) without loading them "
            "all into the prompt. Use this first to find the right specialist "
            "for a task, then cluster_load or cluster_delegate."
        ),
        emoji="🔎",
    )
    ctx.register_tool(
        name="cluster_inspect",
        toolset=TOOLSET,
        schema=INSPECT_SCHEMA,
        handler=inspect,
        description=(
            "Read one cluster specialist by slug or name. Returns metadata "
            "(including org hierarchy for AgentHub roles) and, with "
            "include_body, the full specialist instructions."
        ),
        emoji="🔬",
    )
    ctx.register_tool(
        name="cluster_load",
        toolset=TOOLSET,
        schema=LOAD_SCHEMA,
        handler=load,
        description=(
            "Compose one specialist's full prompt block (persona + learned "
            "playbooks + track record + safety rules) for the current task, "
            "to adopt inline this turn instead of delegating."
        ),
        emoji="📦",
    )
    ctx.register_tool(
        name="cluster_delegate",
        toolset=TOOLSET,
        schema=DELEGATE_SCHEMA,
        handler=delegate,
        description=(
            "Delegate a task to one cluster specialist, or fan out to several "
            "in parallel via assignments[]. Runs through Hermes delegate_task "
            "with the specialist persona injected; every execution is recorded "
            "into the cluster's evolution memory."
        ),
        emoji="🕸️",
    )
    ctx.register_tool(
        name="cluster_pipeline",
        toolset=TOOLSET,
        schema=PIPELINE_SCHEMA,
        handler=pipeline,
        description=(
            "Run a sequential specialist pipeline (architect → coder → tester "
            "style): each stage's result is handed over to the next stage as "
            "context. Optionally finish with an independent verifier "
            "(verify_goal + verify_criteria and/or a G0-G6 gate)."
        ),
        emoji="🔗",
    )
    ctx.register_tool(
        name="cluster_verify",
        toolset=TOOLSET,
        schema=VERIFY_SCHEMA,
        handler=verify,
        description=(
            "Spawn an independent, context-free verifier sub-agent that "
            "checks LOCKED acceptance criteria one by one (optionally "
            "including an AgentHub G0-G6 quality-gate checklist) and returns "
            "a structured PASS/FAIL report. Use before declaring work done."
        ),
        emoji="✅",
    )
    ctx.register_tool(
        name="cluster_knowledge",
        toolset=TOOLSET,
        schema=KNOWLEDGE_SCHEMA,
        handler=knowledge,
        description=(
            "Search the cluster's accumulated knowledge assets: past "
            "execution reflections, auto-promoted playbooks, and standard "
            "workflow templates (AgentHub SOP skills)."
        ),
        emoji="🧠",
    )

    ctx.register_hook("pre_tool_call", guard.pre_tool_call)
    ctx.register_hook("subagent_stop", on_subagent_stop)

    # Note: the roster JSON stays unloaded until the first tool call (lazy).
    logger.info("agent_cluster plugin registered (data dir %s)", data_dir)
