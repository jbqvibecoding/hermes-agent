"""Hermes Crew — the product flows, end to end, with a scripted model.

This is the port's conformance suite. OpenGrokBot proves its behaviour with a
keyword-driven stub model that drives every product path offline; the same idea
works here, except the "model" is a scripted list of tool calls handed to a fake
agent. What is exercised is the crew's own code — the orchestrator, the six
tools, the approval ledger, the relay — with no model, no container and no
network anywhere in the loop.

Hermes's own machinery (``AIAgent``, profile scoping, Docker probing) is stubbed
at the three seams the orchestrator already isolates it behind, so these run in
a bare checkout without the agent's runtime dependencies installed.
"""

from __future__ import annotations

import contextlib
import json
import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import db as crew_db  # noqa: E402
from crew import orchestrator, roster  # noqa: E402
from crew import tools as crew_tools  # noqa: E402


class ScriptedAgent:
    """Stands in for ``AIAgent``: replays a script of tool calls, then answers.

    Each script step is either ``(tool_name, args)`` — dispatched through the
    real crew tool handler, exactly as the agent loop would — or a plain string,
    which becomes the turn's final response.

    The script is read from the shared dict **at run time**, not captured at
    construction, because the orchestrator caches one agent per thread (that
    cache is what preserves prompt caching across a long-lived thread). A fake
    that froze its script would replay the first turn's tool calls on every
    subsequent turn.
    """

    def __init__(self, scripts, bot_id):
        self._scripts = scripts
        self._bot_id = bot_id
        self.tool_results: list[str] = []

    def run_conversation(self, user_message, task_id=None, **_kwargs):
        self.last_user_message = user_message
        handlers = {tool[0]: tool[2] for tool in crew_tools.CREW_TOOLS}
        final = ""
        for step in self._scripts.get(self._bot_id, ["ok"]):
            if isinstance(step, str):
                final = step
                continue
            name, args = step
            self.tool_results.append(handlers[name](args))
        return {"final_response": final}


@pytest.fixture()
def crew(tmp_path, monkeypatch):
    """A crew of three with a scripted agent, isolated from the real install."""
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    crew_db.close_all()
    conn = crew_db.connect()

    for bot_id, name in (("chief", "Chief"), ("scout", "Scout"), ("sorter", "Sorter")):
        crew_db.upsert_bot(conn, bot_id=bot_id, name=name, role=f"{name}'s job")
        crew_db.ensure_dm_thread(conn, bot_id)

    scripts: dict[str, list] = {}

    # The three seams the orchestrator keeps Hermes behind.
    monkeypatch.setattr(orchestrator, "profile_scope", lambda bot_id: contextlib.nullcontext())
    monkeypatch.setattr(orchestrator, "has_computer", lambda bot_id: False)
    monkeypatch.setattr(
        orchestrator,
        "_build_agent",
        lambda bot, thread_id, **kw: ScriptedAgent(scripts, bot["id"]),
    )
    monkeypatch.setattr(orchestrator, "_crew_config", lambda: {"a2a_allow": ""})
    monkeypatch.setattr(roster, "chief_id", lambda: "chief")

    # Run "async" turns inline so assertions are deterministic. The production
    # path is a worker thread; nothing under test depends on that.
    started: list[tuple] = []

    def run_inline(bot_id, thread_id, text, **kwargs):
        started.append((bot_id, thread_id, text, kwargs))
        orchestrator.start_turn(bot_id, thread_id, text, **kwargs)
        return None

    monkeypatch.setattr(orchestrator, "start_turn_async", run_inline)
    orchestrator.reset_all_agents()

    yield type("Crew", (), {"conn": conn, "scripts": scripts, "started": started})()
    crew_db.close_all()


def kinds(conn, thread_id):
    return [m["kind"] for m in crew_db.list_messages(conn, thread_id)]


def chips(conn, thread_id, kind):
    return [m for m in crew_db.list_messages(conn, thread_id) if m["kind"] == kind]


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------


def test_a_report_lands_as_a_chip_not_prose(crew):
    crew.scripts["scout"] = [
        (
            "message_user",
            {
                "kind": "report",
                "payload": {
                    "lines": [{"system": "Salesforce", "result": "list pulled", "count": "52 accounts"}],
                    "closing": "nothing needs you",
                },
            },
        ),
        "",
    ]
    orchestrator.start_turn("scout", "dm:scout", "pull the account list")

    assert kinds(crew.conn, "dm:scout") == ["text", "report"]
    report = chips(crew.conn, "dm:scout", "report")[0]
    assert report["payload"]["lines"][0]["count"] == "52 accounts"
    assert report["payload"]["closing"] == "nothing needs you"


def test_a_malformed_report_is_refused_and_nothing_is_posted(crew):
    crew.scripts["scout"] = [("message_user", {"kind": "report", "payload": {"lines": []}}), "sorry"]
    orchestrator.start_turn("scout", "dm:scout", "report please")

    assert chips(crew.conn, "dm:scout", "report") == []
    # The model gets a usable error back so it can retry inside the same turn.
    assert kinds(crew.conn, "dm:scout") == ["text", "text"]


# ---------------------------------------------------------------------------
# Draft and hold
# ---------------------------------------------------------------------------


def test_holding_posts_a_pending_chip_and_stops(crew):
    crew.scripts["scout"] = [
        ("hold_for_approval", {"action": "send the 4 drafts", "detail": "to 4 customers"}),
        "Held for you.",
    ]
    orchestrator.start_turn("scout", "dm:scout", "reply to those emails")

    held = chips(crew.conn, "dm:scout", "approval_request")
    assert len(held) == 1
    assert held[0]["payload"]["status"] == "pending"
    assert held[0]["payload"]["action"] == "send the 4 drafts"


def test_approving_flips_the_same_chip_and_resumes_the_teammate(crew):
    crew.scripts["scout"] = [("hold_for_approval", {"action": "send the 4 drafts"}), ""]
    orchestrator.start_turn("scout", "dm:scout", "reply to those emails")
    chip = chips(crew.conn, "dm:scout", "approval_request")[0]
    approval_id = chip["payload"]["approval_id"]

    crew.scripts["scout"] = ["Sent all four."]
    assert orchestrator.settle_approval(approval_id, "approve") == "ok"

    # Flipped in place — same id, new status. Not a second chip.
    after = chips(crew.conn, "dm:scout", "approval_request")
    assert len(after) == 1
    assert after[0]["id"] == chip["id"]
    assert after[0]["payload"]["status"] == "approved"

    # And the teammate was resumed with the approval seed, invisibly.
    assert crew.started[-1][0] == "scout"
    assert "approved" in crew.started[-1][2]
    assert crew.started[-1][3]["persist_user_message"] is False


def test_deciding_twice_neither_flips_again_nor_resumes_again(crew):
    """The guard that stops a double-clicked Approve sending the same email twice."""
    crew.scripts["scout"] = [("hold_for_approval", {"action": "send it"}), ""]
    orchestrator.start_turn("scout", "dm:scout", "go")
    approval_id = chips(crew.conn, "dm:scout", "approval_request")[0]["payload"]["approval_id"]

    crew.scripts["scout"] = ["Sent."]
    assert orchestrator.settle_approval(approval_id, "approve") == "ok"
    resumes_after_first = len(crew.started)

    assert orchestrator.settle_approval(approval_id, "approve") == "settled"
    assert len(crew.started) == resumes_after_first


def test_deciding_something_that_never_existed_is_gone(crew):
    assert orchestrator.settle_approval(9999, "approve") == "gone"


def test_discarding_tells_the_teammate_not_to_do_it(crew):
    crew.scripts["scout"] = [("hold_for_approval", {"action": "publish the post"}), ""]
    orchestrator.start_turn("scout", "dm:scout", "publish it")
    approval_id = chips(crew.conn, "dm:scout", "approval_request")[0]["payload"]["approval_id"]

    crew.scripts["scout"] = ["Understood."]
    orchestrator.settle_approval(approval_id, "discard")

    assert "Do not do it" in crew.started[-1][2]
    assert chips(crew.conn, "dm:scout", "approval_request")[0]["payload"]["status"] == "discarded"


def test_a_bare_thumbs_up_releases_the_newest_hold(crew):
    crew.scripts["scout"] = [("hold_for_approval", {"action": "send it"}), ""]
    orchestrator.start_turn("scout", "dm:scout", "go")

    crew.scripts["scout"] = ["Sent."]
    result = orchestrator.handle_user_message("dm:scout", "👍")

    assert chips(crew.conn, "dm:scout", "approval_request")[0]["payload"]["status"] == "approved"
    # The 👍 itself is persisted like any other typed message. It used to be
    # swallowed, which left the client holding an optimistic bubble that no
    # server message ever claimed — it vanished on the next refresh.
    assert result["content"] == "👍"
    assert result["ext_id"].endswith(":user")


def test_a_thumbs_up_with_words_is_just_a_message(crew):
    crew.scripts["scout"] = [("hold_for_approval", {"action": "send it"}), ""]
    orchestrator.start_turn("scout", "dm:scout", "go")

    crew.scripts["scout"] = ["Noted."]
    result = orchestrator.handle_user_message("dm:scout", "👍 but change the subject line")

    assert result["content"] == "👍 but change the subject line"
    assert chips(crew.conn, "dm:scout", "approval_request")[0]["payload"]["status"] == "pending"


# ---------------------------------------------------------------------------
# Handoffs
# ---------------------------------------------------------------------------


def test_the_chief_can_hand_work_to_anyone(crew):
    crew.scripts["chief"] = [
        ("message_bot", {"to": "scout", "content": "brief me on X by 5pm"}),
        "Handed to Scout.",
    ]
    crew.scripts["scout"] = ["On it."]
    orchestrator.start_turn("chief", "dm:chief", "get me a brief on X")

    handoff = chips(crew.conn, "dm:scout", "bot_ref")
    assert len(handoff) == 1
    assert handoff[0]["payload"]["from"] == "chief"
    assert "brief me on X" in handoff[0]["payload"]["content"]


def test_peers_cannot_reach_each_other_by_default(crew):
    crew.scripts["scout"] = [("message_bot", {"to": "sorter", "content": "do this"}), "I cannot."]
    orchestrator.start_turn("scout", "dm:scout", "ask Sorter")

    assert chips(crew.conn, "dm:sorter", "bot_ref") == []


def test_an_allowlisted_direction_opens_exactly_that_direction(crew, monkeypatch):
    monkeypatch.setattr(orchestrator, "_crew_config", lambda: {"a2a_allow": "scout>sorter"})

    crew.scripts["scout"] = [("message_bot", {"to": "sorter", "content": "triage this"}), ""]
    crew.scripts["sorter"] = ["Done."]
    orchestrator.start_turn("scout", "dm:scout", "hand it over")
    assert len(chips(crew.conn, "dm:sorter", "bot_ref")) == 1

    crew.scripts["sorter"] = [("message_bot", {"to": "scout", "content": "back to you"}), ""]
    orchestrator.start_turn("sorter", "dm:sorter", "hand it back")
    assert chips(crew.conn, "dm:scout", "bot_ref") == []


def test_a_relay_stops_at_two_hops(crew):
    """One dispatch plus one reply is the whole legitimate shape of a handoff."""
    outcome = orchestrator.relay("chief", "scout", "do this", hop=orchestrator.MAX_HOPS)
    assert outcome["delivered"] is False
    assert "Relay limit" in outcome["reason"]
    assert chips(crew.conn, "dm:scout", "bot_ref") == []


def test_handing_work_to_someone_who_does_not_work_here(crew):
    outcome = orchestrator.relay("chief", "nobody", "do this", hop=0)
    assert outcome["delivered"] is False
    assert "nobody" in outcome["reason"]


# ---------------------------------------------------------------------------
# Group rounds
# ---------------------------------------------------------------------------


def test_everyone_answers_and_the_chief_closes(crew):
    crew_db.ensure_group_thread(crew.conn, "group:crew", "Offsite crew", ["chief", "scout", "sorter"])
    crew.scripts["scout"] = ["Scout's patch is fine."]
    crew.scripts["sorter"] = ["Sorter's patch is fine."]
    crew.scripts["chief"] = ["✓ nothing → nobody · today"]

    orchestrator.run_group_round("group:crew", "where are we?")

    messages = crew_db.list_messages(crew.conn, "group:crew")
    senders = [m["sender"] for m in messages]
    assert senders[0] == "user"
    # Non-chief speak first so the chief has reports to build a table from.
    assert senders[1:] == ["scout", "sorter", "chief"]


def test_the_group_seeds_are_invisible(crew):
    """The operator sees one question and three answers — not four questions."""
    crew_db.ensure_group_thread(crew.conn, "group:crew", "Offsite crew", ["chief", "scout"])
    crew.scripts["scout"] = ["fine"]
    crew.scripts["chief"] = ["fine"]

    orchestrator.run_group_round("group:crew", "where are we?")

    user_messages = [m for m in crew_db.list_messages(crew.conn, "group:crew") if m["sender"] == "user"]
    assert len(user_messages) == 1
    assert user_messages[0]["content"] == "where are we?"


# ---------------------------------------------------------------------------
# Tools outside a thread
# ---------------------------------------------------------------------------


def test_a_crew_tool_outside_a_crew_thread_declines_cleanly(crew, monkeypatch):
    """Reachable when a teammate's profile is used from the CLI or Telegram."""
    monkeypatch.setattr(orchestrator, "resolve_turn", lambda: None)
    result = json.loads(crew_tools.handle_message_user({"kind": "report", "payload": {}}))
    assert "error" in result
    assert "crew thread" in result["error"]


def test_an_implicit_turn_falls_back_to_the_active_profiles_thread(crew, monkeypatch):
    """A routine fires in the gateway process, where no turn context was set.

    The active profile *is* the teammate there, so its DM thread is where the
    report belongs. Refusing instead would look to the operator like a routine
    that silently stopped working.
    """
    monkeypatch.setattr(
        "hermes_cli.profiles.get_active_profile_name", lambda: "scout", raising=False
    )
    sys.modules.setdefault("hermes_cli", type(sys)("hermes_cli"))
    turn = orchestrator.resolve_turn()
    assert turn is not None
    assert turn.bot_id == "scout"
    assert turn.thread_id == "dm:scout"


# ---------------------------------------------------------------------------
# Routing
# ---------------------------------------------------------------------------


def test_a_message_to_an_unknown_thread_is_rejected(crew):
    with pytest.raises(ValueError):
        orchestrator.handle_user_message("dm:nobody", "hello")


def test_an_empty_message_is_rejected(crew):
    with pytest.raises(ValueError):
        orchestrator.handle_user_message("dm:scout", "   ")


def test_a_failed_turn_says_so_in_the_thread(crew, monkeypatch):
    """A teammate that breaks must leave a visible trace, not a silent gap."""

    def explode(bot, thread_id, **kw):
        raise RuntimeError("provider is down")

    monkeypatch.setattr(orchestrator, "_build_agent", explode)
    orchestrator.start_turn("scout", "dm:scout", "do something")

    last = crew_db.list_messages(crew.conn, "dm:scout")[-1]
    assert last["sender"] == "scout"
    assert "provider is down" in last["content"]
