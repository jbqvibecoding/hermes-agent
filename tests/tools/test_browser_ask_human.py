"""B5.2: the agent-side entry point for asking a person for help.

Before this, `browser_control.request_help` and `browser_secret.request_secret`
existed, were tested, and were wired to the audit log — but no model-facing tool
called them, so the agent could not reach either. The feature looked complete
from the inside and was unreachable from the outside.
"""

from __future__ import annotations

import json

import pytest

from tools import browser_control, browser_secret
from tools.browser_tool import browser_ask_human


@pytest.fixture(autouse=True)
def _clean():
    browser_control.reset()
    browser_secret.reset()
    yield
    browser_control.reset()
    browser_secret.reset()


# ---------------------------------------------------------------------------
# need="help"
# ---------------------------------------------------------------------------


def test_asking_for_help_raises_the_flag():
    out = json.loads(browser_ask_human("help", reason="hit a login wall", task_id="t"))
    assert out["success"] is True
    assert out["asked"] == "help"
    assert browser_control.get_state("t").requested is True
    assert browser_control.get_state("t").reason == "hit a login wall"


def test_asking_for_help_does_not_hand_over_control():
    """The agent must not be able to give itself a human."""
    browser_ask_human("help", reason="x", task_id="t")
    assert not browser_control.human_may_drive("t")
    assert browser_control.get_state("t").holder == browser_control.AGENT


def test_asking_for_help_does_not_block_the_agent():
    browser_ask_human("help", reason="x", task_id="t")
    browser_control.assert_agent_may_act("t", "click")  # does not raise


def test_the_help_reply_explains_what_happens_next():
    out = json.loads(browser_ask_human("help", task_id="t"))
    note = out["note"]
    assert "/browser take" in note
    assert "/browser release" in note
    assert "refused" in note
    assert "reads still work" in note


# ---------------------------------------------------------------------------
# need="secret"
# ---------------------------------------------------------------------------


def test_asking_for_a_secret_registers_the_request():
    out = json.loads(
        browser_ask_human("secret", ref="@e7", label="admin password", task_id="t")
    )
    assert out["success"] is True
    assert out["ref"] == "@e7"
    pending = browser_secret.pending_secret("t")
    assert pending is not None and pending.ref == "@e7"


def test_a_secret_request_must_name_a_field():
    out = json.loads(browser_ask_human("secret", task_id="t"))
    assert out["success"] is False
    assert "ref" in out["error"]
    assert browser_secret.pending_secret("t") is None


def test_the_secret_reply_tells_the_agent_not_to_ask_for_it_in_chat():
    """The failure mode worth pre-empting: an agent that helpfully asks the
    user to paste the password into the conversation defeats the whole point."""
    out = json.loads(browser_ask_human("secret", ref="@e7", task_id="t"))
    note = out["note"]
    assert "never see the value" in note
    assert "transcript" in note
    assert "/browser secret" in note


def test_a_label_is_optional():
    out = json.loads(browser_ask_human("secret", ref="@e7", task_id="t"))
    assert out["label"]  # defaulted, not empty


# ---------------------------------------------------------------------------
# Bad input
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("need", ["", "  ", "takeover", "password", None])
def test_an_unknown_need_is_refused_rather_than_silently_ignored(need):
    out = json.loads(browser_ask_human(need, task_id="t"))
    assert out["success"] is False
    assert "help" in out["error"] and "secret" in out["error"]


@pytest.mark.parametrize("need,expected", [("HELP", True), ("  Secret  ", True)])
def test_the_need_is_case_and_space_insensitive(need, expected):
    out = json.loads(browser_ask_human(need, ref="@e1", task_id="t"))
    assert out["success"] is expected


def test_a_broken_state_store_is_reported_not_raised(monkeypatch):
    monkeypatch.setattr(
        "tools.browser_control.request_help",
        lambda *a, **kw: (_ for _ in ()).throw(RuntimeError("store down")),
    )
    out = json.loads(browser_ask_human("help", task_id="t"))
    assert out["success"] is False


# ---------------------------------------------------------------------------
# Reachability — the whole point of B5.2
# ---------------------------------------------------------------------------


def test_the_tool_is_registered():
    from tools.registry import registry

    assert registry.get_entry("browser_ask_human") is not None


def test_the_tool_is_exposed_in_every_toolset_that_carries_the_browser():
    """AGENTS.md: registration alone does not expose a tool — it must appear in
    a toolset. A tool registered but not listed is invisible to the agent, which
    is exactly the bug this milestone exists to fix."""
    import toolsets

    source = open(toolsets.__file__, encoding="utf-8").read()
    # Every list that carries browser_dialog should also carry the new tool.
    assert source.count('"browser_dialog"') == source.count('"browser_ask_human"'), (
        "browser_ask_human is missing from at least one toolset that lists the "
        "other browser tools"
    )


def test_the_registered_handler_forwards_every_argument():
    from tools.registry import registry

    entry = registry.get_entry("browser_ask_human")
    out = json.loads(
        entry.handler(
            {"need": "secret", "ref": "@e9", "label": "the VPN password"},
            task_id="t",
        )
    )
    assert out["ref"] == "@e9"
    assert out["label"] == "the VPN password"
