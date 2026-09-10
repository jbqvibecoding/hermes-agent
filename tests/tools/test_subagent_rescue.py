"""F1e: a subagent that gathered plenty and summarised none of it.

D1 made the parent able to say *how* a child died. This makes it able to say
*what the child found* anyway. The three rungs get cheaper as they go, and which
one produced the text is recorded — text a model wrote under rescue and a
sentence Hermes assembled are not the same kind of thing.
"""

from __future__ import annotations

from tools.subagent_rescue import (
    MODE_MINIMAL,
    MODE_MODEL,
    MODE_PARTIAL,
    build_recovery_messages,
    minimal_best_effort,
    rescue,
)

TRANSCRIPT = [
    {"role": "system", "content": "You are a subagent."},
    {"role": "user", "content": "Find the retry limit."},
    {
        "role": "assistant",
        "content": "Searching.",
        "tool_calls": [{"function": {"name": "search_files"}, "id": "1"}],
    },
    {"role": "tool", "tool_call_id": "1", "content": "config.py:12 MAX_RETRIES = 4"},
]


# ---------------------------------------------------------------------------
# Rung selection
# ---------------------------------------------------------------------------


def test_the_model_rung_wins_when_it_answers():
    text, mode = rescue(TRANSCRIPT, goal="g", partial="p", caller=lambda m: "it is 4")
    assert (text, mode) == ("it is 4", MODE_MODEL)


def test_it_falls_to_the_partial_output_when_the_model_says_nothing():
    text, mode = rescue(TRANSCRIPT, goal="g", partial="half done", caller=lambda m: "")
    assert (text, mode) == ("half done", MODE_PARTIAL)


def test_it_falls_to_the_partial_output_when_the_call_raises():
    """A failed rescue must not turn a merely-empty delegation into a broken
    one — D1 already established delegation never throws to the parent."""

    def boom(_messages):
        raise RuntimeError("provider exploded")

    text, mode = rescue(TRANSCRIPT, partial="half done", caller=boom)
    assert (text, mode) == ("half done", MODE_PARTIAL)


def test_it_falls_all_the_way_to_the_mechanical_account():
    text, mode = rescue(TRANSCRIPT, goal="Find the retry limit.", caller=lambda m: "")
    assert mode == MODE_MINIMAL
    assert "search_files" in text


def test_with_no_caller_it_still_produces_the_free_rungs():
    """A caller that cannot afford the LLM call passes None and still gets
    something better than a blank."""
    text, mode = rescue(TRANSCRIPT, partial="half done", caller=None)
    assert (text, mode) == ("half done", MODE_PARTIAL)

    text, mode = rescue(TRANSCRIPT, caller=None)
    assert mode == MODE_MINIMAL


def test_whitespace_is_not_an_answer():
    text, mode = rescue(TRANSCRIPT, partial="   \n ", caller=lambda m: "  ")
    assert mode == MODE_MINIMAL


def test_the_model_answer_is_stripped():
    text, _ = rescue(TRANSCRIPT, caller=lambda m: "\n  it is 4  \n")
    assert text == "it is 4"


def test_garbage_messages_do_not_raise():
    for junk in (None, "transcript", 42, [None, "x", {"role": None}]):
        text, mode = rescue(junk, caller=None)
        assert mode in (MODE_MINIMAL, "none")


# ---------------------------------------------------------------------------
# The recovery prompt
# ---------------------------------------------------------------------------


def test_the_transcript_is_flattened_into_one_user_message():
    """The original shape can contain assistant turns whose tool results were
    dropped, which providers reject. Flattening sidesteps that entirely."""
    messages = build_recovery_messages(TRANSCRIPT, goal="Find the retry limit.")
    assert len(messages) == 1
    assert messages[0]["role"] == "user"


def test_the_evidence_survives_the_flattening():
    body = build_recovery_messages(TRANSCRIPT)[0]["content"]
    assert "MAX_RETRIES = 4" in body
    assert "search_files" in body


def test_the_goal_is_included_when_known():
    body = build_recovery_messages(TRANSCRIPT, goal="Find the retry limit.")[0]["content"]
    assert "Find the retry limit." in body


def test_the_childs_system_prompt_is_not_replayed():
    """It is instructions, not evidence of work, and replaying it invites the
    model to resume the task instead of reporting on it."""
    body = build_recovery_messages(TRANSCRIPT)[0]["content"]
    assert "You are a subagent." not in body


def test_budget_notices_are_stripped_from_the_recovery_prompt():
    """F1's notices are Hermes talking about the budget. Replaying them here
    would have them compete with the recovery instruction."""
    from agent.prompt_builder import format_budget_notice

    messages = list(TRANSCRIPT)
    messages[-1] = {
        "role": "tool",
        "tool_call_id": "1",
        "content": "found it" + format_budget_notice("wrap up now"),
    }
    body = build_recovery_messages(messages)[0]["content"]
    assert "found it" in body
    assert "wrap up now" not in body


def test_the_instruction_forbids_inventing_results():
    """A model asked to produce an answer from a failed run will happily
    fabricate one if not told otherwise."""
    body = build_recovery_messages(TRANSCRIPT)[0]["content"]
    assert "Do not invent results" in body
    assert "incomplete" in body


def test_the_prompt_is_bounded():
    huge = [
        {"role": "tool", "tool_call_id": str(i), "content": "x" * 5_000}
        for i in range(100)
    ]
    body = build_recovery_messages(huge, max_chars=10_000)[0]["content"]
    # header + instruction ride outside the transcript budget; the transcript
    # itself must respect it.
    assert len(body) < 12_000


def test_oversized_single_items_are_clipped_head_and_tail():
    """Keeping only the head would lose a tool result's conclusion, which is
    usually the part that matters."""
    messages = [{"role": "tool", "tool_call_id": "1", "content": "A" * 3000 + "VERDICT" + "B" * 3000}]
    body = build_recovery_messages(messages)[0]["content"]
    assert "omitted" in body
    assert body.count("A") > 0 and body.count("B") > 0


def test_multimodal_content_contributes_its_text_and_drops_the_rest():
    messages = [
        {
            "role": "tool",
            "tool_call_id": "1",
            "content": [
                {"type": "image", "source": {"data": "..."}},
                {"type": "text", "text": "the chart shows 4"},
            ],
        }
    ]
    body = build_recovery_messages(messages)[0]["content"]
    assert "the chart shows 4" in body


def test_empty_messages_still_produce_a_valid_request():
    messages = build_recovery_messages([])
    assert len(messages) == 1 and messages[0]["content"].strip()


# ---------------------------------------------------------------------------
# The mechanical rung
# ---------------------------------------------------------------------------


def test_it_names_the_tools_that_ran():
    text = minimal_best_effort(TRANSCRIPT, goal="Find the retry limit.")
    assert "search_files" in text


def test_it_says_so_when_nothing_ran():
    text = minimal_best_effort([{"role": "user", "content": "go"}])
    assert "ran no tools" in text


def test_it_labels_itself_as_assembled_by_hermes():
    """It is not the child's report and must not read like one — the same
    reason D1 keeps the settlement notice out of the summary."""
    text = minimal_best_effort(TRANSCRIPT)
    assert "assembled by Hermes" in text
    assert "not written by the subagent" in text


def test_it_carries_the_last_thing_the_child_said():
    text = minimal_best_effort(TRANSCRIPT)
    assert "Searching." in text


def test_a_long_tool_list_is_summarised_rather_than_dumped():
    messages = [
        {
            "role": "assistant",
            "content": "",
            "tool_calls": [{"function": {"name": f"tool_{i}"}} for i in range(30)],
        }
    ]
    text = minimal_best_effort(messages)
    assert "+18 more" in text


def test_duplicate_tool_calls_are_listed_once():
    messages = [
        {
            "role": "assistant",
            "content": "",
            "tool_calls": [{"function": {"name": "read_file"}} for _ in range(5)],
        }
    ]
    assert minimal_best_effort(messages).count("read_file") == 1


def test_it_never_raises_on_junk():
    for junk in (None, "x", [{"role": "assistant", "tool_calls": "nope"}]):
        assert minimal_best_effort(junk)
