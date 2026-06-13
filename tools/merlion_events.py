"""Merlion event-name mapper — pure translation between three event vocabularies.

Three sources feed the Merlion ``/v1/orchestrate/{runId}/stream`` WS:
  * Multica WS events (system of record) — names verified in
    ``multica/server/pkg/protocol/events.go`` (e.g. ``task:running``).
  * Hermes orchestration events (plan/team/artifact lifecycle) that have no
    Multica equivalent and are produced by the orchestrator directly.
  * The Merlion client vocabulary (PRD ③§4.4: join/plan/start/done/...).

This module is the single pure mapper so the API layer never hardcodes string
inference. Unknown inputs return ``None`` (caller drops the frame) rather than
guessing — enum drift downgrades, never crashes.
"""

from __future__ import annotations

from typing import Optional

# Canonical Merlion event names emitted on the run stream (PRD ③§4.4 + stream).
MERLION_EVENTS: frozenset[str] = frozenset(
    {
        "team.join",
        "plan.ready",
        "task.queued",
        "task.start",
        "task.progress",
        "task.done",
        "task.failed",
        "task.cancelled",
        "task.reassign",
        "message",
        "artifact.created",
        "ack",
        "run.done",
    }
)

# Multica WS event type → Merlion event name. Source: protocol/events.go.
_FROM_MULTICA: dict[str, str] = {
    "task:queued": "task.queued",
    "task:dispatch": "task.queued",
    "task:running": "task.start",
    "task:progress": "task.progress",
    "task:completed": "task.done",
    "task:failed": "task.failed",
    "task:cancelled": "task.cancelled",
    "task:message": "message",
    "comment:created": "message",
    "member:added": "team.join",
    # waiting_local_directory has no user-facing Merlion frame; intentionally absent.
}

# Hermes orchestration event kind → Merlion event name. These originate in the
# orchestrator (no Multica row transition), e.g. DAG plan resolved, artifact
# registered, team assembled, reassignment, user-message ack, run terminal.
_FROM_HERMES: dict[str, str] = {
    "plan_ready": "plan.ready",
    "team_assembled": "team.join",
    "subagent_join": "team.join",
    "subagent_thinking": "task.progress",
    "subagent_action": "task.progress",
    "artifact_created": "artifact.created",
    "task_reassigned": "task.reassign",
    "user_ack": "ack",
    "run_completed": "run.done",
}

# The few Merlion client actions that map back to a Multica task mutation verb.
# (Used by the API layer when a Merlion client posts an action; not all Merlion
# events have a Multica counterpart — plan.ready/artifact.created are emit-only.)
_TO_MULTICA_MUTATION: dict[str, str] = {
    "task.start": "start",
    "task.done": "complete",
    "task.failed": "fail",
    "task.cancelled": "cancel",
    "task.reassign": "reassign",
}


def from_multica(event_type: str) -> Optional[str]:
    """Multica WS event type → Merlion event name, or None to drop the frame."""
    return _FROM_MULTICA.get(event_type)


def from_hermes(kind: str) -> Optional[str]:
    """Hermes orchestration event kind → Merlion event name, or None."""
    return _FROM_HERMES.get(kind)


def to_multica_mutation(merlion_event: str) -> Optional[str]:
    """Merlion client action → Multica task mutation verb, or None if emit-only."""
    return _TO_MULTICA_MUTATION.get(merlion_event)


def is_merlion_event(name: str) -> bool:
    return name in MERLION_EVENTS
