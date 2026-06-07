"""Task Router — classification, Route Score, and hybrid runtime selection.

This module is the *decision core* of the orchestration brain. It is kept pure
and dependency-light (no DB, no agent runtime, no network) so the scoring and
selection logic is deterministic and unit-testable in isolation:

* :func:`classify` — turn a task objective into a ``Classification``
  (domain / shape / risk / capability needs), following Anthropic's
  depth-first / breadth-first / straightforward taxonomy.
* :func:`route_score` — score a candidate :class:`SubagentSpec` for a task
  using ``Capability + ToolFit + SuccessRate + Efficiency + Latency``, where
  SuccessRate is shrunk toward 0.5 by sample size (so a brand-new spec is
  neither punished to zero nor trusted on luck) and a failure-memory malus is
  applied when recent failures match the task's risk.
* :func:`resolve_runtime` — pick OpenClaw-worker vs in-process per the hybrid
  rules (heavy / parallel / computer-use / strong-isolation → worker).
* :func:`effort_cap` — Anthropic effort-scaling caps on fan-out.

The Multica materialization of an ``ExecutionPlan`` (child issues + agent_task
rows + dependency edges) is wired in a later phase; this module owns only the
pure decisions those steps consume.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Iterable, Literal, Optional

from hermes_cli.subagent_spec import SpecStats, SubagentSpec

Shape = Literal["straightforward", "depth_first", "breadth_first"]
RiskTier = Literal["low", "medium", "high"]
Runtime = Literal["openclaw_worker", "in_process"]


# ---- weights & constants ---------------------------------------------------

@dataclass(frozen=True)
class RouteWeights:
    capability: float = 0.40
    tool_fit: float = 0.15
    success: float = 0.25
    efficiency: float = 0.10
    latency: float = 0.10


DEFAULT_WEIGHTS = RouteWeights()

# Shrinkage prior strength: how many "virtual" 0.5-outcome samples to blend in.
# Larger K = slower to trust an observed win_rate from few samples.
SHRINK_K = 5.0

# Normalization references for the bounded inverse transforms. Picked as rough
# per-task medians; Efficiency/Latency are relative signals, not absolutes.
REF_COST_CENTS = 50.0
REF_LATENCY_MS = 60_000.0

# Hybrid runtime: in-process delegate children share Hermes's wall clock and
# hit the delegate child timeout (~600s). Anything expected longer belongs on a
# worker. Mirrors delegate_tool's child timeout budget.
IN_PROCESS_TIMEOUT_SECONDS = 600

# Anthropic effort-scaling caps.
DEFAULT_EFFORT = 3
MAX_SUBAGENTS = 20
_EFFORT_BY_SHAPE: dict[str, int] = {
    "straightforward": 1,
    "depth_first": 3,
    "breadth_first": 5,
}

# Keyword signals (lowercased substring match). Deterministic and cheap; the
# embedding-based domain centroid is layered on in the Agent Factory phase.
_COMPUTER_USE_MARKERS = (
    "browser", "browse", "website", "click", "screenshot", "scrape",
    "deploy", "run the", "execute", "install", "build the app", "terminal",
    "file system", "download", "upload",
)
_HIGH_RISK_MARKERS = (
    "production", "deploy", "delete", "drop table", "wire", "transfer funds",
    "payment", "credential", "secret", "rotate key", "send email", "refund",
)
_MEDIUM_RISK_MARKERS = ("write", "modify", "update", "migrate", "commit", "merge")
_BREADTH_MARKERS = ("compare", "across", "multiple", "each of", "several", "various", "list of")
_DEPTH_MARKERS = ("deeply", "root cause", "investigate", "step by step", "thoroughly", "why")


@dataclass
class Classification:
    domain: str
    shape: Shape
    risk: RiskTier
    capability_needs: list[str] = field(default_factory=list)
    needs_computer_use: bool = False


def _contains_any(text: str, markers: Iterable[str]) -> bool:
    return any(m in text for m in markers)


def classify(
    objective: str,
    *,
    known_domains: Optional[Iterable[str]] = None,
) -> Classification:
    """Classify a task objective. Pure keyword/structure heuristics.

    ``known_domains`` (e.g. the distinct domains present in the spec registry)
    lets the router pick a real domain when the objective names one; otherwise
    it falls back to ``general``.
    """
    text = (objective or "").lower()

    domain = "general"
    if known_domains:
        for d in known_domains:
            if d and d.lower() in text:
                domain = d.lower()
                break

    # risk: high markers win over medium.
    if _contains_any(text, _HIGH_RISK_MARKERS):
        risk: RiskTier = "high"
    elif _contains_any(text, _MEDIUM_RISK_MARKERS):
        risk = "medium"
    else:
        risk = "low"

    # shape: breadth signals (independent sub-questions) beat depth signals.
    if _contains_any(text, _BREADTH_MARKERS):
        shape: Shape = "breadth_first"
    elif _contains_any(text, _DEPTH_MARKERS):
        shape = "depth_first"
    else:
        shape = "straightforward"

    needs_cu = _contains_any(text, _COMPUTER_USE_MARKERS)

    # capability needs: distinctive tokens, deduped, length-filtered.
    tokens = re.findall(r"[a-z][a-z-]{3,}", text)
    needs: list[str] = []
    for tok in tokens:
        tok = tok.strip("-")
        if len(tok) >= 4 and tok not in needs:
            needs.append(tok)
        if len(needs) >= 12:
            break

    return Classification(
        domain=domain,
        shape=shape,
        risk=risk,
        capability_needs=needs,
        needs_computer_use=needs_cu,
    )


def effort_cap(shape: Shape) -> int:
    """Max subagents for a task shape (Anthropic effort scaling, default 3)."""
    return _EFFORT_BY_SHAPE.get(shape, DEFAULT_EFFORT)


def shrunk_success_rate(stats: SpecStats, *, k: float = SHRINK_K) -> float:
    """Win-rate shrunk toward 0.5 by sample size.

    ``(win + 0.5k) / (sample + k)`` — a spec with no history scores 0.5; a spec
    with many samples converges to its raw win_rate.
    """
    return (stats.win_count + 0.5 * k) / (stats.sample_size + k)


def _tool_fit(required: Iterable[str], held: Iterable[str]) -> float:
    """Fraction of required tools the spec already holds (1.0 if none required).

    A mild over-breadth penalty discourages picking a kitchen-sink spec when a
    narrow one would do (least-privilege bias).
    """
    req = {t for t in required if t}
    have = {t for t in held if t}
    if not req:
        base = 1.0
    else:
        base = len(req & have) / len(req)
    over = max(0, len(have) - max(1, len(req)))
    penalty = min(0.10, 0.01 * over)
    return max(0.0, base - penalty)


def _bounded_inverse(value: float, ref: float) -> float:
    """Map a non-negative cost/latency to (0,1]; 0 → 1.0, ref → 0.5."""
    if value <= 0:
        return 1.0
    return ref / (ref + value)


def route_score(
    spec: SubagentSpec,
    *,
    capability_match: float,
    required_tools: Iterable[str] = (),
    weights: RouteWeights = DEFAULT_WEIGHTS,
    failure_malus: float = 0.0,
) -> float:
    """Score a candidate spec for a task.

    ``capability_match`` is the retrieval similarity (0..1) supplied by the
    Agent Factory. ``failure_malus`` (>=0) is subtracted when the spec has
    recent failures matching the task's risk profile (caller computes it from
    ``spec_registry.recent_failures``).
    """
    stats = spec.stats
    capability = max(0.0, min(1.0, capability_match))
    tool_fit = _tool_fit(required_tools, spec.tools)
    success = shrunk_success_rate(stats)
    efficiency = _bounded_inverse(stats.avg_cost_cents, REF_COST_CENTS)
    latency = _bounded_inverse(stats.avg_latency_ms, REF_LATENCY_MS)

    score = (
        weights.capability * capability
        + weights.tool_fit * tool_fit
        + weights.success * success
        + weights.efficiency * efficiency
        + weights.latency * latency
    )
    return score - max(0.0, failure_malus)


def resolve_runtime(
    spec: SubagentSpec,
    *,
    needs_computer_use: bool = False,
    risk: RiskTier = "low",
    parallel_heavy: bool = False,
    expected_seconds: Optional[int] = None,
    is_synthesis: bool = False,
    gateway_available: bool = True,
) -> Runtime:
    """Resolve the concrete runtime for a spec on a task (hybrid rules).

    Synthesis always stays in Hermes (the lead never delegates the final
    write). Computer-use / high-risk isolation / heavy parallel / long-running
    steps force an OpenClaw worker. Otherwise prefer in-process (cheaper,
    lower latency), degrading a worker-hinted step to in-process only when it
    does not require isolation and no Gateway is reachable.
    """
    if is_synthesis:
        return "in_process"

    force_worker = (
        needs_computer_use
        or risk == "high"
        or parallel_heavy
        or (expected_seconds is not None and expected_seconds > IN_PROCESS_TIMEOUT_SECONDS)
    )
    if force_worker:
        # Isolation/computer-use is non-negotiable; caller's Recovery handles an
        # unreachable Gateway rather than silently dropping isolation.
        return "openclaw_worker"

    if spec.runtime_hint == "in_process":
        return "in_process"
    if spec.runtime_hint == "openclaw_worker":
        return "openclaw_worker" if gateway_available else "in_process"
    # "either": prefer the cheaper local path.
    return "in_process"
