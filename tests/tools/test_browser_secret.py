"""B2: a person types the password; the agent never sees it.

The assertions that matter here are *negative* — that the value is absent from
the return, from the module's own state, and from every rendering of a request.
Asserting it comes back redacted would be a weaker property: redaction is a
filter over something you already have, and the point of this feature is not
having it.
"""

from __future__ import annotations

import gc
import json

import pytest

from tools.browser_secret import (
    SecretFillError,
    SecretRequestError,
    all_pending,
    cancel_secret,
    pending_secret,
    request_secret,
    reset,
    supply_secret,
)

SECRET = "hunter2-correct-horse-battery"


@pytest.fixture(autouse=True)
def _clean():
    reset()
    yield
    reset()


def _recorder():
    typed = []

    def _filler(ref, value):
        typed.append((ref, value))

    return typed, _filler


# ---------------------------------------------------------------------------
# Asking
# ---------------------------------------------------------------------------


def test_the_agent_names_a_field_and_a_label():
    req = request_secret("s", "@e7", "admin console password")
    assert req.ref == "@e7"
    assert req.label == "admin console password"
    assert pending_secret("s") == req


def test_a_request_must_name_a_field():
    with pytest.raises(SecretRequestError):
        request_secret("s", "")


def test_a_label_is_optional_but_always_present():
    assert request_secret("s", "@e1").label == "a password"


def test_a_request_can_be_corrected():
    """An agent that re-reads the page and finds the field moved should be able
    to say so, not be stuck asking about a ref that no longer exists."""
    request_secret("s", "@e7")
    request_secret("s", "@e9")
    assert pending_secret("s").ref == "@e9"


def test_requests_are_per_session():
    request_secret("a", "@e1")
    assert pending_secret("b") is None


def test_a_request_can_be_withdrawn():
    request_secret("s", "@e1")
    assert cancel_secret("s") is True
    assert pending_secret("s") is None
    assert cancel_secret("s") is False


def test_pending_requests_are_discoverable_for_a_prompt_surface():
    request_secret("s", "@e1", "the VPN password")
    assert "s" in all_pending()


# ---------------------------------------------------------------------------
# Supplying — the value goes to the field, and nowhere else
# ---------------------------------------------------------------------------


def test_the_value_reaches_the_field():
    typed, filler = _recorder()
    request_secret("s", "@e7", "password")
    supply_secret("s", SECRET, filler=filler)
    assert typed == [("@e7", SECRET)]


def test_the_agent_is_told_only_that_it_happened_and_how_long_it_was():
    typed, filler = _recorder()
    request_secret("s", "@e7", "password")
    result = supply_secret("s", SECRET, filler=filler)
    assert result["supplied"] is True
    assert result["characters"] == len(SECRET)
    assert set(result) == {"supplied", "characters", "ref", "label"}


def test_the_value_is_absent_from_the_return():
    typed, filler = _recorder()
    request_secret("s", "@e7")
    result = supply_secret("s", SECRET, filler=filler)
    assert SECRET not in json.dumps(result)
    for value in result.values():
        assert SECRET not in str(value)


def test_the_character_count_lets_the_agent_spot_a_truncated_field():
    typed, filler = _recorder()
    request_secret("s", "@e7")
    assert supply_secret("s", "abc", filler=filler)["characters"] == 3


def test_an_empty_value_still_reports_honestly():
    typed, filler = _recorder()
    request_secret("s", "@e7")
    result = supply_secret("s", "", filler=filler)
    assert result["characters"] == 0
    assert typed == [("@e7", "")]


def test_the_module_keeps_no_copy_of_the_value():
    """The strong property: after the call, nothing in this module holds it."""
    import tools.browser_secret as mod

    typed, filler = _recorder()
    request_secret("s", "@e7")
    supply_secret("s", SECRET, filler=filler)

    gc.collect()
    for name in dir(mod):
        attr = getattr(mod, name)
        if callable(attr) or name.startswith("__"):
            continue
        assert SECRET not in repr(attr), f"the value survived on {name}"


def test_the_request_object_has_nowhere_to_put_a_value():
    req = request_secret("s", "@e7", "password")
    assert SECRET not in repr(req)
    assert SECRET not in json.dumps(req.to_dict())
    assert not any("value" in f or "secret" in f for f in req.to_dict())


# ---------------------------------------------------------------------------
# One-shot
# ---------------------------------------------------------------------------


def test_supplying_clears_the_request():
    typed, filler = _recorder()
    request_secret("s", "@e7")
    supply_secret("s", SECRET, filler=filler)
    assert pending_secret("s") is None


def test_a_second_supply_is_refused():
    typed, filler = _recorder()
    request_secret("s", "@e7")
    supply_secret("s", SECRET, filler=filler)
    with pytest.raises(SecretRequestError):
        supply_secret("s", SECRET, filler=filler)
    assert len(typed) == 1


def test_a_value_with_no_request_behind_it_is_refused():
    """Filling *something* with a stray value would be worse than refusing."""
    typed, filler = _recorder()
    with pytest.raises(SecretRequestError):
        supply_secret("s", SECRET, filler=filler)
    assert not typed


def test_a_failed_fill_does_not_leave_the_request_open():
    """Otherwise a retry would type a value the agent was already told about."""

    def _explode(ref, value):
        raise RuntimeError("element vanished")

    request_secret("s", "@e7")
    with pytest.raises(SecretFillError):
        supply_secret("s", SECRET, filler=_explode)
    assert pending_secret("s") is None


def test_a_fill_failure_does_not_leak_the_value_in_its_message():
    """A filler that put the value in its own exception must not have that
    chained out through this module."""

    def _leaky(ref, value):
        raise RuntimeError(f"failed while typing {value}")

    request_secret("s", "@e7")
    with pytest.raises(SecretFillError) as excinfo:
        supply_secret("s", SECRET, filler=_leaky)

    assert SECRET not in str(excinfo.value)
    # `from None` alone would leave __context__ holding the leaky exception,
    # where a structured logger walking the chain would still find the value.
    assert excinfo.value.__cause__ is None
    assert excinfo.value.__context__ is None
    assert SECRET not in repr(excinfo.value.__dict__)


def test_the_fill_error_still_says_which_field_failed():
    def _explode(ref, value):
        raise RuntimeError("nope")

    request_secret("s", "@e7")
    with pytest.raises(SecretFillError) as excinfo:
        supply_secret("s", SECRET, filler=_explode)
    assert "@e7" in str(excinfo.value)


# ---------------------------------------------------------------------------
# Isolation
# ---------------------------------------------------------------------------


def test_supplying_to_one_session_does_not_satisfy_another():
    typed, filler = _recorder()
    request_secret("a", "@e1")
    request_secret("b", "@e2")
    supply_secret("a", SECRET, filler=filler)
    assert pending_secret("b") is not None
    assert typed == [("@e1", SECRET)]


def test_reset_drops_pending_requests():
    request_secret("s", "@e1")
    reset("s")
    assert pending_secret("s") is None


def test_the_module_imports_no_browser():
    """It cannot quietly stash the value on its way to a page it also owns."""
    import pathlib

    import tools.browser_secret as mod

    source = pathlib.Path(mod.__file__).read_text(encoding="utf-8")
    for forbidden in (
        "import playwright",
        "import requests",
        "from tools.browser_tool",
        "from tools.browser_camofox",
    ):
        assert forbidden not in source, f"{forbidden} leaked into the secret path"
