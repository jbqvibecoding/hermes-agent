"""D3: a spilled tool result must fit its budget and keep its tail.

Hermes already had a general tool-result spill (``maybe_persist_tool_result``
plus the aggregate ``enforce_turn_budget``), so this is not a new mechanism.
What was missing were two properties borrowed from DeepSeek Harness's
``TextRetainer``: charge the notice to the budget before splitting what is
left, and never return something longer than what you replaced.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from tools.budget_config import BudgetConfig
from tools.tool_result_storage import (
    PERSISTED_OUTPUT_TAG,
    _NOTICE_ALLOWANCE_CHARS,
    _split_preview_budget,
    build_bounded_replacement,
    enforce_turn_budget,
    maybe_persist_tool_result,
)


def _env():
    env = MagicMock()
    env.execute.return_value = {"output": "", "returncode": 0}
    return env


# ---------------------------------------------------------------------------
# The replacement fits the budget
# ---------------------------------------------------------------------------


def test_replacement_stays_within_budget_including_the_notice():
    content = "line\n" * 20_000
    budget = 2_000
    out = build_bounded_replacement(content, len(content), "/tmp/x.txt", budget)
    assert len(out) <= budget


@pytest.mark.parametrize("budget", [600, 1_000, 2_000, 8_000])
def test_budget_is_respected_across_sizes(budget):
    content = "z" * 500_000
    out = build_bounded_replacement(content, len(content), "/tmp/x.txt", budget)
    assert len(out) <= budget


def test_the_saved_path_survives_even_an_absurdly_small_budget():
    """A pointer to the full output is the one thing that must not be dropped."""
    content = "q" * 100_000
    out = build_bounded_replacement(content, len(content), "/tmp/keep.txt", 10)
    assert "/tmp/keep.txt" in out


# ---------------------------------------------------------------------------
# Never grow what you were asked to shrink
# ---------------------------------------------------------------------------


def test_short_content_is_returned_unchanged_rather_than_inflated():
    content = "even short content"
    out = build_bounded_replacement(content, len(content), "/tmp/x.txt", 2_000)
    assert out == content


def test_persisting_never_returns_more_than_it_was_given():
    env = _env()
    for size in (1, 50, 200, 400, 800, 2_000, 50_000):
        content = "a" * size
        out = maybe_persist_tool_result(
            content, "terminal", f"tc_{size}", env=env, threshold=0
        )
        assert len(out) <= len(content), f"grew at size {size}"


def test_turn_budget_enforcement_shrinks_the_turn():
    """The regression: enforcement used to push an over-budget turn further over.

    Two 300-char results under a 100-char budget came back as 772 chars total.
    """
    msgs = [
        {"content": "y" * 300, "tool_call_id": "a"},
        {"content": "z" * 300, "tool_call_id": "b"},
    ]
    before = sum(len(m["content"]) for m in msgs)
    enforce_turn_budget(msgs, env=None, config=BudgetConfig(turn_budget=100))
    after = sum(len(m["content"]) for m in msgs)
    assert after <= before


def test_turn_budget_enforcement_actually_reduces_large_results():
    msgs = [
        {"content": "y" * 200_000, "tool_call_id": "a"},
        {"content": "z" * 200_000, "tool_call_id": "b"},
    ]
    enforce_turn_budget(msgs, env=_env(), config=BudgetConfig(turn_budget=50_000))
    after = sum(len(m["content"]) for m in msgs)
    assert after <= 50_000


# ---------------------------------------------------------------------------
# The tail survives
# ---------------------------------------------------------------------------


def test_the_end_of_a_long_log_is_kept():
    """On a build log the failure is at the end; a head-only preview loses it."""
    content = "\n".join(f"step {i} ok" for i in range(20_000))
    content += "\nFATAL: the build failed on the last line"
    out = build_bounded_replacement(content, len(content), "/tmp/log.txt", 3_000)
    assert "FATAL: the build failed on the last line" in out
    assert "step 0 ok" in out  # and the head is still there


def test_persisted_tool_result_keeps_both_ends():
    env = _env()
    content = "HEAD_MARKER\n" + ("x" * 80_000) + "\nTAIL_MARKER"
    out = maybe_persist_tool_result(
        content, "terminal", "tc_ends", env=env, threshold=1_000
    )
    assert PERSISTED_OUTPUT_TAG in out
    assert "HEAD_MARKER" in out
    assert "TAIL_MARKER" in out


def test_head_and_tail_share_one_budget_rather_than_each_taking_it():
    content = "m" * 100_000
    head, has_more, tail = _split_preview_budget(content, 1_000)
    assert has_more
    assert len(head) + len(tail) <= 1_000


def test_a_budget_too_small_to_split_yields_head_only():
    content = "m" * 100_000
    head, has_more, tail = _split_preview_budget(content, 120)
    assert tail == ""
    assert head


def test_content_that_fits_is_not_split():
    head, has_more, tail = _split_preview_budget("short", 1_000)
    assert (head, has_more, tail) == ("short", False, "")


def test_zero_budget_yields_nothing():
    assert _split_preview_budget("anything", 0) == ("", False, "")


def test_tail_starts_at_a_line_boundary_when_one_is_close():
    content = "".join(f"line {i}\n" for i in range(50_000))
    _head, _has_more, tail = _split_preview_budget(content, 2_000)
    assert tail.startswith("line ")


# ---------------------------------------------------------------------------
# Failure to save must not cost the caller its output
# ---------------------------------------------------------------------------


def test_without_a_sandbox_the_excerpt_still_comes_back_bounded():
    content = "b" * 100_000
    out = maybe_persist_tool_result(
        content, "terminal", "tc_nofs", env=None, threshold=10
    )
    assert len(out) < len(content)
    assert "could not be saved" in out
    assert "b" in out  # the caller still gets to see some of its output


def test_a_sandbox_write_failure_does_not_produce_an_error_result():
    env = MagicMock()
    env.execute.side_effect = OSError("disk full")
    content = "c" * 100_000
    out = maybe_persist_tool_result(
        content, "terminal", "tc_fail", env=env, threshold=10
    )
    assert "c" in out
    assert len(out) < len(content)


# ---------------------------------------------------------------------------
# read_file is still excluded from the loop
# ---------------------------------------------------------------------------


def test_read_file_is_never_spilled():
    """Spilling a read would send the model straight back to read the spill."""
    from tools.budget_config import PINNED_THRESHOLDS

    assert PINNED_THRESHOLDS["read_file"] == float("inf")
    content = "d" * 500_000
    assert (
        maybe_persist_tool_result(content, "read_file", "tc_read", env=_env())
        == content
    )


def test_notice_allowance_is_accounted_for_in_the_effective_budget():
    cfg = BudgetConfig(preview_size=1_000)
    env = _env()
    out = maybe_persist_tool_result(
        "e" * 200_000, "terminal", "tc_alw", env=env, config=cfg, threshold=10
    )
    assert len(out) <= cfg.preview_size + _NOTICE_ALLOWANCE_CHARS
