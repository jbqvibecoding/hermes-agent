"""Hybrid token metering: anchor to provider counts, estimate only the delta.

Ported from DeepSeek Harness (``dsh``, MIT) — ``packages/llm/token-meter``.

The problem
-----------
Hermes sizes a request with ``estimate_request_tokens_rough()``, which is
``chars / 4`` plus structural overhead. That is fine for a short conversation
and progressively worse for a long one: the per-message error does not cancel
out, it accumulates, and the number that decides when to compact is the sum of
several hundred individually-wrong guesses.

Meanwhile the provider has already told us the exact prompt size of the last
request. dsh's observation is that the two should be combined rather than used
in the alternative: **take the provider's count as an anchor for the messages
it covered, and spend the heuristic only on what has been appended since.**
The error is then bounded by the size of the tail, not of the whole history.

Why the anchor can go stale
---------------------------
An anchor is only usable while the request it came from is still a prefix of
what we are about to send. Compaction rewrites history, a system-prompt swap
changes the payload, toolset changes move the schema block. Any of those and
the anchor describes a request that no longer exists — so this module carries
an *envelope key* alongside the count and refuses to anchor when it differs.

Trusting a low number is the dangerous direction
------------------------------------------------
dsh takes the larger of the provider count and the heuristic, and that
asymmetry is deliberate. Over-estimating costs an early compaction. Under-
estimating means the request is sent and *rejected* by the provider for
exceeding the window, which costs the turn.

This matters concretely here because Hermes uses prompt caching: several
providers report ``prompt_tokens`` net of cached input, so the reported number
can be a small fraction of what actually has to fit in the window. Anchoring
naively to that would suppress compaction exactly when it is most needed. So
when the provider's own count for the anchored request comes in *below* what
the heuristic said about the same content, the anchor is rejected.

This module is pure: no config, no I/O, no agent references.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

# How the estimate was arrived at. Returned alongside the number so callers can
# log it and users can tell an anchored figure from a guessed one.
SOURCE_HEURISTIC = "heuristic"
SOURCE_ANCHORED = "anchored"
SOURCE_NO_ANCHOR = "heuristic:no-anchor"
SOURCE_ENVELOPE_CHANGED = "heuristic:envelope-changed"
SOURCE_HISTORY_REWRITTEN = "heuristic:history-rewritten"
SOURCE_PROVIDER_UNDER_REPORTED = "heuristic:provider-under-reported"


def envelope_key(
    system_prompt: str = "",
    tools: Optional[Sequence[Any]] = None,
    model: str = "",
) -> str:
    """Identify the non-message part of a request.

    Two requests share an envelope when the same model is being sent the same
    system prompt and the same tool schemas. Hashed rather than stored because
    tool schemas are large and this value is kept on the compressor for the
    life of the session.
    """
    digest = hashlib.sha256()
    digest.update((model or "").encode("utf-8", "replace"))
    digest.update(b"\x00")
    digest.update((system_prompt or "").encode("utf-8", "replace"))
    digest.update(b"\x00")
    if tools:
        try:
            digest.update(str(tools).encode("utf-8", "replace"))
        except Exception:
            # An un-stringifiable tool list is itself a distinguishing fact;
            # fall back to the count so at least a change in size is noticed.
            digest.update(str(len(tools)).encode("ascii"))
    return digest.hexdigest()[:32]


@dataclass(frozen=True)
class UsageAnchor:
    """A provider-reported prompt size, plus everything needed to reuse it.

    ``heuristic_tokens`` is what our own estimator said about the *same*
    request. Keeping it is what makes the under-reporting check possible: it is
    the only way to compare like with like after the fact.
    """

    prompt_tokens: int
    message_count: int
    envelope: str
    heuristic_tokens: int

    def is_usable(self) -> bool:
        return self.prompt_tokens > 0 and self.message_count > 0 and bool(self.envelope)


def estimate_with_anchor(
    messages: List[Dict[str, Any]],
    *,
    anchor: Optional[UsageAnchor],
    envelope: str,
    estimate_messages: Callable[[List[Dict[str, Any]]], int],
    full_estimate: int,
) -> Tuple[int, str]:
    """Return ``(tokens, source)`` for the request about to be sent.

    ``full_estimate`` is the caller's existing whole-request heuristic — passed
    in rather than recomputed so this function stays free of any dependency on
    how Hermes estimates, and so the fallback is always byte-identical to what
    the caller would have produced on its own.

    Falls back to ``full_estimate`` whenever anchoring is not safe. It never
    returns less than ``full_estimate``: the anchor is here to catch history
    the heuristic under-counts, not to argue the request down.
    """
    if anchor is None or not anchor.is_usable():
        return full_estimate, SOURCE_NO_ANCHOR

    if anchor.envelope != envelope:
        # Different system prompt, tools, or model: the anchored count
        # describes a payload we are no longer sending.
        return full_estimate, SOURCE_ENVELOPE_CHANGED

    if len(messages) < anchor.message_count:
        # History got shorter — compaction, a rollback, a session rotation.
        # The anchored prefix is gone, so the anchor means nothing.
        return full_estimate, SOURCE_HISTORY_REWRITTEN

    if anchor.prompt_tokens < anchor.heuristic_tokens:
        # The provider counted fewer tokens than we did for the same request.
        # With prompt caching in play that usually means the reported figure
        # excludes cached input, i.e. it is not the number that has to fit in
        # the context window. Keep our own, larger figure.
        return full_estimate, SOURCE_PROVIDER_UNDER_REPORTED

    try:
        delta_tokens = estimate_messages(list(messages[anchor.message_count :]))
    except Exception:
        return full_estimate, SOURCE_NO_ANCHOR

    anchored = anchor.prompt_tokens + max(0, int(delta_tokens))
    if anchored <= full_estimate:
        # The heuristic is already at least as cautious; nothing to gain.
        return full_estimate, SOURCE_HEURISTIC
    return anchored, SOURCE_ANCHORED


__all__ = [
    "SOURCE_ANCHORED",
    "SOURCE_ENVELOPE_CHANGED",
    "SOURCE_HEURISTIC",
    "SOURCE_HISTORY_REWRITTEN",
    "SOURCE_NO_ANCHOR",
    "SOURCE_PROVIDER_UNDER_REPORTED",
    "UsageAnchor",
    "envelope_key",
    "estimate_with_anchor",
]
