"""Tests for hybrid token metering (D5)."""

from __future__ import annotations

import pytest

from agent.token_meter import (
    SOURCE_ANCHORED,
    SOURCE_ENVELOPE_CHANGED,
    SOURCE_HEURISTIC,
    SOURCE_HISTORY_REWRITTEN,
    SOURCE_NO_ANCHOR,
    SOURCE_PROVIDER_UNDER_REPORTED,
    UsageAnchor,
    envelope_key,
    estimate_with_anchor,
)


def _msgs(n, size=40):
    return [{"role": "user", "content": "x" * size} for _ in range(n)]


def _estimator(messages):
    """Stand-in for estimate_messages_tokens_rough: chars/4."""
    return sum(len(str(m)) for m in messages) // 4


# ---------------------------------------------------------------------------
# envelope_key
# ---------------------------------------------------------------------------


def test_same_envelope_gives_the_same_key():
    a = envelope_key("sys", [{"name": "t"}], "m")
    b = envelope_key("sys", [{"name": "t"}], "m")
    assert a == b


@pytest.mark.parametrize(
    "kwargs",
    [
        {"system_prompt": "other"},
        {"tools": [{"name": "different"}]},
        {"model": "other-model"},
    ],
)
def test_any_envelope_change_changes_the_key(kwargs):
    base = dict(system_prompt="sys", tools=[{"name": "t"}], model="m")
    assert envelope_key(**base) != envelope_key(**{**base, **kwargs})


def test_empty_envelope_is_still_a_key():
    assert envelope_key()


def test_unstringifiable_tools_do_not_raise():
    class Hostile:
        def __repr__(self):
            raise RuntimeError("no")

    assert envelope_key("sys", [Hostile()], "m")


# ---------------------------------------------------------------------------
# The anchor is used when it is safe
# ---------------------------------------------------------------------------


def test_anchor_covers_the_prefix_and_the_heuristic_covers_the_tail():
    messages = _msgs(12)
    anchor = UsageAnchor(
        prompt_tokens=50_000, message_count=10, envelope="E", heuristic_tokens=1_000
    )
    tokens, source = estimate_with_anchor(
        messages,
        anchor=anchor,
        envelope="E",
        estimate_messages=_estimator,
        full_estimate=1_200,
    )
    assert source == SOURCE_ANCHORED
    # 50k for the anchored prefix, plus only the two new messages.
    assert tokens == 50_000 + _estimator(messages[10:])
    assert tokens > 50_000


def test_the_anchored_figure_beats_a_heuristic_that_undercounts_long_history():
    """The whole point: a chars/4 walk of a long history drifts low."""
    messages = _msgs(200)
    anchor = UsageAnchor(
        prompt_tokens=180_000, message_count=200, envelope="E", heuristic_tokens=3_000
    )
    tokens, source = estimate_with_anchor(
        messages,
        anchor=anchor,
        envelope="E",
        estimate_messages=_estimator,
        full_estimate=3_000,
    )
    assert source == SOURCE_ANCHORED
    assert tokens == 180_000


def test_no_new_messages_since_the_anchor_returns_the_anchor():
    messages = _msgs(10)
    anchor = UsageAnchor(50_000, 10, "E", 1_000)
    tokens, source = estimate_with_anchor(
        messages,
        anchor=anchor,
        envelope="E",
        estimate_messages=_estimator,
        full_estimate=900,
    )
    assert (tokens, source) == (50_000, SOURCE_ANCHORED)


# ---------------------------------------------------------------------------
# The anchor is refused when it is not safe
# ---------------------------------------------------------------------------


def test_no_anchor_falls_back_to_the_caller_heuristic():
    tokens, source = estimate_with_anchor(
        _msgs(5),
        anchor=None,
        envelope="E",
        estimate_messages=_estimator,
        full_estimate=777,
    )
    assert (tokens, source) == (777, SOURCE_NO_ANCHOR)


@pytest.mark.parametrize(
    "anchor",
    [
        UsageAnchor(0, 10, "E", 1),  # provider reported nothing
        UsageAnchor(50_000, 0, "E", 1),  # no messages recorded
        UsageAnchor(50_000, 10, "", 1),  # no envelope recorded
    ],
)
def test_an_incomplete_anchor_is_not_used(anchor):
    tokens, source = estimate_with_anchor(
        _msgs(20),
        anchor=anchor,
        envelope="E",
        estimate_messages=_estimator,
        full_estimate=777,
    )
    assert (tokens, source) == (777, SOURCE_NO_ANCHOR)


def test_a_changed_envelope_invalidates_the_anchor():
    """New system prompt or toolset — the anchored count describes a payload
    we are no longer sending."""
    tokens, source = estimate_with_anchor(
        _msgs(20),
        anchor=UsageAnchor(50_000, 10, "OLD", 1_000),
        envelope="NEW",
        estimate_messages=_estimator,
        full_estimate=777,
    )
    assert (tokens, source) == (777, SOURCE_ENVELOPE_CHANGED)


def test_a_shortened_history_invalidates_the_anchor():
    """Compaction rewrote history; the anchored prefix no longer exists."""
    tokens, source = estimate_with_anchor(
        _msgs(4),
        anchor=UsageAnchor(50_000, 10, "E", 1_000),
        envelope="E",
        estimate_messages=_estimator,
        full_estimate=777,
    )
    assert (tokens, source) == (777, SOURCE_HISTORY_REWRITTEN)


def test_a_provider_count_below_our_own_estimate_is_discarded():
    """Prompt caching makes some providers report input net of cache. That
    number is not what has to fit in the window, so it must not suppress
    compaction."""
    tokens, source = estimate_with_anchor(
        _msgs(20),
        anchor=UsageAnchor(
            prompt_tokens=2_000, message_count=10, envelope="E", heuristic_tokens=90_000
        ),
        envelope="E",
        estimate_messages=_estimator,
        full_estimate=95_000,
    )
    assert source == SOURCE_PROVIDER_UNDER_REPORTED
    assert tokens == 95_000


def test_a_broken_estimator_falls_back_rather_than_raising():
    def boom(_messages):
        raise ValueError("nope")

    tokens, source = estimate_with_anchor(
        _msgs(20),
        anchor=UsageAnchor(50_000, 10, "E", 1_000),
        envelope="E",
        estimate_messages=boom,
        full_estimate=777,
    )
    assert (tokens, source) == (777, SOURCE_NO_ANCHOR)


# ---------------------------------------------------------------------------
# Conservative-max: never argue the request down
# ---------------------------------------------------------------------------


def test_the_result_is_never_below_the_callers_own_heuristic():
    """Anchoring exists to catch history the heuristic undercounts. It must
    not become a way to talk a large request into looking small."""
    tokens, source = estimate_with_anchor(
        _msgs(20),
        anchor=UsageAnchor(1_000, 10, "E", 500),
        envelope="E",
        estimate_messages=_estimator,
        full_estimate=80_000,
    )
    assert tokens == 80_000
    assert source == SOURCE_HEURISTIC


@pytest.mark.parametrize("full_estimate", [0, 1, 500, 50_000, 500_000])
def test_never_returns_less_than_the_full_estimate(full_estimate):
    tokens, _source = estimate_with_anchor(
        _msgs(20),
        anchor=UsageAnchor(40_000, 10, "E", 1_000),
        envelope="E",
        estimate_messages=_estimator,
        full_estimate=full_estimate,
    )
    assert tokens >= full_estimate


def test_a_negative_delta_cannot_shrink_the_anchor():
    tokens, _source = estimate_with_anchor(
        _msgs(20),
        anchor=UsageAnchor(40_000, 10, "E", 1_000),
        envelope="E",
        estimate_messages=lambda _m: -5_000,
        full_estimate=0,
    )
    assert tokens == 40_000
