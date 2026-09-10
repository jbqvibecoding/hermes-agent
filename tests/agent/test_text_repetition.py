"""F3: the agent that stops calling tools and just restates its plan.

``agent/tool_guardrails.py`` catches a model calling the same tool with the same
arguments. It has no opinion about prose, so an agent waiting on something that
will never arrive burns its whole budget saying so, and nothing notices.

Advice only. A false positive here is a wasted sentence; a false positive that
halted the run would be a lost task.
"""

from __future__ import annotations

import pytest

from agent.text_repetition import (
    DEFAULT_SIMILARITY_THRESHOLD,
    RepetitionTracker,
    jaccard,
    shingles,
)

SAMPLE = (
    "I am still waiting for the build server to report back on the pipeline "
    "run before I can confirm whether the migration succeeded end to end."
)
NEAR_DUPLICATE = (
    "I am still waiting for the build server to report back about the pipeline "
    "run before I can confirm whether the migration succeeded end to end."
)
DIFFERENT = (
    "The migration finished. Three tables were rewritten and the foreign key on "
    "orders now points at the new customer identifier column as intended."
)


def _tracker(**kw):
    return RepetitionTracker(**{"hint_after": 3, **kw})


# ---------------------------------------------------------------------------
# The measure
# ---------------------------------------------------------------------------


def test_shingles_are_word_bigrams():
    assert shingles("a b c", 2) == {"a b", "b c"}


def test_punctuation_is_normalised_away():
    """'pending.' and 'pending' are the same word."""
    assert shingles("pending. done", 1) == {"pending", "done"}


def test_a_text_shorter_than_the_shingle_falls_back_to_words():
    assert shingles("solo", 2) == {"solo"}


def test_empty_text_has_no_shingles():
    assert shingles("", 2) == set()
    assert shingles("   ", 2) == set()


def test_jaccard_edges():
    assert jaccard(set(), set()) == 1.0
    assert jaccard({"a"}, set()) == 0.0
    assert jaccard({"a"}, {"a"}) == 1.0
    assert jaccard({"a", "b"}, {"b", "c"}) == pytest.approx(1 / 3)


def test_bigrams_tolerate_a_small_wording_edit():
    """The reason for word bigrams over character trigrams: every trigram
    crossing an edit boundary changes, so char-trigrams over-react."""
    score = jaccard(shingles(SAMPLE), shingles(NEAR_DUPLICATE))
    assert score >= DEFAULT_SIMILARITY_THRESHOLD


def test_genuinely_different_text_scores_low():
    score = jaccard(shingles(SAMPLE), shingles(DIFFERENT))
    assert score < 0.2


# ---------------------------------------------------------------------------
# Streak behaviour
# ---------------------------------------------------------------------------


def test_it_stays_quiet_below_the_threshold_of_turns():
    t = _tracker()
    assert t.observe(SAMPLE) is None
    assert t.observe(NEAR_DUPLICATE) is None


def test_it_speaks_up_once_the_streak_is_reached():
    t = _tracker()
    t.observe(SAMPLE)
    t.observe(NEAR_DUPLICATE)
    hint = t.observe(SAMPLE)
    assert hint and "near-duplicates" in hint


def test_the_hint_is_one_shot():
    """Repeating 'you are repeating yourself' every turn is the behaviour
    being complained about."""
    t = _tracker()
    for _ in range(3):
        t.observe(SAMPLE)
    assert t.observe(NEAR_DUPLICATE) is None
    assert t.observe(SAMPLE) is None


def test_a_different_turn_resets_the_streak_to_one_not_zero():
    """The new turn is itself the seed of a possible new run, so the next
    matching turn makes it 2 — not 1."""
    t = _tracker()
    t.observe(SAMPLE)
    t.observe(NEAR_DUPLICATE)
    t.observe(DIFFERENT)
    assert t.streak == 1


def test_it_can_fire_again_after_a_reset():
    t = _tracker()
    for _ in range(3):
        t.observe(SAMPLE)
    t.observe(DIFFERENT)
    t.observe(SAMPLE)
    assert t.observe(NEAR_DUPLICATE) is not None


def test_reset_clears_everything():
    t = _tracker()
    for _ in range(3):
        t.observe(SAMPLE)
    t.reset()
    assert t.streak == 0
    assert t.observe(SAMPLE) is None


def test_a_short_turn_neither_counts_nor_resets():
    """A one-word acknowledgement in the middle of a stuck run must not wipe
    the count that is about to be useful."""
    t = _tracker()
    t.observe(SAMPLE)
    t.observe(NEAR_DUPLICATE)
    assert t.observe("ok") is None
    assert t.streak == 2
    assert t.observe(SAMPLE) is not None


def test_none_and_empty_are_ignored():
    t = _tracker()
    assert t.observe(None) is None
    assert t.observe("") is None
    assert t.streak == 0


def test_the_window_bounds_how_far_back_it_looks():
    """With window_size=1 only the immediately previous turn is compared, so an
    A B A B alternation does not register."""
    t = RepetitionTracker(window_size=1, hint_after=2)
    t.observe(SAMPLE)
    t.observe(DIFFERENT)
    assert t.observe(SAMPLE) is None


def test_a_wider_window_catches_alternation():
    t = RepetitionTracker(window_size=4, hint_after=2)
    t.observe(SAMPLE)
    t.observe(DIFFERENT)
    assert t.observe(NEAR_DUPLICATE) is not None


def test_hint_after_below_two_is_rejected():
    """One turn cannot repeat itself; accepting 1 would fire on every turn."""
    with pytest.raises(ValueError):
        RepetitionTracker(hint_after=1)


# ---------------------------------------------------------------------------
# The hint text
# ---------------------------------------------------------------------------


def test_the_hint_names_the_streak_and_the_threshold():
    """A vague 'you seem stuck' gives the model nothing to reason about."""
    t = _tracker()
    t.observe(SAMPLE)
    t.observe(NEAR_DUPLICATE)
    hint = t.observe(SAMPLE)
    assert "3 turns" in hint
    assert "85%" in hint


def test_the_hint_offers_concrete_alternatives_not_just_a_complaint():
    t = _tracker()
    for _ in range(2):
        t.observe(SAMPLE)
    hint = t.observe(NEAR_DUPLICATE)
    assert "partial result" in hint
    assert "blocking" in hint


def test_chinese_text_gets_a_chinese_hint():
    zh = "我仍在等待构建服务器返回流水线的运行结果，然后才能确认这次数据库迁移是否完整成功。" * 2
    t = _tracker()
    for _ in range(3):
        hint = t.observe(zh)
    assert hint and "词汇重合" in hint


def test_japanese_text_gets_a_japanese_hint():
    ja = "ビルドサーバーからパイプラインの実行結果が返ってくるのをまだ待っています。" * 3
    t = _tracker()
    for _ in range(3):
        hint = t.observe(ja)
    assert hint and "語彙重複" in hint


def test_korean_text_gets_a_korean_hint():
    ko = "빌드 서버가 파이프라인 실행 결과를 보고할 때까지 아직 기다리고 있습니다." * 3
    t = _tracker()
    for _ in range(3):
        hint = t.observe(ko)
    assert hint and "어휘 중복" in hint


def test_english_is_the_fallback():
    t = _tracker()
    for _ in range(3):
        hint = t.observe(SAMPLE)
    assert hint and "near-duplicates" in hint


def test_cjk_text_does_not_crash_the_shingler():
    """The whitespace split degrades to one token per run; it must still work
    rather than raise or return nonsense."""
    zh = "我仍在等待构建服务器返回流水线的运行结果。" * 5
    assert shingles(zh, 2)


# ---------------------------------------------------------------------------
# It never halts
# ---------------------------------------------------------------------------


def test_observe_only_ever_returns_a_string_or_none():
    """There is no stop signal by design — a heuristic over natural language
    should not be able to end a task."""
    t = _tracker()
    for _ in range(10):
        result = t.observe(SAMPLE)
        assert result is None or isinstance(result, str)


def test_the_module_exposes_no_stop_mechanism():
    import agent.text_repetition as mod

    assert not [n for n in dir(mod) if "stop" in n.lower() or "halt" in n.lower()]


# ---------------------------------------------------------------------------
# The loop wiring
# ---------------------------------------------------------------------------


def test_the_guard_observes_stripped_text_not_raw_reasoning():
    """Reasoning is repetitive by nature — a model re-deriving the same plan
    internally each turn is normal. Comparing raw content including think
    blocks would fire on healthy runs."""
    import inspect

    from agent import conversation_loop

    source = inspect.getsource(conversation_loop)
    idx = source.index("_rep.observe(")
    window = source[idx : idx + 200]
    assert "_strip_think_blocks" in window


def test_the_hint_is_stashed_rather_than_injected_inline():
    """A notice can only ride the end of a tool result, and at the point the
    guard runs this turn's results have not been appended yet."""
    import inspect

    from agent import conversation_loop

    source = inspect.getsource(conversation_loop)
    assert "_pending_runtime_notice = _rep_hint" in source
    # ...and drained at the top of the next iteration.
    assert 'agent._pending_runtime_notice = ""' in source


def test_the_hint_uses_the_same_runtime_notice_channel_as_budget_notices():
    """One marker for 'Hermes talking about this run', not two."""
    import inspect

    from agent import conversation_loop

    source = inspect.getsource(conversation_loop)
    idx = source.index("_stashed_notice")
    window = source[idx : idx + 700]
    assert "deliver_notice" in window


def test_the_guard_failing_cannot_break_the_turn():
    import inspect

    from agent import conversation_loop

    source = inspect.getsource(conversation_loop)
    idx = source.index("_rep.observe(")
    window = source[max(0, idx - 400) : idx + 900]
    assert "try:" in window and "except Exception" in window
