"""Hermes Crew — telling a finished run from one that only looks finished.

Four endings produce a reply that reads like an answer and is not one. Each
gets a test here, and three things are asserted beyond "the right label came
back", because each of them is a way this could rot silently:

* **No regex does the deciding.** Three cases are pure structure, and the
  fourth's wording match is one conjunct behind a structural one. The tests
  pin that by showing the same text judged both ways depending only on whether
  the turn called a tool.
* **The framework's own filler is discovered, not described.** The empty-turn
  test builds its input by calling the host's formatter, so if somebody
  rewrites that copy the test moves with it instead of quietly passing on a
  string nobody produces any more.
* **Hitting the step limit with a summary is not a failure.** The host decided
  that deliberately (``cron/scheduler.py``'s ``max_iteration_summary``), so
  there is a test whose whole job is to fail if we ever reverse it.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import verdict as crew_verdict  # noqa: E402


def _turn(**fields):
    """A healthy result dict, with the fields under test overridden.

    Spelled out rather than built from a fixture so each test reads as the
    exact shape ``run_conversation`` hands back.
    """
    base = {
        "final_response": "Here are the three options, with costs.",
        "turn_exit_reason": "text_response(finish_reason=stop)",
        "completed": True,
        "failed": False,
        "interrupted": False,
        "api_calls": 3,
        "messages": [
            {"role": "user", "content": "compare the options"},
            {"role": "assistant", "tool_calls": [{"id": "1", "function": {"name": "web_search"}}]},
            {"role": "tool", "tool_call_id": "1", "content": "..."},
            {"role": "assistant", "content": "Here are the three options, with costs."},
        ],
    }
    base.update(fields)
    return base


# ---------------------------------------------------------------------------
# The healthy case, so the rest mean something
# ---------------------------------------------------------------------------


def test_an_ordinary_answer_is_left_alone():
    """The common path has to stay quiet. A judge that flags healthy turns is
    worse than no judge — the warnings stop being read."""
    result = crew_verdict.judge(_turn())
    assert result.ok
    assert result.state == crew_verdict.OK
    assert crew_verdict.note(result) == ""


# ---------------------------------------------------------------------------
# False green 1 — an upstream error delivered as if the teammate wrote it
# ---------------------------------------------------------------------------


def test_an_upstream_error_is_not_an_answer():
    """`failed` is a field. Nothing about this needs to be read out of the
    text, which is what makes it reliable — the error string itself can say
    anything at all, in any language, from any provider."""
    result = crew_verdict.judge(_turn(
        failed=True,
        final_response="Error: upstream connect error or disconnect/reset before headers",
    ))
    assert result.state == crew_verdict.FAILED
    assert result.reason == "upstream_error"
    assert result.retryable


def test_a_crew_side_error_counts_too():
    """The orchestrator's own exception path returns `{"error": ...}` with no
    other field set. That is the shape a turn takes when it never reached the
    model at all, and it must not read as a completed run."""
    result = crew_verdict.judge({"error": "the computer would not start"})
    assert result.state == crew_verdict.FAILED
    assert "computer would not start" in result.detail


# ---------------------------------------------------------------------------
# False green 2 — the step limit
# ---------------------------------------------------------------------------


def test_the_step_limit_with_a_summary_is_incomplete_not_failed():
    """**This test exists to stop us reversing a host decision.**

    ``cron/scheduler.py`` delivers a ``max_iterations_reached`` turn that still
    produced a summary rather than failing it, and says why in a comment. A
    teammate that ran out of room and wrote up what it had has partly
    delivered; calling that a failure would retry the one kind of turn
    guaranteed to exhaust the budget again.
    """
    result = crew_verdict.judge(_turn(
        completed=False,
        turn_exit_reason="max_iterations_reached(60/60)",
        final_response="I got through two of the four vendors before running out of room.",
    ))
    assert result.state == crew_verdict.INCOMPLETE
    assert result.reason == "max_iterations"
    assert result.deliverable, "the summary is still worth showing"
    assert not result.retryable, "retrying spends the same budget to reach the same place"


def test_the_step_limit_with_nothing_to_show_is_a_failure():
    """The other half of the same ending. Incomplete earns its leniency from
    the summary; with no summary there is nothing to be lenient about."""
    result = crew_verdict.judge(_turn(
        completed=False,
        turn_exit_reason="max_iterations_reached(60/60)",
        final_response="   ",
    ))
    assert result.state == crew_verdict.FAILED


# ---------------------------------------------------------------------------
# False green 3 — the framework's stand-in text
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("reason", [
    "empty_response_exhausted",
    "all_retries_exhausted_no_response",
    "partial_stream_recovery",
    "budget_exhausted",
])
def test_the_hosts_own_filler_is_not_a_reply(reason):
    """Built by calling the host's formatter, never by copying its words.

    The framework substitutes an explanation when a turn produces no text, so
    the reply is non-empty and every naive check passes. Comparing against the
    formatter's own output is exact *and* self-maintaining: rewrite the copy
    upstream and this test follows it. A regex over "⚠️ No reply" would drift,
    and drift toward calling a dead turn healthy.
    """
    filler = crew_verdict.filler_for(reason)
    assert filler, f"the host no longer explains {reason} — the premise changed"

    result = crew_verdict.judge(_turn(turn_exit_reason=reason, final_response=filler))
    assert result.state == crew_verdict.FAILED
    assert result.reason == "no_reply"


def test_the_empty_completion_placeholder_is_not_a_reply():
    """`(No response generated)` is a literal the framework leaves behind. The
    host strips it before cron delivery; a teammate's thread deserves the
    same."""
    result = crew_verdict.judge(_turn(final_response="(No response generated)"))
    assert result.state == crew_verdict.FAILED


def test_a_fragment_with_the_explainer_appended_is_incomplete_not_healthy():
    """**The host attaches its explainer two different ways, and this is the
    second one.**

    ``agent/turn_finalizer.py`` *replaces* a blank turn with the explanation,
    but *appends* it to a truncated fragment so the reader sees both what
    arrived and why it stopped. Checking only the replace shape lets this
    through as a normal answer — a five-character fragment presented as the
    teammate's reply. It is not nothing either, so it is incomplete rather
    than failed.
    """
    filler = crew_verdict.filler_for("partial_stream_recovery")
    result = crew_verdict.judge(_turn(
        turn_exit_reason="partial_stream_recovery",
        final_response=f"The\n\n{filler}",
    ))
    assert result.state == crew_verdict.INCOMPLETE
    assert result.reason == "truncated"


def test_a_reply_that_merely_quotes_the_explainer_still_counts_as_an_answer():
    """The explainer at the end means the turn was cut off there. The same
    words in the middle of a longer reply are a teammate telling you what it
    saw and what it did next — which is an answer, and a good one."""
    filler = crew_verdict.filler_for("partial_stream_recovery")
    result = crew_verdict.judge(_turn(
        turn_exit_reason="partial_stream_recovery",
        final_response=f"The first attempt came back with — {filler} — so I retried and got the whole page.",
    ))
    assert result.ok


# ---------------------------------------------------------------------------
# False green 4 — "I'll get back to you", from a turn that started nothing
# ---------------------------------------------------------------------------


def test_a_promise_from_a_turn_that_did_nothing_is_a_failure():
    """Nothing is running. There is no background, no job, no handle — the
    turn ended, and the report it promises has nowhere to come from."""
    result = crew_verdict.judge(_turn(
        final_response="Sure — I'll run that in the background and let you know when it's done.",
        messages=[
            {"role": "user", "content": "pull the Q3 numbers"},
            {"role": "assistant", "content": "Sure — I'll run that in the background."},
        ],
    ))
    assert result.state == crew_verdict.FAILED
    assert result.reason == "promised_later"


def test_the_same_promise_is_fine_when_the_turn_actually_did_something():
    """**The structural conjunct, on its own.**

    Identical wording, identical everything — the one difference is a tool
    call, and it flips the verdict. That is what keeps this case from being a
    text matcher wearing a structural hat: a teammate that kicked off a real
    background job called something to do it, and this must not accuse it.
    """
    text = "Sure — I'll run that in the background and let you know when it's done."
    started_nothing = crew_verdict.judge(_turn(final_response=text, messages=[
        {"role": "assistant", "content": text},
    ]))
    started_something = crew_verdict.judge(_turn(final_response=text, messages=[
        {"role": "assistant", "tool_calls": [{"id": "1", "function": {"name": "terminal"}}]},
        {"role": "tool", "tool_call_id": "1", "content": "pid 8123"},
        {"role": "assistant", "content": text},
    ]))
    assert started_nothing.state == crew_verdict.FAILED
    assert started_something.ok


def test_a_long_reply_that_ends_politely_is_not_a_promise():
    """A real answer that signs off with "I'll keep you posted" is an answer.
    The length cap is what stops the wording match from eating it."""
    body = (
        "Here is the full comparison. Vendor A charges per seat and is cheapest "
        "under twenty people; vendor B has a flat tier that wins above that, and "
        "vendor C is only worth it if you need the audit export. I have put the "
        "numbers in the sheet with the sources next to each figure so you can "
        "check them. The one open question is whether the audit export is a "
        "requirement or a preference, which changes the answer entirely. "
        "I'll let you know if their pricing page changes before you decide."
    )
    assert len(body) > crew_verdict._PROMISE_MAX_CHARS
    result = crew_verdict.judge(_turn(final_response=body, messages=[
        {"role": "assistant", "content": body},
    ]))
    assert result.ok


# ---------------------------------------------------------------------------
# Interruption is its own thing
# ---------------------------------------------------------------------------


def test_a_turn_the_operator_stopped_is_not_a_failure():
    """Somebody pressed stop. Recording that as a failure blames the teammate
    for doing what it was told, and — worse — makes it retryable, so the thing
    the operator just stopped starts again."""
    result = crew_verdict.judge(_turn(
        interrupted=True,
        completed=False,
        turn_exit_reason="interrupted_by_user",
        final_response="I had got as far as the second vendor.",
    ))
    assert result.state == crew_verdict.INCOMPLETE
    assert result.reason == "interrupted"
    assert not result.retryable


# ---------------------------------------------------------------------------
# Degrading safely
# ---------------------------------------------------------------------------


def test_a_result_that_is_not_a_dict_is_not_judged():
    """The caller already has a bigger problem than this, and inventing a
    second failure on top of it just doubles the noise."""
    assert crew_verdict.judge(None).ok
    assert crew_verdict.judge("boom").ok


def test_tool_calls_are_counted_from_the_assistants_requests():
    """Requests, not results: a call the guard blocked still means the teammate
    reached for something, which is the question being asked."""
    assert crew_verdict.tool_calls_in([
        {"role": "assistant", "tool_calls": [{"id": "1"}, {"id": "2"}]},
        {"role": "assistant", "content": "done"},
    ]) == 2
    assert crew_verdict.tool_calls_in(None) == 0
    assert crew_verdict.tool_calls_in([{"role": "user", "tool_calls": [{"id": "1"}]}]) == 0


# ---------------------------------------------------------------------------
# Delivering without prose
# ---------------------------------------------------------------------------


def test_a_turn_that_delivered_a_chip_and_said_nothing_is_fine():
    """**The crew-specific half of the empty-reply question.**

    The host treats an empty cron reply as a soft failure, and it is right to:
    a cron job's delivery *is* its text. A teammate's need not be — filing a
    report card, holding an action for approval or sending a screenshot is a
    delivery, and having nothing left to say afterwards is the deliberate
    ending ``_settle_reply`` drops the empty bubble for.
    """
    result = crew_verdict.judge(_turn(final_response=""), spoke_otherwise=True)
    assert result.ok


def test_a_turn_that_delivered_nothing_at_all_is_still_a_failure():
    """The same empty text without a chip behind it. This is the pair that
    stops `spoke_otherwise` from being a blanket excuse."""
    result = crew_verdict.judge(_turn(final_response=""), spoke_otherwise=False)
    assert result.state == crew_verdict.FAILED
    assert result.reason == "empty"


def test_a_chip_does_not_excuse_the_frameworks_filler():
    """A filler body is not silence — the framework only writes one when the
    turn produced nothing, so it is evidence the run died. A chip filed earlier
    in the same turn does not make that untrue."""
    filler = crew_verdict.filler_for("empty_response_exhausted")
    result = crew_verdict.judge(
        _turn(turn_exit_reason="empty_response_exhausted", final_response=filler),
        spoke_otherwise=True,
    )
    assert result.state == crew_verdict.FAILED
