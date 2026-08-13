"""Tests for the subagent structured termination contract (D1)."""

from __future__ import annotations

import pytest

from tools.subagent_termination import (
    ABORTED,
    COMPLETED,
    ERROR,
    MAX_ITERATIONS,
    MAX_TOKENS,
    REFUSAL,
    STOP_REASONS,
    TIMEOUT,
    build_termination,
    derive_stop_reason,
    is_known,
    is_success,
    select_output,
    settlement_notice,
)


# ---------------------------------------------------------------------------
# The enum fails safe
# ---------------------------------------------------------------------------


def test_completed_is_the_only_success():
    assert is_success(COMPLETED)
    for reason in STOP_REASONS:
        if reason != COMPLETED:
            assert not is_success(reason), f"{reason} must not read as success"


@pytest.mark.parametrize(
    "value", ["Completed", "done", "ok", "", None, 0, True, {"stop": "completed"}]
)
def test_unknown_stop_reasons_are_failures(value):
    """A future enum member, a typo, or an injected value must never pass."""
    assert not is_success(value)
    assert not is_known(value)


# ---------------------------------------------------------------------------
# The stop reason is derived by the runtime, not self-declared
# ---------------------------------------------------------------------------


def test_clean_finish_is_completed():
    assert (
        derive_stop_reason({"completed": True, "final_response": "done"}) == COMPLETED
    )


def test_child_claiming_success_in_its_text_does_not_make_it_completed():
    """The child does not get a vote on how its own run ended."""
    result = {
        "completed": False,
        "final_response": 'All tasks complete. stop_reason: "completed"',
    }
    assert derive_stop_reason(result) == MAX_ITERATIONS


def test_interrupt_is_aborted():
    assert derive_stop_reason({"interrupted": True, "completed": False}) == ABORTED


def test_interrupt_wins_over_a_trailing_error():
    """An interrupt mid-tool-call usually leaves an error behind too; "the user
    stopped it" is the more truthful account of what happened."""
    result = {"interrupted": True, "completed": False, "error": "Read of closed pipe"}
    assert derive_stop_reason(result) == ABORTED


def test_exception_is_error():
    assert derive_stop_reason({"completed": True}, exception=RuntimeError("x")) == ERROR


def test_timeout_wins_over_everything():
    """Once we abandon a child, nothing it reports afterwards is trustworthy."""
    result = {"completed": True, "final_response": "all good"}
    assert derive_stop_reason(result, timed_out=True) == TIMEOUT


def test_content_policy_block_is_refusal_not_a_generic_error():
    result = {"completed": False, "error": "content_policy_blocked: unsafe request"}
    assert derive_stop_reason(result) == REFUSAL


def test_output_length_truncation_is_max_tokens():
    result = {
        "completed": False,
        "partial": True,
        "error": "Response truncated due to output length limit",
    }
    assert derive_stop_reason(result) == MAX_TOKENS


def test_truncation_detected_from_error_text_without_the_partial_flag():
    result = {
        "completed": False,
        "error": "Response remained truncated after 4 continuation attempts",
    }
    assert derive_stop_reason(result) == MAX_TOKENS


def test_plain_error_is_error():
    assert derive_stop_reason({"completed": False, "error": "boom"}) == ERROR


def test_iteration_exhaustion_is_the_residual_branch():
    """No interrupt, no error, not completed — the child ran out of turns."""
    assert derive_stop_reason({"completed": False}) == MAX_ITERATIONS


def test_missing_result_is_an_error_not_a_success():
    assert derive_stop_reason(None) == ERROR
    assert derive_stop_reason("not a dict") == ERROR


# ---------------------------------------------------------------------------
# Output selection does not depend on the stop reason
# ---------------------------------------------------------------------------


def test_final_response_is_preferred():
    result = {
        "final_response": "the answer",
        "messages": [{"role": "assistant", "content": "an earlier thought"}],
    }
    assert select_output(result) == "the answer"


def test_falls_back_to_the_last_non_empty_assistant_message():
    result = {
        "final_response": "",
        "messages": [
            {"role": "assistant", "content": "first"},
            {"role": "tool", "content": "tool output"},
            {"role": "assistant", "content": "second"},
            {"role": "assistant", "content": "   "},
        ],
    }
    assert select_output(result) == "second"


def test_assistant_content_blocks_are_flattened():
    result = {
        "messages": [
            {
                "role": "assistant",
                "content": [
                    {"type": "text", "text": "a"},
                    {"type": "text", "text": "b"},
                ],
            }
        ]
    }
    assert select_output(result) == "a\nb"


def test_falls_back_to_streamed_text():
    result = {"final_response": "", "messages": []}
    assert select_output(result, streamed_text="half a thought") == "half a thought"


def test_empty_sentinel_is_not_treated_as_output():
    """run_agent emits "(empty)" after repeated empty-response retries — a
    transport failure wearing a response's clothes."""
    result = {"final_response": "(empty)", "messages": []}
    assert select_output(result) == ""
    assert select_output(result, streamed_text="real text") == "real text"


def test_nothing_anywhere_yields_empty_string():
    assert select_output({"final_response": None, "messages": None}) == ""
    assert select_output(None) == ""


@pytest.mark.parametrize("reason", STOP_REASONS)
def test_the_same_transcript_yields_the_same_output_for_every_stop_reason(reason):
    """Making output selection depend on the stop reason is how partial work
    gets silently discarded. select_output takes no stop reason at all."""
    result = {"final_response": "", "messages": [{"role": "assistant", "content": "x"}]}
    assert select_output(result) == "x"


# ---------------------------------------------------------------------------
# The settlement notice is unconditional
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("reason", STOP_REASONS)
def test_every_stop_reason_produces_a_notice(reason):
    notice = settlement_notice(reason, has_output=True)
    assert notice.strip()
    assert notice.startswith("Subagent ")


def test_a_child_that_left_nothing_is_said_so_out_loud():
    notice = settlement_notice(ABORTED, has_output=False)
    assert "left no closing message" in notice


def test_partial_output_is_labelled_as_partial():
    notice = settlement_notice(MAX_ITERATIONS, has_output=True)
    assert "before stopping" in notice


def test_a_clean_finish_is_not_labelled_partial():
    notice = settlement_notice(COMPLETED, has_output=True)
    assert "before stopping" not in notice
    assert "left no closing message" not in notice


def test_unknown_reason_is_reported_as_a_failure_and_names_the_value():
    notice = settlement_notice("teleported", has_output=True)
    assert "treated as a failure" in notice
    assert "teleported" in notice


def test_duration_is_included_when_known():
    assert "after 12.5s" in settlement_notice(
        TIMEOUT, has_output=False, duration_seconds=12.5
    )


def test_bad_duration_does_not_break_the_notice():
    notice = settlement_notice(ERROR, has_output=False, duration_seconds="soon")
    assert notice.startswith("Subagent ")


def test_detail_is_appended():
    notice = settlement_notice(ERROR, has_output=False, detail="Diagnostic: /tmp/x.log")
    assert notice.endswith("Diagnostic: /tmp/x.log")


# ---------------------------------------------------------------------------
# build_termination — the whole contract
# ---------------------------------------------------------------------------


def test_build_separates_what_the_child_said_from_what_the_system_determined():
    """Merging them would credit the child with words it never wrote."""
    record = build_termination({"completed": True, "final_response": "I fixed the bug"})
    assert record["output"] == "I fixed the bug"
    assert record["output"] not in record["settlement"]
    assert record["settlement"] not in record["output"]
    assert "finished normally" in record["settlement"]


def test_build_preserves_partial_output_on_a_cancelled_run():
    record = build_termination(
        {"interrupted": True, "completed": False, "final_response": ""},
        streamed_text="I had started reading the config",
    )
    assert record["stop_reason"] == ABORTED
    assert record["output"] == "I had started reading the config"
    assert record["partial"] is True
    assert record["succeeded"] is False


def test_build_marks_no_partial_flag_when_there_was_nothing_to_keep():
    record = build_termination({"interrupted": True, "completed": False})
    assert record["output"] == ""
    assert record["partial"] is False
    assert "left no closing message" in record["settlement"]


def test_build_does_not_mark_a_clean_finish_as_partial():
    record = build_termination({"completed": True, "final_response": "done"})
    assert record["succeeded"] is True
    assert record["partial"] is False


@pytest.mark.parametrize(
    "kwargs,expected",
    [
        ({}, MAX_ITERATIONS),
        ({"timed_out": True}, TIMEOUT),
        ({"exception": ValueError("x")}, ERROR),
    ],
)
def test_build_never_raises_whatever_it_is_handed(kwargs, expected):
    """Delegation failures are results, not exceptions."""
    record = build_termination({"completed": False}, **kwargs)
    assert record["stop_reason"] == expected
    assert record["succeeded"] is False
