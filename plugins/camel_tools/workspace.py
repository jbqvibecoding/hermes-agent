"""The ``/mnt/user-data`` workspace contract (adopted from DeerFlow).

DeerFlow gives every task a uniform sandbox filesystem contract:

    /mnt/user-data/
    ├── uploads/     ← the user's input files
    ├── workspace/   ← the agent's scratch/working directory
    └── outputs/     ← final deliverables

This module brings that same *virtual path* contract to Hermes so CAMEL
toolkits that read/write files (browser downloads, document/image outputs,
generated artifacts) have a stable, per-session, isolated place to work —
mirroring what the user sees in a DeerFlow-style AI-workspace UI.

It is pure, dependency-light logic:

* :func:`resolve_workspace` maps the three virtual paths to per-session host
  directories under ``HERMES_HOME`` (isolated by ``session_id``).
* :func:`ensure_dirs` creates them.
* :func:`docker_volume_specs` renders the ``host:container`` bind-mount
  strings a :class:`tools.environments.docker.DockerEnvironment` (which
  already accepts a ``volumes=`` list) needs so the container sees the same
  ``/mnt/user-data/...`` paths natively.

Wiring these mounts into a live Docker sandbox is a thin caller-side step; the
contract, provisioning, and mount-spec generation live (and are tested) here.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

# Agent-visible virtual paths (identical to DeerFlow's contract).
MOUNT_ROOT = "/mnt/user-data"
UPLOADS_VPATH = f"{MOUNT_ROOT}/uploads"
WORKSPACE_VPATH = f"{MOUNT_ROOT}/workspace"
OUTPUTS_VPATH = f"{MOUNT_ROOT}/outputs"

# Host subtree (under HERMES_HOME) that backs the virtual paths.
_HOST_SUBDIR = "camel-workspace"

_SAFE_SESSION_RE = re.compile(r"[^A-Za-z0-9._-]+")


def _safe_session_id(session_id: str) -> str:
    """Sanitize a session id for safe use as a single path segment."""
    cleaned = _SAFE_SESSION_RE.sub("_", (session_id or "").strip())
    cleaned = cleaned.strip("._") or "default"
    # Guard against traversal even after substitution.
    return cleaned.replace("..", "_")[:128]


@dataclass(frozen=True)
class WorkspacePaths:
    """Resolved host directories for one session's /mnt/user-data contract."""

    root: Path
    uploads: Path
    workspace: Path
    outputs: Path

    def virtual_to_host(self) -> Dict[str, Path]:
        """Map each agent-visible virtual path to its host directory."""
        return {
            UPLOADS_VPATH: self.uploads,
            WORKSPACE_VPATH: self.workspace,
            OUTPUTS_VPATH: self.outputs,
        }


def resolve_workspace(hermes_home: str | Path, session_id: str) -> WorkspacePaths:
    """Resolve per-session host directories backing ``/mnt/user-data``.

    Layout: ``{hermes_home}/camel-workspace/{session}/{uploads,workspace,outputs}``.
    Does not touch the filesystem — call :func:`ensure_dirs` to create them.
    """
    base = Path(hermes_home).expanduser() / _HOST_SUBDIR / _safe_session_id(session_id)
    return WorkspacePaths(
        root=base,
        uploads=base / "uploads",
        workspace=base / "workspace",
        outputs=base / "outputs",
    )


def ensure_dirs(paths: WorkspacePaths) -> WorkspacePaths:
    """Create the three workspace directories (idempotent). Returns *paths*."""
    for directory in (paths.uploads, paths.workspace, paths.outputs):
        directory.mkdir(parents=True, exist_ok=True)
    return paths


def docker_volume_specs(
    paths: WorkspacePaths, *, read_only_uploads: bool = False
) -> List[str]:
    """Render ``host:container[:mode]`` bind-mount strings for DockerEnvironment.

    The container then sees ``/mnt/user-data/{uploads,workspace,outputs}``
    natively, so path translation is unnecessary inside the sandbox.
    """
    specs: List[str] = []
    for vpath, host in paths.virtual_to_host().items():
        spec = f"{host}:{vpath}"
        if read_only_uploads and vpath == UPLOADS_VPATH:
            spec += ":ro"
        specs.append(spec)
    return specs
