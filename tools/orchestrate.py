"""Merlion orchestration core — classify → plan → materialize → drive.

Wires the already-built pieces into one run:
  * ``merlion_classify`` → tier/scale/departments,
  * ``spec_registry`` + ``task_router.route_score`` → retrieve-only spec per
    department (no live generation; low scores are flagged ``needs_generation``),
  * ``merlion_plan`` → rich Subtask DAG (department steps + a synthesis step),
  * ``kanban_db`` → the single execution/state store (one board per run, DAG
    edges via task parents), driven tick-by-tick with ``worker_adapter``.

Pure/injectable: the spec scorer and the per-spec adapter resolver are injected,
so plan building and the drive loop are unit-testable without a live LLM or
OpenClaw. The real delegate-backed adapter resolver lives in
``tools/orchestrate_exec.py``.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional

import sqlite3

from hermes_cli import kanban_db as kb
from hermes_cli import spec_registry as reg
from hermes_cli.subagent_spec import FourPartContract, SubagentSpec
from tools import merlion_classify, merlion_events, merlion_plan
from tools import orchestrate_store as store
from tools import task_router
from tools.agent_factory import TAU_HIT
from tools.multica_reconciler import ControlSignal
from tools.worker_adapter import OUTCOME_PASS, WorkerAdapter, WorkerTask, run_and_record

def open_conn(db_path: Optional[Any] = None) -> sqlite3.Connection:
    """Open a kanban-backed connection with both spec and run schemas ensured.

    Per-path/per-thread: open a fresh connection in each thread that drives a run
    (sqlite connections are not shareable across threads). A string path is
    coerced to ``Path`` (kanban_db expects ``Path``).
    """
    if db_path is not None and not isinstance(db_path, Path):
        db_path = Path(db_path)
    conn = reg.connect(db_path=db_path)
    store.ensure_run_schema(conn)
    return conn


# Effort estimate per tier (drives Subtask dur/arts derivation).
_EST_BY_TIER: dict[str, int] = {"simple": 1, "complex": 2, "very_complex": 3}
# Department fan-out cap per scale (PRD MAXP-style breadth limit).
_MAX_DEPTS_BY_SCALE: dict[str, int] = {"small": 3, "org": 6}

# Departments whose work is risk-sensitive → parked for human approval before run.
_APPROVAL_DEPTS: frozenset[str] = frozenset({"compliance", "infra"})
# Kanban statuses considered terminal / not-redispatchable.
_TERMINAL: frozenset[str] = frozenset({"done", "archived", "blocked"})

# Score a spec's fit for a brief (retrieve-only capability signal, 0..1).
SpecScorer = Callable[[SubagentSpec, str], float]
# Pick the concrete adapter for a resolved spec (in-process vs OpenClaw worker).
AdapterResolver = Callable[[SubagentSpec], WorkerAdapter]
# Emit a run event (SSE/log sink). Receives a plain dict.
EventSink = Callable[[dict[str, Any]], None]
# Reverse-control: supplies the latest operator signal from the board each tick.
ControlSource = Callable[[], ControlSignal]


def _needs_approval(dept: str) -> bool:
    """Whether a department's work is gated on human approval (risk-sensitive)."""
    return dept in _APPROVAL_DEPTS


@dataclass
class PlanStep:
    """One materialized plan step (a Merlion Subtask + its resolved spec)."""

    subtask: merlion_plan.Subtask
    capability_match: float = 0.0
    needs_generation: bool = False
    needs_approval: bool = False  # parked until a human approves on the board


@dataclass
class OrchestrationPlan:
    run_id: str
    brief: str
    tier: str
    scale: str
    departments: list[str] = field(default_factory=list)
    steps: list[PlanStep] = field(default_factory=list)
    task_map: dict[str, str] = field(default_factory=dict)  # subtask_id -> kanban task id

    @property
    def needs_generation(self) -> list[str]:
        return [s.subtask.dept or s.subtask.id for s in self.steps if s.needs_generation]

    def preview(self) -> dict[str, Any]:
        return {
            "runId": self.run_id,
            "tier": self.tier,
            "scale": self.scale,
            "departments": list(self.departments),
            "needsGeneration": self.needs_generation,
            "subtasks": [_subtask_preview(s) for s in self.steps],
        }

    def to_store_dict(self) -> dict[str, Any]:
        return {"task_map": dict(self.task_map), "subtasks": [_subtask_full(s) for s in self.steps]}


def _subtask_preview(step: PlanStep) -> dict[str, Any]:
    st = step.subtask
    return {
        "id": st.id, "title": st.title, "dept": st.dept, "spec_id": st.spec_id,
        "est": st.est, "dur": st.dur, "arts": st.arts, "deps": list(st.deps),
        "is_synthesis": st.is_synthesis, "needs_generation": step.needs_generation,
        "needs_approval": step.needs_approval,
    }


def _subtask_full(step: PlanStep) -> dict[str, Any]:
    d = _subtask_preview(step)
    d["body"] = step.subtask.body
    d["capability_match"] = step.capability_match
    return d


# ---- classify -------------------------------------------------------------

def classify_brief(
    brief: str,
    *,
    upload: bool = False,
    scale_hint: Optional[str] = None,
    has_mode: bool = True,
    llm: Optional[merlion_classify.LlmClassifier] = None,
) -> merlion_classify.Classification:
    return merlion_classify.classify(
        brief, upload=upload, scale_hint=scale_hint, has_mode=has_mode, llm=llm
    )


# ---- spec selection (retrieve-only) ---------------------------------------

def _default_scorer(spec: SubagentSpec, brief: str) -> float:
    """Lexical overlap of brief tokens vs the spec's tags/domain/name → [0,1]."""
    brief_tokens = {t for t in brief.lower().split() if len(t) >= 4}
    spec_tokens = {t.lower() for t in (*spec.capability_tags, spec.domain, *spec.name.split())}
    spec_tokens = {t for t in spec_tokens if t}
    if not spec_tokens:
        return 0.4
    inter = len(brief_tokens & spec_tokens)
    return min(1.0, 0.4 + 0.2 * inter)  # base 0.4, +0.2 per overlapping token


def select_spec(
    conn: sqlite3.Connection,
    dept: str,
    brief: str,
    *,
    tenant: Optional[str] = None,
    scorer: SpecScorer = _default_scorer,
) -> tuple[Optional[SubagentSpec], float]:
    """Best active spec for a department by route_score (retrieve-only).

    Returns ``(spec, capability_match)``; ``(None, 0.0)`` when the domain has no
    active spec. The caller treats ``capability_match < TAU_HIT`` as
    ``needs_generation`` (a real Factory generation pass is future work).
    """
    candidates = reg.list_specs(conn, domain=dept, tenant=tenant, status="active")
    if not candidates:
        return None, 0.0
    best: Optional[SubagentSpec] = None
    best_score = float("-inf")
    best_match = 0.0
    for spec in candidates:
        match = max(0.0, min(1.0, scorer(spec, brief)))
        score = task_router.route_score(spec, capability_match=match)
        if score > best_score:
            best, best_score, best_match = spec, score, match
    return best, best_match


# ---- plan building --------------------------------------------------------

def build_plan(
    conn: sqlite3.Connection,
    brief: str,
    cls: merlion_classify.Classification,
    *,
    run_id: Optional[str] = None,
    tenant: Optional[str] = None,
    scorer: SpecScorer = _default_scorer,
) -> OrchestrationPlan:
    """Build a Subtask DAG: one step per department + a synthesis fan-in.

    ``simple`` tier collapses to a single step. The synthesis step depends on
    every department step and is always retained for the lead (no spec).
    """
    run_id = run_id or f"run_{uuid.uuid4().hex}"
    est = _EST_BY_TIER.get(cls.tier, 2)

    if cls.tier == "simple":
        spec, match = select_spec(conn, "general", brief, tenant=tenant, scorer=scorer)
        step = PlanStep(
            subtask=merlion_plan.build_subtask(
                "st0", _step_title("general", brief), spec_id=spec.id if spec else None,
                dept="general", est=1, body=brief,
            ),
            capability_match=match,
            needs_generation=spec is None or match < TAU_HIT,
        )
        return OrchestrationPlan(run_id, brief, cls.tier, cls.scale, ["general"], [step])

    cap = _MAX_DEPTS_BY_SCALE.get(cls.scale, 3)
    departments = (cls.suggested_departments or merlion_classify.DEFAULT_DEPARTMENTS)[:cap]

    steps: list[PlanStep] = []
    dept_ids: list[str] = []
    for i, dept in enumerate(departments):
        spec, match = select_spec(conn, dept, brief, tenant=tenant, scorer=scorer)
        sid = f"st{i}"
        dept_ids.append(sid)
        steps.append(
            PlanStep(
                subtask=merlion_plan.build_subtask(
                    sid, _step_title(dept, brief), spec_id=spec.id if spec else None,
                    dept=dept, est=est, body=brief,
                ),
                capability_match=match,
                needs_generation=spec is None or match < TAU_HIT,
                needs_approval=_needs_approval(dept),
            )
        )

    # Synthesis fan-in: depends on every department step; stays with the lead.
    steps.append(
        PlanStep(
            subtask=merlion_plan.build_subtask(
                "syn", "Synthesize department deliverables", dept="lead", est=2,
                body=brief, deps=dept_ids, is_synthesis=True,
            ),
        )
    )
    return OrchestrationPlan(run_id, brief, cls.tier, cls.scale, departments, steps)


def _step_title(dept: str, brief: str) -> str:
    head = brief.strip().splitlines()[0][:80] if brief.strip() else "task"
    return f"[{dept}] {head}"


# ---- materialization + persistence ----------------------------------------

def start_run(
    conn: sqlite3.Connection,
    plan: OrchestrationPlan,
    *,
    tenant: Optional[str] = None,
) -> str:
    """Materialize the plan as kanban tasks (one board=run_id) and persist header.

    Department steps are created first (no parents → ``ready``); the synthesis
    step is created with those task ids as parents (→ ``todo`` until they finish).
    The static plan (with the subtask→task map) is stored in ``merlion_runs``.
    """
    board = plan.run_id
    # Department steps first so the synthesis step can reference their task ids.
    for step in plan.steps:
        if step.subtask.is_synthesis:
            continue
        tid = kb.create_task(
            conn, title=step.subtask.title, body=step.subtask.body,
            assignee=step.subtask.spec_id, tenant=tenant, board=board,
        )
        plan.task_map[step.subtask.id] = tid

    for step in plan.steps:
        if not step.subtask.is_synthesis:
            continue
        parents = [plan.task_map[d] for d in step.subtask.deps if d in plan.task_map]
        tid = kb.create_task(
            conn, title=step.subtask.title, body=step.subtask.body,
            assignee=step.subtask.spec_id, tenant=tenant, board=board, parents=parents,
        )
        plan.task_map[step.subtask.id] = tid

    store.create_run(
        conn, run_id=plan.run_id, brief=plan.brief, tier=plan.tier, scale=plan.scale,
        departments=plan.departments, plan=plan.to_store_dict(), board_id=board,
        tenant=tenant, status="running",
    )
    return plan.run_id


def initial_events(plan: OrchestrationPlan) -> list[dict[str, Any]]:
    """The frames emitted right after a run starts: plan.ready then team.join×N."""
    events: list[dict[str, Any]] = [
        {"event": "plan.ready", "run_id": plan.run_id, "plan": plan.preview()}
    ]
    for step in plan.steps:
        if step.subtask.is_synthesis:
            continue
        events.append(
            {
                "event": "team.join", "run_id": plan.run_id, "dept": step.subtask.dept,
                "spec_id": step.subtask.spec_id, "subtask_id": step.subtask.id,
            }
        )
        if step.needs_approval:
            events.append(
                {
                    "event": "task.awaiting_approval", "run_id": plan.run_id,
                    "subtask_id": step.subtask.id, "dept": step.subtask.dept,
                }
            )
    return events


# ---- snapshot -------------------------------------------------------------

def run_snapshot(conn: sqlite3.Connection, run_id: str) -> Optional[dict[str, Any]]:
    """Merge the static plan with live kanban task status."""
    rec = store.get_run(conn, run_id)
    if rec is None:
        return None
    task_map: dict[str, str] = rec.plan.get("task_map", {})
    subtasks_out: list[dict[str, Any]] = []
    for st in rec.plan.get("subtasks", []):
        tid = task_map.get(st["id"])
        task = kb.get_task(conn, tid) if tid else None
        subtasks_out.append({**st, "task_id": tid, "status": task.status if task else "unknown"})
    return {
        "runId": rec.run_id, "brief": rec.brief, "tier": rec.tier, "scale": rec.scale,
        "departments": rec.departments, "status": rec.status, "subtasks": subtasks_out,
    }


# ---- drive loop -----------------------------------------------------------

def _contract_for(spec: SubagentSpec, subtask: dict[str, Any]) -> FourPartContract:
    if spec.contract_template:
        return spec.contract_template
    return FourPartContract(objective=subtask.get("title", ""))


def advance_run(
    conn: sqlite3.Connection,
    run_id: str,
    *,
    resolve_adapter: AdapterResolver,
    emit: Optional[EventSink] = None,
    max_parallel: int = 4,
    control: Optional[ControlSource] = None,
) -> tuple[list[dict[str, Any]], bool]:
    """Run one dispatch tick. Returns ``(events, complete)``.

    Promotes ready tasks, then for each ready step (up to ``max_parallel`` live
    workers) claims it and runs its spec through the resolved adapter in-process,
    completing/failing the kanban task and recording the outcome. The synthesis
    step (no spec) is a deterministic fan-in. ``complete`` is True once every
    step is terminal; the caller stops looping and the run is marked done/failed.

    ``control`` (reverse control) is consulted at the start of every tick: the
    operator can cancel the whole run, cancel a subtask, approve a parked
    approval-gated subtask, or reassign a subtask to a different spec — all
    driven by their actions on the Multica board.
    """
    events: list[dict[str, Any]] = []

    def _push(ev: dict[str, Any]) -> None:
        events.append(ev)
        if emit is not None:
            emit(ev)

    rec = store.get_run(conn, run_id)
    if rec is None:
        return events, True
    task_map: dict[str, str] = rec.plan.get("task_map", {})
    subtasks: list[dict[str, Any]] = rec.plan.get("subtasks", [])
    by_id = {st["id"]: st for st in subtasks}

    # ---- reverse control: apply the operator's board actions first ----------
    # The approval gate only applies when a board/control source exists — a
    # headless run has no one to approve, so it must not deadlock.
    gate_approval = control is not None
    signal = control() if control is not None else ControlSignal()
    pre = {sid: (kb.get_task(conn, tid).status if kb.get_task(conn, tid) else "unknown")
           for sid, tid in task_map.items()}

    if signal.cancel_run:
        for sid, tid in task_map.items():
            if pre.get(sid) in {"todo", "ready", "running"}:
                kb.block_task(conn, tid, reason="run cancelled by operator")
        store.update_run(conn, run_id, status="cancelled")
        _push({"event": "run.cancelled", "run_id": run_id, "status": "cancelled"})
        return events, True

    for sid in signal.cancel_subtasks:
        tid = task_map.get(sid)
        if tid and pre.get(sid) in {"todo", "ready", "running"}:
            kb.block_task(conn, tid, reason="subtask cancelled by operator")
            _push({"event": "task.cancelled", "run_id": run_id, "subtask_id": sid,
                   "task_id": tid, "dept": by_id.get(sid, {}).get("dept")})

    if signal.reassign:
        changed = False
        for sid, new_spec in signal.reassign.items():
            st = by_id.get(sid)
            if st and st.get("spec_id") != new_spec and pre.get(sid) in {"todo", "ready"}:
                st["spec_id"] = new_spec
                changed = True
                _push({"event": "task.reassigned", "run_id": run_id, "subtask_id": sid,
                       "task_id": task_map.get(sid), "spec_id": new_spec})
        if changed:
            store.update_run(conn, run_id, plan={"task_map": task_map, "subtasks": subtasks})

    kb.recompute_ready(conn)
    statuses = {sid: (kb.get_task(conn, tid).status if kb.get_task(conn, tid) else "unknown")
                for sid, tid in task_map.items()}
    running = sum(1 for s in statuses.values() if s == "running")

    for sid, tid in task_map.items():
        if statuses.get(sid) != "ready":
            continue
        if running >= max_parallel:
            break
        st = by_id.get(sid, {})
        # Approval gate: a risk-sensitive step waits until the operator approves
        # it on the board (signal.approve_subtasks), even though kanban says ready.
        if gate_approval and st.get("needs_approval") and sid not in signal.approve_subtasks:
            continue
        if not kb.claim_task(conn, tid):
            continue
        running += 1
        _push({"event": "task.start", "run_id": run_id, "subtask_id": sid,
               "task_id": tid, "dept": st.get("dept")})
        result = _execute_step(conn, tid, st, rec, by_id, statuses, resolve_adapter)
        if result.outcome == OUTCOME_PASS:
            kb.complete_task(conn, tid, summary=result.summary)
            _push({"event": "task.done", "run_id": run_id, "subtask_id": sid,
                   "task_id": tid, "dept": st.get("dept"), "summary": result.summary})
        else:
            # No kanban fail_task; a failed in-process worker parks the task in
            # 'blocked' (terminal for this run; Recovery is future work).
            kb.block_task(conn, tid, reason=result.failure_note or result.summary or result.outcome)
            _push({"event": "task.failed", "run_id": run_id, "subtask_id": sid,
                   "task_id": tid, "dept": st.get("dept"), "outcome": result.outcome})
        statuses[sid] = "done" if result.outcome == OUTCOME_PASS else "blocked"
        running -= 1

    # A run is complete when nothing is actionable after a fresh promotion pass:
    # no task is 'ready' or 'running', and none can become ready (a todo whose
    # parent is 'blocked' is permanently stuck — recompute_ready won't promote
    # it, so it counts as terminal-failure, not progress).
    kb.recompute_ready(conn)
    final = {sid: (kb.get_task(conn, tid).status if kb.get_task(conn, tid) else "unknown")
             for sid, tid in task_map.items()}
    actionable = any(s in {"ready", "running"} for s in final.values())
    complete = bool(final) and not actionable
    if complete:
        any_not_done = any(s != "done" for s in final.values())
        status = "failed" if any_not_done else "done"
        store.update_run(conn, run_id, status=status)
        _push({"event": "run.done", "run_id": run_id, "status": status})
    return events, complete


def _execute_step(
    conn: sqlite3.Connection,
    tid: str,
    subtask: dict[str, Any],
    rec: store.RunRecord,
    by_id: dict[str, dict[str, Any]],
    statuses: dict[str, str],
    resolve_adapter: AdapterResolver,
):
    from tools.worker_adapter import WorkerResult  # local import: avoid top cycle churn

    # Synthesis step with no spec → deterministic fan-in over dependency results.
    if subtask.get("is_synthesis") and not subtask.get("spec_id"):
        done_deps = [d for d in subtask.get("deps", []) if statuses.get(d) == "done"]
        return WorkerResult(
            outcome=OUTCOME_PASS,
            summary=f"Synthesized {len(done_deps)} department deliverable(s).",
            metadata={"runtime": "synthesis"},
        )

    spec_id = subtask.get("spec_id")
    spec = reg.get_spec(conn, spec_id) if spec_id else None
    if spec is None:
        return WorkerResult(
            outcome="fail", failure_class="no_spec",
            failure_note=f"no resolved spec for subtask {subtask.get('id')}",
        )
    adapter = resolve_adapter(spec)
    task = WorkerTask(
        id=tid, title=subtask.get("title", ""), body=subtask.get("body", ""),
        tenant=rec.tenant,
    )
    return run_and_record(conn, adapter, spec, task, _contract_for(spec, subtask))


# Re-export for callers/tests that assert event-name canonicality.
assert all(
    merlion_events.is_merlion_event(e)
    for e in ("plan.ready", "team.join", "task.start", "task.done", "task.failed", "run.done")
)
