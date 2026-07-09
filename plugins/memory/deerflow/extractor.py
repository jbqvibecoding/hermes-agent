"""Fact extraction + staleness selection, ported from DeerFlow's updater.

Two concerns:

* :func:`extract_facts` — asks the host LLM (Hermes' ``call_llm``) to pull
  durable facts from a conversation and returns normalized fact dicts. The
  LLM call is injected so tests run without a model.
* :func:`select_stale_candidates` / :func:`apply_staleness_removals` — the
  age-based pruning DeerFlow does: facts older than ``staleness_age_days`` and
  not in a protected category become removal candidates; the removal set is
  intersected with the candidates as an unconditional guardrail so protected
  or non-aged facts can never be dropped.
"""

from __future__ import annotations

import json
import logging
from datetime import UTC, datetime, timedelta
from typing import Any, Callable, Optional

from plugins.memory.deerflow.storage import make_fact

logger = logging.getLogger(__name__)

DEFAULT_STALENESS_AGE_DAYS = 180
DEFAULT_PROTECTED_CATEGORIES = ("correction",)

_EXTRACTION_SYSTEM = (
    "You extract durable, user-specific facts from a conversation for long-term "
    "memory. Return ONLY a JSON array of objects with keys: content (string), "
    "category (one of preference|knowledge|context|behavior|goal), confidence "
    "(0-1). Extract only stable facts worth remembering across sessions "
    "(preferences, tech stack, recurring context). Ignore transient chatter. "
    "Return [] if nothing is worth storing."
)


def _parse_dt(value: Any) -> Optional[datetime]:
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _extract_json_array(text: str) -> list[Any]:
    """Best-effort parse of a JSON array from an LLM response."""
    text = (text or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lstrip().lower().startswith("json"):
            text = text.lstrip()[4:]
    start, end = text.find("["), text.rfind("]")
    if start == -1 or end == -1 or end < start:
        return []
    try:
        parsed = json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return []
    return parsed if isinstance(parsed, list) else []


def _normalize_extracted(raw: Any) -> Optional[dict[str, Any]]:
    if not isinstance(raw, dict):
        return None
    content = raw.get("content")
    if not isinstance(content, str) or not content.strip():
        return None
    category = (
        raw.get("category") if isinstance(raw.get("category"), str) else "context"
    )
    try:
        confidence = float(raw.get("confidence", 0.5))
    except (TypeError, ValueError):
        confidence = 0.5
    try:
        return make_fact(content, category, confidence, source="extracted")
    except ValueError:
        return None


def extract_facts(
    conversation_text: str,
    *,
    existing_contents: Optional[set[str]] = None,
    call_llm: Callable[..., Any],
    task: str = "compression",
    confidence_threshold: float = 0.0,
) -> list[dict[str, Any]]:
    """Extract new facts from a conversation via the host LLM.

    ``call_llm`` is injected (Hermes' ``agent.auxiliary_client.call_llm``) and
    must return an OpenAI-shaped response (``.choices[0].message.content``).
    De-dupes against ``existing_contents`` (whitespace-normalized).
    """
    if not conversation_text.strip():
        return []
    existing = {c.strip() for c in (existing_contents or set())}
    try:
        resp = call_llm(
            task=task,
            messages=[
                {"role": "system", "content": _EXTRACTION_SYSTEM},
                {"role": "user", "content": conversation_text},
            ],
        )
        content = resp.choices[0].message.content if resp and resp.choices else ""
    except Exception as exc:  # noqa: BLE001
        logger.warning("deerflow-memory: extraction call failed: %s", exc)
        return []

    facts: list[dict[str, Any]] = []
    for raw in _extract_json_array(content):
        fact = _normalize_extracted(raw)
        if fact is None:
            continue
        if fact["confidence"] < confidence_threshold:
            continue
        if fact["content"].strip() in existing:
            continue
        existing.add(fact["content"].strip())
        facts.append(fact)
    return facts


def select_stale_candidates(
    facts: list[dict[str, Any]],
    *,
    age_days: int = DEFAULT_STALENESS_AGE_DAYS,
    protected_categories: tuple[str, ...] = DEFAULT_PROTECTED_CATEGORIES,
) -> list[dict[str, Any]]:
    """Return facts older than *age_days* and not in a protected category."""
    cutoff = datetime.now(UTC) - timedelta(days=age_days)
    protected = frozenset(protected_categories)
    out: list[dict[str, Any]] = []
    for fact in facts:
        if not isinstance(fact, dict):
            continue
        if fact.get("category", "") in protected:
            continue
        created = _parse_dt(fact.get("createdAt", ""))
        if created is not None and created < cutoff:
            out.append(fact)
    return out


def apply_staleness_removals(
    facts: list[dict[str, Any]],
    remove_ids: set[str],
    *,
    age_days: int = DEFAULT_STALENESS_AGE_DAYS,
    protected_categories: tuple[str, ...] = DEFAULT_PROTECTED_CATEGORIES,
    max_removals: int = 5,
) -> list[dict[str, Any]]:
    """Remove *remove_ids*, but only among genuine stale candidates (guardrail).

    Mirrors DeerFlow: the requested removal set is intersected with the stale
    candidates unconditionally, so protected/non-aged facts can never be
    pruned regardless of what the model returned; capped at *max_removals*
    (lowest-confidence first).
    """
    candidate_ids = {
        f["id"]
        for f in select_stale_candidates(
            facts, age_days=age_days, protected_categories=protected_categories
        )
    }
    effective = candidate_ids & set(remove_ids)
    if len(effective) > max_removals:
        ranked = sorted(
            (f for f in facts if f.get("id") in effective),
            key=lambda f: f.get("confidence", 0.0),
        )
        effective = {f["id"] for f in ranked[:max_removals]}
    return [f for f in facts if f.get("id") not in effective]
