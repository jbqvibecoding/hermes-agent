"""Hermes Crew — the wire contract, and the conventions the ported UI depends on.

Every assertion here is about a shape some vendored TypeScript reads. Where a
test looks fussy, the comment says which file in ``errand/src`` would break, so
the next person can tell a real constraint from a preference.

The load-bearing one is the message id convention. ``useCrewController``
reconciles optimistic bubbles against server messages by parsing exactly
``{turn}:user`` and ``{turn}:agent``. Break it and nothing errors — messages
quietly duplicate instead of merging, which is the kind of bug you only notice
in a screenshot a week later.
"""

from __future__ import annotations

import contextlib
import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import activity as crew_activity  # noqa: E402
from crew import approvals as crew_approvals  # noqa: E402
from crew import contract  # noqa: E402
from crew import db as crew_db  # noqa: E402
from crew import orchestrator, roster  # noqa: E402
from crew import tools as crew_tools  # noqa: E402


# ---------------------------------------------------------------------------
# Tool classification — errand/src/clients/http/RuntaCloudAgentsClient.ts:56
#
# The renderer maps each kind to one icon off a closed set of five. A sixth
# kind, or a tool landing in the wrong one, renders as nothing or as a lie.
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "tool_name,expected",
    [
        ("browser_navigate", "browser"),
        ("browser_snapshot", "browser"),
        ("web_search", "browser"),
        ("take_screenshot", "browser"),
        ("terminal", "terminal"),
        ("shell_exec", "terminal"),
        ("execute_code", "terminal"),
        ("read_file", "file"),
        ("write_file", "file"),
        ("patch", "file"),
        ("search_files", "file"),
        ("glob", "file"),
        ("delegate_task", "handoff"),
        ("message_bot", "handoff"),
        ("kanban_create", "handoff"),
        ("save_memory_rule", "status"),
        ("ask_for_login", "status"),
        ("hold_for_approval", "status"),
        ("", "status"),
    ],
)
def test_every_tool_lands_in_one_of_errands_five_kinds(tool_name, expected):
    assert crew_activity.tool_activity_kind(tool_name) == expected
    assert expected in crew_activity.ACTIVITY_KINDS


def test_a_shell_command_is_titled_by_the_command_not_the_tool():
    # Errand drops the tool name when the command speaks for itself, so the
    # line reads as what the operator would have typed.
    assert crew_activity.activity_title("terminal", {"command": "npm test"}) == "npm test"
    assert crew_activity.activity_title("read_file", {"path": "src/app.py"}) == "read_file src/app.py"
    assert crew_activity.activity_title("think", {}) == "think"


def test_a_failed_tool_is_only_one_that_said_so():
    # Conservative on purpose: a tool whose *output* mentions an error is not a
    # failed tool, and painting it red would teach the operator to ignore red.
    assert crew_activity.looks_failed('{"success": false}') is True
    assert crew_activity.looks_failed('{"error": "no such file"}') is True
    assert crew_activity.looks_failed('{"output": "error: 3 tests failed"}') is False
    assert crew_activity.looks_failed("plain text") is False


# ---------------------------------------------------------------------------
# Activity persistence
# ---------------------------------------------------------------------------


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    crew_db.close_all()
    connection = crew_db.connect()
    yield connection
    crew_db.close_all()


def test_start_and_completion_upsert_one_row_not_two(conn):
    started = crew_activity.upsert_activity(
        conn,
        tool_call_id="call_1",
        thread_id="dm:scout",
        turn_id="turn_a",
        tool_name="terminal",
        args={"command": "npm test"},
    )
    assert started["status"] == "running"
    assert started["title"] == "npm test"

    done = crew_activity.upsert_activity(
        conn,
        tool_call_id="call_1",
        thread_id="dm:scout",
        turn_id="turn_a",
        tool_name="terminal",
        status="completed",
        output="12 passed",
    )

    assert done["id"] == started["id"]
    assert crew_activity.list_activities(conn, "dm:scout") == [done]
    assert done["output"] == "12 passed"
    # The arguments are gone by completion time, so the title has to survive
    # from the start event rather than being recomputed from nothing.
    assert done["title"] == "npm test"


def test_a_completion_moves_the_row_to_the_end_of_the_stream(conn):
    """Why `seq` exists at all.

    The completion is an UPDATE, and an UPDATE leaves the rowid where it was.
    A rowid tail would therefore never re-deliver it, and the spinner in the UI
    would spin forever on a tool that finished a minute ago.
    """
    crew_activity.upsert_activity(
        conn, tool_call_id="call_1", thread_id="dm:scout", turn_id="t", tool_name="terminal"
    )
    cursor = crew_db.max_activity_seq(conn)
    assert crew_db.activities_after(conn, cursor) == []

    crew_activity.upsert_activity(
        conn,
        tool_call_id="call_1",
        thread_id="dm:scout",
        turn_id="t",
        tool_name="terminal",
        status="completed",
    )
    redelivered = crew_db.activities_after(conn, cursor)
    assert [a["id"] for a in redelivered] == ["tool:call_1"]
    assert redelivered[0]["status"] == "completed"


def test_a_turn_that_dies_does_not_leave_a_tool_spinning(conn):
    crew_activity.upsert_activity(
        conn, tool_call_id="c1", thread_id="dm:scout", turn_id="t1", tool_name="terminal"
    )
    crew_activity.upsert_activity(
        conn, tool_call_id="c2", thread_id="dm:scout", turn_id="t2", tool_name="terminal"
    )

    interrupted = crew_activity.interrupt_running(conn, "t1")

    assert [a["id"] for a in interrupted] == ["tool:c1"]
    assert crew_activity.get_activity(conn, "tool:c1")["status"] == "failed"
    # A different turn's work is none of its business.
    assert crew_activity.get_activity(conn, "tool:c2")["status"] == "running"


def test_timestamps_are_parseable_by_date_parse(conn):
    """`WorkingActivity` computes its elapsed-time label with `Date.parse`.

    `Date.parse` of a bare number is NaN, so epoch milliseconds must not cross
    this boundary — everything on the wire is ISO-8601.
    """
    event = crew_activity.upsert_activity(
        conn, tool_call_id="c", thread_id="dm:scout", turn_id="t", tool_name="terminal"
    )
    assert event["createdAt"].startswith("20")
    assert "T" in event["createdAt"]
    assert crew_db.iso(1758000000000) == "2025-09-16T05:20:00+00:00"


def test_the_tail_cursor_does_not_leak_onto_the_wire(conn):
    event = crew_activity.upsert_activity(
        conn, tool_call_id="c", thread_id="dm:scout", turn_id="t", tool_name="terminal"
    )
    assert "seq" in event
    frame = contract.activity_updated(event)
    assert frame["type"] == "activity.updated"
    assert frame["threadId"] == "dm:scout"
    assert "seq" not in frame["activity"]


# ---------------------------------------------------------------------------
# Message shapes
# ---------------------------------------------------------------------------


def test_a_chip_becomes_a_chip_part_not_prose(conn):
    row = crew_db.insert_message(
        conn,
        thread_id="dm:scout",
        sender="scout",
        kind="report",
        payload={"lines": [{"system": "Salesforce", "result": "pulled"}], "closing": "done"},
    )
    message = contract.message(row)

    assert message["role"] == "agent"
    assert message["parts"] == [
        {
            "type": "chip",
            "kind": "report",
            "payload": {"lines": [{"system": "Salesforce", "result": "pulled"}], "closing": "done"},
        }
    ]


def test_a_decision_echo_is_system_even_though_the_operator_made_it(conn):
    row = crew_db.insert_message(
        conn,
        thread_id="dm:scout",
        sender="user",
        kind="approval_resolved",
        payload={"action": "send it", "status": "approved"},
    )
    # Not "user": the client reconciles user messages against optimistic
    # bubbles, and this one was never typed.
    assert contract.message(row)["role"] == "system"


def test_a_plain_message_is_a_text_part(conn):
    row = crew_db.insert_message(conn, thread_id="dm:scout", sender="user", content="hello")
    message = contract.message(row)
    assert message["role"] == "user"
    assert message["parts"] == [{"type": "text", "text": "hello"}]


def test_a_chip_without_a_turn_still_has_a_stable_id(conn):
    row = crew_db.insert_message(conn, thread_id="dm:scout", sender="scout", content="hi")
    assert row["ext_id"] is None
    # The client upserts by id; falling back to the rowid keeps two chips from
    # collapsing into one another.
    assert contract.message(row)["id"] == f"row:{row['id']}"


# ---------------------------------------------------------------------------
# Approvals
# ---------------------------------------------------------------------------


def test_our_approval_states_map_onto_errands(conn):
    held = crew_approvals.create_approval(
        conn, thread_id="dm:scout", bot_id="scout", action="send the 4 drafts", detail="to 4 people"
    )
    shaped = contract.approval(held)
    assert shaped["status"] == "pending"
    assert shaped["title"] == "send the 4 drafts"
    assert shaped["description"] == "to 4 people"
    # `DetailPanel` renders `scope` as a checklist. We have no structured scope
    # and inventing one would be worse than an empty list.
    assert shaped["scope"] == []
    assert shaped["resolvedAt"] is None

    crew_approvals.resolve_approval(conn, int(held["id"]), "approve")
    assert contract.approval(crew_approvals.get_approval(conn, int(held["id"])))["status"] == "allowed"

    denied = crew_approvals.create_approval(
        conn, thread_id="dm:scout", bot_id="scout", action="delete it"
    )
    crew_approvals.resolve_approval(conn, int(denied["id"]), "discard")
    assert contract.approval(crew_approvals.get_approval(conn, int(denied["id"])))["status"] == "denied"


def test_allow_and_deny_translate_to_approve_and_discard():
    assert contract.approval_decision("allow") == "approve"
    assert contract.approval_decision("deny") == "discard"
    with pytest.raises(ValueError):
        contract.approval_decision("maybe")


# ---------------------------------------------------------------------------
# The id convention — the guard test for decision 2 of the plan
# ---------------------------------------------------------------------------


@pytest.fixture()
def crew(tmp_path, monkeypatch):
    """A two-teammate crew running a scripted agent, as in test_crew_flow."""
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    crew_db.close_all()
    connection = crew_db.connect()
    for bot_id, name in (("chief", "Chief"), ("scout", "Scout")):
        crew_db.upsert_bot(connection, bot_id=bot_id, name=name, role=f"{name}'s job")
        crew_db.ensure_dm_thread(connection, bot_id)

    scripts: dict[str, list] = {}
    events: list[dict] = []

    class ScriptedAgent:
        def __init__(self, bot_id):
            self._bot_id = bot_id

        def run_conversation(self, user_message, task_id=None, **_kwargs):
            handlers = {tool[0]: tool[2] for tool in crew_tools.CREW_TOOLS}
            final = ""
            for step in scripts.get(self._bot_id, ["ok"]):
                if isinstance(step, str):
                    final = step
                elif step[0] == "__delta__":
                    self.stream_delta_callback(step[1])
                elif step[0] == "__tool_start__":
                    self.tool_start_callback(step[1], step[2], step[3])
                elif step[0] == "__tool_done__":
                    self.tool_complete_callback(step[1], step[2], step[3], step[4])
                else:
                    handlers[step[0]](step[1])
            return {"final_response": final}

    monkeypatch.setattr(orchestrator, "profile_scope", lambda bot_id: contextlib.nullcontext())
    monkeypatch.setattr(orchestrator, "has_computer", lambda bot_id: False)
    monkeypatch.setattr(
        orchestrator, "_build_agent", lambda bot, thread_id, **kw: ScriptedAgent(bot["id"])
    )
    monkeypatch.setattr(orchestrator, "_crew_config", lambda: {"a2a_allow": ""})
    monkeypatch.setattr(roster, "chief_id", lambda: "chief")
    monkeypatch.setattr(
        orchestrator,
        "start_turn_async",
        lambda bot_id, thread_id, text, **kw: orchestrator.start_turn(
            bot_id, thread_id, text, **kw
        ),
    )
    orchestrator.set_event_sink(events.append)
    orchestrator.reset_all_agents()

    yield type("Crew", (), {"conn": connection, "scripts": scripts, "events": events})()

    orchestrator.set_event_sink(None)
    crew_db.close_all()


def test_a_turn_produces_exactly_the_two_ids_the_client_parses(crew):
    crew.scripts["scout"] = ["Pulled 52 accounts."]
    user = orchestrator.handle_user_message("dm:scout", "pull the list")

    turn_id = user["turn_id"]
    assert user["ext_id"] == f"{turn_id}:user"

    # `useCrewController.sendMessage` reads the run id back out with
    # /^(.+):user(?:$|:)/ and then expects `{run}:agent` to be the reply.
    ids = [m["ext_id"] for m in crew_db.list_messages(crew.conn, "dm:scout")]
    assert ids == [f"{turn_id}:user", f"{turn_id}:agent"]


def test_a_reply_arrives_empty_and_streaming_then_settles(crew):
    crew.scripts["scout"] = [("__delta__", "Pulled "), ("__delta__", "52."), "Pulled 52."]
    orchestrator.handle_user_message("dm:scout", "pull the list")

    reply = crew_db.list_messages(crew.conn, "dm:scout")[-1]
    assert reply["streaming"] is False
    assert reply["content"] == "Pulled 52."

    types = [e["type"] for e in crew.events]
    assert types.count("message.delta") == 2
    # The text rides `message.updated`, because the row was created empty and
    # finished with an UPDATE that the rowid tail can never re-deliver — a
    # provider that does not stream would otherwise leave the bubble blank.
    assert "message.updated" in types
    assert types[-1] == "message.completed"
    settled = [e for e in crew.events if e["type"] == "message.updated"][-1]
    assert settled["message"]["parts"] == [{"type": "text", "text": "Pulled 52."}]
    assert settled["message"]["streaming"] is False


def test_an_empty_reply_is_dropped_rather_than_left_as_a_blank_bubble(crew):
    crew.scripts["scout"] = [
        ("message_user", {"kind": "report", "payload": {"lines": [{"system": "Inbox", "result": "clear"}]}}),
        "",
    ]
    orchestrator.handle_user_message("dm:scout", "check the inbox")

    kinds = [m["kind"] for m in crew_db.list_messages(crew.conn, "dm:scout")]
    assert kinds == ["text", "report"]
    assert [e["type"] for e in crew.events][-1] == "message.dropped"


def test_tool_calls_reach_the_stream_as_activities(crew):
    crew.scripts["scout"] = [
        ("__tool_start__", "call_9", "browser_navigate", {"url": "https://example.com"}),
        ("__tool_done__", "call_9", "browser_navigate", {"url": "https://example.com"}, '{"ok": true}'),
        "Looked.",
    ]
    orchestrator.handle_user_message("dm:scout", "look at example.com")

    activities = [e["activity"] for e in crew.events if e["type"] == "activity.updated"]
    assert [a["status"] for a in activities] == ["running", "completed"]
    assert activities[0]["kind"] == "browser"
    assert activities[0]["title"] == "browser_navigate https://example.com"
    # One row, two frames — the UI shows a line that changes, not a growing log.
    assert len({a["id"] for a in activities}) == 1


def test_holding_an_action_announces_the_state_that_needs_a_person(crew):
    statuses: list[tuple[str, str]] = []
    orchestrator.set_status_sink(lambda bot_id, state: statuses.append((bot_id, state)))
    try:
        crew.scripts["scout"] = [("hold_for_approval", {"action": "send the 4 drafts"}), "Held."]
        orchestrator.handle_user_message("dm:scout", "reply to those")
    finally:
        orchestrator.set_status_sink(None)

    # The amber badge is the whole point of A3: a teammate stopped at the door
    # must not look like a teammate with nothing to do.
    assert ("scout", "waiting_for_approval") in statuses
    assert statuses[-1] == ("scout", "waiting_for_approval")

    pending = [e for e in crew.events if e["type"] == "approval.updated"]
    assert pending and pending[0]["approval"]["status"] == "pending"


def test_deciding_flips_the_chip_on_the_wire_not_just_in_the_table(crew):
    crew.scripts["scout"] = [("hold_for_approval", {"action": "send it"}), ""]
    orchestrator.handle_user_message("dm:scout", "reply to those")
    approval_id = crew_approvals.list_pending(crew.conn)[0]["id"]

    crew.scripts["scout"] = ["Sent."]
    crew.events.clear()
    assert orchestrator.settle_approval(int(approval_id), "approve") == "ok"

    # Rewriting a payload in place is an UPDATE; without these frames the chip
    # would still read "Waiting for you" until the thread was reloaded.
    flipped = [e for e in crew.events if e["type"] == "message.updated"]
    chip = flipped[0]["message"]["parts"][0]
    assert chip["type"] == "chip"
    assert chip["kind"] == "approval_request"
    assert chip["payload"]["status"] == "approved"
    assert [e for e in crew.events if e["type"] == "approval.updated"][0]["approval"][
        "status"
    ] == "allowed"


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------


def test_a_dm_belongs_to_its_teammate_and_a_room_belongs_to_nobody(crew):
    crew_db.ensure_group_thread(crew.conn, "group:standup", "Standup", ["chief", "scout"])
    shaped = {c["id"]: c for c in (contract.conversation(v) for v in roster.list_conversations(crew.conn))}

    assert shaped["dm:scout"]["agentId"] == "scout"
    assert shaped["dm:scout"]["title"] == "Scout"
    # Errand has no notion of a room, so there is no honest agent to name here.
    assert shaped["group:standup"]["agentId"] == ""
    assert shaped["group:standup"]["members"] == ["chief", "scout"]


def test_a_teammates_conversations_lead_with_its_dm(crew):
    crew_db.ensure_group_thread(crew.conn, "group:standup", "Standup", ["chief", "scout"])
    ids = [c["id"] for c in roster.conversations_for(crew.conn, "scout")]
    # The controller opens conversations[0] when a teammate is selected;
    # clicking a name means "talk to them", not "join their standup".
    assert ids[0] == "dm:scout"
    assert "group:standup" in ids
    assert "dm:chief" not in ids


def test_an_idle_conversation_does_not_keep_bumping_itself_to_the_top(crew):
    first = contract.conversation(
        next(c for c in roster.list_conversations(crew.conn) if c["id"] == "dm:scout")
    )
    second = contract.conversation(
        next(c for c in roster.list_conversations(crew.conn) if c["id"] == "dm:scout")
    )
    assert first["updatedAt"] == second["updatedAt"]


# ---------------------------------------------------------------------------
# The routes
#
# Called as plain functions rather than over HTTP: the transport is FastAPI's
# and is not what needs proving. What needs proving is that each route hands
# back the shape the `CloudAgentsClient` method it implements promised.
# ---------------------------------------------------------------------------


@pytest.fixture()
def api(crew, monkeypatch):
    import importlib.util

    spec = importlib.util.spec_from_file_location(
        "crew_plugin_api_under_test", _PLUGIN_ROOT / "dashboard" / "plugin_api.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    # The crew fixture owns the event sink for these tests; importing the
    # plugin claims it for the (absent) WebSocket.
    orchestrator.set_event_sink(crew.events.append)

    # No Docker in a test run, so the container probe answers honestly rather
    # than shelling out and timing out.
    monkeypatch.setattr(
        module.crew_computer, "endpoints", lambda bot_id: {"running": False, "vnc_ws_url": None}
    )
    return module


def test_list_agents_speaks_errands_agent_shape(api, crew):
    agents = api.v1_list_agents()
    scout = next(a for a in agents if a["id"] == "scout")

    assert set(scout) >= {
        "id", "name", "role", "goal", "status", "avatar",
        "lastActiveAt", "unreadCount", "computerId",
    }
    assert scout["status"] in roster.AGENT_STATUSES
    assert scout["computerId"] == "crew-scout"


def test_a_held_action_shows_up_as_the_one_state_that_needs_a_person(api, crew):
    crew.scripts["scout"] = [("hold_for_approval", {"action": "send the 4 drafts"}), "Held."]
    orchestrator.handle_user_message("dm:scout", "reply to those")

    agents = {a["id"]: a for a in api.v1_list_agents()}
    assert agents["scout"]["status"] == "waiting_for_approval"
    assert agents["chief"]["status"] in ("idle", "offline")


def test_send_message_returns_the_id_the_client_reconciles_against(api, crew):
    crew.scripts["scout"] = ["Pulled 52."]
    message = api.v1_send_message("dm:scout", api.SendMessageBody(text="pull the list"))

    assert message["role"] == "user"
    assert message["parts"] == [{"type": "text", "text": "pull the list"}]
    assert message["id"].endswith(":user")
    assert message["conversationId"] == "dm:scout"


def test_sending_to_a_thread_that_does_not_exist_is_a_400_with_nothing_written(api, crew):
    with pytest.raises(api.HTTPException) as caught:
        api.v1_send_message("dm:nobody", api.SendMessageBody(text="hello"))
    assert caught.value.status_code == 400
    assert crew_db.list_messages(crew.conn, "dm:nobody") == []


def test_get_conversation_hands_back_everything_the_thread_needs_to_render(api, crew):
    crew.scripts["scout"] = [
        ("__tool_start__", "c1", "read_file", {"path": "notes.md"}),
        ("__tool_done__", "c1", "read_file", {"path": "notes.md"}, "ok"),
        ("message_user", {"kind": "report", "payload": {"lines": [{"system": "Notes", "result": "read"}]}}),
        "Read it.",
    ]
    orchestrator.handle_user_message("dm:scout", "read notes.md")

    # `limit` is explicit because these routes are called as functions here, so
    # FastAPI is not around to resolve its `Query(...)` default.
    data = api.v1_get_conversation("dm:scout", limit=200)

    assert data["conversation"]["agentId"] == "scout"
    roles = [m["role"] for m in data["messages"]]
    assert roles == ["user", "agent", "agent"]
    # The reply slot is reserved when the turn starts — that is where deltas
    # accumulate — so it sits above anything the turn goes on to produce. The
    # live order matches, because the client appends its optimistic reply
    # bubble at send time too; a reload does not shuffle the thread.
    assert [p["type"] for m in data["messages"] for p in m["parts"]] == ["text", "text", "chip"]
    assert [a["kind"] for a in data["activities"]] == ["file"]
    assert "seq" not in data["activities"][0]


def test_approving_over_the_wire_uses_errands_verbs_and_refuses_a_second_time(api, crew):
    crew.scripts["scout"] = [("hold_for_approval", {"action": "send it"}), ""]
    orchestrator.handle_user_message("dm:scout", "reply")
    approval_id = int(crew_approvals.list_pending(crew.conn)[0]["id"])

    crew.scripts["scout"] = ["Sent."]
    resolved = api.v1_respond_to_approval(
        approval_id, api.RespondApprovalBody(decision="allow", note="go ahead")
    )
    assert resolved["status"] == "allowed"
    assert resolved["responseNote"] == "go ahead"

    # The guard that turns a double-clicked Allow into one email, not two.
    with pytest.raises(api.HTTPException) as caught:
        api.v1_respond_to_approval(approval_id, api.RespondApprovalBody(decision="allow"))
    assert caught.value.status_code == 409

    with pytest.raises(api.HTTPException) as caught:
        api.v1_respond_to_approval(approval_id, api.RespondApprovalBody(decision="maybe"))
    assert caught.value.status_code == 400


def test_listing_approvals_keeps_decided_ones_in_the_record(api, crew):
    crew.scripts["scout"] = [("hold_for_approval", {"action": "send it"}), ""]
    orchestrator.handle_user_message("dm:scout", "reply")
    approval_id = int(crew_approvals.list_pending(crew.conn)[0]["id"])
    crew.scripts["scout"] = ["Sent."]
    orchestrator.settle_approval(approval_id, "approve")

    listed = api.v1_list_approvals(agentId="scout")
    assert [a["status"] for a in listed] == ["allowed"]
    assert api.v1_list_approvals(agentId="chief") == []


def test_reading_the_computer_never_starts_one(api, crew, monkeypatch):
    started: list[str] = []
    monkeypatch.setattr(api.crew_computer, "ensure", lambda bot_id, **kw: started.append(bot_id))

    computer = api.v1_get_computer("scout")

    # This route is polled every two seconds while the machine is offline, so a
    # single container start here would become one per tick.
    assert started == []
    assert computer["status"] == "offline"
    assert computer["capabilities"] == ["open", "takeover"]
    assert computer["agentId"] == "scout"


def test_opening_a_screen_that_has_no_frame_says_so_rather_than_handing_back_a_dead_url(api, crew):
    with pytest.raises(api.HTTPException) as caught:
        api.v1_open_computer("scout")
    assert caught.value.status_code == 503


def test_an_unknown_teammate_is_a_404_everywhere_it_can_be(api, crew):
    for call in (
        lambda: api.v1_get_agent("nobody"),
        lambda: api.v1_get_computer("nobody"),
        lambda: api.v1_delete_agent("nobody"),
    ):
        with pytest.raises(api.HTTPException) as caught:
            call()
        assert caught.value.status_code == 404
