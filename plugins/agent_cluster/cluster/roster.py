"""Roster loading, lookup, and token-overlap search.

Ports the scoring/lookup logic of agency-agents'
``scripts/build-hermes-plugin.py`` router, extended for the multi-source
roster (source/division filters, hierarchy metadata, CJK-aware tokenizing —
AgentHub personas are written in Traditional Chinese).
"""
from __future__ import annotations

import json
import math
import re
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional

_DATA_PATH = Path(__file__).resolve().parent.parent / "assets" / "roster.json"

_WORD_RE = re.compile(r"[a-z0-9][a-z0-9+.#_-]*", re.I)
_CJK_RE = re.compile(r"[一-鿿]")

_lock = threading.Lock()
_agents: Optional[List[Dict[str, Any]]] = None


def load_agents(data_path: Optional[Path] = None) -> List[Dict[str, Any]]:
    """Load the roster once per process (thread-safe lazy singleton)."""
    global _agents
    if data_path is not None:
        return json.loads(Path(data_path).read_text(encoding="utf-8"))
    if _agents is None:
        with _lock:
            if _agents is None:
                _agents = json.loads(_DATA_PATH.read_text(encoding="utf-8"))
    return _agents


def reset_cache() -> None:
    global _agents
    with _lock:
        _agents = None


def tokens(text: str) -> set:
    """Tokenize latin words plus CJK unigrams and bigrams."""
    out = {token.lower() for token in _WORD_RE.findall(text or "")}
    cjk = _CJK_RE.findall(text or "")
    out.update(cjk)
    out.update(a + b for a, b in zip(cjk, cjk[1:]))
    return out


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9一-鿿]+", "-", value)
    return value.strip("-")


def lookup(identifier: str, agents: Optional[List[Dict[str, Any]]] = None) -> Optional[Dict[str, Any]]:
    """Find one agent by slug or exact display name (source-qualified or bare)."""
    needle = (identifier or "").strip().lower()
    if not needle:
        return None
    # Try the raw identifier first: dedup-requalified slugs contain a double
    # dash ("openopc--backend-architect") that slugify() would collapse.
    slug = slugify(needle)
    for agent in agents if agents is not None else load_agents():
        if agent["slug"] in (needle, slug) or agent["name"].lower() == needle:
            return agent
    return None


def score(agent: Dict[str, Any], query_tokens: set, query_text: str) -> float:
    haystack_fields = [
        agent.get("name", ""),
        agent.get("description", ""),
        agent.get("division", ""),
        agent.get("vibe", ""),
        agent.get("body", "")[:8000],
    ]
    haystack_text = "\n".join(haystack_fields).lower()
    haystack_tokens = tokens(haystack_text)
    overlap = query_tokens & haystack_tokens
    value = float(len(overlap))
    if query_text and query_text in haystack_text:
        value += 5.0
    name = agent.get("name", "").lower()
    description = agent.get("description", "").lower()
    for token in query_tokens:
        if token in name:
            value += 3.0
        if token in description:
            value += 1.5
    if value == 0.0:
        return 0.0
    # Slightly prefer focused descriptions over huge bodies when scores tie.
    return value + (1.0 / math.sqrt(max(len(haystack_tokens), 1)))


def search(
    query: str,
    source: str = "",
    division: str = "",
    limit: int = 8,
    agents: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """Return scored summaries for the top matches."""
    query_tokens = tokens(query)
    query_text = query.lower()
    source = (source or "").strip().lower()
    division = (division or "").strip().lower()
    matches: List[tuple] = []
    for agent in agents if agents is not None else load_agents():
        if source and agent.get("source", "").lower() != source:
            continue
        if division and agent.get("division", "").lower() != division:
            continue
        value = score(agent, query_tokens, query_text)
        if value > 0:
            matches.append((value, agent))
    matches.sort(key=lambda item: (-item[0], item[1]["source"], item[1]["slug"]))
    return [summary(agent, value) for value, agent in matches[:limit]]


def summary(agent: Dict[str, Any], match_score: Optional[float] = None) -> Dict[str, Any]:
    item = {
        "slug": agent["slug"],
        "name": agent["name"],
        "source": agent.get("source", ""),
        "division": agent.get("division", ""),
        "description": agent.get("description", ""),
    }
    if agent.get("vibe"):
        item["vibe"] = agent["vibe"]
    if agent.get("hierarchy"):
        item["hierarchy"] = agent["hierarchy"]
    if match_score is not None:
        item["score"] = round(match_score, 3)
    return item
