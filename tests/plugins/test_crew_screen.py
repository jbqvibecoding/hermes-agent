"""Hermes Crew — a teammate's screen on a phone, and why it cannot be typed into.

`crew/computer.py` publishes a screen on loopback and says why it carries no
ticket: "websockify on loopback needs no ticket — there is no gateway to
authenticate to." From a phone, `127.0.0.1` is the phone. These cover the
gateway that makes the sentence false, and the two things that keep it from
being a hole in the wall:

* the proxy refuses an unauthenticated upgrade, using the dashboard's own gate
  rather than a comparison written here;
* input never reaches the teammate's machine, because the server drops it —
  not because the viewer politely declines to send it.

`crew.rfb_guard` has its own file; this is the wiring around it, plus the page
the WebView loads.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew import screen_page as crew_screen_page  # noqa: E402

PAGE = dict(
    bot_id="scout",
    bot_name="Scout",
    auth_param="token",
    auth_value="s3cret-token_value",
    socket_path="/api/plugins/hermes-crew/v1/bots/scout/screen",
    runtime_src="/api/plugins/hermes-crew/v1/screen/runtime.js",
)


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    crew_db.close_all()
    connection = crew_db.connect()
    crew_db.upsert_bot(connection, bot_id="scout", name="Scout", role="research")
    crew_db.ensure_dm_thread(connection, "scout")
    yield connection
    crew_db.close_all()


# ---------------------------------------------------------------------------
# The page
# ---------------------------------------------------------------------------


def test_the_page_can_do_only_the_four_things_it_needs():
    """`default-src 'none'` means every capability had to be asked for by name.

    Worth asserting rather than eyeballing: a CSP is a string, so a later edit
    adding one convenience can widen it without anybody noticing, and the
    widening is invisible until it matters.
    """
    csp = crew_screen_page.CSP

    assert "default-src 'none'" in csp
    assert "script-src 'self'" in csp
    assert "connect-src 'self'" in csp
    assert "base-uri 'none'" in csp
    # The two that would turn a screen viewer into an exfiltration path.
    assert "connect-src *" not in csp
    assert "script-src 'unsafe-inline'" not in csp
    assert crew_screen_page.CSP in crew_screen_page.screen_page(**PAGE)


def test_a_teammates_name_is_shown_but_escaped():
    """The one free-text value on the page is the one a person typed.

    Escaped rather than refused: declining to show a screen because somebody
    named a teammate `Scout & Co` would be absurd, and `&` is not an attack.
    """
    page = crew_screen_page.screen_page(**{**PAGE, "bot_name": '</title><script>x</script>'})

    assert "<script>x</script>" not in page
    assert "&lt;/title&gt;" in page


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("bot_id", "../../etc"),
        ("bot_id", 'scout" onload="x'),
        ("auth_value", 'tok"></script><script>steal()</script>'),
        ("auth_param", "cookie"),
        ("socket_path", "https://elsewhere.test/collect"),
        ("runtime_src", "//evil.test/x.js"),
        ("surface", "red; background:url(//evil.test)"),
    ],
)
def test_a_value_that_is_not_in_shape_refuses_the_page(field, value):
    """Refused, not escaped — and that is the deliberate part.

    Every value here is built by the route from its own mount and the
    dashboard's own ticket store. None of them is user input. So a value that
    fails its pattern does not mean somebody typed something odd; it means our
    own plumbing is wrong, and rendering a working screen around it would hide
    that. cindy's version of this habit is a colour regex with the comment
    "Only theme token colors enter markup"; this is the same idea applied to
    values that matter more than a colour.
    """
    with pytest.raises(crew_screen_page.UnsafeScreenPage):
        crew_screen_page.screen_page(**{**PAGE, field: value})


def test_the_socket_url_is_assembled_server_side():
    """So the page itself does no string arithmetic anywhere near a URL."""
    page = crew_screen_page.screen_page(**PAGE)

    assert '"socketPath":"/api/plugins/hermes-crew/v1/bots/scout/screen?token=s3cret-token_value"' in page


def test_the_runtime_is_loaded_as_a_module():
    """noVNC uses top-level await, so the bundle cannot be a classic script.

    Asserted because the page and the vite config have to agree about this and
    they are in different languages, in different directories, built by
    different commands.
    """
    page = crew_screen_page.screen_page(**PAGE)

    assert '<script type="module" src="/api/plugins/hermes-crew/v1/screen/runtime.js">' in page


# ---------------------------------------------------------------------------
# The proxy
# ---------------------------------------------------------------------------


def _api():
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "_crew_plugin_api_screen", _PLUGIN_ROOT / "dashboard" / "plugin_api.py"
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class _FakeWs:
    """Enough WebSocket for the route's refusal paths."""

    def __init__(self, params: dict[str, str] | None = None):
        self.query_params = params or {}
        self.client = type("C", (), {"host": "10.0.0.9"})()
        self.accepted = False
        self.closed: tuple[int, str] | None = None

    async def accept(self):
        self.accepted = True

    async def close(self, code: int = 1000, reason: str = ""):
        self.closed = (code, reason)

    async def receive_bytes(self):
        raise AssertionError("not reached in these tests")

    async def send_bytes(self, data: bytes):
        raise AssertionError("not reached in these tests")


def test_an_unauthenticated_upgrade_never_reaches_the_screen(conn, monkeypatch):
    """The gate runs before anything else, including before we look the
    teammate up — a 404 would otherwise tell an unauthenticated caller which
    teammate names exist."""
    api = _api()
    monkeypatch.setattr(api, "_ws_upgrade_authorized", lambda ws: False)
    reached = []
    monkeypatch.setattr(api.crew_db, "get_bot", lambda *a, **k: reached.append(1))

    ws = _FakeWs()
    asyncio.run(api.screen_ws("scout", ws))

    assert ws.closed == (api._SCREEN_UNAUTHORIZED, "")
    assert not ws.accepted
    assert reached == [], "looked the teammate up before checking the credential"


def test_a_teammate_with_no_screen_is_a_different_answer_from_no_teammate(
    conn, monkeypatch
):
    """Two different things for the operator to do about it, so two codes.

    "No such teammate" means the phone is stale and should re-list. "No screen
    running" means wait, or go and start one — the teammate is fine.
    """
    api = _api()
    monkeypatch.setattr(api, "_ws_upgrade_authorized", lambda ws: True)

    from crew import computer as crew_computer
    monkeypatch.setattr(crew_computer, "endpoints", lambda bot_id: {"vnc_ws_url": None})

    missing = _FakeWs()
    asyncio.run(api.screen_ws("nobody", missing))
    assert missing.closed[0] == api._SCREEN_NO_BOT

    screenless = _FakeWs()
    asyncio.run(api.screen_ws("scout", screenless))
    assert screenless.closed[0] == api._SCREEN_NO_SCREEN
    assert not screenless.accepted


def test_a_screen_that_is_not_on_loopback_is_refused(conn, monkeypatch):
    """The relay opens an outbound connection to an address it read out of
    stored state, which is the shape of every SSRF.

    `endpoints()` hardcodes `ws://127.0.0.1:{port}` today, so this cannot fire
    now — which is the point: it fires the day somebody changes that, instead
    of the relay quietly pointing somewhere new.
    """
    api = _api()
    monkeypatch.setattr(api, "_ws_upgrade_authorized", lambda ws: True)

    from crew import computer as crew_computer

    for url in (
        "ws://10.0.0.7:5900/websockify",
        "ws://127.0.0.1.evil.test/websockify",  # right prefix, wrong host
        "wss://elsewhere.test/websockify",
    ):
        monkeypatch.setattr(crew_computer, "endpoints", lambda b, u=url: {"vnc_ws_url": u})
        ws = _FakeWs()
        asyncio.run(api.screen_ws("scout", ws))
        assert ws.closed[0] == api._SCREEN_UPSTREAM, url
        assert not ws.accepted, url


def test_watching_a_screen_lands_in_the_ledger(conn, monkeypatch):
    """Watching a teammate work is privileged, so it leaves a row.

    The open is recorded before the relay starts rather than after it ends:
    a session that is still running, or that ended with the process, is
    exactly the one somebody would want to find.
    """
    api = _api()
    monkeypatch.setattr(api, "_ws_upgrade_authorized", lambda ws: True)

    from crew import audit as crew_audit
    from crew import computer as crew_computer
    monkeypatch.setattr(crew_computer, "endpoints", lambda b: {"vnc_ws_url": "ws://127.0.0.1:1/x"})

    # No upstream is listening, so the relay fails immediately — which is all
    # this test needs: the opening row must already be written by then.
    asyncio.run(api.screen_ws("scout", _FakeWs()))

    rows = crew_audit.query(conn, bot_id="scout", event_types=("screen.opened", "screen.closed"))
    kinds = {row["event_type"] for row in rows}
    assert kinds == {"screen.opened", "screen.closed"}
    assert any("10.0.0.9" in (row["detail"] or "") for row in rows), (
        "where it was watched from is the useful half of the row"
    )
