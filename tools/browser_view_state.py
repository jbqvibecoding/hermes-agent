"""Snapshot generation counter — refuse actions aimed at a page that moved.

Ported from CopilotKit's OpenBot (MIT) — ``agent-computer/src/index.ts``, where
every snapshot bumps a counter (``:223``), every navigation bumps it again
(``:662``), and an action carrying an outdated id is refused with a distinct
stale error rather than being carried out against whatever happens to be at
that reference now.

The problem it solves
---------------------
Hermes represents a page as an accessibility tree with element references
(``@e1``, ``@e2`` …) — the same approach OpenBot uses. Those references are
positional: they mean "the first interactive element", not "the Accept button".
So a model that takes a snapshot, then navigates or waits while the page
re-renders, then clicks ``@e7``, clicks *whatever is now seventh*. On a page
that shifted underneath it, that is how an agent ends up clicking Delete when
it meant Cancel.

Nothing in Hermes rejected that before this module: a stale reference either
resolved to the wrong element or produced an unhelpful "element not found".

The contract
------------
* Taking a snapshot issues a new view id and returns it to the caller.
* Navigating voids every existing reference.
* An action that names an element may carry the view id it was planned
  against. If that id is not the current one, the action is **refused** with a
  message telling the caller to re-snapshot.

Deliberately optional
---------------------
Passing the id is not mandatory, matching OpenBot (``snapshotId?``). A caller
that omits it gets today's behaviour exactly. This keeps the change
behaviour-preserving for every existing call site and every model that has not
learned the parameter, while a caller that does pass it gets the protection.
The tool description is what teaches the model to echo it back.

Pure module: no browser, no I/O, no config. The three gate call sites are thin.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Dict, Optional

# The view id handed out before any snapshot has been taken. An action cannot
# legitimately carry this, so it is never a valid claim.
NO_VIEW = ""

_LOCK = threading.Lock()
_GENERATIONS: Dict[str, int] = {}


class StaleViewError(RuntimeError):
    """An action named an element from a page view that is no longer current.

    Carried as an exception rather than a falsy return so a gate call site
    cannot forget to check it — the three browser paths each have their own
    error-shaping code, and a silently-ignored return value would put us back
    where we started.
    """

    def __init__(self, claimed: str, current: str) -> None:
        self.claimed = claimed
        self.current = current
        super().__init__(
            f"Page view {claimed!r} is out of date (current view is "
            f"{current or 'none'!r}). The page changed since that snapshot, so "
            "element references from it may now point at different elements. "
            "Take a fresh snapshot and use the references from that."
        )


@dataclass(frozen=True)
class ViewState:
    """The current page view for one browser session."""

    session_key: str
    generation: int

    @property
    def view_id(self) -> str:
        return _format(self.generation)


def _format(generation: int) -> str:
    """Render a generation as the opaque id callers pass around.

    Opaque on purpose: the caller should echo it back, not do arithmetic on it.
    """
    if generation <= 0:
        return NO_VIEW
    return f"v{generation}"


def _key(session_key: Optional[str]) -> str:
    return str(session_key or "default")


def current_view_id(session_key: Optional[str]) -> str:
    """The id of the view a caller would be acting against right now."""
    with _LOCK:
        return _format(_GENERATIONS.get(_key(session_key), 0))


def note_snapshot(session_key: Optional[str]) -> str:
    """Record that a fresh snapshot was taken; return the new view id.

    Called *after* a successful snapshot, so a failed snapshot does not
    invalidate the references the caller is still legitimately holding.
    """
    key = _key(session_key)
    with _LOCK:
        _GENERATIONS[key] = _GENERATIONS.get(key, 0) + 1
        return _format(_GENERATIONS[key])


def note_navigation(session_key: Optional[str]) -> str:
    """Record that the page moved; every existing reference is now void.

    Separate from :func:`note_snapshot` because the two happen for different
    reasons, but they share the effect: the caller must look again.
    """
    return note_snapshot(session_key)


def check_view_id(session_key: Optional[str], claimed: Optional[str]) -> None:
    """Raise :class:`StaleViewError` when ``claimed`` is not the current view.

    A missing or empty claim is accepted — see the module docstring on why the
    parameter is optional. A claim made before any snapshot exists is refused,
    because there is no view it could honestly refer to.
    """
    if not claimed:
        return
    current = current_view_id(session_key)
    if claimed != current:
        raise StaleViewError(str(claimed), current)


def reset(session_key: Optional[str] = None) -> None:
    """Forget the counter for one session, or for all of them.

    Called when a session is closed or replaced. Resetting rather than
    continuing to count matters: a new session's first snapshot should be
    ``v1``, so an id held across a session boundary reads as stale.
    """
    with _LOCK:
        if session_key is None:
            _GENERATIONS.clear()
        else:
            _GENERATIONS.pop(_key(session_key), None)


def snapshot_state(session_key: Optional[str]) -> ViewState:
    """The full state, for callers that want to report it."""
    key = _key(session_key)
    with _LOCK:
        return ViewState(session_key=key, generation=_GENERATIONS.get(key, 0))


__all__ = [
    "NO_VIEW",
    "StaleViewError",
    "ViewState",
    "check_view_id",
    "current_view_id",
    "note_navigation",
    "note_snapshot",
    "reset",
    "snapshot_state",
]
