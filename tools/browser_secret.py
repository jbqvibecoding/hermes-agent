"""Let a person type a password the agent never sees.

Ported from CopilotKit's OpenBot (MIT) — the ``/control/secret`` +
``/human/secret`` pair in ``agent-computer/src/index.ts:510-561``.

The problem
-----------
An agent working a real site reaches a login form. Today the only way past it
is for the password to travel *through the agent*: into its context, into the
transcript, into the session database, into whatever the transcript is later
summarised into. Hermes redacts secrets on the way out to a display, but
redaction is a filter over something you already have. The stronger property is
not having it.

The contract
------------
1. The agent says "field ``@e7`` needs the admin password" — it names the field
   and gives a label. It supplies no value and receives none.
2. A person is shown the label, types the value, and it is filled into that
   field directly.
3. The agent is told ``{"supplied": true, "characters": 12}``.

The number of characters is deliberate and is the *only* thing about the value
that escapes: it lets the agent tell "they filled it in" from "they cancelled",
and lets it notice a field that silently truncated. OpenBot returns the same.

What this module guarantees
---------------------------
* The value is never stored on any module-level structure. It exists as a local
  variable for the duration of one call and is handed straight to the filler.
* The value is never returned to the caller, never logged, and never placed in
  an audit record.
* A request is **one-shot**: supplying clears it. A second call with no fresh
  request fails rather than re-filling a field the agent has moved on from.

Purity
------
No browser imports. The actual typing is done by a ``filler`` callable the
browser layer passes in, which is what keeps this testable without Chromium and
keeps the module honest — it cannot quietly stash the value somewhere on its
way to a page it also owns.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Callable, Dict, Optional


class SecretRequestError(RuntimeError):
    """A secret was supplied when nothing was waiting for one."""


class SecretFillError(RuntimeError):
    """The value could not be typed into the field that asked for it."""


@dataclass(frozen=True)
class SecretRequest:
    """A pending "please type this for me" from the agent.

    Holds the *field* and the *label* only. There is no field on this object
    for the value, which is the point: there is nowhere for it to be kept.
    """

    session_key: str
    ref: str
    label: str
    requested_at: float

    def to_dict(self) -> Dict[str, object]:
        return {
            "session_key": self.session_key,
            "ref": self.ref,
            "label": self.label,
            "requested_at": self.requested_at,
        }


_LOCK = threading.Lock()
_PENDING: Dict[str, SecretRequest] = {}

# Kept as literals so this module imports nothing that could reach a browser.
# Must match the BROWSER_SECRET_* constants in tools/tool_audit.py.
_AUDIT_REQUESTED = "browser.secret_requested"
_AUDIT_SUPPLIED = "browser.secret_supplied"


def _audit(event: str, **fields: object) -> None:
    """Record that a secret was asked for or supplied — never what it was.

    The record carries the field, the label and the character count. That is
    the same thing the agent is told, and deliberately so: the audit log must
    not become the one place the password ended up.
    """
    try:
        from tools.tool_audit import record

        record(event, **fields)
    except Exception:  # noqa: BLE001 — auditing must not break the fill
        pass


def _key(session_key: Optional[str]) -> str:
    return str(session_key or "default")


def request_secret(
    session_key: Optional[str], ref: str, label: str = ""
) -> SecretRequest:
    """The agent asks a person to fill one field. Returns the pending request.

    Replacing an outstanding request is allowed — an agent that re-reads the
    page and finds the password field is now ``@e9`` should be able to correct
    itself rather than being stuck asking about a field that no longer exists.
    """
    ref = str(ref or "").strip()
    if not ref:
        raise SecretRequestError("a secret request must name the field to fill")
    key = _key(session_key)
    request = SecretRequest(
        session_key=key,
        ref=ref,
        label=str(label or "").strip() or "a password",
        requested_at=time.time(),
    )
    with _LOCK:
        _PENDING[key] = request
    _audit(_AUDIT_REQUESTED, session=key, ref=request.ref, label=request.label)
    return request


def pending_secret(session_key: Optional[str]) -> Optional[SecretRequest]:
    """What the agent is waiting for a person to type, if anything."""
    with _LOCK:
        return _PENDING.get(_key(session_key))


def cancel_secret(session_key: Optional[str]) -> bool:
    """Withdraw a pending request. True if there was one."""
    with _LOCK:
        return _PENDING.pop(_key(session_key), None) is not None


def supply_secret(
    session_key: Optional[str],
    value: str,
    *,
    filler: Callable[[str, str], None],
) -> Dict[str, object]:
    """A person supplies the value; it is typed into the field that asked.

    ``filler`` is called as ``filler(ref, value)`` and is expected to type the
    value into that element. It is injected rather than imported so this module
    never touches a browser, and so a test can assert what was typed without
    this module ever having a way to keep it.

    Returns ``{"supplied": True, "characters": n, "ref": ..., "label": ...}``.
    **The value is not in the return.** It is not logged. It is not stored.

    Raises :class:`SecretRequestError` when nothing is pending — a value
    arriving with no request behind it is a mistake, and filling *something*
    with it would be worse than refusing.
    """
    key = _key(session_key)
    with _LOCK:
        request = _PENDING.get(key)
        if request is None:
            raise SecretRequestError(
                "nothing is waiting for a secret on this browser session"
            )
        # Cleared before the fill, not after: a filler that throws must not
        # leave the request open for a second attempt with a value the agent
        # has already been told about.
        del _PENDING[key]

    characters = len(value or "")
    # Only the exception *type* is ever carried out of here. A filler that
    # interpolated the value into its own message must not leak it through us.
    #
    # Two subtleties, both load-bearing:
    #
    # * ``raise ... from None`` is not enough on its own. It sets
    #   ``__suppress_context__``, which stops the traceback being *printed*,
    #   but ``__context__`` still references the original exception and its
    #   message. Anything that walks the chain — a structured logger, an error
    #   reporter — would find the value sitting there.
    # * Clearing ``__context__`` inside the ``except`` block does not work
    #   either: the interpreter re-attaches the active exception at ``raise``
    #   time. So the failure is *recorded* in the handler and *raised* outside
    #   it, where there is no active exception to attach.
    failure: Optional[SecretFillError] = None
    try:
        filler(request.ref, value)
    except Exception as exc:  # noqa: BLE001 — re-raised as a typed error
        failure = SecretFillError(
            f"could not type the secret into {request.ref}: {type(exc).__name__}"
        )
        del exc

    if failure is not None:
        _audit(
            _AUDIT_SUPPLIED,
            session=key,
            ref=request.ref,
            label=request.label,
            characters=characters,
            filled=False,
        )
        raise failure

    _audit(
        _AUDIT_SUPPLIED,
        session=key,
        ref=request.ref,
        label=request.label,
        characters=characters,
        filled=True,
    )
    return {
        "supplied": True,
        "characters": characters,
        "ref": request.ref,
        "label": request.label,
    }


def reset(session_key: Optional[str] = None) -> None:
    """Drop pending requests for one session, or all of them."""
    with _LOCK:
        if session_key is None:
            _PENDING.clear()
        else:
            _PENDING.pop(_key(session_key), None)


def all_pending() -> Dict[str, SecretRequest]:
    """Every outstanding request, for a status surface to display."""
    with _LOCK:
        return dict(_PENDING)


__all__ = [
    "SecretFillError",
    "SecretRequest",
    "SecretRequestError",
    "all_pending",
    "cancel_secret",
    "pending_secret",
    "request_secret",
    "reset",
    "supply_secret",
]
