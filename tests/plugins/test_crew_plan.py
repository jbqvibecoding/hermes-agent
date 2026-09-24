"""Hermes Crew — the plan a task intends to follow, and what it read on the way.

Two vocabularies answering the same question from opposite sides. The plan says
what the teammate means to do, seeded *before* the model runs so the operator
can see the shape of the work while it is still queued. The evidence says what
it was looking at — which is the cheapest possible answer to "why does it say
that", and a different question from the audit ledger's "what did it do".
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew import plan as crew_plan  # noqa: E402
from crew import tasks as crew_tasks  # noqa: E402


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    crew_db.close_all()
    connection = crew_db.connect()
    crew_db.upsert_bot(connection, bot_id="scout", name="Scout", role="research")
    yield connection
    crew_db.close_all()


# ---------------------------------------------------------------------------
# The plan
# ---------------------------------------------------------------------------


def test_a_task_has_a_plan_before_anything_has_run(conn):
    """Seeded at enqueue, not by the first turn. A plan that only appears once
    the model has produced one is a log — by then the operator has already been
    waiting without knowing what for."""
    task = crew_tasks.enqueue(conn, bot_id="scout", kind="routine", title="Digest")
    assert [s["title"] for s in task["plan"]]
    assert {s["status"] for s in task["plan"]} == {"pending"}


def test_the_seed_matches_the_kind_of_work(conn):
    routine = crew_tasks.enqueue(conn, bot_id="scout", kind="routine")
    deliverable = crew_tasks.enqueue(conn, bot_id="scout", kind="deliverable")
    assert routine["plan"] != deliverable["plan"]
    assert any("opens and is not empty" in s["title"] for s in deliverable["plan"])


def test_an_unknown_kind_still_gets_a_usable_plan(conn):
    task = crew_tasks.enqueue(conn, bot_id="scout", kind="something-new")
    assert len(task["plan"]) >= 2


def test_a_caller_supplied_plan_is_not_overwritten(conn):
    task = crew_tasks.enqueue(
        conn, bot_id="scout", kind="routine", plan=[{"id": "0", "title": "Just this"}],
    )
    assert [s["title"] for s in task["plan"]] == ["Just this"]


def test_a_step_status_nobody_agreed_on_becomes_pending():
    """A step claiming `done` in a vocabulary the renderer does not know would
    show as nothing at all. Admitting it has not started is the safer lie."""
    [step] = crew_plan.normalise_plan([{"title": "Read the inbox", "status": "done"}])
    assert step["status"] == "pending"


def test_a_bare_list_of_strings_is_still_a_plan():
    """Lenient on purpose: a model that sent titles has told us its plan, and
    refusing it replaces a usable plan with none."""
    steps = crew_plan.normalise_plan(["Read the inbox", "Write the summary"])
    assert [s["title"] for s in steps] == ["Read the inbox", "Write the summary"]
    assert [s["id"] for s in steps] == ["0", "1"]


def test_nonsense_is_dropped_rather_than_stored():
    assert crew_plan.normalise_plan([{"title": ""}, 42, None, {"no": "title"}]) == []
    assert crew_plan.normalise_plan("not a list") == []


def test_waiting_is_a_step_status_and_not_a_task_status():
    """OpenMuse keeps the two unions apart and so do we: a step can be blocked
    on somebody while the task is running. Merging them forces one to lie."""
    assert "waiting" in crew_plan.STEP_STATUSES
    assert "waiting" not in crew_tasks.STATUSES
    assert "queued" not in crew_plan.STEP_STATUSES


# ---------------------------------------------------------------------------
# set_plan
# ---------------------------------------------------------------------------


def test_the_model_can_replace_the_plan_for_its_running_task(conn, monkeypatch):
    from crew import orchestrator
    from crew import tools as crew_tools

    task = crew_tasks.enqueue(conn, bot_id="scout", kind="routine")
    claimed = crew_tasks.claim(conn, task)
    crew_tasks.set_current("scout", claimed["id"], claimed["lease_id"])
    monkeypatch.setattr(
        orchestrator, "resolve_turn",
        lambda: orchestrator.TurnContext(bot_id="scout", thread_id="dm:scout"),
    )
    try:
        crew_tools.handle_set_plan({"steps": [
            {"title": "Read the inbox", "status": "succeeded"},
            {"title": "Wait for finance", "status": "waiting"},
        ]})
    finally:
        crew_tasks.clear_current("scout")

    saved = crew_tasks.get(conn, task["id"])["plan"]
    assert [s["title"] for s in saved] == ["Read the inbox", "Wait for finance"]
    assert [s["status"] for s in saved] == ["succeeded", "waiting"]


def test_planning_with_no_task_running_says_so_instead_of_failing(conn, monkeypatch):
    """Most turns are somebody typing a question. There is no task to hang a
    plan on, and that is not an error worth a stack trace."""
    import json

    from crew import orchestrator
    from crew import tools as crew_tools

    monkeypatch.setattr(
        orchestrator, "resolve_turn",
        lambda: orchestrator.TurnContext(bot_id="scout", thread_id="dm:scout"),
    )
    result = json.loads(crew_tools.handle_set_plan({"steps": [{"title": "x"}]}))
    assert "no task running" in result["error"]


def test_planning_after_losing_the_task_tells_the_model_plainly(conn, monkeypatch):
    import json

    from crew import orchestrator
    from crew import tools as crew_tools

    task = crew_tasks.enqueue(conn, bot_id="scout", kind="routine")
    claimed = crew_tasks.claim(conn, task)
    crew_tasks.set_current("scout", claimed["id"], claimed["lease_id"])
    conn.execute("UPDATE tasks SET status = 'cancelled' WHERE id = ?", (task["id"],))
    conn.commit()

    monkeypatch.setattr(
        orchestrator, "resolve_turn",
        lambda: orchestrator.TurnContext(bot_id="scout", thread_id="dm:scout"),
    )
    try:
        result = json.loads(crew_tools.handle_set_plan({"steps": [{"title": "x"}]}))
    finally:
        crew_tasks.clear_current("scout")
    assert "taken over or stopped" in result["error"]


def test_set_plan_cannot_be_configured_away():
    """It only affects this turn's own bookkeeping. Denying it would leave a
    teammate working invisibly, which is a worse outcome than any it prevents."""
    from crew import grants as crew_grants

    assert "set_plan" in crew_grants.CRITICAL_TOOLS


# ---------------------------------------------------------------------------
# Evidence
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("tool", "kind"),
    [
        ("browser_navigate", "web"), ("web_search", "web"), ("fetch_url", "web"),
        ("read_file", "file"), ("search_files", "file"),
        ("gmail_list", "mail"), ("imap_fetch", "mail"),
    ],
)
def test_reading_something_is_evidence(tool, kind):
    assert crew_plan.evidence_kind(tool) == kind


@pytest.mark.parametrize(
    "tool",
    [
        "write_file", "terminal", "message_user",
        # Each of these carries a subject word that the read patterns would
        # otherwise claim. A write direction has to be checked first, or
        # `send_email` gets filed as something the teammate *learned from* an
        # email it wrote itself.
        "send_email", "gmail_send", "post_page", "create_doc", "edit_file",
        "publish_url", "update_page",
    ],
)
def test_doing_something_is_not_evidence(tool):
    """Writing a file says nothing about why a conclusion was reached. That is
    the audit ledger's question, and it already answers it."""
    assert crew_plan.evidence_kind(tool) is None


def test_evidence_keeps_the_head_of_what_came_back_not_a_summary():
    """Summarising here would put a model in charge of deciding what mattered
    about its own sources — precisely what a person opens this to check."""
    item = crew_plan.evidence_from_call(
        "browser_navigate", {"url": "https://example.com/pricing"},
        {"content": "Pro plan is $29 per seat per month."},
    )
    assert item["kind"] == "web"
    assert item["title"] == "https://example.com/pricing"
    assert item["url"] == "https://example.com/pricing"
    assert "29 per seat" in item["excerpt"]


def test_a_read_that_returned_nothing_is_not_evidence():
    assert crew_plan.evidence_from_call("read_file", {"path": "/x"}, "") is None


def test_reading_the_same_thing_twice_is_recorded_once():
    """A teammate that read one page twice has not learned anything twice, and
    the repeat makes the genuinely distinct sources harder to see."""
    item = {"kind": "web", "title": "a", "excerpt": "same", "url": ""}
    items = crew_plan.append_evidence([item], dict(item))
    assert len(items) == 1


def test_evidence_is_bounded_and_keeps_the_recent_ones():
    """Past a couple of dozen it is a transcript, and the recent sources are
    the ones the current conclusion rests on."""
    items: list = []
    for index in range(crew_plan.MAX_EVIDENCE + 5):
        items = crew_plan.append_evidence(
            items, {"kind": "web", "title": f"p{index}", "excerpt": str(index), "url": ""},
        )
    assert len(items) == crew_plan.MAX_EVIDENCE
    assert items[-1]["title"] == f"p{crew_plan.MAX_EVIDENCE + 4}"


def test_a_tool_call_during_a_task_lands_in_its_evidence(conn):
    from crew import hooks as crew_hooks

    task = crew_tasks.enqueue(conn, bot_id="scout", kind="research", thread_id="dm:scout")
    claimed = crew_tasks.claim(conn, task)
    crew_tasks.set_current("scout", claimed["id"], claimed["lease_id"])
    try:
        crew_hooks.on_post_tool_call(
            tool_name="browser_navigate", args={"url": "https://example.com"},
            result={"content": "Pro plan is $29."}, task_id="crew-scout",
            tool_call_id="c1", status="ok",
        )
    finally:
        crew_tasks.clear_current("scout")

    [item] = crew_tasks.get(conn, task["id"])["evidence"]
    assert item["url"] == "https://example.com"


def test_a_tool_call_outside_a_task_records_no_evidence(conn):
    """Somebody typing a question has the thread itself as the record."""
    from crew import hooks as crew_hooks

    task = crew_tasks.enqueue(conn, bot_id="scout", kind="research")
    crew_hooks.on_post_tool_call(
        tool_name="browser_navigate", args={"url": "https://example.com"},
        result={"content": "x"}, task_id="crew-scout", tool_call_id="c1", status="ok",
    )
    assert crew_tasks.get(conn, task["id"])["evidence"] == []


def test_a_failed_read_is_not_recorded_as_something_it_read(conn):
    from crew import hooks as crew_hooks

    task = crew_tasks.enqueue(conn, bot_id="scout", kind="research")
    claimed = crew_tasks.claim(conn, task)
    crew_tasks.set_current("scout", claimed["id"], claimed["lease_id"])
    try:
        crew_hooks.on_post_tool_call(
            tool_name="browser_navigate", args={"url": "https://example.com"},
            result={"error": "connection refused"}, task_id="crew-scout",
            tool_call_id="c1", status="error",
        )
    finally:
        crew_tasks.clear_current("scout")
    assert crew_tasks.get(conn, task["id"])["evidence"] == []
