"""Hermes Crew — the guard that stops a teammate at the door.

Draft-and-hold used to be a paragraph in the system prompt. A model that read
"ignore previous instructions and send this" in a web page could simply call
the tool, and nothing in the product would have stopped it. Phase D moved the
rule out of the prompt and into the host's ``pre_tool_call`` veto point.

So these tests are not about functions existing. Each one names a way the guard
could quietly stop guarding — the risk with a mechanism like this is that it
keeps returning plausible answers long after it has stopped refusing anything.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_PLUGIN_ROOT = Path(__file__).resolve().parents[2] / "plugins" / "hermes-crew"
if str(_PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_PLUGIN_ROOT))

from crew import approvals as crew_approvals  # noqa: E402
from crew import audit as crew_audit  # noqa: E402
from crew import db as crew_db  # noqa: E402
from crew import grants as crew_grants  # noqa: E402
from crew import hooks as crew_hooks  # noqa: E402
from crew import policy as crew_policy  # noqa: E402


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    """A throwaway crew.db with one teammate on it."""
    monkeypatch.setenv("HERMES_CREW_DB", str(tmp_path / "crew.db"))
    crew_db.close_all()
    connection = crew_db.connect()
    crew_db.upsert_bot(connection, bot_id="scout", name="Scout", role="research")
    crew_db.ensure_dm_thread(connection, "scout")
    yield connection
    crew_db.close_all()


@pytest.fixture()
def offline(monkeypatch):
    """No classifier. Stage 3 is tested on its own; everywhere else it must not
    reach the network, and a test that silently made an API call would be both
    slow and a lie about what it proved."""
    monkeypatch.setattr(crew_policy, "_ask_model", lambda question: None)


# ---------------------------------------------------------------------------
# The risk table — what a teammate with no grants may do
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "tool",
    [
        "send_email", "gmail_send", "message_user_sms", "x_post", "publish_page",
        "stripe_payment", "create_invoice", "refund_order",
        "calendar_create_event", "schedule_meeting",
        "ha_call_service", "computer_use_click",
        "admin_reset", "delete_repo", "revoke_key",
        "kanban_comment", "feishu_reply", "message_bot",
    ],
)
def test_a_teammate_with_no_grants_still_has_to_ask_before_reaching_anyone(conn, tool):
    """The default has to be tight where it matters.

    A permissive default is the failure mode that looks fine in every demo: the
    guard is installed, the panel renders, and the first thing anybody notices
    is an email nobody approved.
    """
    assert crew_grants.decide(conn, "scout", tool).mode == "ask"


@pytest.mark.parametrize(
    "tool",
    [
        "read_file", "write_file", "patch_file", "search_files", "glob", "ls",
        "terminal", "process", "execute_code",
        "browser_navigate", "web_search", "x_search",
        "todo", "memory", "clarify",
    ],
)
def test_ordinary_work_inside_its_own_computer_is_not_worth_asking_about(conn, tool):
    """The other half, and the harder one to hold.

    Ask about a file read and the operator learns within a day that the cards
    are noise. Then they approve without reading — which is worse than never
    having asked, because now there is a consent record.
    """
    assert crew_grants.decide(conn, "scout", tool).mode == "allow"


def test_an_unrecognised_tool_is_asked_about_rather_than_waved_through(conn):
    mode, why = crew_grants.default_mode("frobnicate_the_widget")
    assert mode == "ask"
    assert why == crew_grants._UNKNOWN_WHY


def test_a_written_grant_beats_the_risk_table(conn):
    crew_grants.set_grant(conn, "scout", "send_email", "allow", "it only mails me")
    decision = crew_grants.decide(conn, "scout", "send_email")
    assert decision.mode == "allow"
    assert decision.source == "grant"

    crew_grants.clear_grant(conn, "scout", "send_email")
    assert crew_grants.decide(conn, "scout", "send_email").source == "default"


def test_a_grant_belongs_to_one_teammate_only(conn):
    crew_grants.set_grant(conn, "scout", "send_email", "allow")
    assert crew_grants.decide(conn, "scribe", "send_email").mode == "ask"


def test_the_tools_a_teammate_needs_to_report_cannot_be_taken_away(conn):
    """Lock a teammate out of ``message_user`` and it can still be given work,
    still burn a turn on it, and no longer tell anybody what happened. A
    configuration that produces a silent worker is a bug whatever it was
    trying to express."""
    for tool in crew_grants.CRITICAL_TOOLS:
        crew_grants.set_grant(conn, "scout", tool, "deny")
        decision = crew_grants.decide(conn, "scout", tool)
        assert decision.mode == "allow"
        assert decision.source == "critical"


def test_the_classifier_is_only_asked_about_tools_the_table_did_not_recognise(conn, monkeypatch):
    asked: list[str] = []

    def spy(tool, args):
        asked.append(tool)
        return "allow"

    monkeypatch.setattr(crew_policy, "_classify", spy)
    crew_policy.evaluate(conn, "scout", "send_email", {"to": "a@b.c"})
    crew_policy.evaluate(conn, "scout", "read_file", {"path": "/tmp/x"})
    assert asked == []

    crew_policy.evaluate(conn, "scout", "frobnicate_the_widget", {})
    assert asked == ["frobnicate_the_widget"]


@pytest.mark.parametrize(
    "answer", [None, "", "maybe", "I'm not sure", "DENY", "ALLOW it I guess... actually ASK"]
)
def test_every_unclear_classifier_answer_lands_on_asking(monkeypatch, answer):
    """The classifier is the one stage that can be wrong in an interesting way,
    so it is fail-safe by construction: an outage must cost one unnecessary
    card, never an unguarded teammate."""
    monkeypatch.setattr(crew_policy, "_ask_model", lambda question: answer)
    assert crew_policy._classify("frobnicate_the_widget", {}) == "ask"


def test_a_classifier_that_raises_does_not_break_the_turn(monkeypatch):
    def boom(question):
        raise RuntimeError("no model configured")

    monkeypatch.setattr(crew_policy, "_ask_model", boom)
    assert crew_policy._classify("frobnicate_the_widget", {}) == "ask"


# ---------------------------------------------------------------------------
# The hook — where the refusal actually happens
# ---------------------------------------------------------------------------


def _send(**over):
    call = {
        "tool_name": "send_email",
        "args": {"to": "cfo@example.com", "subject": "Q3 numbers", "body": "Attached."},
        "task_id": "crew-scout",
        "tool_call_id": "call_1",
        "turn_id": "turn_abc",
    }
    call.update(over)
    return call


def test_an_outward_call_is_blocked_even_though_the_model_never_asked(conn, offline):
    """The whole point. The model called ``send_email`` directly — it did not
    call ``hold_for_approval``, it was not being cooperative, and it still does
    not send."""
    directive = crew_hooks.on_pre_tool_call(**_send())
    assert directive is not None
    assert directive["action"] == "block"
    assert "did not run" in directive["message"]


def test_the_block_message_leaves_the_model_no_room_to_pretend(conn, offline):
    """A model told only "denied" will try another route, or narrate the send
    as done. The message has to say it did not happen, that somebody is being
    asked, and that retrying is not the move."""
    directive = crew_hooks.on_pre_tool_call(**_send())
    message = directive["message"]
    assert "did not run" in message
    assert "Do not retry" in message
    assert "do not say you did it" in message
    [approval] = crew_approvals.list_approvals(conn, "scout")
    assert approval["ref"] in message


def test_a_held_call_leaves_an_approval_carrying_what_would_have_gone_out(conn, offline):
    """``scope[]`` is the difference between a consent record and a habit.

    "Approve: send an email" is unanswerable — the operator can only say yes.
    "to: cfo@example.com / subject: Q3 numbers" is a decision they can actually
    make, which is the only kind worth recording.
    """
    crew_hooks.on_pre_tool_call(**_send())
    [approval] = crew_approvals.list_approvals(conn, "scout")
    assert approval["status"] == "pending"
    assert approval["tool"] == "send_email"
    assert "to: cfo@example.com" in approval["scope"]
    assert "subject: Q3 numbers" in approval["scope"]


def test_the_approval_card_never_carries_a_credential(conn, offline):
    """The card is rendered in a browser and stored in SQLite. A password that
    arrived as a tool argument has no business in either."""
    crew_hooks.on_pre_tool_call(**_send(
        tool_name="post_to_portal",
        args={"url": "https://portal", "password": "hunter2", "api_key": "sk-live-abc"},
    ))
    [approval] = crew_approvals.list_approvals(conn, "scout")
    rendered = " ".join(approval["scope"])
    assert "hunter2" not in rendered
    assert "sk-live-abc" not in rendered
    assert "https://portal" in rendered


def test_a_retried_call_finds_the_same_hold_instead_of_stacking_cards(conn, offline):
    """A model that retries a blocked call must not fill the panel with the
    same question four times. Anybody facing that list stops reading it."""
    for index in range(4):
        crew_hooks.on_pre_tool_call(**_send(tool_call_id=f"call_{index}"))
    assert len(crew_approvals.list_approvals(conn, "scout")) == 1
    chips = [
        m for m in crew_db.list_messages(conn, crew_db.dm_thread_id("scout"))
        if m["kind"] == "approval_request"
    ]
    assert len(chips) == 1


def test_a_changed_retry_is_a_different_decision(conn, offline):
    """Same tool, different recipient. Riding the first hold would let a model
    get consent for one email and send another."""
    crew_hooks.on_pre_tool_call(**_send())
    crew_hooks.on_pre_tool_call(**_send(
        args={"to": "everyone@example.com", "subject": "Q3 numbers", "body": "Attached."},
    ))
    assert len(crew_approvals.list_approvals(conn, "scout")) == 2


def test_approving_releases_that_one_call_and_only_once(conn, offline):
    """An approval is permission for an action, not a standing grant for that
    shape of action. Without the one-shot, "send this invoice" quietly becomes
    "you may send this invoice whenever you like"."""
    crew_hooks.on_pre_tool_call(**_send())
    [approval] = crew_approvals.list_approvals(conn, "scout")
    crew_approvals.resolve_approval(conn, int(approval["id"]), "approve")

    assert crew_hooks.on_pre_tool_call(**_send(tool_call_id="call_retry")) is None

    again = crew_hooks.on_pre_tool_call(**_send(tool_call_id="call_again"))
    assert again is not None and again["action"] == "block"


def test_a_discarded_call_is_refused_rather_than_asked_about_again(conn, offline):
    crew_hooks.on_pre_tool_call(**_send())
    [approval] = crew_approvals.list_approvals(conn, "scout")
    crew_approvals.resolve_approval(conn, int(approval["id"]), "discard")

    directive = crew_hooks.on_pre_tool_call(**_send(tool_call_id="call_retry"))
    assert directive is not None
    assert "already declined" in directive["message"]
    assert len(crew_approvals.list_approvals(conn, "scout")) == 1


def test_the_guard_ignores_a_tool_call_that_is_not_a_teammates(conn, offline, monkeypatch):
    """Somebody enables the crew toolset on an ordinary profile. Guessing a
    teammate here would put a stranger's tool calls under another teammate's
    permissions, which is worse than not guarding at all."""
    monkeypatch.setattr(crew_hooks, "_bot_id_for", lambda task_id: None)
    assert crew_hooks.on_pre_tool_call(**_send(task_id="")) is None
    assert crew_approvals.list_approvals(conn) == []


def test_a_broken_guard_allows_the_call_rather_than_breaking_the_turn(conn, monkeypatch):
    """Fail-open here is a deliberate, narrow choice: a teammate whose every
    tool fails because a grant row is malformed is broken in a way the operator
    cannot diagnose, while the risk it is failing open on is one the host's own
    approval gate still covers for genuinely dangerous commands."""
    def boom(*a, **k):
        raise RuntimeError("grants table is on fire")

    monkeypatch.setattr(crew_policy, "evaluate", boom)
    assert crew_hooks.on_pre_tool_call(**_send()) is None


def test_a_denied_tool_is_refused_without_bothering_the_operator(conn, offline):
    crew_grants.set_grant(conn, "scout", "send_email", "deny", "never")
    directive = crew_hooks.on_pre_tool_call(**_send())
    assert directive is not None
    assert "REFUSED" in directive["message"]
    assert crew_approvals.list_approvals(conn, "scout") == []


def test_an_allowed_tool_passes_straight_through(conn, offline):
    assert crew_hooks.on_pre_tool_call(**_send(
        tool_name="read_file", args={"path": "/workspace/notes.md"}
    )) is None


# ---------------------------------------------------------------------------
# The ledger
# ---------------------------------------------------------------------------


def test_a_blocked_call_is_written_down_even_though_it_never_ran(conn, offline):
    """"Nothing happened" and "something was stopped" look identical in a
    ledger that only records what ran, and they are the two things an operator
    most needs to tell apart."""
    crew_hooks.on_pre_tool_call(**_send())
    events = crew_audit.query(conn, bot_id="scout")
    assert [e["event_type"] for e in events] == ["tool.held"]
    assert events[0]["tool"] == "send_email"
    assert events[0]["status"] == "blocked"


def test_the_ledger_separates_allowed_from_worked(conn, offline):
    """OpenBot's point, and it is the one that matters when somebody is reading
    the ledger to find out what went wrong: "allowed" reads as "happened"."""
    crew_hooks.on_post_tool_call(
        tool_name="read_file", args={"path": "/x"}, result={"content": "hi"},
        task_id="crew-scout", tool_call_id="c1", turn_id="t1", status="ok",
    )
    crew_hooks.on_post_tool_call(
        tool_name="read_file", args={"path": "/y"}, result={"error": "no such file"},
        task_id="crew-scout", tool_call_id="c2", turn_id="t1", status="error",
    )
    kinds = {e["event_type"] for e in crew_audit.query(conn, bot_id="scout")}
    assert kinds == {"tool.allowed", "tool.failed"}


def test_a_blocked_call_is_not_counted_twice(conn, offline):
    """The pre hook writes the refusal; the post hook fires again for the same
    call with ``status="blocked"``. Counting both would double every refusal in
    a table somebody is reading to judge how often this teammate oversteps."""
    crew_hooks.on_pre_tool_call(**_send())
    crew_hooks.on_post_tool_call(
        **_send(), result="blocked", status="blocked",
    )
    assert len(crew_audit.query(conn, bot_id="scout")) == 1


def test_the_ledger_stores_a_digest_and_never_the_arguments(conn, offline):
    """A teammate's tool calls carry tokens, addresses and passwords. Redaction
    would mean the secret was put in the payload and caught on the way past;
    not putting it there is both simpler and stronger."""
    secret = "sk-live-do-not-store-this"
    crew_hooks.on_post_tool_call(
        tool_name="post_to_portal", args={"api_key": secret, "body": "confidential text"},
        result="ok", task_id="crew-scout", tool_call_id="c1", status="ok",
    )
    [event] = crew_audit.query(conn, bot_id="scout")
    row = " ".join(str(v) for v in event.values())
    assert secret not in row
    assert "confidential text" not in row
    assert event["args_digest"] == crew_audit.args_digest(
        {"api_key": secret, "body": "confidential text"}
    )


def test_the_digest_is_stable_and_order_independent():
    assert crew_audit.args_digest({"a": 1, "b": 2}) == crew_audit.args_digest({"b": 2, "a": 1})
    assert crew_audit.args_digest({"a": 1}) != crew_audit.args_digest({"a": 2})


def test_the_boundary_in_force_is_recorded_at_load(conn):
    """Grants live in the database but the risk table lives in the build, so an
    upgrade can change what "default" means without a row changing. A reader
    looking at last month's refusals needs to know which rules produced them."""
    crew_audit.record_policy_loaded(conn)
    [event] = crew_audit.query(conn, event_types=("crew.policy_loaded",))
    assert str(len(crew_grants._RISK_RULES)) in event["subject"]
    assert "message_user" in event["detail"]


def test_an_unknown_event_type_is_refused(conn):
    """The vocabulary is closed because a reader has to be taught to show each
    one; a typo that silently created a sixth kind would be invisible."""
    with pytest.raises(ValueError):
        crew_audit.record(conn, event_type="tool.maybe", bot_id="scout")


def test_the_ledger_answers_was_anything_stopped_in_one_query(conn, offline):
    crew_hooks.on_pre_tool_call(**_send())
    crew_grants.set_grant(conn, "scout", "delete_repo", "deny")
    crew_hooks.on_pre_tool_call(**_send(tool_name="delete_repo", args={"name": "prod"}))
    crew_hooks.on_post_tool_call(
        tool_name="read_file", args={"path": "/x"}, result="ok",
        task_id="crew-scout", tool_call_id="c9", status="ok",
    )
    stopped = crew_audit.query(conn, event_types=("tool.refused", "tool.held"))
    assert len(stopped) == 2


# ---------------------------------------------------------------------------
# Deciding what you actually read
# ---------------------------------------------------------------------------


def test_deciding_against_a_stale_card_is_refused(conn):
    """The one failure this whole mechanism exists to prevent. Between render
    and click the hold can be rewritten; without this the operator approves
    something they never saw."""
    approval = crew_approvals.create_approval(
        conn, thread_id=crew_db.dm_thread_id("scout"), bot_id="scout",
        action="Email the CFO", detail="Q3 numbers", scope=["to: cfo@example.com"],
    )
    with pytest.raises(crew_approvals.StaleApproval):
        crew_approvals.resolve_approval(conn, int(approval["id"]), "approve", expect_hash="deadbeef")
    assert crew_approvals.get_approval(conn, int(approval["id"]))["status"] == "pending"


def test_deciding_against_the_card_you_read_goes_through(conn):
    approval = crew_approvals.create_approval(
        conn, thread_id=crew_db.dm_thread_id("scout"), bot_id="scout",
        action="Email the CFO", detail="Q3 numbers", scope=["to: cfo@example.com"],
    )
    settled = crew_approvals.resolve_approval(
        conn, int(approval["id"]), "approve", expect_hash=approval["content_hash"]
    )
    assert settled is not None and settled["status"] == "approved"


def test_the_content_hash_covers_everything_the_card_shows():
    base = crew_approvals.content_hash("Email the CFO", "Q3 numbers", ["to: cfo@example.com"])
    assert base != crew_approvals.content_hash("Email the CFO", "Q3 numbers", ["to: press@example.com"])
    assert base != crew_approvals.content_hash("Email the board", "Q3 numbers", ["to: cfo@example.com"])
    assert base != crew_approvals.content_hash("Email the CFO", "Q4 numbers", ["to: cfo@example.com"])


def test_an_unanswered_hold_lapses_rather_than_standing_open(conn):
    """An approval nobody answered is not a standing permission. "I approved
    that this morning" must not fire tonight."""
    approval = crew_approvals.create_approval(
        conn, thread_id=crew_db.dm_thread_id("scout"), bot_id="scout",
        action="Email the CFO",
    )
    conn.execute(
        "UPDATE approvals SET expires_at = ? WHERE id = ?",
        (crew_db.now_ms() - 1000, approval["id"]),
    )
    conn.commit()
    assert crew_approvals.sweep_expired(conn)
    assert crew_approvals.get_approval(conn, int(approval["id"]))["status"] == "expired"
    assert crew_approvals.resolve_approval(conn, int(approval["id"]), "approve") is None


def test_a_lapsed_hold_is_reported_as_nobody_decided(conn, offline):
    """Distinct from a refusal on purpose: the teammate should say "nobody got
    to this" rather than "you said no", because those call for different things
    from the operator."""
    crew_hooks.on_pre_tool_call(**_send())
    [approval] = crew_approvals.list_approvals(conn, "scout")
    crew_approvals.expire_approval(conn, int(approval["id"]))

    directive = crew_hooks.on_pre_tool_call(**_send(tool_call_id="call_retry"))
    assert directive is not None
    assert "lapsed" in directive["message"]


def test_a_short_ref_is_minted_so_a_decision_can_come_from_the_thread(conn):
    approval = crew_approvals.create_approval(
        conn, thread_id=crew_db.dm_thread_id("scout"), bot_id="scout", action="Email the CFO",
    )
    assert len(approval["ref"]) == 4
    assert crew_approvals.get_by_ref(conn, approval["ref"])["id"] == approval["id"]


# ---------------------------------------------------------------------------
# What became of a released action (F2)
#
# "We let it through" and "it happened" are different claims, and the gap
# between them is where a process dies. Before this, `claim_release` wrote
# `consumed_at` and the tool then ran unguarded — so a crash mid-send left a
# row reading "approved, consumed", which is byte-for-byte what success looks
# like. The teammate's next turn would reasonably conclude the mail went out.
# ---------------------------------------------------------------------------


def _approved_send(conn, offline_marker=None):
    """Hold a send, approve it, and hand back the idempotency key."""
    crew_hooks.on_pre_tool_call(**_send())
    [approval] = crew_approvals.list_approvals(conn, "scout")
    crew_approvals.resolve_approval(conn, int(approval["id"]), "approve")
    return approval


def test_releasing_a_call_marks_it_in_flight_not_finished(conn, offline):
    """The window has to be visible while it is open, or a crash inside it
    leaves nothing to find."""
    _approved_send(conn)
    assert crew_hooks.on_pre_tool_call(**_send(tool_call_id="call_go")) is None

    [approval] = crew_approvals.list_approvals(conn, "scout")
    assert approval["status"] == "executing"


def test_a_call_that_comes_back_settles_the_approval(conn, offline):
    _approved_send(conn)
    crew_hooks.on_pre_tool_call(**_send(tool_call_id="call_go"))
    crew_hooks.on_post_tool_call(
        **_send(tool_call_id="call_go"), result={"ok": True}, status="ok",
    )
    [approval] = crew_approvals.list_approvals(conn, "scout")
    assert approval["status"] == "succeeded"


def test_a_call_that_comes_back_failed_says_so(conn, offline):
    _approved_send(conn)
    crew_hooks.on_pre_tool_call(**_send(tool_call_id="call_go"))
    crew_hooks.on_post_tool_call(
        **_send(tool_call_id="call_go"), result={"error": "smtp refused"}, status="error",
    )
    [approval] = crew_approvals.list_approvals(conn, "scout")
    assert approval["status"] == "failed"


def test_a_release_the_process_never_finished_becomes_outcome_unknown(conn, offline):
    """The whole point. `failed` would claim nothing happened and retrying is
    safe. Nobody knows that."""
    _approved_send(conn)
    crew_hooks.on_pre_tool_call(**_send(tool_call_id="call_go"))
    # …and the process dies here. No post hook, no settle.

    assert crew_approvals.recover_executing(conn) == 1
    [approval] = crew_approvals.list_approvals(conn, "scout")
    assert approval["status"] == "outcome_unknown"
    assert "may or may not have gone through" in approval["note"]


def test_recovery_leaves_settled_approvals_alone(conn, offline):
    _approved_send(conn)
    crew_hooks.on_pre_tool_call(**_send(tool_call_id="call_go"))
    crew_hooks.on_post_tool_call(
        **_send(tool_call_id="call_go"), result={"ok": True}, status="ok",
    )
    assert crew_approvals.recover_executing(conn) == 0
    assert crew_approvals.list_approvals(conn, "scout")[0]["status"] == "succeeded"


def test_a_late_settle_cannot_tidy_away_an_unknown_outcome(conn, offline):
    """A straggler reporting success must not overwrite what a restart already
    recorded — that would erase the one signal telling somebody to go and
    check."""
    _approved_send(conn)
    crew_hooks.on_pre_tool_call(**_send(tool_call_id="call_go"))
    [approval] = crew_approvals.list_approvals(conn, "scout")
    crew_approvals.recover_executing(conn)

    assert crew_approvals.settle_execution(conn, int(approval["id"]), success=True) is None
    assert crew_approvals.get_approval(conn, int(approval["id"]))["status"] == "outcome_unknown"


def test_retrying_a_call_whose_outcome_is_unknown_is_refused(conn, offline):
    """It was allowed once and may already have gone out. A second attempt is
    how one payment becomes two."""
    _approved_send(conn)
    crew_hooks.on_pre_tool_call(**_send(tool_call_id="call_go"))
    crew_approvals.recover_executing(conn)

    directive = crew_hooks.on_pre_tool_call(**_send(tool_call_id="call_again"))
    assert directive is not None
    assert "somebody needs to check" in directive["message"]
    # No second card: the operator is not asked to re-approve something that
    # may already have happened.
    assert len(crew_approvals.list_approvals(conn, "scout")) == 1


def test_the_panel_can_tell_sent_from_lost_sight_of(conn, offline):
    """Errand's union flattens both to `allowed`, so the honest distinction has
    to ride alongside it."""
    from crew import contract as crew_contract

    _approved_send(conn)
    crew_hooks.on_pre_tool_call(**_send(tool_call_id="call_go"))
    crew_approvals.recover_executing(conn)

    [approval] = crew_approvals.list_approvals(conn, "scout")
    shaped = crew_contract.approval(approval)
    assert shaped["status"] == "allowed"
    assert shaped["outcome"] == "outcome_unknown"
