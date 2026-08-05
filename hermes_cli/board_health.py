"""Board-level health classification for the kanban dispatcher.

Ported from wanman (`packages/cli/src/loop-observability.ts`, Apache-2.0):

    Copyright wanman contributors.
    Licensed under the Apache License, Version 2.0.
    http://www.apache.org/licenses/LICENSE-2.0

**Why this exists.** Kanban already reports per-task outcomes — ``timed_out``,
``crashed``, the consecutive-failure counter. What it cannot answer is the
question a human actually asks about an unattended run: *is the board as a
whole still making progress?* A board can look busy while getting nowhere, and
the three ways that happens are worth telling apart:

* nothing is happening because there is genuinely nothing to do (**idle**),
* nothing is happening because work is queued but nothing is picking it up
  (**backlog_stuck**),
* nothing is happening because everything left is waiting on a dependency
  (**blocked**).

Collapsing those into one "not progressing" signal is what makes stalled runs
hard to notice. Classifying each tick — cheaply, with no LLM in the loop —
gives the dispatcher a basis for stopping an unattended run that has wedged,
and for recognising when it is genuinely finished.

**Modifications from upstream.** The decision tree and the five states are
ported as-is. Upstream's ``backlog_stuck`` test is "an agent is idle but has
unread messages in its mailbox"; Hermes has no inter-agent message bus, so the
equivalent signal here is "runnable work exists but nothing has claimed it".
Upstream also counts created artifacts as evidence of progress; Hermes'
equivalent is task transitions alone, so that input is dropped rather than
faked. The auto-exit policy (N consecutive error ticks aborts; N consecutive
all-done ticks finishes) is ported with the thresholds made configurable.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Literal, Sequence

BoardClassification = Literal["productive", "idle", "blocked", "backlog_stuck", "error"]

# Upstream defaults: 20 consecutive error loops aborts an --infinite run;
# 5 consecutive fully-done polls ends a finite one.
DEFAULT_ERROR_LIMIT = 20
DEFAULT_DONE_STREAK = 5

#: Statuses whose tasks are ready to run right now (nothing is stopping them).
RUNNABLE_STATUSES = ("ready", "todo", "scheduled")


@dataclass(frozen=True)
class BoardSnapshot:
    """Counts describing one dispatcher tick.

    All fields default to zero so a caller can supply only what it can cheaply
    measure; an all-zero snapshot classifies as ``idle``.
    """

    task_transitions: int = 0
    """Tasks whose status changed since the previous tick."""

    errors: int = 0
    """Failures observed this tick (spawn failures, crashes, timeouts)."""

    runnable_unclaimed: int = 0
    """Tasks that could run but have no live claim."""

    blocked_tasks: int = 0
    """Tasks waiting on a dependency or other block."""

    running_tasks: int = 0
    """Tasks currently claimed by a live worker."""

    total_tasks: int = 0
    done_tasks: int = 0

    @property
    def all_done(self) -> bool:
        """Whether every task on the board has finished."""
        return self.total_tasks > 0 and self.done_tasks == self.total_tasks


@dataclass(frozen=True)
class BoardHealth:
    """A classification plus the human-readable reasons behind it."""

    classification: BoardClassification
    reasons: List[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {"classification": self.classification, "reasons": list(self.reasons)}


def classify_board(snapshot: BoardSnapshot) -> BoardHealth:
    """Classify one dispatcher tick.

    The order of the checks is load-bearing and matches upstream: errors
    dominate, then evidence of progress, then the two distinguishable flavours
    of stall, then genuine idleness.
    """
    reasons: List[str] = []

    if snapshot.errors > 0:
        reasons.append(f"{snapshot.errors} error(s) this tick")
        return BoardHealth("error", reasons)

    if snapshot.task_transitions > 0:
        reasons.append(f"{snapshot.task_transitions} task transition(s)")
        return BoardHealth("productive", reasons)

    # Something is running, so the absence of transitions is just a slow turn,
    # not a stall. (Upstream has no equivalent because its agents are always
    # either spawning or idle; Hermes workers can be mid-task across ticks.)
    if snapshot.running_tasks > 0:
        reasons.append(f"{snapshot.running_tasks} task(s) still running")
        return BoardHealth("productive", reasons)

    if snapshot.runnable_unclaimed > 0:
        reasons.append(f"{snapshot.runnable_unclaimed} runnable task(s) with no worker")
        return BoardHealth("backlog_stuck", reasons)

    if snapshot.blocked_tasks > 0:
        reasons.append(f"{snapshot.blocked_tasks} task(s) blocked")
        return BoardHealth("blocked", reasons)

    reasons.append("no state changes detected")
    return BoardHealth("idle", reasons)


@dataclass
class RunGate:
    """Decides when an unattended dispatcher run should stop.

    Two terminal conditions, both requiring a *streak* so a single unlucky tick
    never ends a run:

    * ``error_limit`` consecutive ``error`` ticks — the run is wedged, abort.
    * ``done_streak`` consecutive ticks that are idle with every task done —
      the run finished cleanly.
    """

    error_limit: int = DEFAULT_ERROR_LIMIT
    done_streak: int = DEFAULT_DONE_STREAK

    error_run: int = 0
    done_run: int = 0
    stop_reason: str = ""

    def observe(self, health: BoardHealth, snapshot: BoardSnapshot) -> bool:
        """Record one tick. Returns True when the run should stop.

        Once stopped, stays stopped — further observations don't revive it.
        """
        if self.stop_reason:
            return True

        if health.classification == "error":
            self.error_run += 1
        else:
            self.error_run = 0

        if health.classification == "idle" and snapshot.all_done:
            self.done_run += 1
        else:
            self.done_run = 0

        if self.error_limit > 0 and self.error_run >= self.error_limit:
            self.stop_reason = (
                f"aborted after {self.error_run} consecutive error tick(s)"
            )
            return True

        if self.done_streak > 0 and self.done_run >= self.done_streak:
            self.stop_reason = f"all tasks done for {self.done_run} consecutive tick(s)"
            return True

        return False

    @property
    def should_stop(self) -> bool:
        return bool(self.stop_reason)


def snapshot_from_rows(
    rows: Sequence,
    *,
    task_transitions: int = 0,
    errors: int = 0,
    now: float = 0.0,
) -> BoardSnapshot:
    """Build a :class:`BoardSnapshot` from kanban task rows.

    *rows* are row-like objects with ``status`` and (optionally) ``claim_lock``
    / ``claim_expires``. A task counts as running only while its claim is live;
    an expired claim makes it runnable-but-unclaimed again, which is exactly
    the ``backlog_stuck`` signal.
    """
    runnable_unclaimed = 0
    blocked = 0
    running = 0
    done = 0
    total = 0

    for row in rows:
        status = str(_get(row, "status") or "")
        if status == "archived":
            continue
        total += 1
        if status == "done":
            done += 1
        elif status == "blocked":
            blocked += 1
        elif status == "running":
            if _claim_is_live(row, now):
                running += 1
            else:
                runnable_unclaimed += 1
        elif status in RUNNABLE_STATUSES:
            runnable_unclaimed += 1

    return BoardSnapshot(
        task_transitions=task_transitions,
        errors=errors,
        runnable_unclaimed=runnable_unclaimed,
        blocked_tasks=blocked,
        running_tasks=running,
        total_tasks=total,
        done_tasks=done,
    )


def _claim_is_live(row, now: float) -> bool:
    if not _get(row, "claim_lock"):
        return False
    expires = _get(row, "claim_expires")
    if expires is None or not now:
        return True
    try:
        return float(expires) > now
    except (TypeError, ValueError):
        return True


def _get(row, name: str):
    if isinstance(row, dict):
        return row.get(name)
    try:
        return row[name]
    except (TypeError, KeyError, IndexError):
        return getattr(row, name, None)
