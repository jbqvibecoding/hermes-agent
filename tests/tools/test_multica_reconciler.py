from __future__ import annotations

from tools.multica_poller import BoardState
from tools.multica_reconciler import reconcile


def _board(parent=None, **subs):
    # subs: sid="status" or sid=("status","assignee_id")
    per = {}
    for sid, v in subs.items():
        if isinstance(v, tuple):
            per[sid] = {"status": v[0], "assignee_id": v[1]}
        else:
            per[sid] = {"status": v, "assignee_id": None}
    return BoardState(parent_status=parent, per_subtask=per)


PLAN_SPECS = {"st0": "spec-eng-lead-v1", "st1": "spec-finance-lead-v1"}


def test_empty_when_nothing_diverges():
    sig = reconcile(_board(parent="in_progress", st0="in_progress", st1="todo"),
                    plan_specs=PLAN_SPECS, approval_subtasks=set())
    assert sig.is_empty()


def test_parent_cancelled_cancels_run():
    sig = reconcile(_board(parent="cancelled", st0="in_progress"),
                    plan_specs=PLAN_SPECS, approval_subtasks=set())
    assert sig.cancel_run is True


def test_child_cancelled_cancels_subtask():
    sig = reconcile(_board(parent="in_progress", st0="cancelled", st1="todo"),
                    plan_specs=PLAN_SPECS, approval_subtasks=set())
    assert sig.cancel_subtasks == {"st0"}
    assert sig.cancel_run is False


def test_approval_when_moved_out_of_blocked():
    # st0 is approval-gated; still blocked → no approval. st1 approval-gated and
    # moved to todo → approved.
    sig = reconcile(_board(parent="in_progress", st0="blocked", st1="todo"),
                    plan_specs=PLAN_SPECS, approval_subtasks={"st0", "st1"})
    assert sig.approve_subtasks == {"st1"}


def test_reassign_maps_new_agent_to_spec():
    board = _board(parent="in_progress", st0=("todo", "agent-finance-uuid"))
    agent_to_spec = {"agent-finance-uuid": "spec-finance-lead-v1"}
    sig = reconcile(board, plan_specs=PLAN_SPECS, approval_subtasks=set(),
                    agent_to_spec=agent_to_spec)
    # st0 was eng, reassigned to finance agent → new spec differs
    assert sig.reassign == {"st0": "spec-finance-lead-v1"}


def test_no_reassign_when_assignee_matches_plan():
    board = _board(parent="in_progress", st0=("todo", "agent-eng-uuid"))
    agent_to_spec = {"agent-eng-uuid": "spec-eng-lead-v1"}  # same as plan
    sig = reconcile(board, plan_specs=PLAN_SPECS, approval_subtasks=set(),
                    agent_to_spec=agent_to_spec)
    assert sig.reassign == {}
