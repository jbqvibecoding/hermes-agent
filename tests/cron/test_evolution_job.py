from __future__ import annotations

import time

import pytest

from cron import evolution_job as ev
from hermes_cli import kanban_db as kb
from hermes_cli import spec_registry as reg
from hermes_cli.subagent_spec import SpecStats, SubagentSpec


@pytest.fixture
def conn(tmp_path):
    c = reg.connect(db_path=tmp_path / "kanban.db")
    yield c
    c.close()


def _spec(slug, *, status="active", stats=None, **over) -> SubagentSpec:
    spec = SubagentSpec(
        id=reg.make_spec_id("finance", slug, 1),
        name=slug.title(),
        domain="finance",
        system_prompt="x",
        status=status,
        **over,
    )
    if stats is not None:
        spec.stats = stats
    return spec


def _save(conn, spec):
    reg.upsert_spec(conn, spec)
    # stats live in their own table; persist them via a direct upsert so the
    # planner can read them back through list_specs.
    s = spec.stats
    with kb.write_txn(conn):
        conn.execute(
            "INSERT OR REPLACE INTO subagent_spec_stats "
            "(spec_id, tenant, usage_count, win_count, fail_count, win_rate, "
            " avg_cost_cents, avg_latency_ms, sample_size, last_used_at) "
            "VALUES (?, '', ?, ?, ?, ?, ?, ?, ?, ?)",
            (spec.id, s.usage_count, s.win_count, s.fail_count, s.win_rate,
             s.avg_cost_cents, s.avg_latency_ms, s.sample_size, s.last_used_at),
        )


# ---- classify_spec (pure) -------------------------------------------------

def _classify(spec, **kw):
    base = dict(
        min_sample=10, promote_floor=0.7, retire_floor=0.4,
        mutate_ceiling=0.6, mutate_min_usage=20, retire_ttl_days=90,
        now=1_000_000,
    )
    base.update(kw)
    return ev.classify_spec(spec, **base)


def test_promote_shadow_that_earned_it():
    spec = _spec("a", status="shadow", stats=SpecStats(sample_size=12, win_count=10, win_rate=0.83))
    assert _classify(spec) == "promote"


def test_shadow_without_samples_is_noop():
    spec = _spec("a", status="shadow", stats=SpecStats(sample_size=3, win_count=3, win_rate=1.0))
    assert _classify(spec) is None


def test_retire_active_underperformer():
    spec = _spec("a", status="active", stats=SpecStats(sample_size=20, win_count=4, win_rate=0.2))
    assert _classify(spec) == "retire"


def test_retire_unused_active_past_ttl():
    old = 1_000_000 - 100 * 86400
    spec = _spec("a", status="active", stats=SpecStats(usage_count=5, win_rate=0.9, sample_size=5, last_used_at=old))
    assert _classify(spec) == "retire"


def test_mutate_popular_mediocre():
    spec = _spec("a", status="active", stats=SpecStats(usage_count=50, sample_size=30, win_count=15, win_rate=0.5, last_used_at=1_000_000))
    assert _classify(spec) == "mutate"


def test_healthy_active_is_noop():
    spec = _spec("a", status="active", stats=SpecStats(usage_count=50, sample_size=30, win_count=27, win_rate=0.9, last_used_at=1_000_000))
    assert _classify(spec) is None


# ---- plan_evolution + apply_evolution (registry) --------------------------

def test_plan_and_apply(conn):
    _save(conn, _spec("winner", status="shadow", stats=SpecStats(sample_size=15, win_count=13, win_rate=0.87)))
    _save(conn, _spec("loser", status="active", stats=SpecStats(sample_size=20, win_count=4, win_rate=0.2)))
    _save(conn, _spec("mediocre", status="active", stats=SpecStats(usage_count=50, sample_size=30, win_count=15, win_rate=0.5, last_used_at=int(time.time()))))
    _save(conn, _spec("healthy", status="active", stats=SpecStats(usage_count=50, sample_size=30, win_count=27, win_rate=0.9, last_used_at=int(time.time()))))

    plan = ev.plan_evolution(conn)
    assert "spec-finance-winner-v1" in plan.promote
    assert "spec-finance-loser-v1" in plan.retire
    assert "spec-finance-mediocre-v1" in plan.mutate
    assert "spec-finance-healthy-v1" not in (plan.promote + plan.retire + plan.mutate)

    mutated_parents = []

    def mutator(parent):
        mutated_parents.append(parent.id)
        variant = SubagentSpec(
            id=parent.id, name=parent.name + " v2", domain=parent.domain,
            system_prompt="improved",
        )
        return variant

    result = ev.apply_evolution(conn, plan, mutator=mutator)
    assert result.promoted == ["spec-finance-winner-v1"]
    assert result.retired == ["spec-finance-loser-v1"]
    assert result.mutated == ["spec-finance-mediocre-v2"]

    assert reg.get_spec(conn, "spec-finance-winner-v1").status == "active"
    assert reg.get_spec(conn, "spec-finance-loser-v1").status == "retired"
    # mutation produced a shadow v2; parent stays active (deprecate_previous=False).
    v2 = reg.get_spec(conn, "spec-finance-mediocre-v2")
    assert v2.status == "shadow" and v2.provenance == "evolved"
    assert reg.get_spec(conn, "spec-finance-mediocre-v1").status == "active"


def test_apply_skips_mutation_without_mutator(conn):
    _save(conn, _spec("mediocre", status="active", stats=SpecStats(usage_count=50, sample_size=30, win_count=15, win_rate=0.5, last_used_at=int(time.time()))))
    plan = ev.plan_evolution(conn)
    result = ev.apply_evolution(conn, plan, mutator=None)
    assert result.mutated == []


def test_run_evolution_empty_when_no_history(conn):
    _save(conn, _spec("fresh", status="active", stats=SpecStats()))
    result = ev.run_evolution(conn)
    assert result.promoted == [] and result.retired == [] and result.mutated == []
