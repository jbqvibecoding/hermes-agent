"""Translate a board snapshot into orchestration control signals.

Pure function over a :class:`BoardState` plus what Hermes *intends* (the plan's
spec per subtask, which subtasks are approval-gated, and the agent→spec map).
The human/Hermes distinction is unambiguous because Hermes never writes these
states itself:

* parent card ``cancelled``                  → cancel the whole run (kill switch)
* child card ``cancelled``                    → cancel that subtask (stop branch)
* approval-gated child moved out of ``blocked`` → human approved it
* child ``assignee_id`` maps to a different spec → human reassigned it

Returns an empty signal when nothing diverges, so calling it every tick is cheap
and idempotent.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

from tools.multica_poller import BoardState

# Statuses that mean an approval-gated card is still parked (not yet approved).
# The projector parks approval cards in 'in_review'; we also treat blocked/backlog
# as parked so the gate is robust to where the operator leaves the card.
_PARKED_STATUSES: frozenset = frozenset({None, "in_review", "blocked", "backlog"})


@dataclass
class ControlSignal:
    cancel_run: bool = False
    cancel_subtasks: set[str] = field(default_factory=set)
    approve_subtasks: set[str] = field(default_factory=set)
    reassign: dict[str, str] = field(default_factory=dict)  # subtask_id -> new spec_id

    def is_empty(self) -> bool:
        return not (
            self.cancel_run or self.cancel_subtasks or self.approve_subtasks or self.reassign
        )


def reconcile(
    board: BoardState,
    *,
    plan_specs: dict[str, Optional[str]],
    approval_subtasks: set[str],
    agent_to_spec: Optional[dict[str, str]] = None,
) -> ControlSignal:
    """Derive control signals from the current board vs Hermes' intent."""
    agent_to_spec = agent_to_spec or {}
    sig = ControlSignal()

    if board.parent_status == "cancelled":
        sig.cancel_run = True

    for sid, info in board.per_subtask.items():
        status = info.get("status")
        if status == "cancelled":
            sig.cancel_subtasks.add(sid)
        # Approval-gated subtask the human moved out of its parked column.
        if sid in approval_subtasks and status not in _PARKED_STATUSES:
            sig.approve_subtasks.add(sid)
        # Reassign: the card's assignee maps to a spec different from the plan's.
        assignee_id = info.get("assignee_id")
        if assignee_id:
            new_spec = agent_to_spec.get(assignee_id)
            if new_spec and new_spec != plan_specs.get(sid):
                sig.reassign[sid] = new_spec

    return sig
