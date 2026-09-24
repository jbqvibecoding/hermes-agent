"""Where "stop at the door" stops being a request and becomes a mechanism.

Everything else in this plugin runs inside a turn the crew orchestrator
started. These two functions do not: Hermes calls them from every tool-dispatch
path in every process, so they cover a routine firing in the gateway, a
teammate reached over Telegram, and the dashboard alike.

``pre_tool_call`` can refuse a call before it runs
(``hermes_cli/plugins.py::resolve_pre_tool_block``, which is fail-closed and is
the single entry point every dispatch site uses). That is what turns
draft-and-hold from a paragraph the model is asked to honour into something a
prompt-injected model cannot get around: it may decide to send the email, and
the send does not happen.

``post_tool_call`` fires after every dispatch **including blocked and cancelled
ones** (``status="blocked"``), carrying ``result``, ``duration_ms`` and
``status``. That is the audit ledger's source.

We deliberately return ``{"action": "block"}`` rather than the host's
``{"action": "approve"}``. The approve directive escalates to
``tools/approval.py::request_tool_approval``, which blocks the calling thread
until a human answers — right for a dangerous ``rm`` with someone at the
keyboard, wrong for an approval that may sit until tomorrow morning, because it
would pin a model context, burn the prompt cache, and lose the work to any
restart.

Two rules govern everything here:

**Never break a turn.** A teammate whose tools all fail because the grant table
has a bad row is worse than an ungoverned one. Every path out of these
functions is either a decision or a shrug; nothing raises.

**Never guess the teammate.** If we cannot tell whose call this is, we are not
in a crew turn — somebody enabled the crew toolset on an ordinary profile — and
the right answer is to stay out of the way entirely.
"""

from __future__ import annotations

import hashlib
import logging
import sqlite3
import threading
from typing import Any, Optional

log = logging.getLogger(__name__)

#: Only ever prefixed by ``crew/computer.py::task_id_for``.
_TASK_PREFIX = "crew-"

#: Released approvals whose tool call is still in flight, by tool-call id.
#: In-process because that is exactly its scope: the window it tracks opens
#: when this process lets a call through and closes when the call returns here.
#: A process that dies in between leaves the row reading `executing`, which is
#: the whole signal — see `crew.approvals.recover_executing`.
_executing: dict[str, int] = {}
_executing_lock = threading.Lock()

#: What a held call tells the model. It has three jobs: stop it retrying, stop
#: it claiming the thing happened, and tell it what actually did happen so it
#: can say so in its own words.
_HELD_TEMPLATE = (
    "HELD FOR YOUR OPERATOR — this did not run.\n"
    "{why}\n"
    "It is waiting for them to approve or discard it (ref {ref}). "
    "Do not retry it, do not work around it, and do not say you did it. "
    "Tell your operator what is waiting, then either stop or carry on with "
    "work that does not depend on this."
)

_REFUSED_TEMPLATE = (
    "REFUSED — this did not run. {why}\n"
    "Do not retry it and do not work around it. Say plainly that you are not "
    "allowed to do this, and carry on with what you can."
)


def _bot_id_for(task_id: str) -> Optional[str]:
    """Whose tool call this is, or ``None`` when it is not a teammate's.

    ``task_id`` first because it is explicit and survives into the executor
    threads tool dispatch runs on; the active profile second, because a routine
    firing in the gateway runs as that teammate's profile without any crew task
    id. The profile answer is confirmed against the roster, so an ordinary
    profile that happens to have the crew toolset enabled is not mistaken for a
    teammate.
    """
    if task_id and task_id.startswith(_TASK_PREFIX):
        candidate = task_id[len(_TASK_PREFIX):].strip()
        if candidate:
            return candidate
    try:
        from crew import db as crew_db
        from hermes_cli.profiles import get_active_profile_name

        name = (get_active_profile_name() or "").strip()
        if name and crew_db.get_bot(crew_db.connect(), name) is not None:
            return name
    except Exception:
        log.debug("crew: could not resolve the teammate for this tool call", exc_info=True)
    return None


def _where(conn: sqlite3.Connection, bot_id: str, turn_id: str) -> tuple[str, str]:
    """The thread and turn this call belongs to.

    Not ``session_id``: the host's session id identifies a gateway session, not
    a crew thread, and writing chips against it would put them in a thread
    nothing reads. The teammate's own DM thread is the unambiguous answer;
    a group round overrides it when its context reached us.
    """
    from crew import db as crew_db
    from crew import orchestrator

    turn = orchestrator.current_turn()
    if turn is not None and turn.bot_id == bot_id and turn.thread_id:
        return turn.thread_id, (turn.turn_id or turn_id)
    return crew_db.ensure_dm_thread(conn, bot_id), turn_id


def _subject(tool: str, args: Any) -> str:
    """One readable line about what this call touches.

    Reuses the activity stream's title logic so a call is described the same way
    in the ledger and in the working strip — two phrasings for one event is how
    a reader ends up unsure whether they are the same event.
    """
    try:
        from crew import activity as crew_activity

        return crew_activity.activity_title(tool, args)
    except Exception:
        return tool


#: Argument names whose values never reach the approval card. The card is
#: rendered in a browser and stored in SQLite; a credential passed as a tool
#: argument has no business in either.
_SECRETISH = ("password", "passwd", "token", "secret", "key", "credential", "auth", "cookie")
_SCOPE_VALUE_LIMIT = 160
_SCOPE_LINES = 8


def _scope(tool: str, args: Any) -> list[str]:
    """What the approval card lists under "this allows".

    This is the hole Phase D exists to close. ``contract.approval()`` shipped
    with a literal ``"scope": []`` — the operator was asked to approve "send an
    email" with no way to see *which* email. Errand's ``DetailPanel`` already
    renders ``scope[]`` as a checklist; it just never had anything to render.
    """
    if not isinstance(args, dict):
        return [tool]
    lines: list[str] = []
    for name, value in args.items():
        lowered = str(name).lower()
        if any(word in lowered for word in _SECRETISH):
            continue
        text = " ".join(str(value).split())
        if not text:
            continue
        if len(text) > _SCOPE_VALUE_LIMIT:
            text = text[:_SCOPE_VALUE_LIMIT] + "…"
        lines.append(f"{name}: {text}")
        if len(lines) >= _SCOPE_LINES:
            break
    return lines or [tool]


# ---------------------------------------------------------------------------
# pre_tool_call
# ---------------------------------------------------------------------------


def on_pre_tool_call(
    tool_name: str = "",
    args: Any = None,
    task_id: str = "",
    session_id: str = "",
    tool_call_id: str = "",
    turn_id: str = "",
    **_: Any,
) -> Optional[dict]:
    """Refuse, hold, or stay out of the way."""
    try:
        bot_id = _bot_id_for(task_id)
        if not bot_id:
            return None

        from crew import audit as crew_audit
        from crew import db as crew_db
        from crew import policy as crew_policy

        conn = crew_db.connect()
        verdict = crew_policy.evaluate(conn, bot_id, tool_name, args)
        if verdict.allowed:
            return None

        thread_id, turn = _where(conn, bot_id, turn_id)
        subject = _subject(tool_name, args)

        def refuse(why: str) -> dict:
            crew_audit.record(
                conn, event_type="tool.refused", bot_id=bot_id, thread_id=thread_id,
                turn_id=turn, tool_call_id=tool_call_id, tool=tool_name, args=args,
                subject=subject, detail=why, status="blocked",
            )
            _record_blocked_activity(conn, thread_id, turn, tool_call_id, tool_name, args,
                                     f"Refused: {why}")
            return {"action": "block", "message": _REFUSED_TEMPLATE.format(why=why)}

        if verdict.mode == "deny":
            return refuse(verdict.why)

        from crew import approvals as crew_approvals

        key = _idem_key(bot_id, tool_name, args)

        # The operator said yes and the teammate is re-attempting the call that
        # was held. Spend the approval and step aside — this is the only way a
        # held action ever actually happens.
        released = crew_approvals.claim_release(conn, key)
        if released is not None:
            crew_audit.record(
                conn, event_type="tool.allowed", bot_id=bot_id,
                actor=crew_audit.ACTOR_OPERATOR, thread_id=thread_id, turn_id=turn,
                tool_call_id=tool_call_id, tool=tool_name, args=args, subject=subject,
                detail=f"released by approval {released.get('ref') or released['id']}",
                status="executing",
            )
            # The approval is now `executing`. Nothing else knows that the call
            # is in flight, so remember which row to settle when it comes back.
            with _executing_lock:
                _executing[tool_call_id] = int(released["id"])
            return None

        # Released once already, and nobody ever saw how it ended. Trying again
        # is how one payment becomes two.
        uncertain = crew_approvals.uncertain_outcome(conn, key)
        if uncertain is not None:
            return refuse(
                "this was already allowed once and the process stopped before "
                "anyone saw whether it went through. Do not try again — say that "
                "somebody needs to check whether it already happened"
            )

        # Already answered "no", recently, to this exact call. Re-asking would
        # put the same question in front of the operator twice.
        refused = crew_approvals.recent_refusal(conn, key)
        if refused is not None:
            lapsed = refused.get("status") == "expired"
            return refuse(
                "nobody decided this in time, so it lapsed" if lapsed
                else "your operator has already declined this"
            )

        return _hold(
            conn, bot_id=bot_id, thread_id=thread_id, tool=tool_name, args=args,
            tool_call_id=tool_call_id, turn_id=turn, subject=subject, why=verdict.why,
            idem_key=key,
        )
    except Exception:
        # A guard that breaks the turn is worse than the risk it was added for.
        log.warning("crew: permission check failed; allowing the call", exc_info=True)
        return None


def _record_blocked_activity(
    conn: sqlite3.Connection, thread_id: str, turn_id: str, tool_call_id: str,
    tool: str, args: Any, output: str,
) -> None:
    """Show a stopped call in the working strip.

    ``failed`` rather than a sixth status: the activity vocabulary is Errand's
    closed set and the components key their icons off it, so inventing ``held``
    here would render as nothing. The precise distinction between refused, held
    and genuinely broken lives in the audit ledger, which is where somebody
    goes when they need it.
    """
    try:
        from crew import activity as crew_activity
        from crew import contract as crew_contract
        from crew import orchestrator

        if not tool_call_id:
            return
        event = crew_activity.upsert_activity(
            conn, tool_call_id=tool_call_id, thread_id=thread_id, turn_id=turn_id,
            tool_name=tool, args=args, status="failed", output=output,
        )
        orchestrator.emit_event(crew_contract.activity_updated(event))
    except Exception:
        log.debug("crew: blocked call not shown in the activity strip", exc_info=True)


def _idem_key(bot_id: str, tool: str, args: Any) -> str:
    """Identity of an *action*, not of an attempt.

    Deliberately excludes the turn and the tool-call id. The whole cycle
    depends on it: the call is blocked in one turn, the operator decides, and
    the teammate re-attempts in a **different** turn with a **different** call
    id. Keyed on the attempt, nothing would ever match and an approved action
    could never happen; keyed on the action, the retry finds its own approval.

    The arguments are in the digest, so an edited retry is correctly a
    different action and gets its own hold rather than riding the old consent.
    """
    from crew import audit as crew_audit

    raw = f"{bot_id}|{tool}|{crew_audit.args_digest(args)}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def _hold(
    conn: sqlite3.Connection,
    *,
    bot_id: str,
    thread_id: str,
    tool: str,
    args: Any,
    tool_call_id: str,
    turn_id: str,
    subject: str,
    why: str,
    idem_key: str,
) -> dict:
    """Record the hold, put a card in the thread, and block the call."""
    from crew import approvals as crew_approvals
    from crew import audit as crew_audit
    from crew import contract as crew_contract
    from crew import db as crew_db
    from crew import orchestrator

    scope = _scope(tool, args)

    approval = crew_approvals.create_approval(
        conn,
        thread_id=thread_id,
        bot_id=bot_id,
        action=subject,
        detail=why,
        scope=scope,
        tool=tool,
        tool_call_id=tool_call_id,
        turn_id=turn_id,
        source=_current_source(bot_id),
        idem_key=idem_key,
    )

    # A repeat of the same call finds the hold already carded and announced.
    if not approval.get("message_id"):
        chip = crew_db.insert_message(
            conn,
            thread_id=thread_id,
            sender=bot_id,
            kind="approval_request",
            turn_id=turn_id,
            payload={
                "approval_id": approval["id"],
                "ref": approval.get("ref"),
                "action": approval["action"],
                "detail": approval["detail"],
                "scope": scope,
                "status": "pending",
            },
        )
        crew_approvals.attach_approval_message(conn, int(approval["id"]), int(chip["id"]))
        approval["message_id"] = int(chip["id"])
        orchestrator.emit_event(crew_contract.message_created(chip))
        orchestrator.emit_event(crew_contract.approval_updated(approval))
        orchestrator.emit_status(bot_id, "waiting_for_approval")

    crew_audit.record(
        conn, event_type="tool.held", bot_id=bot_id, thread_id=thread_id, turn_id=turn_id,
        tool_call_id=tool_call_id, tool=tool, args=args, subject=subject,
        detail=why, status="blocked",
    )
    return {
        "action": "block",
        "message": _HELD_TEMPLATE.format(why=why, ref=approval.get("ref") or approval["id"]),
    }


def _current_source(bot_id: str) -> str:
    """Which piece of work is asking, for the card's "who wants this" line.

    With several teammates working at once, an approval that does not say what
    it belongs to makes the operator go hunting before they can answer it.
    """
    try:
        from crew import orchestrator

        turn = orchestrator.current_turn()
        if turn is not None and turn.group_title:
            return turn.group_title
    except Exception:
        pass
    return bot_id


# ---------------------------------------------------------------------------
# post_tool_call
# ---------------------------------------------------------------------------


def on_post_tool_call(
    tool_name: str = "",
    args: Any = None,
    result: Any = None,
    task_id: str = "",
    session_id: str = "",
    tool_call_id: str = "",
    turn_id: str = "",
    duration_ms: int = 0,
    status: str = "",
    **_: Any,
) -> None:
    """Write the ledger row, and keep the working strip honest in every process."""
    try:
        bot_id = _bot_id_for(task_id)
        if not bot_id:
            return

        # A blocked call already has its row and its strip line from the pre
        # hook; writing again here would double-count every refusal.
        if status == "blocked":
            return

        from crew import activity as crew_activity
        from crew import audit as crew_audit
        from crew import db as crew_db

        conn = crew_db.connect()
        thread_id, turn = _where(conn, bot_id, turn_id)
        failed = status == "error" or crew_activity.looks_failed(result)
        _settle_released_approval(conn, tool_call_id, failed=failed)
        if not failed:
            _record_evidence(bot_id, tool_name, args, result)
        crew_audit.record(
            conn,
            event_type="tool.failed" if failed else "tool.allowed",
            bot_id=bot_id, thread_id=thread_id, turn_id=turn, tool_call_id=tool_call_id,
            tool=tool_name, args=args, subject=_subject(tool_name, args),
            status=status or ("error" if failed else "ok"),
            duration_ms=duration_ms or None,
        )
        _record_completed_activity(
            conn, thread_id, turn, tool_call_id, tool_name, args, result, failed
        )
    except Exception:
        log.debug("crew: tool call not audited", exc_info=True)


# ---------------------------------------------------------------------------
# cron_job_fired / cron_job_finished
#
# A routine is a Hermes cron job, and the gateway runs it directly — the crew
# orchestrator is not on that path at all. So without these two the crew cannot
# tell a routine that finished from one whose process was killed halfway
# through, and the host deliberately does not retry the second kind.
#
# The pair brackets the run: `fired` opens a task and takes a lease on it,
# `finished` settles it. A process that dies in between simply stops renewing,
# and the worker takes the task over. Nothing has to detect the death.
# ---------------------------------------------------------------------------

#: Runs this process is holding a lease for, by job id. Not durable on purpose
#: — it is a handle on live in-process work, and after a restart there is none.
_cron_runs: dict[str, dict] = {}
_cron_runs_lock = threading.Lock()


def on_cron_job_fired(
    job_id: str = "", job_name: str = "", prompt: str = "", **_: Any
) -> None:
    """Open a leased task for a crew routine that is about to run."""
    try:
        from crew import db as crew_db
        from crew import routines as crew_routines
        from crew import tasks as crew_tasks

        parsed = crew_routines.parse_job_name(job_name)
        if not parsed:
            return                      # somebody else's cron job
        bot_id, name = parsed

        conn = crew_db.connect()
        if crew_db.get_bot(conn, bot_id) is None:
            return                      # a leftover job for a departed teammate

        task = crew_tasks.enqueue(
            conn,
            bot_id=bot_id,
            kind="routine",
            title=name,
            thread_id=crew_db.ensure_dm_thread(conn, bot_id),
            input={"routine": name, "job_id": job_id, "prompt": prompt},
            # Per fire, not per routine. A key of `routine:<job_id>` would match
            # the previous, already-succeeded task — enqueue dedupes on any row
            # with the key and the column is UNIQUE — so every fire after the
            # first would silently return the old task and the routine would
            # never run again. Not stacking two runs of one routine is the
            # host's job, and advance_next_run already does it.
            idem_key=f"routine:{job_id}:{crew_db.now_ms()}",
        )
        claimed = crew_tasks.claim(conn, task)
        if claimed is None:
            return

        heartbeat = crew_tasks.Heartbeat(claimed["id"], claimed["lease_id"]).start()
        with _cron_runs_lock:
            _cron_runs[job_id] = {"task": claimed, "heartbeat": heartbeat}
        crew_tasks.hold(claimed["id"])
        # The turn runs next, in this process. Tools called during it reach the
        # task through here.
        crew_tasks.set_current(bot_id, claimed["id"], claimed["lease_id"])
    except Exception:
        # A routine that refuses to run because we could not open a task for it
        # is a worse outcome than a routine nobody is tracking.
        log.warning("crew: could not open a task for cron job %s", job_id, exc_info=True)


def on_cron_job_finished(
    job_id: str = "", success: bool = True, error: str = "", **_: Any
) -> None:
    """Settle the task the matching ``fired`` opened."""
    try:
        with _cron_runs_lock:
            run = _cron_runs.pop(job_id, None)
        if run is None:
            return

        from crew import db as crew_db
        from crew import tasks as crew_tasks

        run["heartbeat"].stop()
        task = run["task"]
        crew_tasks.clear_current(task["bot_id"])
        crew_tasks.unhold(task["id"])
        crew_tasks.release(
            crew_db.connect(), task["id"], task["lease_id"],
            status="succeeded" if success else "failed",
            error="" if success else (error or "the routine did not complete"),
        )
    except Exception:
        log.warning("crew: could not settle the task for cron job %s", job_id, exc_info=True)


def _settle_released_approval(
    conn: sqlite3.Connection, tool_call_id: str, *, failed: bool
) -> None:
    """Close the `executing` window opened when this call was let through.

    Only settles a row this process opened. Anything else still reading
    `executing` belongs to a run that has not come back, and the next plugin
    load is what turns those into `outcome_unknown`.
    """
    if not tool_call_id:
        return
    with _executing_lock:
        approval_id = _executing.pop(tool_call_id, None)
    if approval_id is None:
        return
    try:
        from crew import approvals as crew_approvals

        crew_approvals.settle_execution(
            conn, approval_id, success=not failed,
            error="the tool reported a failure" if failed else "",
        )
    except Exception:
        # Leaving it `executing` is the safe failure: the next load reads it as
        # an outcome nobody knows, which is exactly what it is.
        log.debug("crew: could not settle approval %s", approval_id, exc_info=True)


def _record_evidence(bot_id: str, tool: str, args: Any, result: Any) -> None:
    """Note what the teammate just read, against the task it is doing.

    Only when a task is running: outside one there is nowhere to put it, and a
    teammate answering a typed question has the thread itself as the record.
    """
    try:
        from crew import plan as crew_plan
        from crew import tasks as crew_tasks

        held = crew_tasks.current(bot_id)
        if held is None:
            return
        item = crew_plan.evidence_from_call(tool, args, result)
        if item is None:
            return                       # this tool did not read anything

        task_id, lease_id = held
        from crew import db as crew_db

        conn = crew_db.connect()
        task = crew_tasks.get(conn, task_id)
        if task is None:
            return
        crew_tasks.checkpoint(conn, task_id, lease_id, {
            "evidence": crew_plan.append_evidence(task["evidence"], item),
        })
    except Exception:
        # Losing a line of evidence must never take down the tool call that
        # produced it — least of all by raising a LostLease into the agent loop.
        log.debug("crew: evidence not recorded for %s", tool, exc_info=True)


def _record_completed_activity(
    conn: sqlite3.Connection, thread_id: str, turn_id: str, tool_call_id: str,
    tool: str, args: Any, result: Any, failed: bool,
) -> None:
    """Record the call in the working strip when nothing else has.

    This closes a real gap rather than duplicating the orchestrator: activities
    were written by ``tool_start_callback`` / ``tool_complete_callback``, which
    the orchestrator attaches to the agent it built, so **only turns the
    dashboard started produced any**. A routine firing in the gateway, or a
    teammate reached over Telegram, did four minutes of work and left a thread
    with nothing in it.

    Hooks fire in every process, so they cover those. When the orchestrator
    *did* attach callbacks and its completion write landed first, this sees a
    settled row and skips. The two can still interleave the other way round, in
    which case one extra ``activity.updated`` frame goes out for a row that is
    already correct — the client keys activities by id, so it reconciles to the
    same line. A duplicate frame is the right thing to trade away here; a
    missing one leaves an operator watching a spinner that will never resolve.
    """
    try:
        from crew import activity as crew_activity
        from crew import contract as crew_contract
        from crew import orchestrator

        if not tool_call_id:
            return
        existing = crew_activity.get_activity(conn, crew_activity.activity_id(tool_call_id))
        if existing is not None and existing.get("status") != "running":
            return
        event = crew_activity.upsert_activity(
            conn, tool_call_id=tool_call_id, thread_id=thread_id, turn_id=turn_id,
            tool_name=tool, args=args,
            status="failed" if failed else "completed",
            output=crew_activity.tool_result_text(result),
        )
        orchestrator.emit_event(crew_contract.activity_updated(event))
    except Exception:
        log.debug("crew: tool call not shown in the activity strip", exc_info=True)
