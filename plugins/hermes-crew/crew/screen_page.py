"""The page the phone's WebView loads to watch a teammate's screen.

Served by the dashboard rather than shipped inside the app, which decides two
things I could not otherwise get right. The page comes from the same origin it
then connects back to, so ``connect-src 'self'`` is both correct and the
tightest rule available — a page bundled into the app would have to name the
dashboard's origin, which it only learns at pairing time. And a WebSocket
opened by a page the dashboard served is an ordinary same-origin request,
rather than a WebView-originated connection to a separate host, which is where
Android's cleartext rules bite on the LAN installs this product actually has.

The shape is cindy's ``mobileHtml.ts`` (Apache-2.0), and so is its central
habit: **nothing reaches the markup unvalidated.** Their version guards theme
colours with ``/^#[0-9a-f]{3,8}$/`` and says why — "Only theme token colors
enter markup. No device names, SDP, or remote HTML." Generalised here, because
our page interpolates a teammate id and a credential, which are worth more than
a colour.

Two differences from cindy's, both forced by what we are showing:

* ``connect-src 'self'`` rather than ``'none'``. Theirs receives frames from
  the native layer over ``postMessage``; ours speaks RFB to the dashboard
  directly. The exchange is an extra origin in the CSP for a viewer that needs
  no native relay and no base64 round trip per frame.
* ``script-src`` names a file instead of allowing inline script. Theirs inlines
  its runtime; ours is noVNC plus glue, which is far too large to inline and
  wants a cache anyway.
"""

from __future__ import annotations

import html
import re
from typing import Optional

#: A teammate id reaches this page from a URL. The ids this product mints are
#: slugs, and the database is the authority on whether one exists — this only
#: decides whether it is safe to *print*.
_SAFE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")

#: cindy's colour guard, kept as-is.
_SAFE_COLOR = re.compile(r"^#[0-9a-fA-F]{3,8}$")

#: The credential rides in the query string the page is fetched with and is
#: handed to the socket from JavaScript. Tickets and session tokens are both
#: opaque ASCII; anything else is not one of ours.
_SAFE_CREDENTIAL = re.compile(r"^[A-Za-z0-9._~+/=-]{1,512}$")

#: Paths this page prints: the socket it opens and the script it loads. Both
#: are built by the route from its own mount, never from anything a caller
#: sent, so this is a tripwire on our own plumbing rather than a sanitiser.
#:
#: One leading slash and no second one. ``//evil.test/x.js`` is a *path* by any
#: character test and a different origin to a browser, so a pattern that only
#: listed permitted characters would wave through the one value here worth
#: stopping. The CSP would also refuse to load it, but a guard that depends on
#: the next guard is not one.
_SAFE_PATH = re.compile(r"^/(?!/)[A-Za-z0-9/._-]{0,255}$")

DEFAULT_SURFACE = "#11131a"
DEFAULT_FOREGROUND = "#e9e9e9"

#: Everything the page may do, and nothing else. ``default-src 'none'`` means
#: each capability below had to be asked for by name.
CSP = (
    "default-src 'none'; "
    "script-src 'self'; "
    "style-src 'unsafe-inline'; "
    "img-src 'self' data:; "
    "connect-src 'self'; "
    "base-uri 'none'; "
    "form-action 'none'"
)


class UnsafeScreenPage(ValueError):
    """A value that will not be printed into the page.

    Raised rather than escaped-and-carried-on: every input here comes from our
    own URL builder, so a value that fails these patterns means something is
    wrong upstream, and rendering a working screen around it would hide that.
    """


def _checked(value: str, pattern: re.Pattern[str], what: str) -> str:
    if not isinstance(value, str) or not pattern.match(value):
        raise UnsafeScreenPage(f"{what} is not in the shape this page accepts")
    return value


def screen_page(
    *,
    bot_id: str,
    bot_name: str,
    auth_param: str,
    auth_value: str,
    socket_path: str,
    runtime_src: str,
    surface: str = DEFAULT_SURFACE,
    foreground: str = DEFAULT_FOREGROUND,
) -> str:
    """The whole HTML document, or raise :class:`UnsafeScreenPage`.

    ``bot_name`` is the only free-text value and is the one thing here a person
    typed, so it is HTML-escaped rather than pattern-matched — refusing to show
    a screen because somebody named a teammate ``Scout & Co`` would be absurd.
    Everything else is machine-generated and must match its shape exactly.
    """
    bot_id = _checked(bot_id, _SAFE_ID, "teammate id")
    auth_param = _checked(auth_param, re.compile(r"^(ticket|token)$"), "credential kind")
    auth_value = _checked(auth_value, _SAFE_CREDENTIAL, "credential")
    surface = _checked(surface, _SAFE_COLOR, "surface colour")
    foreground = _checked(foreground, _SAFE_COLOR, "foreground colour")
    runtime_src = _checked(runtime_src, _SAFE_PATH, "runtime path")
    socket_path = _checked(socket_path, _SAFE_PATH, "socket path")

    # Assembled here rather than in the page, so nothing in the page does
    # string arithmetic near a URL. Both halves have already been checked
    # against their patterns, so no escaping is being relied on.
    socket_url = f"{socket_path}?{auth_param}={auth_value}"

    return f"""<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{CSP}">
<title>{html.escape(bot_name)}</title>
<style>
  *{{box-sizing:border-box}}
  html,body{{margin:0;width:100%;height:100%;overflow:hidden;background:{surface};
    touch-action:none;overscroll-behavior:none;
    -webkit-user-select:none;user-select:none;-webkit-touch-callout:none}}
  #stage{{position:absolute;inset:0;overflow:hidden}}
  /* noVNC builds its own canvas in here; we own the geometry, so its own
     scaling is off and this element is moved by a transform instead. */
  #screen{{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}}
  #screen canvas{{display:block;image-rendering:auto}}
  /* Overscan the ambient layer so the blur cannot expose a clear strip at the
     edges — cindy's reason, and it is the difference between letterboxing that
     looks deliberate and letterboxing that looks broken. */
  #bg{{position:absolute;inset:0;filter:blur(18px);transform:scale(1.12);
    opacity:.5;pointer-events:none}}
  #bg canvas{{width:100%;height:100%}}
  #note{{position:absolute;left:0;right:0;bottom:0;padding:10px 14px;
    font:400 13px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;
    color:{foreground};background:linear-gradient(transparent,rgba(0,0,0,.55));
    text-align:center;pointer-events:none}}
  #note[hidden]{{display:none}}
</style>
</head><body>
<div id="bg"></div>
<div id="stage"><div id="screen"></div></div>
<div id="note">Connecting…</div>
<script type="module" src="{runtime_src}"></script>
<script type="application/json" id="config">{{"socketPath":"{socket_url}"}}</script>
</body></html>
"""
