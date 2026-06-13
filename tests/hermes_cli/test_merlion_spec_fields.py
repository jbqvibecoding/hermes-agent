"""Merlion projection fields (dept/short/model_category) on SubagentSpec.

Covers the dataclass round-trip, registry persistence (new DDL columns), the
additive-migration path for an old DB missing the columns, and the preset
mapping that derives dept/short from agency-agents markdown.
"""

from __future__ import annotations

import pytest

from hermes_cli import spec_presets, spec_registry as reg
from hermes_cli.subagent_spec import SubagentSpec


@pytest.fixture
def conn(tmp_path):
    c = reg.connect(db_path=tmp_path / "kanban.db")
    yield c
    c.close()


def _spec(**over) -> SubagentSpec:
    base = dict(
        id=reg.make_spec_id("finance", "analyst", 1),
        name="Financial Analyst",
        domain="finance",
        dept="finance",
        short="FA",
        model_category="deep",
    )
    base.update(over)
    return SubagentSpec(**base)


# ---- dataclass round-trip -------------------------------------------------

def test_to_row_includes_merlion_fields():
    row = _spec().to_row()
    assert row["dept"] == "finance"
    assert row["short"] == "FA"
    assert row["model_category"] == "deep"


def test_from_row_tolerates_missing_columns():
    # A row dict from a not-yet-migrated DB lacks the new columns entirely.
    row = _spec().to_row()
    for col in ("dept", "short", "model_category"):
        row.pop(col)
    spec = SubagentSpec.from_row(row)
    assert spec.dept is None
    assert spec.short is None
    assert spec.model_category is None


# ---- registry persistence -------------------------------------------------

def test_registry_persists_merlion_fields(conn):
    reg.upsert_spec(conn, _spec())
    got = reg.get_spec(conn, reg.make_spec_id("finance", "analyst", 1))
    assert got is not None
    assert got.dept == "finance"
    assert got.short == "FA"
    assert got.model_category == "deep"


def test_ensure_schema_adds_missing_columns(tmp_path):
    # Simulate a pre-Merlion DB: create the table without the new columns, then
    # let ensure_spec_schema patch it in additively.
    import sqlite3

    db = tmp_path / "old.db"
    raw = sqlite3.connect(db)
    # Pre-Merlion table: includes the columns the schema's indexes reference
    # (domain/status/slug/version/tenant/source_path) but NOT the 3 new ones.
    raw.execute(
        "CREATE TABLE subagent_specs (id TEXT PRIMARY KEY, slug TEXT, name TEXT, "
        "domain TEXT, status TEXT, version INTEGER, tenant TEXT, source_path TEXT, "
        "created_at INTEGER, updated_at INTEGER)"
    )
    raw.commit()
    raw.close()

    conn = reg.connect(db_path=db)
    cols = {r["name"] for r in conn.execute("PRAGMA table_info(subagent_specs)")}
    assert {"dept", "short", "model_category"} <= cols
    conn.close()


# ---- preset mapping -------------------------------------------------------

def test_preset_derives_dept_and_short():
    md = "---\nname: Morgan Lee\ncolor: '#0af'\n---\nYou are a financial analyst."
    spec = spec_presets.parse_markdown_spec(
        path=__import__("pathlib").Path("finance/financial-analyst.md"),
        domain="finance",
        text=md,
    )
    assert spec.dept == "finance"
    assert spec.short == "ML"  # initials of "Morgan Lee"
    assert spec.color == "#0af"


def test_preset_dept_maps_engineering_to_eng():
    md = "---\nname: Dev Bot\n---\nYou write code."
    spec = spec_presets.parse_markdown_spec(
        path=__import__("pathlib").Path("engineering/backend.md"),
        domain="engineering",
        text=md,
    )
    assert spec.dept == "eng"
