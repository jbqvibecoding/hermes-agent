"""Tests for board-level health classification and the run gate (W1)."""

from __future__ import annotations

import pytest

from hermes_cli.board_health import (
    DEFAULT_DONE_STREAK,
    DEFAULT_ERROR_LIMIT,
    BoardSnapshot,
    RunGate,
    classify_board,
    snapshot_from_rows,
)


def _classify(**kw):
    return classify_board(BoardSnapshot(**kw))


# ---------------------------------------------------------------------------
# The five states
# ---------------------------------------------------------------------------


def test_errors_dominate_everything():
    health = _classify(errors=2, task_transitions=5, running_tasks=3)
    assert health.classification == "error"
    assert "2 error(s)" in health.reasons[0]


def test_transitions_mean_productive():
    assert _classify(task_transitions=3).classification == "productive"


def test_running_work_counts_as_productive_even_without_transitions():
    """A slow task spanning ticks is progress, not a stall."""
    assert _classify(running_tasks=1).classification == "productive"


def test_runnable_but_unclaimed_is_backlog_stuck():
    health = _classify(runnable_unclaimed=4)
    assert health.classification == "backlog_stuck"
    assert "no worker" in health.reasons[0]


def test_only_blocked_tasks_is_blocked():
    assert _classify(blocked_tasks=2).classification == "blocked"


def test_nothing_at_all_is_idle():
    health = _classify()
    assert health.classification == "idle"
    assert health.reasons == ["no state changes detected"]


def test_backlog_stuck_outranks_blocked():
    """Work that could run but isn't is the more actionable diagnosis."""
    assert (
        _classify(runnable_unclaimed=1, blocked_tasks=1).classification
        == "backlog_stuck"
    )


def test_every_classification_carries_a_reason():
    for kwargs in (
        {"errors": 1},
        {"task_transitions": 1},
        {"running_tasks": 1},
        {"runnable_unclaimed": 1},
        {"blocked_tasks": 1},
        {},
    ):
        assert _classify(**kwargs).reasons


def test_as_dict_shape():
    payload = _classify(errors=1).as_dict()
    assert payload["classification"] == "error"
    assert isinstance(payload["reasons"], list)


# ---------------------------------------------------------------------------
# all_done
# ---------------------------------------------------------------------------


def test_all_done_requires_at_least_one_task():
    assert not BoardSnapshot().all_done
    assert BoardSnapshot(total_tasks=2, done_tasks=2).all_done
    assert not BoardSnapshot(total_tasks=2, done_tasks=1).all_done


# ---------------------------------------------------------------------------
# Snapshot construction from rows
# ---------------------------------------------------------------------------


def test_snapshot_counts_statuses():
    rows = [
        {"status": "done"},
        {"status": "blocked"},
        {"status": "ready"},
        {"status": "todo"},
        {"status": "running", "claim_lock": "w1", "claim_expires": 999},
    ]
    snap = snapshot_from_rows(rows, now=1)
    assert snap.done_tasks == 1
    assert snap.blocked_tasks == 1
    assert snap.runnable_unclaimed == 2
    assert snap.running_tasks == 1
    assert snap.total_tasks == 5


def test_archived_tasks_are_excluded_entirely():
    snap = snapshot_from_rows([{"status": "archived"}, {"status": "done"}])
    assert snap.total_tasks == 1


def test_running_with_expired_claim_counts_as_unclaimed():
    """An expired claim is precisely the backlog_stuck signal."""
    rows = [{"status": "running", "claim_lock": "dead", "claim_expires": 10}]
    snap = snapshot_from_rows(rows, now=100)
    assert snap.running_tasks == 0
    assert snap.runnable_unclaimed == 1
    assert classify_board(snap).classification == "backlog_stuck"


def test_running_without_a_claim_counts_as_unclaimed():
    snap = snapshot_from_rows([{"status": "running"}], now=100)
    assert snap.runnable_unclaimed == 1


def test_snapshot_accepts_object_rows():
    class Row:
        status = "ready"
        claim_lock = None
        claim_expires = None

    assert snapshot_from_rows([Row()]).runnable_unclaimed == 1


def test_snapshot_of_a_finished_board_is_idle_and_all_done():
    snap = snapshot_from_rows([{"status": "done"}, {"status": "done"}])
    assert classify_board(snap).classification == "idle"
    assert snap.all_done


# ---------------------------------------------------------------------------
# RunGate
# ---------------------------------------------------------------------------


def test_gate_aborts_after_consecutive_errors():
    gate = RunGate(error_limit=3)
    snap = BoardSnapshot(errors=1)
    health = classify_board(snap)
    assert gate.observe(health, snap) is False
    assert gate.observe(health, snap) is False
    assert gate.observe(health, snap) is True
    assert "3 consecutive error" in gate.stop_reason


def test_a_single_good_tick_resets_the_error_streak():
    gate = RunGate(error_limit=3)
    bad, good = BoardSnapshot(errors=1), BoardSnapshot(task_transitions=1)
    gate.observe(classify_board(bad), bad)
    gate.observe(classify_board(bad), bad)
    gate.observe(classify_board(good), good)
    assert gate.error_run == 0
    assert gate.observe(classify_board(bad), bad) is False


def test_gate_finishes_after_consecutive_all_done_ticks():
    gate = RunGate(done_streak=2)
    snap = BoardSnapshot(total_tasks=3, done_tasks=3)
    health = classify_board(snap)
    assert gate.observe(health, snap) is False
    assert gate.observe(health, snap) is True
    assert "all tasks done" in gate.stop_reason


def test_idle_but_not_all_done_never_finishes():
    """An empty board must not be mistaken for a completed one."""
    gate = RunGate(done_streak=1)
    snap = BoardSnapshot()
    for _ in range(10):
        assert gate.observe(classify_board(snap), snap) is False
    assert not gate.should_stop


def test_partial_completion_resets_the_done_streak():
    gate = RunGate(done_streak=2)
    done = BoardSnapshot(total_tasks=2, done_tasks=2)
    partial = BoardSnapshot(total_tasks=2, done_tasks=1, runnable_unclaimed=1)
    gate.observe(classify_board(done), done)
    gate.observe(classify_board(partial), partial)
    assert gate.done_run == 0


def test_gate_stays_stopped_once_stopped():
    gate = RunGate(error_limit=1)
    snap = BoardSnapshot(errors=1)
    assert gate.observe(classify_board(snap), snap) is True
    good = BoardSnapshot(task_transitions=5)
    assert gate.observe(classify_board(good), good) is True
    assert gate.should_stop


@pytest.mark.parametrize("limit_field", ["error_limit", "done_streak"])
def test_zero_threshold_disables_that_terminal_condition(limit_field):
    gate = RunGate(**{limit_field: 0})
    snap = (
        BoardSnapshot(errors=1)
        if limit_field == "error_limit"
        else BoardSnapshot(total_tasks=1, done_tasks=1)
    )
    for _ in range(50):
        gate.observe(classify_board(snap), snap)
    assert not gate.should_stop


def test_defaults_match_upstream():
    gate = RunGate()
    assert gate.error_limit == DEFAULT_ERROR_LIMIT == 20
    assert gate.done_streak == DEFAULT_DONE_STREAK == 5


# ---------------------------------------------------------------------------
# Dispatcher wiring (kanban_db.classify_board_tick + the hook event)
# ---------------------------------------------------------------------------


@pytest.fixture()
def board_conn(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    from hermes_cli import kanban_db

    return kanban_db.connect()


def test_classify_board_tick_reads_the_live_board(board_conn):
    from hermes_cli import kanban_db

    kanban_db.create_task(board_conn, title="waiting")
    health, snapshot = kanban_db.classify_board_tick(board_conn, fire_hook=False)
    assert snapshot.total_tasks == 1
    # A freshly created task is runnable with nobody on it.
    assert health.classification in {"backlog_stuck", "productive"}


def test_classify_board_tick_on_an_empty_board_is_idle(board_conn):
    from hermes_cli import kanban_db

    health, snapshot = kanban_db.classify_board_tick(board_conn, fire_hook=False)
    assert health.classification == "idle"
    assert snapshot.total_tasks == 0


def test_board_tick_hook_is_registered_and_fired(board_conn, monkeypatch):
    from hermes_cli import kanban_db
    from hermes_cli.plugins import VALID_HOOKS

    assert "kanban_board_tick" in VALID_HOOKS

    seen = []
    monkeypatch.setattr(
        "hermes_cli.plugins.invoke_hook",
        lambda name, **kw: seen.append((name, kw)),
    )
    kanban_db.classify_board_tick(board_conn, task_transitions=2)

    assert seen and seen[0][0] == "kanban_board_tick"
    payload = seen[0][1]
    assert payload["classification"] == "productive"
    assert payload["reasons"]
    assert isinstance(payload["snapshot"], dict)
    assert "profile_name" in payload


def test_a_raising_hook_never_disturbs_dispatching(board_conn, monkeypatch):
    from hermes_cli import kanban_db

    def _boom(*_a, **_kw):
        raise RuntimeError("observer exploded")

    monkeypatch.setattr("hermes_cli.plugins.invoke_hook", _boom)
    health, _ = kanban_db.classify_board_tick(board_conn)
    assert health.classification == "idle"
