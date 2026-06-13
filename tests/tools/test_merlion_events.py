from __future__ import annotations

from tools import merlion_events as ev


# ---- from_multica ---------------------------------------------------------

def test_multica_task_running_maps_to_start():
    assert ev.from_multica("task:running") == "task.start"


def test_multica_completed_and_failed():
    assert ev.from_multica("task:completed") == "task.done"
    assert ev.from_multica("task:failed") == "task.failed"


def test_multica_member_added_is_team_join():
    assert ev.from_multica("member:added") == "team.join"


def test_multica_comment_is_message():
    assert ev.from_multica("comment:created") == "message"


def test_unknown_multica_event_drops():
    assert ev.from_multica("task:waiting_local_directory") is None
    assert ev.from_multica("totally:unknown") is None


# ---- from_hermes ----------------------------------------------------------

def test_hermes_plan_ready():
    assert ev.from_hermes("plan_ready") == "plan.ready"


def test_hermes_artifact_created():
    assert ev.from_hermes("artifact_created") == "artifact.created"


def test_hermes_run_completed():
    assert ev.from_hermes("run_completed") == "run.done"


def test_unknown_hermes_kind_drops():
    assert ev.from_hermes("mystery") is None


# ---- to_multica_mutation + invariants -------------------------------------

def test_to_multica_mutation_roundtrip():
    assert ev.to_multica_mutation("task.start") == "start"
    assert ev.to_multica_mutation("task.reassign") == "reassign"
    # emit-only events have no mutation
    assert ev.to_multica_mutation("plan.ready") is None
    assert ev.to_multica_mutation("artifact.created") is None


def test_all_mapped_outputs_are_canonical_merlion_events():
    for name in list(ev._FROM_MULTICA.values()) + list(ev._FROM_HERMES.values()):
        assert ev.is_merlion_event(name), name
