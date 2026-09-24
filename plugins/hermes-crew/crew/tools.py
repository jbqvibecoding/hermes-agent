"""The six tools that make a Hermes agent behave like a GrokBot teammate.

Schemas and descriptions are ported from OpenGrokBot's ``gateway/src/tools.ts``
close to verbatim. That is deliberate and worth stating plainly: a tool's
description is the only place the model learns *when* to reach for it, so these
strings are product design, not documentation. "Do the preparation first, then
hold the finished draft" is what stops a teammate holding an empty intention
for approval, and "you never have their credentials and must never ask for them
in chat" is what stops it asking for a password.

There are only six because everything else a teammate needs — a shell, files, a
browser, memory, search, MCP — is already a Hermes tool. These six exist
because a plain agent has no concept of a thread it reports into, an action
held at the door, or a colleague it can hand work to.

Shell / file / browser tools are **not** re-implemented here: they are Hermes's
own, pointed at the teammate's container by ``crew/computer.py``.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from crew import approvals as crew_approvals
from crew import computer as crew_computer
from crew import db as crew_db
from crew import orchestrator
from crew.report import validate_report_payload

log = logging.getLogger(__name__)


def _no_turn() -> str:
    """What a crew tool says when it is called outside a crew thread.

    Reachable when a teammate's profile has the ``crew`` toolset enabled and
    the operator then talks to it through the CLI or Telegram. The honest
    answer is that there is no thread to post into — not a traceback, and not
    a silent success the model would then report as done.
    """
    return json.dumps(
        {
            "error": (
                "This tool only works inside a crew thread. You are not in one right now — "
                "reply in plain text instead."
            )
        },
        ensure_ascii=False,
    )


# ---------------------------------------------------------------------------
# message_user
# ---------------------------------------------------------------------------

MESSAGE_USER_SCHEMA = {
    "name": "message_user",
    "description": (
        "Send a structured message to your operator. kind \"report\" renders the standard "
        "work-report chip (✓ system → result · count)."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "kind": {"type": "string", "enum": ["report"]},
            "payload": {
                "type": "object",
                "properties": {
                    "lines": {
                        "type": "array",
                        "minItems": 1,
                        "items": {
                            "type": "object",
                            "properties": {
                                "system": {
                                    "type": "string",
                                    "description": 'The system/surface you touched, e.g. "Salesforce"',
                                },
                                "result": {
                                    "type": "string",
                                    "description": '2-5 plain words, e.g. "list pulled"',
                                },
                                "count": {
                                    "type": "string",
                                    "description": 'The number that proves it, e.g. "52 accounts"',
                                },
                            },
                            "required": ["system", "result"],
                        },
                    },
                    "closing": {
                        "type": "string",
                        "description": "ONE plain sentence surfacing only what needs the human.",
                    },
                },
                "required": ["lines"],
            },
        },
        "required": ["kind", "payload"],
    },
}


def handle_message_user(args: dict, **_kw: Any) -> str:
    turn = orchestrator.resolve_turn()
    if turn is None:
        return _no_turn()

    payload = validate_report_payload(args.get("payload"))
    if payload is None:
        # Handed back to the model as the tool result so it retries with a
        # well-formed report. Never rendered — a half-empty chip would teach it
        # the grammar is optional.
        return json.dumps(
            {
                "error": (
                    "That is not a valid report. Send payload.lines as a non-empty array of "
                    '{"system": "...", "result": "..."} objects (count is optional and must be '
                    "a string), plus an optional one-sentence closing."
                )
            },
            ensure_ascii=False,
        )

    conn = crew_db.connect()
    crew_db.insert_message(
        conn, thread_id=turn.thread_id, sender=turn.bot_id, kind="report", payload=payload
    )
    return json.dumps({"delivered": True, "lines": len(payload["lines"])}, ensure_ascii=False)


# ---------------------------------------------------------------------------
# hold_for_approval
# ---------------------------------------------------------------------------

HOLD_FOR_APPROVAL_SCHEMA = {
    "name": "hold_for_approval",
    "description": (
        "Hold an outward-facing action for your operator to approve. ALWAYS use this before "
        "anything that leaves your workspace — sending, publishing, paying, booking, replying "
        "on their behalf. Do the preparation first, then hold the finished draft."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "action": {
                "type": "string",
                "description": 'The action in one short line, e.g. "send the 4 queued drafts".',
            },
            "detail": {
                "type": "string",
                "description": "What exactly would go out — recipients, amounts, the draft itself.",
            },
        },
        "required": ["action"],
    },
}


def handle_hold_for_approval(args: dict, **_kw: Any) -> str:
    turn = orchestrator.resolve_turn()
    if turn is None:
        return _no_turn()

    action = str(args.get("action") or "").strip()
    if not action:
        return json.dumps({"error": "Say what you are holding, in one short line."}, ensure_ascii=False)
    detail = str(args.get("detail") or "").strip()

    conn = crew_db.connect()
    approval = crew_approvals.create_approval(
        conn, thread_id=turn.thread_id, bot_id=turn.bot_id, action=action, detail=detail
    )
    chip = crew_db.insert_message(
        conn,
        thread_id=turn.thread_id,
        sender=turn.bot_id,
        kind="approval_request",
        turn_id=turn.turn_id,
        payload={
            "approval_id": approval["id"],
            "action": action,
            "detail": detail,
            "status": "pending",
        },
    )
    # The chip has no id until it is inserted, so the link is backfilled here.
    # Without it, resolving cannot flip *this* chip and the operator gets a
    # second one instead of an answered first.
    crew_approvals.attach_approval_message(conn, int(approval["id"]), int(chip["id"]))

    # The chip rides the message tail like any other row. These two do not have
    # a row to ride: the detail panel keeps its own approvals list, and the
    # sidebar's amber `waiting_for_approval` is computed, not stored. Without
    # them the operator sees the chip but the roster still reads "idle".
    from crew import contract as crew_contract

    orchestrator.emit_event(crew_contract.approval_updated(approval))
    orchestrator.emit_status(turn.bot_id, "waiting_for_approval")

    return json.dumps(
        {
            "held": True,
            "approval_id": approval["id"],
            "note": (
                "Held for your operator. Stop here — do not perform the action and do not "
                "claim you did. You will be told when they decide."
            ),
        },
        ensure_ascii=False,
    )


# ---------------------------------------------------------------------------
# save_memory_rule
# ---------------------------------------------------------------------------

SAVE_MEMORY_RULE_SCHEMA = {
    "name": "save_memory_rule",
    "description": (
        "Write a standing rule into your MEMORY.md. Use it whenever your operator tells you how "
        'to behave from now on ("always...", "never...", "from now on..."). One rule per call, '
        "phrased so it still makes sense months later."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "rule": {"type": "string", "description": "The rule in one plain sentence."},
        },
        "required": ["rule"],
    },
}


def handle_save_memory_rule(args: dict, **_kw: Any) -> str:
    """Append a rule to the teammate's own MEMORY.md and post the diff.

    Delegates the write to Hermes's ``memory`` tool rather than appending to the
    file directly: that is what enforces the character budget, the consolidation
    pass, and the file locking, and it means a rule saved here is the same
    object the teammate's CLI session sees. The crew's only addition is making
    the change *visible* — the operator watches the rule land instead of
    discovering it later.
    """
    turn = orchestrator.resolve_turn()
    if turn is None:
        return _no_turn()

    rule = str(args.get("rule") or "").strip()
    if not rule:
        return json.dumps({"error": "Say the rule in one plain sentence."}, ensure_ascii=False)

    try:
        # ``load_on_disk_store`` resolves the memory directory through
        # ``get_memory_dir()`` at call time, so under the turn's HERMES_HOME
        # override it writes *this teammate's* memories/MEMORY.md — and it
        # applies the operator's configured char limits, which is the whole
        # reason not to append to the file by hand.
        from tools.memory_tool import load_on_disk_store

        result = load_on_disk_store().add("memory", rule)
    except Exception as exc:  # noqa: BLE001
        log.exception("crew: memory write failed for %s", turn.bot_id)
        return json.dumps({"error": f"Could not save that rule: {exc}"}, ensure_ascii=False)

    if not isinstance(result, dict) or not result.get("success"):
        return json.dumps(result if isinstance(result, dict) else {"error": "Memory write failed."},
                          ensure_ascii=False)

    # An identical rule is a no-op inside MemoryStore, and a chip for it would
    # be noise — the operator already has that rule on file.
    duplicate = "already exists" in str(result.get("message") or "")
    if not duplicate:
        conn = crew_db.connect()
        crew_db.insert_message(
            conn,
            thread_id=turn.thread_id,
            sender=turn.bot_id,
            kind="memory_updated",
            payload={"rule": rule, "diff": f"+ - {rule}"},
        )

    return json.dumps({"saved": True, "rule": rule, "duplicate": duplicate}, ensure_ascii=False)


# ---------------------------------------------------------------------------
# create_routine
# ---------------------------------------------------------------------------

CREATE_ROUTINE_SCHEMA = {
    "name": "create_routine",
    "description": (
        "Schedule recurring work for yourself. Use it when your operator says \"every day\", "
        '"each Monday", "from now on at 9". You may also propose one yourself when a task '
        "clearly repeats."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "name": {"type": "string", "description": 'Short name, e.g. "Morning digest".'},
            "cron": {
                "type": "string",
                "description": 'Five-field cron expression, e.g. "0 9 * * 1". "every 30m" also works.',
            },
            "instructions": {
                "type": "string",
                "description": "What to do each time it fires, written to yourself.",
            },
            "needs_computer": {
                "type": "boolean",
                "description": (
                    "Whether the fired turn needs your shell, files and browser. Default true. "
                    "Set false for a pure reminder — it fires faster and costs less."
                ),
            },
        },
        "required": ["name", "cron", "instructions"],
    },
}


def handle_create_routine(args: dict, **_kw: Any) -> str:
    turn = orchestrator.resolve_turn()
    if turn is None:
        return _no_turn()

    from crew.routines import CrewRoutineError, create_routine

    try:
        routine = create_routine(
            bot_id=turn.bot_id,
            name=str(args.get("name") or ""),
            schedule=str(args.get("cron") or ""),
            instructions=str(args.get("instructions") or ""),
            with_computer=bool(args.get("needs_computer", True)),
        )
    except CrewRoutineError as exc:
        return json.dumps({"error": str(exc)}, ensure_ascii=False)

    conn = crew_db.connect()
    crew_db.insert_message(
        conn,
        thread_id=turn.thread_id,
        sender=turn.bot_id,
        kind="routine_created",
        payload=routine,
    )
    return json.dumps({"created": True, **routine}, ensure_ascii=False)


# ---------------------------------------------------------------------------
# message_bot
# ---------------------------------------------------------------------------

MESSAGE_BOT_SCHEMA = {
    "name": "message_bot",
    "description": (
        "Hand a specific task to another teammate. It lands in their thread and they pick it up. "
        "Only allowlisted teammates are reachable. Say what \"done\" looks like and by when — "
        "never hand off something you have not scoped."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "to": {"type": "string", "description": 'The teammate id, e.g. "market-watch".'},
            "content": {
                "type": "string",
                "description": "The task, its purpose and its deadline, written to them.",
            },
        },
        "required": ["to", "content"],
    },
}


def handle_message_bot(args: dict, **_kw: Any) -> str:
    turn = orchestrator.resolve_turn()
    if turn is None:
        return _no_turn()

    to = str(args.get("to") or "").strip()
    content = str(args.get("content") or "").strip()
    if not to or not content:
        return json.dumps(
            {"error": "Name the teammate and say what the task is."}, ensure_ascii=False
        )

    outcome = orchestrator.relay(turn.bot_id, to, content, turn.hop)
    if not outcome.get("delivered"):
        # Returned as a normal result, not an error: the refusal is information
        # the teammate should relay to the operator in plain words, and the
        # prompt tells it to say so rather than pretend.
        return json.dumps({"delivered": False, "reason": outcome.get("reason")}, ensure_ascii=False)
    return json.dumps(
        {"delivered": True, "to": to, "to_name": outcome.get("to_name")}, ensure_ascii=False
    )


# ---------------------------------------------------------------------------
# ask_for_login
# ---------------------------------------------------------------------------

ASK_FOR_LOGIN_SCHEMA = {
    "name": "ask_for_login",
    "description": (
        "Ask your operator to sign in to a site on your computer. Use it the moment you hit a "
        "login wall — you never have their credentials and must never ask for them in chat. "
        "They take over your screen, sign in once, and the session stays in your browser from "
        "then on."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "site": {"type": "string", "description": 'The site, e.g. "Zendesk".'},
            "why": {
                "type": "string",
                "description": "What you will do once you are in, in one line.",
            },
        },
        "required": ["site"],
    },
}


def handle_ask_for_login(args: dict, **_kw: Any) -> str:
    turn = orchestrator.resolve_turn()
    if turn is None:
        return _no_turn()

    site = str(args.get("site") or "").strip()
    if not site:
        return json.dumps({"error": "Name the site you are stuck on."}, ensure_ascii=False)
    why = str(args.get("why") or "").strip()

    # Warm the container before posting the chip so the screen is live by the
    # time the operator clicks through to it.
    endpoints = crew_computer.ensure(turn.bot_id)

    conn = crew_db.connect()
    crew_db.insert_message(
        conn,
        thread_id=turn.thread_id,
        sender=turn.bot_id,
        kind="login_request",
        payload={"site": site, "why": why, "vnc_url": endpoints.get("vnc_url")},
    )
    return json.dumps(
        {
            "asked": True,
            "note": (
                f"Asked your operator to sign in to {site}. "
                f"Stop here until they say it is done."
            ),
        },
        ensure_ascii=False,
    )


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

CREW_TOOLS: tuple[tuple[str, dict, Any, str], ...] = (
    ("message_user", MESSAGE_USER_SCHEMA, handle_message_user, "✓"),
    ("hold_for_approval", HOLD_FOR_APPROVAL_SCHEMA, handle_hold_for_approval, "⏸"),
    ("save_memory_rule", SAVE_MEMORY_RULE_SCHEMA, handle_save_memory_rule, "🧠"),
    ("create_routine", CREATE_ROUTINE_SCHEMA, handle_create_routine, "🕐"),
    ("message_bot", MESSAGE_BOT_SCHEMA, handle_message_bot, "↪"),
    ("ask_for_login", ASK_FOR_LOGIN_SCHEMA, handle_ask_for_login, "🔑"),
)


def crew_tools_available() -> bool:
    """Gate shown in ``hermes tools``.

    Always true: the tools are registered so the toolset is visible and can be
    enabled per teammate, and each handler declines cleanly when it is called
    outside a crew thread (see :func:`_no_turn`).
    """
    return True
