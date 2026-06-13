from __future__ import annotations

from tools.multica_poller import MulticaPoller


class _FakeClient:
    def __init__(self, issues, *, raise_=False):
        self._issues = issues
        self._raise = raise_

    def list_issues(self, **kw):
        if self._raise:
            raise RuntimeError("multica down")
        return self._issues


def test_poll_maps_issues_to_subtasks():
    issues = [
        {"id": "iss_parent", "status": "in_progress", "assignee_id": None},
        {"id": "iss_a", "status": "cancelled", "assignee_id": "agent-1"},
        {"id": "iss_b", "status": "todo", "assignee_id": None},
        {"id": "iss_other", "status": "done", "assignee_id": None},  # not part of run
    ]
    poller = MulticaPoller(
        _FakeClient(issues),
        parent_issue_id="iss_parent",
        issue_by_subtask={"st0": "iss_a", "st1": "iss_b"},
    )
    state = poller.poll()
    assert state.parent_status == "in_progress"
    assert state.per_subtask["st0"] == {"status": "cancelled", "assignee_id": "agent-1"}
    assert state.per_subtask["st1"]["status"] == "todo"
    assert "iss_other" not in state.per_subtask  # unrelated issues ignored


def test_poll_failure_returns_empty_state():
    poller = MulticaPoller(
        _FakeClient([], raise_=True),
        parent_issue_id="iss_parent",
        issue_by_subtask={"st0": "iss_a"},
    )
    state = poller.poll()
    assert state.parent_status is None
    assert state.per_subtask == {}
