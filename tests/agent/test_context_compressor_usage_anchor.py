"""D5 wiring: the compressor must anchor to provider usage where it is sound."""

from __future__ import annotations

from unittest.mock import patch

import pytest

from agent.context_compressor import ContextCompressor
from agent.token_meter import (
    SOURCE_ANCHORED,
    SOURCE_ENVELOPE_CHANGED,
    SOURCE_HISTORY_REWRITTEN,
    SOURCE_NO_ANCHOR,
    SOURCE_PROVIDER_UNDER_REPORTED,
)


@pytest.fixture
def compressor():
    with patch(
        "agent.context_compressor.get_model_context_length", return_value=100_000
    ):
        return ContextCompressor(
            model="test/model",
            threshold_percent=0.85,
            quiet_mode=True,
        )


def _msgs(n):
    return [{"role": "user", "content": "x" * 400} for _ in range(n)]


def _anchor(compressor, *, count, envelope, heuristic, usage):
    compressor.note_pending_usage_anchor(count, envelope, heuristic)
    compressor.update_from_response(usage)


# ---------------------------------------------------------------------------
# Promotion
# ---------------------------------------------------------------------------


def test_usage_promotes_the_pending_anchor(compressor):
    _anchor(
        compressor,
        count=10,
        envelope="E",
        heuristic=5_000,
        usage={"prompt_tokens": 60_000},
    )
    assert compressor._usage_anchor.prompt_tokens == 60_000
    assert compressor._usage_anchor.message_count == 10
    assert compressor._usage_anchor.heuristic_tokens == 5_000


def test_cached_input_is_added_back_to_the_anchor(compressor):
    """Providers that report prompt_tokens net of cache would otherwise make a
    cached turn look like a sudden collapse in context size."""
    _anchor(
        compressor,
        count=10,
        envelope="E",
        heuristic=5_000,
        usage={"prompt_tokens": 2_000, "cache_read_tokens": 58_000},
    )
    assert compressor._usage_anchor.prompt_tokens == 60_000


def test_usage_without_a_pending_request_sets_no_anchor(compressor):
    compressor.update_from_response({"prompt_tokens": 60_000})
    assert compressor._usage_anchor is None


def test_zero_prompt_tokens_sets_no_anchor(compressor):
    _anchor(
        compressor, count=10, envelope="E", heuristic=5_000, usage={"prompt_tokens": 0}
    )
    assert compressor._usage_anchor is None


def test_a_pending_anchor_is_consumed_not_reused(compressor):
    """A second response must not silently re-anchor to the first request."""
    _anchor(
        compressor,
        count=10,
        envelope="E",
        heuristic=5_000,
        usage={"prompt_tokens": 60_000},
    )
    compressor.update_from_response({"prompt_tokens": 61_000})
    assert compressor._usage_anchor.prompt_tokens == 60_000  # unchanged


def test_garbage_usage_sets_no_anchor(compressor):
    """Scoped to the anchor path deliberately: the surrounding legacy counters
    in update_from_response already assume numeric usage and predate this
    change, so this asserts only that metering adds no new failure mode."""
    compressor.note_pending_usage_anchor(10, "E", 5_000)
    compressor._promote_usage_anchor({"prompt_tokens": "not a number"})
    assert compressor._usage_anchor is None
    assert compressor._pending_usage_anchor is None


def test_garbage_pending_anchor_does_not_raise(compressor):
    compressor.note_pending_usage_anchor("ten", "E", None)
    assert compressor._pending_usage_anchor is None


# ---------------------------------------------------------------------------
# Reading the anchor back
# ---------------------------------------------------------------------------


def test_the_anchored_figure_is_used_when_it_exceeds_the_heuristic(compressor):
    _anchor(
        compressor,
        count=10,
        envelope="E",
        heuristic=5_000,
        usage={"prompt_tokens": 60_000},
    )
    tokens = compressor.anchored_request_tokens(
        _msgs(10), envelope="E", full_estimate=5_000
    )
    assert tokens == 60_000
    assert compressor.last_estimate_source == SOURCE_ANCHORED


def test_new_messages_are_added_on_top_of_the_anchor(compressor):
    _anchor(
        compressor,
        count=10,
        envelope="E",
        heuristic=5_000,
        usage={"prompt_tokens": 60_000},
    )
    tokens = compressor.anchored_request_tokens(
        _msgs(14), envelope="E", full_estimate=5_000
    )
    assert tokens > 60_000


def test_no_anchor_returns_the_heuristic_untouched(compressor):
    assert (
        compressor.anchored_request_tokens(_msgs(10), envelope="E", full_estimate=7_777)
        == 7_777
    )
    assert compressor.last_estimate_source == SOURCE_NO_ANCHOR


def test_a_changed_envelope_returns_the_heuristic(compressor):
    _anchor(
        compressor,
        count=10,
        envelope="OLD",
        heuristic=5_000,
        usage={"prompt_tokens": 60_000},
    )
    assert (
        compressor.anchored_request_tokens(
            _msgs(10), envelope="NEW", full_estimate=7_777
        )
        == 7_777
    )
    assert compressor.last_estimate_source == SOURCE_ENVELOPE_CHANGED


def test_compaction_shortening_history_returns_the_heuristic(compressor):
    _anchor(
        compressor,
        count=40,
        envelope="E",
        heuristic=5_000,
        usage={"prompt_tokens": 60_000},
    )
    assert (
        compressor.anchored_request_tokens(_msgs(5), envelope="E", full_estimate=7_777)
        == 7_777
    )
    assert compressor.last_estimate_source == SOURCE_HISTORY_REWRITTEN


def test_a_provider_number_below_our_estimate_is_rejected(compressor):
    _anchor(
        compressor,
        count=10,
        envelope="E",
        heuristic=90_000,
        usage={"prompt_tokens": 2_000},
    )
    tokens = compressor.anchored_request_tokens(
        _msgs(10), envelope="E", full_estimate=95_000
    )
    assert tokens == 95_000
    assert compressor.last_estimate_source == SOURCE_PROVIDER_UNDER_REPORTED


def test_anchoring_can_only_raise_the_number_never_lower_it(compressor):
    """The safety property: metering may pull a compaction forward, never
    postpone one."""
    _anchor(
        compressor,
        count=10,
        envelope="E",
        heuristic=500,
        usage={"prompt_tokens": 1_000},
    )
    assert (
        compressor.anchored_request_tokens(
            _msgs(10), envelope="E", full_estimate=200_000
        )
        == 200_000
    )


def test_session_reset_clears_the_anchor(compressor):
    _anchor(
        compressor,
        count=10,
        envelope="E",
        heuristic=5_000,
        usage={"prompt_tokens": 60_000},
    )
    compressor.on_session_reset()
    assert compressor._usage_anchor is None
    assert compressor._pending_usage_anchor is None


def test_existing_usage_tracking_still_works(compressor):
    """The anchor rides alongside the legacy counters; it must not disturb them."""
    compressor.update_from_response({
        "prompt_tokens": 1_234,
        "completion_tokens": 56,
        "total_tokens": 1_290,
    })
    assert compressor.last_prompt_tokens == 1_234
    assert compressor.last_completion_tokens == 56
    assert compressor.last_total_tokens == 1_290
    assert compressor.last_real_prompt_tokens == 1_234
