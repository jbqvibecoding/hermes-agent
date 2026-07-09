"""Tests for the /mnt/user-data workspace contract (workspace.py)."""

from __future__ import annotations

from pathlib import Path

from plugins.camel_tools.workspace import (
    MOUNT_ROOT,
    OUTPUTS_VPATH,
    UPLOADS_VPATH,
    WORKSPACE_VPATH,
    docker_volume_specs,
    ensure_dirs,
    resolve_workspace,
)


def test_virtual_paths_match_deerflow_contract():
    assert MOUNT_ROOT == "/mnt/user-data"
    assert UPLOADS_VPATH == "/mnt/user-data/uploads"
    assert WORKSPACE_VPATH == "/mnt/user-data/workspace"
    assert OUTPUTS_VPATH == "/mnt/user-data/outputs"


def test_resolve_workspace_layout(tmp_path):
    paths = resolve_workspace(tmp_path, "sess1")
    assert paths.uploads == tmp_path / "camel-workspace" / "sess1" / "uploads"
    assert paths.workspace == tmp_path / "camel-workspace" / "sess1" / "workspace"
    assert paths.outputs == tmp_path / "camel-workspace" / "sess1" / "outputs"


def test_resolve_does_not_touch_fs(tmp_path):
    paths = resolve_workspace(tmp_path, "sess1")
    assert not paths.uploads.exists()


def test_ensure_dirs_creates_all(tmp_path):
    paths = ensure_dirs(resolve_workspace(tmp_path, "sess1"))
    assert paths.uploads.is_dir()
    assert paths.workspace.is_dir()
    assert paths.outputs.is_dir()


def test_ensure_dirs_idempotent(tmp_path):
    p = resolve_workspace(tmp_path, "s")
    ensure_dirs(p)
    ensure_dirs(p)  # no raise on second call
    assert p.workspace.is_dir()


def test_session_id_sanitized_against_traversal(tmp_path):
    paths = resolve_workspace(tmp_path, "../../etc")
    # Resolved path stays under the workspace base — no escape.
    base = tmp_path / "camel-workspace"
    assert base in paths.root.parents or paths.root.parent == base
    assert ".." not in str(paths.root.relative_to(base))


def test_empty_session_id_falls_back_to_default(tmp_path):
    paths = resolve_workspace(tmp_path, "")
    assert paths.root.name == "default"


def test_virtual_to_host_mapping(tmp_path):
    paths = resolve_workspace(tmp_path, "s")
    mapping = paths.virtual_to_host()
    assert mapping[UPLOADS_VPATH] == paths.uploads
    assert mapping[WORKSPACE_VPATH] == paths.workspace
    assert mapping[OUTPUTS_VPATH] == paths.outputs


def test_docker_volume_specs(tmp_path):
    paths = resolve_workspace(tmp_path, "s")
    specs = docker_volume_specs(paths)
    assert f"{paths.uploads}:{UPLOADS_VPATH}" in specs
    assert f"{paths.workspace}:{WORKSPACE_VPATH}" in specs
    assert f"{paths.outputs}:{OUTPUTS_VPATH}" in specs


def test_docker_volume_specs_read_only_uploads(tmp_path):
    paths = resolve_workspace(tmp_path, "s")
    specs = docker_volume_specs(paths, read_only_uploads=True)
    assert f"{paths.uploads}:{UPLOADS_VPATH}:ro" in specs
    # workspace/outputs stay writable
    assert f"{paths.workspace}:{WORKSPACE_VPATH}" in specs
