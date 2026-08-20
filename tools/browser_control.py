"""Who is driving the browser — the agent, or a person who took the wheel.

Ported from CopilotKit's OpenBot (MIT) — ``agent-computer/src/control.ts``.

The situation it exists for
---------------------------
An agent working a real site walks into things it should not get past on its
own: a login form, a 2FA prompt, a CAPTCHA, a consent dialog that matters. Today
Hermes has no answer to this. It can *show* you the browser (Camofox exposes a
VNC URL and the agent is told to share it), but there is no protocol for you to
step in, do the bit only you can do, and hand it back. You watch it fail.

This module is that protocol. The agent raises a flag; you take the wheel; you
log in; you give it back; it carries on from a page it could not have reached.

Two properties are load-bearing
-------------------------------
**The agent cannot grant itself a human.** ``request_help`` only raises a flag.
Becoming the driver requires :func:`take`, which is called from a human-facing
surface — a CLI command, a chat button. An agent that could hand itself control
could also hand itself *back* control, and the whole thing would be decorative.

**While a person is driving, agent actions are refused, not queued.** Queuing
means the agent's click lands the moment you let go — possibly on a page you
navigated somewhere else entirely, possibly on top of what you were doing. A
refusal is information the agent can act on. This is OpenBot's choice
(``control.ts:195-197``) and it is the right one.

Deliberate divergence from OpenBot
----------------------------------
OpenBot refuses *every* bot action while a human holds control. Here, **reads
are allowed** — snapshot, console, screenshot. The reason is practical: after
you finish logging in, the agent has to look at the page to discover what
happened and where it now is. Blocking reads would leave it guessing, and an
agent guessing about a page it just got handed is worse than one that can see
it. Reads cannot disturb the person driving; actions can.

Purity
------
Zero browser imports, exactly as ``control.ts`` has zero Playwright imports.
The three gate call sites are thin, and everything worth testing is testable
without starting Chromium.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, replace
from typing import Dict, Optional

from tools import browser_commands

AGENT = "agent"
HUMAN = "human"


class HumanHasControlError(RuntimeError):
    """The agent tried to act on a browser a person is currently driving."""

    def __init__(self, since: float, reason: str = "") -> None:
        self.since = since
        self.reason = reason
        held_for = max(0, int(time.time() - since)) if since else 0
        detail = f" They took over because: {reason}" if reason else ""
        super().__init__(
            "A person is driving this browser right now "
            f"(for the last {held_for}s), so this action was refused rather "
            "than queued — running it later could land it on a completely "
            f"different page.{detail} You can still read the page (snapshot, "
            "console) to follow along. Wait for them to hand control back."
        )


@dataclass(frozen=True)
class ControlState:
    """Who holds the wheel for one browser session."""

    holder: str = AGENT
    since: float = 0.0
    #: Why the agent asked for help. Set by request_help, cleared on release.
    reason: str = ""
    #: True once the agent has asked and before anyone has answered.
    requested: bool = False

    @property
    def human_driving(self) -> bool:
        return self.holder == HUMAN

    def to_dict(self) -> Dict[str, object]:
        return {
            "holder": self.holder,
            "since": self.since,
            "reason": self.reason,
            "requested": self.requested,
        }


_LOCK = threading.Lock()
_STATES: Dict[str, ControlState] = {}

# Event names, kept as literals so this module still imports nothing that could
# reach a browser. tools/tool_audit.py holds the canonical vocabulary; these
# must match its BROWSER_* constants, which test_browser_control_audit asserts.
_AUDIT_HELP_REQUESTED = "browser.help_requested"
_AUDIT_CONTROL_TAKEN = "browser.control_taken"
_AUDIT_CONTROL_RELEASED = "browser.control_released"


def _audit(event: str, **fields: object) -> None:
    """Record a handover event durably (B4).

    Handovers are the one thing here with no other record: nothing in the
    transcript says a person took the wheel at 14:02 and gave it back at 14:05,
    and that is exactly the window an operator would want to reconstruct.

    Imported lazily and guarded so this module keeps its "pure state machine"
    property — auditing must not be able to break a handover.
    """
    try:
        from tools.tool_audit import record

        record(event, **fields)
    except Exception:  # noqa: BLE001 — see docstring
        pass


def _key(session_key: Optional[str]) -> str:
    return str(session_key or "default")


def get_state(session_key: Optional[str]) -> ControlState:
    """The current state; a session nobody has touched is agent-driven."""
    with _LOCK:
        return _STATES.get(_key(session_key), ControlState())


def request_help(session_key: Optional[str], reason: str = "") -> ControlState:
    """The agent asks for a person. **This does not hand over control.**

    It raises a flag that a human-facing surface can show. Control changes
    only when a person calls :func:`take`. Calling this repeatedly is
    harmless — the most recent reason wins, which is what you want when an
    agent refines its description of what it is stuck on.
    """
    key = _key(session_key)
    with _LOCK:
        state = _STATES.get(key, ControlState())
        state = replace(state, requested=True, reason=str(reason or "").strip())
        _STATES[key] = state
    _audit(_AUDIT_HELP_REQUESTED, session=key, reason=state.reason)
    return state


def take(session_key: Optional[str], reason: str = "") -> ControlState:
    """A person takes the wheel.

    Callable whether or not the agent asked — a person watching something go
    wrong should not have to wait for the agent to notice. Idempotent: taking
    control you already hold keeps the original ``since``, so "how long have
    they been driving" stays honest.
    """
    key = _key(session_key)
    with _LOCK:
        state = _STATES.get(key, ControlState())
        if state.human_driving:
            return state
        state = ControlState(
            holder=HUMAN,
            since=time.time(),
            reason=str(reason or "").strip() or state.reason,
            requested=False,
        )
        _STATES[key] = state
    _audit(_AUDIT_CONTROL_TAKEN, session=key, reason=state.reason)
    return state


def release(session_key: Optional[str]) -> ControlState:
    """The person hands the browser back to the agent.

    Clears the reason as well as the holder: the next time the agent asks for
    help it should say why afresh, not inherit last time's excuse.
    """
    key = _key(session_key)
    with _LOCK:
        state = ControlState(
            holder=AGENT, since=time.time(), reason="", requested=False
        )
        _STATES[key] = state
    _audit(_AUDIT_CONTROL_RELEASED, session=key)
    return state


def human_may_drive(session_key: Optional[str]) -> bool:
    """True when human input should be accepted for this session."""
    return get_state(session_key).human_driving


def assert_agent_may_act(session_key: Optional[str], command: str) -> None:
    """Raise :class:`HumanHasControlError` if the agent may not run ``command``.

    Reads are always allowed — see the module docstring on why this diverges
    from OpenBot. Anything not classified as a read counts as an action,
    including verbs nobody has classified yet, so a newly added command is
    gated by default rather than exempt by default.
    """
    if browser_commands.is_read(command):
        return
    state = get_state(session_key)
    if state.human_driving:
        raise HumanHasControlError(state.since, state.reason)


def reset(session_key: Optional[str] = None) -> None:
    """Forget one session's control state, or all of them.

    Called when a browser session ends. A fresh session is agent-driven: a
    person who took control of a browser that no longer exists is not still
    holding a wheel.
    """
    with _LOCK:
        if session_key is None:
            _STATES.clear()
        else:
            _STATES.pop(_key(session_key), None)


def sessions_with_human_control() -> Dict[str, ControlState]:
    """Every session a person is currently driving, for status surfaces."""
    with _LOCK:
        return {k: v for k, v in _STATES.items() if v.human_driving}


def pending_help_requests() -> Dict[str, ControlState]:
    """Every session where the agent has asked for help and nobody answered."""
    with _LOCK:
        return {k: v for k, v in _STATES.items() if v.requested and not v.human_driving}


__all__ = [
    "AGENT",
    "HUMAN",
    "ControlState",
    "HumanHasControlError",
    "assert_agent_may_act",
    "get_state",
    "human_may_drive",
    "pending_help_requests",
    "release",
    "request_help",
    "reset",
    "sessions_with_human_control",
    "take",
]
