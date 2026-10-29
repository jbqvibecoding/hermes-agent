"""Hermes Crew — what the operator typed limits what the teammate may read.

The masked box's promise is that a teammate never holds its operator's
password. Until this round that promise was a sentence in a tool result
(*"You did not see it and must not try to read it back"*) addressed to the one
party with both the motive and the means to ignore it: a teammate holding
``browser_cdp``, a raw CDP hatch bound to its own container, one
``Runtime.evaluate`` away from ``document.activeElement.value``.

Two modules close it, and the tests here are mostly about their edges rather
than their happy paths, because the edges are where a guard like this fails
quietly:

* a hold must survive the page rewriting its own query string;
* it must expire, or a teammate on a dead tab goes mute for the day;
* it must be *this* teammate's, or one login blinds the whole crew;
* and the case where we cannot name the page at all must hold more, not less.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew import origin_policy  # noqa: E402
from crew import secret_taint  # noqa: E402

_SIGNIN = "https://login.example.com/signin"


@pytest.fixture(autouse=True)
def _clean():
    secret_taint.clear()
    yield
    secret_taint.clear()


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    """A throwaway crew.db with one teammate and a vault key of its own."""
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    monkeypatch.setenv("HERMES_CREW_HOME", str(tmp_path))
    crew_db.close_all()
    connection = crew_db.connect()
    crew_db.upsert_bot(connection, bot_id="scout", name="Scout", role="research")
    crew_db.ensure_dm_thread(connection, "scout")
    yield connection
    crew_db.close_all()


# ---------------------------------------------------------------------------
# What counts as the same page
# ---------------------------------------------------------------------------


def test_the_hold_covers_the_same_page_whatever_the_query_string_says():
    """Query and fragment are not part of the page's identity here.

    A login form that appends ``?error=1`` to its own URL after a failed submit
    has not moved the operator anywhere, and if that re-spelling lifted the
    hold then the one moment the credential is most certainly still in the
    field would be the moment reading it back became allowed.
    """
    secret_taint.mark_entered("scout", f"{_SIGNIN}?next=%2Finbox#form", now=0)

    assert secret_taint.is_tainted("scout", _SIGNIN, now=1)
    assert secret_taint.is_tainted("scout", f"{_SIGNIN}?error=1", now=1)


def test_a_different_path_on_the_same_host_is_not_held():
    """The host is not the unit. The page is.

    Holding a whole origin would mute a teammate across an entire site after
    one login — and the value was typed into one form, which the operator has
    now left.
    """
    secret_taint.mark_entered("scout", _SIGNIN, now=0)

    assert not secret_taint.is_tainted("scout", "https://login.example.com/inbox", now=1)
    assert not secret_taint.is_tainted("scout", "https://other.example.com/signin", now=1)


def test_the_hold_expires():
    secret_taint.mark_entered("scout", _SIGNIN, now=0)

    assert secret_taint.is_tainted("scout", _SIGNIN, now=secret_taint.TTL_SECONDS - 1)
    assert not secret_taint.is_tainted("scout", _SIGNIN, now=secret_taint.TTL_SECONDS + 1)
    assert not secret_taint.has_tainted("scout", now=secret_taint.TTL_SECONDS + 1)


# ---------------------------------------------------------------------------
# Whose hold it is
# ---------------------------------------------------------------------------


def test_one_teammates_login_does_not_blind_another():
    """cindy's map is global because cindy has one owner at one desktop.

    A crew runs many teammates on many containers at once. If the hold were
    global, every login by any teammate would stop every other teammate from
    reading any page — and the product's whole shape is several of them working
    at the same time.
    """
    secret_taint.mark_entered("scout", _SIGNIN, now=0)

    assert secret_taint.is_tainted("scout", _SIGNIN, now=1)
    assert not secret_taint.is_tainted("archivist", _SIGNIN, now=1)
    assert not secret_taint.has_tainted("archivist", now=1)


def test_has_tainted_is_false_before_anything_and_after_everything():
    """The floor asks this first on every call, so its false case is the hot one."""
    assert not secret_taint.has_tainted("scout")
    secret_taint.mark_entered("scout", _SIGNIN, now=0)
    assert secret_taint.has_tainted("scout", now=1)
    assert not secret_taint.has_tainted("scout", now=secret_taint.TTL_SECONDS + 1)


# ---------------------------------------------------------------------------
# The page we cannot name
# ---------------------------------------------------------------------------


def test_a_secret_on_an_unplaceable_page_holds_every_page_for_that_teammate():
    """Our one deliberate reversal of cindy's module.

    cindy's ``markSecretEntered`` returns without doing anything when it cannot
    parse the URL — its test is named "ignores pages it cannot place". But the
    call only happens *because a credential just landed*, so the unparseable
    case is not "nothing happened", it is "something happened and we cannot say
    where". Holding nothing there would mean the one situation we understand
    least is the one we protect least.

    A sandboxed document reaches us as the string ``"null"`` from
    ``self.origin``, which is exactly this case.
    """
    secret_taint.mark_entered("scout", "null", now=0)

    assert secret_taint.has_tainted("scout", now=1)
    assert secret_taint.is_tainted("scout", _SIGNIN, now=1)
    assert secret_taint.is_tainted("scout", "https://anywhere.example.com/x", now=1)
    # Still a hold, not a permanent one.
    assert not secret_taint.is_tainted("scout", _SIGNIN, now=secret_taint.TTL_SECONDS + 1)


def test_an_unreadable_address_is_checked_against_the_whole_teammate_hold():
    """Both halves of the unplaceable case, from the reading side.

    When the floor cannot read where the teammate is, it must not get a free
    "not held" out of that — but equally, an unreadable address on a teammate
    holding nothing is not grounds to refuse. The first is this product's own
    fail-open lesson; the second is what keeps the floor free in the common
    case.
    """
    assert not secret_taint.is_tainted("scout", None)
    assert not secret_taint.is_tainted("scout", "null")

    secret_taint.mark_entered("scout", _SIGNIN, now=0)
    # A named hold says nothing about an address we cannot place.
    assert not secret_taint.is_tainted("scout", None, now=1)

    secret_taint.mark_entered("scout", None, now=1)
    assert secret_taint.is_tainted("scout", None, now=2)


def test_no_bot_id_is_never_held():
    """A call with no teammate behind it cannot be placed either, and the floor
    steps aside rather than refusing every tool in the process."""
    secret_taint.mark_entered("", _SIGNIN, now=0)
    assert not secret_taint.has_tainted("", now=1)
    assert not secret_taint.is_tainted("", _SIGNIN, now=1)


def test_the_cap_drops_the_oldest_page_not_the_newest():
    """A teammate that visits many login pages must not be able to push its own
    current hold out of the table."""
    for index in range(secret_taint.MAX_PAGES + 4):
        secret_taint.mark_entered("scout", f"https://site{index}.example.com/signin", now=0)

    assert not secret_taint.is_tainted("scout", "https://site0.example.com/signin", now=1)
    newest = secret_taint.MAX_PAGES + 3
    assert secret_taint.is_tainted("scout", f"https://site{newest}.example.com/signin", now=1)


def test_holding_a_page_again_moves_it_off_the_eviction_edge():
    """The page the operator is on right now is the one that must not be evicted.

    Re-holding has to re-order, not just extend: a teammate that re-enters a
    credential on its first page and then visits thirty more would otherwise
    find the page it actually cares about already dropped.
    """
    first = "https://site0.example.com/signin"
    secret_taint.mark_entered("scout", first, now=0)
    for index in range(1, secret_taint.MAX_PAGES):
        secret_taint.mark_entered("scout", f"https://site{index}.example.com/signin", now=0)

    secret_taint.mark_entered("scout", first, now=0)  # back to the front of the queue
    secret_taint.mark_entered("scout", "https://late.example.com/signin", now=0)

    assert secret_taint.is_tainted("scout", first, now=1)
    assert not secret_taint.is_tainted("scout", "https://site1.example.com/signin", now=1)


# ---------------------------------------------------------------------------
# What the operator is shown above the box
# ---------------------------------------------------------------------------


def test_an_ordinary_https_origin_carries_no_warning():
    assert origin_policy.classify("https://zendesk.com/agent/tickets") == (
        "https://zendesk.com", None
    )


@pytest.mark.parametrize(
    ("address", "origin", "warning"),
    [
        ("http://zendesk.com/login", "http://zendesk.com", "insecure"),
        ("https://192.168.1.9/login", "https://192.168.1.9", "ip-address"),
        ("https://[::1]:8080/login", "https://[::1]:8080", "local-host"),
        ("https://localhost:3000/login", "https://localhost:3000", "local-host"),
        ("https://dev.local/login", "https://dev.local", "local-host"),
        ("https://xn--zendesk-5va.com/login", "https://xn--zendesk-5va.com", "punycode"),
        ("file:///tmp/login.html", "file://", "local-file"),
    ],
)
def test_the_odd_origins_are_named_but_still_shown(address, origin, warning):
    """Shown, and shown verbatim.

    cindy's decision, kept: a warning cautions, it never blocks. Refusing to
    post the card because the host is an IP address would stop ordinary work on
    a staging box, and the operator knows better than we do whether that IP is
    theirs. What they cannot do is compare an origin we never showed them.
    """
    result = origin_policy.classify(address)
    assert result == (origin, warning)
    assert result.warning_text  # every warning has words for the card


def test_an_address_that_cannot_be_placed_has_no_origin_to_show():
    """``None`` is not "fine" — the card says it could not confirm the page.

    Which is more alarming than silence, and correctly so: a password about to
    go into a page nobody can name deserves a second look.
    """
    for address in ("", None, "null", "about:blank", "chrome://settings"):
        assert origin_policy.classify(address) == (None, None)


def _floor_env(monkeypatch, *, address, cdp_url="http://x"):
    """A teammate whose page reads back as ``address``."""
    from crew import computer as crew_computer
    from crew import secrets as crew_secrets

    monkeypatch.setattr(crew_computer, "endpoints", lambda bot_id: {"cdp_url": cdp_url})
    monkeypatch.setattr(crew_secrets, "page_address", lambda url: address)


# ---------------------------------------------------------------------------
# The floor: what the teammate may read while a page holds a credential
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("tool", ["browser_cdp", "browser_console"])
def test_the_exact_read_tools_are_refused_while_the_page_holds_a_credential(tool, monkeypatch):
    """Parametrised so neither tool rides on the other's coverage.

    ``browser_cdp`` is the one that matters most: a raw DevTools hatch, so one
    ``Runtime.evaluate`` is the whole document, and it consults none of the
    host's expression guards.
    """
    from crew import policy as crew_policy

    _floor_env(monkeypatch, address=_SIGNIN)
    secret_taint.mark_entered("scout", _SIGNIN)

    verdict = crew_policy.secret_floor("scout", tool)
    assert verdict is not None
    assert verdict.mode == "deny"
    assert verdict.source == "secret"


def test_looking_at_the_page_is_still_allowed(monkeypatch):
    """cindy's line, and the reason it is a line rather than a wall.

    A teammate that cannot see the page it just failed to sign in to cannot
    tell its operator what went wrong, so the operator is left with a password
    they typed, a teammate that has gone quiet, and nothing to act on. The
    refusal message says this — look with a snapshot, say what it shows.

    Asserted so that widening the block later is a deliberate edit to a test
    that states the tradeoff, not a silent tightening.
    """
    from crew import policy as crew_policy

    _floor_env(monkeypatch, address=_SIGNIN)
    secret_taint.mark_entered("scout", _SIGNIN)

    assert crew_policy.secret_floor("scout", "browser_snapshot") is None
    assert crew_policy.secret_floor("scout", "browser_vision") is None


def test_the_floor_does_not_touch_the_page_when_nothing_is_held(monkeypatch):
    """The hot path, and the reason the cheap question is asked first.

    This runs on every tool call a teammate makes. If it reached for the page's
    address each time, every browser call in the product would pay a CDP round
    trip for a hold that almost never exists.
    """
    from crew import policy as crew_policy
    from crew import secrets as crew_secrets

    reads: list[str] = []
    monkeypatch.setattr(crew_secrets, "page_address", lambda url: reads.append(url) or _SIGNIN)

    assert crew_policy.secret_floor("scout", "browser_cdp") is None
    assert reads == [], "asked the page where it was with nothing held"


def test_a_teammate_that_has_moved_on_may_read_again(monkeypatch):
    """The hold is on the page, so leaving it is what lifts it.

    This is the case that makes the whole thing tolerable: a successful sign-in
    navigates, so in ordinary use the teammate is held for the length of one
    page transition.
    """
    from crew import policy as crew_policy

    secret_taint.mark_entered("scout", _SIGNIN)
    _floor_env(monkeypatch, address="https://login.example.com/inbox")

    assert crew_policy.secret_floor("scout", "browser_cdp") is None


def test_a_page_that_cannot_be_read_is_refused_rather_than_allowed(monkeypatch):
    """Fail closed, and note *which* failure this is.

    ``page_address`` returns ``None`` on a failed read rather than raising, so a
    guard that only handled the exception would have left the ordinary failure
    wide open. And asking ``is_tainted`` about an address we do not have would
    answer "not held" for a page that is.
    """
    from crew import policy as crew_policy

    secret_taint.mark_entered("scout", _SIGNIN)

    _floor_env(monkeypatch, address=None)
    assert crew_policy.secret_floor("scout", "browser_cdp") is not None

    _floor_env(monkeypatch, address=_SIGNIN, cdp_url=None)
    assert crew_policy.secret_floor("scout", "browser_cdp") is not None

    def explode(url):
        raise RuntimeError("socket gone")

    from crew import secrets as crew_secrets
    monkeypatch.setattr(crew_secrets, "page_address", explode)
    assert crew_policy.secret_floor("scout", "browser_cdp") is not None


def test_a_grant_does_not_open_the_hold(conn, monkeypatch):
    """It is a floor, which is the whole reason it is not a rung on the ladder.

    An operator granting a teammate the browser is saying something about the
    teammate's work. It is not permission to read back the password they
    themselves typed thirty seconds ago — they were not asked that, and there
    is no version of that question worth putting in front of them.
    """
    from crew import grants as crew_grants
    from crew import policy as crew_policy

    crew_grants.set_grant(conn, "scout", "browser_cdp", "allow", "it drives the browser")
    assert crew_grants.decide(conn, "scout", "browser_cdp").mode == "allow"

    _floor_env(monkeypatch, address=_SIGNIN)
    secret_taint.mark_entered("scout", _SIGNIN)

    verdict = crew_policy.evaluate(conn, "scout", "browser_cdp", {}, classify=False)
    assert verdict.mode == "deny"
    assert verdict.source == "secret"


def test_the_hook_actually_blocks_the_call_and_writes_it_down(conn, monkeypatch):
    """The whole path, not the floor in isolation.

    A verdict nobody acts on is a comment. This goes through the hook the host
    calls before every tool: the directive has to come back as a block, the
    message has to leave the teammate no room to read the refusal as "try a
    different spelling", and the refusal has to land in the ledger — the
    operator's only way to find out their teammate reached for the password
    they had just typed.
    """
    from crew import audit as crew_audit
    from crew import hooks as crew_hooks
    from crew import policy as crew_policy

    monkeypatch.setattr(crew_policy, "_ask_model", lambda question: None)
    _floor_env(monkeypatch, address=_SIGNIN)
    secret_taint.mark_entered("scout", _SIGNIN)

    directive = crew_hooks.on_pre_tool_call(
        tool_name="browser_cdp",
        args={"method": "Runtime.evaluate",
              "params": {"expression": "document.activeElement.value"}},
        task_id="crew-scout", tool_call_id="call_1", turn_id="turn_abc",
    )

    assert directive is not None, "the hook let the read through"
    assert directive["action"] == "block"
    assert "did not run" in directive["message"]
    assert "Do not retry" in directive["message"]

    refusals = crew_audit.query(conn, bot_id="scout", event_types=("tool.refused",))
    assert refusals, "a refusal nobody can audit is half a control"
    assert refusals[0]["tool"] == "browser_cdp"


# ---------------------------------------------------------------------------
# Getting held in the first place
# ---------------------------------------------------------------------------


def test_typing_a_credential_in_holds_the_page_it_went_into(conn, monkeypatch):
    """The operator's path. One hold site, reached by the typing itself."""
    from crew import secrets as crew_secrets

    _floor_env(monkeypatch, address=_SIGNIN)
    monkeypatch.setattr(crew_secrets, "_type_into_focused", lambda url, value: True)

    request = crew_secrets.SecretRequest(
        bot_id="scout", ref="a1", field_label="password", site="Zendesk",
        why="the queue is behind a login", created_at=0.0,
    )
    assert crew_secrets.fill_secret("scout", request, "hunter2") is True
    assert secret_taint.is_tainted("scout", _SIGNIN)


def test_a_fill_that_never_landed_holds_nothing(conn, monkeypatch):
    """Nothing went into the page, so there is nothing to read back — and a
    teammate muted for a fill that failed would be muted for no reason."""
    from crew import secrets as crew_secrets

    _floor_env(monkeypatch, address=_SIGNIN)
    monkeypatch.setattr(crew_secrets, "_type_into_focused", lambda url, value: False)

    request = crew_secrets.SecretRequest(
        bot_id="scout", ref="a1", field_label="password", site="Zendesk",
        why="", created_at=0.0,
    )
    assert crew_secrets.fill_secret("scout", request, "hunter2") is False
    assert not secret_taint.has_tainted("scout")


def test_a_credential_from_the_vault_holds_the_page_too(conn, monkeypatch):
    """The half cindy does not cover, for free.

    cindy holds only its owner-typed path. Ours has a second one: a password
    the operator saved earlier, typed in by the vault without waking anybody.
    That value is exactly as readable out of the field as a freshly typed one.
    Both paths type through ``fill_secret``, so one hold site covers them —
    which is why the mutation for this is "remove the hold" and both this test
    and the operator-path one above must go red together.
    """
    from crew import secrets as crew_secrets
    from crew import tools as crew_tools
    from crew import vault as crew_vault

    _floor_env(monkeypatch, address=_SIGNIN)
    monkeypatch.setattr(crew_secrets, "page_origin", lambda url: "https://login.example.com")
    monkeypatch.setattr(
        crew_secrets, "focused_control",
        lambda url: {"type": "password", "autocomplete": "current-password", "readonly": False},
    )
    monkeypatch.setattr(crew_secrets, "_type_into_focused", lambda url, value: True)

    crew_vault.save(
        conn, bot_id="scout", origin="https://login.example.com",
        kind="password", account="ops@example.com", secret="hunter2",
    )

    from crew import orchestrator
    turn = orchestrator.TurnContext(bot_id="scout", thread_id="dm:scout", turn_id="t1")
    answered = crew_tools._fill_from_vault(
        conn, turn, site="Zendesk", field="password", cdp_url="http://x"
    )

    assert answered is not None, "the vault answered the ask"
    assert secret_taint.is_tainted("scout", _SIGNIN)


# ---------------------------------------------------------------------------
# What the operator is shown, and what happens if the page moves
# ---------------------------------------------------------------------------


def _load_api():
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "_crew_plugin_api_taint",
        Path(__file__).resolve().parents[2]
        / "plugins" / "hermes-crew" / "dashboard" / "plugin_api.py",
    )
    assert spec and spec.loader
    api = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(api)
    return api


def _ask(monkeypatch, conn, *, address):
    """Post a login card with the page reading back as ``address``."""
    from crew import computer as crew_computer
    from crew import orchestrator
    from crew import tools as crew_tools

    monkeypatch.setattr(crew_computer, "ensure", lambda bot_id: {"cdp_url": "http://x"})
    monkeypatch.setattr(crew_computer, "endpoints", lambda bot_id: {"cdp_url": "http://x"})
    monkeypatch.setattr(
        orchestrator, "resolve_turn",
        lambda: orchestrator.TurnContext(bot_id="scout", thread_id="dm:scout", turn_id="t1"),
    )
    _floor_env(monkeypatch, address=address)
    crew_tools.handle_ask_for_login({"site": "Zendesk", "field": "password", "why": "queue"})
    [chip] = [m for m in crew_db.list_messages(conn, "dm:scout") if m["kind"] == "login_request"]
    return chip["payload"]


def test_the_card_leads_with_the_origin_the_page_reported(conn, monkeypatch):
    """The teammate's claim and the host's reading, side by side on one row.

    ``site`` is kept — it is useful, and it is what the teammate thinks it is
    doing. What changes is that it is no longer the only thing on the card, so
    a teammate that says "Zendesk" while standing somewhere else is now
    something the operator can see rather than something they have to guess.
    """
    payload = _ask(monkeypatch, conn, address="https://zendesk-sso.attacker.test/login")

    assert payload["site"] == "Zendesk", "the teammate's claim is still shown"
    assert payload["origin"] == "https://zendesk-sso.attacker.test"
    assert payload["origin_warning"] is None


def test_the_take_the_wheel_card_shows_the_origin_too(conn, monkeypatch):
    """The other branch of the same tool, and the reason it is not skipped.

    When the teammate needs the whole screen the operator will see the address
    bar for themselves, so this line is less load-bearing. But the card renders
    the same component, and a component that says "could not confirm which page
    this is" when nobody ever looked would be claiming a failed check instead of
    an absent one.
    """
    from crew import computer as crew_computer
    from crew import orchestrator
    from crew import tools as crew_tools

    monkeypatch.setattr(crew_computer, "ensure", lambda b: {"cdp_url": "http://x", "vnc_url": "v"})
    monkeypatch.setattr(crew_computer, "endpoints", lambda b: {"cdp_url": "http://x"})
    monkeypatch.setattr(
        orchestrator, "resolve_turn",
        lambda: orchestrator.TurnContext(bot_id="scout", thread_id="dm:scout", turn_id="t1"),
    )
    _floor_env(monkeypatch, address="https://consent.example.com/oauth")

    crew_tools.handle_ask_for_login({"site": "Zendesk", "need_full_desktop": True, "why": "sso"})
    [chip] = [m for m in crew_db.list_messages(conn, "dm:scout") if m["kind"] == "login_request"]

    assert chip["payload"]["origin"] == "https://consent.example.com"
    assert chip["payload"]["vnc_url"], "still the take-the-wheel card"


def test_the_card_says_so_when_the_page_cannot_be_placed(conn, monkeypatch):
    """Not silence. An operator told nothing assumes the ordinary case."""
    payload = _ask(monkeypatch, conn, address=None)

    assert payload["origin"] is None
    assert payload["field"] == "password", "the card still goes up"


def test_the_card_carries_the_warning_for_an_odd_origin(conn, monkeypatch):
    payload = _ask(monkeypatch, conn, address="http://192.168.1.9/login")

    assert payload["origin"] == "http://192.168.1.9"
    assert payload["origin_warning"], "a bare IP is worth a second look"


def test_a_page_that_moved_between_the_ask_and_the_answer_is_not_typed_into(conn, monkeypatch):
    """The card's origin is information; this is the enforcement.

    Minutes can pass between a teammate asking and somebody answering on their
    phone, and the keystrokes go to whatever is focused *at that moment*. The
    same shape as the approvals desk's content hash: what the person was shown
    is pinned, and an action against a changed world is refused rather than
    quietly applied to the change.
    """
    from crew import secrets as crew_secrets

    payload = _ask(monkeypatch, conn, address="https://login.example.com/signin")
    api = _load_api()

    typed: list[str] = []
    monkeypatch.setattr(
        crew_secrets, "_type_into_focused",
        lambda url, value: typed.append(value) or True,
    )
    # The page has moved on since the operator was asked.
    _floor_env(monkeypatch, address="https://login.evil.test/signin")

    with pytest.raises(Exception) as raised:
        api.submit_secret("scout", api.SecretBody(ref=payload["ref"], value="hunter2"))

    assert getattr(raised.value, "status_code", None) == 409
    detail = str(getattr(raised.value, "detail", ""))
    # Both halves, because the operator's question is "where did my password
    # nearly go": the origin they were shown, and the one that is there now.
    assert "login.evil.test" in detail
    assert "login.example.com" in detail
    assert typed == [], "a credential at the wrong place is not typed at all"
    assert not secret_taint.has_tainted("scout"), "nothing landed, so nothing is held"


def test_nothing_is_remembered_when_the_page_moved(conn, monkeypatch):
    """The refusal comes before the save, which is the point of its placement.

    A credential saved against the origin the operator *thought* they were at
    would be typed in unattended by the next teammate to reach that site. A
    refusal that still wrote to the vault would be worse than no refusal.
    """
    from crew import secrets as crew_secrets
    from crew import vault as crew_vault

    payload = _ask(monkeypatch, conn, address="https://login.example.com/signin")
    api = _load_api()

    monkeypatch.setattr(crew_secrets, "_type_into_focused", lambda url, value: True)
    _floor_env(monkeypatch, address="https://login.evil.test/signin")

    with pytest.raises(Exception):
        api.submit_secret("scout", api.SecretBody(
            ref=payload["ref"], value="hunter2", remember=True, account="ops@example.com",
        ))

    assert crew_vault.find(
        conn, bot_id="scout", origin="https://login.example.com", kind="password"
    ) is None
    assert crew_vault.find(
        conn, bot_id="scout", origin="https://login.evil.test", kind="password"
    ) is None


def test_a_page_that_has_not_moved_is_typed_into_as_before(conn, monkeypatch):
    """The guard must not break the thing it guards.

    Including the ordinary case where the page rewrote its own query string,
    which the origin comparison does not see and must not be tripped by.
    """
    from crew import secrets as crew_secrets

    payload = _ask(monkeypatch, conn, address="https://login.example.com/signin")
    api = _load_api()

    typed: list[str] = []
    monkeypatch.setattr(
        crew_secrets, "_type_into_focused",
        lambda url, value: typed.append(value) or True,
    )
    _floor_env(monkeypatch, address="https://login.example.com/signin?attempt=2")

    api.submit_secret("scout", api.SecretBody(ref=payload["ref"], value="hunter2"))

    assert typed == ["hunter2"]
    assert secret_taint.has_tainted("scout"), "it landed, so the page is held"


def test_a_card_posted_without_a_readable_origin_still_works(conn, monkeypatch):
    """Nothing to compare, so nothing to refuse.

    That card already told the operator it could not confirm the page. Refusing
    here as well would mean no sign-in ever succeeded on a page we cannot read,
    which turns an unverifiable origin into a broken feature.
    """
    from crew import secrets as crew_secrets

    payload = _ask(monkeypatch, conn, address=None)
    assert payload["origin"] is None
    api = _load_api()

    typed: list[str] = []
    monkeypatch.setattr(
        crew_secrets, "_type_into_focused",
        lambda url, value: typed.append(value) or True,
    )
    _floor_env(monkeypatch, address=None)

    api.submit_secret("scout", api.SecretBody(ref=payload["ref"], value="hunter2"))
    assert typed == ["hunter2"]
    # Unplaceable page plus a landed credential is the whole-teammate hold.
    assert secret_taint.is_tainted("scout", "https://anywhere.test/x")


def test_the_port_classifies_in_cindys_order():
    """An address can trip several rules at once; only the one that should most
    change the operator's mind is shown.

    ``http://127.0.0.1`` is both unencrypted and local. Reporting "not
    encrypted" about the teammate's own loopback would be true and useless;
    reporting "a page on the teammate's own machine" is the fact that explains
    the other one.
    """
    assert origin_policy.classify("http://127.0.0.1:9222/login").warning == "local-host"
    assert origin_policy.classify("http://10.0.0.4/login").warning == "ip-address"
    assert origin_policy.classify("http://xn--80ak6aa92e.com/l").warning == "punycode"
