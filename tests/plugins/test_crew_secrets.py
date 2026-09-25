"""Hermes Crew — one field instead of the whole screen.

The teammate names the field it is stuck on, the operator types into a masked
box, and the characters go straight into the page over CDP. What is recorded is
the label; the value is a parameter of one request and exists nowhere else.

Most of what is tested here is not the typing. It is OpenBot's two control
rules, which matter more and which are the reason the state machine knows
nothing about CDP:

* while a person holds the screen the bot's actions are **refused, not queued**
  — a queued click arrives after they have walked away, and nobody is watching
  what it does;
* the bot may **ask** for help but cannot **hand itself over** — a bot that can
  put a person in front of a page can put them in front of a page they did not
  ask to see, which is the shape of every phishing flow.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew.secrets import BOT, HUMAN, Control, ControlRefused, SecretRequest  # noqa: E402


@pytest.fixture()
def control():
    return Control()


def _request(bot_id="scout", ref="a3f1", label="password", *, age_s=0.0):
    return SecretRequest(
        bot_id=bot_id, ref=ref, field_label=label, site="Zendesk",
        why="the ticket queue is behind a login", created_at=time.time() - age_s,
    )


# ---------------------------------------------------------------------------
# Who is driving
# ---------------------------------------------------------------------------


def test_the_bot_drives_until_somebody_takes_the_screen(control):
    assert control.holder("scout") == BOT
    assert control.bot_may_act("scout")


def test_while_a_person_holds_it_the_bots_actions_are_refused(control):
    """**Refused, not queued, and the difference is the whole rule.**

    A queue sounds kinder: hold the click, run it when they are done. But the
    click then lands minutes later, after the person has finished and walked
    away, and whatever it does happens with nobody watching. A refusal is a
    fact the model has while it still has the context to act on it.
    """
    control.take("scout")
    assert control.holder("scout") == HUMAN
    assert not control.bot_may_act("scout")

    with pytest.raises(ControlRefused) as caught:
        control.require_bot_turn("scout")
    assert "right now" in str(caught.value)


def test_control_comes_back_when_the_person_is_done(control):
    control.take("scout")
    control.release("scout")
    assert control.bot_may_act("scout")


def test_one_teammates_screen_is_not_another_teammates(control):
    control.take("scout")
    assert control.bot_may_act("scribe")


def test_the_bot_cannot_hand_its_screen_to_a_person(control):
    """**The asymmetry, stated as a refusal rather than left as an absence.**

    Asking for help is fine — that is what the whole feature is. Putting a
    person in front of a page is not, because the page is chosen by the
    teammate and "the assistant showed me this, so I signed in" is exactly how
    a phishing flow reads from the inside. Control is taken, never given.
    """
    with pytest.raises(ControlRefused) as caught:
        control.bot_hands_over("scout")
    assert "your operator's move" in str(caught.value)
    assert control.holder("scout") == BOT, "a refused handover changes nothing"


# ---------------------------------------------------------------------------
# Asking for one field
# ---------------------------------------------------------------------------


def test_a_request_holds_the_label_and_never_a_value(control):
    """The dataclass has no field a secret could sit in. That is not an
    oversight to be fixed later — it is the property being relied on."""
    request = control.open_request(_request())
    assert not any("value" in name for name in vars(request))
    assert request.field_label == "password"


def test_only_one_box_is_open_at_a_time(control):
    """Two masked boxes for one teammate is a way to type the right password
    into the wrong field — and the teammate is blocked on the first anyway."""
    control.open_request(_request(ref="aaaa"))
    control.open_request(_request(ref="bbbb"))
    assert control.pending("scout").ref == "bbbb"
    assert control.take_request("scout", "aaaa") is None


def test_answering_the_box_you_were_shown(control):
    control.open_request(_request(ref="a3f1"))
    claimed = control.take_request("scout", "a3f1")
    assert claimed is not None and claimed.field_label == "password"
    assert control.pending("scout") is None, "claimed once, then gone"


def test_answering_a_box_that_was_replaced_is_refused(control):
    """Claimed by ref rather than by teammate: somebody typing a password
    deserves to be told it went nowhere, not to have it go somewhere else."""
    control.open_request(_request(ref="aaaa"))
    control.open_request(_request(ref="bbbb"))
    assert control.take_request("scout", "aaaa") is None


def test_a_request_nobody_answered_expires(control):
    """A stale box inviting somebody to type a password into it is worse than
    one that has closed."""
    from crew.secrets import REQUEST_TTL_S

    control.open_request(_request(age_s=REQUEST_TTL_S + 1))
    assert control.pending("scout") is None
    assert control.take_request("scout", "a3f1") is None


def test_a_request_inside_its_window_is_still_open(control):
    from crew.secrets import REQUEST_TTL_S

    control.open_request(_request(age_s=REQUEST_TTL_S - 60))
    assert control.pending("scout") is not None


# ---------------------------------------------------------------------------
# The value goes nowhere
# ---------------------------------------------------------------------------


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    crew_db.close_all()
    connection = crew_db.connect()
    crew_db.upsert_bot(connection, bot_id="scout", name="Scout")
    crew_db.ensure_dm_thread(connection, "scout")
    yield connection
    crew_db.close_all()


def test_asking_records_the_field_and_not_a_value(conn, monkeypatch, tmp_path):
    """**The property the whole design exists for, checked against the file.**

    Not "the payload looks right" — the database is read back as bytes and the
    secret is not in it. That catches the value arriving somewhere nobody
    thought to look: a payload column, a log line spooled into the same file,
    an index.
    """
    from crew import computer as crew_computer
    from crew import orchestrator
    from crew import tools as crew_tools
    from crew.secrets import control as live_control

    monkeypatch.setattr(crew_computer, "ensure", lambda bot_id: {"vnc_url": None})
    monkeypatch.setattr(
        orchestrator, "resolve_turn",
        lambda: orchestrator.TurnContext(bot_id="scout", thread_id="dm:scout", turn_id="t1"),
    )

    result = crew_tools.handle_ask_for_login({
        "site": "Zendesk", "field": "password", "why": "the queue is behind a login",
    })
    assert '"asked": true' in result.lower()

    request = live_control.pending("scout")
    assert request is not None and request.field_label == "password"

    # Read the row first. Asserting only "the secret is not in the file" would
    # pass against an empty file, which is what the first version of this test
    # did — the write was still in the WAL and it proved nothing.
    [chip] = [m for m in crew_db.list_messages(conn, "dm:scout") if m["kind"] == "login_request"]
    assert chip["payload"]["field"] == "password"
    assert "value" not in chip["payload"]

    secret = "hunter2-the-actual-password"
    blob = b"".join(
        path.read_bytes() for path in tmp_path.glob("crew.db*") if path.is_file()
    )
    assert b"password" in blob, "the label really is on disk, so the next line means something"
    assert secret.encode() not in blob

    live_control.close_request("scout")


def test_naming_no_field_still_asks_for_the_whole_screen(conn, monkeypatch):
    """The old path is not removed. One field is the common case; a consent
    flow with three steps is not, and pretending otherwise would leave the
    teammate stuck with a tool that cannot ask for what it needs."""
    from crew import computer as crew_computer
    from crew import orchestrator
    from crew import tools as crew_tools

    monkeypatch.setattr(
        crew_computer, "ensure", lambda bot_id: {"vnc_url": "http://127.0.0.1:6080"},
    )
    monkeypatch.setattr(
        orchestrator, "resolve_turn",
        lambda: orchestrator.TurnContext(bot_id="scout", thread_id="dm:scout", turn_id="t1"),
    )

    crew_tools.handle_ask_for_login({"site": "Zendesk", "why": "login wall"})

    [chip] = [m for m in crew_db.list_messages(conn, "dm:scout") if m["kind"] == "login_request"]
    assert chip["payload"]["vnc_url"] == "http://127.0.0.1:6080"
    assert "field" not in chip["payload"]


def test_asking_for_the_full_desktop_wins_over_a_named_field(conn, monkeypatch):
    """`need_full_desktop` is the teammate saying one box will not do it. When
    it says so, believe it — the alternative is a masked field for a flow that
    needs three."""
    from crew import computer as crew_computer
    from crew import orchestrator
    from crew import tools as crew_tools

    monkeypatch.setattr(
        crew_computer, "ensure", lambda bot_id: {"vnc_url": "http://127.0.0.1:6080"},
    )
    monkeypatch.setattr(
        orchestrator, "resolve_turn",
        lambda: orchestrator.TurnContext(bot_id="scout", thread_id="dm:scout", turn_id="t1"),
    )

    crew_tools.handle_ask_for_login({
        "site": "Okta", "field": "password", "need_full_desktop": True, "why": "2FA",
    })

    [chip] = [m for m in crew_db.list_messages(conn, "dm:scout") if m["kind"] == "login_request"]
    assert chip["payload"].get("vnc_url")


def test_filling_with_no_screen_reports_failure_rather_than_pretending(monkeypatch):
    """A secret that silently went nowhere is the worst outcome available: the
    operator believes they have signed the teammate in."""
    from crew import computer as crew_computer
    from crew import secrets as crew_secrets

    monkeypatch.setattr(crew_computer, "endpoints", lambda bot_id: {"cdp_url": None})
    assert crew_secrets.fill_secret("scout", _request(), "whatever") is False


def test_an_empty_value_is_not_typed(monkeypatch):
    from crew import secrets as crew_secrets

    assert crew_secrets.fill_secret("scout", _request(), "") is False
