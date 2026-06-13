"""Inbound board reader — the reverse of the projector.

Polls Multica's REST API for the current status/assignee of a run's cards, so
the orchestration loop can react to human actions (cancel, reassign, approve).
Best-effort: any network error yields an empty board snapshot (no signal), so a
Multica hiccup never perturbs the run.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

from tools.multica_client import MulticaClient

logger = logging.getLogger(__name__)


@dataclass
class BoardState:
    """Snapshot of one run's cards as they currently stand on the board."""

    parent_status: Optional[str] = None
    # subtask_id -> {"status": str, "assignee_id": Optional[str]}
    per_subtask: dict[str, dict] = field(default_factory=dict)


class MulticaPoller:
    """Reads the live board state for a run via the issue list endpoint."""

    def __init__(
        self,
        client: MulticaClient,
        *,
        parent_issue_id: Optional[str],
        issue_by_subtask: dict[str, str],
    ) -> None:
        self._client = client
        self._parent_issue_id = parent_issue_id
        # invert subtask_id -> issue_id  into  issue_id -> subtask_id
        self._subtask_by_issue = {iid: sid for sid, iid in issue_by_subtask.items()}

    def poll(self) -> BoardState:
        try:
            issues = self._client.list_issues()
        except Exception as exc:  # best-effort: a board read failure yields no signal
            logger.warning("[multica] poll failed: %s", exc)
            return BoardState()
        state = BoardState()
        for issue in issues:
            iid = issue.get("id")
            if iid == self._parent_issue_id:
                state.parent_status = issue.get("status")
                continue
            sid = self._subtask_by_issue.get(iid)
            if sid is not None:
                state.per_subtask[sid] = {
                    "status": issue.get("status"),
                    "assignee_id": issue.get("assignee_id"),
                }
        return state
