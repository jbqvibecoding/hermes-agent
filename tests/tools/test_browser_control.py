"""B1: who is driving the browser, and what the other one may do meanwhile."""

from __future__ import annotations

import pytest

from tools.browser_control import (
    AGENT,
    HUMAN,
    HumanHasControlError,
    assert_agent_may_act,
    get_state,
    human_may_drive,
    pending_help_requests,
    release,
    request_help,
    reset,
    sessions_with_human_control,
    take,
)


@pytest.fixture(autouse=True)
def _clean():
    reset()
    yield
    reset()


# ---------------------------------------------------------------------------
# The agent cannot grant itself a human
# ---------------------------------------------------------------------------


def test_a_fresh_session_is_agent_driven():
    state = get_state("s")
    assert state.holder == AGENT
    assert not state.human_driving
    assert not state.requested


def test_asking_for_help_does_not_hand_over_control():
    """The load-bearing property: an agent that could give itself a human could
    also give itself the wheel back."""
    state = request_help("s", "hit a login wall")
    assert state.requested is True
    assert state.holder == AGENT
    assert not human_may_drive("s")


def test_asking_for_help_does_not_block_the_agent():
    """Raising a flag is not the same as stopping. The agent may still work
    while it waits — it might find another way through."""
    request_help("s", "2FA")
    assert_agent_may_act("s", "click")  # does not raise


def test_the_reason_is_recorded_for_the_human_to_read():
    request_help("s", "needs a password for the admin console")
    assert "admin console" in get_state("s").reason


def test_asking_again_refines_the_reason():
    request_help("s", "stuck")
    request_help("s", "stuck on a CAPTCHA")
    assert get_state("s").reason == "stuck on a CAPTCHA"


def test_a_pending_request_is_discoverable():
    request_help("s", "login wall")
    assert "s" in pending_help_requests()


def test_taking_control_clears_the_pending_request():
    request_help("s", "login wall")
    take("s")
    assert "s" not in pending_help_requests()


# ---------------------------------------------------------------------------
# Taking and releasing
# ---------------------------------------------------------------------------


def test_a_person_takes_the_wheel():
    state = take("s")
    assert state.holder == HUMAN
    assert state.since > 0
    assert human_may_drive("s")


def test_a_person_can_take_control_unprompted():
    """Someone watching it go wrong should not have to wait to be asked."""
    assert not get_state("s").requested
    assert take("s").holder == HUMAN


def test_taking_control_twice_keeps_the_original_timestamp():
    """ "How long have they been driving" must stay honest."""
    first = take("s")
    second = take("s")
    assert second.since == first.since


def test_releasing_hands_the_browser_back():
    take("s")
    state = release("s")
    assert state.holder == AGENT
    assert not human_may_drive("s")


def test_releasing_clears_the_reason():
    """The next request for help should say why afresh."""
    request_help("s", "old excuse")
    take("s")
    release("s")
    assert get_state("s").reason == ""


def test_releasing_a_session_nobody_holds_is_harmless():
    assert release("s").holder == AGENT


def test_taking_control_carries_the_agents_reason_forward():
    request_help("s", "needs a login")
    assert "needs a login" in take("s").reason


def test_an_explicit_reason_wins_over_the_agents():
    request_help("s", "agent's version")
    assert take("s", "I want to check something").reason == "I want to check something"


# ---------------------------------------------------------------------------
# Refused, not queued
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("command", ["click", "fill", "type", "press", "open", "eval"])
def test_agent_actions_are_refused_while_a_person_drives(command):
    take("s")
    with pytest.raises(HumanHasControlError):
        assert_agent_may_act("s", command)


@pytest.mark.parametrize("command", ["snapshot", "console", "errors", "screenshot"])
def test_agent_reads_are_allowed_while_a_person_drives(command):
    """Deliberate divergence from OpenBot: after a person logs in, the agent
    has to be able to look at the page to find out what happened."""
    take("s")
    assert_agent_may_act("s", command)  # does not raise


def test_an_unclassified_command_is_treated_as_an_action():
    """Gated by default, not exempt by default."""
    take("s")
    with pytest.raises(HumanHasControlError):
        assert_agent_may_act("s", "some_new_verb")


def test_actions_resume_after_release():
    take("s")
    release("s")
    assert_agent_may_act("s", "click")  # does not raise


def test_the_refusal_explains_itself_and_says_what_is_still_possible():
    take("s", "logging in for it")
    with pytest.raises(HumanHasControlError) as excinfo:
        assert_agent_may_act("s", "click")
    message = str(excinfo.value)
    assert "refused rather than queued" in message
    assert "logging in for it" in message
    assert "snapshot" in message  # tells the agent what it can still do


def test_the_refusal_carries_structured_detail():
    take("s", "why")
    with pytest.raises(HumanHasControlError) as excinfo:
        assert_agent_may_act("s", "click")
    assert excinfo.value.reason == "why"
    assert excinfo.value.since > 0


# ---------------------------------------------------------------------------
# Session scoping
# ---------------------------------------------------------------------------


def test_control_is_per_session():
    take("a")
    assert human_may_drive("a")
    assert not human_may_drive("b")
    assert_agent_may_act("b", "click")  # unaffected


def test_a_missing_session_key_uses_one_shared_default():
    take(None)
    assert human_may_drive("")
    assert human_may_drive("default")


def test_sessions_under_human_control_are_discoverable():
    take("a")
    request_help("b", "asked but nobody came")
    held = sessions_with_human_control()
    assert "a" in held
    assert "b" not in held


def test_reset_returns_a_session_to_the_agent():
    """A person holding the wheel of a browser that no longer exists is not
    still holding a wheel."""
    take("s")
    reset("s")
    assert not human_may_drive("s")
    assert_agent_may_act("s", "click")


def test_reset_of_one_session_leaves_the_others():
    take("a")
    take("b")
    reset("a")
    assert not human_may_drive("a")
    assert human_may_drive("b")


def test_reset_of_everything():
    take("a")
    take("b")
    reset()
    assert not human_may_drive("a")
    assert not human_may_drive("b")


def test_state_is_serialisable_for_a_status_surface():
    take("s", "logging in")
    payload = get_state("s").to_dict()
    assert payload["holder"] == HUMAN
    assert payload["reason"] == "logging in"
    assert isinstance(payload["since"], float)


def test_the_module_imports_no_browser():
    """Mirrors OpenBot keeping control.ts free of Playwright imports: the
    part that decides who may act must be testable without a browser."""
    import pathlib

    import tools.browser_control as mod

    source = pathlib.Path(mod.__file__).read_text(encoding="utf-8")
    for forbidden in ("playwright", "browser_tool", "browser_camofox", "subprocess"):
        assert forbidden not in source, f"{forbidden} leaked into the state machine"
