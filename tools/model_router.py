"""Merlion model router — category → model resolution + provider slots/fallback.

From Merlion PRD ③§7.4: orchestration tags each subtask/delegation with a
*category*; the Router resolves it to a concrete model via a hot-configurable
table, subject to per-provider concurrency slots with timeout fallback.

Pure + deterministic: the default table mirrors the PRD contract verbatim
(it is an explicit product contract, hence the literal model ids) but every
call accepts an override table, so deployments retune without code changes.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Optional

ModelCategory = Literal["deep", "quick", "visual", "review", "plan", "orchestrate"]

# PRD §7.4 contract (hot-configurable). These are an explicit product contract.
DEFAULT_CATEGORY_MODEL: dict[str, str] = {
    "deep": "gpt-5.5",
    "quick": "sonnet",
    "visual": "opus",
    "review": "opus",
    "plan": "opus",
    "orchestrate": "opus",
}

# Which provider a model bills against (for slot accounting).
DEFAULT_MODEL_PROVIDER: dict[str, str] = {
    "gpt-5.5": "openai",
    "sonnet": "anthropic",
    "opus": "anthropic",
}

# Timeout/failure fallback chain (PRD §5: gpt-5.5 → opus, max 3 attempts).
DEFAULT_FALLBACK: dict[str, str] = {"gpt-5.5": "opus"}

# Per-provider concurrency slots (PRD: Anthropic 3, OpenAI 2).
DEFAULT_SLOTS: dict[str, int] = {"anthropic": 3, "openai": 2}

DEFAULT_MAX_ATTEMPTS = 3


def resolve_category_model(
    category: str, *, table: Optional[dict[str, str]] = None
) -> str:
    """Category → concrete model. Unknown category falls back to ``orchestrate``."""
    t = table or DEFAULT_CATEGORY_MODEL
    return t.get(category) or t.get("orchestrate", "opus")


def fallback_for(model: str, *, table: Optional[dict[str, str]] = None) -> Optional[str]:
    return (table or DEFAULT_FALLBACK).get(model)


def fallback_chain(
    model: str,
    *,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
    table: Optional[dict[str, str]] = None,
) -> list[str]:
    """Ordered models to try (primary first), capped at ``max_attempts``.

    Resolves the fallback graph without looping (a model that points back to a
    seen one stops the chain).
    """
    table = table or DEFAULT_FALLBACK
    chain = [model]
    seen = {model}
    cur = model
    while len(chain) < max_attempts:
        nxt = table.get(cur)
        if not nxt or nxt in seen:
            break
        chain.append(nxt)
        seen.add(nxt)
        cur = nxt
    return chain


def provider_of(model: str, *, table: Optional[dict[str, str]] = None) -> Optional[str]:
    return (table or DEFAULT_MODEL_PROVIDER).get(model)


@dataclass
class SlotPool:
    """In-memory per-provider concurrency accounting. Over-capacity → queue."""

    capacity: dict[str, int] = field(default_factory=lambda: dict(DEFAULT_SLOTS))
    used: dict[str, int] = field(default_factory=dict)
    model_provider: dict[str, str] = field(default_factory=lambda: dict(DEFAULT_MODEL_PROVIDER))

    def has_capacity(self, model: str) -> bool:
        provider = self.model_provider.get(model)
        if provider is None:
            return True  # unknown provider is unmetered
        cap = self.capacity.get(provider, 0)
        return self.used.get(provider, 0) < cap

    def acquire(self, model: str) -> bool:
        """Reserve a slot for ``model``'s provider. False if at capacity (queue)."""
        provider = self.model_provider.get(model)
        if provider is None:
            return True
        if not self.has_capacity(model):
            return False
        self.used[provider] = self.used.get(provider, 0) + 1
        return True

    def release(self, model: str) -> None:
        provider = self.model_provider.get(model)
        if provider is None:
            return
        self.used[provider] = max(0, self.used.get(provider, 0) - 1)
