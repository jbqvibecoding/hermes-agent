"""Pages where the operator's credential has just been typed in.

The masked box exists so a teammate never holds its operator's password: the
characters go from the operator's keyboard into the page, and the teammate is
told only that the field is filled. Both fill paths say so in as many words —
*"You did not see it and must not try to read it back."*

That sentence was the whole enforcement. A teammate with a computer holds
``browser_cdp``, a raw Chrome DevTools Protocol hatch bound to its own
container, and one ``Runtime.evaluate`` of ``document.activeElement.value``
reads back the value that was just typed into the focused control. The host's
own expression denylist (``tools/browser_tool.py``) catches two spellings of
that read and misses the obvious ones, and ``browser_cdp`` does not consult it
at all.

So this module. It does not try to enumerate the ways a value can be read —
that is the denylist's mistake, and a denylist on this surface is a list of the
spellings somebody thought of. It records *that a secret landed on this page*
and lets :func:`crew.policy.secret_floor` refuse the reading tools until the
page changes.

Held in memory, for the life of the process, as addresses only. Nothing in here
has ever seen a value and nothing in here is written down.

Ported from cindy's ``apps/desktop/src/main/input-handoff/secretTaint.ts``
(Apache-2.0). Two deliberate divergences, both because our shape differs from
theirs rather than because theirs is wrong — see ``NOTICE.md``:

* **Per teammate.** cindy has one owner at one desktop, so its map is global.
  A crew runs many teammates on many containers at once, and teammate A's
  login must not blind teammate B.
* **An unplaceable address holds the teammate.** cindy's ``markSecretEntered``
  returns without doing anything when it cannot parse the URL. Here that is the
  one case where we know a credential landed and cannot say where, so it holds
  every page for that teammate instead of none. A guard that switches itself
  off on the strange input is the fail-open we have already fixed once in this
  product.
"""

from __future__ import annotations

import threading
import time
from typing import Optional
from urllib.parse import urlsplit

#: How long a page stays held when nothing navigates away from it. Long enough
#: to cover a login that stalls on the same page, short enough that a teammate
#: left on a dead tab is not mute for the rest of the day.
TTL_SECONDS = 15 * 60

#: Per teammate. A page falls out when the cap is reached, oldest first — the
#: dict is insertion-ordered, which is what makes that the cheap operation.
MAX_PAGES = 32

#: The sentinel key for "a secret landed and we could not say where". Not a
#: page address, so no address can ever collide with it.
_WHOLE_BOT = "*"

_lock = threading.Lock()

#: ``{bot_id: {page_key: expires_at}}``.
_held: dict[str, dict[str, float]] = {}


def page_key(address: Optional[str]) -> Optional[str]:
    """``scheme://host/path`` for a page address, or ``None`` if unplaceable.

    Query and fragment are dropped: ``/signin?next=%2F`` and ``/signin`` are the
    same form to the person typing into it, and a page that rewrites its own
    query string after a submit must not thereby launder the hold.

    Only ``http`` and ``https`` can be placed. Anything else — a sandboxed
    document reporting ``self.origin`` as the string ``"null"``, a ``file://``
    URL, an empty read — is not a page we can name, and the caller treats that
    as the whole-teammate case rather than as nothing.
    """
    if not address:
        return None
    try:
        parts = urlsplit(address)
    except ValueError:
        return None
    if parts.scheme not in ("http", "https") or not parts.netloc:
        return None
    return f"{parts.scheme}://{parts.netloc}{parts.path}"


def _prune(pages: dict[str, float], now: float) -> None:
    for key in [key for key, until in pages.items() if until <= now]:
        del pages[key]


def mark_entered(bot_id: str, address: Optional[str], now: Optional[float] = None) -> None:
    """Record that a credential has just been typed into this teammate's page.

    Called on both fill paths — the operator's masked box and the vault — on
    success only. A value that never landed leaves nothing to read back.

    ``address`` that cannot be placed holds every page for this teammate until
    the hold expires. See the module docstring for why that direction.
    """
    if not bot_id:
        return
    moment = time.time() if now is None else now
    key = page_key(address) or _WHOLE_BOT
    with _lock:
        pages = _held.setdefault(bot_id, {})
        _prune(pages, moment)
        # Delete before setting so a page that is held again moves to the end of
        # the insertion order and is not the next one evicted.
        pages.pop(key, None)
        pages[key] = moment + TTL_SECONDS
        while len(pages) > MAX_PAGES:
            del pages[next(iter(pages))]


def has_tainted(bot_id: str, now: Optional[float] = None) -> bool:
    """Whether this teammate holds anything at all.

    The cheap question, asked first on every tool call so the floor costs a dict
    lookup when nothing is held — which is almost always. Only a true answer is
    worth a round trip to the page to find out *where* the teammate is.
    """
    if not bot_id:
        return False
    moment = time.time() if now is None else now
    with _lock:
        pages = _held.get(bot_id)
        if not pages:
            return False
        _prune(pages, moment)
        if not pages:
            del _held[bot_id]
            return False
        return True


def is_tainted(bot_id: str, address: Optional[str], now: Optional[float] = None) -> bool:
    """Whether reading this page would read back a credential.

    True when the teammate is held whole (see :func:`mark_entered`), or when
    this particular page is held. An address that cannot be placed is only ever
    checked against the whole-teammate hold, because an unnameable page is
    exactly what that hold is for.
    """
    if not bot_id:
        return False
    moment = time.time() if now is None else now
    with _lock:
        pages = _held.get(bot_id)
        if not pages:
            return False
        _prune(pages, moment)
        if not pages:
            del _held[bot_id]
            return False
        if _WHOLE_BOT in pages:
            return True
        key = page_key(address)
        return bool(key and key in pages)


def clear() -> None:
    """Tests only."""
    with _lock:
        _held.clear()
