from __future__ import annotations

from tools import merlion_classify as mc


# ---- is_complex_task ------------------------------------------------------

def test_launch_venture_is_complex():
    assert mc.is_complex_task("Build and launch a cross-border payments app") is True


def test_simple_request_is_not_complex():
    assert mc.is_complex_task("Summarize this article") is False


def test_long_multiseg_is_complex():
    q = "Research the market and then design the product and then write the launch plan " * 2
    assert mc.is_complex_task(q) is True


def test_chinese_venture_markers():
    assert mc.is_complex_task("帮我搭建一个跨境支付平台") is True


# ---- classify -------------------------------------------------------------

def test_classify_venture_is_very_complex_org():
    c = mc.classify("Launch a fintech super-app with KYC and lending")
    assert c.tier == "very_complex"
    assert c.scale == "org"
    assert c.suggested_departments  # populated for org


def test_classify_simple_when_no_mode_and_trivial():
    c = mc.classify("hi", has_mode=False)
    assert c.tier == "simple"
    assert c.scale == "small"


def test_upload_forces_very_complex():
    c = mc.classify("review this", upload=True)
    assert c.tier == "very_complex"
    assert c.needs_upload_context is True


def test_scale_hint_overrides():
    c = mc.classify("Launch a payments platform", scale_hint="small")
    assert c.scale == "small"


def test_llm_upgrades_tier_conservatively():
    # Heuristic would say 'complex'; LLM says 'very_complex' → take higher.
    def llm(_q: str) -> mc.Classification:
        return mc.Classification(tier="very_complex", scale="org", confidence=0.9)

    c = mc.classify("Coordinate a focused multi-specialist analysis", llm=llm)
    assert c.tier == "very_complex"


def test_llm_cannot_downgrade_tier():
    # Heuristic says very_complex (venture); LLM says simple → keep very_complex.
    def llm(_q: str) -> mc.Classification:
        return mc.Classification(tier="simple", scale="small", confidence=0.95)

    c = mc.classify("Build and launch a banking app", llm=llm)
    assert c.tier == "very_complex"


# ---- suggest_departments --------------------------------------------------

def test_suggest_departments_hits_keywords():
    depts = mc.suggest_departments("we need KYC compliance and payments engineering")
    assert "compliance" in depts
    assert "eng" in depts


def test_suggest_departments_defaults_to_all():
    assert mc.suggest_departments("xyzzy") == list(mc.DEFAULT_DEPARTMENTS)
