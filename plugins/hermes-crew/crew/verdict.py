"""Did that turn actually finish, or does it only look like it did?

A teammate's reply is stored, streamed and marked complete on one signal:
``final_response`` came back non-empty. That is not the same question as "did
the work happen", and four different endings produce a reply that reads like a
normal answer while nothing useful occurred:

* an upstream error string delivered as if the teammate had written it,
* the summary a model writes after burning its whole iteration budget,
* the framework's own "no reply" explainer standing in for a turn that
  produced nothing,
* "I'll run that in the background and let you know" — from a turn that
  started nothing and will never come back.

**None of this needs to be guessed from the text.** ``run_conversation``
already returns ``failed``, ``completed``, ``interrupted``, ``turn_exit_reason``
and the full message list, and the host reads exactly those fields when it
decides whether a cron run succeeded (``cron/scheduler.py``). Doing the same
here is not new machinery; it is asking the questions the answer was already
carrying.

Two decisions worth stating, because both went the other way first:

**Three values, not two.** The host deliberately delivers a
``max_iterations_reached(...)`` turn that still produced a summary, rather than
failing it — the comment at ``cron/scheduler.py`` says so outright. It is
right: a teammate that ran out of room and wrote up what it had has partly
delivered, and calling that a failure would retry a turn whose only guaranteed
property is that it exhausts the budget. So ``incomplete`` sits between: the
text is delivered, the truncation is said out loud, and nothing retries.

**The filler check is an equality test, not a pattern.** The framework replaces
an empty turn with a sentence built by
``AIAgent._format_turn_completion_explanation``. Calling that same function and
comparing is exact, and it tracks the host's wording for free. A regex over
"⚠️ No reply" would drift the first time somebody rewrote the copy, and drift
silently — in the direction of calling a dead turn healthy.

So only the last case touches text at all, and it is a conjunction where the
structural half does the work: a turn that really went off to do something
called a tool. A turn that called nothing and promised to report back has
nowhere to report back from.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any

log = logging.getLogger(__name__)

#: It finished, and the reply is the answer.
OK = "ok"
#: It stopped early for a reason nobody needs to fix. Deliver the text, say so,
#: and **do not retry** — that is the difference from `failed`.
INCOMPLETE = "incomplete"
#: The reply is not an answer. Retrying may be reasonable.
FAILED = "failed"

#: The literal the framework leaves when a completion is empty. Stripped by the
#: host before cron delivery for the same reason it is caught here: it is a
#: placeholder that reads like prose.
_PLACEHOLDER = "(No response generated)"

#: Past this, a reply is doing too much to be only a promise. A real
#: "I'll get to it" is one or two sentences; the cap is what keeps this from
#: firing on a full answer that happens to end with "I'll keep you posted".
_PROMISE_MAX_CHARS = 320

#: Said by a turn that did nothing. Deliberately narrow — it has to claim
#: *ongoing or future* work, not merely mention time.
_PROMISE_RE = re.compile(
    r"\b(?:i(?:'| a)?m|i(?:'ll| will)|let me)\b[^.!?\n]{0,80}\b"
    r"(?:work(?:ing)? on|look(?:ing)? into|run(?:ning)?|start(?:ing)?|"
    r"get(?:ting)? (?:started|back)|report back|update you|let you know|"
    r"follow up|check back|in the background)\b"
    r"|\b(?:i'll|i will) (?:tell|message|ping|email|notify) you\b"
    r"|我(?:先|这就|马上|稍后)?(?:去|来)?(?:处理|查|跑|做)(?:一下|着)?"
    r"|(?:稍后|待会儿?|回头|完成后)(?:再)?(?:告诉|通知|汇报|反馈)(?:你|您)"
    r"|(?:在|放在)?后台(?:运行|跑|处理)",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class RunVerdict:
    """What became of one turn.

    ``reason`` is a stable tag for tests and logs; ``detail`` is the sentence a
    person reads in the thread. Both exist because the tag alone tells an
    operator nothing and the sentence alone cannot be asserted on.
    """

    state: str
    reason: str = ""
    detail: str = ""

    @property
    def ok(self) -> bool:
        return self.state == OK

    @property
    def deliverable(self) -> bool:
        """Should the reply text still be shown? True for everything but a failure."""
        return self.state != FAILED

    @property
    def retryable(self) -> bool:
        """Only a failure is worth another attempt.

        An `incomplete` turn stopped for a reason a retry does not remove —
        the budget is the same next time, and the operator's stop was on
        purpose — so retrying spends real money to reproduce the same ending.
        """
        return self.state == FAILED


def filler_for(turn_exit_reason: str) -> str:
    """The host's own stand-in sentence for this ending, or ``""``.

    Imported lazily and defensively: this module is loaded inside plugin
    registration, and a verdict that cannot be computed must degrade to "fine"
    rather than take down the turn it was judging.
    """
    if not turn_exit_reason:
        return ""
    try:
        from run_agent import AIAgent

        return (AIAgent._format_turn_completion_explanation(str(turn_exit_reason)) or "").strip()
    except Exception:  # pragma: no cover - defensive
        log.debug("crew: could not render the host's turn explainer", exc_info=True)
        return ""


def tool_calls_in(messages: Any) -> int:
    """How many tool calls this turn made.

    Counts the assistant's requests rather than the ``tool`` results: a call
    that was blocked by the guard or errored still means the teammate reached
    for something, which is the thing being asked about here.
    """
    if not isinstance(messages, list):
        return 0
    total = 0
    for message in messages:
        if not isinstance(message, dict) or message.get("role") != "assistant":
            continue
        calls = message.get("tool_calls")
        if isinstance(calls, list):
            total += len(calls)
    return total


def judge(result: Any, *, spoke_otherwise: bool = False) -> RunVerdict:
    """Read a ``run_conversation`` result and say what really happened.

    ``spoke_otherwise`` is the caller saying this turn put something in the
    thread that is not prose — a report card, a held approval, a screenshot.
    Without it an empty ``final_response`` is an empty turn; with it, the text
    was empty because there was nothing left to say after the real delivery,
    which is a normal and deliberate ending here. The host's own cron check has
    no equivalent because a cron job's delivery *is* its text; a teammate's
    need not be.

    Ordering is the whole design, so it is spelled out rather than left to the
    reader: an operator's own interrupt explains every other signal after it,
    an upstream error outranks whatever text came with it, and a reply that is
    only the framework's placeholder is treated as the empty turn it stands for
    *before* asking whether the ending was otherwise acceptable.
    """
    if not isinstance(result, dict):
        # Nothing to judge. The caller already has bigger problems, and
        # inventing a failure here would double-report them.
        return RunVerdict(OK)

    body = str(result.get("final_response") or "").strip()
    reason = str(result.get("turn_exit_reason") or "")
    error = str(result.get("error") or "").strip()

    # The framework attaches its explainer two different ways, and they mean
    # different things (``agent/turn_finalizer.py``): an empty turn has its
    # blank *replaced* by the explanation, while a truncated one keeps the
    # fragment that arrived and has the explanation *appended*. Reading only
    # the first shape would let the second through as a healthy reply — which
    # it is not, but it is also not nothing, and those two deserve different
    # answers rather than one convenient one.
    filler = filler_for(reason)
    was_filler = bool(body) and (body == _PLACEHOLDER or (bool(filler) and body == filler))
    was_truncated = bool(filler) and not was_filler and body.endswith(filler)
    if was_filler:
        # A stand-in is not a reply. Blanking it means every check below reads
        # this turn as what it is — one that produced no text.
        body = ""

    if result.get("interrupted"):
        return RunVerdict(
            INCOMPLETE, "interrupted",
            "Stopped partway — this is as far as it got.",
        )

    if result.get("failed") is True or error:
        return RunVerdict(
            FAILED, "upstream_error",
            error or "The run failed before it produced an answer.",
        )

    if not body:
        if spoke_otherwise and not was_filler:
            # It delivered, just not in prose. A filler body is different: the
            # framework only writes one when the turn produced nothing, so it
            # is evidence the turn died rather than finished quietly.
            return RunVerdict(OK)
        return RunVerdict(
            FAILED, "no_reply" if was_filler else "empty",
            "The run ended without producing a reply.",
        )

    if was_truncated:
        return RunVerdict(
            INCOMPLETE, "truncated",
            "The reply stopped partway — what arrived is a fragment, and the "
            "rest never came.",
        )

    if reason.startswith("max_iterations_reached("):
        return RunVerdict(
            INCOMPLETE, "max_iterations",
            "Ran out of steps before finishing — what follows is a summary of "
            "how far it got, not the finished work.",
        )

    if result.get("completed") is False:
        return RunVerdict(
            FAILED, "not_completed",
            "The run did not complete.",
        )

    # The only text-sensitive case, and the structural half is what carries it:
    # a turn that genuinely started something reached for a tool to do it.
    if (
        tool_calls_in(result.get("messages")) == 0
        and len(body) <= _PROMISE_MAX_CHARS
        and _PROMISE_RE.search(body)
    ):
        return RunVerdict(
            FAILED, "promised_later",
            "Said it would carry on in the background, but the run made no "
            "tool calls and has now ended — nothing is running.",
        )

    return RunVerdict(OK)


def note(verdict: RunVerdict) -> str:
    """The line appended to the thread. Empty when there is nothing to add."""
    if verdict.ok or not verdict.detail:
        return ""
    return f"⚠️ {verdict.detail}"
