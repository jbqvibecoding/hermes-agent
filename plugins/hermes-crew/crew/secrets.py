"""Getting a password into a page without it passing through the teammate.

The alternative we shipped first was the whole screen: the teammate hits a
login wall, the operator opens noVNC, signs in by hand, and the session stays
in the browser. That still exists and is still right when somebody needs the
whole machine. It is heavy for the common case, which is one field.

So: the teammate **names the field it is stuck on**, the operator types into a
masked box, and the value goes straight into the page over CDP. What is stored
is the label — "password for Zendesk" — and nothing else. The value is a
parameter of one request: it is never written to ``crew.db``, never posted to
the thread, never returned to the model, and never logged.

Ported in shape from OpenBot's ``agent-computer/src/control.ts``. Two of its
rules matter more than the filling does, and both are about what happens to the
*bot* while a person is at the keyboard:

**While the human holds control, the bot's actions are refused — not queued.**
A queue sounds kinder and is worse: the click arrives after the person has
finished and walked away, at which point nobody is watching the thing it does.
A refusal is a fact the model can act on in the moment.

**The bot may ask for help; it may not hand itself over.** The asymmetry is
deliberate. A bot that can put a person in control of its screen can also put a
page in front of them that they did not ask to see, and "the assistant showed
me this, so I signed in" is the whole shape of a phishing flow. Control is
something a person takes, never something they are given.

The state machine below deliberately knows nothing about CDP, which is what
makes those rules testable without a browser — OpenBot's reason for the same
split.
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from typing import Optional

log = logging.getLogger(__name__)

#: A request nobody answers is not left open forever: the teammate is blocked
#: while it waits, and a stale box inviting somebody to type a password into it
#: is worse than an expired one.
REQUEST_TTL_S = 15 * 60

#: Who is driving.
BOT = "bot"
HUMAN = "human"


class ControlRefused(RuntimeError):
    """The bot tried to act while a person held the screen."""


@dataclass
class SecretRequest:
    """One "I need this field" ask. **Never holds the value.**"""

    bot_id: str
    ref: str
    field_label: str
    site: str
    why: str
    created_at: float

    def expired(self, *, now: Optional[float] = None) -> bool:
        return (now or time.time()) - self.created_at > REQUEST_TTL_S


class Control:
    """Who holds a teammate's screen, and what that means for the bot.

    In-process on purpose. A restart loses every pending request and returns
    control to the bot, which is the safe direction to fail: the alternative is
    a teammate frozen after a crash because a lock outlived the person holding
    it.
    """

    def __init__(self) -> None:
        self._holder: dict[str, str] = {}
        self._pending: dict[str, SecretRequest] = {}
        self._lock = threading.Lock()

    # -- who is driving ----------------------------------------------------

    def holder(self, bot_id: str) -> str:
        with self._lock:
            return self._holder.get(bot_id, BOT)

    def take(self, bot_id: str) -> None:
        """A person takes the screen. Always allowed — this is their machine."""
        with self._lock:
            self._holder[bot_id] = HUMAN

    def release(self, bot_id: str) -> None:
        """A person gives it back."""
        with self._lock:
            self._holder[bot_id] = BOT

    def bot_may_act(self, bot_id: str) -> bool:
        return self.holder(bot_id) == BOT

    def require_bot_turn(self, bot_id: str) -> None:
        """Raise unless the bot may act right now.

        Refusing rather than blocking is the point. A call that waits turns
        into a click that lands minutes later, when the person who was
        watching has gone.
        """
        if not self.bot_may_act(bot_id):
            raise ControlRefused(
                "Your operator is using this screen right now. Nothing you do here "
                "will land until they hand it back — say what you were about to do "
                "and wait to be asked again."
            )

    def bot_hands_over(self, bot_id: str) -> None:
        """Always refuses. The bot cannot put a person in front of a page.

        Exists as a named refusal rather than as an absent method so the reason
        is written down where somebody would look for the capability.
        """
        raise ControlRefused(
            "A teammate cannot hand its screen to a person — that would let it put "
            "a page in front of somebody who did not ask for one. Ask for what you "
            "need; taking the screen is your operator's move to make."
        )

    # -- asking for one field ---------------------------------------------

    def open_request(self, request: SecretRequest) -> SecretRequest:
        """Register a pending ask, replacing any earlier one for this teammate.

        One at a time. Two masked boxes open for the same teammate is a way to
        type the right password into the wrong field, and the teammate is
        blocked on the first one anyway.
        """
        with self._lock:
            self._pending[request.bot_id] = request
        return request

    def pending(self, bot_id: str) -> Optional[SecretRequest]:
        with self._lock:
            request = self._pending.get(bot_id)
        if request is None:
            return None
        if request.expired():
            self.close_request(bot_id)
            return None
        return request

    def take_request(self, bot_id: str, ref: str) -> Optional[SecretRequest]:
        """Claim the pending ask by its ref, or ``None``.

        By ref, not just by teammate: the operator is answering the box they
        were shown, and if it has been replaced since then they should be told
        rather than have their typing go somewhere else.
        """
        request = self.pending(bot_id)
        if request is None or request.ref != ref:
            return None
        self.close_request(bot_id)
        return request

    def close_request(self, bot_id: str) -> None:
        with self._lock:
            self._pending.pop(bot_id, None)


#: One per process, like the other crew registries.
control = Control()


def fill_secret(bot_id: str, request: SecretRequest, value: str) -> bool:
    """Type the value into the teammate's page. Returns whether it landed.

    The value arrives as an argument and leaves as keystrokes; it is not
    returned, not stored, and not logged — every log line here names the
    *field*, never what went into it.

    It goes to whatever input the page has focused. Deliberately not a selector
    the model supplied: a selector is chosen from page content, and page
    content is the thing we are least able to trust on a login wall. The
    operator can see the screen and the teammate has just told them which field
    it is stuck on, so focus is the one target both of them agree about.
    """
    from crew import computer as crew_computer

    if not value:
        return False
    try:
        cdp_url = (crew_computer.endpoints(bot_id) or {}).get("cdp_url")
        if not cdp_url:
            log.info("crew: no screen to fill %r on for %s", request.field_label, bot_id)
            return False
        return _type_into_focused(cdp_url, value)
    except Exception:
        # Never log the exception payload: a CDP error can quote the request
        # body, and the request body is the secret.
        log.warning("crew: could not fill %r for %s", request.field_label, bot_id)
        return False


def _type_into_focused(cdp_url: str, value: str) -> bool:
    """Send the characters to the focused element over CDP.

    ``Input.insertText`` rather than key events: it is one call, it does not
    have to model modifier state for characters outside ASCII, and a password
    with a non-ASCII character in it is exactly the case a key-by-key approach
    gets wrong.
    """
    import json
    import urllib.request

    from websocket import create_connection  # type: ignore[import-untyped]

    with urllib.request.urlopen(f"{cdp_url}/json", timeout=5) as response:
        targets = json.loads(response.read().decode("utf-8") or "[]")
    pages = [t for t in targets if t.get("type") == "page" and t.get("webSocketDebuggerUrl")]
    if not pages:
        return False

    socket = create_connection(pages[0]["webSocketDebuggerUrl"], timeout=10)
    try:
        socket.send(json.dumps({
            "id": 1, "method": "Input.insertText", "params": {"text": value},
        }))
        reply = json.loads(socket.recv() or "{}")
    finally:
        socket.close()
    return "error" not in reply
