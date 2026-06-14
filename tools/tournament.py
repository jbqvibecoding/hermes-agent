"""Merlion Tournament — N real LLMs each author a full plan → score → user picks → exec.

Each user-selected model produces a *full structured plan* (departments + subtasks +
deps + rationale) via an injected LLM client; a deterministic baseline
(``classify`` → ``build_plan``) is always entered so the tournament has a valid
floor and runs offline with no LLM key. Merlion scores every candidate plan
deterministically on the ``workflow_eee`` dimensions, ranks them best-first, and
recommends the top — but does **not** execute. The operator picks the winner.

On execution the winning plan's department steps are auto-distributed across a
user-supplied model list (round-robin, with same-department steps sharing a model
because they share a spec), backing each subagent with its assigned LLM via a
``spec.model``-assigning adapter resolver. ``orchestrate._execute_step`` loads a
fresh spec per call and passes the same object to the resolver and ``adapter.run``,
so mutating ``spec.model`` in the wrapper is enough — no orchestrate-core change.

Everything is injectable: the LLM client is a ``(model, prompt) -> raw_text``
callable (tests pass a deterministic fake, including a malformed responder), and
LLM fan-out parallelizes only the network call — plan construction (which touches
the sqlite connection via ``select_spec``) stays on the calling thread.
"""

from __future__ import annotations

import concurrent.futures
import json
import time
import uuid
from dataclasses import dataclass
from typing import Any, Callable, Optional

import sqlite3

from tools import merlion_classify, merlion_plan, model_router, orchestrate, workflow_eee
from tools.agent_factory import TAU_HIT
from tools.orchestrate import AdapterResolver

# (model, prompt) -> raw model text. Injected; default wraps auxiliary_client.call_llm.
LlmPlanClient = Callable[[str, str], str]

_KNOWN_DEPTS: frozenset[str] = frozenset(merlion_classify.DEFAULT_DEPARTMENTS)
# Model label for the always-entered deterministic candidate.
BASELINE_MODEL = "(deterministic-baseline)"
_DEFAULT_GEN_TIMEOUT_S = 60.0
_MAX_SUBTASKS = 12  # cap the LLM-authored DAG width
_VALID_TIERS: frozenset[str] = frozenset(orchestrate._EST_BY_TIER)
_MAX_EST = max(orchestrate._EST_BY_TIER.values())


@dataclass
class Candidate:
    """One contestant: a model and the plan it authored (or why it failed)."""

    model: str
    plan: Optional[orchestrate.OrchestrationPlan] = None
    ok: bool = False
    error: str = ""
    latency_ms: int = 0
    score: Optional[workflow_eee.EvaluationScore] = None
    overall: float = 0.0


@dataclass
class TournamentResult:
    brief: str
    # ok candidates best-first by ``overall``, then failures appended.
    candidates: list[Candidate]
    recommended_model: Optional[str] = None
    recommended_plan: Optional[orchestrate.OrchestrationPlan] = None


# ---- planning prompt + tolerant JSON parsing ------------------------------

def _planning_prompt(brief: str) -> str:
    depts = ", ".join(merlion_classify.DEFAULT_DEPARTMENTS)
    return (
        "You are an orchestration planner. Decompose the brief into a department "
        "plan: a small DAG of subtasks owned by departments.\n\n"
        f"Brief:\n{brief}\n\n"
        f"Available departments: {depts}.\n\n"
        "Respond with ONLY a JSON object, no prose, of this exact shape:\n"
        '{"tier":"simple|complex|very_complex","scale":"small|org",'
        '"departments":["eng","finance"],'
        '"subtasks":[{"id":"st0","dept":"eng","goal":"...","deps":[],"rationale":"..."}],'
        '"rationale":"why this plan"}\n\n'
        "Rules: subtask ids are unique; deps reference only earlier subtask ids; "
        "each dept is one of the available departments; "
        f"at most {_MAX_SUBTASKS} subtasks. Do not author a synthesis/fan-in step "
        "— the orchestrator appends it."
    )


def _extract_json_object(raw: str) -> dict[str, Any]:
    """Pull the first JSON object out of a model response (tolerant of fences/prose)."""
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("empty model response")
    start = raw.find("{")
    end = raw.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError("no JSON object in model response")
    data = json.loads(raw[start : end + 1])
    if not isinstance(data, dict):
        raise ValueError("model response is not a JSON object")
    return data


def _plan_from_data(
    conn: sqlite3.Connection,
    brief: str,
    data: dict[str, Any],
    *,
    run_id: str,
    tenant: Optional[str],
    scorer: orchestrate.SpecScorer,
) -> orchestrate.OrchestrationPlan:
    """Map an LLM-authored plan JSON onto a real ``OrchestrationPlan``.

    Reuses ``select_spec`` (retrieve-only per department) for spec resolution and
    appends the canonical synthesis fan-in, so an LLM-authored DAG executes through
    the unchanged drive loop. Fails closed (raises) when no valid subtask survives.
    """
    tier = data.get("tier") if data.get("tier") in _VALID_TIERS else "complex"
    scale = "org" if data.get("scale") == "org" else "small"
    raw_subs = data.get("subtasks")
    if not isinstance(raw_subs, list) or not raw_subs:
        raise ValueError("plan has no subtasks")
    est = orchestrate._EST_BY_TIER.get(tier, 2)

    steps: list[orchestrate.PlanStep] = []
    dept_ids: list[str] = []
    departments: list[str] = []
    prior_ids: set[str] = set()
    for raw in raw_subs[:_MAX_SUBTASKS]:
        if not isinstance(raw, dict):
            continue
        sid = str(raw.get("id") or f"st{len(steps)}")
        if sid in prior_ids:
            sid = f"{sid}_{len(steps)}"
        dept = str(raw.get("dept") or "general")
        if dept not in _KNOWN_DEPTS:
            dept = "general"
        goal = str(raw.get("goal") or raw.get("title") or brief).strip()[:120] or brief[:120]
        # Only earlier ids are valid deps (keeps the DAG acyclic; drops danglers).
        deps = [d for d in (raw.get("deps") or []) if isinstance(d, str) and d in prior_ids]
        rationale = str(raw.get("rationale") or "").strip()
        spec, match = orchestrate.select_spec(conn, dept, brief, tenant=tenant, scorer=scorer)
        steps.append(
            orchestrate.PlanStep(
                subtask=merlion_plan.build_subtask(
                    sid, f"[{dept}] {goal}", spec_id=spec.id if spec else None,
                    dept=dept, est=est, body=rationale or goal, deps=deps,
                ),
                capability_match=match,
                needs_generation=spec is None or match < TAU_HIT,
                needs_approval=orchestrate._needs_approval(dept),
            )
        )
        prior_ids.add(sid)
        dept_ids.append(sid)
        if dept not in departments:
            departments.append(dept)

    if not steps:
        raise ValueError("plan produced no valid subtasks")

    # Canonical synthesis fan-in: depends on every authored step; stays with lead.
    steps.append(
        orchestrate.PlanStep(
            subtask=merlion_plan.build_subtask(
                "syn", "Synthesize department deliverables", dept="lead", est=2,
                body=brief, deps=dept_ids, is_synthesis=True,
            ),
        )
    )
    return orchestrate.OrchestrationPlan(run_id, brief, tier, scale, departments, steps)


# ---- candidate generation -------------------------------------------------

def generate_candidate(
    conn: sqlite3.Connection,
    brief: str,
    model: str,
    *,
    llm: LlmPlanClient,
    run_id: Optional[str] = None,
    tenant: Optional[str] = None,
    scorer: orchestrate.SpecScorer = orchestrate._default_scorer,
) -> Candidate:
    """Single-threaded: call one model, parse, build its candidate plan.

    Fails closed — a bad call or unparseable/empty plan yields ``ok=False`` with
    the error captured, never an exception (so one bad model never sinks a run).
    """
    run_id = run_id or f"run_{uuid.uuid4().hex}"
    t0 = time.monotonic()
    try:
        raw = llm(model, _planning_prompt(brief))
        data = _extract_json_object(raw)
        plan = _plan_from_data(conn, brief, data, run_id=run_id, tenant=tenant, scorer=scorer)
    except Exception as exc:
        return Candidate(model=model, ok=False, error=str(exc)[:200],
                         latency_ms=int((time.monotonic() - t0) * 1000))
    return Candidate(model=model, plan=plan, ok=True,
                     latency_ms=int((time.monotonic() - t0) * 1000))


def deterministic_baseline(
    conn: sqlite3.Connection,
    brief: str,
    *,
    run_id: Optional[str] = None,
    tenant: Optional[str] = None,
    scorer: orchestrate.SpecScorer = orchestrate._default_scorer,
) -> Candidate:
    """The always-entered floor: classify → build_plan. Valid offline, no LLM key."""
    run_id = run_id or f"run_{uuid.uuid4().hex}"
    t0 = time.monotonic()
    try:
        cls = orchestrate.classify_brief(brief)
        plan = orchestrate.build_plan(conn, brief, cls, run_id=run_id, tenant=tenant, scorer=scorer)
    except Exception as exc:
        return Candidate(model=BASELINE_MODEL, ok=False, error=str(exc)[:200],
                         latency_ms=int((time.monotonic() - t0) * 1000))
    return Candidate(model=BASELINE_MODEL, plan=plan, ok=True,
                     latency_ms=int((time.monotonic() - t0) * 1000))


# ---- scoring (deterministic, reuses workflow_eee dimensions) --------------

def score_plan(plan: orchestrate.OrchestrationPlan) -> workflow_eee.EvaluationScore:
    """Score a plan on the four EEE dimensions (all 0..1).

    feasibility = mean per-department capability match; impact = department
    coverage; risk = share of steps needing generation or approval; cost =
    normalized total effort. ``risk``/``cost`` are inverted by ``overall_score``.
    """
    dept_steps = [s for s in plan.steps if not s.subtask.is_synthesis]
    n = len(dept_steps)
    if n == 0:
        return workflow_eee.EvaluationScore()
    feasibility = sum(s.capability_match for s in dept_steps) / n
    impact = len({s.subtask.dept for s in dept_steps}) / len(merlion_classify.DEFAULT_DEPARTMENTS)
    risk = sum(1 for s in dept_steps if s.needs_generation or s.needs_approval) / n
    cost = sum(s.subtask.est for s in dept_steps) / (n * _MAX_EST)
    return workflow_eee.EvaluationScore(
        feasibility=min(1.0, max(0.0, feasibility)),
        impact=min(1.0, max(0.0, impact)),
        risk=min(1.0, max(0.0, risk)),
        cost=min(1.0, max(0.0, cost)),
    )


# ---- the tournament -------------------------------------------------------

def _timed_fetch(llm: LlmPlanClient, model: str, prompt: str) -> tuple[bool, str, int]:
    """Run one model call; return ``(ok, text_or_error, latency_ms)``. Never raises."""
    t0 = time.monotonic()
    try:
        text = llm(model, prompt)
        return True, text, int((time.monotonic() - t0) * 1000)
    except Exception as exc:
        return False, str(exc)[:200], int((time.monotonic() - t0) * 1000)


def run_tournament(
    conn: sqlite3.Connection,
    brief: str,
    models: list[str],
    *,
    llm: Optional[LlmPlanClient] = None,
    weights: Optional[dict] = None,
    tenant: Optional[str] = None,
    scorer: orchestrate.SpecScorer = orchestrate._default_scorer,
    include_baseline: bool = True,
    max_workers: Optional[int] = None,
    timeout_s: float = _DEFAULT_GEN_TIMEOUT_S,
) -> TournamentResult:
    """Fan out N models, score every candidate plan, recommend the best — no exec.

    Only the LLM network calls are parallel (a sqlite connection is not
    thread-shareable); plan construction runs on this thread. The deterministic
    baseline is always entered so there is a valid recommendation even with no
    models / no LLM key. Does not persist or start any run — the operator picks.
    """
    candidates: list[Candidate] = []

    if models:
        if llm is None:
            llm = default_llm_client()
        prompt = _planning_prompt(brief)
        raws: dict[str, tuple[bool, str, int]] = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers or len(models)) as ex:
            futs = {ex.submit(_timed_fetch, llm, m, prompt): m for m in models}
            done, not_done = concurrent.futures.wait(futs, timeout=timeout_s)
            for fut in done:
                raws[futs[fut]] = fut.result()
            for fut in not_done:  # backstop beyond call_llm's own timeout
                raws[futs[fut]] = (False, f"generation timed out after {timeout_s:.0f}s", int(timeout_s * 1000))
        for m in models:  # preserve caller order for failures; ok ones re-sorted below
            ok, payload, lat = raws.get(m, (False, "no result", 0))
            if not ok:
                candidates.append(Candidate(model=m, ok=False, error=payload, latency_ms=lat))
                continue
            try:
                data = _extract_json_object(payload)
                plan = _plan_from_data(conn, brief, data, run_id=f"run_{uuid.uuid4().hex}",
                                       tenant=tenant, scorer=scorer)
                candidates.append(Candidate(model=m, plan=plan, ok=True, latency_ms=lat))
            except Exception as exc:
                candidates.append(Candidate(model=m, ok=False, error=str(exc)[:200], latency_ms=lat))

    if include_baseline:
        candidates.append(deterministic_baseline(conn, brief, tenant=tenant, scorer=scorer))

    for c in candidates:
        if c.ok and c.plan is not None:
            c.score = score_plan(c.plan)
            c.overall = workflow_eee.overall_score(c.score, weights)

    ok_cands = sorted((c for c in candidates if c.ok), key=lambda c: c.overall, reverse=True)
    failed = [c for c in candidates if not c.ok]
    ordered = ok_cands + failed
    top = ok_cands[0] if ok_cands else None
    return TournamentResult(
        brief=brief,
        candidates=ordered,
        recommended_model=top.model if top else None,
        recommended_plan=top.plan if top else None,
    )


# ---- execution: auto-distribute models across the winning plan ------------

def assign_exec_models(
    plan: orchestrate.OrchestrationPlan, exec_models: list[str]
) -> dict[str, str]:
    """Map ``spec_id -> model`` round-robin across the plan's department steps.

    Same-department steps share a spec, so they naturally share a model
    (department affinity). The synthesis step has no spec and is left on the lead
    default. Empty ``exec_models`` → no assignment (everything runs on defaults).
    """
    if not exec_models:
        return {}
    mapping: dict[str, str] = {}
    i = 0
    for step in plan.steps:
        if step.subtask.is_synthesis:
            continue
        spec_id = step.subtask.spec_id
        if not spec_id or spec_id in mapping:
            continue
        mapping[spec_id] = exec_models[i % len(exec_models)]
        i += 1
    return mapping


def make_model_assigning_resolver(
    base: AdapterResolver, spec_model: dict[str, str]
) -> AdapterResolver:
    """Wrap a resolver so each spec runs on its assigned model.

    ``orchestrate._execute_step`` loads a fresh spec per call and hands the same
    object to the resolver and ``adapter.run``; setting ``spec.model`` here makes
    ``worker_adapter.resolve_model`` pick the assigned LLM. No core change needed.
    """
    if not spec_model:
        return base

    def _resolve(spec: Any) -> Any:
        assigned = spec_model.get(spec.id)
        if assigned:
            spec.model = assigned
        return base(spec)

    return _resolve


# ---- default LLM client (wraps the central call_llm) ----------------------

def default_llm_client(
    *, temperature: float = 0.7, max_tokens: int = 2000, timeout: float = _DEFAULT_GEN_TIMEOUT_S
) -> LlmPlanClient:
    """Real client: route ``model`` to its provider and call the central LLM.

    Imported lazily so this module stays importable (and unit-testable with a fake
    ``llm``) without the heavy ``auxiliary_client`` runtime or any API key.
    """

    def _llm(model: str, prompt: str) -> str:
        from agent.auxiliary_client import call_llm

        resp = call_llm(
            provider=model_router.provider_of(model),
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
            timeout=timeout,
        )
        return resp.choices[0].message.content

    return _llm
