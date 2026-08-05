"""Immutable skill-activation snapshots for reproducibility auditing.

Inspired by wanman's skill-activation snapshots (`shared-skill-manager.ts` /
`brain-manager.ts`, Apache-2.0), which pin a versioned skill bundle per run and
record its id against the run so you can answer, after the fact, *which version
of which skill did this agent actually have?*

**Why this exists.** Hermes skills already declare a ``version:`` in their
SKILL.md frontmatter, but nothing captures which versions a given run loaded.
Skills change — they are edited by hand, installed from a hub, and rewritten by
the curator — so a run that behaved oddly last week cannot be reconstructed:
the skill it used may no longer exist in that form. A snapshot closes that gap
for the cost of hashing a few files.

The second half is what makes snapshots useful rather than merely archival:
a **pin policy** per skill. ``track_active`` (the default) follows whatever is
installed; ``pin`` freezes a skill at a recorded content hash, so a run can be
re-executed against the same skill text even after the installed copy moves on.

**Modifications from upstream.** Upstream stores bundles in a Postgres schema
with a full promotion lifecycle (``draft→candidate→canary→active→deprecated``)
and A/B evaluation tables, all in service of a hosted skill-evolution product.
None of that is ported: this is the snapshot and the pin policy only, as plain
data with a deterministic id, so it can be persisted wherever the caller
already keeps run records.

This module reads skills; it does not change how they are discovered or loaded.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Tuple

SNAPSHOT_VERSION = 1

#: Follow whatever version is currently installed (default).
TRACK_ACTIVE = "track_active"
#: Freeze this skill at the recorded content hash.
PIN = "pin"

VALID_POLICIES = (TRACK_ACTIVE, PIN)

UNKNOWN_VERSION = "unknown"


@dataclass(frozen=True)
class SkillEntry:
    """One skill as it existed when the snapshot was taken."""

    name: str
    version: str = UNKNOWN_VERSION
    content_sha256: str = ""
    policy: str = TRACK_ACTIVE
    path: str = ""

    def identity(self) -> Tuple[str, str, str, str]:
        """The fields that define this entry for hashing purposes.

        Deliberately excludes ``path``: the same skill content installed under
        a different root is the same skill, and including the path would make
        snapshot ids differ between a dev checkout and a container.
        """
        return (self.name, self.version, self.content_sha256, self.policy)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "version": self.version,
            "content_sha256": self.content_sha256,
            "policy": self.policy,
            "path": self.path,
        }


@dataclass(frozen=True)
class SkillSnapshot:
    """An immutable record of the skill set active for one run."""

    snapshot_id: str
    entries: Tuple[SkillEntry, ...] = ()
    version: int = SNAPSHOT_VERSION

    def to_dict(self) -> Dict[str, Any]:
        return {
            "snapshot_id": self.snapshot_id,
            "version": self.version,
            "entries": [entry.to_dict() for entry in self.entries],
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), sort_keys=True)

    def get(self, name: str) -> Optional[SkillEntry]:
        for entry in self.entries:
            if entry.name == name:
                return entry
        return None

    @property
    def names(self) -> Tuple[str, ...]:
        return tuple(entry.name for entry in self.entries)

    def pinned(self) -> Tuple[SkillEntry, ...]:
        return tuple(e for e in self.entries if e.policy == PIN)


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8", errors="replace")).hexdigest()


def read_skill_version(content: str) -> str:
    """Extract ``version:`` from a SKILL.md's frontmatter.

    Falls back to :data:`UNKNOWN_VERSION` — a skill without a declared version
    is still worth snapshotting, because the content hash pins it regardless.
    """
    try:
        from agent.skill_utils import parse_frontmatter

        frontmatter, _body = parse_frontmatter(content)
    except Exception:  # noqa: BLE001 — never let a malformed skill break a run
        return UNKNOWN_VERSION
    value = (frontmatter or {}).get("version")
    if value is None:
        return UNKNOWN_VERSION
    return str(value).strip() or UNKNOWN_VERSION


def _normalize_policy(policy: Any) -> str:
    text = str(policy or "").strip().lower()
    return text if text in VALID_POLICIES else TRACK_ACTIVE


def entry_from_path(
    name: str, path: str | Path, *, policy: str = TRACK_ACTIVE
) -> SkillEntry:
    """Build a :class:`SkillEntry` by reading a SKILL.md from disk.

    An unreadable skill still produces an entry (with an empty hash) rather
    than raising, so one broken file cannot prevent a run from being recorded.
    """
    skill_path = Path(path)
    try:
        content = skill_path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return SkillEntry(
            name=name,
            version=UNKNOWN_VERSION,
            content_sha256="",
            policy=_normalize_policy(policy),
            path=str(skill_path),
        )
    return SkillEntry(
        name=name,
        version=read_skill_version(content),
        content_sha256=sha256_text(content),
        policy=_normalize_policy(policy),
        path=str(skill_path),
    )


def compute_snapshot_id(entries: Iterable[SkillEntry]) -> str:
    """Derive a deterministic id from the entry set.

    Sorted by name so ordering never affects the id, and truncated to 16 hex
    chars — enough to be collision-free in practice and short enough to sit in
    a log line or a task result.
    """
    digest = hashlib.sha256()
    for entry in sorted(entries, key=lambda e: e.name):
        digest.update("\x1f".join(entry.identity()).encode("utf-8"))
        digest.update(b"\x1e")
    return digest.hexdigest()[:16]


def build_snapshot(
    skills: Mapping[str, str] | Iterable[SkillEntry],
    *,
    policies: Optional[Mapping[str, str]] = None,
) -> SkillSnapshot:
    """Snapshot a skill set.

    *skills* is either ``{name: path_to_SKILL.md}`` or ready-made entries.
    *policies* optionally maps a skill name to ``pin`` / ``track_active``.
    """
    policies = policies or {}
    entries: List[SkillEntry]
    if isinstance(skills, Mapping):
        entries = [
            entry_from_path(name, path, policy=policies.get(name, TRACK_ACTIVE))
            for name, path in skills.items()
        ]
    else:
        entries = []
        for entry in skills:
            policy = policies.get(entry.name)
            entries.append(entry if policy is None else _with_policy(entry, policy))

    entries.sort(key=lambda e: e.name)
    return SkillSnapshot(
        snapshot_id=compute_snapshot_id(entries), entries=tuple(entries)
    )


def _with_policy(entry: SkillEntry, policy: Any) -> SkillEntry:
    return SkillEntry(
        name=entry.name,
        version=entry.version,
        content_sha256=entry.content_sha256,
        policy=_normalize_policy(policy),
        path=entry.path,
    )


def parse_snapshot(raw: Any) -> Optional[SkillSnapshot]:
    """Rebuild a snapshot from its stored JSON. Returns None if unusable."""
    if isinstance(raw, SkillSnapshot):
        return raw
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (ValueError, TypeError):
            return None
    if not isinstance(raw, dict):
        return None
    entries = []
    for item in raw.get("entries") or []:
        if not isinstance(item, dict) or not item.get("name"):
            continue
        entries.append(
            SkillEntry(
                name=str(item.get("name")),
                version=str(item.get("version") or UNKNOWN_VERSION),
                content_sha256=str(item.get("content_sha256") or ""),
                policy=_normalize_policy(item.get("policy")),
                path=str(item.get("path") or ""),
            )
        )
    snapshot_id = str(raw.get("snapshot_id") or "") or compute_snapshot_id(entries)
    return SkillSnapshot(snapshot_id=snapshot_id, entries=tuple(entries))


@dataclass(frozen=True)
class DriftReport:
    """How a live skill set differs from a recorded snapshot."""

    changed: Tuple[str, ...] = ()
    """Skills whose content hash moved (pinned ones are violations)."""

    added: Tuple[str, ...] = ()
    removed: Tuple[str, ...] = ()
    pin_violations: Tuple[str, ...] = field(default=())

    @property
    def clean(self) -> bool:
        return not (self.changed or self.added or self.removed)

    def summary(self) -> str:
        if self.clean:
            return "skills match the snapshot"
        parts = []
        for label, values in (
            ("changed", self.changed),
            ("added", self.added),
            ("removed", self.removed),
        ):
            if values:
                parts.append(f"{label}: {', '.join(values)}")
        text = "; ".join(parts)
        if self.pin_violations:
            text += f" (pinned skill(s) changed: {', '.join(self.pin_violations)})"
        return text


def diff_snapshot(recorded: SkillSnapshot, current: SkillSnapshot) -> DriftReport:
    """Compare a recorded snapshot against the skills present now.

    ``pin_violations`` calls out the changes that matter most: a skill the run
    explicitly froze is no longer what it was.
    """
    recorded_by_name = {e.name: e for e in recorded.entries}
    current_by_name = {e.name: e for e in current.entries}

    changed = []
    pin_violations = []
    for name, entry in recorded_by_name.items():
        other = current_by_name.get(name)
        if other is None or other.content_sha256 == entry.content_sha256:
            continue
        changed.append(name)
        if entry.policy == PIN:
            pin_violations.append(name)

    return DriftReport(
        changed=tuple(sorted(changed)),
        added=tuple(sorted(set(current_by_name) - set(recorded_by_name))),
        removed=tuple(sorted(set(recorded_by_name) - set(current_by_name))),
        pin_violations=tuple(sorted(pin_violations)),
    )
