"""Auto Research engine — Eval/Metric/Segment + seeded composite + keep-only.

Merlion PRD ③§8.2: the orchestrator generates candidate solutions, scores each
against an Eval (weighted metrics × audience segments), and iterates keeping
*only* candidates that improve the composite (greedy hill-climb). Scoring is
deterministic given a seed so runs are reproducible and unit-testable.

This is the pure scoring/iteration core (the wanman three-engine
explore→evaluate→keep-winner, ported). A real evaluator (Truman crowd sim, LLM
judge) can be injected; absent one, a seeded simulation stands in.
"""

from __future__ import annotations

import zlib
from dataclasses import dataclass, field
from typing import Callable, Literal, Optional

Direction = Literal["higher", "lower"]

# Per-(segment → per-metric) raw scores for one candidate.
ScoreTable = dict[str, dict[str, float]]
Evaluator = Callable[[str, "list[Metric]", "list[Segment]"], ScoreTable]


def mulberry32(seed: int) -> Callable[[], float]:
    """Deterministic PRNG in [0,1) — the mulberry32 algorithm (32-bit state).

    Matches the Merlion frontend RNG so seeded sims line up across the stack.
    """
    state = seed & 0xFFFFFFFF

    def _next() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = state
        t = (t ^ (t >> 15)) * (t | 1) & 0xFFFFFFFF
        t ^= (t + ((t ^ (t >> 7)) * (t | 61) & 0xFFFFFFFF)) & 0xFFFFFFFF
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

    return _next


@dataclass
class Metric:
    id: str
    weight: float = 1.0
    direction: Direction = "higher"
    lo: float = 0.0
    hi: float = 1.0


@dataclass
class Segment:
    id: str
    weight: float = 1.0


@dataclass
class Candidate:
    id: str
    label: str = ""


@dataclass
class CandidateScore:
    candidate_id: str
    composite: float
    per_metric: dict[str, float] = field(default_factory=dict)


@dataclass
class ResearchResult:
    winner_id: Optional[str]
    winner_score: float
    evaluated: list[CandidateScore] = field(default_factory=list)
    kept: list[CandidateScore] = field(default_factory=list)  # the improvement trajectory


def _clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else 1.0 if x > 1.0 else x


def attain_of(value: float, metric: Metric) -> float:
    """Normalize a raw metric value to attainment in [0,1], respecting direction.

    ``higher`` is better → linear up from lo→hi; ``lower`` is better → inverted.
    Degenerate range (hi==lo) attains fully.
    """
    span = metric.hi - metric.lo
    if span == 0:
        return 1.0
    frac = (value - metric.lo) / span
    if metric.direction == "lower":
        frac = 1.0 - frac
    return _clamp01(frac)


def value_of(per_metric_values: dict[str, float], metrics: list[Metric]) -> float:
    """Weighted attainment across metrics, normalized by total weight → [0,1]."""
    total_w = sum(m.weight for m in metrics)
    if total_w == 0:
        return 0.0
    acc = sum(m.weight * attain_of(per_metric_values.get(m.id, m.lo), m) for m in metrics)
    return acc / total_w


def composite(scores: ScoreTable, metrics: list[Metric], segments: list[Segment]) -> float:
    """Segment-weighted mean of per-segment ``value_of`` → overall composite [0,1]."""
    total_w = sum(s.weight for s in segments)
    if total_w == 0:
        return 0.0
    acc = sum(s.weight * value_of(scores.get(s.id, {}), metrics) for s in segments)
    return acc / total_w


def _seeded_evaluator(seed: int) -> Evaluator:
    """Reproducible stand-in evaluator: per-(candidate,segment,metric) raw draws."""

    def _eval(candidate_id: str, metrics: list[Metric], segments: list[Segment]) -> ScoreTable:
        # Fold candidate identity into the seed via a stable hash (crc32, not the
        # salted builtin hash) so draws are reproducible regardless of PYTHONHASHSEED.
        rng = mulberry32(seed ^ zlib.crc32(candidate_id.encode("utf-8")))
        table: ScoreTable = {}
        for s in segments:
            row: dict[str, float] = {}
            for m in metrics:
                row[m.id] = m.lo + rng() * (m.hi - m.lo)
            table[s.id] = row
        return table

    return _eval


def evaluate_candidate(
    candidate: Candidate,
    metrics: list[Metric],
    segments: list[Segment],
    evaluator: Evaluator,
) -> CandidateScore:
    scores = evaluator(candidate.id, metrics, segments)
    overall = composite(scores, metrics, segments)
    # Per-metric: segment-weighted attainment, for reporting/plan compare.
    total_w = sum(s.weight for s in segments) or 1.0
    per_metric = {
        m.id: sum(s.weight * attain_of(scores.get(s.id, {}).get(m.id, m.lo), m) for s in segments) / total_w
        for m in metrics
    }
    return CandidateScore(candidate.id, overall, per_metric)


def keep_only_improvements(
    candidates: list[Candidate],
    metrics: list[Metric],
    segments: list[Segment],
    *,
    seed: int = 1,
    evaluator: Optional[Evaluator] = None,
    epsilon: float = 1e-9,
) -> ResearchResult:
    """Greedy hill-climb: keep a candidate only if it beats the running best.

    Returns the winner plus the full evaluation list and the improvement
    trajectory (``kept``). Deterministic for a fixed seed + candidate order.
    """
    ev = evaluator or _seeded_evaluator(seed)
    evaluated: list[CandidateScore] = []
    kept: list[CandidateScore] = []
    best_score = float("-inf")
    winner_id: Optional[str] = None

    for cand in candidates:
        cs = evaluate_candidate(cand, metrics, segments, ev)
        evaluated.append(cs)
        if cs.composite > best_score + epsilon:
            best_score = cs.composite
            winner_id = cs.candidate_id
            kept.append(cs)

    return ResearchResult(
        winner_id=winner_id,
        winner_score=best_score if winner_id is not None else 0.0,
        evaluated=evaluated,
        kept=kept,
    )
