"""Load the preset vertical-subagent library (agency-agents) into the registry.

Each agency-agents file is Markdown with YAML frontmatter
(``name``/``description``/``color``/``emoji``/``vibe``) plus a long
role-narrative body. The mapping into a :class:`SubagentSpec`:

* frontmatter ``name``/``description``/``color``/``emoji``/``vibe`` → same fields
* the file's parent directory (``finance/``, ``security/`` …)            → ``domain``
* the entire Markdown body (after frontmatter)                          → ``system_prompt``
* a "Core Mission" section (or the description)                         → ``contract_template.objective``
* distinctive tokens from the description                               → ``capability_tags``
* ``id = spec-{domain}-{slug}-v1``, ``provenance="preset"``,
  ``trust_preset="trusted"`` (curated), ``runtime_hint="either"``,
  ``tools=[]`` (the Factory fills least-privilege tools on first route —
  we never fabricate tool names a preset cannot prove it has).

Loading is idempotent: each spec is keyed on its ``source_path`` + a content
hash, so re-running only rewrites specs whose file changed on disk.
"""

from __future__ import annotations

import hashlib
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterator, Optional

import yaml

from hermes_cli import spec_registry as reg
from hermes_cli.subagent_spec import FourPartContract, SubagentSpec

_FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", re.DOTALL)
_H2_RE = re.compile(r"^##\s+(.*?)\s*$", re.MULTILINE)

# Files that are not agent definitions even though they end in .md.
_SKIP_NAMES = {"README", "CONTRIBUTING", "SECURITY", "LICENSE", "CHANGELOG"}

# Tiny stopword set for deterministic capability-tag extraction. The embedding
# index (Agent Factory) does the real matching later; tags are a cheap SQL
# pre-filter, so a small deterministic set beats a heavy NLP dependency.
_STOPWORDS = frozenset(
    {
        "the", "and", "for", "that", "with", "into", "from", "this", "your",
        "you", "are", "who", "specializing", "specialist", "expert", "through",
        "make", "makes", "turn", "turns", "drives", "drive", "every", "data",
        "business", "decision", "decisions", "strategic", "strategy", "support",
        "actionable", "raw", "default", "even", "without", "realizing",
    }
)


@dataclass
class LoadResult:
    inserted: int = 0
    updated: int = 0
    unchanged: int = 0
    skipped: int = 0
    errors: list[str] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.errors is None:
            self.errors = []

    @property
    def total(self) -> int:
        return self.inserted + self.updated + self.unchanged


def resolve_agency_agents_root() -> Optional[Path]:
    """Resolve the agency-agents library root.

    Precedence: ``HERMES_AGENCY_AGENTS_DIR`` env → sibling ``../agency-agents``
    of the repo root. Returns ``None`` if neither exists.
    """
    override = os.environ.get("HERMES_AGENCY_AGENTS_DIR", "").strip()
    if override:
        p = Path(override).expanduser()
        return p if p.is_dir() else None
    sibling = Path(__file__).resolve().parents[2] / "agency-agents"
    return sibling if sibling.is_dir() else None


def split_frontmatter(text: str) -> tuple[dict, str]:
    """Return ``(frontmatter_dict, body)``. No frontmatter → ``({}, text)``."""
    m = _FRONTMATTER_RE.match(text)
    if not m:
        return {}, text
    raw_fm, body = m.group(1), m.group(2)
    try:
        data = yaml.safe_load(raw_fm) or {}
    except yaml.YAMLError:
        data = {}
    if not isinstance(data, dict):
        data = {}
    return data, body


def _slug_from_path(path: Path, domain: str) -> str:
    """Stable, collision-free slug from the filename (unique per directory).

    Filenames are prefixed by domain in agency-agents (e.g.
    ``finance-financial-analyst.md``); strip that prefix so the id reads
    ``spec-finance-financial-analyst-v1`` rather than doubling the domain.
    """
    stem = path.stem
    prefix = f"{domain}-"
    if stem.startswith(prefix):
        stem = stem[len(prefix):]
    return reg.slugify(stem)


def _extract_capability_tags(description: str, name: str, limit: int = 12) -> list[str]:
    """Deterministic distinctive-token extraction from the description."""
    tokens = re.findall(r"[a-zA-Z][a-zA-Z-]{3,}", f"{name} {description}".lower())
    seen: list[str] = []
    for tok in tokens:
        tok = tok.strip("-")
        if len(tok) < 4 or tok in _STOPWORDS or tok in seen:
            continue
        seen.append(tok)
        if len(seen) >= limit:
            break
    return seen


def _extract_objective(body: str, fallback: str) -> str:
    """First paragraph under a 'Mission'/'Core Mission' H2, else ``fallback``."""
    headings = list(_H2_RE.finditer(body))
    for i, h in enumerate(headings):
        title = h.group(1).lower()
        if "mission" in title:
            start = h.end()
            end = headings[i + 1].start() if i + 1 < len(headings) else len(body)
            para = body[start:end].strip().split("\n\n", 1)[0].strip()
            if para:
                return para
    return fallback.strip()


def parse_markdown_spec(path: Path, domain: str, text: str) -> SubagentSpec:
    """Map one agency-agents markdown file to a preset :class:`SubagentSpec`."""
    fm, body = split_frontmatter(text)
    name = str(fm.get("name") or path.stem).strip()
    description = str(fm.get("description") or "").strip()
    slug = _slug_from_path(path, domain)
    objective = _extract_objective(body, description)
    return SubagentSpec(
        id=reg.make_spec_id(domain, slug, 1),
        name=name,
        role="leaf",
        domain=reg.slugify(domain),
        title=str(fm.get("title")) if fm.get("title") else None,
        emoji=str(fm.get("emoji")) if fm.get("emoji") else None,
        color=str(fm.get("color")) if fm.get("color") else None,
        vibe=str(fm.get("vibe")) if fm.get("vibe") else None,
        description=description,
        capability_tags=_extract_capability_tags(description, name),
        system_prompt=body.strip(),
        contract_template=FourPartContract(objective=objective) if objective else None,
        tools=[],  # Factory fills least-privilege tools on first route.
        runtime_hint="either",
        provenance="preset",
        version=1,
        source_path=str(path),
        trust_preset="trusted",
        status="active",
        tenant=None,  # presets are global (visible to every workspace)
    )


def content_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def iter_preset_files(root: Path) -> Iterator[tuple[Path, str]]:
    """Yield ``(path, domain)`` for every agent markdown file under ``root``.

    Domain = the top-level directory under ``root``. Files at the root itself
    and the standard repo docs (README/LICENSE/…) are skipped.
    """
    for path in sorted(root.rglob("*.md")):
        rel = path.relative_to(root)
        if len(rel.parts) < 2:
            continue  # top-level docs, not an agent definition
        if path.stem.upper() in _SKIP_NAMES:
            continue
        domain = rel.parts[0]
        yield path, domain


def load_presets(
    conn,
    root: Optional[Path] = None,
) -> LoadResult:
    """Idempotently load all preset specs from ``root`` into the registry.

    ``root`` defaults to :func:`resolve_agency_agents_root`. Returns a
    :class:`LoadResult` summary. Parse errors on individual files are recorded
    and skipped rather than aborting the whole load.
    """
    if root is None:
        root = resolve_agency_agents_root()
    result = LoadResult()
    if root is None:
        result.errors.append("agency-agents root not found")
        return result
    for path, domain in iter_preset_files(root):
        try:
            text = path.read_text(encoding="utf-8")
        except OSError as exc:
            result.errors.append(f"{path}: {exc}")
            result.skipped += 1
            continue
        spec = parse_markdown_spec(path, domain, text)
        errs = spec.validation_errors()
        if errs:
            result.errors.append(f"{path}: {'; '.join(errs)}")
            result.skipped += 1
            continue
        status = reg.upsert_preset(conn, spec, content_hash=content_hash(text))
        if status == "inserted":
            result.inserted += 1
        elif status == "updated":
            result.updated += 1
        else:
            result.unchanged += 1
    return result
