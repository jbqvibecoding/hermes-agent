"""F2: the reply that spent its whole budget thinking and came back empty.

Hermes already caught one shape of this — ``<think>`` tags left in the content.
The shape it could not see is the one that matters most: a gateway (SGLang,
vLLM, most aggregators) strips the reasoning channel, so ``content`` is ``None``
with no tags, the reply falls through to the truncation path, and four
continuation retries each reproduce the runaway. Four paid calls, empty result.
"""

from __future__ import annotations

import pytest

from agent.reasoning_runaway import (
    MAX_RETRY_TOKENS,
    MIN_OUTPUT_TOKENS,
    RECOVERY_REMINDER,
    classify_runaway,
    retry_max_tokens,
)


def _classify(**kw):
    base = dict(content=None, has_tool_calls=False, finish_reason="length")
    base.update(kw)
    return classify_runaway(**base)


# ---------------------------------------------------------------------------
# Tier 1 — the existing check, unchanged
# ---------------------------------------------------------------------------


def test_think_tags_are_still_tier_one():
    hit, tier = _classify(content="<think>...</think>", has_think_tags=True)
    assert (hit, tier) == (True, "think_tags")


def test_think_tags_win_over_the_weaker_tiers():
    """Tier order is confidence order; the log line has to name the strongest
    evidence, not whichever check happened to run."""
    _, tier = _classify(
        has_think_tags=True,
        provider_data={"reasoning_content": "..."},
        completion_tokens=9999,
    )
    assert tier == "think_tags"


def test_think_tags_do_not_need_a_length_finish_reason():
    """A gateway that drops finish_reason must not disable the tier we already
    trusted."""
    hit, _ = _classify(finish_reason="", has_think_tags=True)
    assert hit is True


# ---------------------------------------------------------------------------
# Tier 2 — data Hermes was already capturing and never used
# ---------------------------------------------------------------------------


def test_reasoning_content_with_no_visible_text_is_a_runaway():
    hit, tier = _classify(provider_data={"reasoning_content": "long thoughts"})
    assert (hit, tier) == (True, "reasoning_field")


def test_reasoning_details_also_counts():
    """OpenRouter uses reasoning_details rather than reasoning_content."""
    hit, tier = _classify(provider_data={"reasoning_details": [{"text": "x"}]})
    assert (hit, tier) == (True, "reasoning_field")


def test_empty_reasoning_content_is_not_evidence():
    hit, _ = _classify(provider_data={"reasoning_content": "   "})
    assert hit is False


def test_tier_two_does_not_need_a_length_finish_reason():
    """Direct evidence of reasoning with nothing shown stands on its own."""
    hit, tier = _classify(
        finish_reason="stop", provider_data={"reasoning_content": "thoughts"}
    )
    assert (hit, tier) == (True, "reasoning_field")


def test_junk_provider_data_is_ignored_rather_than_raising():
    for junk in ("string", 42, [], None):
        assert _classify(provider_data=junk, completion_tokens=0)[0] is False


# ---------------------------------------------------------------------------
# Tier 3 — the fallback heuristic, for gateways that surface neither
# ---------------------------------------------------------------------------


def test_a_large_capped_empty_completion_is_a_runaway():
    hit, tier = _classify(completion_tokens=4096)
    assert (hit, tier) == (True, "token_heuristic")


def test_exactly_at_the_floor_counts():
    assert _classify(completion_tokens=MIN_OUTPUT_TOKENS)[0] is True


def test_below_the_floor_does_not():
    """Under the floor a capped-empty completion cannot be told apart from an
    ordinary empty reply, so claiming a runaway would be a guess."""
    assert _classify(completion_tokens=MIN_OUTPUT_TOKENS - 1)[0] is False


def test_tier_three_requires_a_length_finish_reason():
    """With text absent and no length signal, a big completion is not evidence
    of anything — this is the weakest tier and must not overreach."""
    assert _classify(finish_reason="stop", completion_tokens=99_999)[0] is False


def test_a_non_numeric_token_count_is_treated_as_zero():
    assert _classify(completion_tokens="lots")[0] is False  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# A working reply is never a runaway, whatever else is true
# ---------------------------------------------------------------------------


def test_tool_calls_disqualify_it_outright():
    """Checked before every tier: a turn that called a tool did its job."""
    hit, _ = _classify(
        has_tool_calls=True,
        has_think_tags=True,
        provider_data={"reasoning_content": "x"},
        completion_tokens=99_999,
    )
    assert hit is False


def test_visible_text_disqualifies_it_outright():
    hit, _ = _classify(
        content="here is the answer",
        provider_data={"reasoning_content": "x"},
        completion_tokens=99_999,
    )
    assert hit is False


def test_multimodal_text_blocks_count_as_visible():
    hit, _ = _classify(
        content=[{"type": "text", "text": "the answer"}], completion_tokens=99_999
    )
    assert hit is False


def test_multimodal_with_no_text_block_is_still_empty():
    hit, _ = _classify(
        content=[{"type": "image", "source": {}}], completion_tokens=4096
    )
    assert hit is True


def test_whitespace_only_content_is_empty():
    assert _classify(content="   \n ", completion_tokens=4096)[0] is True


def test_a_plain_healthy_reply_is_not_a_runaway():
    hit, tier = classify_runaway(
        content="done", has_tool_calls=False, finish_reason="stop"
    )
    assert (hit, tier) == (False, "")


# ---------------------------------------------------------------------------
# The resample cap — halving is what changes the outcome
# ---------------------------------------------------------------------------


def test_it_halves_the_observed_completion():
    assert retry_max_tokens(completion_tokens=4096) == 2048


def test_it_never_goes_below_the_floor():
    """Below the floor the next runaway would be undetectable — trading a
    diagnosable failure for a silent one."""
    assert retry_max_tokens(completion_tokens=1500) == MIN_OUTPUT_TOKENS


def test_a_completion_already_at_or_under_the_floor_is_used_as_is():
    assert retry_max_tokens(completion_tokens=800) == 800
    assert retry_max_tokens(completion_tokens=MIN_OUTPUT_TOKENS) == MIN_OUTPUT_TOKENS


def test_it_never_exceeds_the_ceiling():
    assert retry_max_tokens(completion_tokens=1_000_000) == MAX_RETRY_TOKENS


def test_a_deliberately_small_profile_is_squeezed_not_raised():
    """Deriving from the observed completion rather than a constant is the
    point: a CI profile running at 1024 must not be lifted toward 8K."""
    assert retry_max_tokens(completion_tokens=1024) == 1024
    assert retry_max_tokens(completion_tokens=2048) == 1024


def test_successive_halvings_shrink_further():
    first = retry_max_tokens(completion_tokens=8192)
    second = retry_max_tokens(completion_tokens=first)
    assert second < first


def test_it_falls_back_to_the_active_cap_when_usage_is_missing():
    """An early-cancelled stream reports no usage; the request cap is still an
    authoritative upper bound."""
    assert retry_max_tokens(completion_tokens=0, active_cap=4096) == 2048


def test_with_neither_it_declines_to_guess():
    assert retry_max_tokens(completion_tokens=0, active_cap=None) is None
    assert retry_max_tokens(completion_tokens=0, active_cap="x") is None
    assert retry_max_tokens(completion_tokens=0, active_cap=0) is None


@pytest.mark.parametrize("bad", [None, "x", -5])
def test_bad_token_counts_do_not_raise(bad):
    retry_max_tokens(completion_tokens=bad)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# The reminder
# ---------------------------------------------------------------------------


def test_the_reminder_asks_for_visible_output_or_a_tool_call():
    assert "visible answer text or a tool call" in RECOVERY_REMINDER


def test_the_reminder_explains_what_went_wrong():
    """Without the reason the model has no basis to behave differently."""
    assert "no visible answer" in RECOVERY_REMINDER


# ---------------------------------------------------------------------------
# The loop wiring
# ---------------------------------------------------------------------------


def test_the_resample_guard_is_scoped_to_the_api_call():
    """On the agent it would allow exactly one resample per process; on the
    retry state it resets each call, like every other guard there."""
    from agent.turn_retry_state import TurnRetryState

    assert TurnRetryState().runaway_resample_attempted is False
    assert TurnRetryState(runaway_resample_attempted=True).runaway_resample_attempted


def test_the_reminder_is_appended_to_api_messages_not_messages():
    """`messages` is the durable transcript. A hint about one bad sample must
    not survive into it."""
    import inspect

    from agent import conversation_loop

    source = inspect.getsource(conversation_loop)
    # rindex, not index: the first occurrence is the import.
    idx = source.rindex("RECOVERY_REMINDER")
    window = source[max(0, idx - 300) : idx + 100]
    assert "api_messages.append" in window
    assert "messages.append({\"role\": \"user\", \"content\": RECOVERY_REMINDER" not in source


def test_the_runaway_path_does_not_use_the_length_continuation_restart():
    """That path boosts _ephemeral_max_output_tokens on every retry, which
    would undo the reduced cap that is the actual fix."""
    import inspect

    from agent import conversation_loop

    source = inspect.getsource(conversation_loop)
    idx = source.index("runaway_resample_attempted = True")
    window = source[idx : idx + 1600]
    assert "restart_with_length_continuation" not in window
    # Retries the INNER attempt loop, so api_messages (and the reminder) and
    # the reduced cap both survive.
    assert "retry_count += 1" in window and "continue" in window


def test_an_unrecovered_runaway_still_reaches_the_existing_message():
    """After the one resample, fall through to the 'Thinking Budget Exhausted'
    guidance rather than spending the continuation retries proving it again."""
    import inspect

    from agent import conversation_loop

    source = inspect.getsource(conversation_loop)
    assert "if _is_runaway:\n                        _thinking_exhausted = True" in source
