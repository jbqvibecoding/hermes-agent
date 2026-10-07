"""Hermes Crew — a credential a teammate can use with nobody at the keyboard.

``crew/secrets.py`` already keeps a password out of a teammate's context: the
operator types into a masked box and the characters go into the page over CDP.
Its limit is that somebody has to be there, so a teammate that hits a login
wall inside a routine simply stops. The vault answers the same
``ask_for_login`` from storage when — and only when — the *page* agrees it
should.

So these tests are mostly about the "only when". A vault that fills reliably is
easy; a vault that refuses in the five situations below is the product. Each
test names one way this could quietly become a credential-leaking machine.

**On what is and is not claimed.** Once a value is in the page, a teammate
that can run page script can read it back out of the DOM. openinstinct ships
this same mechanism and its instructions ask the model not to — which is prose,
not a control. The claim here is narrower and testable: *the teammate is never
handed the credential*, and nothing on this path writes it anywhere. The last
test in this file is the one that proves that half.
"""

from __future__ import annotations

import json
import sqlite3
import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew import secrets as crew_secrets  # noqa: E402
from crew import tools as crew_tools  # noqa: E402
from crew import vault as crew_vault  # noqa: E402

SECRET = "correct-horse-battery-staple"
ORIGIN = "https://zendesk.example"


@pytest.fixture()
def vault(tmp_path, monkeypatch):
    """A throwaway crew.db and a vault key of its own."""
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    monkeypatch.setenv("HERMES_CREW_HOME", str(tmp_path))
    crew_db.close_all()
    conn = crew_db.connect()
    crew_db.upsert_bot(conn, bot_id="scout", name="Scout", role="research")
    crew_db.ensure_dm_thread(conn, "scout")
    yield conn
    crew_db.close_all()


# ---------------------------------------------------------------------------
# The envelope
# ---------------------------------------------------------------------------


def test_a_sealed_credential_comes_back(vault):
    envelope = crew_vault.seal("scout", "item-1", SECRET)
    assert crew_vault.unseal("scout", "item-1", envelope) == SECRET


def test_the_envelope_says_what_it_is(vault):
    """Self-describing and versioned, so the day the construction changes the
    old rows are identifiable rather than garbage."""
    parts = crew_vault.seal("scout", "item-1", SECRET).split(".")
    assert len(parts) == 4
    assert parts[0] == crew_vault.ENVELOPE_VERSION
    assert SECRET not in crew_vault.seal("scout", "item-1", SECRET)


def test_a_ciphertext_cannot_be_moved_to_another_teammate(vault):
    """**The reason the AEAD has additional data at all.**

    Without binding, "encrypt the column" leaves a row swap open: move
    `scribe`'s ciphertext onto `scout`'s row and `scout` reads a credential it
    was never given. The additional data is `<bot_id>\\0vault\\0<item_id>`, so
    the move fails to decrypt instead.
    """
    envelope = crew_vault.seal("scribe", "item-1", SECRET)
    with pytest.raises(crew_vault.VaultError):
        crew_vault.unseal("scout", "item-1", envelope)


def test_a_ciphertext_cannot_be_moved_to_another_item(vault):
    envelope = crew_vault.seal("scout", "item-1", SECRET)
    with pytest.raises(crew_vault.VaultError):
        crew_vault.unseal("scout", "item-2", envelope)


def test_the_separators_keep_two_different_pairs_apart(vault):
    """``("ab","c")`` and ``("a","bc")`` must not produce the same binding."""
    assert crew_vault._aad("ab", "c") != crew_vault._aad("a", "bc")


@pytest.mark.parametrize("part", [1, 2, 3])  # iv, tag, ciphertext
def test_a_tampered_envelope_is_refused_whichever_part_was_touched(vault, part):
    """Flipped a *byte*, not a base64 character.

    The first version of this flipped the last character of the encoding, which
    only sometimes changes a decoded byte — the trailing character carries
    padding bits — so whether it corrupted anything depended on the random IV
    and the test failed about one run in four. A test of an authenticity check
    has to actually break authenticity every time.
    """
    parts = crew_vault.seal("scout", "item-1", SECRET).split(".")
    raw = bytearray(crew_vault._unb64(parts[part]))
    raw[0] ^= 0x01
    parts[part] = crew_vault._b64(bytes(raw))
    with pytest.raises(crew_vault.VaultError):
        crew_vault.unseal("scout", "item-1", ".".join(parts))


@pytest.mark.parametrize("envelope", [
    "", "v1", "v1.a.b", "v2.a.b.c", "not-an-envelope", "v1...",
])
def test_an_envelope_that_is_not_one_is_refused(vault, envelope):
    with pytest.raises(crew_vault.VaultError):
        crew_vault.unseal("scout", "item-1", envelope)


# ---------------------------------------------------------------------------
# The key
# ---------------------------------------------------------------------------


def test_the_key_is_not_in_the_database_it_protects(vault):
    crew_vault.save(vault, bot_id="scout", origin=ORIGIN, kind="password", secret=SECRET)
    blob = Path(crew_db.crew_db_path()).read_bytes()
    assert crew_vault.key_path().read_bytes() not in blob
    assert SECRET.encode() not in blob


def test_the_key_is_created_once_and_kept_to_itself(vault):
    crew_vault.seal("scout", "item-1", SECRET)
    path = crew_vault.key_path()
    assert path.stat().st_mode & 0o777 == 0o600
    first = path.read_bytes()
    crew_vault.seal("scout", "item-2", SECRET)
    assert path.read_bytes() == first, "a second seal must not re-key the vault"


@pytest.mark.skipif(sys.platform == "win32", reason="POSIX mode bits")
def test_a_key_anybody_can_read_is_refused_rather_than_used(vault):
    """A vault whose key is group-readable is not a vault, and carrying on
    would make this module a claim instead of a control."""
    crew_vault.seal("scout", "item-1", SECRET)
    crew_vault.key_path().chmod(0o644)
    with pytest.raises(crew_vault.VaultError, match="readable by somebody other than you"):
        crew_vault.seal("scout", "item-1", SECRET)


# ---------------------------------------------------------------------------
# Origins — what a credential is bound to
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("url, expected", [
    ("https://zendesk.example/agent/login", "https://zendesk.example"),
    ("https://ZenDesk.Example", "https://zendesk.example"),
    ("https://zendesk.example:443/x", "https://zendesk.example"),
    ("https://zendesk.example:8443", "https://zendesk.example:8443"),
    ("http://localhost:3000/login", "http://localhost:3000"),
    ("http://127.0.0.1/login", "http://127.0.0.1"),
])
def test_an_origin_is_reduced_to_what_it_has_to_match(url, expected):
    assert crew_vault.normalise_origin(url) == expected


@pytest.mark.parametrize("url", [
    "http://zendesk.example",          # a password typed here is readable by the network
    "ftp://zendesk.example",
    "https://user:pw@zendesk.example",  # credentials in the URL are not an origin
    "null",                             # what a sandboxed document reports
    "",
    "https://",
])
def test_an_origin_a_password_should_not_be_typed_into_is_refused(url):
    assert crew_vault.normalise_origin(url) is None


def test_a_credential_is_not_found_at_a_lookalike_origin(vault):
    crew_vault.save(vault, bot_id="scout", origin=ORIGIN, kind="password", secret=SECRET)
    assert crew_vault.find(vault, bot_id="scout", origin=ORIGIN, kind="password") is not None
    for lookalike in (
        "https://zendesk.example.evil.test",
        "https://evil.test/?x=https://zendesk.example",
        "https://zendesk-example.test",
        "http://zendesk.example",
    ):
        assert crew_vault.find(
            vault, bot_id="scout", origin=lookalike, kind="password"
        ) is None, lookalike


def test_a_credential_belongs_to_one_teammate(vault):
    crew_vault.save(vault, bot_id="scout", origin=ORIGIN, kind="password", secret=SECRET)
    assert crew_vault.find(vault, bot_id="scribe", origin=ORIGIN, kind="password") is None


def test_saving_again_replaces_rather_than_stacks(vault):
    crew_vault.save(vault, bot_id="scout", origin=ORIGIN, kind="password", secret="old")
    crew_vault.save(vault, bot_id="scout", origin=ORIGIN, kind="password", secret="new")
    items = crew_vault.list_items(vault, "scout")
    assert len(items) == 1, "two passwords for one site is a way to fill the wrong one"
    assert crew_vault.secret_for(vault, bot_id="scout", item_id=items[0]["id"]) == "new"
    # …and the replaced ciphertext is gone, not orphaned.
    assert vault.execute("SELECT COUNT(*) c FROM vault_secrets").fetchone()["c"] == 1


def test_what_a_person_sees_is_not_worth_stealing(vault):
    item = crew_vault.save(
        vault, bot_id="scout", origin=ORIGIN, kind="password",
        secret=SECRET, account="jordan@example.com",
    )
    hint = item["account_hint"]
    assert hint == "zendesk.example · j…@example.com"
    assert "jordan" not in hint


def test_the_metadata_table_never_holds_the_credential(vault):
    """Listing what is saved reads `vault_items` only, so the ciphertext is not
    on a path that merely wants to show a name."""
    crew_vault.save(vault, bot_id="scout", origin=ORIGIN, kind="password", secret=SECRET)
    columns = {row["name"] for row in vault.execute("PRAGMA table_info(vault_items)")}
    assert "ciphertext" not in columns
    row = vault.execute("SELECT * FROM vault_items").fetchone()
    assert SECRET not in json.dumps(dict(row), default=str)


@pytest.mark.parametrize("kind", ["one-time-code", "card", "", "totp"])
def test_the_vault_only_holds_kinds_it_fills(vault, kind):
    with pytest.raises(crew_vault.VaultError):
        crew_vault.save(vault, bot_id="scout", origin=ORIGIN, kind=kind, secret=SECRET)


# ---------------------------------------------------------------------------
# What the page is allowed to veto
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("field, kind", [
    ("password", "password"),
    ("Password", "password"),
    ("密码", "password"),
    ("username", "username"),
    ("email address", "username"),
    ("账号", "username"),
])
def test_a_field_label_picks_which_entry_to_look_for(field, kind):
    assert crew_tools._vault_kind(field) == kind


@pytest.mark.parametrize("field", [
    "verification code", "one-time code", "OTP", "2fa token", "PIN", "验证码",
    "", "captcha answer", "security question",
])
def test_a_credential_that_is_fresh_every_time_is_never_answered_from_storage(field):
    """A saved one-time code is either expired or somebody has misunderstood
    what they saved. Checked before the other groups, because "verification
    code" contains none of their words and must not fall through to them."""
    assert crew_tools._vault_kind(field) is None


@pytest.mark.parametrize("control, reason", [
    (None, "no field focused"),
    ({"type": "password", "autocomplete": "new-password"}, "new-password"),
    ({"type": "text", "autocomplete": "one-time-code"}, "one-time-code"),
    ({"type": "password", "autocomplete": "", "readonly": True}, "cannot be typed into"),
    ({"type": "checkbox", "autocomplete": ""}, "not a field"),
])
def test_the_page_can_veto_a_field_the_teammate_called_a_password(control, reason):
    """**Reading the field instead of believing the label for it.**

    A teammate that says "password" while the page says ``new-password`` is
    about to put the operator's live credential into a change-password form.
    The teammate's label is untrusted input; the page's own ``autocomplete`` is
    what a password manager is meant to read.
    """
    refusal = crew_secrets.control_refuses_a_saved_secret(control)
    assert refusal is not None
    assert reason in refusal


def test_an_ordinary_password_field_is_not_vetoed():
    assert crew_secrets.control_refuses_a_saved_secret(
        {"type": "password", "autocomplete": "current-password", "readonly": False}
    ) is None


def test_the_origin_is_read_with_self_origin_not_location_origin():
    """A sandboxed document's ``self.origin`` is the string ``"null"``, which
    no saved credential can match. Its ``location.origin`` still reads like the
    site it was framed from, which is why that one is not used."""
    assert crew_secrets._ORIGIN_EXPRESSION == "self.origin"
    assert crew_vault.normalise_origin("null") is None


# ---------------------------------------------------------------------------
# End to end, through ask_for_login
# ---------------------------------------------------------------------------


@pytest.fixture()
def page(monkeypatch):
    """Stand in for the browser on a teammate's computer.

    Records what was typed so a test can assert on it — the real path
    deliberately returns nothing and logs nothing.
    """
    from crew import computer as crew_computer

    state = {
        "origin": ORIGIN,
        "control": {"type": "password", "autocomplete": "current-password", "readonly": False},
        "typed": [],
    }

    def fill_secret(bot_id, request, value):
        state["typed"].append(value)
        return True

    monkeypatch.setattr(crew_secrets, "page_origin", lambda cdp_url: state["origin"])
    monkeypatch.setattr(crew_secrets, "focused_control", lambda cdp_url: state["control"])
    monkeypatch.setattr(crew_secrets, "fill_secret", fill_secret)
    monkeypatch.setattr(
        crew_computer, "ensure", lambda bot_id: {"cdp_url": "http://127.0.0.1:9222"}
    )
    return state


def _ask(**args):
    return json.loads(crew_tools.handle_ask_for_login(args))


@pytest.fixture()
def turn(vault, monkeypatch):
    from crew import orchestrator

    monkeypatch.setattr(
        orchestrator, "resolve_turn",
        lambda: orchestrator.TurnContext(bot_id="scout", thread_id="dm:scout"),
    )
    return vault


def test_a_saved_credential_answers_the_question_without_waking_anybody(turn, page):
    crew_vault.save(turn, bot_id="scout", origin=ORIGIN, kind="password", secret=SECRET)

    result = _ask(site="Zendesk", field="password", why="to read the queue")

    assert result == {"filled": True, "note": result["note"]}
    assert page["typed"] == [SECRET]
    # Nobody was asked: the masked-box path posts a chip, and this one must not.
    kinds = [m["kind"] for m in crew_db.list_messages(turn, "dm:scout")]
    assert "login_request" not in kinds


def test_nothing_saved_falls_back_to_asking_the_operator(turn, page):
    result = _ask(site="Zendesk", field="password", why="to read the queue")

    assert result["asked"] is True
    assert page["typed"] == []
    assert "login_request" in [m["kind"] for m in crew_db.list_messages(turn, "dm:scout")]


def test_the_page_decides_the_origin_and_not_the_teammate(turn, page):
    """The teammate says "Zendesk"; the page says where it actually is.

    This is the check that matters most. A teammate talked onto a lookalike by
    something it read mid-task says the same true-sounding `site` and finds
    nothing saved, because the credential is bound to what the page reports.
    """
    crew_vault.save(turn, bot_id="scout", origin=ORIGIN, kind="password", secret=SECRET)
    page["origin"] = "https://zendesk.example.evil.test"

    result = _ask(site="Zendesk", field="password", why="to read the queue")

    assert result["asked"] is True, "a lookalike must fall back to a person, not fill"
    assert page["typed"] == []


def test_an_unreadable_origin_asks_rather_than_guesses(turn, page):
    crew_vault.save(turn, bot_id="scout", origin=ORIGIN, kind="password", secret=SECRET)
    page["origin"] = None

    assert _ask(site="Zendesk", field="password")["asked"] is True
    assert page["typed"] == []


def test_a_vetoed_field_asks_and_leaves_the_near_miss_in_the_ledger(turn, page):
    """"It did not fill" and "there was nothing to fill" send a reader looking
    in different places, so the near miss gets a row of its own."""
    crew_vault.save(turn, bot_id="scout", origin=ORIGIN, kind="password", secret=SECRET)
    page["control"] = {"type": "password", "autocomplete": "new-password"}

    assert _ask(site="Zendesk", field="password")["asked"] is True
    assert page["typed"] == []

    events = [row["event_type"] for row in turn.execute("SELECT event_type FROM audit")]
    assert "vault.declined" in events
    assert "vault.filled" not in events


def test_a_fill_with_nobody_watching_still_leaves_a_trace(turn, page):
    """The one thing this path does that the masked box does not is happen with
    no operator present, so it is the one thing that has to be written down."""
    crew_vault.save(
        turn, bot_id="scout", origin=ORIGIN, kind="password",
        secret=SECRET, account="jordan@example.com",
    )
    _ask(site="Zendesk", field="password")

    rows = [dict(r) for r in turn.execute(
        "SELECT event_type, subject, detail FROM audit WHERE event_type='vault.filled'"
    )]
    assert len(rows) == 1
    assert rows[0]["subject"] == f"password for {ORIGIN}"
    # The hint, not the credential.
    assert rows[0]["detail"] == "zendesk.example · j…@example.com"


def test_the_credential_reaches_the_page_and_nothing_else(turn, page, caplog):
    """**The claim this file is allowed to make.**

    Not "the teammate cannot obtain it" — once it is in the page, a teammate
    that can run page script can read it back, and saying otherwise would be
    the prose-shaped protection openinstinct ships. What is testable is that
    nothing on this path *hands* it over: not the tool result, not a message,
    not the ledger, not the log.
    """
    import logging

    crew_vault.save(turn, bot_id="scout", origin=ORIGIN, kind="password", secret=SECRET)

    with caplog.at_level(logging.DEBUG):
        raw = crew_tools.handle_ask_for_login(
            {"site": "Zendesk", "field": "password", "why": "to read the queue"}
        )

    assert SECRET not in raw
    assert SECRET not in caplog.text
    for table in ("messages", "audit", "activities", "vault_items"):
        dumped = json.dumps(
            [dict(r) for r in turn.execute(f"SELECT * FROM {table}")], default=str
        )
        assert SECRET not in dumped, table
    # It did get there.
    assert page["typed"] == [SECRET]


def test_the_full_desktop_path_is_untouched_by_the_vault(turn, page):
    """A teammate that says it needs the whole screen gets the whole screen.
    The vault is the cheap answer to the common case, not a replacement for
    somebody taking the wheel."""
    crew_vault.save(turn, bot_id="scout", origin=ORIGIN, kind="password", secret=SECRET)

    result = _ask(site="Zendesk", field="password", need_full_desktop=True)

    assert result["asked"] is True
    assert page["typed"] == []


# ---------------------------------------------------------------------------
# How anything gets into the vault
#
# The route is called as a plain function: the transport is FastAPI's and is
# not what needs proving.
# ---------------------------------------------------------------------------


@pytest.fixture()
def route(turn, page, monkeypatch):
    """The dashboard's masked-box endpoint, with a request already open.

    The operator is typing into a box the teammate asked for, which is exactly
    the moment they are in a position to decide whether it is worth keeping —
    so that is where "remember this" lives rather than in a settings page
    nobody visits.
    """
    import importlib.util
    import time as _time

    spec = importlib.util.spec_from_file_location(
        "crew_plugin_api_vault_test", _PLUGIN_ROOT / "dashboard" / "plugin_api.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr(
        module.crew_computer, "endpoints", lambda bot_id: {"cdp_url": "http://127.0.0.1:9222"}
    )

    def open_box(field="password"):
        crew_secrets.control.open_request(crew_secrets.SecretRequest(
            bot_id="scout", ref="abcd", field_label=field, site="Zendesk",
            why="to read the queue", created_at=_time.time(),
        ))
        return module

    return open_box


def test_nothing_is_saved_unless_the_operator_says_so(route, turn, page):
    module = route()
    module.submit_secret("scout", module.SecretBody(ref="abcd", value=SECRET))

    assert crew_vault.list_items(turn, "scout") == []
    assert page["typed"] == [SECRET]


def test_remembering_saves_it_against_the_origin_the_page_is_at(route, turn, page):
    module = route()
    result = module.submit_secret(
        "scout",
        module.SecretBody(ref="abcd", value=SECRET, remember=True, account="jordan@example.com"),
    )

    assert result["remembered"] == ORIGIN
    items = crew_vault.list_items(turn, "scout")
    assert len(items) == 1
    assert items[0]["origin"] == ORIGIN
    assert items[0]["account_hint"] == "zendesk.example · j…@example.com"
    assert crew_vault.secret_for(turn, bot_id="scout", item_id=items[0]["id"]) == SECRET


def test_remembering_does_not_trust_the_site_name_the_teammate_wrote(route, turn, page):
    """`request.site` is a label a *model* wrote.

    Saving against it would let a teammate that had been talked onto a
    lookalike have the operator's real credential filed under the real site's
    name — and then filled there, unattended, forever after.
    """
    module = route()
    page["origin"] = "https://zendesk.example.evil.test"

    module.submit_secret("scout", module.SecretBody(ref="abcd", value=SECRET, remember=True))

    saved = crew_vault.list_items(turn, "scout")
    assert [item["origin"] for item in saved] == ["https://zendesk.example.evil.test"]
    # …and so it is not found at the real site.
    assert crew_vault.find(turn, bot_id="scout", origin=ORIGIN, kind="password") is None


def test_a_value_that_could_not_be_typed_in_is_never_saved(route, turn, page, monkeypatch):
    """A vault full of credentials nobody has seen work is worse than an empty
    one: the next teammate uses them with nobody watching."""
    module = route()
    monkeypatch.setattr(crew_secrets, "fill_secret", lambda bot_id, request, value: False)

    with pytest.raises(Exception):  # the route raises 502
        module.submit_secret("scout", module.SecretBody(ref="abcd", value=SECRET, remember=True))

    assert crew_vault.list_items(turn, "scout") == []


def test_a_one_time_code_is_not_saved_even_when_asked(route, turn, page):
    module = route(field="verification code")
    result = module.submit_secret(
        "scout", module.SecretBody(ref="abcd", value="123456", remember=True)
    )

    assert result["remembered"] is None
    assert crew_vault.list_items(turn, "scout") == []
    # It still went into the page — refusing to *save* it is not refusing to use it.
    assert page["typed"] == ["123456"]


def test_a_failure_to_save_does_not_fail_the_thing_that_worked(route, turn, page, monkeypatch):
    """The operator's request was "type this in", and it succeeded. Turning a
    bookkeeping failure into a 500 would tell them the password did not go in
    when it did."""
    module = route()

    def explode(*a, **kw):
        raise RuntimeError("disk full")

    monkeypatch.setattr(crew_vault, "save", explode)
    result = module.submit_secret(
        "scout", module.SecretBody(ref="abcd", value=SECRET, remember=True)
    )

    assert result["filled"] is True
    assert result["remembered"] is None
    assert page["typed"] == [SECRET]
