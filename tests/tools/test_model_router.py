from __future__ import annotations

from tools import model_router as mr


# ---- category resolution --------------------------------------------------

def test_default_category_map_matches_prd():
    assert mr.resolve_category_model("deep") == "gpt-5.5"
    assert mr.resolve_category_model("quick") == "sonnet"
    assert mr.resolve_category_model("plan") == "opus"


def test_unknown_category_falls_back_to_orchestrate():
    assert mr.resolve_category_model("nonsense") == "opus"


def test_override_table_wins():
    table = {"deep": "custom-deep", "orchestrate": "custom-orch"}
    assert mr.resolve_category_model("deep", table=table) == "custom-deep"
    assert mr.resolve_category_model("missing", table=table) == "custom-orch"


# ---- fallback chain -------------------------------------------------------

def test_fallback_chain_primary_then_fallback():
    assert mr.fallback_chain("gpt-5.5") == ["gpt-5.5", "opus"]


def test_fallback_chain_no_fallback_is_single():
    assert mr.fallback_chain("opus") == ["opus"]


def test_fallback_chain_respects_max_attempts():
    table = {"a": "b", "b": "c", "c": "d"}
    assert mr.fallback_chain("a", max_attempts=2, table=table) == ["a", "b"]


def test_fallback_chain_breaks_on_cycle():
    table = {"a": "b", "b": "a"}
    assert mr.fallback_chain("a", table=table) == ["a", "b"]


# ---- slot pool ------------------------------------------------------------

def test_slot_pool_acquire_until_capacity():
    pool = mr.SlotPool(capacity={"anthropic": 2}, model_provider={"opus": "anthropic"})
    assert pool.acquire("opus") is True
    assert pool.acquire("opus") is True
    assert pool.acquire("opus") is False  # at capacity → queue


def test_slot_pool_release_frees_slot():
    pool = mr.SlotPool(capacity={"anthropic": 1}, model_provider={"opus": "anthropic"})
    assert pool.acquire("opus") is True
    assert pool.acquire("opus") is False
    pool.release("opus")
    assert pool.acquire("opus") is True


def test_slot_pool_unknown_provider_is_unmetered():
    pool = mr.SlotPool(capacity={}, model_provider={})
    assert pool.acquire("mystery-model") is True
    assert pool.has_capacity("mystery-model") is True
