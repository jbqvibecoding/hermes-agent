"""F5: say it at startup, not as a provider rejection twenty turns in.

The check that matters is the one Hermes' own arithmetic hides. In
``ContextCompressor._compute_threshold_tokens``::

    effective_window = context_length - (max_tokens or 0)
    if effective_window <= 0:
        effective_window = context_length

That fallback is right for the compressor and wrong for the user: it means a
``max_tokens`` at or above the whole window produces no error anywhere, and
every request then reserves more output room than the window holds.
"""

from __future__ import annotations

import logging

from agent.budget_consistency import check_token_budget


# ---------------------------------------------------------------------------
# The case Hermes currently swallows
# ---------------------------------------------------------------------------


def test_max_tokens_at_or_above_the_window_is_reported():
    problems = check_token_budget(context_length=64_000, max_tokens=64_000)
    assert len(problems) == 1
    assert "not below the context window" in problems[0]


def test_max_tokens_above_the_window_is_reported():
    problems = check_token_budget(context_length=64_000, max_tokens=100_000)
    assert problems and "64,000" in problems[0]


def test_the_warning_names_the_knob_to_turn():
    """A diagnostic nobody can act on is noise."""
    (problem,) = check_token_budget(context_length=64_000, max_tokens=80_000)
    assert "model.max_tokens" in problem
    assert "model.context_length" in problem


# ---------------------------------------------------------------------------
# The lesser case: legal, but the input budget is the smaller half
# ---------------------------------------------------------------------------


def test_reserving_more_than_half_the_window_warns_without_being_fatal():
    (problem,) = check_token_budget(context_length=200_000, max_tokens=120_000)
    assert "more than half" in problem
    assert "80,000 tokens for input" in problem


def test_exactly_half_still_warns():
    """At 2x == window the input budget equals the reservation; that is already
    surprising enough to say out loud."""
    problems = check_token_budget(context_length=200_000, max_tokens=100_000)
    assert problems and "more than half" in problems[0]


def test_the_two_warnings_are_mutually_exclusive():
    """Over-window is the stronger statement; emitting both would be noise."""
    problems = check_token_budget(context_length=64_000, max_tokens=90_000)
    assert len(problems) == 1
    assert "more than half" not in problems[0]


# ---------------------------------------------------------------------------
# A sane configuration must stay silent
# ---------------------------------------------------------------------------


def test_a_normal_configuration_produces_nothing():
    assert check_token_budget(context_length=200_000, max_tokens=8_192) == []


def test_provider_default_max_tokens_is_not_an_inconsistency():
    """``None`` means the provider decides. We cannot reason about it, so we
    say nothing rather than guessing."""
    assert check_token_budget(context_length=64_000, max_tokens=None) == []


def test_unknown_context_length_checks_nothing():
    assert check_token_budget(context_length=0, max_tokens=8_192) == []


def test_non_positive_max_tokens_checks_nothing():
    assert check_token_budget(context_length=200_000, max_tokens=0) == []
    assert check_token_budget(context_length=200_000, max_tokens=-1) == []


# ---------------------------------------------------------------------------
# Never raise — this is a diagnostic, not a gate
# ---------------------------------------------------------------------------


def test_garbage_inputs_return_empty_rather_than_raising():
    """Called during agent init; a TypeError here would break startup for a
    configuration that is merely odd."""
    assert check_token_budget(context_length="wat", max_tokens=8_192) == []  # type: ignore[arg-type]
    assert check_token_budget(context_length=200_000, max_tokens="lots") == []  # type: ignore[arg-type]
    assert check_token_budget(context_length=None, max_tokens=None) == []  # type: ignore[arg-type]


def test_a_bad_threshold_does_not_break_the_real_checks():
    problems = check_token_budget(
        context_length=64_000, max_tokens=90_000, threshold_tokens="nope"  # type: ignore[arg-type]
    )
    assert problems and "not below the context window" in problems[0]


# ---------------------------------------------------------------------------
# The margin line is informational only
# ---------------------------------------------------------------------------


def test_the_margin_is_logged_but_is_not_a_warning():
    """Whether a turn actually crosses the margin is dynamic. Making it a
    threshold would produce a warning nobody can act on."""
    problems = check_token_budget(
        context_length=200_000, max_tokens=8_192, threshold_tokens=100_000
    )
    assert problems == []


def test_the_margin_line_reaches_the_log(caplog):
    with caplog.at_level(logging.INFO, logger="agent.budget_consistency"):
        check_token_budget(
            context_length=200_000,
            max_tokens=8_192,
            threshold_tokens=100_000,
            label="model gpt-fake",
        )
    messages = [r.getMessage() for r in caplog.records]
    assert any("compaction trigger" in m for m in messages)
    # The percentage is the point of the line — it is what says whether one
    # reply can cross the margin in a single turn.
    assert any("% of that margin" in m for m in messages)


def test_a_threshold_at_or_past_the_window_logs_nothing(caplog):
    """margin <= 0 would divide by zero. It also means the trigger can never
    fire, which _compute_threshold_tokens already handles."""
    with caplog.at_level(logging.INFO, logger="agent.budget_consistency"):
        check_token_budget(
            context_length=200_000, max_tokens=8_192, threshold_tokens=200_000
        )
    assert not [r for r in caplog.records if "compaction trigger" in str(r.msg)]


def test_warnings_reach_the_log_too(caplog):
    with caplog.at_level(logging.WARNING, logger="agent.budget_consistency"):
        check_token_budget(context_length=64_000, max_tokens=90_000)
    assert caplog.records and caplog.records[0].levelno == logging.WARNING


def test_the_label_identifies_which_model(caplog):
    (problem,) = check_token_budget(
        context_length=64_000, max_tokens=90_000, label="model qwen-local"
    )
    assert problem.startswith("model qwen-local:")
