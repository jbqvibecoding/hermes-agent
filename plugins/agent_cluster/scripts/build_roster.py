#!/usr/bin/env python3
"""Build the unified agent-cluster roster from the four source repos.

Sources (all markdown + YAML frontmatter):

- agency-agents:  ``<repo>/<division>/**/*.md`` — division set read from
  ``divisions.json`` (single source of truth, mirrors upstream
  ``scripts/build-hermes-plugin.py``).
- ruflo:          ``<repo>/.claude/agents/**/*.md`` — Claude Code native
  subagent format (name/description frontmatter).
- AgentHub:       ``<repo>/agents/definitions/<dept>/*.md`` — org-role format
  with hierarchy fields (level/department/manages/reports_to/coordinates_with).
- OpenOPC:        ``<repo>/.opc/prompts/talent/*.md`` — talent personas
  (name/description/color/emoji/vibe), division derived from filename prefix.

The output ``roster.json`` is committed into the plugin's ``assets/`` directory
so the plugin has no runtime dependency on the source checkouts.

Dedup: colliding slugs keep the highest-priority source at the bare slug
(agenthub > agency > ruflo > openopc — richest hierarchy metadata wins) and
lower-priority entries are re-keyed as ``<source>--<slug>`` so every persona
stays searchable.

Usage:
    python build_roster.py --agency PATH --ruflo PATH --agenthub PATH \
        --openopc PATH -o ../assets/roster.json
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path
from typing import Any

SOURCE_PRIORITY = ["agenthub", "agency", "ruflo", "openopc"]

_LIST_FIELDS = {"manages", "coordinates_with"}
_SCALAR_FIELDS = {
    "name",
    "description",
    "color",
    "emoji",
    "vibe",
    "level",
    "department",
    "reports_to",
    "model",
    "tools",
}


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9一-鿿]+", "-", value)
    return value.strip("-")


def parse_frontmatter(text: str) -> tuple[dict[str, Any], str] | None:
    """Parse ``---`` frontmatter supporting scalars and simple string lists.

    Line-level parser (no yaml dependency): handles every field shape that
    actually occurs across the four source formats — quoted scalars, plain
    scalars, and block lists of plain strings (AgentHub's manages/
    coordinates_with).
    """
    if not text.startswith("---\n"):
        return None
    parts = text.split("---\n", 2)
    if len(parts) < 3:
        return None
    frontmatter, body = parts[1], parts[2].lstrip("\n")
    fields: dict[str, Any] = {}
    current_list: str | None = None
    for line in frontmatter.splitlines():
        if not line.strip():
            current_list = None
            continue
        if line.startswith((" ", "\t")):
            item = line.strip()
            if current_list and item.startswith("- "):
                fields[current_list].append(item[2:].strip().strip("\"'"))
            continue
        if ":" not in line:
            current_list = None
            continue
        key, value = line.split(":", 1)
        key = key.strip()
        value = value.strip()
        if not value:
            fields[key] = []
            current_list = key
        else:
            fields[key] = value.strip("\"'")
            current_list = None
    return fields, body


def make_entry(
    source: str,
    division: str,
    fields: dict[str, Any],
    body: str,
    source_path: str,
) -> dict[str, Any] | None:
    name = str(fields.get("name", "") or "").strip()
    if not name:
        return None
    entry: dict[str, Any] = {
        "slug": slugify(name),
        "name": name,
        "description": str(fields.get("description", "") or "").strip(),
        "source": source,
        "division": division,
        "color": str(fields.get("color", "") or "").strip(),
        "emoji": str(fields.get("emoji", "") or "").strip(),
        "vibe": str(fields.get("vibe", "") or "").strip(),
        "source_path": source_path,
        "body": body,
    }
    hierarchy: dict[str, Any] = {}
    for key in ("level", "department", "reports_to", "model", "tools"):
        value = fields.get(key)
        if isinstance(value, str) and value.strip():
            hierarchy[key] = value.strip()
    for key in _LIST_FIELDS:
        value = fields.get(key)
        if isinstance(value, list) and value:
            hierarchy[key] = value
    if hierarchy:
        entry["hierarchy"] = hierarchy
    return entry


def collect_agency(repo: Path) -> list[dict[str, Any]]:
    divisions_file = repo / "divisions.json"
    data = json.loads(divisions_file.read_text(encoding="utf-8"))
    agents: list[dict[str, Any]] = []
    for division in sorted(data["divisions"].keys()):
        base = repo / division
        if not base.is_dir():
            continue
        for path in sorted(base.rglob("*.md")):
            parsed = parse_frontmatter(path.read_text(encoding="utf-8"))
            if not parsed:
                continue
            entry = make_entry(
                "agency", division, parsed[0], parsed[1],
                str(path.relative_to(repo)),
            )
            if entry:
                agents.append(entry)
    return agents


def collect_ruflo(repo: Path) -> list[dict[str, Any]]:
    base = repo / ".claude" / "agents"
    agents: list[dict[str, Any]] = []
    for path in sorted(base.rglob("*.md")):
        if path.name.upper().startswith("README"):
            continue
        parsed = parse_frontmatter(path.read_text(encoding="utf-8"))
        if not parsed:
            continue
        rel = path.relative_to(base)
        division = rel.parts[0] if len(rel.parts) > 1 else "general"
        entry = make_entry(
            "ruflo", division, parsed[0], parsed[1],
            str(path.relative_to(repo)),
        )
        if entry:
            agents.append(entry)
    return agents


def _agenthub_plain_md(text: str, path: Path) -> tuple[dict[str, Any], str] | None:
    """Fallback for AgentHub roles written as plain markdown (no frontmatter).

    A handful of marketing roles use ``# Title`` + ``## Description`` instead
    of frontmatter; synthesize the same fields so all 47 roles ship.
    """
    title = re.search(r"^#\s+(.+)$", text, re.M)
    if not title:
        return None
    desc = re.search(r"^##\s+Description\s*\n+(.+?)(?:\n\n|\n#)", text, re.S | re.M)
    fields = {
        "name": path.stem,
        "description": " ".join(desc.group(1).split()) if desc else title.group(1),
    }
    return fields, text


def collect_agenthub(repo: Path) -> list[dict[str, Any]]:
    base = repo / "agents" / "definitions"
    agents: list[dict[str, Any]] = []
    for path in sorted(base.rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        parsed = parse_frontmatter(text) or _agenthub_plain_md(text, path)
        if not parsed:
            continue
        fields = parsed[0]
        division = str(fields.get("department") or path.parent.name).strip()
        entry = make_entry(
            "agenthub", division, fields, parsed[1],
            str(path.relative_to(repo)),
        )
        if entry:
            agents.append(entry)
    return agents


def collect_openopc(repo: Path) -> list[dict[str, Any]]:
    base = repo / ".opc" / "prompts" / "talent"
    agents: list[dict[str, Any]] = []
    for path in sorted(base.glob("*.md")):
        parsed = parse_frontmatter(path.read_text(encoding="utf-8"))
        if not parsed:
            continue
        division = path.stem.split("-", 1)[0]
        entry = make_entry(
            "openopc", division, parsed[0], parsed[1],
            str(path.relative_to(repo)),
        )
        if entry:
            agents.append(entry)
    return agents


def dedup(agents: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Keep the highest-priority source at the bare slug; requalify the rest."""
    rank = {source: i for i, source in enumerate(SOURCE_PRIORITY)}
    agents = sorted(
        agents, key=lambda a: (rank.get(a["source"], 99), a["division"], a["slug"])
    )
    taken: set[str] = set()
    result: list[dict[str, Any]] = []
    for agent in agents:
        slug = agent["slug"]
        if slug in taken:
            slug = f"{agent['source']}--{agent['slug']}"
            if slug in taken:  # same source shipping duplicate names
                continue
            agent = {**agent, "slug": slug}
        taken.add(slug)
        result.append(agent)
    result.sort(key=lambda a: (a["source"], a["division"], a["slug"]))
    return result


def build(paths: dict[str, Path], out: Path) -> dict[str, int]:
    collectors = {
        "agency": collect_agency,
        "ruflo": collect_ruflo,
        "agenthub": collect_agenthub,
        "openopc": collect_openopc,
    }
    raw: list[dict[str, Any]] = []
    stats: dict[str, int] = {}
    for source, collector in collectors.items():
        repo = paths.get(source)
        if repo is None:
            continue
        collected = collector(repo)
        stats[source] = len(collected)
        raw.extend(collected)
    agents = dedup(raw)
    stats["raw_total"] = len(raw)
    stats["total"] = len(agents)
    stats["requalified"] = sum(1 for a in agents if "--" in a["slug"])
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(agents, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--agency", type=Path)
    parser.add_argument("--ruflo", type=Path)
    parser.add_argument("--agenthub", type=Path)
    parser.add_argument("--openopc", type=Path)
    parser.add_argument(
        "-o", "--out", type=Path,
        default=Path(__file__).resolve().parent.parent / "assets" / "roster.json",
    )
    args = parser.parse_args()
    paths = {
        source: getattr(args, source).resolve()
        for source in ("agency", "ruflo", "agenthub", "openopc")
        if getattr(args, source)
    }
    if not paths:
        parser.error("at least one source path is required")
    stats = build(paths, args.out.resolve())
    print(json.dumps(stats, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
