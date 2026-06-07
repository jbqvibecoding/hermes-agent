from __future__ import annotations

from hermes_cli.subagent_spec import SpecStats, SubagentSpec
from tools import task_router as tr


def _spec(runtime_hint="either", tools=None, stats=None, **over) -> SubagentSpec:
    base = dict(
        id="spec-finance-analyst-v1",
        name="Analyst",
        domain="finance",
        runtime_hint=runtime_hint,
        tools=tools or [],
    )
    base.update(over)
    spec = SubagentSpec(**base)
    if stats is not None:
        spec.stats = stats
    return spec


# ---- classify -------------------------------------------------------------

def test_classify_straightforward_low_risk():
    c = tr.classify("Summarize this paragraph")
    assert c.shape == "straightforward"
    assert c.risk == "low"
    assert c.needs_computer_use is False


def test_classify_breadth_first():
    c = tr.classify("Compare pricing across multiple competitors")
    assert c.shape == "breadth_first"


def test_classify_depth_first():
    c = tr.classify("Investigate the root cause of the outage thoroughly")
    assert c.shape == "depth_first"


def test_classify_high_risk_and_computer_use():
    c = tr.classify("Deploy the service to production and run migrations")
    assert c.risk == "high"
    assert c.needs_computer_use is True


def test_classify_domain_from_known_domains():
    c = tr.classify("Build a finance model", known_domains=["finance", "security"])
    assert c.domain == "finance"
    c2 = tr.classify("Generic task", known_domains=["finance"])
    assert c2.domain == "general"


# ---- effort cap -----------------------------------------------------------

def test_effort_caps():
    assert tr.effort_cap("straightforward") == 1
    assert tr.effort_cap("depth_first") == 3
    assert tr.effort_cap("breadth_first") == 5
    assert tr.MAX_SUBAGENTS == 20


# ---- success-rate shrinkage ----------------------------------------------

def test_shrunk_success_rate_cold_start_is_half():
    assert tr.shrunk_success_rate(SpecStats()) == 0.5


def test_shrunk_success_rate_converges_with_samples():
    cold = tr.shrunk_success_rate(SpecStats(win_count=1, fail_count=0, sample_size=1))
    warm = tr.shrunk_success_rate(SpecStats(win_count=100, fail_count=0, sample_size=100))
    assert 0.5 < cold < warm
    assert warm > 0.9


# ---- route score ----------------------------------------------------------

def test_route_score_prefers_higher_capability():
    spec = _spec()
    hi = tr.route_score(spec, capability_match=0.9)
    lo = tr.route_score(spec, capability_match=0.2)
    assert hi > lo


def test_route_score_rewards_proven_winrate():
    proven = _spec(stats=SpecStats(win_count=50, fail_count=0, sample_size=50, win_rate=1.0))
    fresh = _spec(stats=SpecStats())
    assert tr.route_score(proven, capability_match=0.8) > tr.route_score(fresh, capability_match=0.8)


def test_route_score_tool_fit():
    has_tools = _spec(tools=["read", "web"])
    no_tools = _spec(tools=[])
    s_has = tr.route_score(has_tools, capability_match=0.5, required_tools=["read", "web"])
    s_no = tr.route_score(no_tools, capability_match=0.5, required_tools=["read", "web"])
    assert s_has > s_no


def test_route_score_failure_malus_lowers_score():
    spec = _spec()
    base = tr.route_score(spec, capability_match=0.7)
    penalized = tr.route_score(spec, capability_match=0.7, failure_malus=0.2)
    assert penalized == base - 0.2


def test_efficiency_and_latency_favor_cheaper_faster():
    cheap_fast = _spec(stats=SpecStats(avg_cost_cents=1, avg_latency_ms=500))
    pricey_slow = _spec(stats=SpecStats(avg_cost_cents=500, avg_latency_ms=600_000))
    assert tr.route_score(cheap_fast, capability_match=0.5) > tr.route_score(pricey_slow, capability_match=0.5)


# ---- runtime resolution ---------------------------------------------------

def test_synthesis_stays_in_process():
    assert tr.resolve_runtime(_spec(runtime_hint="openclaw_worker"), is_synthesis=True) == "in_process"


def test_computer_use_forces_worker():
    assert tr.resolve_runtime(_spec(runtime_hint="in_process"), needs_computer_use=True) == "openclaw_worker"


def test_high_risk_forces_worker():
    assert tr.resolve_runtime(_spec(), risk="high") == "openclaw_worker"


def test_long_running_forces_worker():
    assert tr.resolve_runtime(_spec(), expected_seconds=1200) == "openclaw_worker"


def test_either_prefers_in_process():
    assert tr.resolve_runtime(_spec(runtime_hint="either")) == "in_process"


def test_worker_hint_degrades_when_gateway_down():
    assert tr.resolve_runtime(_spec(runtime_hint="openclaw_worker"), gateway_available=False) == "in_process"
    assert tr.resolve_runtime(_spec(runtime_hint="openclaw_worker"), gateway_available=True) == "openclaw_worker"


def test_in_process_hint_respected():
    assert tr.resolve_runtime(_spec(runtime_hint="in_process")) == "in_process"
