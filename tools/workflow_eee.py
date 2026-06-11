"""Explore → Evaluate → Execute — the wanman three-engine decision core.

Front-ends the Task Router for complex/novel goals (absorbed PRD F9): generate
candidate approaches, score them on four dimensions, gate on a confidence
threshold (low confidence → human approval), then decompose the chosen option
into an execution plan with a per-phase token budget.

Pure and dependency-light: the three engines (explorer / scorer / planner) are
injected (real impls call an LLM via ``delegate_task``; tests inject stubs), so
the selection, confidence gating, and budgeting logic is deterministic and
unit-testable on its own.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional

# Per-phase token budget split (Explore / Evaluate / Execute). Evaluation is
# cheap; execution is where the spend goes — so low-confidence goals get gated
# *before* the expensive phase.
BUDGET_SPLIT = {"explore": 0.30, "evaluate": 0.10, "execute": 0.60}

DEFAULT_CONFIDENCE_THRESHOLD = 0.70
DEFAULT_RISK_CEILING = 0.70

# Four-dimension weights. ``risk`` and ``cost`` are "badness" dimensions and are
# inverted into the overall score (lower is better).
DEFAULT_DIMENSION_WEIGHTS = {
    "feasibility": 0.30,
    "impact": 0.30,
    "risk": 0.20,
    "cost": 0.20,
}


@dataclass
class ExplorationGoal:
    description: str
    constraints: list[str] = field(default_factory=list)
    context: str = ""


@dataclass
class ExplorationOption:
    id: str
    title: str
    approach: str = ""
    estimated_tokens: int = 0
    risks: list[str] = field(default_factory=list)
    tradeoffs: list[str] = field(default_factory=list)


@dataclass
class EvaluationScore:
    feasibility: float = 0.0  # 0..1, higher better
    impact: float = 0.0       # 0..1, higher better
    risk: float = 0.0         # 0..1, higher = riskier (worse)
    cost: float = 0.0         # 0..1, higher = pricier (worse)


@dataclass
class EvaluatedOption:
    option: ExplorationOption
    score: EvaluationScore
    overall: float


@dataclass
class PlannedStep:
    title: str
    description: str = ""
    capability_needs: list[str] = field(default_factory=list)
    depends_on: list[str] = field(default_factory=list)
    is_synthesis: bool = False


@dataclass
class ExecutionPlan:
    option_id: str
    steps: list[PlannedStep] = field(default_factory=list)
    total_estimated_tokens: int = 0


@dataclass
class EEEResult:
    evaluated: list[EvaluatedOption]
    selected_option_id: Optional[str]
    confidence: float
    requires_human_approval: bool
    plan: Optional[ExecutionPlan]
    reason: str = ""


Explorer = Callable[[ExplorationGoal], list[ExplorationOption]]
Scorer = Callable[[ExplorationGoal, ExplorationOption], EvaluationScore]
Planner = Callable[[ExplorationOption], ExecutionPlan]


def allocate_budget(total_tokens: int) -> dict[str, int]:
    """Split a token budget across the three phases (Explore/Evaluate/Execute)."""
    return {phase: int(total_tokens * frac) for phase, frac in BUDGET_SPLIT.items()}


def overall_score(score: EvaluationScore, weights: Optional[dict] = None) -> float:
    """Weighted 0..1 overall (risk/cost inverted so lower badness scores higher)."""
    w = weights or DEFAULT_DIMENSION_WEIGHTS
    return (
        w["feasibility"] * score.feasibility
        + w["impact"] * score.impact
        + w["risk"] * (1.0 - score.risk)
        + w["cost"] * (1.0 - score.cost)
    )


def evaluate(
    goal: ExplorationGoal,
    options: list[ExplorationOption],
    scorer: Scorer,
    *,
    weights: Optional[dict] = None,
) -> list[EvaluatedOption]:
    """Score every option and return them sorted best-first."""
    evaluated = [
        EvaluatedOption(option=o, score=(s := scorer(goal, o)), overall=overall_score(s, weights))
        for o in options
    ]
    evaluated.sort(key=lambda e: e.overall, reverse=True)
    return evaluated


def decide(
    evaluated: list[EvaluatedOption],
    *,
    confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
    risk_ceiling: float = DEFAULT_RISK_CEILING,
) -> tuple[Optional[EvaluatedOption], bool, str]:
    """Pick the top option; gate on confidence and a hard risk ceiling.

    Returns ``(selected, requires_human_approval, reason)``. A high-risk winner
    requires approval even when its overall score clears the threshold.
    """
    if not evaluated:
        return None, True, "no candidate options produced"
    top = evaluated[0]
    if top.score.risk >= risk_ceiling:
        return top, True, f"risk {top.score.risk:.2f} ≥ ceiling {risk_ceiling:.2f}"
    if top.overall < confidence_threshold:
        return top, True, f"confidence {top.overall:.2f} < threshold {confidence_threshold:.2f}"
    return top, False, "confident"


def run_eee(
    goal: ExplorationGoal,
    *,
    explorer: Explorer,
    scorer: Scorer,
    planner: Planner,
    weights: Optional[dict] = None,
    confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
    risk_ceiling: float = DEFAULT_RISK_CEILING,
) -> EEEResult:
    """Full Explore→Evaluate→Execute pass.

    Only plans (the expensive Execute phase) when the chosen option is
    confident enough; a low-confidence/high-risk result returns
    ``requires_human_approval=True`` with no plan so the caller can park a
    Multica ``action_required`` approval before spending.
    """
    options = explorer(goal)
    evaluated = evaluate(goal, options, scorer, weights=weights)
    selected, needs_approval, reason = decide(
        evaluated,
        confidence_threshold=confidence_threshold,
        risk_ceiling=risk_ceiling,
    )
    if selected is None:
        return EEEResult(evaluated, None, 0.0, True, None, reason)
    plan = None if needs_approval else planner(selected.option)
    return EEEResult(
        evaluated=evaluated,
        selected_option_id=selected.option.id,
        confidence=selected.overall,
        requires_human_approval=needs_approval,
        plan=plan,
        reason=reason,
    )
