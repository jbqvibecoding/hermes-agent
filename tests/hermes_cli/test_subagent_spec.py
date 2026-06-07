from __future__ import annotations

import sqlite3

from hermes_cli.subagent_spec import (
    DEFAULT_DISALLOWED_TOOLS,
    FourPartContract,
    SpecStats,
    SubagentSpec,
)


def _spec(**over) -> SubagentSpec:
    base = dict(
        id="spec-finance-financial-analyst-v1",
        name="Financial Analyst",
        domain="finance",
        description="Builds financial models and forecasts.",
        system_prompt="You are Morgan, a seasoned financial analyst.",
        capability_tags=["financial", "modeling", "forecasting"],
        tools=["read", "web"],
        contract_template=FourPartContract(objective="Turn data into strategy."),
    )
    base.update(over)
    return SubagentSpec(**base)


def test_valid_spec_passes_validation():
    spec = _spec()
    assert spec.validation_errors() == []
    assert spec.is_valid()


def test_invalid_enum_fields_are_reported():
    spec = _spec(role="boss", runtime_hint="nope", trust_preset="god", status="weird")
    errs = spec.validation_errors()
    assert any("role" in e for e in errs)
    assert any("runtime_hint" in e for e in errs)
    assert any("trust_preset" in e for e in errs)
    assert any("status" in e for e in errs)


def test_missing_required_disallowed_tools_is_invalid():
    # A spec whose deny-list drops the security floor must fail validation.
    spec = _spec(disallowed_tools=["clarify"])
    errs = spec.validation_errors()
    assert any("disallowed_tools missing" in e for e in errs)


def test_default_disallowed_tools_contains_floor():
    spec = _spec()
    assert DEFAULT_DISALLOWED_TOOLS.issubset(set(spec.disallowed_tools))


def test_row_round_trip_via_sqlite():
    # to_row → INSERT → SELECT → from_row must reproduce the spec exactly
    # (modulo stats, which live in their own table).
    spec = _spec(skills=["finance-kit"], parent_spec_id=None, version=3)
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    row = spec.to_row()
    row["slug"] = "financial-analyst"
    row["content_hash"] = "abc"
    cols = ", ".join(row.keys())
    ph = ", ".join(f":{c}" for c in row.keys())
    conn.execute(f"CREATE TABLE t ({', '.join(row.keys())})")
    conn.execute(f"INSERT INTO t ({cols}) VALUES ({ph})", row)
    fetched = conn.execute("SELECT * FROM t").fetchone()
    restored = SubagentSpec.from_row(fetched)
    assert restored.id == spec.id
    assert restored.name == spec.name
    assert restored.domain == spec.domain
    assert restored.capability_tags == spec.capability_tags
    assert restored.tools == spec.tools
    assert restored.disallowed_tools == spec.disallowed_tools
    assert restored.skills == spec.skills
    assert restored.contract_template == spec.contract_template
    assert restored.version == 3
    assert restored.can_create_agents is False


def test_from_row_handles_null_optional_columns():
    spec = _spec(skills=None, contract_template=None, model=None)
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    row = spec.to_row()
    row["slug"] = "financial-analyst"
    row["content_hash"] = None
    conn.execute(f"CREATE TABLE t ({', '.join(row.keys())})")
    ph = ", ".join(f":{c}" for c in row.keys())
    conn.execute(f"INSERT INTO t ({', '.join(row.keys())}) VALUES ({ph})", row)
    restored = SubagentSpec.from_row(conn.execute("SELECT * FROM t").fetchone())
    assert restored.skills is None
    assert restored.contract_template is None
    assert restored.model is None


def test_stats_round_trip():
    s = SpecStats(usage_count=10, win_count=7, fail_count=3, win_rate=0.7, sample_size=10)
    assert SpecStats.from_dict(s.to_dict()) == s


def test_disallowed_tools_lockstep_with_delegate_tool():
    """Drift guard: the schema's local deny-list must equal delegate_tool's.

    Keeping a local copy avoids importing the heavy delegate runtime into the
    pure-schema module, but the two must never diverge — this test fails CI if
    they do.
    """
    try:
        from tools.delegate_tool import DELEGATE_BLOCKED_TOOLS
    except Exception as exc:  # pragma: no cover - import env issue, not drift
        import pytest

        pytest.skip(f"tools.delegate_tool not importable: {exc}")
    assert set(DEFAULT_DISALLOWED_TOOLS) == set(DELEGATE_BLOCKED_TOOLS)
