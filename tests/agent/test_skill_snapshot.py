"""Tests for immutable skill-activation snapshots (W5)."""

from __future__ import annotations

import json

import pytest

from agent.skill_snapshot import (
    PIN,
    TRACK_ACTIVE,
    UNKNOWN_VERSION,
    SkillEntry,
    build_snapshot,
    compute_snapshot_id,
    diff_snapshot,
    entry_from_path,
    parse_snapshot,
    read_skill_version,
    sha256_text,
)

SKILL_MD = """---
name: demo
version: 1.2.3
description: A demo skill.
---

# Demo

Body text.
"""


def _write_skill(tmp_path, name, version="1.0.0", body="Body"):
    path = tmp_path / f"{name}.md"
    path.write_text(f"---\nname: {name}\nversion: {version}\n---\n\n{body}\n")
    return path


# ---------------------------------------------------------------------------
# Version + hashing
# ---------------------------------------------------------------------------


def test_reads_version_from_frontmatter():
    assert read_skill_version(SKILL_MD) == "1.2.3"


def test_missing_version_falls_back_to_unknown():
    assert read_skill_version("---\nname: x\n---\nbody") == UNKNOWN_VERSION


def test_malformed_skill_never_raises():
    for bad in ("", "no frontmatter at all", "---\n:::\n---\n"):
        assert read_skill_version(bad)


def test_content_hash_is_stable_and_sensitive():
    assert sha256_text("abc") == sha256_text("abc")
    assert sha256_text("abc") != sha256_text("abd")


# ---------------------------------------------------------------------------
# Entries
# ---------------------------------------------------------------------------


def test_entry_from_path_captures_version_and_hash(tmp_path):
    path = _write_skill(tmp_path, "demo", version="2.0.0")
    entry = entry_from_path("demo", path)
    assert entry.version == "2.0.0"
    assert entry.content_sha256
    assert entry.policy == TRACK_ACTIVE


def test_unreadable_skill_still_yields_an_entry(tmp_path):
    """One broken file must not stop the run from being recorded."""
    entry = entry_from_path("ghost", tmp_path / "missing.md")
    assert entry.name == "ghost"
    assert entry.content_sha256 == ""


def test_unknown_policy_degrades_to_track_active(tmp_path):
    path = _write_skill(tmp_path, "demo")
    assert entry_from_path("demo", path, policy="nonsense").policy == TRACK_ACTIVE


# ---------------------------------------------------------------------------
# Snapshot identity
# ---------------------------------------------------------------------------


def test_same_skill_set_gives_the_same_id(tmp_path):
    skills = {"a": _write_skill(tmp_path, "a"), "b": _write_skill(tmp_path, "b")}
    assert build_snapshot(skills).snapshot_id == build_snapshot(skills).snapshot_id


def test_id_is_independent_of_ordering(tmp_path):
    a, b = _write_skill(tmp_path, "a"), _write_skill(tmp_path, "b")
    first = build_snapshot({"a": a, "b": b})
    second = build_snapshot({"b": b, "a": a})
    assert first.snapshot_id == second.snapshot_id


def test_editing_a_skill_changes_the_id(tmp_path):
    path = _write_skill(tmp_path, "a", body="original")
    before = build_snapshot({"a": path}).snapshot_id
    path.write_text("---\nname: a\nversion: 1.0.0\n---\n\nEDITED\n")
    assert build_snapshot({"a": path}).snapshot_id != before


def test_bumping_a_version_changes_the_id(tmp_path):
    path = _write_skill(tmp_path, "a", version="1.0.0")
    before = build_snapshot({"a": path}).snapshot_id
    path.write_text("---\nname: a\nversion: 2.0.0\n---\n\nBody\n")
    assert build_snapshot({"a": path}).snapshot_id != before


def test_adding_a_skill_changes_the_id(tmp_path):
    a = _write_skill(tmp_path, "a")
    before = build_snapshot({"a": a}).snapshot_id
    after = build_snapshot({"a": a, "b": _write_skill(tmp_path, "b")}).snapshot_id
    assert before != after


def test_id_ignores_install_path(tmp_path):
    """Same skill under a different root is the same skill."""
    one = tmp_path / "root1"
    two = tmp_path / "root2"
    one.mkdir()
    two.mkdir()
    body = "---\nname: a\nversion: 1.0.0\n---\n\nBody\n"
    (one / "a.md").write_text(body)
    (two / "a.md").write_text(body)
    assert (
        build_snapshot({"a": one / "a.md"}).snapshot_id
        == build_snapshot({"a": two / "a.md"}).snapshot_id
    )


def test_changing_the_policy_changes_the_id(tmp_path):
    path = _write_skill(tmp_path, "a")
    tracked = build_snapshot({"a": path})
    pinned = build_snapshot({"a": path}, policies={"a": PIN})
    assert tracked.snapshot_id != pinned.snapshot_id


def test_empty_snapshot_is_well_formed():
    snap = build_snapshot({})
    assert snap.entries == ()
    assert snap.snapshot_id == compute_snapshot_id([])


# ---------------------------------------------------------------------------
# Policies
# ---------------------------------------------------------------------------


def test_default_policy_is_track_active(tmp_path):
    snap = build_snapshot({"a": _write_skill(tmp_path, "a")})
    assert snap.get("a").policy == TRACK_ACTIVE
    assert snap.pinned() == ()


def test_pinned_entries_are_reported(tmp_path):
    snap = build_snapshot(
        {"a": _write_skill(tmp_path, "a"), "b": _write_skill(tmp_path, "b")},
        policies={"a": PIN},
    )
    assert [e.name for e in snap.pinned()] == ["a"]


def test_policies_apply_to_prebuilt_entries():
    entries = [SkillEntry(name="a", content_sha256="h")]
    snap = build_snapshot(entries, policies={"a": PIN})
    assert snap.get("a").policy == PIN


# ---------------------------------------------------------------------------
# Serialisation
# ---------------------------------------------------------------------------


def test_snapshot_roundtrips_through_json(tmp_path):
    snap = build_snapshot({"a": _write_skill(tmp_path, "a")}, policies={"a": PIN})
    restored = parse_snapshot(snap.to_json())
    assert restored.snapshot_id == snap.snapshot_id
    assert restored.get("a").policy == PIN


def test_to_dict_is_json_serialisable(tmp_path):
    snap = build_snapshot({"a": _write_skill(tmp_path, "a")})
    assert json.loads(json.dumps(snap.to_dict()))["snapshot_id"] == snap.snapshot_id


@pytest.mark.parametrize("bad", [None, "", "not json", "[1,2]", 42, {"entries": "x"}])
def test_parse_snapshot_degrades_gracefully(bad):
    result = parse_snapshot(bad)
    assert result is None or result.entries == ()


def test_parse_snapshot_recomputes_a_missing_id():
    restored = parse_snapshot({"entries": [{"name": "a", "content_sha256": "h"}]})
    assert restored.snapshot_id


def test_parse_snapshot_skips_entries_without_a_name():
    restored = parse_snapshot({"entries": [{"version": "1"}, {"name": "ok"}]})
    assert restored.names == ("ok",)


# ---------------------------------------------------------------------------
# Drift detection
# ---------------------------------------------------------------------------


def test_identical_sets_report_clean(tmp_path):
    snap = build_snapshot({"a": _write_skill(tmp_path, "a")})
    report = diff_snapshot(snap, snap)
    assert report.clean
    assert "match" in report.summary()


def test_edited_skill_shows_as_changed(tmp_path):
    path = _write_skill(tmp_path, "a", body="v1")
    recorded = build_snapshot({"a": path})
    path.write_text("---\nname: a\nversion: 1.0.0\n---\n\nv2\n")
    report = diff_snapshot(recorded, build_snapshot({"a": path}))
    assert report.changed == ("a",)
    assert not report.clean


def test_pinned_skill_change_is_flagged_as_a_violation(tmp_path):
    """The whole point of pinning: drift here is louder than ordinary drift."""
    path = _write_skill(tmp_path, "a", body="v1")
    recorded = build_snapshot({"a": path}, policies={"a": PIN})
    path.write_text("---\nname: a\nversion: 1.0.0\n---\n\nv2\n")
    report = diff_snapshot(recorded, build_snapshot({"a": path}, policies={"a": PIN}))
    assert report.pin_violations == ("a",)
    assert "pinned skill(s) changed" in report.summary()


def test_tracked_skill_change_is_not_a_violation(tmp_path):
    path = _write_skill(tmp_path, "a", body="v1")
    recorded = build_snapshot({"a": path})
    path.write_text("---\nname: a\nversion: 1.0.0\n---\n\nv2\n")
    report = diff_snapshot(recorded, build_snapshot({"a": path}))
    assert report.changed == ("a",)
    assert report.pin_violations == ()


def test_added_and_removed_skills_are_reported(tmp_path):
    a, b = _write_skill(tmp_path, "a"), _write_skill(tmp_path, "b")
    recorded = build_snapshot({"a": a})
    report = diff_snapshot(recorded, build_snapshot({"b": b}))
    assert report.added == ("b",)
    assert report.removed == ("a",)


def test_real_shipped_skill_can_be_snapshotted():
    """The shipped skills declare version: in frontmatter — use a real one."""
    from pathlib import Path

    skill = Path(__file__).resolve().parents[2] / "skills" / "computer-use" / "SKILL.md"
    if not skill.exists():
        pytest.skip("shipped skill not present")
    entry = entry_from_path("computer-use", skill)
    assert entry.version != UNKNOWN_VERSION
    assert entry.content_sha256
