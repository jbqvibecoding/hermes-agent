"""Merlion plan projection — the rich ``Subtask`` shape (PRD ③§4.2).

The Router produces a DAG of plan steps (spec + objective + deps). Merlion's
Board renders each step as a *Subtask* card carrying presentation/simulation
fields: an effort estimate plus a simulated duration and artifact count derived
from it, an output filename, sub-points, and a status message.

This module is the pure projection from routing facts → Merlion Subtask, with
the PRD's exact derivations. It deliberately stays separate from the routing
core (``task_router``) so the simulation/presentation math never leaks into
runtime selection.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

# PRD ③§4.2 derivations.
_DUR_BASE_MS = 3200
_DUR_PER_EST_MS = 2400
_ARTS_BASE = 2
_ARTS_PER_EST = 1.5


def sim_duration_ms(est: int) -> int:
    """Simulated task duration for the Board ticker: 3200 + est*2400 (ms)."""
    return _DUR_BASE_MS + max(0, est) * _DUR_PER_EST_MS


def artifact_count(est: int) -> int:
    """Expected artifact count: 2 + round(est*1.5)."""
    return _ARTS_BASE + round(max(0, est) * _ARTS_PER_EST)


@dataclass
class Subtask:
    """A Merlion Board card projected from one routing plan step."""

    id: str
    title: str
    spec_id: Optional[str] = None
    dept: Optional[str] = None  # owning department (ORG scale)
    est: int = 1  # effort units (drives dur/arts)
    dur: int = 0  # simulated duration ms (derived from est)
    arts: int = 0  # artifact count (derived from est)
    file: Optional[str] = None  # primary output filename
    subs: list[str] = field(default_factory=list)  # sub-points
    msg: str = ""  # current status message
    body: str = ""  # rendered contract / objective body
    deps: list[str] = field(default_factory=list)  # upstream subtask ids
    is_synthesis: bool = False

    def __post_init__(self) -> None:
        # Derive simulation fields from est unless the caller pinned them.
        if self.dur == 0:
            self.dur = sim_duration_ms(self.est)
        if self.arts == 0:
            self.arts = artifact_count(self.est)


def build_subtask(
    sid: str,
    title: str,
    *,
    spec_id: Optional[str] = None,
    dept: Optional[str] = None,
    est: int = 1,
    file: Optional[str] = None,
    subs: Optional[list[str]] = None,
    body: str = "",
    deps: Optional[list[str]] = None,
    is_synthesis: bool = False,
) -> Subtask:
    """Build one Subtask with derived ``dur``/``arts`` from ``est``."""
    return Subtask(
        id=sid,
        title=title,
        spec_id=spec_id,
        dept=dept,
        est=max(1, est),
        file=file,
        subs=list(subs or []),
        body=body,
        deps=list(deps or []),
        is_synthesis=is_synthesis,
    )
