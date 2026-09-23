"""Deciding a tool call, without asking the operator about every one of them.

A grant table alone produces one of two bad products. Set the defaults loose
and the guard is decoration. Set them tight and the operator is asked to
approve a file read, learns the cards are noise, and starts clicking Approve
without reading — which is worse than not having asked, because now there is a
record of consent.

Ported from rowboat's ladder (``runtime/assembly/permission-metadata.ts`` into
``core/src/security/auto-permission-classifier.ts``): decide what can be
decided by rule, and only spend a person on what is genuinely ambiguous.

    1. The grant table. An explicit row is the operator's own instruction and
       nothing may overturn it.
    2. The risk table (``grants.default_mode``). Deterministic, readable, and
       written down in one place.
    3. A classifier, for the tools the risk table did not recognise. Cheap
       model, one question: is this call clearly consistent with what the
       operator asked for, and low risk?
    4. The operator.

Stage 3 is the only one that can be wrong in an interesting way, so it is
fail-safe by construction: *any* failure — no model, a timeout, an unparseable
answer — resolves to ``ask``. It can move a call from "unknown" to "allow", and
it is never consulted about a call the operator has ruled on.
"""

from __future__ import annotations

import logging
import sqlite3
from dataclasses import dataclass
from typing import Any, Optional

from crew import grants as crew_grants

log = logging.getLogger(__name__)

#: The classifier gets one short question and a small budget. It is deciding
#: whether to spend the operator's attention, not doing the work.
_CLASSIFIER_MAX_TOKENS = 64
_ARG_PREVIEW_CHARS = 400
#: Short on purpose: this sits in front of a tool call the teammate is waiting
#: on, and a slow answer is worse than falling back to asking the operator.
_CLASSIFIER_TIMEOUT_S = 12

_CLASSIFIER_SYSTEM = """You decide whether an AI teammate's tool call needs its operator's approval.

Answer with one word: ALLOW or ASK.

ALLOW when the call only reads, researches, or writes inside the teammate's own
workspace, and is clearly consistent with ordinary work.

ASK when the call reaches a person, a shared system, money, a calendar, or
anything physical; when it is destructive or hard to undo; when it is broader
than the work seems to need; or when you are unsure.

When in doubt, answer ASK."""


@dataclass(frozen=True)
class Verdict:
    mode: str
    why: str
    source: str

    @property
    def allowed(self) -> bool:
        return self.mode == "allow"


def evaluate(
    conn: sqlite3.Connection,
    bot_id: str,
    tool: str,
    args: Any = None,
    *,
    classify: bool = True,
) -> Verdict:
    """Decide one tool call.

    ``classify=False`` skips the model — used by the tests and by any path
    where a round trip would be worse than asking.
    """
    decision = crew_grants.decide(conn, bot_id, tool)

    # An explicit grant, a protected tool, or a risk rule that recognised this
    # tool: all three are settled. The classifier is not a second opinion on
    # the operator's own instruction.
    if decision.source != "default" or decision.why != crew_grants._UNKNOWN_WHY:  # noqa: SLF001
        return Verdict(decision.mode, decision.why, decision.source)

    if not classify:
        return Verdict(decision.mode, decision.why, decision.source)

    guessed = _classify(tool, args)
    if guessed == "allow":
        return Verdict("allow", "this looked like ordinary work for this teammate", "classifier")
    return Verdict("ask", decision.why, decision.source)


def _classify(tool: str, args: Any) -> str:
    """Ask a small model. Returns ``"allow"`` or ``"ask"``; never raises.

    Every failure lands on ``ask``. A classifier that fails open turns one
    outage into an unguarded teammate, and the cost of being wrong the other
    way is one card the operator did not need to see.
    """
    try:
        preview = repr(args)[:_ARG_PREVIEW_CHARS] if args else "(no arguments)"
        answer = _ask_model(f"Tool: {tool}\nArguments: {preview}")
        # The word on its own, not a prefix. A model that answers "ALLOW it I
        # guess, though it might need approval" has not given a clear allow,
        # and a prefix match would read its hesitation as consent — which is
        # the one direction this stage is not permitted to be wrong in.
        return "allow" if (answer or "").strip().strip(".!").upper() == "ALLOW" else "ask"
    except Exception:
        log.debug("crew: permission classifier unavailable; asking", exc_info=True)
        return "ask"


def _ask_model(question: str) -> Optional[str]:
    """One completion through Hermes's auxiliary client.

    The auxiliary client is the host's own facility for small side questions.
    It resolves the *active profile's* provider and credentials, and crew turns
    run inside a HERMES_HOME override, so this inherits whatever the teammate
    itself is configured with rather than needing a key of its own.

    ``crew_permission`` is a task name, so an operator can point just this at a
    cheaper model with ``auxiliary.crew_permission.model`` without touching
    anything else the teammate does.
    """
    from agent.auxiliary_client import get_auxiliary_extra_body, get_text_auxiliary_client

    client, model = get_text_auxiliary_client("crew_permission")
    if client is None or not model:
        return None

    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": _CLASSIFIER_SYSTEM},
            {"role": "user", "content": question},
        ],
        temperature=0,
        max_tokens=_CLASSIFIER_MAX_TOKENS,
        timeout=_CLASSIFIER_TIMEOUT_S,
        extra_body=get_auxiliary_extra_body() or None,
    )
    return (response.choices[0].message.content or "") if response.choices else None
