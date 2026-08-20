"""B3: refuse actions aimed at a page view that has moved on."""

from __future__ import annotations

import pytest

from tools import browser_commands as bc
from tools.browser_view_state import (
    NO_VIEW,
    StaleViewError,
    check_view_id,
    current_view_id,
    note_navigation,
    note_snapshot,
    reset,
    snapshot_state,
)


@pytest.fixture(autouse=True)
def _clean():
    reset()
    yield
    reset()


# ---------------------------------------------------------------------------
# The counter
# ---------------------------------------------------------------------------


def test_a_fresh_session_has_no_view():
    assert current_view_id("s") == NO_VIEW


def test_the_first_snapshot_issues_a_view():
    assert note_snapshot("s") == "v1"
    assert current_view_id("s") == "v1"


def test_each_snapshot_issues_a_new_view():
    assert [note_snapshot("s") for _ in range(3)] == ["v1", "v2", "v3"]


def test_navigation_voids_existing_references():
    note_snapshot("s")
    assert note_navigation("s") == "v2"


def test_sessions_are_independent():
    note_snapshot("a")
    note_snapshot("a")
    note_snapshot("b")
    assert current_view_id("a") == "v2"
    assert current_view_id("b") == "v1"


def test_a_missing_session_key_uses_one_shared_default():
    note_snapshot(None)
    assert current_view_id("") == "v1"
    assert current_view_id("default") == "v1"


def test_reset_of_one_session_leaves_the_others():
    note_snapshot("a")
    note_snapshot("b")
    reset("a")
    assert current_view_id("a") == NO_VIEW
    assert current_view_id("b") == "v1"


def test_reset_of_everything():
    note_snapshot("a")
    note_snapshot("b")
    reset()
    assert current_view_id("a") == NO_VIEW
    assert current_view_id("b") == NO_VIEW


def test_a_new_session_starts_over_so_an_old_id_reads_as_stale():
    """An id held across a session boundary must not silently keep working."""
    note_snapshot("s")
    note_snapshot("s")  # v2
    reset("s")
    note_snapshot("s")  # v1 again
    with pytest.raises(StaleViewError):
        check_view_id("s", "v2")


def test_state_is_reportable():
    note_snapshot("s")
    state = snapshot_state("s")
    assert state.generation == 1
    assert state.view_id == "v1"


# ---------------------------------------------------------------------------
# The check
# ---------------------------------------------------------------------------


def test_the_current_view_is_accepted():
    view = note_snapshot("s")
    check_view_id("s", view)  # does not raise


def test_a_superseded_view_is_refused():
    old = note_snapshot("s")
    note_snapshot("s")
    with pytest.raises(StaleViewError) as excinfo:
        check_view_id("s", old)
    assert excinfo.value.claimed == "v1"
    assert excinfo.value.current == "v2"


def test_a_view_from_before_a_navigation_is_refused():
    old = note_snapshot("s")
    note_navigation("s")
    with pytest.raises(StaleViewError):
        check_view_id("s", old)


@pytest.mark.parametrize("claim", [None, "", 0, False])
def test_omitting_the_view_id_is_accepted(claim):
    """Optional by design: existing callers and models that have not learned
    the parameter must behave exactly as before."""
    note_snapshot("s")
    check_view_id("s", claim)  # does not raise


def test_a_claim_made_before_any_snapshot_is_refused():
    """There is no view such a claim could honestly refer to."""
    with pytest.raises(StaleViewError):
        check_view_id("s", "v1")


def test_the_error_tells_the_caller_what_to_do():
    old = note_snapshot("s")
    note_snapshot("s")
    with pytest.raises(StaleViewError) as excinfo:
        check_view_id("s", old)
    message = str(excinfo.value)
    assert "out of date" in message
    assert "fresh snapshot" in message


def test_a_failed_snapshot_does_not_invalidate_held_references():
    """note_snapshot is called after success, so nothing moves on failure."""
    view = note_snapshot("s")
    # ... a snapshot attempt fails, so note_snapshot is never called ...
    check_view_id("s", view)  # the caller's references are still good


# ---------------------------------------------------------------------------
# Command classification (shared with B1)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("command", ["snapshot", "console", "errors", "screenshot"])
def test_read_commands_are_reads(command):
    assert bc.is_read(command)
    assert not bc.is_acting(command)


@pytest.mark.parametrize("command", ["click", "fill", "press", "open", "eval", "close"])
def test_acting_commands_are_acting(command):
    assert bc.is_acting(command)
    assert not bc.is_read(command)


def test_an_unknown_command_counts_as_acting():
    """The two mistakes are not symmetric: wrongly refusing a read costs a
    retry, wrongly admitting an action lets it past the gate."""
    assert bc.is_acting("some_new_verb_nobody_classified")


@pytest.mark.parametrize("raw", ["Click", " click ", "CLICK"])
def test_classification_is_case_and_space_insensitive(raw):
    assert bc.is_acting(raw)
    assert bc.normalize(raw) == "click"


@pytest.mark.parametrize("command", ["open", "navigate", "back", "forward", "reload"])
def test_navigating_commands(command):
    assert bc.navigates(command)


def test_scroll_does_not_navigate():
    assert not bc.navigates("scroll")
    assert bc.is_acting("scroll")


def test_only_snapshot_issues_a_new_view():
    assert bc.issues_new_view("snapshot")
    assert not bc.issues_new_view("click")
    assert not bc.issues_new_view("open")  # navigation voids, does not issue


@pytest.mark.parametrize("command", ["click", "fill", "type"])
def test_ref_consuming_commands(command):
    assert bc.consumes_ref(command)


@pytest.mark.parametrize("command", ["press", "scroll", "open", "snapshot"])
def test_commands_that_name_no_element(command):
    assert not bc.consumes_ref(command)


def test_every_read_command_is_absent_from_the_acting_set():
    """The two sets must not overlap, or classification depends on order."""
    assert not (bc.READ_COMMANDS & bc.ACTING_COMMANDS)
