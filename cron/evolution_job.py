"""Evolution engine — Agent Darwinism over the SubagentSpec registry.

The product philosophy's loop: Task → Team → Execution → Evaluation →
Mutation → Better Team. This module owns the *decision* layer of that loop,
operating purely on registry stats (the Memory Graph):

* **promote** — a ``shadow`` spec that has earned enough samples at/above the
  win-rate floor graduates to ``active`` (it survived A/B).
* **retire**  — an ``active`` spec that has enough samples below the floor, or
  hasn't been used past a TTL, is retired (excluded from routing, kept for
  history).
* **mutate**  — a popular-but-mediocre ``active`` spec is flagged as a mutation
  candidate; an injected mutator generates a ``v(N+1)`` variant registered as
  ``shadow`` for the next A/B round.

Pure planning (:func:`plan_evolution`) is unit-testable on stats alone; the
side-effecting :func:`apply_evolution` uses the registry and an injected mutator
(real impl regenerates the spec via the Agent Factory).
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Callable, Optional

from hermes_cli import spec_registry as reg
from hermes_cli.subagent_spec import SubagentSpec

# Defaults — tune per deployment. A spec needs at least this many graded
# outcomes before promotion/retirement is statistically meaningful.
DEFAULT_MIN_SAMPLE = 10
DEFAULT_PROMOTE_FLOOR = 0.70   # shadow → active
DEFAULT_RETIRE_FLOOR = 0.40    # active below this (with samples) → retire
DEFAULT_MUTATE_CEILING = 0.60  # active below this (popular) → mutation candidate
DEFAULT_MUTATE_MIN_USAGE = 20  # only mutate specs that actually get used
DEFAULT_RETIRE_TTL_DAYS = 90   # unused active specs retire after this


@dataclass
class EvolutionPlan:
    promote: list[str] = field(default_factory=list)      # spec ids: shadow → active
    retire: list[str] = field(default_factory=list)       # spec ids: → retired
    mutate: list[str] = field(default_factory=list)       # spec ids to regenerate

    @property
    def is_empty(self) -> bool:
        return not (self.promote or self.retire or self.mutate)


@dataclass
class EvolutionResult:
    promoted: list[str] = field(default_factory=list)
    retired: list[str] = field(default_factory=list)
    mutated: list[str] = field(default_factory=list)  # ids of NEW shadow versions


# A mutator regenerates an improved variant of a spec (real impl uses the Agent
# Factory's generator). Returns a draft spec, or None to skip.
Mutator = Callable[[SubagentSpec], Optional[SubagentSpec]]


def _now() -> int:
    return int(time.time())


def classify_spec(
    spec: SubagentSpec,
    *,
    min_sample: int,
    promote_floor: float,
    retire_floor: float,
    mutate_ceiling: float,
    mutate_min_usage: int,
    retire_ttl_days: int,
    now: Optional[int] = None,
) -> Optional[str]:
    """Return the evolution action for one spec, or ``None`` for no-op.

    One of ``"promote"`` / ``"retire"`` / ``"mutate"``. Pure: decides from the
    spec's status + attached stats only.
    """
    now = now if now is not None else _now()
    stats = spec.stats

    if spec.status == "shadow":
        if stats.sample_size >= min_sample and stats.win_rate >= promote_floor:
            return "promote"
        return None

    if spec.status == "active":
        # Retire on sustained underperformance...
        if stats.sample_size >= min_sample and stats.win_rate < retire_floor:
            return "retire"
        # ...or on disuse past the TTL (only specs that were used at least once).
        if stats.last_used_at is not None:
            age_days = (now - stats.last_used_at) / 86400
            if stats.usage_count > 0 and age_days > retire_ttl_days:
                return "retire"
        # Otherwise, popular-but-mediocre specs are mutation candidates.
        if (
            stats.usage_count >= mutate_min_usage
            and stats.sample_size >= min_sample
            and retire_floor <= stats.win_rate < mutate_ceiling
        ):
            return "mutate"
    return None


def plan_evolution(
    conn,
    *,
    domain: Optional[str] = None,
    tenant: Optional[str] = None,
    min_sample: int = DEFAULT_MIN_SAMPLE,
    promote_floor: float = DEFAULT_PROMOTE_FLOOR,
    retire_floor: float = DEFAULT_RETIRE_FLOOR,
    mutate_ceiling: float = DEFAULT_MUTATE_CEILING,
    mutate_min_usage: int = DEFAULT_MUTATE_MIN_USAGE,
    retire_ttl_days: int = DEFAULT_RETIRE_TTL_DAYS,
    now: Optional[int] = None,
) -> EvolutionPlan:
    """Scan shadow + active specs and build an :class:`EvolutionPlan`."""
    plan = EvolutionPlan()
    specs = reg.list_specs(conn, domain=domain, tenant=tenant, status="shadow")
    specs += reg.list_specs(conn, domain=domain, tenant=tenant, status="active")
    for spec in specs:
        action = classify_spec(
            spec,
            min_sample=min_sample,
            promote_floor=promote_floor,
            retire_floor=retire_floor,
            mutate_ceiling=mutate_ceiling,
            mutate_min_usage=mutate_min_usage,
            retire_ttl_days=retire_ttl_days,
            now=now,
        )
        if action == "promote":
            plan.promote.append(spec.id)
        elif action == "retire":
            plan.retire.append(spec.id)
        elif action == "mutate":
            plan.mutate.append(spec.id)
    return plan


def apply_evolution(
    conn,
    plan: EvolutionPlan,
    *,
    mutator: Optional[Mutator] = None,
) -> EvolutionResult:
    """Execute a plan against the registry. Returns what actually changed.

    Promotions/retirements are status transitions. Mutations regenerate a
    ``v(N+1)`` variant (via the injected ``mutator``) registered as ``shadow``
    for the next A/B round — the parent stays active until the variant wins.
    """
    result = EvolutionResult()
    for spec_id in plan.promote:
        if reg.set_status(conn, spec_id, "active"):
            result.promoted.append(spec_id)
    for spec_id in plan.retire:
        if reg.set_status(conn, spec_id, "retired"):
            result.retired.append(spec_id)
    if mutator is not None:
        for spec_id in plan.mutate:
            parent = reg.get_spec(conn, spec_id)
            if parent is None:
                continue
            variant = mutator(parent)
            if variant is None:
                continue
            variant.provenance = "evolved"
            variant.status = "shadow"
            persisted = reg.register_next_version(conn, variant, deprecate_previous=False)
            result.mutated.append(persisted.id)
    return result


def run_evolution(
    conn,
    *,
    mutator: Optional[Mutator] = None,
    **plan_kwargs,
) -> EvolutionResult:
    """Plan + apply in one call (the entry point a cron job invokes)."""
    plan = plan_evolution(conn, **plan_kwargs)
    return apply_evolution(conn, plan, mutator=mutator)
