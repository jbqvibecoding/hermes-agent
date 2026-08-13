"""D1 wiring: `_run_single_child` must honour the termination contract.

`tests/tools/test_delegate.py` drives the full `delegate_task` entry point and
therefore needs `run_agent` (and its dependency chain) importable. This module
deliberately goes one level lower — straight at `_run_single_child` with a fake
child object — so the contract is covered even where that chain is unavailable,
and so a failure here points at the delegation result path rather than at
agent construction.
"""

from __future__ import annotations

import pytest

from tools import subagent_termination
from tools.delegate_tool import _run_single_child


class FakeChild:
    """The minimum surface `_run_single_child` touches on a child agent."""

    def __init__(self, result=None, *, raises=None, stream=(), hang=False):
        self._result = result
        self._raises = raises
        self._stream = list(stream)
        self._hang = hang
        self.model = "fake-model"
        self.session_prompt_tokens = 10
        self.session_completion_tokens = 20
        self.session_estimated_cost_usd = 0.0
        self.session_reasoning_tokens = 0
        self.tool_progress_callback = None
        self._delegate_role = "leaf"
        self._delegate_saved_tool_names = []
        self._credential_pool = None
        self.closed = False

    def run_conversation(self, user_message=None, task_id=None, stream_callback=None):
        for chunk in self._stream:
            if stream_callback:
                stream_callback(chunk)
        if self._raises is not None:
            raise self._raises
        if self._hang:
            # Long enough that a sub-second configured timeout always wins;
            # the daemon pool abandons the thread, so nothing is left running.
            import time as _t

            _t.sleep(30)
        return self._result

    def get_activity_summary(self):
        return {"api_call_count": 1, "max_iterations": 10, "current_tool": None}

    def close(self):
        self.closed = True


def _run(child, **kwargs):
    return _run_single_child(
        0, "do the thing", child=child, parent_agent=None, **kwargs
    )


# ---------------------------------------------------------------------------
# Every terminal path carries a stop reason and a settlement
# ---------------------------------------------------------------------------


def test_clean_finish():
    entry = _run(
        FakeChild({"final_response": "all done", "completed": True, "api_calls": 2})
    )
    assert entry["stop_reason"] == subagent_termination.COMPLETED
    assert entry["summary"] == "all done"
    assert entry["partial_output"] is False
    assert "finished normally" in entry["settlement"]


def test_interrupted_child_reports_aborted():
    entry = _run(
        FakeChild({
            "final_response": "got partway",
            "completed": False,
            "interrupted": True,
        })
    )
    assert entry["stop_reason"] == subagent_termination.ABORTED
    assert entry["exit_reason"] == "interrupted"  # legacy field unchanged
    assert entry["summary"] == "got partway"
    assert entry["partial_output"] is True


def test_iteration_exhaustion_reports_max_iterations():
    entry = _run(FakeChild({"final_response": "still working", "completed": False}))
    assert entry["stop_reason"] == subagent_termination.MAX_ITERATIONS
    assert entry["exit_reason"] == "max_iterations"
    assert entry["partial_output"] is True


def test_content_policy_refusal_is_not_flattened_into_error():
    entry = _run(
        FakeChild({
            "final_response": "I can't help with that.",
            "completed": False,
            "error": "content_policy_blocked: unsafe",
        })
    )
    assert entry["stop_reason"] == subagent_termination.REFUSAL
    assert "content-policy" in entry["settlement"]


def test_provider_truncation_reports_max_tokens():
    entry = _run(
        FakeChild({
            "final_response": "the first half of the ans",
            "completed": False,
            "partial": True,
            "error": "Response truncated due to output length limit",
        })
    )
    assert entry["stop_reason"] == subagent_termination.MAX_TOKENS
    assert entry["summary"].startswith("the first half")


def test_child_exception_becomes_a_result_not_an_exception():
    """Delegation must never raise into the parent's turn."""
    entry = _run(FakeChild(raises=RuntimeError("child blew up")))
    assert entry["stop_reason"] == subagent_termination.ERROR
    assert entry["status"] == "error"
    assert "child blew up" in entry["error"]
    assert entry["settlement"]


def test_timeout_becomes_a_result_not_an_exception(monkeypatch):
    monkeypatch.setattr("tools.delegate_tool._get_child_timeout", lambda: 0.2)
    entry = _run(
        FakeChild({"final_response": "never returned", "completed": True}, hang=True)
    )
    assert entry["stop_reason"] == subagent_termination.TIMEOUT
    assert entry["status"] == "timeout"
    assert "time limit" in entry["settlement"]


# ---------------------------------------------------------------------------
# Partial work survives a run that did not finish
# ---------------------------------------------------------------------------


def test_streamed_text_survives_a_timeout(monkeypatch):
    """The regression this exists for: the timeout path used to return
    `summary: None`, discarding everything the child had already produced."""
    monkeypatch.setattr("tools.delegate_tool._get_child_timeout", lambda: 0.2)
    child = FakeChild(
        {"completed": True}, hang=True, stream=["I read ", "the config file"]
    )
    entry = _run(child)
    assert entry["summary"] == "I read the config file"
    assert entry["partial_output"] is True
    assert "before stopping" in entry["settlement"]


def test_streamed_text_survives_a_crash():
    child = FakeChild(raises=RuntimeError("boom"), stream=["partial thought"])
    entry = _run(child)
    assert entry["summary"] == "partial thought"
    assert entry["partial_output"] is True


def test_a_child_that_left_nothing_still_gets_a_settlement(monkeypatch):
    monkeypatch.setattr("tools.delegate_tool._get_child_timeout", lambda: 0.2)
    entry = _run(FakeChild({"completed": True}, hang=True))
    assert entry["summary"] is None
    assert "left no closing message" in entry["settlement"]


def test_output_falls_back_to_the_last_assistant_message():
    entry = _run(
        FakeChild({
            "final_response": "",
            "completed": True,
            "messages": [
                {"role": "assistant", "content": "the finding"},
                {"role": "tool", "content": "raw tool output"},
            ],
        })
    )
    assert entry["summary"] == "the finding"


def test_empty_response_sentinel_is_still_treated_as_a_failure():
    """`(empty)` marks a transport bug, not a zero-content success."""
    entry = _run(FakeChild({"final_response": "(empty)", "completed": True}))
    assert entry["status"] == "failed"
    assert entry.get("error")


# ---------------------------------------------------------------------------
# The system's words are kept out of the child's
# ---------------------------------------------------------------------------


def test_settlement_is_never_folded_into_the_summary():
    entry = _run(FakeChild({"final_response": "I fixed it", "completed": True}))
    assert entry["summary"] == "I fixed it"
    assert entry["settlement"] not in entry["summary"]


def test_stale_file_warning_travels_as_a_system_note_not_inside_the_summary(
    monkeypatch,
):
    """It used to be concatenated onto the child's summary, which made the
    runtime's warning indistinguishable from something the child wrote."""
    import tools.file_state as file_state

    monkeypatch.setattr(file_state, "known_reads", lambda _tid: ["/repo/app.py"])
    monkeypatch.setattr(
        file_state,
        "writes_since",
        lambda tid, since, paths: {"other-task": ["/repo/app.py"]} if paths else {},
    )

    class Parent:
        _current_task_id = "parent-task"

    entry = _run_single_child(
        0,
        "edit the app",
        child=FakeChild({"final_response": "edited app.py", "completed": True}),
        parent_agent=Parent(),
    )

    assert entry["summary"] == "edited app.py"
    assert "re-read before editing" not in entry["summary"]
    notes = entry.get("system_notes") or []
    assert any("re-read before editing" in n for n in notes)
    assert entry["stale_paths"] == ["/repo/app.py"]


# ---------------------------------------------------------------------------
# Consumers can rely on the enum
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "result,kwargs",
    [
        ({"final_response": "x", "completed": True}, {}),
        ({"completed": False}, {}),
        ({"completed": False, "interrupted": True}, {}),
        ({"completed": False, "error": "nope"}, {}),
    ],
)
def test_every_returned_stop_reason_is_a_known_member(result, kwargs):
    entry = _run(FakeChild(result), **kwargs)
    assert subagent_termination.is_known(entry["stop_reason"])


def test_only_a_clean_finish_reads_as_success():
    completed = _run(FakeChild({"final_response": "x", "completed": True}))
    stalled = _run(FakeChild({"completed": False}))
    assert subagent_termination.is_success(completed["stop_reason"])
    assert not subagent_termination.is_success(stalled["stop_reason"])
