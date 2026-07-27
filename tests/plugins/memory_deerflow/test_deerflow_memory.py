"""Tests for the deerflow memory provider plugin (storage/extractor/provider)."""

from __future__ import annotations

import types
from datetime import UTC, datetime, timedelta

from plugins.memory.deerflow.extractor import (
    apply_staleness_removals,
    extract_facts,
    select_stale_candidates,
)
from plugins.memory.deerflow.provider import DeerflowMemoryProvider
from plugins.memory.deerflow.storage import (
    FileMemoryStorage,
    create_empty_memory,
    make_fact,
    safe_user_id,
)


# ---------------------------------------------------------------------------
# storage
# ---------------------------------------------------------------------------


def test_empty_memory_schema():
    m = create_empty_memory()
    assert set(m) >= {"user", "history", "facts", "version"}
    assert m["facts"] == []


def test_make_fact_normalizes():
    f = make_fact("  likes dark mode  ", "preference", 1.5)
    assert f["content"] == "likes dark mode"
    assert f["category"] == "preference"
    assert f["confidence"] == 1.0  # clamped
    assert f["id"].startswith("fact_")
    assert f["createdAt"].endswith("Z")


def test_safe_user_id_traversal():
    assert safe_user_id("../../etc") == "etc" or ".." not in safe_user_id("../../etc")
    assert safe_user_id("") == "default"


def test_storage_roundtrip(tmp_path):
    st = FileMemoryStorage(tmp_path)
    data = create_empty_memory()
    data["facts"].append(make_fact("uses python", "knowledge", 0.9))
    assert st.save(data, "alice")
    loaded = st.load("alice")
    assert loaded["facts"][0]["content"] == "uses python"
    # per-user isolation
    assert st.load("bob")["facts"] == []


def test_storage_cache_invalidation(tmp_path):
    st = FileMemoryStorage(tmp_path)
    st.save(create_empty_memory(), "u")
    st.load("u")
    d = create_empty_memory()
    d["facts"].append(make_fact("new fact"))
    st.save(d, "u")
    assert st.load("u")["facts"][0]["content"] == "new fact"


# ---------------------------------------------------------------------------
# extractor
# ---------------------------------------------------------------------------


def _fake_llm(content):
    def call(**kwargs):
        msg = types.SimpleNamespace(content=content)
        choice = types.SimpleNamespace(message=msg)
        return types.SimpleNamespace(choices=[choice])

    return call


def test_extract_facts_parses_json_array():
    resp = '[{"content": "prefers TS", "category": "preference", "confidence": 0.9}]'
    facts = extract_facts("User: I prefer TypeScript", call_llm=_fake_llm(resp))
    assert len(facts) == 1
    assert facts[0]["content"] == "prefers TS"
    assert facts[0]["category"] == "preference"


def test_extract_facts_handles_code_fence():
    resp = '```json\n[{"content": "x", "confidence": 0.8}]\n```'
    facts = extract_facts("hi", call_llm=_fake_llm(resp))
    assert facts[0]["content"] == "x"


def test_extract_facts_dedupes_existing():
    resp = '[{"content": "known", "confidence": 0.9}]'
    facts = extract_facts("hi", existing_contents={"known"}, call_llm=_fake_llm(resp))
    assert facts == []


def test_extract_facts_bad_json_returns_empty():
    facts = extract_facts("hi", call_llm=_fake_llm("sorry, no JSON here"))
    assert facts == []


def test_extract_facts_empty_conversation():
    assert extract_facts("   ", call_llm=_fake_llm("[]")) == []


# ---------------------------------------------------------------------------
# staleness
# ---------------------------------------------------------------------------


def _aged_fact(fid, days, category="context", conf=0.5):
    f = make_fact(f"fact {fid}", category, conf)
    f["id"] = fid
    f["createdAt"] = (
        (datetime.now(UTC) - timedelta(days=days)).isoformat().replace("+00:00", "Z")
    )
    return f


def test_select_stale_candidates_by_age():
    facts = [_aged_fact("old", 400), _aged_fact("new", 5)]
    cands = select_stale_candidates(facts, age_days=180)
    assert [f["id"] for f in cands] == ["old"]


def test_stale_excludes_protected_category():
    facts = [_aged_fact("corr", 400, category="correction")]
    assert select_stale_candidates(facts, age_days=180) == []


def test_apply_removals_guardrail_intersects_candidates():
    facts = [
        _aged_fact("old", 400),
        _aged_fact("new", 5),
        _aged_fact("corr", 400, "correction"),
    ]
    # Model asks to remove all three, but only genuine stale candidates go.
    kept = apply_staleness_removals(facts, {"old", "new", "corr"}, age_days=180)
    kept_ids = {f["id"] for f in kept}
    assert "old" not in kept_ids  # aged, removable
    assert "new" in kept_ids  # not aged → protected by guardrail
    assert "corr" in kept_ids  # protected category → never pruned


def test_apply_removals_caps_max():
    facts = [_aged_fact(f"f{i}", 400, conf=i / 10) for i in range(8)]
    remove = {f["id"] for f in facts}
    kept = apply_staleness_removals(facts, remove, age_days=180, max_removals=3)
    assert len(kept) == 5  # 8 - 3 cap


# ---------------------------------------------------------------------------
# provider
# ---------------------------------------------------------------------------


def _provider(tmp_path, llm_content="[]"):
    return DeerflowMemoryProvider(
        call_llm=_fake_llm(llm_content),
        storage=FileMemoryStorage(tmp_path),
    )


def test_provider_name():
    assert DeerflowMemoryProvider().name == "deerflow"


def test_provider_no_tools():
    assert DeerflowMemoryProvider().get_tool_schemas() == []


def test_provider_sync_and_flush_persists_facts(tmp_path):
    p = _provider(tmp_path, '[{"content": "loves go", "confidence": 0.9}]')
    p.initialize("sess", user_id="alice", hermes_home=str(tmp_path))
    p._storage = FileMemoryStorage(tmp_path)  # ensure isolated
    p.sync_turn("I love Go", "Great!", session_id="sess")
    p.on_session_end([])
    facts = p._storage.load("alice")["facts"]
    assert any("loves go" in f["content"] for f in facts)


def test_provider_prefetch_injects_top_facts(tmp_path):
    st = FileMemoryStorage(tmp_path)
    data = create_empty_memory()
    data["facts"] = [
        make_fact("uses rust", "knowledge", 0.95),
        make_fact("likes tea", "preference", 0.3),
    ]
    st.save(data, "alice")
    p = DeerflowMemoryProvider(storage=st)
    p.initialize("s", user_id="alice", hermes_home=str(tmp_path))
    out = p.prefetch("what do I use?")
    assert "<memory>" in out
    assert "uses rust" in out


def test_provider_prefetch_empty_when_no_facts(tmp_path):
    p = _provider(tmp_path)
    p.initialize("s", user_id="alice", hermes_home=str(tmp_path))
    assert p.prefetch("x") == ""


def test_provider_flush_noop_without_conversation(tmp_path):
    p = _provider(tmp_path, '[{"content": "x", "confidence": 0.9}]')
    p.initialize("s", user_id="alice", hermes_home=str(tmp_path))
    p.on_session_end([])  # nothing buffered
    assert p._storage.load("alice")["facts"] == []
