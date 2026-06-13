from __future__ import annotations

from tools import autoresearch as ar


# ---- mulberry32 -----------------------------------------------------------

def test_mulberry32_is_deterministic():
    a = ar.mulberry32(42)
    b = ar.mulberry32(42)
    assert [a() for _ in range(5)] == [b() for _ in range(5)]


def test_mulberry32_in_unit_range():
    rng = ar.mulberry32(7)
    for _ in range(100):
        v = rng()
        assert 0.0 <= v < 1.0


def test_mulberry32_different_seeds_differ():
    assert ar.mulberry32(1)() != ar.mulberry32(2)()


# ---- attain_of ------------------------------------------------------------

def test_attain_of_higher_is_better():
    m = ar.Metric("speed", direction="higher", lo=0, hi=10)
    assert ar.attain_of(0, m) == 0.0
    assert ar.attain_of(10, m) == 1.0
    assert ar.attain_of(5, m) == 0.5


def test_attain_of_lower_is_better_inverts():
    m = ar.Metric("cost", direction="lower", lo=0, hi=10)
    assert ar.attain_of(0, m) == 1.0
    assert ar.attain_of(10, m) == 0.0


def test_attain_of_clamps_out_of_range():
    m = ar.Metric("x", lo=0, hi=10)
    assert ar.attain_of(-5, m) == 0.0
    assert ar.attain_of(99, m) == 1.0


def test_attain_of_degenerate_range_full():
    m = ar.Metric("x", lo=5, hi=5)
    assert ar.attain_of(5, m) == 1.0


# ---- value_of / composite -------------------------------------------------

def test_value_of_weighted_mean():
    metrics = [
        ar.Metric("a", weight=1.0, lo=0, hi=1),
        ar.Metric("b", weight=3.0, lo=0, hi=1),
    ]
    # a attains 1.0, b attains 0.0 → (1*1 + 3*0)/4 = 0.25
    assert ar.value_of({"a": 1.0, "b": 0.0}, metrics) == 0.25


def test_composite_segment_weighted():
    metrics = [ar.Metric("a", lo=0, hi=1)]
    segments = [ar.Segment("s1", weight=1.0), ar.Segment("s2", weight=1.0)]
    scores = {"s1": {"a": 1.0}, "s2": {"a": 0.0}}
    assert ar.composite(scores, metrics, segments) == 0.5


# ---- keep_only_improvements -----------------------------------------------

def _metrics_segments():
    return [ar.Metric("q", lo=0, hi=1)], [ar.Segment("all")]


def test_keep_only_improvements_picks_best_with_custom_evaluator():
    metrics, segments = _metrics_segments()
    scores = {"c1": 0.2, "c2": 0.8, "c3": 0.5}

    def evaluator(cid, _m, _s):
        return {"all": {"q": scores[cid]}}

    cands = [ar.Candidate(c) for c in ("c1", "c2", "c3")]
    res = ar.keep_only_improvements(cands, metrics, segments, evaluator=evaluator)
    assert res.winner_id == "c2"
    assert abs(res.winner_score - 0.8) < 1e-9
    # kept trajectory only grows on improvement: c1 (0.2) then c2 (0.8); c3 (0.5) skipped
    assert [k.candidate_id for k in res.kept] == ["c1", "c2"]
    assert len(res.evaluated) == 3


def test_keep_only_improvements_seeded_is_reproducible():
    metrics, segments = _metrics_segments()
    cands = [ar.Candidate(f"cand-{i}") for i in range(6)]
    r1 = ar.keep_only_improvements(cands, metrics, segments, seed=123)
    r2 = ar.keep_only_improvements(cands, metrics, segments, seed=123)
    assert r1.winner_id == r2.winner_id
    assert [c.composite for c in r1.evaluated] == [c.composite for c in r2.evaluated]


def test_keep_only_improvements_empty_candidates():
    metrics, segments = _metrics_segments()
    res = ar.keep_only_improvements([], metrics, segments)
    assert res.winner_id is None
    assert res.winner_score == 0.0
    assert res.kept == []
