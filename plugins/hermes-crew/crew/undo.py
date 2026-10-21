"""Putting back one thing a teammate changed.

conch-agent's ``ActivityEffect.undo`` "names the change set that puts it back,
**when one does**" — and that last clause is the whole design. Most of what a
turn does cannot be put back: an email is read, a shell command's side effects
are not inventoried, a page edit needs the body as it was and nothing stores
one. So this handles exactly the cases where the inverse needs no prior state,
which today means the crew's own creations, and `crew/effects.py` writes
``undo: NULL`` for everything else. The operator sees a button on precisely
those rows. **An undo that cannot honour itself is worse than no undo**, since
it converts "I can't fix this" into "I thought I had fixed this".

Two rules the dispatch table enforces rather than documents:

* **The operator does this, never a teammate.** A teammate that could erase
  its own trail is the exact inverse of the feature. There is no crew tool
  here and no model-facing path to one; the only caller is the dashboard
  route, which is also why the audit row's actor is the operator.
* **Already gone is not an error.** The page may have been deleted by hand
  since. The operator asked for it to not exist, and it does not exist, so the
  answer is "it was already gone" rather than a failure they have to
  interpret.
"""

from __future__ import annotations

import logging
from typing import Any, Callable

log = logging.getLogger(__name__)


class UndoError(Exception):
    """Why an inverse could not run. ``status`` maps to the route's code."""

    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.status = status


def _delete_page(conn, effect: dict, undo: dict) -> str:
    from crew import pages as crew_pages

    page_id = str(undo.get("page_id") or "")
    space_id = str(undo.get("space_id") or "")
    if not page_id or not space_id:
        raise UndoError("That change did not record which page it made.")
    removed = crew_pages.delete_page(conn, space_id=space_id, page_id=page_id)
    return "Deleted the page." if removed else "That page was already gone."


def _delete_routine(conn, effect: dict, undo: dict) -> str:
    from crew import routines as crew_routines

    job_id = str(undo.get("job_id") or "")
    if not job_id:
        raise UndoError("That change did not record which routine it made.")
    # `bot_id` comes off the effect row rather than the undo payload: routines
    # live in the teammate's own profile, so the inverse has to run there, and
    # the row is the one place that cannot disagree with who made the change.
    removed = crew_routines.delete_routine(str(effect.get("bot_id") or ""), job_id)
    return "Cancelled the routine." if removed else "That routine was already gone."


#: The closed set. A row whose ``undo.op`` is not here is refused rather than
#: guessed at — this is the one place in the plugin that deletes things.
_OPS: dict[str, Callable[[Any, dict, dict], str]] = {
    "delete_page": _delete_page,
    "delete_routine": _delete_routine,
}


def apply(conn, effect_id: str) -> dict:
    """Run the inverse named by one effect, and record that it ran."""
    from crew import audit as crew_audit
    from crew import effects as crew_effects

    effect = crew_effects.get(conn, effect_id)
    if effect is None:
        raise UndoError("No such change.", status=404)
    if effect.get("undone_at"):
        return {"ok": True, "detail": "That change was already undone.", **effect}

    undo = effect.get("undo")
    if not isinstance(undo, dict) or not undo.get("op"):
        raise UndoError("That change cannot be undone.", status=409)

    handler = _OPS.get(str(undo["op"]))
    if handler is None:
        raise UndoError("That change cannot be undone.", status=409)

    detail = handler(conn, effect, undo)

    # Marked only once the inverse has actually run. Marking first would leave
    # a row claiming to be undone after a failure, and the operator would stop
    # being offered the one button that still needs pressing.
    crew_effects.mark_undone(conn, effect_id)
    crew_audit.record(
        conn,
        event_type="effect.undone",
        bot_id=str(effect.get("bot_id") or ""),
        thread_id=str(effect.get("thread_id") or ""),
        turn_id=str(effect.get("turn_id") or ""),
        actor=crew_audit.ACTOR_OPERATOR,
        subject=f"undid: {effect.get('text') or ''}",
        detail=detail,
        status="ok",
    )
    return {"ok": True, "detail": detail, **(crew_effects.get(conn, effect_id) or effect)}
