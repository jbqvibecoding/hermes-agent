"""Minimal Multica REST client — create/update issues (cards) on the board.

This is Hermes' "phone line to Multica": the orchestration projector uses it to
create a parent issue + child issues for a run and flip their status as work
progresses. Multica's own realtime hub broadcasts those REST mutations to any
browser viewing the board, so the cards appear and change live — no WebSocket
work is needed on the Hermes side.

The HTTP transport is injectable (a Protocol) so the client and projector are
unit-testable with a fake transport and never touch the network in tests. The
default transport uses ``httpx`` (already a core dependency).

Contract verified against multica ``server/internal/handler/issue.go`` +
``middleware/auth.go``:
  * ``POST /api/issues``        — create (child via ``parent_issue_id``)
  * ``PATCH /api/issues/{id}``  — update (status, ...)
  * auth: ``Authorization: Bearer mul_<PAT>`` + ``X-Workspace-Slug`` (or
    ``X-Workspace-ID`` when the workspace value is a UUID).
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from typing import Any, Optional, Protocol

# Issue statuses accepted by Multica (issue.go CreateIssueRequest). Kept as a
# frozenset so the projector's mapping can be validated against the contract.
VALID_ISSUE_STATUSES: frozenset[str] = frozenset(
    {"backlog", "todo", "in_progress", "done", "cancelled"}
)

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE
)


def _looks_like_uuid(value: str) -> bool:
    return bool(_UUID_RE.match(value or ""))


@dataclass
class MulticaConfig:
    """Connection settings, sourced from env. Absent → integration disabled."""

    base_url: str
    token: str
    workspace: str  # slug or UUID

    @property
    def workspace_is_id(self) -> bool:
        return _looks_like_uuid(self.workspace)

    @classmethod
    def from_env(cls) -> Optional["MulticaConfig"]:
        """Build from ``MULTICA_BASE_URL`` / ``MULTICA_TOKEN`` / ``MULTICA_WORKSPACE``.

        Returns ``None`` if any are unset — the caller then runs the orchestration
        without projecting to Multica (the board integration is purely additive).
        """
        base_url = os.getenv("MULTICA_BASE_URL", "").strip()
        token = os.getenv("MULTICA_TOKEN", "").strip()
        workspace = os.getenv("MULTICA_WORKSPACE", "").strip()
        if not (base_url and token and workspace):
            return None
        return cls(base_url=base_url.rstrip("/"), token=token, workspace=workspace)


class MulticaTransport(Protocol):
    """Minimal HTTP seam: perform a request and return the parsed JSON body."""

    def request(self, method: str, path: str, *, json: Optional[dict] = None) -> dict: ...


class HttpxMulticaTransport:
    """Default transport over ``httpx`` (lazy-imported)."""

    def __init__(self, config: MulticaConfig, *, timeout: float = 20.0) -> None:
        import httpx  # lazy: keep this module importable without the dep present

        ws_header = "X-Workspace-ID" if config.workspace_is_id else "X-Workspace-Slug"
        self._client = httpx.Client(
            base_url=config.base_url,
            headers={
                "Authorization": f"Bearer {config.token}",
                ws_header: config.workspace,
                "Content-Type": "application/json",
            },
            timeout=timeout,
        )

    def request(self, method: str, path: str, *, json: Optional[dict] = None) -> dict:
        resp = self._client.request(method, path, json=json)
        resp.raise_for_status()
        if not resp.content:
            return {}
        return resp.json()

    def close(self) -> None:
        self._client.close()


class MulticaClient:
    """Thin issue API over an injected transport."""

    def __init__(self, transport: MulticaTransport) -> None:
        self._t = transport

    def create_issue(
        self,
        title: str,
        *,
        description: Optional[str] = None,
        status: str = "todo",
        priority: Optional[str] = None,
        parent_issue_id: Optional[str] = None,
        assignee_type: Optional[str] = None,
        assignee_id: Optional[str] = None,
    ) -> dict:
        """Create an issue (card). Pass ``parent_issue_id`` for a sub-card.

        Returns the created issue dict (notably ``id`` and ``identifier``).
        """
        body: dict[str, Any] = {"title": title, "status": status}
        if description is not None:
            body["description"] = description
        if priority is not None:
            body["priority"] = priority
        if parent_issue_id is not None:
            body["parent_issue_id"] = parent_issue_id
        if assignee_type is not None:
            body["assignee_type"] = assignee_type
        if assignee_id is not None:
            body["assignee_id"] = assignee_id
        return self._t.request("POST", "/api/issues", json=body)

    def update_issue(self, issue_id: str, *, status: Optional[str] = None, **fields: Any) -> dict:
        """Update an issue. Only provided fields are sent (here: usually status).

        Multica's update route is ``PUT /api/issues/{id}`` (it accepts partial
        bodies and tracks which fields are present — verified against the live
        backend; an earlier PATCH attempt returned 405).
        """
        body: dict[str, Any] = dict(fields)
        if status is not None:
            body["status"] = status
        return self._t.request("PUT", f"/api/issues/{issue_id}", json=body)
