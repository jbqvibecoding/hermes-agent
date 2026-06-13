from __future__ import annotations

from tools.multica_projector import MulticaProjector


class _FakeClient:
    def __init__(self, *, fail_create=False):
        self.created: list[dict] = []
        self.updated: list[tuple[str, str]] = []
        self._n = 0
        self._fail_create = fail_create

    def create_issue(self, title, *, status="todo", parent_issue_id=None, **kw):
        if self._fail_create:
            raise RuntimeError("multica down")
        self._n += 1
        iid = f"iss_{self._n}"
        self.created.append({"id": iid, "title": title, "status": status, "parent": parent_issue_id})
        return {"id": iid, "identifier": f"DEMO-{self._n}"}

    def update_issue(self, issue_id, *, status=None, **kw):
        self.updated.append((issue_id, status))
        return {"id": issue_id, "status": status}


def _plan_ready():
    return {
        "event": "plan.ready",
        "run_id": "run_1",
        "plan": {"subtasks": [{"id": "st0", "title": "[eng] build"}, {"id": "syn", "title": "synthesize"}]},
    }


def test_plan_ready_creates_parent_and_children():
    client = _FakeClient()
    proj = MulticaProjector(client, run_id="run_1", title="Build app")
    proj.handle(_plan_ready())
    # parent + 2 children
    assert len(client.created) == 3
    assert client.created[0]["title"] == "Build app"
    assert client.created[0]["status"] == "in_progress"
    assert client.created[0]["parent"] is None
    # children link to the parent issue id
    parent_id = client.created[0]["id"]
    assert all(c["parent"] == parent_id for c in client.created[1:])


def test_task_events_patch_mapped_child_status():
    client = _FakeClient()
    proj = MulticaProjector(client, run_id="run_1", title="Build app")
    proj.handle(_plan_ready())
    # st0 → iss_2 (iss_1 is the parent)
    proj.handle({"event": "task.start", "subtask_id": "st0"})
    proj.handle({"event": "task.done", "subtask_id": "st0"})
    assert ("iss_2", "in_progress") in client.updated
    assert ("iss_2", "done") in client.updated


def test_failed_task_maps_to_cancelled():
    client = _FakeClient()
    proj = MulticaProjector(client, run_id="run_1", title="x")
    proj.handle(_plan_ready())
    proj.handle({"event": "task.failed", "subtask_id": "syn"})
    # syn → iss_3
    assert ("iss_3", "cancelled") in client.updated


def test_run_done_closes_parent():
    client = _FakeClient()
    proj = MulticaProjector(client, run_id="run_1", title="x")
    proj.handle(_plan_ready())
    proj.handle({"event": "run.done", "status": "done"})
    assert ("iss_1", "done") in client.updated


def test_run_done_failed_cancels_parent():
    client = _FakeClient()
    proj = MulticaProjector(client, run_id="run_1", title="x")
    proj.handle(_plan_ready())
    proj.handle({"event": "run.done", "status": "failed"})
    assert ("iss_1", "cancelled") in client.updated


def test_unknown_subtask_event_is_noop():
    client = _FakeClient()
    proj = MulticaProjector(client, run_id="run_1", title="x")
    proj.handle(_plan_ready())
    before = len(client.updated)
    proj.handle({"event": "task.start", "subtask_id": "does-not-exist"})
    assert len(client.updated) == before


def test_projection_errors_are_swallowed():
    client = _FakeClient(fail_create=True)
    proj = MulticaProjector(client, run_id="run_1", title="x")
    # create_issue raises inside handle → must NOT propagate (best-effort)
    proj.handle(_plan_ready())  # no exception
    assert client.created == []
