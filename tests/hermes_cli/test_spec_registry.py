from __future__ import annotations

from pathlib import Path

import pytest

from hermes_cli import spec_registry as reg
from hermes_cli.subagent_spec import SubagentSpec


@pytest.fixture
def conn(tmp_path):
    c = reg.connect(db_path=tmp_path / "kanban.db")
    yield c
    c.close()


def _spec(slug="financial-analyst", domain="finance", **over) -> SubagentSpec:
    base = dict(
        id=reg.make_spec_id(domain, slug, 1),
        name="Financial Analyst",
        domain=domain,
        description="Builds financial models.",
        system_prompt="You are an analyst.",
        provenance="preset",
        trust_preset="trusted",
    )
    base.update(over)
    return SubagentSpec(**base)


def test_schema_creates_tables(conn):
    names = {
        r["name"]
        for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
    }
    assert {"subagent_specs", "subagent_spec_stats", "subagent_outcomes"} <= names


def test_upsert_and_get_round_trip(conn):
    spec = _spec()
    reg.upsert_spec(conn, spec, content_hash="h1")
    got = reg.get_spec(conn, spec.id)
    assert got is not None
    assert got.name == "Financial Analyst"
    assert got.domain == "finance"
    assert got.created_at > 0
    assert got.updated_at >= got.created_at


def test_id_parse_helpers():
    assert reg.parse_spec_id("spec-finance-financial-analyst-v2") == (
        "finance",
        "financial-analyst",
        2,
    )
    assert reg.parse_spec_id("not-a-spec") is None
    assert reg.make_spec_id("Finance", "x-y", 3) == "spec-finance-x-y-v3"


def test_versioning_deprecates_previous(conn):
    v1 = _spec()
    reg.upsert_spec(conn, v1)
    assert reg.max_version(conn, "finance", "financial-analyst") == 1

    v2 = _spec(provenance="evolved")
    persisted = reg.register_next_version(conn, v2)
    assert persisted.version == 2
    assert persisted.id == "spec-finance-financial-analyst-v2"
    assert persisted.parent_spec_id == "spec-finance-financial-analyst-v1"

    # v1 is now deprecated; active-by-slug returns v2.
    assert reg.get_spec(conn, "spec-finance-financial-analyst-v1").status == "deprecated"
    active = reg.get_active_spec_by_slug(conn, "finance", "financial-analyst")
    assert active.id == "spec-finance-financial-analyst-v2"


def test_get_active_skips_non_active(conn):
    spec = _spec()
    reg.upsert_spec(conn, spec)
    reg.set_status(conn, spec.id, "shadow")
    assert reg.get_active_spec_by_slug(conn, "finance", "financial-analyst") is None


def test_list_specs_filters(conn):
    reg.upsert_spec(conn, _spec(slug="analyst", id=reg.make_spec_id("finance", "analyst", 1)))
    reg.upsert_spec(
        conn,
        _spec(
            slug="appsec",
            domain="security",
            id=reg.make_spec_id("security", "appsec", 1),
            name="AppSec",
        ),
    )
    fin = reg.list_specs(conn, domain="finance")
    assert [s.domain for s in fin] == ["finance"]
    allspecs = reg.list_specs(conn, status="active")
    assert {s.domain for s in allspecs} == {"finance", "security"}


def test_tenant_scoping_includes_globals(conn):
    glob = _spec(slug="analyst", id=reg.make_spec_id("finance", "analyst", 1), tenant=None)
    scoped = _spec(
        slug="custom",
        id=reg.make_spec_id("finance", "custom", 1),
        tenant="ws-1",
        provenance="generated",
        trust_preset="standard",
    )
    other = _spec(
        slug="secret",
        id=reg.make_spec_id("finance", "secret", 1),
        tenant="ws-2",
        provenance="generated",
        trust_preset="standard",
    )
    reg.upsert_spec(conn, glob)
    reg.upsert_spec(conn, scoped)
    reg.upsert_spec(conn, other)
    visible = {s.id for s in reg.list_specs(conn, tenant="ws-1")}
    assert "spec-finance-analyst-v1" in visible  # global preset
    assert "spec-finance-custom-v1" in visible  # own tenant
    assert "spec-finance-secret-v1" not in visible  # other tenant hidden


def test_preset_idempotency(conn):
    spec = _spec(source_path="/x/finance/analyst.md")
    assert reg.upsert_preset(conn, spec, content_hash="h1") == "inserted"
    assert reg.upsert_preset(conn, _spec(source_path="/x/finance/analyst.md"), content_hash="h1") == "unchanged"
    assert reg.upsert_preset(conn, _spec(source_path="/x/finance/analyst.md"), content_hash="h2") == "updated"


def test_record_outcome_rolls_up_stats(conn):
    spec = _spec()
    reg.upsert_spec(conn, spec)
    reg.record_outcome(
        conn, spec_id=spec.id, task_id="t1", runtime="in_process", outcome="pass",
        cost_cents=10, latency_ms=1000,
    )
    reg.record_outcome(
        conn, spec_id=spec.id, task_id="t2", runtime="openclaw_worker", outcome="fail",
        cost_cents=30, latency_ms=3000, failure_class="tool_error", failure_note="boom",
    )
    stats = reg.get_stats(conn, spec.id, None)
    assert stats.sample_size == 2
    assert stats.win_count == 1 and stats.fail_count == 1
    assert stats.win_rate == 0.5
    assert stats.avg_cost_cents == 20.0
    assert stats.avg_latency_ms == 2000
    # get_spec carries the rolled-up stats.
    assert reg.get_spec(conn, spec.id).stats.win_rate == 0.5
    # Failure memory is queryable.
    fails = reg.recent_failures(conn, spec.id)
    assert len(fails) == 1 and fails[0]["failure_class"] == "tool_error"


def test_blocked_outcome_not_counted_in_sample(conn):
    spec = _spec()
    reg.upsert_spec(conn, spec)
    reg.record_outcome(conn, spec_id=spec.id, task_id="t1", runtime="in_process", outcome="blocked")
    stats = reg.get_stats(conn, spec.id, None)
    assert stats.usage_count == 1
    assert stats.sample_size == 0
    assert stats.win_rate == 0.0


def test_stats_are_tenant_scoped(conn):
    spec = _spec()
    reg.upsert_spec(conn, spec)
    reg.record_outcome(conn, spec_id=spec.id, task_id="t1", runtime="in_process", outcome="pass", tenant="ws-1")
    reg.record_outcome(conn, spec_id=spec.id, task_id="t2", runtime="in_process", outcome="fail", tenant="ws-2")
    assert reg.get_stats(conn, spec.id, "ws-1").win_rate == 1.0
    assert reg.get_stats(conn, spec.id, "ws-2").win_rate == 0.0
