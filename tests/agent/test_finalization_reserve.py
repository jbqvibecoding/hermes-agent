"""F1: don't let a run die mid-tool-call with nothing written down.

The failure this exists to prevent: a subagent burns fifty iterations, the loop
breaks on the budget, and the parent gets ``exit_reason="max_iterations"`` with
an empty summary and ``status="failed"``.

Two mechanisms, and the split matters:

* the **grace call** always runs — at exhaustion, when the run is over anyway,
  so it cannot make a model give up early;
* the **early reserve notice** is opt-in, because #7915 records that Hermes
  tried intermediate pressure warnings and removed them for exactly that.
"""

from __future__ import annotations

import pytest

from agent.finalization_reserve import (
    DEFAULT_RESERVE_ITERATIONS,
    EXHAUSTION_NOTICE,
    deliver_notice,
    notice_text,
    plan_iteration,
    resolve_reserve,
)


def _plan(n, budget=50, reserve=8, fired=False):
    return plan_iteration(
        iteration=n, max_iterations=budget, reserve=reserve, reserve_fired=fired
    )


# ---------------------------------------------------------------------------
# resolve_reserve — off unless explicitly asked for
# ---------------------------------------------------------------------------


def test_unconfigured_means_off():
    """The default. #7915: an unrequested pressure warning is a regression."""
    assert resolve_reserve(50, None) == 0


def test_garbage_means_off_rather_than_the_default():
    """A typo in config.yaml must not silently switch on a behaviour the
    operator did not ask for."""
    assert resolve_reserve(50, "eight") == 0
    assert resolve_reserve(50, [8]) == 0


def test_an_explicit_number_arms_it():
    assert resolve_reserve(50, 8) == 8


def test_zero_disables_it():
    assert resolve_reserve(50, 0) == 0


def test_a_negative_reserve_disables_it_rather_than_inverting_the_comparison():
    assert resolve_reserve(50, -5) == 0


def test_a_reserve_larger_than_the_budget_is_clamped_not_dropped():
    """Clamping keeps some landing room; dropping to 0 would give none."""
    assert resolve_reserve(10, 40) == 8


def test_a_budget_too_small_to_hold_a_reserve_gets_none():
    for budget in (0, 1, 2, 3):
        assert resolve_reserve(budget, 8) == 0


def test_the_clamp_always_leaves_a_tool_enabled_reserve_turn_before_the_last():
    """If the notice landed on the final iteration it would just be the
    last-turn warning with extra words."""
    for budget in range(4, 30):
        reserve = resolve_reserve(budget, 999)
        assert reserve <= budget - 2


def test_a_garbage_budget_disables_it():
    assert resolve_reserve("fifty", 8) == 0


def test_the_documented_default_is_what_frontieragent_uses():
    assert DEFAULT_RESERVE_ITERATIONS == 8


# ---------------------------------------------------------------------------
# The opt-in reserve notice
# ---------------------------------------------------------------------------


def test_the_reserve_opens_when_the_remaining_iterations_reach_it():
    assert _plan(42).notice == "finalization"


def test_it_does_not_open_before_that():
    assert _plan(41).notice == ""
    assert not _plan(41)


def test_it_is_one_shot():
    """Repeating 'you are running out' every turn spends the budget it warns
    about — the shape #7915 removed."""
    assert _plan(43, fired=True).notice == ""


def test_it_never_fires_on_the_first_iteration():
    assert _plan(1, budget=50, reserve=49).notice == ""


def test_nothing_at_all_happens_when_the_reserve_is_off():
    """The default path must be byte-identical to the old behaviour."""
    for n in range(1, 51):
        assert not _plan(n, reserve=0)


def test_the_last_tool_enabled_iteration_warns():
    plan = _plan(50)
    assert plan.notice == "last_turn_warning"


def test_the_two_notices_are_different_texts():
    """One is about the budget, the other about the mechanism. Merging them
    would announce 'tools are going away' several turns before they do."""
    assert notice_text("finalization") != notice_text("last_turn_warning")


def test_plan_iteration_never_strips_tools_itself():
    """Stripping belongs to the grace call, which happens at the exhaustion
    branch — it has to run whether or not a reserve was configured."""
    for n in range(1, 60):
        assert _plan(n).strip_tools is False


# ---------------------------------------------------------------------------
# notice_text
# ---------------------------------------------------------------------------


def test_every_notice_key_a_plan_can_produce_resolves_to_text():
    """A plan whose notice key had no text would silently inject nothing."""
    keys = {
        _plan(n).notice
        for n in range(1, 51)
        if _plan(n).notice
    }
    assert keys == {"finalization", "last_turn_warning"}
    for key in keys:
        assert notice_text(key).strip()


def test_an_unknown_key_yields_empty_rather_than_raising():
    assert notice_text("nope") == ""
    assert notice_text("") == ""


def test_the_exhaustion_notice_says_the_next_reply_has_no_tools():
    """The model needs to know why calling something would be pointless."""
    assert "without tools" in EXHAUSTION_NOTICE


def test_the_notices_ask_for_a_partial_answer_rather_than_no_answer():
    """The whole failure mode is returning nothing. Every notice has to say
    that an incomplete answer beats silence."""
    for text in (EXHAUSTION_NOTICE, notice_text("finalization")):
        assert "unfinished" in text or "cannot be finished" in text


# ---------------------------------------------------------------------------
# Degenerate inputs — this runs at the top of every loop iteration
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("budget", [0, -1])
def test_a_non_positive_budget_plans_nothing(budget):
    assert not plan_iteration(
        iteration=1, max_iterations=budget, reserve=8, reserve_fired=False
    )


def test_a_non_positive_iteration_plans_nothing():
    assert not plan_iteration(
        iteration=0, max_iterations=50, reserve=8, reserve_fired=False
    )


def test_garbage_plans_nothing_rather_than_raising():
    """A TypeError here would take down the run this is meant to rescue."""
    assert not plan_iteration(
        iteration="x", max_iterations=50, reserve=8, reserve_fired=False  # type: ignore[arg-type]
    )


# ---------------------------------------------------------------------------
# deliver_notice — the role-alternation-safe channel
# ---------------------------------------------------------------------------


def test_it_appends_to_the_last_tool_result():
    messages = [
        {"role": "user", "content": "go"},
        {"role": "assistant", "content": "", "tool_calls": [{"id": "1"}]},
        {"role": "tool", "tool_call_id": "1", "content": "output"},
    ]
    assert deliver_notice(messages, "wrap up") is True
    assert messages[-1]["content"].startswith("output")
    assert "wrap up" in messages[-1]["content"]


def test_it_does_not_insert_a_user_message():
    """A bare user message mid-tool-loop breaks role alternation — the reason
    /steer uses this channel in the first place."""
    messages = [
        {"role": "user", "content": "go"},
        {"role": "assistant", "content": "", "tool_calls": [{"id": "1"}]},
        {"role": "tool", "tool_call_id": "1", "content": "output"},
    ]
    before = len(messages)
    deliver_notice(messages, "wrap up")
    assert len(messages) == before
    assert [m["role"] for m in messages] == ["user", "assistant", "tool"]


def test_it_uses_the_budget_marker_not_the_steer_marker():
    """The steer marker tells the model the text is the USER speaking with
    their full authority. A budget notice is the runtime talking about itself;
    borrowing that marker would credit the user with words they never wrote."""
    from agent.prompt_builder import BUDGET_MARKER_OPEN, STEER_MARKER_OPEN

    messages = [{"role": "tool", "tool_call_id": "1", "content": "out"}]
    deliver_notice(messages, "wrap up")
    assert BUDGET_MARKER_OPEN in messages[0]["content"]
    assert STEER_MARKER_OPEN not in messages[0]["content"]


def test_it_picks_the_most_recent_tool_result():
    messages = [
        {"role": "tool", "tool_call_id": "1", "content": "first"},
        {"role": "assistant", "content": "thinking"},
        {"role": "tool", "tool_call_id": "2", "content": "second"},
    ]
    deliver_notice(messages, "wrap up")
    assert "wrap up" not in messages[0]["content"]
    assert "wrap up" in messages[2]["content"]


def test_multimodal_tool_content_keeps_its_blocks():
    """Stringifying a content-block list would destroy the images in it."""
    blocks = [{"type": "image", "source": {}}]
    messages = [{"role": "tool", "tool_call_id": "1", "content": list(blocks)}]
    assert deliver_notice(messages, "wrap up") is True
    content = messages[0]["content"]
    assert isinstance(content, list)
    assert content[0] == blocks[0]
    assert content[-1]["type"] == "text"
    assert "wrap up" in content[-1]["text"]


def test_with_no_tool_result_it_reports_failure_instead_of_forcing_one_in():
    """Iteration 1, or a turn the model answered without calling anything.
    The caller uses the False to fall back rather than send a request that
    says nothing new."""
    messages = [{"role": "user", "content": "go"}]
    assert deliver_notice(messages, "wrap up") is False
    assert len(messages) == 1


def test_empty_text_delivers_nothing():
    messages = [{"role": "tool", "tool_call_id": "1", "content": "out"}]
    assert deliver_notice(messages, "") is False
    assert messages[0]["content"] == "out"


def test_a_non_list_is_refused_rather_than_raising():
    assert deliver_notice(None, "wrap up") is False  # type: ignore[arg-type]
    assert deliver_notice("messages", "wrap up") is False  # type: ignore[arg-type]


def test_non_dict_entries_are_skipped():
    messages = ["junk", {"role": "tool", "tool_call_id": "1", "content": "out"}]
    assert deliver_notice(messages, "wrap up") is True


# ---------------------------------------------------------------------------
# End to end over an opted-in budget
# ---------------------------------------------------------------------------


def test_a_full_opted_in_run_fires_each_rung_exactly_once():
    budget, reserve = 50, resolve_reserve(50, 8)
    fired = False
    notices = []
    for n in range(1, budget + 1):
        plan = plan_iteration(
            iteration=n,
            max_iterations=budget,
            reserve=reserve,
            reserve_fired=fired,
        )
        if plan.notice == "finalization":
            fired = True
        if plan.notice:
            notices.append((n, plan.notice))

    assert notices == [(42, "finalization"), (50, "last_turn_warning")]


def test_a_small_budget_still_gets_its_last_turn_warning():
    budget, reserve = 4, resolve_reserve(4, 8)
    assert reserve == 2
    plans = [
        plan_iteration(
            iteration=n, max_iterations=budget, reserve=reserve, reserve_fired=False
        )
        for n in range(1, budget + 1)
    ]
    assert plans[-1].notice == "last_turn_warning"
