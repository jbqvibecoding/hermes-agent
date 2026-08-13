"""Structured termination contract for delegated subagents.

Ported from DeepSeek Harness (``dsh``, MIT) — specifically the discipline in
``packages/subagent/subagent/src/{types,lifecycle,assistant-output,
continuation}.ts``.  Nothing here is a line-for-line translation (dsh is
TypeScript); what is ported is the *contract*, which is the valuable part:

1. **The stop reason is derived by the runtime, never self-declared.**  dsh's
   ``epochStopReason()`` reads the session log; we read the child's terminal
   result dict and the exception (if any) that ended the run.  A child that
   writes "I am done" in its final message does not thereby get
   ``completed`` — only the runtime's own view of how the run ended does that.

2. **Output selection is independent of the stop reason.**  dsh's
   ``finalAssistantOutput()`` runs the same three-step fallback regardless of
   why the epoch ended.  A cancelled child that already wrote something keeps
   what it wrote (dsh's ``withPartialText``); we do not blank it out just
   because the run did not finish cleanly.

3. **Unknown stop reasons are failures, never successes.**  The enum is
   extensible; :func:`is_success` is a closed whitelist of exactly one member.
   Every consumer that branches on the reason therefore fails safe.

4. **What the child said and what the system determined are kept apart.**  dsh
   keeps ``subagent-report`` (child-authored, ``form: 'relay'``) and
   ``subagent-settled`` (runtime-authored, ``form: 'notice'``) as two message
   kinds, deliberately unmerged, because "a transcript that merged them would
   credit the child with words it never wrote".  Here that is the split between
   the ``summary`` field (child-authored) and the ``settlement`` field
   (runtime-authored).

**Divergence from dsh:** its enum is
``completed | aborted | error | max-tokens | refusal``.  Hermes has two
terminal states dsh has no concept of — an iteration budget and a wall-clock
cap on delegation — and squashing either into ``error`` would throw away a
distinction the caller already gets today via ``exit_reason``.  So the enum
carries :data:`MAX_ITERATIONS` and :data:`TIMEOUT` as additional members.  The
safety property is unaffected: success is still a one-member whitelist.

This module is deliberately dependency-free and does no I/O, so the contract
can be tested without constructing an agent.
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, Optional, Tuple

# --------------------------------------------------------------------------
# The enum
# --------------------------------------------------------------------------

COMPLETED = "completed"
"""The child ran to a clean finish.  The only reason that counts as success."""

ABORTED = "aborted"
"""The child was interrupted — by the user, by the parent, or by a sibling."""

ERROR = "error"
"""The child, or the machinery running it, failed."""

MAX_TOKENS = "max_tokens"
"""The provider truncated the child's output against the response length cap."""

MAX_ITERATIONS = "max_iterations"
"""Hermes-specific: the child exhausted its per-run iteration budget."""

TIMEOUT = "timeout"
"""Hermes-specific: the child exceeded ``delegation.child_timeout_seconds``."""

REFUSAL = "refusal"
"""The model declined on content-policy grounds.  Deterministic; never retried."""

STOP_REASONS: Tuple[str, ...] = (
    COMPLETED,
    ABORTED,
    ERROR,
    MAX_TOKENS,
    MAX_ITERATIONS,
    TIMEOUT,
    REFUSAL,
)

_SUCCESS_STOP_REASONS = frozenset({COMPLETED})

# Human-readable settlement phrasing, keyed by stop reason.  Written from the
# *parent's* point of view ("what became of the child"), which is why none of
# these are phrased as if the child said them.
_SETTLEMENT_PHRASE: Dict[str, str] = {
    COMPLETED: "finished normally",
    ABORTED: "was interrupted before it finished",
    ERROR: "failed",
    MAX_TOKENS: "was cut off by the provider's output length limit",
    MAX_ITERATIONS: "used up its iteration budget before finishing",
    TIMEOUT: "exceeded its time limit and was abandoned",
    REFUSAL: "was declined by the model on content-policy grounds",
}

_UNKNOWN_PHRASE = "ended for an unrecognised reason (treated as a failure)"

# The sentinel run_agent.py emits after repeated empty-LLM-response retries.
# It is a transport failure wearing a response's clothes, so it must not be
# mistaken for output.
EMPTY_RESPONSE_SENTINEL = "(empty)"


def is_success(stop_reason: Any) -> bool:
    """True only for a stop reason that is explicitly known to be a success.

    Anything unrecognised — a new enum member from a future version, a typo, a
    value a child tried to inject — is a failure.  This is the whole point of
    the closed whitelist: no consumer can accidentally read an unknown
    termination as a good one.
    """
    return isinstance(stop_reason, str) and stop_reason in _SUCCESS_STOP_REASONS


def is_known(stop_reason: Any) -> bool:
    """True when ``stop_reason`` is a member of the enum."""
    return isinstance(stop_reason, str) and stop_reason in STOP_REASONS


# --------------------------------------------------------------------------
# Deriving the stop reason
# --------------------------------------------------------------------------


def _error_text(result: Dict[str, Any]) -> str:
    error = result.get("error")
    if isinstance(error, str):
        return error
    if error:
        return str(error)
    return ""


def _looks_truncated(result: Dict[str, Any]) -> bool:
    """Detect a provider-side output-length truncation.

    ``agent/conversation_loop.py`` marks these turns with ``partial: True`` and
    an error mentioning the output length limit.  We accept either signal:
    the flag is the reliable one, the text match covers the continuation-retry
    path that gives up without setting it.
    """
    if result.get("partial") is True:
        return True
    error = _error_text(result).lower()
    return "output length limit" in error or "remained truncated" in error


def derive_stop_reason(
    result: Optional[Dict[str, Any]],
    *,
    exception: Optional[BaseException] = None,
    timed_out: bool = False,
) -> str:
    """Work out how a child run ended, from the runtime's own evidence.

    The child does not get a vote.  ``result`` is the dict returned by
    ``run_conversation`` — the runtime's record of the turn — and ``exception``
    is whatever escaped while running it.

    Precedence runs from "we never got a usable result" outwards:

    1. A wall-clock timeout: we abandoned the child, so nothing it may have
       reported afterwards is trustworthy.
    2. An exception: the machinery failed.
    3. An interrupt flag: someone stopped it on purpose.  Checked before the
       error paths because an interrupt mid-tool-call often *also* leaves an
       error behind, and "the user stopped it" is the more truthful account.
    4. A content-policy refusal, then a provider truncation — both are
       specific, recognisable shapes and must not be flattened into ``error``.
    5. ``completed``, and finally the residual: a turn that neither completed
       nor recorded a reason ran out of iterations.
    """
    if timed_out:
        return TIMEOUT
    if exception is not None:
        return ERROR
    if not isinstance(result, dict):
        # No result and no exception should be impossible; if it happens, the
        # honest answer is that something broke, not that the child succeeded.
        return ERROR

    if result.get("interrupted"):
        return ABORTED

    error = _error_text(result)
    if error.startswith("content_policy_blocked:"):
        return REFUSAL
    if _looks_truncated(result):
        return MAX_TOKENS
    if error:
        return ERROR

    if result.get("completed"):
        return COMPLETED

    # A turn that stopped without completing, without an interrupt and without
    # an error is the iteration cap.  Note this is the *residual* branch, not a
    # positive detection — which is why it is last: any future terminal state
    # that forgets to set a marker lands here rather than on ``completed``.
    return MAX_ITERATIONS


# --------------------------------------------------------------------------
# Selecting the output
# --------------------------------------------------------------------------


def _iter_assistant_texts(messages: Any) -> Iterable[str]:
    if not isinstance(messages, list):
        return
    for message in messages:
        if not isinstance(message, dict) or message.get("role") != "assistant":
            continue
        content = message.get("content")
        if isinstance(content, str):
            yield content
        elif isinstance(content, list):
            parts = [
                block.get("text")
                for block in content
                if isinstance(block, dict) and isinstance(block.get("text"), str)
            ]
            if parts:
                yield "\n".join(parts)


def select_output(
    result: Optional[Dict[str, Any]],
    *,
    streamed_text: str = "",
) -> str:
    """Pick the child's output, using the same rule for every stop reason.

    dsh's ``finalAssistantOutput()``, three steps:

    1. the final assistant response the runtime recorded;
    2. failing that, the last non-empty assistant message in the transcript;
    3. failing that, whatever text the child streamed before it stopped.

    Step 3 is what makes a cancelled or truncated child keep its partial work
    (dsh's ``withPartialText``): the parent gets the words the child actually
    produced rather than a blank.  Returning ``""`` means the child genuinely
    left nothing — a fact the settlement notice then states out loud.

    Deliberately takes no ``stop_reason`` argument.  Making output selection
    depend on the stop reason is how partial work gets silently discarded.
    """
    if isinstance(result, dict):
        final = result.get("final_response")
        if isinstance(final, str) and final.strip():
            if final.strip() != EMPTY_RESPONSE_SENTINEL:
                return final

        for text in reversed(list(_iter_assistant_texts(result.get("messages")))):
            if text.strip() and text.strip() != EMPTY_RESPONSE_SENTINEL:
                return text

    if isinstance(streamed_text, str) and streamed_text.strip():
        return streamed_text

    return ""


# --------------------------------------------------------------------------
# The settlement notice
# --------------------------------------------------------------------------


def settlement_notice(
    stop_reason: Any,
    *,
    has_output: bool,
    detail: str = "",
    duration_seconds: Optional[float] = None,
) -> str:
    """State what became of the child — unconditionally, in the system's voice.

    dsh emits this for every subagent the caller ever received an id for,
    "without regard to whether it reported".  The point is that silence is
    never the answer to "what happened to it": a child that left nothing gets a
    notice saying so, rather than an empty field the parent has to interpret.

    The returned string is the *runtime's* account and must be kept in its own
    field, never concatenated into the child's own text — otherwise the
    transcript credits the child with words it never wrote.
    """
    phrase = _SETTLEMENT_PHRASE.get(stop_reason, _UNKNOWN_PHRASE)
    if not is_known(stop_reason):
        phrase = f"{phrase} ({stop_reason!r})"

    sentence = f"Subagent {phrase}"
    if duration_seconds is not None:
        try:
            sentence += f" after {float(duration_seconds):.1f}s"
        except (TypeError, ValueError):
            pass
    sentence += "."

    if not has_output:
        sentence += " It left no closing message."
    elif not is_success(stop_reason):
        # Say the output is partial rather than leaving the parent to assume a
        # non-completed run produced a finished answer.
        sentence += " The output below is what it produced before stopping."

    detail = (detail or "").strip()
    if detail:
        sentence += f" {detail}"

    return sentence


def build_termination(
    result: Optional[Dict[str, Any]],
    *,
    exception: Optional[BaseException] = None,
    timed_out: bool = False,
    streamed_text: str = "",
    detail: str = "",
    duration_seconds: Optional[float] = None,
) -> Dict[str, Any]:
    """Derive the whole contract in one call.

    Returns ``{"stop_reason", "output", "settlement", "succeeded", "partial"}``
    where ``output`` is child-authored and ``settlement`` is runtime-authored.
    Never raises: any failure to characterise a run is itself a run that ended
    in ``error``, which is a result, not an exception.
    """
    stop_reason = derive_stop_reason(result, exception=exception, timed_out=timed_out)
    output = select_output(result, streamed_text=streamed_text)
    succeeded = is_success(stop_reason)
    return {
        "stop_reason": stop_reason,
        "output": output,
        "settlement": settlement_notice(
            stop_reason,
            has_output=bool(output),
            detail=detail,
            duration_seconds=duration_seconds,
        ),
        "succeeded": succeeded,
        # True when work survived a run that did not finish cleanly — the case
        # that must never be silently dropped.
        "partial": bool(output) and not succeeded,
    }
