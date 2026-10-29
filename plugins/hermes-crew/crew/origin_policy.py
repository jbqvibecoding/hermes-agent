"""Where the operator is actually about to type, and what is odd about it.

``ask_for_login`` takes a ``site`` string from the teammate and the login card
used to render it as the heading: *"The password for Zendesk"*. That string is
the model's claim. A teammate talked onto a lookalike by something it read
mid-task — the case the taint floor already exists for — asks for the Zendesk
password while the page in front of it is somewhere else, and the operator has
no way to tell from the card.

The argument for reading this from the page rather than believing the teammate
was already written in this tree, one function away: ``_fill_from_vault`` reads
the origin from the live page precisely so a teammate on a lookalike "finds
nothing saved". That protected *saved* credentials. It was never carried to the
path where the operator supplies a fresh one, which is the more dangerous of
the two.

So the card now leads with the origin this module classifies, read from the
page, and the teammate's ``site`` and ``why`` are shown as what the teammate
says. The operator can compare them, which is the entire point.

Ported from cindy's ``apps/desktop/src/main/input-handoff/originPolicy.ts``
(Apache-2.0), including its central decision: **a warning cautions, it never
blocks.** An origin is shown verbatim so the operator sees where the value
goes; refusing to post the card because the host is an IP address would stop
ordinary work on a staging box, and the operator is better placed than we are
to know whether this particular IP is theirs.

cindy's ``isBrowserBundle``/``BROWSER_BUNDLES`` is not ported. It decides
whether a macOS application's page origin is the meaningful identity of what is
being typed into; every surface we have is a containerised Chromium, so the
answer here is always yes.
"""

from __future__ import annotations

import re
from typing import NamedTuple, Optional
from urllib.parse import urlsplit

#: The warnings, in the order :func:`classify` tests them. Each is a reason the
#: operator might want to look twice, not a reason to stop.
WARNINGS = ("local-file", "local-host", "ip-address", "punycode", "insecure")

#: What each warning says on the card. One line, in the operator's terms: not
#: "punycode" but what punycode does to them.
WARNING_TEXT = {
    "local-file": "This is a local file, not a website.",
    "local-host": "This is a page on the teammate's own machine.",
    "ip-address": "This is a bare IP address, with no site name to check.",
    "punycode": "This site's name uses look-alike characters.",
    "insecure": "This connection is not encrypted.",
}

_IPV4 = re.compile(r"^\d{1,3}(\.\d{1,3}){3}$")


class Origin(NamedTuple):
    """What the card shows above the box.

    ``origin`` is ``None`` when the page could not be placed at all — which the
    card states rather than passing over, because "we could not confirm where
    this is" is information the operator needs before they type a password.
    """

    origin: Optional[str]
    warning: Optional[str]

    @property
    def warning_text(self) -> Optional[str]:
        return WARNING_TEXT.get(self.warning or "")


def classify(address: Optional[str]) -> Origin:
    """The origin to show the operator, and the one thing odd about it.

    Only the first warning is reported. They are ordered by how much they
    should change the operator's mind, and a card that lists four caveats about
    one address reads as noise rather than as a warning.
    """
    if not address:
        return Origin(None, None)
    try:
        parts = urlsplit(address)
    except ValueError:
        return Origin(None, None)

    scheme = parts.scheme.lower()
    if scheme in ("file", "data", "blob"):
        return Origin(f"{scheme}://", "local-file")
    if scheme not in ("http", "https") or not parts.netloc:
        return Origin(None, None)

    host = (parts.hostname or "").lower()
    if not host:
        return Origin(None, None)
    origin = f"{scheme}://{parts.netloc}"

    if (
        host in ("localhost", "127.0.0.1", "::1", "[::1]")
        or host.endswith(".localhost")
        or host.endswith(".local")
    ):
        return Origin(origin, "local-host")
    # ``hostname`` strips the brackets from an IPv6 literal, so the colon is
    # what is left to recognise it by.
    if _IPV4.match(host) or ":" in host:
        return Origin(origin, "ip-address")
    if any(label.startswith("xn--") for label in host.split(".")):
        return Origin(origin, "punycode")
    if scheme == "http":
        return Origin(origin, "insecure")
    return Origin(origin, None)
