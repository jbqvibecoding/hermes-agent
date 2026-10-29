"""What is stuck, as a structure rather than a paragraph.

:mod:`crew.proactive.picker` already knows exactly what it is raising: a
``Candidate`` per stuck thing, with a typed subject (``approval:12``), the kind
of standstill, a sentence about it, and when it got stuck. Until this module
existed, :func:`crew.proactive.service.run_once` handed all of that to a small
model, took back forty words, and **threw the structure away** — the operator
got a paragraph, and if the model dropped or softened one of the three things,
nothing said so.

The model is openduet's ``MorningBrief`` (``server/src/openduet/brief.ts``,
MIT © CopilotKit), and the reason is its own:

    …because **the honest parts (an app that is not connected, a message the
    model could not sort) are easy for a model to smooth over and easy for code
    to report.** The Bot's part is the conversation around the brief, not the
    brief.

So the three fields that carry its argument come across directly: the items
themselves, ``could_not`` (its ``couldNotCheck``) for a source that could not be
read, and ``spoke`` for whether the words around them could be written at all.
A list that is quietly one short reads exactly like an honest one, which is the
whole failure this shape prevents.

This is the same correction `crew/effects.py` made for the other end of a turn:
there, what a turn *changed* stopped being the model's prose and became the tool
record. Here it is what a turn *noticed*.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

log = logging.getLogger(__name__)

_HOUR_MS = 3_600_000

#: The three things a subject can point at, which is every source
#: `picker.candidates_for` reads. A subject whose prefix is not one of these
#: gets no reference rather than a guessed one: the chip turns a reference into
#: a link, and a link to something that does not exist is worse than plain text.
REF_KINDS = ("approval", "task", "routine")


def ref_for(subject: str) -> Optional[dict]:
    """``approval:12`` → ``{"kind": "approval", "id": "12"}``, or ``None``.

    The subject is already a typed reference because it is the dedup key for
    the *thing* rather than the message — see ``Candidate.subject``. This only
    reads what is already there; it invents no identifiers.

    Split on the first colon only: a job id may contain one, and
    ``routine:scout:digest`` points at the job ``scout:digest``.
    """
    text = str(subject or "")
    kind, _, ident = text.partition(":")
    if kind not in REF_KINDS or not ident.strip():
        return None
    return {"kind": kind, "id": ident.strip()}


def stuck_for_hours(at_ms: Any, now_ms: int) -> int:
    """Whole hours since it got stuck, floored at zero.

    Not `picker.intensity`, which looks close but is a *score* — ``1.0 + days``,
    capped — built to rank candidates against each other. Rendering a ranking
    weight as an age would put "2.4" in front of a person.
    """
    try:
        age = int(now_ms) - int(at_ms or 0)
    except (TypeError, ValueError):
        return 0
    return max(0, age // _HOUR_MS)


def build(
    candidates: Any,
    *,
    now_ms: int,
    could_not: Any = (),
    spoke: bool = True,
) -> dict:
    """The payload the ``standstill`` chip is drawn from.

    Deliberately takes the candidates the caller already picked rather than
    picking its own: the chip has to list *what was raised*, and a second
    selection here could disagree with the one the dedup table recorded.
    """
    items = []
    for candidate in candidates or ():
        items.append({
            "subject": candidate.subject,
            "kind": candidate.kind,
            "summary": candidate.summary,
            "stuck_for_hours": stuck_for_hours(candidate.at_ms, now_ms),
            "ref": ref_for(candidate.subject),
        })
    return {
        "items": items,
        "could_not": [dict(entry) for entry in (could_not or ())],
        "spoke": bool(spoke),
    }
