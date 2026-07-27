"""Tests for transactional memory consolidation (ported OpenHarness autodream)."""

from __future__ import annotations

import os
import time
import types
from pathlib import Path

import pytest

from plugins.memory.deerflow import autodream
from plugins.memory.deerflow.autodream import (
    DEFAULT_MIN_HOURS,
    HOLDER_STALE_SECONDS,
    ConsolidationResult,
    apply_consolidation_plan,
    create_memory_backup,
    diff_memory_dirs,
    latest_memory_backup,
    read_last_consolidated_at,
    record_consolidation,
    restore_memory_backup,
    rollback_consolidation_lock,
    run_consolidation,
    try_acquire_consolidation_lock,
    _lock_path,
    _parse_plan,
)
from plugins.memory.deerflow.provider import DeerflowMemoryProvider
from plugins.memory.deerflow.storage import (
    FileMemoryStorage,
    create_empty_memory,
    make_fact,
)


def _fake_llm(content):
    def call(**kwargs):
        msg = types.SimpleNamespace(content=content)
        return types.SimpleNamespace(choices=[types.SimpleNamespace(message=msg)])

    return call


def _store_with_facts(tmp_path, facts, user="alice"):
    st = FileMemoryStorage(tmp_path)
    data = create_empty_memory()
    data["facts"] = facts
    st.save(data, user)
    return st


def _fact(content, fid=None, category="context", conf=0.5):
    f = make_fact(content, category, conf)
    if fid:
        f["id"] = fid
    return f


# ---------------------------------------------------------------------------
# lock
# ---------------------------------------------------------------------------


def test_acquire_lock_on_fresh_dir(tmp_path):
    prior = try_acquire_consolidation_lock(tmp_path)
    assert prior == 0.0
    assert _lock_path(tmp_path).exists()


def test_lock_blocks_while_held_by_live_process(tmp_path):
    try_acquire_consolidation_lock(tmp_path)  # held by this (live) PID
    assert try_acquire_consolidation_lock(tmp_path) is None


def test_lock_taken_over_when_holder_dead(tmp_path, monkeypatch):
    lock = _lock_path(tmp_path)
    lock.parent.mkdir(parents=True, exist_ok=True)
    lock.write_text("999999999\n")
    # Report the holder as dead without signalling a real PID: the repo's
    # conftest live-system guard blocks os.kill outside the test subtree.
    monkeypatch.setattr(autodream, "_is_process_running", lambda pid: False)
    assert try_acquire_consolidation_lock(tmp_path) is not None


def test_lock_taken_over_when_stale(tmp_path):
    try_acquire_consolidation_lock(tmp_path)
    old = time.time() - HOLDER_STALE_SECONDS - 10
    os.utime(_lock_path(tmp_path), (old, old))
    assert try_acquire_consolidation_lock(tmp_path) is not None


def test_rollback_removes_lock_when_no_prior(tmp_path):
    prior = try_acquire_consolidation_lock(tmp_path)
    rollback_consolidation_lock(tmp_path, prior)
    assert not _lock_path(tmp_path).exists()


def test_rollback_restores_prior_mtime(tmp_path):
    record_consolidation(tmp_path)
    old = time.time() - 5000
    os.utime(_lock_path(tmp_path), (old, old))
    prior = read_last_consolidated_at(tmp_path)
    # a later run acquires + rolls back
    lock = _lock_path(tmp_path)
    lock.write_text("999999999\n")
    os.utime(lock, (old, old))
    acquired = try_acquire_consolidation_lock(tmp_path)
    rollback_consolidation_lock(tmp_path, acquired)
    assert abs(read_last_consolidated_at(tmp_path) - prior) < 1.0


def test_read_last_consolidated_at_zero_when_missing(tmp_path):
    assert read_last_consolidated_at(tmp_path) == 0.0


# ---------------------------------------------------------------------------
# backup / diff
# ---------------------------------------------------------------------------


def test_backup_and_restore_roundtrip(tmp_path):
    mem = tmp_path / "mem"
    mem.mkdir()
    (mem / "memory.json").write_text('{"facts": [1]}')
    backup = create_memory_backup(mem)
    assert (backup / "memory.json").exists()

    (mem / "memory.json").write_text('{"facts": [1, 2, 3]}')
    restore_memory_backup(backup, mem)
    assert (mem / "memory.json").read_text() == '{"facts": [1]}'


def test_backup_excludes_lock_file(tmp_path):
    mem = tmp_path / "mem"
    mem.mkdir()
    (mem / "memory.json").write_text("{}")
    record_consolidation(mem)
    backup = create_memory_backup(mem)
    assert not (backup / ".consolidate-lock").exists()


def test_latest_memory_backup(tmp_path):
    mem = tmp_path / "mem"
    mem.mkdir()
    (mem / "memory.json").write_text("{}")
    b1 = create_memory_backup(mem)
    assert latest_memory_backup(mem) == b1


def test_diff_memory_dirs(tmp_path):
    a, b = tmp_path / "a", tmp_path / "b"
    a.mkdir()
    b.mkdir()
    (a / "memory.json").write_text("1")
    (b / "memory.json").write_text("2")
    (b / "extra.json").write_text("x")
    diff = diff_memory_dirs(a, b)
    assert diff["changed"] == ["memory.json"]
    assert diff["added"] == ["extra.json"]


# ---------------------------------------------------------------------------
# plan parsing + guardrails
# ---------------------------------------------------------------------------


def test_parse_plan_handles_fences():
    plan = _parse_plan('```json\n{"drop": ["a"], "merge": []}\n```')
    assert plan["drop"] == ["a"]


def test_parse_plan_bad_json_is_noop():
    assert _parse_plan("sorry no json") == {"drop": [], "merge": []}


def test_apply_plan_drops_known_ids():
    facts = [_fact("x", "f1"), _fact("y", "f2")]
    new, dropped, merged = apply_consolidation_plan(
        facts, {"drop": ["f1"], "merge": []}
    )
    assert {f["id"] for f in new} == {"f2"}
    assert dropped == 1 and merged == 0


def test_apply_plan_ignores_unknown_ids():
    facts = [_fact("x", "f1")]
    new, dropped, _ = apply_consolidation_plan(facts, {"drop": ["nope"], "merge": []})
    assert len(new) == 1 and dropped == 0


def test_apply_plan_never_drops_protected_category():
    facts = [_fact("important correction", "f1", category="correction")]
    new, dropped, _ = apply_consolidation_plan(facts, {"drop": ["f1"], "merge": []})
    assert len(new) == 1 and dropped == 0


def test_apply_plan_merges_duplicates():
    facts = [
        _fact("likes python", "f1"),
        _fact("prefers python", "f2"),
        _fact("other", "f3"),
    ]
    plan = {
        "drop": [],
        "merge": [
            {"ids": ["f1", "f2"], "content": "prefers Python", "confidence": 0.9}
        ],
    }
    new, _, merged = apply_consolidation_plan(facts, plan)
    contents = {f["content"] for f in new}
    assert merged == 1
    assert "prefers Python" in contents
    assert "likes python" not in contents and "prefers python" not in contents
    assert "other" in contents


def test_apply_plan_merge_needs_two_ids():
    facts = [_fact("x", "f1")]
    plan = {"drop": [], "merge": [{"ids": ["f1"], "content": "merged"}]}
    new, _, merged = apply_consolidation_plan(facts, plan)
    assert merged == 0 and len(new) == 1


def test_apply_plan_caps_removals():
    facts = [_fact(f"f{i}", f"f{i}", conf=i / 10) for i in range(10)]
    plan = {"drop": [f["id"] for f in facts], "merge": []}
    new, _, _ = apply_consolidation_plan(facts, plan, max_removals=3)
    assert len(new) == 7


# ---------------------------------------------------------------------------
# run_consolidation — gating, success, rollback
# ---------------------------------------------------------------------------


def test_gated_by_min_hours(tmp_path):
    st = _store_with_facts(tmp_path, [_fact("x", "f1")])
    mem_dir = Path(st._path("alice")).parent
    record_consolidation(mem_dir)  # just consolidated
    res = run_consolidation(st, "alice", call_llm=_fake_llm("{}"), min_new_facts=0)
    assert not res.ran and "since last consolidation" in res.reason


def test_gated_by_min_new_facts(tmp_path):
    st = _store_with_facts(tmp_path, [_fact("x", "f1")])
    res = run_consolidation(st, "alice", call_llm=_fake_llm("{}"), min_new_facts=5)
    assert not res.ran and "below min_new_facts" in res.reason


def test_force_bypasses_gates(tmp_path):
    st = _store_with_facts(tmp_path, [_fact("x", "f1")])
    mem_dir = Path(st._path("alice")).parent
    record_consolidation(mem_dir)
    res = run_consolidation(
        st, "alice", call_llm=_fake_llm('{"drop": [], "merge": []}'), force=True
    )
    assert res.ran


def test_successful_consolidation_persists_and_stamps(tmp_path):
    facts = [
        _fact("likes go", "f1"),
        _fact("prefers go", "f2"),
        _fact("uses vim", "f3"),
    ]
    st = _store_with_facts(tmp_path, facts)
    mem_dir = Path(st._path("alice")).parent
    plan = '{"drop": ["f3"], "merge": [{"ids": ["f1","f2"], "content": "prefers Go", "confidence": 0.9}]}'
    res = run_consolidation(st, "alice", call_llm=_fake_llm(plan), force=True)

    assert res.ran and res.dropped == 1 and res.merged == 1
    stored = {f["content"] for f in st.load("alice")["facts"]}
    assert stored == {"prefers Go"}
    assert read_last_consolidated_at(mem_dir) > 0  # stamped
    assert res.backup and Path(res.backup).exists()


def test_preview_rolls_back(tmp_path):
    facts = [_fact("a", "f1"), _fact("b", "f2")]
    st = _store_with_facts(tmp_path, facts)
    res = run_consolidation(
        st,
        "alice",
        call_llm=_fake_llm('{"drop": ["f1"], "merge": []}'),
        force=True,
        preview=True,
    )
    assert res.ran and res.rolled_back
    # store restored to its pre-consolidation contents
    assert {f["id"] for f in st.load("alice")["facts"]} == {"f1", "f2"}


def test_llm_failure_rolls_back(tmp_path):
    facts = [_fact("a", "f1"), _fact("b", "f2")]
    st = _store_with_facts(tmp_path, facts)

    def boom(**_):
        raise RuntimeError("model down")

    res = run_consolidation(st, "alice", call_llm=boom, force=True)
    assert not res.ran and res.rolled_back
    assert "model down" in res.reason
    assert {f["id"] for f in st.load("alice")["facts"]} == {"f1", "f2"}


def test_lock_prevents_concurrent_run(tmp_path):
    st = _store_with_facts(tmp_path, [_fact("a", "f1")])
    mem_dir = Path(st._path("alice")).parent
    try_acquire_consolidation_lock(mem_dir)  # held by this live process
    res = run_consolidation(st, "alice", call_llm=_fake_llm("{}"), force=True)
    assert not res.ran and "holds the lock" in res.reason


# ---------------------------------------------------------------------------
# provider wiring
# ---------------------------------------------------------------------------


def test_provider_consolidate_method(tmp_path):
    facts = [_fact("likes rust", "f1"), _fact("prefers rust", "f2")]
    st = _store_with_facts(tmp_path, facts)
    plan = '{"drop": [], "merge": [{"ids": ["f1","f2"], "content": "prefers Rust", "confidence": 0.9}]}'
    p = DeerflowMemoryProvider(call_llm=_fake_llm(plan), storage=st)
    p.initialize("s", user_id="alice", hermes_home=str(tmp_path))
    res = p.consolidate(force=True)
    assert res.ran and res.merged == 1
    assert {f["content"] for f in st.load("alice")["facts"]} == {"prefers Rust"}


def test_provider_consolidate_uninitialized():
    p = DeerflowMemoryProvider()
    res = p.consolidate()
    assert isinstance(res, ConsolidationResult) and not res.ran
