from __future__ import annotations

from tools import merlion_plan as mp


# ---- derivations ----------------------------------------------------------

def test_sim_duration_formula():
    assert mp.sim_duration_ms(0) == 3200
    assert mp.sim_duration_ms(1) == 5600
    assert mp.sim_duration_ms(3) == 10400


def test_artifact_count_formula():
    assert mp.artifact_count(0) == 2
    assert mp.artifact_count(2) == 5  # 2 + round(3.0)
    assert mp.artifact_count(3) == 6  # 2 + round(4.5) = 2 + 4 (banker's rounding)


def test_negative_est_clamped():
    assert mp.sim_duration_ms(-5) == 3200
    assert mp.artifact_count(-5) == 2


# ---- Subtask --------------------------------------------------------------

def test_subtask_derives_dur_and_arts():
    st = mp.Subtask(id="s1", title="Research", est=2)
    assert st.dur == mp.sim_duration_ms(2)
    assert st.arts == mp.artifact_count(2)


def test_subtask_respects_pinned_values():
    st = mp.Subtask(id="s1", title="X", est=2, dur=999, arts=7)
    assert st.dur == 999
    assert st.arts == 7


def test_build_subtask_floors_est_and_copies_lists():
    subs = ["a", "b"]
    deps = ["s0"]
    st = mp.build_subtask("s1", "Plan", est=0, subs=subs, deps=deps, dept="eng")
    assert st.est == 1
    assert st.dept == "eng"
    assert st.subs == subs and st.subs is not subs  # copied
    assert st.deps == deps and st.deps is not deps


def test_build_subtask_synthesis_flag():
    st = mp.build_subtask("syn", "Synthesize", is_synthesis=True)
    assert st.is_synthesis is True
