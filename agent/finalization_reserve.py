"""Keep enough budget in hand to land the plane.

Ported from ApodexAI's FrontierAgent (Apache-2.0) —
``frontier_agent/components/observers/finalization_reserve.py`` and
``last_turn_forcer.py`` — but reshaped to fit what Hermes already decided.

The problem
-----------
``agent/iteration_budget.py`` is a counter: ``consume()``, ``refund()``,
``used``, ``remaining``. When it runs out, ``conversation_loop`` breaks.
Whatever the model happened to be doing on the last iteration is what you get —
frequently a tool call whose result nobody ever reads.

Downstream that shows up in delegation as ``exit_reason="max_iterations"`` with
``status="failed"`` and an empty summary: a subagent that worked for fifty
iterations and returned nothing.

FrontierAgent hit the same wall and measured it. Their note on ``WallClockGuard``
records that a hard cancellation left the run with no stop reason, skipped the
finalizer, and discarded the whole run as an empty report — **52.8% of subagents
on one benchmark**.

Hermes already decided how to fix this, and then didn't
-------------------------------------------------------
``agent/agent_init.py`` carries this comment above the two flags::

    # Iteration budget: the LLM is only notified when it actually exhausts
    # the iteration budget (api_call_count >= max_iterations).  At that
    # point we inject ONE message, allow one final API call, and if the
    # model doesn't produce a text response, force a user-message asking
    # it to summarise.  No intermediate pressure warnings — they caused
    # models to "give up" prematurely on complex tasks (#7915).
    agent._budget_exhausted_injected = False
    agent._budget_grace_call = False

``AGENTS.md`` describes the same "one-turn grace call" in its loop sketch, and
``tests/run_agent/test_run_agent.py::TestBudgetPressure`` has a class docstring
for it. **None of it was implemented**: nothing in the repository ever sets
either flag to ``True``, so ``or agent._budget_grace_call`` in the loop
condition can never fire. This module supplies the missing half.

Why that shape, and not FrontierAgent's
---------------------------------------
FrontierAgent injects its reserve notice eight turns from the end. Hermes tried
intermediate pressure warnings and **removed them** (#7915) because models read
them as permission to wind down and abandoned complex tasks early. That lesson
outranks the port, so:

* the **grace call is the default** — it fires at exhaustion, when the run is
  over either way, and therefore cannot cause an early give-up;
* the **early reserve notice is opt-in** (``agent.finalization_reserve_turns``,
  default ``0``), for operators who would rather trade some depth for a
  reliably-written answer;
* the force is mechanical, not rhetorical. The final request goes out with
  ``tool_choice="none"``. A model that cannot call a tool writes prose. The
  notice is advice; this is what actually produces the outcome.

Why this module is pure
-----------------------
Nothing here imports the agent, the loop, or a transport. It answers "given
these counters, what should happen now?" so the policy can be tested
exhaustively without constructing a conversation.
"""

from __future__ import annotations

from dataclasses import dataclass

__all__ = [
    "DEFAULT_RESERVE_ITERATIONS",
    "EXHAUSTION_NOTICE",
    "ReservePlan",
    "deliver_notice",
    "notice_text",
    "plan_iteration",
    "resolve_reserve",
]

# Opt-in only — see the #7915 note above. When an operator does turn it on, 8
# is FrontierAgent's default and a reasonable starting point.
DEFAULT_RESERVE_ITERATIONS = 8

# Injected once, at exhaustion, immediately before the grace call. This is the
# "ONE message" agent_init's comment describes.
EXHAUSTION_NOTICE = (
    "Your iteration budget for this run is now spent. This is your final "
    "response and it will be sent without tools, so you cannot look anything "
    "else up. Answer now, in plain text, using what you already have. If part "
    "of the work is unfinished, say which part and give the best result your "
    "evidence supports — an incomplete answer that names its gaps is useful; "
    "no answer is not."
)

# Injected once when the opt-in reserve opens, several iterations earlier.
FINALIZATION_NOTICE = (
    "You are entering this run's finalization reserve — only a few tool-enabled "
    "steps remain before the iteration budget is spent. Stop opening new lines "
    "of investigation. Use what is left to finish and save the deliverables you "
    "can, run only checks that are essential, and then give a complete answer "
    "in plain text. If part of the work cannot be finished, say so explicitly "
    "and still answer with the best result your evidence supports."
)

# Injected on the last iteration that still has tools.
LAST_TURN_NOTICE = (
    "This is your last step with tools. Anything you still need to look up or "
    "write must happen now — after this you will only be able to produce the "
    "final answer as text."
)

_NOTICES = {
    "exhaustion": EXHAUSTION_NOTICE,
    "finalization": FINALIZATION_NOTICE,
    "last_turn_warning": LAST_TURN_NOTICE,
}


def notice_text(key: str) -> str:
    """Resolve a plan's notice key to the text to inject. Unknown key -> ""."""
    return _NOTICES.get(key or "", "")


@dataclass(frozen=True)
class ReservePlan:
    """What this iteration should do about the budget.

    ``notice`` is a key for :func:`notice_text`, or ``""``. ``strip_tools`` asks
    the caller to send this request with ``tool_choice="none"``.
    """

    notice: str = ""
    strip_tools: bool = False
    phase: str = ""

    def __bool__(self) -> bool:
        return bool(self.notice) or self.strip_tools


def resolve_reserve(max_iterations: int, configured: object) -> int:
    """Clamp a configured reserve to something this budget can actually hold.

    A reserve at or above the budget would fire on iteration one and turn every
    run into a single-shot answer. A reserve that leaves no tool-enabled
    iteration before the final one is equally useless — the notice would arrive
    on the same turn the tools are taken away, which is the grace call wearing a
    different hat. Both collapse to "no reserve".

    ``None`` and unparseable values mean "not configured" and disable the early
    notice, matching the default. Only an explicit positive number arms it.
    """
    if configured is None:
        return 0
    try:
        reserve = int(configured)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return 0
    if reserve <= 0:
        return 0
    try:
        budget = int(max_iterations)
    except (TypeError, ValueError):
        return 0
    # Need room for iteration 1 (never a reserve turn), at least one
    # tool-enabled reserve iteration, and the final iteration.
    if budget < 4:
        return 0
    return min(reserve, budget - 2)


def plan_iteration(
    *,
    iteration: int,
    max_iterations: int,
    reserve: int,
    reserve_fired: bool,
) -> ReservePlan:
    """Decide what iteration ``iteration`` (1-based) should do.

    Covers only the **opt-in** early rungs. Exhaustion and the grace call are
    handled at the point the budget is actually refused, not here, because that
    branch has to run whether or not a reserve was configured.

    ``reserve_fired`` says the reserve notice has already been injected once; it
    is one-shot, because repeating "you are running out" every turn spends the
    very budget it is warning about — and is the shape #7915 removed.
    """
    try:
        n = int(iteration)
        budget = int(max_iterations)
        held = int(reserve)
    except (TypeError, ValueError):
        return ReservePlan()

    if budget <= 0 or n <= 0 or held <= 0:
        return ReservePlan()

    # The last iteration that still has tools. Deliberately a different text
    # from the reserve notice: this one is about the mechanism, not the budget.
    if n == budget:
        return ReservePlan(notice="last_turn_warning", phase="last_turn_warning")

    # The reserve opens when the remaining iterations drop to `held`. Never on
    # the first iteration: a budget small enough for that is one resolve_reserve
    # has already declined to arm.
    if not reserve_fired and n > 1 and (budget - n) <= held:
        return ReservePlan(notice="finalization", phase="reserve")

    return ReservePlan()


def deliver_notice(messages: list, text: str) -> bool:
    """Append ``text`` to the last tool result. Returns whether it landed.

    Same delivery channel as ``/steer``, and for the same reason: a bare user
    message inserted mid-tool-loop breaks role alternation (see the comment at
    the pre-API steer drain in ``conversation_loop``). The end of a tool result
    is the only role-safe slot.

    Failing to land is not an error. It means there is no tool result to ride —
    the very first iteration, or a turn where the model answered without calling
    anything. In both cases the run is not in the state this notice is about,
    and the tool-free final request is what forces an answer regardless.
    """
    if not text or not isinstance(messages, list):
        return False

    from agent.prompt_builder import format_budget_notice

    marker = format_budget_notice(text)
    for msg in reversed(messages):
        if not isinstance(msg, dict) or msg.get("role") != "tool":
            continue
        existing = msg.get("content", "")
        if isinstance(existing, str):
            msg["content"] = existing + marker
            return True
        # Multimodal content blocks — append a text block rather than
        # stringifying the list, which would destroy the images.
        try:
            blocks = list(existing) if existing else []
            blocks.append({"type": "text", "text": marker})
            msg["content"] = blocks
            return True
        except (TypeError, ValueError):
            return False
    return False
