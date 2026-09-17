"""Sidebar sections — the org chart.

Ported from grok-bot 0.18's ``source/shared/sidebar-sections.ts``. The rules
that matter, all of which the original enforces in ``normalize``:

* **A teammate belongs to exactly one section.** The first section claiming an
  id wins; later claims are dropped. Otherwise a teammate appears twice in the
  sidebar and "who owns this" stops being answerable at a glance.
* **Unassigned is synthesised, never stored.** A section literally named
  ``__agents__`` in the input is discarded and re-appended last, so the bucket
  cannot be renamed, reordered, deleted, or given members directly.
* **Duplicate and blank section ids are dropped**, so a malformed PUT narrows
  the layout rather than corrupting it.
* **Fold state survives a re-layout.** Renaming a section or moving one
  teammate must not silently expand everything the operator had collapsed.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass
from typing import Iterable, Optional, Sequence

from crew.db import UNASSIGNED_SECTION_ID, UNASSIGNED_SECTION_NAME


@dataclass(frozen=True)
class Section:
    id: str
    name: str
    bot_ids: tuple[str, ...]
    #: Tri-state on purpose. ``None`` means *the caller said nothing about the
    #: fold*, which is different from ``False`` (explicitly expanded) — and the
    #: difference is load-bearing in :func:`carry_folds`. A layout PUT that
    #: only renames a section must not silently spring open everything the
    #: operator had collapsed, so an omitted ``collapsed`` has to be
    #: distinguishable from a stated one. (The original
    #: ``sidebar-sections.ts`` gets this for free from ``undefined``.)
    collapsed: Optional[bool] = None

    @property
    def is_collapsed(self) -> bool:
        """The fold as rendered: unspecified reads as expanded."""
        return bool(self.collapsed)

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "bot_ids": list(self.bot_ids),
            "collapsed": self.is_collapsed,
        }


def normalize(sections: Sequence[Section]) -> list[Section]:
    """Drop duplicates and double-claims, then append the Unassigned bucket.

    Returns ``[]`` for empty input — a workspace with no named sections renders
    a flat roster, not one containing a single empty "Unassigned" header.
    """
    seen_ids: set[str] = set()
    claimed: set[str] = set()
    out: list[Section] = []

    for section in sections:
        sid = section.id.strip()
        if not sid or sid in seen_ids:
            continue
        seen_ids.add(sid)
        if sid == UNASSIGNED_SECTION_ID:
            continue  # synthesised below; never taken from input
        bot_ids: list[str] = []
        for bot_id in section.bot_ids:
            if not bot_id or bot_id in claimed:
                continue
            claimed.add(bot_id)
            bot_ids.append(bot_id)
        out.append(Section(id=sid, name=section.name, bot_ids=tuple(bot_ids),
                           collapsed=section.collapsed))

    if not out:
        return []
    out.append(Section(id=UNASSIGNED_SECTION_ID, name=UNASSIGNED_SECTION_NAME, bot_ids=()))
    return out


def carry_folds(sections: Sequence[Section], stored: Optional[Sequence[Section]] = None) -> list[Section]:
    """Normalise ``sections`` while keeping the collapsed state already on disk.

    Only sections that actually *state* a fold contribute, so a PUT that just
    renames or reorders inherits what was stored. Later entries win, which is
    how the operator clicking a chevron in the same request that reorders a
    section still takes effect.
    """
    folds: dict[str, bool] = {}
    for section in [*(stored or []), *sections]:
        if section.collapsed is not None:
            folds[section.id.strip()] = section.collapsed
    return [
        Section(id=s.id, name=s.name, bot_ids=s.bot_ids, collapsed=folds.get(s.id, False))
        for s in normalize(sections)
    ]


def with_unassigned(sections: Sequence[Section], all_bot_ids: Iterable[str]) -> list[Section]:
    """Fill the Unassigned bucket with every teammate no section claimed.

    Called on read, not on write: a newly hired teammate must appear in the
    sidebar immediately without anyone having to touch the layout.
    """
    result = list(sections)
    if not result:
        return [Section(id=UNASSIGNED_SECTION_ID, name=UNASSIGNED_SECTION_NAME,
                        bot_ids=tuple(all_bot_ids))]
    claimed = {bot_id for s in result for bot_id in s.bot_ids}
    leftovers = tuple(b for b in all_bot_ids if b not in claimed)
    return [
        Section(id=s.id, name=s.name, bot_ids=(leftovers if s.id == UNASSIGNED_SECTION_ID else s.bot_ids),
                collapsed=s.collapsed)
        for s in result
    ]


# ---------------------------------------------------------------------------
# Persistence
#
# Membership lives on ``bots.section_id`` / ``bots.position`` rather than in a
# join table: a teammate is in exactly one section, so a column expresses the
# invariant that a join table would only let us violate.
# ---------------------------------------------------------------------------


def load_sections(conn: sqlite3.Connection) -> list[Section]:
    rows = conn.execute("SELECT * FROM sections ORDER BY position, id").fetchall()
    members: dict[str, list[str]] = {}
    for bot in conn.execute(
        "SELECT id, section_id FROM bots WHERE section_id != '' ORDER BY position, name COLLATE NOCASE"
    ):
        members.setdefault(bot["section_id"], []).append(bot["id"])
    sections = [
        Section(id=r["id"], name=r["name"], bot_ids=tuple(members.get(r["id"], ())),
                collapsed=bool(r["collapsed"]))
        for r in rows
    ]
    return normalize(sections)


def save_sections(conn: sqlite3.Connection, sections: Sequence[Section]) -> list[Section]:
    """Replace the layout, then return what was actually stored.

    Returning the normalised result (rather than echoing the request) means the
    client immediately sees a double-claimed teammate land in exactly one
    place, instead of rendering its own optimistic version until the next read.
    """
    stored = load_sections(conn)
    final = carry_folds(sections, stored)

    conn.execute("DELETE FROM sections")
    conn.execute("UPDATE bots SET section_id = ''")
    for position, section in enumerate(final):
        if section.id == UNASSIGNED_SECTION_ID:
            continue  # synthesised on read
        conn.execute(
            "INSERT INTO sections (id, name, position, collapsed) VALUES (?, ?, ?, ?)",
            (section.id, section.name, position, 1 if section.is_collapsed else 0),
        )
        for order, bot_id in enumerate(section.bot_ids):
            conn.execute(
                "UPDATE bots SET section_id = ?, position = ? WHERE id = ?",
                (section.id, order, bot_id),
            )
    conn.commit()
    return final


def sections_from_payload(payload: object) -> list[Section]:
    """Parse the client's PUT body, ignoring anything malformed.

    Mirrors ``SidebarSections.parse``: an entry without a string ``id`` is
    skipped entirely, a missing name becomes ``""``, and non-string members are
    filtered out. The body comes from a browser, so it is shaped, not trusted.
    """
    if not isinstance(payload, list):
        return []
    out: list[Section] = []
    for entry in payload:
        if not isinstance(entry, dict):
            continue
        sid = entry.get("id")
        if not isinstance(sid, str):
            continue
        name = entry.get("name")
        raw_members = entry.get("bot_ids")
        bot_ids = tuple(b for b in raw_members if isinstance(b, str)) if isinstance(raw_members, list) else ()
        out.append(
            Section(
                id=sid,
                name=name if isinstance(name, str) else "",
                bot_ids=bot_ids,
                # Absent means "no opinion" — see Section.collapsed.
                collapsed=bool(entry["collapsed"]) if "collapsed" in entry else None,
            )
        )
    return out
