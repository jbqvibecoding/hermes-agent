from __future__ import annotations

import pytest

from hermes_cli import spec_registry as reg
from hermes_cli.subagent_spec import FourPartContract, SubagentSpec
from tools import agent_factory as af


@pytest.fixture
def conn(tmp_path):
    c = reg.connect(db_path=tmp_path / "kanban.db")
    yield c
    c.close()


def _preset(slug, domain="finance", tags=None, **over):
    spec = SubagentSpec(
        id=reg.make_spec_id(domain, slug, 1),
        name=slug.title(),
        domain=domain,
        description=f"{slug} specialist",
        system_prompt="You are a specialist.",
        capability_tags=tags or [],
        provenance="preset",
        trust_preset="trusted",
        status="active",
        **over,
    )
    return spec


# ---- contract rendering ---------------------------------------------------

def test_render_contract_full():
    c = FourPartContract(
        objective="Model the cashflow",
        output_format="A table",
        tools_guidance="Use the finance API",
        scope_boundaries="Do not touch marketing",
    )
    out = af.render_contract(c, "Build a 3-year forecast")
    assert "## Task" in out and "Build a 3-year forecast" in out
    assert "## Objective" in out and "cashflow" in out
    assert "## Output format" in out
    assert "## Scope boundaries (do NOT)" in out


def test_render_contract_task_only():
    out = af.render_contract(None, "Just do this")
    assert out.strip().startswith("## Task")
    assert "Just do this" in out


# ---- retrieval ------------------------------------------------------------

def test_retrieve_ranks_by_tag_overlap(conn):
    reg.upsert_spec(conn, _preset("analyst", tags=["dcf", "forecasting", "valuation"]))
    reg.upsert_spec(conn, _preset("bookkeeper", tags=["ledger", "reconciliation"]))
    req = af.GenerateRequest(
        requirement="build a dcf valuation",
        domain="finance",
        capability_needs=["dcf", "valuation"],
    )
    matches = af.retrieve_candidates(conn, req)
    assert matches[0].spec.id == "spec-finance-analyst-v1"
    assert matches[0].score > matches[1].score


def test_decide_action_thresholds():
    hi = [af.SpecMatch(spec=_preset("a"), score=0.9)]
    near = [af.SpecMatch(spec=_preset("a"), score=0.6)]
    low = [af.SpecMatch(spec=_preset("a"), score=0.1)]
    assert af.decide_action(hi) == "hit"
    assert af.decide_action(near) == "adapt"
    assert af.decide_action(low) == "generate"
    assert af.decide_action([]) == "generate"


# ---- validation gates -----------------------------------------------------

def _draft(tools=None, trust="standard", **over):
    return SubagentSpec(
        id="spec-finance-custom-v1",
        name="Custom",
        domain="finance",
        description="generated",
        system_prompt="You do X.",
        tools=tools or [],
        trust_preset=trust,
        provenance="generated",
        **over,
    )


def test_validate_passes_clean_spec():
    res = af.validate_spec(
        _draft(tools=["read", "web"]),
        available_toolsets=["read", "web", "file"],
        available_openclaw_tools=[],
    )
    assert res.ok and res.gate == "ok"


def test_validate_rejects_unknown_tool():
    res = af.validate_spec(
        _draft(tools=["read", "wat"]),
        available_toolsets=["read", "web"],
        available_openclaw_tools=[],
    )
    assert not res.ok and res.gate == "allowlist"
    assert any("wat" in e for e in res.errors)


def test_validate_rejects_untrusted_holding_sensitive_tool():
    res = af.validate_spec(
        _draft(tools=["terminal"], trust="untrusted"),
        available_toolsets=["terminal", "read"],
        available_openclaw_tools=[],
    )
    assert not res.ok and res.gate == "allowlist"
    assert any("sensitive" in e for e in res.errors)


def test_validate_rejects_dropped_disallowed_floor():
    spec = _draft(tools=["read"])
    spec.disallowed_tools = ["clarify"]  # dropped the security floor
    res = af.validate_spec(spec, available_toolsets=["read"], available_openclaw_tools=[])
    # schema gate catches the floor violation first.
    assert not res.ok
    assert res.gate in {"schema", "allowlist"}


def test_validate_smoke_gate_failure():
    res = af.validate_spec(
        _draft(tools=["read"]),
        available_toolsets=["read"],
        available_openclaw_tools=[],
        smoke_runner=lambda spec: af.SmokeOutcome(ok=False, reason="oversized prompt"),
    )
    assert not res.ok and res.gate == "smoke"
    assert "oversized" in res.errors[0]


def test_validate_smoke_gate_pass():
    res = af.validate_spec(
        _draft(tools=["read"]),
        available_toolsets=["read"],
        available_openclaw_tools=[],
        smoke_runner=lambda spec: af.SmokeOutcome(ok=True),
    )
    assert res.ok


# ---- registration (trust gate + dedupe) -----------------------------------

def test_register_trusted_is_active(conn):
    res = af.register_spec(conn, _draft(trust="trusted", tools=["read"]))
    assert res.action == "registered" and res.status == "active"
    assert reg.get_spec(conn, res.spec_id).status == "active"


def test_register_standard_is_shadow(conn):
    res = af.register_spec(conn, _draft(trust="standard", tools=["read"]))
    assert res.status == "shadow"


def test_register_untrusted_pends_approval(conn):
    approved: list[str] = []
    res = af.register_spec(
        conn,
        _draft(trust="untrusted", tools=["read"]),
        on_approval_required=lambda s: approved.append(s.id),
    )
    assert res.action == "pending_approval" and res.status == "draft"
    assert approved == [res.spec_id]


def test_register_dedupes_on_strong_match(conn):
    existing = _preset("analyst")
    matches = [af.SpecMatch(spec=existing, score=0.95)]
    res = af.register_spec(conn, _draft(), dedupe_matches=matches)
    assert res.action == "deduped"
    assert res.spec_id == existing.id


# ---- end-to-end acquire ---------------------------------------------------

def test_acquire_returns_existing_on_hit(conn):
    reg.upsert_spec(conn, _preset("analyst", tags=["dcf", "valuation"]))

    def boom(_req):  # generator must NOT be called on a hit
        raise AssertionError("generator should not run when a preset hits")

    req = af.GenerateRequest(
        requirement="dcf valuation",
        domain="finance",
        capability_needs=["dcf", "valuation"],
    )
    res = af.acquire_spec(conn, req, generator=boom)
    assert res.action == "deduped"
    assert res.spec_id == "spec-finance-analyst-v1"


def test_acquire_generates_validates_registers_on_miss(conn):
    def generator(req: af.GenerateRequest) -> SubagentSpec:
        return SubagentSpec(
            id="spec-finance-novel-v1",
            name="Novel",
            domain="finance",
            description="novel capability",
            system_prompt="Do the novel thing.",
            capability_tags=["novel"],
            tools=["read"],
            trust_preset="standard",
            provenance="generated",
        )

    req = af.GenerateRequest(
        requirement="something never seen",
        domain="finance",
        capability_needs=["totally-unrelated"],
        available_toolsets=["read", "web"],
    )
    res = af.acquire_spec(
        conn, req, generator=generator,
        smoke_runner=lambda s: af.SmokeOutcome(ok=True),
    )
    assert res.action == "registered"
    assert res.status == "shadow"  # standard trust → shadow
    stored = reg.get_spec(conn, res.spec_id)
    assert stored is not None and stored.provenance == "generated"
    assert stored.tenant is None


def test_acquire_raises_on_validation_failure(conn):
    def bad_generator(req):
        return SubagentSpec(
            id="spec-finance-bad-v1", name="Bad", domain="finance",
            system_prompt="x", tools=["forbidden_tool"], trust_preset="standard",
            provenance="generated",
        )

    req = af.GenerateRequest(
        requirement="x", domain="finance",
        capability_needs=["x"], available_toolsets=["read"],
    )
    with pytest.raises(af.FactoryValidationError) as ei:
        af.acquire_spec(conn, req, generator=bad_generator)
    assert ei.value.result.gate == "allowlist"
