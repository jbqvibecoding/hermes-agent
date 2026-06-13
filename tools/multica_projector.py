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
}


class MulticaProjector:
    """Turns one run's event stream into Multica issue create/patch calls."""

    def __init__(self, client: MulticaClient, *, run_id: str, title: str) -> None:
        self._client = client
        self._run_id = run_id
        self._title = title or f"Run {run_id}"
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
            elif kind == "run.done":
                self._on_run_done(event)
            # other events (team.join, message, ...) need no board mutation here
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
            child = self._client.create_issue(
                st.get("title", sid),
                status="todo",
                parent_issue_id=self._parent_id,
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
