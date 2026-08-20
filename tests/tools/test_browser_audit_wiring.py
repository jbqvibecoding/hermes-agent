"""B1/B2 × B4: handovers and secrets leave a durable record.

These events are the ones with no other trace. Nothing in the transcript says a
person took the wheel at 14:02 and gave it back at 14:05, or that a password was
typed into ``@e7`` without the agent ever seeing it — and those are exactly the
moments an operator would want to reconstruct.
"""

from __future__ import annotations

import json

import pytest

from tools import browser_control, browser_secret, tool_audit


@pytest.fixture
def audit(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    tool_audit.reset_writer()
    browser_control.reset()
    browser_secret.reset()
    yield lambda: _lines(tmp_path / "logs" / "tool-audit.log")
    tool_audit.reset_writer()
    browser_control.reset()
    browser_secret.reset()


def _lines(path):
    if not path.exists():
        return []
    return [
        json.loads(x)
        for x in path.read_text(encoding="utf-8").splitlines()
        if x.strip()
    ]


# ---------------------------------------------------------------------------
# Handovers
# ---------------------------------------------------------------------------


def test_a_whole_handover_is_reconstructible(audit):
    browser_control.request_help("s", "hit a login wall")
    browser_control.take("s")
    browser_control.release("s")

    events = [r["event"] for r in audit()]
    assert events == [
        tool_audit.BROWSER_HELP_REQUESTED,
        tool_audit.BROWSER_CONTROL_TAKEN,
        tool_audit.BROWSER_CONTROL_RELEASED,
    ]


def test_the_reason_the_agent_got_stuck_is_recorded(audit):
    browser_control.request_help("s", "the site wants a 2FA code")
    record = audit()[0]
    assert record["reason"] == "the site wants a 2FA code"
    assert record["session"] == "s"


def test_an_unprompted_takeover_is_recorded_too(audit):
    """Someone stepping in without being asked is just as much a handover."""
    browser_control.take("s", "it was about to do something daft")
    events = [r["event"] for r in audit()]
    assert events == [tool_audit.BROWSER_CONTROL_TAKEN]


def test_a_redundant_take_is_not_recorded_twice(audit):
    """Taking control you already hold is a no-op, and the log should say so
    by not claiming a second handover happened."""
    browser_control.take("s")
    browser_control.take("s")
    assert len(audit()) == 1


# ---------------------------------------------------------------------------
# Secrets — recorded, never captured
# ---------------------------------------------------------------------------

SECRET = "hunter2-correct-horse-battery"


def test_a_secret_exchange_is_recorded_without_the_secret(audit):
    typed = []
    browser_secret.request_secret("s", "@e7", "admin password")
    browser_secret.supply_secret(
        "s", SECRET, filler=lambda ref, value: typed.append((ref, value))
    )

    records = audit()
    assert [r["event"] for r in records] == [
        tool_audit.BROWSER_SECRET_REQUESTED,
        tool_audit.BROWSER_SECRET_SUPPLIED,
    ]
    # The value reached the field...
    assert typed == [("@e7", SECRET)]
    # ...and nowhere near the log.
    assert SECRET not in json.dumps(records)


def test_the_record_says_what_was_asked_for_and_how_long_it_was(audit):
    browser_secret.request_secret("s", "@e7", "the VPN password")
    browser_secret.supply_secret("s", SECRET, filler=lambda r, v: None)

    asked, supplied = audit()
    assert asked["ref"] == "@e7"
    assert asked["label"] == "the VPN password"
    assert supplied["characters"] == len(SECRET)
    assert supplied["filled"] is True


def test_a_failed_fill_is_recorded_as_not_filled(audit):
    """Otherwise the log would say a password went in when it did not."""

    def _explode(ref, value):
        raise RuntimeError("element vanished")

    browser_secret.request_secret("s", "@e7")
    with pytest.raises(browser_secret.SecretFillError):
        browser_secret.supply_secret("s", SECRET, filler=_explode)

    supplied = audit()[-1]
    assert supplied["event"] == tool_audit.BROWSER_SECRET_SUPPLIED
    assert supplied["filled"] is False
    assert SECRET not in json.dumps(supplied)


def test_a_leaky_filler_cannot_get_the_value_into_the_log(audit):
    def _leaky(ref, value):
        raise RuntimeError(f"failed while typing {value}")

    browser_secret.request_secret("s", "@e7")
    with pytest.raises(browser_secret.SecretFillError):
        browser_secret.supply_secret("s", SECRET, filler=_leaky)

    assert SECRET not in json.dumps(audit())


# ---------------------------------------------------------------------------
# Vocabulary
# ---------------------------------------------------------------------------


def test_the_event_names_match_the_canonical_vocabulary():
    """browser_control and browser_secret hold their event names as literals so
    they import nothing that could reach a browser. This is what keeps those
    literals honest."""
    assert browser_control._AUDIT_HELP_REQUESTED == tool_audit.BROWSER_HELP_REQUESTED
    assert browser_control._AUDIT_CONTROL_TAKEN == tool_audit.BROWSER_CONTROL_TAKEN
    assert (
        browser_control._AUDIT_CONTROL_RELEASED == tool_audit.BROWSER_CONTROL_RELEASED
    )
    assert browser_secret._AUDIT_REQUESTED == tool_audit.BROWSER_SECRET_REQUESTED
    assert browser_secret._AUDIT_SUPPLIED == tool_audit.BROWSER_SECRET_SUPPLIED


def test_a_broken_audit_does_not_break_a_handover(monkeypatch):
    """Auditing observes; it must never be able to stop a person taking the
    wheel of a browser."""
    browser_control.reset()
    monkeypatch.setattr(
        "tools.tool_audit.record", lambda *a, **kw: (_ for _ in ()).throw(OSError("x"))
    )
    assert browser_control.take("s").holder == browser_control.HUMAN
    browser_control.reset()


def test_a_broken_audit_does_not_break_a_secret_fill(monkeypatch):
    browser_secret.reset()
    monkeypatch.setattr(
        "tools.tool_audit.record", lambda *a, **kw: (_ for _ in ()).throw(OSError("x"))
    )
    typed = []
    browser_secret.request_secret("s", "@e7")
    result = browser_secret.supply_secret(
        "s", SECRET, filler=lambda r, v: typed.append(v)
    )
    assert result["supplied"] is True
    assert typed == [SECRET]
    browser_secret.reset()
