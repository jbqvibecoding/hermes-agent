"""Orchestration on top of Hermes' ``delegate_task``.

Two crew44 patterns re-implemented in Python:

- **Pipeline (sequential handover)** — crew44's ``runChat`` baton-passing:
  each stage's specialist runs as a delegated child; a truncated summary of
  its result is carried into the next stage as a "Handover from <agent>"
  note (``daemon/internal/app/handover.go`` semantics).
- **Goal verifier** — crew44's ``goal.go`` gate: an isolated child with NO
  pipeline context re-checks locked acceptance criteria one by one, and may
  be given an AgentHub G0-G6 gate checklist (``assets/gates.json``) on top.

Execution always flows through ``ctx.dispatch_tool("delegate_task", ...)``
so Hermes' own concurrency caps, spawn-depth limits, and restricted child
toolsets apply unchanged. Direct Python dispatch is synchronous
(``tools/delegate_tool.py`` keeps the historical synchronous default for
non-model callers), which is what makes sequential chaining possible.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from . import prompts, roster
from .evolution import ClusterEvolution

_GATES_PATH = Path(__file__).resolve().parent.parent / "assets" / "gates.json"

_gates_cache: Optional[Dict[str, Any]] = None


def load_gates() -> Dict[str, Any]:
    global _gates_cache
    if _gates_cache is None:
        _gates_cache = json.loads(_GATES_PATH.read_text(encoding="utf-8"))
    return _gates_cache


def gate_criteria(gate: str) -> List[str]:
    gate = (gate or "").strip().upper()
    data = load_gates()
    items = data.get("checklists", {}).get(gate, [])
    return [f"{item['label']}: {item['criteria']}" for item in items]


def extract_result_text(raw_result: Any) -> str:
    """Pull the child's answer text out of a delegate_task JSON result."""
    if not isinstance(raw_result, str):
        return str(raw_result)
    try:
        payload = json.loads(raw_result)
    except Exception:
        return raw_result
    if isinstance(payload, dict):
        results = payload.get("results")
        if isinstance(results, list) and results:
            parts = []
            for item in results:
                if isinstance(item, dict):
                    parts.append(
                        str(
                            item.get("result")
                            or item.get("summary")
                            or item.get("output")
                            or json.dumps(item, ensure_ascii=False)
                        )
                    )
                else:
                    parts.append(str(item))
            return "\n\n".join(parts)
        for key in ("result", "summary", "output", "error"):
            if payload.get(key):
                return str(payload[key])
    return raw_result


def delegate_result_failed(raw_result: Any) -> bool:
    """Best-effort failure detection on a delegate_task JSON result."""
    if not isinstance(raw_result, str):
        return False
    try:
        payload = json.loads(raw_result)
    except Exception:
        return False
    if isinstance(payload, dict):
        if payload.get("error"):
            return True
        results = payload.get("results")
        if isinstance(results, list):
            return any(
                isinstance(item, dict)
                and (item.get("error") or item.get("status") in {"failed", "error"})
                for item in results
            )
    return False


def run_pipeline(
    dispatch: Callable[[str, Dict[str, Any]], Any],
    stages: List[Dict[str, Any]],
    context: str = "",
    evolution: Optional[ClusterEvolution] = None,
    handover_note_limit: int = 4000,
    agents: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Run stages sequentially, carrying handover notes between them.

    ``dispatch`` is ``ctx.dispatch_tool`` (injected for testability). Each
    stage: {"agent": slug, "goal": str, optional "context": str}.
    """
    handover = ""
    stage_reports: List[Dict[str, Any]] = []
    for index, stage in enumerate(stages):
        identifier = str(stage.get("agent", "")).strip()
        goal = str(stage.get("goal", "")).strip()
        agent = roster.lookup(identifier, agents)
        if agent is None:
            return {
                "success": False,
                "error": f"stage {index + 1}: agent not found: {identifier}",
                "stages": stage_reports,
            }
        if not goal:
            return {
                "success": False,
                "error": f"stage {index + 1}: goal is required",
                "stages": stage_reports,
            }
        stage_context_parts = [part for part in (context, str(stage.get("context", "")).strip()) if part]
        composed = prompts.specialist_prompt(
            agent,
            task=goal,
            evolution=evolution,
            handover=handover,
        )
        if stage_context_parts:
            composed += "\n\n## Additional context\n" + "\n\n".join(stage_context_parts)
        raw = dispatch("delegate_task", {"goal": goal, "context": composed})
        result_text = extract_result_text(raw)
        failed = delegate_result_failed(raw)
        outcome = "failure" if failed else "success"
        if evolution is not None:
            try:
                evolution.record_execution(
                    agent["slug"], goal, outcome, result_text[:1500], kind="pipeline"
                )
            except Exception:
                pass
        stage_reports.append(
            {
                "stage": index + 1,
                "agent": agent["slug"],
                "goal": goal,
                "outcome": outcome,
                "result": result_text,
            }
        )
        if failed:
            return {
                "success": False,
                "error": f"stage {index + 1} ({agent['slug']}) failed",
                "stages": stage_reports,
            }
        handover = prompts.handover_note(agent["name"], result_text, handover_note_limit)
    return {"success": True, "stages": stage_reports}


def build_verifier_prompt(
    goal: str,
    criteria: List[str],
    gate: str = "",
    evidence: str = "",
) -> str:
    """Compose the isolated verifier's instructions (crew44 goal.go pattern).

    The criteria list is LOCKED: the verifier must judge exactly these items,
    may not add, drop, or reinterpret them, and must show evidence per item.
    """
    locked = list(criteria)
    if gate:
        locked.extend(gate_criteria(gate))
    numbered = "\n".join(f"{i + 1}. {item}" for i, item in enumerate(locked))
    gate_line = ""
    if gate:
        labels = load_gates().get("labels", {})
        gate_line = f"\nQuality gate: {gate.upper()} ({labels.get(gate.upper(), '')}) — its checklist items are included above.\n"
    evidence_block = f"\n## Evidence provided by the team\n{evidence.strip()}\n" if evidence.strip() else ""
    return (
        "You are an independent goal verifier. You have NO prior context of the "
        "work — judge only what you can verify yourself (read files, run "
        "checks) plus the evidence below. Do not trust claims without "
        "verification.\n\n"
        f"## Goal\n{goal.strip()}\n"
        f"{gate_line}"
        f"\n## Locked acceptance criteria (verify EXACTLY these, in order)\n{numbered}\n"
        f"{evidence_block}\n"
        "## Required output format\n"
        "For each criterion output one line:\n"
        "  <number>. PASS|FAIL — <one-line evidence>\n"
        "Then a final line:\n"
        "  VERDICT: PASS (all criteria passed) or VERDICT: FAIL — <gaps>\n"
        "A single failing criterion means VERDICT: FAIL. Never soften a FAIL."
    )


def run_verifier(
    dispatch: Callable[[str, Dict[str, Any]], Any],
    goal: str,
    criteria: List[str],
    gate: str = "",
    evidence: str = "",
) -> Dict[str, Any]:
    prompt = build_verifier_prompt(goal, criteria, gate=gate, evidence=evidence)
    raw = dispatch(
        "delegate_task",
        {"goal": f"Verify goal completion: {goal[:120]}", "context": prompt, "role": "leaf"},
    )
    result_text = extract_result_text(raw)
    verdict = "unknown"
    upper = result_text.upper()
    if "VERDICT: PASS" in upper:
        verdict = "pass"
    elif "VERDICT: FAIL" in upper:
        verdict = "fail"
    return {"verdict": verdict, "report": result_text}
