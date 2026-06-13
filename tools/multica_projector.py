"""Project orchestration events onto Multica board cards (best-effort).

A stateful consumer of the §0.5.6 orchestration events. On ``plan.ready`` it
creates a parent card + one child card per subtask; on ``task.start/done/failed``
it flips the matching child's status; on ``run.done`` it closes the parent.
Multica's realtime hub broadcasts each REST mutation to open browsers, so the
board updates live.

Best-effort by design: projection is additive UX, never load-bearing. Every
call is guarded — a Multica outage logs a warning and the orchestration keeps
running untouched.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from tools.multica_client import MulticaClient

logger = logging.getLogger(__name__)

# Orchestration task event → Multica issue status.
_TASK_EVENT_STATUS: dict[str, str] = {
    "task.start": "in_progress",
    "task.done": "done",
    "task.failed": "cancelled",
    "task.cancelled": "cancelled",  # operator cancelled the subtask
    "task.approved": "in_progress",  # operator approved → moving forward
}


class MulticaProjector:
    """Turns one run's event stream into Multica issue create/patch calls."""

    def __init__(
        self,
        client: MulticaClient,
        *,
        run_id: str,
        title: str,
        assignee_by_subtask: Optional[dict[str, str]] = None,
    ) -> None:
        self._client = client
        self._run_id = run_id
        self._title = title or f"Run {run_id}"
        # subtask_id -> agent uuid, to assign cards to agents (enables reassign demo)
        self._assignee_by_subtask = assignee_by_subtask or {}
        self._parent_id: Optional[str] = None
        self._issue_by_subtask: dict[str, str] = {}

    def handle(self, event: dict[str, Any]) -> None:
        """Dispatch one event. Never raises (projection is best-effort)."""
        kind = event.get("event")
        try:
            if kind == "plan.ready":
                self._on_plan_ready(event)
            elif kind in _TASK_EVENT_STATUS:
                self._on_task(event, _TASK_EVENT_STATUS[kind])
            elif kind in ("run.done", "run.cancelled"):
                self._on_run_done(event)
            # other events (team.join, reassigned, awaiting_approval, ...) need
            # no board mutation here
        except Exception as exc:  # never let projection break the run
            logger.warning("[multica] projection failed for %s: %s", kind, exc)

    # -- handlers -----------------------------------------------------------

    def _on_plan_ready(self, event: dict[str, Any]) -> None:
        plan = event.get("plan") or {}
        parent = self._client.create_issue(self._title, status="in_progress")
        self._parent_id = parent.get("id")
        for st in plan.get("subtasks", []):
            sid = st.get("id")
            if not sid:
                continue
            # Approval-gated cards land parked in 'blocked' with a visible marker,
            # so the operator sees they're waiting for a go-ahead.
            needs_approval = bool(st.get("needs_approval"))
            title = ("⛔ Approval needed: " + st.get("title", sid)) if needs_approval else st.get("title", sid)
            child = self._client.create_issue(
                title,
                status="blocked" if needs_approval else "todo",
                parent_issue_id=self._parent_id,
                assignee_type="agent" if self._assignee_by_subtask.get(sid) else None,
                assignee_id=self._assignee_by_subtask.get(sid),
            )
            issue_id = child.get("id")
            if issue_id:
                self._issue_by_subtask[sid] = issue_id

    def _on_task(self, event: dict[str, Any], status: str) -> None:
        issue_id = self._issue_by_subtask.get(event.get("subtask_id"))
        if issue_id:
            self._client.update_issue(issue_id, status=status)

    def _on_run_done(self, event: dict[str, Any]) -> None:
        if not self._parent_id:
            return
        status = "done" if event.get("status") == "done" else "cancelled"
        self._client.update_issue(self._parent_id, status=status)
