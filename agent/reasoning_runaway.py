"""Spot a reply that spent its whole output budget thinking, and resample it.

Ported from ApodexAI's FrontierAgent (Apache-2.0) —
``frontier_agent/core/runtime/loop/_runaway.py``.

The failure
-----------
A reasoning model behind an OpenAI-compatible gateway can burn all of
``max_tokens`` inside the reasoning channel and return a **successful** response
with no visible content and no tool calls. Nothing is wrong with the transport;
the model simply never got to the part that would be shown.

Hermes already detects one shape of this — ``conversation_loop`` looks for
``<think>`` tags left in ``content`` and reports "Thinking Budget Exhausted".
That test needs the reasoning to be *visible in the content*, which is true for
models that inline their thinking and false for the ones that worry us most:
SGLang, vLLM and most aggregating gateways strip the reasoning channel out
before the response is returned, so ``content`` comes back ``None`` with no tags
at all. Those replies fall through to the truncation path and burn four
continuation retries, every one of which does the same thing again — four paid
calls for an empty result.

Three tiers, most reliable first
--------------------------------
1. ``<think>`` tags in the content — the existing check, kept.
2. ``reasoning_content`` / ``reasoning_details`` present while the visible text
   is empty. Hermes' chat-completions transport has been recording these in
   ``provider_data`` all along (DeepSeek, Moonshot, OpenRouter); nothing had yet
   used them to answer this question. This is direct evidence, not a heuristic.
3. ``finish_reason == "length"`` with no text, no tool calls, and a completion
   large enough that it cannot be a plain empty reply. FrontierAgent's fallback,
   for gateways that surface neither of the above.

What to do about it
-------------------
Not "give up". Resample **once** at half the observed completion size. Halving
is what changes the outcome: a smaller cap makes the model reach visible output
sooner, and if it does not, the second failure is informative rather than the
fourth identical one. ``_MIN_OUTPUT_TOKENS`` is the floor because below it a
capped-empty completion is no longer distinguishable from an ordinary empty
reply — shrinking past it would trade a diagnosable failure for a silent one.
"""

from __future__ import annotations

import re
from typing import Any, Optional, Tuple

# Reasoning that a model inlined into ``content``. It is not visible output —
# Hermes strips it before display — so it must not count as "the model produced
# something". Without this, a reply that is nothing *but* a think block reads as
# a working turn and tier 1 can never fire. Mirrors the tag set
# ``conversation_loop`` already matches on.
_THINK_BLOCK_RE = re.compile(
    r"<(think|thinking|reasoning|REASONING_SCRATCHPAD)[^>]*>.*?</\1>",
    re.IGNORECASE | re.DOTALL,
)
# An unclosed block — the usual shape when the cap cut the reply mid-thought.
_OPEN_THINK_RE = re.compile(
    r"<(?:think|thinking|reasoning|REASONING_SCRATCHPAD)[^>]*>.*\Z",
    re.IGNORECASE | re.DOTALL,
)

__all__ = [
    "MIN_OUTPUT_TOKENS",
    "RECOVERY_REMINDER",
    "classify_runaway",
    "retry_max_tokens",
]

# Below this a capped-empty completion cannot be told apart from a plain empty
# reply, so tier 3 does not fire and the retry cap will not shrink past it.
MIN_OUTPUT_TOKENS = 1024

# Ceiling for the resample cap. The actual bound is derived from the observed
# completion, so a deliberately low profile is never raised to this value.
MAX_RETRY_TOKENS = 8192

# Rides as a `user` turn, not a trailing `system` one: Hermes' Anthropic adapter
# only lifts a LEADING system message out of the array, and reasoning-model chat
# templates on SGLang/vLLM commonly render only the first system block. A user
# turn means every provider sees it in the same place.
RECOVERY_REMINDER = (
    "[system reminder] Your previous attempt used its entire output budget on "
    "internal reasoning and returned no visible answer and no tool call. Keep "
    "the reasoning brief this time and produce either visible answer text or a "
    "tool call promptly."
)


def _strip_think_blocks(text: str) -> str:
    return _OPEN_THINK_RE.sub("", _THINK_BLOCK_RE.sub("", text))


def _has_visible_text(content: Any) -> bool:
    """Whether the reply carries text a person would actually be shown."""
    if isinstance(content, str):
        return bool(_strip_think_blocks(content).strip())
    if isinstance(content, list):
        for block in content:
            if isinstance(block, dict):
                if block.get("type") == "text" and str(block.get("text") or "").strip():
                    return True
        return False
    return False


def _has_reasoning(provider_data: Any) -> bool:
    if not isinstance(provider_data, dict):
        return False
    text = provider_data.get("reasoning_content")
    if isinstance(text, str) and text.strip():
        return True
    if provider_data.get("reasoning_details"):
        return True
    return False


def classify_runaway(
    *,
    content: Any,
    has_tool_calls: bool,
    finish_reason: str = "",
    provider_data: Any = None,
    completion_tokens: int = 0,
    has_think_tags: bool = False,
) -> Tuple[bool, str]:
    """Return ``(is_runaway, tier)``. ``tier`` is "" when it is not one.

    Tiers are named rather than numbered so a log line says which evidence
    fired — "reasoning_field" and "token_heuristic" carry very different
    confidence, and a reader deciding whether to trust a resample needs to know
    which one it was.
    """
    # A reply that produced anything usable is not a runaway, whatever else is
    # true of it. Checked first so no tier can misfire on a working turn.
    if has_tool_calls or _has_visible_text(content):
        return False, ""

    if has_think_tags:
        return True, "think_tags"

    if _has_reasoning(provider_data):
        return True, "reasoning_field"

    if str(finish_reason or "") == "length":
        try:
            tokens = int(completion_tokens or 0)
        except (TypeError, ValueError):
            tokens = 0
        if tokens >= MIN_OUTPUT_TOKENS:
            return True, "token_heuristic"

    return False, ""


def retry_max_tokens(
    *, completion_tokens: int = 0, active_cap: Any = None
) -> Optional[int]:
    """Half the observed completion, floored and ceilinged. ``None`` = leave as is.

    Derived from what the model actually produced rather than from a constant,
    so a profile that deliberately runs a small cap is squeezed further rather
    than being raised toward the 8K ceiling. Successive runaways inside one turn
    therefore halve again from an already-capped number.
    """
    observed = 0
    try:
        observed = int(completion_tokens or 0)
    except (TypeError, ValueError):
        observed = 0
    if observed <= 0:
        try:
            observed = int(active_cap)  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return None
    if observed <= 0:
        return None
    if observed <= MIN_OUTPUT_TOKENS:
        return observed
    return max(MIN_OUTPUT_TOKENS, min(MAX_RETRY_TOKENS, observed // 2))
