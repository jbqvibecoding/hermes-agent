from __future__ import annotations

from pathlib import Path

import pytest

from hermes_cli import spec_presets as presets
from hermes_cli import spec_registry as reg

_FINANCE_MD = """---
name: Financial Analyst
description: Expert financial analyst specializing in financial modeling, forecasting, and scenario analysis.
color: green
emoji: 📊
vibe: Turns spreadsheets into strategy.
---

# 📊 Financial Analyst Agent

## Your Core Mission

Transform raw financial data into strategic intelligence with clear assumptions.

## Critical Rules

1. State assumptions before conclusions.
"""

_SECURITY_MD = """---
name: Application Security Engineer
description: AppSec specialist who secures the SDLC through threat modeling and secure code review.
color: "#059669"
emoji: 🔐
vibe: Makes developers write secure code.
---

# AppSec Engineer

## Core Mission

Shift security left across the development lifecycle.
"""


def _make_library(root: Path) -> None:
    (root / "finance").mkdir(parents=True)
    (root / "security").mkdir(parents=True)
    (root / "finance" / "finance-financial-analyst.md").write_text(_FINANCE_MD, encoding="utf-8")
    (root / "security" / "security-appsec-engineer.md").write_text(_SECURITY_MD, encoding="utf-8")
    (root / "README.md").write_text("# Agency Agents\n", encoding="utf-8")


def test_split_frontmatter():
    fm, body = presets.split_frontmatter(_FINANCE_MD)
    assert fm["name"] == "Financial Analyst"
    assert fm["emoji"] == "📊"
    assert body.lstrip().startswith("# 📊 Financial Analyst Agent")


def test_split_frontmatter_no_frontmatter():
    fm, body = presets.split_frontmatter("# Just a heading\n")
    assert fm == {}
    assert body == "# Just a heading\n"


def test_parse_markdown_spec_mapping(tmp_path):
    path = tmp_path / "finance" / "finance-financial-analyst.md"
    path.parent.mkdir(parents=True)
    path.write_text(_FINANCE_MD, encoding="utf-8")
    spec = presets.parse_markdown_spec(path, "finance", _FINANCE_MD)
    assert spec.id == "spec-finance-financial-analyst-v1"
    assert spec.domain == "finance"
    assert spec.name == "Financial Analyst"
    assert spec.emoji == "📊"
    assert spec.provenance == "preset"
    assert spec.trust_preset == "trusted"
    assert spec.runtime_hint == "either"
    assert spec.tools == []  # Factory fills tools later, never fabricated here
    assert spec.tenant is None
    assert "Morgan" not in spec.system_prompt  # body, not example text
    assert spec.system_prompt.startswith("# 📊 Financial Analyst Agent")
    assert spec.capability_tags  # non-empty distinctive tokens
    assert spec.contract_template is not None
    assert "strategic intelligence" in spec.contract_template.objective
    assert spec.is_valid()


def test_load_presets_idempotent(tmp_path):
    lib = tmp_path / "agency-agents"
    _make_library(lib)
    conn = reg.connect(db_path=tmp_path / "kanban.db")
    try:
        first = presets.load_presets(conn, root=lib)
        assert first.inserted == 2
        assert first.unchanged == 0
        assert first.errors == []
        # README at root is skipped (not under a domain dir).
        assert {s.id for s in reg.list_specs(conn)} == {
            "spec-finance-financial-analyst-v1",
            "spec-security-appsec-engineer-v1",
        }

        second = presets.load_presets(conn, root=lib)
        assert second.inserted == 0
        assert second.unchanged == 2

        # Edit one file → only that spec is updated.
        (lib / "finance" / "finance-financial-analyst.md").write_text(
            _FINANCE_MD + "\n## Extra section\n", encoding="utf-8"
        )
        third = presets.load_presets(conn, root=lib)
        assert third.updated == 1
        assert third.unchanged == 1
    finally:
        conn.close()


def test_resolve_root_env_override(tmp_path, monkeypatch):
    lib = tmp_path / "custom-agents"
    lib.mkdir()
    monkeypatch.setenv("HERMES_AGENCY_AGENTS_DIR", str(lib))
    assert presets.resolve_agency_agents_root() == lib
    monkeypatch.setenv("HERMES_AGENCY_AGENTS_DIR", str(tmp_path / "does-not-exist"))
    assert presets.resolve_agency_agents_root() is None


def test_load_missing_root_reports_error(tmp_path):
    conn = reg.connect(db_path=tmp_path / "kanban.db")
    try:
        result = presets.load_presets(conn, root=tmp_path / "nope")
        # rglob on a missing dir yields nothing → no specs, no crash.
        assert result.total == 0
    finally:
        conn.close()


def test_load_real_agency_agents_if_present(tmp_path):
    """Smoke test against the real library when it's available in the checkout."""
    root = presets.resolve_agency_agents_root()
    if root is None:
        pytest.skip("agency-agents library not present in this checkout")
    conn = reg.connect(db_path=tmp_path / "kanban.db")
    try:
        result = presets.load_presets(conn, root=root)
        assert result.total > 50  # the library ships 200+ agents
        assert result.errors == []
        fin = reg.get_active_spec_by_slug(conn, "finance", "financial-analyst")
        assert fin is not None
        assert fin.provenance == "preset"
        assert fin.system_prompt
    finally:
        conn.close()
