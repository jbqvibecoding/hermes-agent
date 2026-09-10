"""Notice when the model starts saying the same thing over and over.

Ported from ApodexAI's FrontierAgent (Apache-2.0) —
``frontier_agent/components/observers/text_repetition_guard.py``.

What Hermes had
---------------
``agent/tool_guardrails.py`` is a good guard against a model calling the *same
tool with the same arguments* in a loop. It has no opinion about prose. An agent
that stops calling tools and instead restates its plan every turn — usually
because it is waiting for something that will never arrive — spends the whole
iteration budget and produces nothing, and nothing in the loop notices.

The measure
-----------
Word-level bigram shingles compared by Jaccard similarity. Deliberately not
character trigrams: those over-react to small edits, because every trigram
crossing an edit boundary changes. Bigrams catch "in this exact format" →
"in the format below" as the near-duplicate it is, while a genuinely new
paragraph scores low.

Advice, not enforcement
-----------------------
Firing produces a hint appended to the next tool result; it never stops the run.
That is FrontierAgent's own discipline and it is the right default here: this is
a heuristic over natural language, a false positive is cheap as a nudge and
expensive as a halt, and a legitimately repetitive turn (polling, retrying a
flaky check) is a real thing an agent does.

Purity
------
No agent, loop or transport imports. The tracker is a small object the caller
feeds one string per turn.
"""

from __future__ import annotations

import re
from collections import deque
from typing import Deque, Optional, Set

__all__ = [
    "DEFAULT_SIMILARITY_THRESHOLD",
    "RepetitionTracker",
    "jaccard",
    "shingles",
]

_WHITESPACE_RE = re.compile(r"\s+")
# ASCII punctuation, so "pending." and "pending" become the same token.
_PUNCT_RE = re.compile(r"[!-/:-@\[-`{-~]+")

DEFAULT_SIMILARITY_THRESHOLD = 0.85

# Script ranges, checked in this order. Enough to pick a hint template; this is
# deliberately NOT a general language detector — FrontierAgent ships 242 lines
# for that and none of the rest of it would be used here.
_HAN_RE = re.compile(r"[一-鿿]")
_KANA_RE = re.compile(r"[぀-ヿ]")
_HANGUL_RE = re.compile(r"[가-힯]")

_HINT_EN = (
    "Your last several replies are near-duplicates of earlier ones "
    "({thr:.0%}+ word overlap, {n} turns running). That usually means you are "
    "waiting on something that is not going to arrive. Move forward with what "
    "you already have: write up the partial result, try a different approach, "
    "or say plainly what is blocking you."
)
_HINT_ZH = (
    "你最近几次回复与前面高度雷同（连续 {n} 轮 ≥ {thr:.0%} 词汇重合）。"
    "这通常意味着你在等一个不会到来的东西。请用现有信息往前走："
    "把已有的部分结论写出来、换一个做法、或者直接说清楚卡在哪里。"
)
_HINT_JA = (
    "直近の応答が前のターンとほぼ重複しています（{n} 回連続で ≥ {thr:.0%} の語彙重複）。"
    "届かない入力を待ち続けている可能性があります。今ある情報で進めてください："
    "部分的な結果をまとめる、別の方法を試す、または何が妨げになっているかを明示する。"
)
_HINT_KO = (
    "최근 응답이 이전 턴과 거의 동일합니다({n}회 연속 ≥ {thr:.0%} 어휘 중복). "
    "도착하지 않을 입력을 기다리고 있을 수 있습니다. 지금 가진 정보로 진행하세요: "
    "부분 결과를 정리하거나, 다른 방법을 시도하거나, 무엇이 막고 있는지 밝히세요."
)


def _normalise(text: str) -> str:
    return _WHITESPACE_RE.sub(" ", (text or "").strip().lower())


def shingles(text: str, n: int = 2) -> Set[str]:
    """Word-level n-grams of ``text``.

    For CJK the whitespace split degrades to roughly one token per run of
    characters. That is weaker but still workable: the texts this compares are
    long enough that punctuation-separated chunks differ between genuinely
    different turns.
    """
    tokens = _PUNCT_RE.sub(" ", text or "").split()
    if not tokens:
        return set()
    if n <= 1 or len(tokens) < n:
        return set(tokens)
    return {" ".join(tokens[i : i + n]) for i in range(len(tokens) - n + 1)}


def jaccard(a: Set[str], b: Set[str]) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    intersection = len(a & b)
    union = len(a) + len(b) - intersection
    return intersection / union if union else 0.0


def _hint_for(text: str, *, threshold: float, streak: int) -> str:
    sample = text or ""
    # Kana and Hangul before Han, and the order is load-bearing: Japanese prose
    # is full of kanji, so a Han-first check labels every Japanese turn Chinese.
    # The reverse never happens — Chinese contains no kana.
    if _KANA_RE.search(sample):
        template = _HINT_JA
    elif _HANGUL_RE.search(sample):
        template = _HINT_KO
    elif _HAN_RE.search(sample):
        template = _HINT_ZH
    else:
        template = _HINT_EN
    return template.format(thr=threshold, n=streak)


class RepetitionTracker:
    """Feed it one assistant text per turn; it tells you when to say something.

    ``observe`` returns the hint to inject, or ``None``. The hint is one-shot
    per run of duplicates: repeating "you are repeating yourself" every turn is
    itself the behaviour being complained about.
    """

    def __init__(
        self,
        *,
        window_size: int = 4,
        similarity_threshold: float = DEFAULT_SIMILARITY_THRESHOLD,
        min_chars: int = 60,
        shingle_size: int = 2,
        hint_after: int = 4,
    ) -> None:
        if hint_after < 2:
            raise ValueError("hint_after must be >= 2 (one turn cannot repeat itself)")
        self.window_size = max(1, int(window_size))
        self.similarity_threshold = float(similarity_threshold)
        self.min_chars = max(0, int(min_chars))
        self.shingle_size = max(1, int(shingle_size))
        self.hint_after = int(hint_after)

        self._history: Deque[Set[str]] = deque(maxlen=self.window_size)
        self._streak = 0
        self._hinted = False

    def reset(self) -> None:
        self._history.clear()
        self._streak = 0
        self._hinted = False

    @property
    def streak(self) -> int:
        return self._streak

    def observe(self, text: Optional[str]) -> Optional[str]:
        """Record one turn's visible text. Returns a hint when one is due."""
        normalised = _normalise(text or "")
        if len(normalised) < self.min_chars:
            # Too short to carry meaningful repetition. Deliberately does not
            # touch the window or the streak: a one-word acknowledgement in the
            # middle of a stuck run should not reset the count.
            return None

        current = shingles(normalised, self.shingle_size)
        matched = any(
            jaccard(current, prior) >= self.similarity_threshold
            for prior in self._history
        )
        self._history.append(current)

        if not matched:
            # 1, not 0: this turn is itself the seed of a possible new run, so
            # the next matching turn makes the streak 2.
            self._streak = 1
            self._hinted = False
            return None

        self._streak += 1
        if self._streak >= self.hint_after and not self._hinted:
            self._hinted = True
            return _hint_for(
                text or "", threshold=self.similarity_threshold, streak=self._streak
            )
        return None
