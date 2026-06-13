from __future__ import annotations

from tools import multica_client as mc


class _FakeTransport:
    def __init__(self, response=None):
        self.calls: list[tuple] = []
        self._response = response or {"id": "iss_1", "identifier": "DEMO-1"}

    def request(self, method, path, *, json=None):
        self.calls.append((method, path, json))
        return self._response


# ---- MulticaConfig.from_env ----------------------------------------------

def test_config_from_env_present(monkeypatch):
    monkeypatch.setenv("MULTICA_BASE_URL", "http://localhost:8080/")
    monkeypatch.setenv("MULTICA_TOKEN", "mul_abc")
    monkeypatch.setenv("MULTICA_WORKSPACE", "demo-ws")
    cfg = mc.MulticaConfig.from_env()
    assert cfg is not None
    assert cfg.base_url == "http://localhost:8080"  # trailing slash trimmed
    assert cfg.token == "mul_abc"
    assert cfg.workspace == "demo-ws"
    assert cfg.workspace_is_id is False


def test_config_from_env_missing_returns_none(monkeypatch):
    monkeypatch.delenv("MULTICA_BASE_URL", raising=False)
    monkeypatch.setenv("MULTICA_TOKEN", "mul_abc")
    monkeypatch.setenv("MULTICA_WORKSPACE", "demo-ws")
    assert mc.MulticaConfig.from_env() is None


def test_config_detects_uuid_workspace(monkeypatch):
    monkeypatch.setenv("MULTICA_BASE_URL", "http://x")
    monkeypatch.setenv("MULTICA_TOKEN", "mul_abc")
    monkeypatch.setenv("MULTICA_WORKSPACE", "550e8400-e29b-41d4-a716-446655440000")
    cfg = mc.MulticaConfig.from_env()
    assert cfg.workspace_is_id is True


# ---- MulticaClient --------------------------------------------------------

def test_create_issue_posts_expected_body():
    t = _FakeTransport()
    client = mc.MulticaClient(t)
    out = client.create_issue("Parent", status="in_progress", priority="high")
    assert out["id"] == "iss_1"
    method, path, body = t.calls[0]
    assert (method, path) == ("POST", "/api/issues")
    assert body["title"] == "Parent"
    assert body["status"] == "in_progress"
    assert body["priority"] == "high"
    # optional fields omitted when not provided
    assert "parent_issue_id" not in body


def test_create_child_issue_sets_parent():
    t = _FakeTransport()
    mc.MulticaClient(t).create_issue("Child", parent_issue_id="iss_parent")
    _, _, body = t.calls[0]
    assert body["parent_issue_id"] == "iss_parent"


def test_update_issue_patches_status():
    t = _FakeTransport()
    mc.MulticaClient(t).update_issue("iss_9", status="done")
    method, path, body = t.calls[0]
    assert (method, path) == ("PATCH", "/api/issues/iss_9")
    assert body == {"status": "done"}


def test_status_map_values_are_valid():
    from tools.multica_projector import _TASK_EVENT_STATUS

    assert set(_TASK_EVENT_STATUS.values()) <= mc.VALID_ISSUE_STATUSES
