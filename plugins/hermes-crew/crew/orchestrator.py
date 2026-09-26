"""Turning a thread message into a Hermes agent turn.

This is the piece that makes the crew *Hermes's* crew rather than a second
agent framework living next door. It does not implement a tool loop, a model
client, history management, or compression — ``AIAgent`` already has all of
that, and it is the same loop the CLI, the TUI and every messaging platform
run. What this module owns is the four things a crew turn needs that a plain
agent turn does not:

1. **Profile scoping.** Every turn runs as one teammate, so ``HERMES_HOME`` and
   the secret scope are swapped to that teammate's profile for the duration —
   via the contextvars Hermes's own multiplexing gateway uses
   (``hermes_constants.set_hermes_home_override`` / ``agent.secret_scope``),
   which propagate into worker threads with ``copy_context()``.
2. **Agent reuse.** The agent instance is cached per thread. ``AGENTS.md``
   calls per-conversation prompt caching sacred: a fresh ``AIAgent`` per message
   rebuilds the system prompt and throws the cached prefix away, multiplying
   cost on exactly the long-running threads this product creates. Same reason
   ``gateway/run.py`` caches its agents per session.
3. **Its computer.** Container overrides and the browser's CDP binding are
   registered per turn, keyed on the teammate, so several teammates can work at
   once in one process without fighting over one container.
4. **Invisible seeds.** A routine firing, an approval being released, a
   colleague handing work over, a group round — all start turns the operator
   did not type. Those run with ``persist_user_message=False`` so the thread
   shows only what came back.
"""

from __future__ import annotations

import contextvars
import logging
import sqlite3
import threading
import time
import uuid
from dataclasses import dataclass
from typing import Any, Callable, Optional, Sequence

from crew import approvals as crew_approvals
from crew import computer as crew_computer
from crew import db as crew_db
from crew import handoffs as crew_handoffs
from crew import mentions as crew_mentions
from crew import presence as crew_presence
from crew import prompts, roster
from crew.a2a import HOP_LIMIT_MESSAGE, MAX_HOPS, can_message, deny_reason, parse_a2a_allow

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class TurnContext:
    """Who is speaking and where — read by the crew tools mid-turn.

    A contextvar rather than an argument because the tools are invoked by the
    agent loop, which knows nothing about the crew. This is the same shape
    ``tools/approval.py`` uses to carry the gateway session identity into tool
    dispatch, and for the same reason: turns run concurrently in executor
    threads, so a module-global would race.

    ``turn_id`` is minted per turn and is the root of the message ids this turn
    produces (``{turn_id}:user`` / ``{turn_id}:agent``). That convention is not
    cosmetic: the ported ``useCrewController`` reconciles optimistic bubbles
    against server messages by parsing exactly those shapes, so changing it
    silently breaks message identity in the UI.
    """

    bot_id: str
    thread_id: str
    turn_id: str = ""
    hop: int = 0
    group_title: Optional[str] = None


_turn_context: contextvars.ContextVar[Optional[TurnContext]] = contextvars.ContextVar(
    "crew_turn_context", default=None
)


def current_turn() -> Optional[TurnContext]:
    """The context this orchestrator set, or ``None`` outside a crew turn."""
    return _turn_context.get()


def resolve_turn() -> Optional[TurnContext]:
    """The context a crew tool should write into, including implicit ones.

    A turn started here carries an explicit context. But a **routine** runs in
    the gateway's cron process, and a teammate reached over Telegram or the CLI
    runs in yet another — neither goes through :func:`start_turn`, and both are
    still that teammate working. In those cases the active profile *is* the
    teammate, so its DM thread is unambiguously where its report belongs.

    Falling back rather than refusing is the right call: a routine that filed
    no report because it fired in the "wrong" process would look to the
    operator like a routine that silently stopped working.

    Returns ``None`` only when the active profile is not a teammate at all —
    someone enabled the ``crew`` toolset on an ordinary profile — and there
    genuinely is no thread to write to.
    """
    explicit = _turn_context.get()
    if explicit is not None:
        return explicit

    try:
        from hermes_cli.profiles import get_active_profile_name

        bot_id = get_active_profile_name() or ""
    except Exception:
        return None
    if not bot_id:
        return None

    conn = crew_db.connect()
    if crew_db.get_bot(conn, bot_id) is None:
        return None
    return TurnContext(bot_id=bot_id, thread_id=crew_db.ensure_dm_thread(conn, bot_id))


# Broadcast sinks, installed by the dashboard plugin. Kept as plain hooks so
# the orchestrator is testable, and usable, with no web server running — a
# routine firing in the gateway process has no WebSocket to talk to and must
# still work.
StatusSink = Callable[[str, str], None]
_status_sink: Optional[StatusSink] = None

#: Called with one ready-to-send event frame. Used for the transients that have
#: no durable row to tail: token deltas and stream boundaries.
EventSink = Callable[[dict], None]
_event_sink: Optional[EventSink] = None


def set_status_sink(sink: Optional[StatusSink]) -> None:
    global _status_sink
    _status_sink = sink


def set_event_sink(sink: Optional[EventSink]) -> None:
    global _event_sink
    _event_sink = sink


def emit_status(bot_id: str, state: str) -> None:
    if _status_sink is None:
        return
    try:
        _status_sink(bot_id, state)
    except Exception:
        log.debug("crew: status sink failed", exc_info=True)


def emit_event(event: dict) -> None:
    if _event_sink is None:
        return
    try:
        _event_sink(event)
    except Exception:
        log.debug("crew: event sink failed", exc_info=True)


def new_turn_id() -> str:
    """Mint the id every message and activity in one turn hangs off."""
    return f"turn_{uuid.uuid4().hex[:16]}"


# Who is mid-turn right now.
#
# This was a dict in this module's memory, and the comment defending that said
# a crashed process must not leave a teammate looking busy forever. True, and
# the fix it chose paid for it with the opposite error: the dashboard could
# only ever see turns the dashboard itself started, so a routine burning in
# the gateway read as **idle** — to a person deciding whether to interrupt it.
#
# `crew.presence` gets both properties by making busy a *lease*: it is in the
# database so every process can see it, and it expires on its own so a killed
# process stops claiming it. What is left here is the depth counter, which
# stays in memory because it is a property of this process: a teammate can be
# running a DM turn and a group round at once, and the claim belongs to the
# outermost one.
_working: dict[str, int] = {}
_leases: dict[str, "crew_presence.Lease"] = {}
_working_lock = threading.Lock()


def working_bot_ids(conn: Optional[sqlite3.Connection] = None) -> frozenset[str]:
    """Every teammate mid-turn anywhere, not just in this process."""
    try:
        return frozenset(crew_presence.working(conn or crew_db.connect()))
    except Exception:
        # The badge is not worth an exception on a roster read. Fall back to
        # what this process knows, which is what the whole roster used to be.
        log.debug("crew: could not read presence", exc_info=True)
        with _working_lock:
            return frozenset(bot_id for bot_id, depth in _working.items() if depth > 0)


def _mark_working(bot_id: str, delta: int, *, what: str = "", thread_id: str = "") -> None:
    """Enter or leave the working state, claiming the lease at the edges.

    Only the 0→1 and 1→0 transitions touch the database. A nested turn is the
    same teammate still working, and re-claiming would hand the row a new
    holder id that the outer turn's release then fails to match — leaving a
    claim to expire on its own when there is somebody right there to end it.
    """
    with _working_lock:
        before = _working.get(bot_id, 0)
        depth = before + delta
        if depth > 0:
            _working[bot_id] = depth
        else:
            _working.pop(bot_id, None)
        if (before > 0) == (depth > 0):
            return  # a nested turn, not an edge — the claim already stands

        # Both edges drop whatever was held: on the way up that can only be a
        # leftover from a turn that died without unwinding, and leaving its
        # renewal thread running would keep a claim alive for work that ended.
        lease = _leases.pop(bot_id, None)
        if lease is not None:
            lease.stop()
        if depth > 0:
            _leases[bot_id] = crew_presence.Lease(
                bot_id, what=what, thread_id=thread_id,
            ).start()


# ---------------------------------------------------------------------------
# Per-turn agent callbacks
#
# These are attached to the cached agent at the start of every turn rather than
# read from a contextvar inside the callback. Two reasons, both load-bearing:
# the agent instance is cached per thread and outlives any one turn, so a
# closure baked in at construction would report into the wrong turn; and the
# tool-completion callback can fire from a tool executor worker thread, where
# the turn contextvar may not have been propagated. Binding explicitly per turn
# sidesteps both.
# ---------------------------------------------------------------------------


#: How often an in-flight reply's accumulated text is written to SQLite.
#: The live text reaches the browser over the event stream, so the row only has
#: to be correct for whoever opens the thread *later* — persisting every token
#: would be one write per token for no reader.
_DELTA_PERSIST_INTERVAL_S = 0.5


def _attach_turn_callbacks(agent: Any, context: TurnContext, reply: Optional[dict] = None) -> None:
    from crew import activity as crew_activity

    def on_tool_start(tool_call_id: str, name: str, args: Any) -> None:
        try:
            event = crew_activity.upsert_activity(
                crew_db.connect(),
                tool_call_id=str(tool_call_id),
                thread_id=context.thread_id,
                turn_id=context.turn_id,
                tool_name=str(name),
                args=args,
                status="running",
            )
            emit_event({"type": "activity.updated", "activity": event})
        except Exception:
            log.debug("crew: tool start not recorded", exc_info=True)

    def on_tool_complete(tool_call_id: str, name: str, args: Any, result: Any) -> None:
        try:
            event = crew_activity.upsert_activity(
                crew_db.connect(),
                tool_call_id=str(tool_call_id),
                thread_id=context.thread_id,
                turn_id=context.turn_id,
                tool_name=str(name),
                args=args,
                status="failed" if crew_activity.looks_failed(result) else "completed",
                output=crew_activity.tool_result_text(result),
            )
            emit_event({"type": "activity.updated", "activity": event})
        except Exception:
            log.debug("crew: tool completion not recorded", exc_info=True)

    buffer: list[str] = []
    last_persist = [0.0]

    def on_delta(text: Optional[str]) -> None:
        # Hermes sends ``None`` to flush the stream before it runs tools
        # (agent/conversation_loop.py). That is exactly Errand's
        # ``message.completed {notify: false}``: the assistant turn was
        # interrupted by tool use, so the bubble blanks but keeps streaming.
        try:
            if text is None:
                buffer.clear()
                emit_event(
                    {
                        "type": "message.completed",
                        "messageId": f"{context.turn_id}:agent",
                        "threadId": context.thread_id,
                        "notify": False,
                    }
                )
                return
            if not text:
                return
            buffer.append(text)
            emit_event(
                {
                    "type": "message.delta",
                    "messageId": f"{context.turn_id}:agent",
                    "threadId": context.thread_id,
                    "delta": text,
                }
            )
            if reply is not None:
                now = time.monotonic()
                if now - last_persist[0] >= _DELTA_PERSIST_INTERVAL_S:
                    last_persist[0] = now
                    crew_db.update_message_text(
                        crew_db.connect(), int(reply["id"]), "".join(buffer), streaming=True
                    )
        except Exception:
            log.debug("crew: delta not forwarded", exc_info=True)

    agent.tool_start_callback = on_tool_start
    agent.tool_complete_callback = on_tool_complete
    agent.stream_delta_callback = on_delta


# ---------------------------------------------------------------------------
# Agent cache
# ---------------------------------------------------------------------------

_agents: dict[str, Any] = {}
_agents_lock = threading.Lock()
# One lock per thread id: two messages sent to the same teammate must queue
# behind each other (an agent instance is not re-entrant), while different
# teammates run in parallel.
_thread_locks: dict[str, threading.Lock] = {}
_thread_locks_guard = threading.Lock()


def _thread_lock(thread_id: str) -> threading.Lock:
    with _thread_locks_guard:
        lock = _thread_locks.get(thread_id)
        if lock is None:
            lock = _thread_locks[thread_id] = threading.Lock()
        return lock


def reset_agent(thread_id: str) -> None:
    """Drop the cached agent for a thread (model change, teammate fired)."""
    with _agents_lock:
        _agents.pop(thread_id, None)


def reset_all_agents() -> None:
    with _agents_lock:
        _agents.clear()


def _crew_config() -> dict:
    from hermes_cli.config import cfg_get, load_config_readonly

    cfg = cfg_get(load_config_readonly(), "crew", default={}) or {}
    return cfg if isinstance(cfg, dict) else {}


def a2a_rules():
    cfg = _crew_config()
    return parse_a2a_allow(str(cfg.get("a2a_allow") or ""), roster.chief_id())


def _resolve_model_and_runtime() -> tuple[str, dict]:
    """Resolve the model + provider credentials for the *currently scoped* profile.

    Must be called inside the HERMES_HOME override: both reads resolve their
    paths at call time, which is how one process serves teammates that use
    different models and different keys.
    """
    from hermes_cli.config import load_config_readonly
    from hermes_cli.runtime_provider import resolve_runtime_provider

    cfg = load_config_readonly()
    model_cfg = cfg.get("model") or {}
    if isinstance(model_cfg, str):
        model = model_cfg
    elif isinstance(model_cfg, dict):
        model = model_cfg.get("default") or model_cfg.get("model") or ""
    else:
        model = ""
    return str(model or ""), resolve_runtime_provider()


def toolsets_for(bot_id: str, *, has_computer: bool) -> list[str]:
    """Which toolsets this teammate's turn gets.

    ``crew`` is the product surface. The computer toolsets are added only when
    the teammate actually has one — the prompt tells it so either way, and a
    teammate offered a tool its container cannot serve burns the turn hunting
    for it.
    """
    from hermes_cli.config import load_config_readonly

    configured = load_config_readonly().get("toolsets")
    toolsets = [t for t in (configured or []) if isinstance(t, str)]
    if "crew" not in toolsets:
        toolsets.append("crew")
    if has_computer:
        for name in ("terminal", "files", "browser"):
            if name not in toolsets:
                toolsets.append(name)
    return toolsets


def _build_agent(bot: dict, thread_id: str, *, has_computer: bool, group: Optional[tuple]):
    from run_agent import AIAgent
    from hermes_state import SessionDB

    model, runtime = _resolve_model_and_runtime()
    profile_dir = roster.profile_dir(bot["id"])

    crew_prompt = prompts.build_crew_prompt(
        bot_name=bot["name"],
        role=bot["role"],
        has_computer=has_computer,
        can_relay=_can_relay(bot["id"]),
        group=group,
    )

    session_db = None
    try:
        session_db = SessionDB(db_path=profile_dir / "state.db")
    except Exception:
        # A teammate whose session store cannot be opened should still be able
        # to answer — it just will not remember this thread next restart.
        log.warning("crew: could not open state.db for %s", bot["id"], exc_info=True)

    return AIAgent(
        model=model,
        api_key=runtime.get("api_key"),
        base_url=runtime.get("base_url"),
        provider=runtime.get("provider"),
        api_mode=runtime.get("api_mode"),
        acp_command=runtime.get("command"),
        acp_args=runtime.get("args"),
        enabled_toolsets=toolsets_for(bot["id"], has_computer=has_computer),
        quiet_mode=True,
        verbose_logging=False,
        # SOUL.md is the teammate's identity and Hermes loads it itself; the
        # crew prompt only adds the behavioural contract on top. Memory stays
        # ON (unlike cron) — standing rules the operator gave this teammate are
        # exactly what must survive into every turn.
        load_soul_identity=True,
        skip_context_files=True,
        ephemeral_system_prompt=crew_prompt,
        platform="crew",
        chat_id=thread_id,
        chat_type="group" if group else "private",
        session_id=thread_id,
        session_db=session_db,
    )


def _can_relay(bot_id: str) -> bool:
    """Whether this teammate can reach anyone at all.

    Used to decide if the relay prompt block and the ``message_bot`` tool are
    worth showing. The chief always can; a peer only once a direction is
    allowlisted.
    """
    rules = a2a_rules()
    return bot_id == rules.chief_id or any(frm == bot_id for frm, _ in rules.pairs)


def _get_agent(bot: dict, thread_id: str, *, has_computer: bool, group: Optional[tuple]):
    # Group threads rebuild per round because membership (and therefore the
    # briefing) can change between rounds; DM threads are the long-lived ones
    # whose cache actually matters.
    if group is not None:
        return _build_agent(bot, thread_id, has_computer=has_computer, group=group)
    with _agents_lock:
        agent = _agents.get(thread_id)
    if agent is not None:
        return agent
    agent = _build_agent(bot, thread_id, has_computer=has_computer, group=group)
    with _agents_lock:
        _agents.setdefault(thread_id, agent)
        return _agents[thread_id]


# ---------------------------------------------------------------------------
# Running a turn
# ---------------------------------------------------------------------------


def profile_scope(bot_id: str):
    """Context manager scoping config, secrets and skills to a teammate."""
    import contextlib

    @contextlib.contextmanager
    def _scope():
        from hermes_constants import reset_hermes_home_override, set_hermes_home_override

        token = set_hermes_home_override(str(roster.profile_dir(bot_id)))
        secret_token = None
        try:
            try:
                from agent.secret_scope import (
                    build_profile_secret_scope,
                    is_multiplex_active,
                    set_secret_scope,
                )

                if is_multiplex_active():
                    secret_token = set_secret_scope(
                        build_profile_secret_scope(roster.profile_dir(bot_id))
                    )
            except Exception:
                # Secret scoping is only required when the process declared
                # itself a multiplexer. Outside that, os.environ is the scope
                # and this is a no-op by design.
                log.debug("crew: secret scope not applied for %s", bot_id, exc_info=True)
            yield
        finally:
            if secret_token is not None:
                try:
                    from agent.secret_scope import reset_secret_scope

                    reset_secret_scope(secret_token)
                except Exception:
                    pass
            reset_hermes_home_override(token)

    return _scope()


def _prepare_computer(bot_id: str, *, want: bool) -> bool:
    """Register the container overrides and bind the browser. Returns liveness.

    Never raises: a teammate whose Docker daemon is down should say so in
    prose, not crash the thread. It simply gets the no-computer briefing.
    """
    if not want:
        return False
    try:
        from tools.terminal_tool import register_task_env_overrides

        register_task_env_overrides(
            crew_computer.task_id_for(bot_id), crew_computer.terminal_overrides(bot_id)
        )
        endpoints = crew_computer.endpoints(bot_id)
        if endpoints.get("cdp_url"):
            crew_computer.bind_browser(bot_id, endpoints["cdp_url"])
        else:
            crew_computer.unbind_browser(bot_id)
        return True
    except Exception:
        log.warning("crew: could not prepare the computer for %s", bot_id, exc_info=True)
        return False


def has_computer(bot_id: str) -> bool:
    cfg = _crew_config()
    if cfg.get("computers") is False:
        return False
    from tools.environments.docker import find_docker

    return bool(find_docker())


def start_turn(
    bot_id: str,
    thread_id: str,
    text: str,
    *,
    persist_user_message: bool = True,
    turn_id: Optional[str] = None,
    hop: int = 0,
    group: Optional[tuple[str, Sequence[str]]] = None,
) -> dict:
    """Run one turn for one teammate and return ``AIAgent``'s result dict.

    Synchronous by design: the HTTP layer answers 202 and calls this on a
    worker, so everything the operator sees arrives over the event stream. The
    caller is responsible for not blocking a request thread on it.

    ``turn_id`` is normally minted here. The HTTP layer passes one in because
    ``sendMessage`` has to *return* the ``{turn}:user`` message before the
    worker starts — the client parses that id to learn which ``{turn}:agent``
    its optimistic reply bubble will become (``useCrewController``'s
    ``sendMessage``). Minting it on the worker would be a round-trip too late.
    """
    from crew import activity as crew_activity

    conn = crew_db.connect()
    bot = crew_db.get_bot(conn, bot_id)
    if bot is None:
        raise ValueError(f"No teammate called {bot_id}.")

    turn_id = turn_id or new_turn_id()

    if persist_user_message:
        crew_db.insert_message(
            conn,
            thread_id=thread_id,
            sender="user",
            kind="text",
            content=text,
            turn_id=turn_id,
            ext_id=f"{turn_id}:user",
        )

    context = TurnContext(
        bot_id=bot_id,
        thread_id=thread_id,
        turn_id=turn_id,
        hop=hop,
        group_title=group[0] if group else None,
    )
    token = _turn_context.set(context)
    _mark_working(
        bot_id, +1,
        # A label, not a state. "working" is what the badge already says; what
        # a person wants from the sidebar is which room it is working in.
        what=f"in {group[0]}" if group else "replying",
        thread_id=thread_id,
    )
    emit_status(bot_id, "working")

    # The reply row exists from the first moment so deltas have somewhere to
    # accumulate and the client has a stable id to stream into. It is empty and
    # `streaming` until the turn settles.
    #
    # Reserving the slot up front means the reply sits *above* any chip the
    # turn goes on to file. That is deliberate rather than tolerated: the
    # client appends its optimistic reply bubble at send time for the same
    # reason, so the live thread and a reloaded one agree. Ordering them the
    # other way would need the id before the row, which is the whole problem.
    reply = crew_db.insert_message(
        conn,
        thread_id=thread_id,
        sender=bot_id,
        kind="text",
        content="",
        turn_id=turn_id,
        ext_id=f"{turn_id}:agent",
        streaming=True,
    )

    started_at = crew_db.now_ms()
    try:
        with _thread_lock(thread_id), profile_scope(bot_id):
            computer_live = _prepare_computer(bot_id, want=has_computer(bot_id))
            agent = _get_agent(bot, thread_id, has_computer=computer_live, group=group)
            _attach_turn_callbacks(agent, context, reply)
            result = agent.run_conversation(
                user_message=text,
                task_id=crew_computer.task_id_for(bot_id),
            )
            if computer_live:
                result = _deliver(
                    agent, bot, context, result, started_at=started_at,
                )

        final, verdict = _judged_reply(conn, bot, context, reply, result)
        _settle_reply(conn, reply, final)
        _answer_handoff(conn, bot, context, final, verdict)
        if computer_live:
            _record_artifacts(conn, context, started_at)
        return result or {}
    except Exception as exc:  # noqa: BLE001 — the thread must show what broke
        log.exception("crew: turn failed for %s in %s", bot_id, thread_id)
        _settle_reply(conn, reply, f"⚠️ {bot['name']} hit an error: {exc}")
        return {"error": str(exc)}
    finally:
        # A tool left `running` because the turn died would spin in the UI
        # forever, reading as "still working" long after nothing is.
        for stale in crew_activity.interrupt_running(conn, turn_id):
            emit_event({"type": "activity.updated", "activity": stale})
        _turn_context.reset(token)
        _mark_working(bot_id, -1)
        # Not a hardcoded "idle": a teammate that ended its turn by holding an
        # action is waiting for a *person*, and announcing idle here would
        # repaint the sidebar grey the instant the amber badge was earned.
        emit_status(
            bot_id,
            roster.teammate_status(conn, bot_id, working=bot_id in working_bot_ids(conn)),
        )


#: How much extra wall time the delivery check may spend sending a turn back.
#: A pushback runs a whole turn, so this is a real cost — and a teammate that
#: has already been going for five minutes producing nothing is not one more
#: attempt away from producing something.
_DELIVERY_BUDGET_S = 180.0


def _deliver(agent, bot: dict, context: TurnContext, result: Optional[dict], *, started_at: int) -> dict:
    """Check the reply's delivery claims, and send the turn back if they are false.

    This runs inside the profile scope and the thread lock, on the same agent,
    so the pushback continues the same conversation rather than starting a cold
    one — the model still has the script it wrote and the error it hit.

    The seed goes in as a **user** turn. A system note would be advice; a user
    turn is the operator asking again, which is what actually moves a model that
    has decided it is finished. It is sent with the turn's own id so the reply
    row it produces replaces the first one rather than appending a second.
    """
    from crew import verify as crew_verify

    result = result or {}
    for attempt in range(1, crew_verify.MAX_PUSHBACKS + 1):
        final = (result.get("final_response") or "").strip()
        if not final:
            return result

        verdict = crew_verify.check_delivery(context.bot_id, final)
        if verdict.ok:
            return result

        spent = (crew_db.now_ms() - started_at) / 1000.0
        if spent + crew_verify.MIN_BUDGET_S > _DELIVERY_BUDGET_S:
            # Out of room. Say so in the thread rather than silently accepting
            # a claim we know is false — the operator would go looking for the
            # file otherwise, which is the failure this whole check exists to
            # prevent.
            log.info("crew: %s claimed files it did not produce; out of budget", context.bot_id)
            result["final_response"] = final + "\n\n" + _undelivered_note(verdict)
            return result

        log.info(
            "crew: sending %s's turn back — %s",
            context.bot_id, ", ".join(p.rel_path for p in verdict.problems),
        )
        _announce_pushback(agent, context, verdict, attempt)
        emit_status(context.bot_id, "working")
        result = agent.run_conversation(
            user_message=crew_verify.pushback_seed(verdict, attempt),
            task_id=crew_computer.task_id_for(context.bot_id),
        ) or {}

    # Two pushbacks and the claim is still false. Stop asking and tell the
    # truth on the thread: the alternative is a loop the operator pays for.
    final = (result.get("final_response") or "").strip()
    verdict = crew_verify.check_delivery(context.bot_id, final)
    if not verdict.ok:
        result["final_response"] = final + "\n\n" + _undelivered_note(verdict)
    return result


def _announce_pushback(agent, context: TurnContext, verdict, attempt: int) -> None:
    """Clear the answer that was wrong and say why, before asking again.

    Two things happen here, and both are about not confusing the person
    watching. The reply bubble is blanked through the same path Hermes uses
    when a turn is interrupted by tool use — otherwise the second answer
    streams in underneath the first and the operator reads a contradiction.
    And a line goes into the working strip, because a teammate that suddenly
    starts working again after it had clearly finished looks broken unless
    something says what happened.
    """
    from crew import activity as crew_activity
    from crew import contract as crew_contract
    from crew import verify as crew_verify

    try:
        if callable(getattr(agent, "stream_delta_callback", None)):
            agent.stream_delta_callback(None)
    except Exception:
        log.debug("crew: could not blank the reply before a pushback", exc_info=True)

    names = ", ".join(verdict.missing + verdict.empty)
    try:
        event = crew_activity.upsert_activity(
            crew_db.connect(),
            tool_call_id=f"{context.turn_id}:delivery:{attempt}",
            thread_id=context.thread_id,
            turn_id=context.turn_id,
            tool_name="delivery_check",
            args={"files": names},
            status="failed",
            output=(
                f"{names} was claimed but not produced — asking again "
                f"({attempt}/{crew_verify.MAX_PUSHBACKS})."
            ),
        )
        emit_event(crew_contract.activity_updated(event))
    except Exception:
        log.debug("crew: pushback not shown in the activity strip", exc_info=True)


def _spoke_otherwise(conn, reply: dict) -> bool:
    """Did this turn put anything in the thread besides the reply bubble?

    A teammate that filed a report, held an action for approval or sent a
    screenshot has delivered, and quite reasonably has nothing left to add in
    prose — ``_settle_reply`` drops the empty bubble on purpose. Judging the
    empty text as a dead turn would flag the most deliberate ending we have.
    """
    try:
        row = conn.execute(
            "SELECT COUNT(*) FROM messages WHERE turn_id = ? AND id != ?",
            (reply.get("turn_id") or "", int(reply["id"])),
        ).fetchone()
        return bool(row and row[0])
    except Exception:
        # Assume it did. The cost of being wrong this way is one missing
        # warning; the other way it is a warning on a turn that worked.
        log.debug("crew: could not count this turn's messages", exc_info=True)
        return True


def _judged_reply(
    conn, bot: dict, context: TurnContext, reply: dict, result: Optional[dict],
) -> tuple[str, Any]:
    """The bubble's text and the verdict behind it, once the run is judged.

    Both, because the caller needs the verdict too: an answer owed to another
    teammate must not carry a failure notice back as though it were the answer.
    Recomputing it there would mean a second `judge()` without the
    `spoke_otherwise` signal this one has.

    Until now this path read one signal — ``final_response`` came back
    non-empty — and settled the reply as an answer. Four endings produce text
    that is not an answer, and ``crew.verdict`` tells them apart from the
    fields the result was already carrying. A routine is mostly covered
    already — the host raises on ``failed`` / ``completed is False`` and calls
    an empty reply a failure before it reports the cron run, and
    ``on_cron_job_finished`` stores that. What it does not check is the last
    case, a turn that promised to carry on and called nothing; there the result
    dict never reaches this plugin, so that one stays uncovered for routines
    rather than being quietly claimed.

    **The teammate's text is never thrown away**, whatever the verdict. Even a
    failed turn's words are the best evidence of what went wrong, and replacing
    them with a warning leaves the operator holding a complaint about something
    they cannot read. What changes is that the warning goes *underneath*, so
    nothing here reads as an answer when it is not one.
    """
    from crew import verdict as crew_verdict

    result = result or {}
    verdict = crew_verdict.judge(result, spoke_otherwise=_spoke_otherwise(conn, reply))
    final = str(result.get("final_response") or "").strip()
    if verdict.ok:
        return final, verdict

    log.info("crew: %s's turn judged %s (%s)", context.bot_id, verdict.state, verdict.reason)
    _record_verdict(context.bot_id, verdict)
    if not final:
        return f"⚠️ {bot['name']}: {verdict.detail}", verdict
    return f"{final}\n\n{crew_verdict.note(verdict)}", verdict


def _record_verdict(bot_id: str, verdict) -> None:
    """Note on the task why its run ended the way it did.

    Only when a task is open — a typed question has the thread as its record,
    and there is nothing to write against. Failing here must not disturb the
    reply, which is why every error is swallowed: the thread already carries
    the honest version, and the task row is the redundant copy.
    """
    from crew import tasks as crew_tasks

    try:
        held = crew_tasks.current(bot_id)
        if held is None:
            return
        task_id, lease_id = held
        crew_tasks.checkpoint(crew_db.connect(), task_id, lease_id, {"error": verdict.detail})
    except Exception:
        log.debug("crew: could not record the verdict for %s", bot_id, exc_info=True)


def _undelivered_note(verdict) -> str:
    """The line the operator reads instead of going to look for a file.

    Addressed to the operator, not the teammate, and deliberately plain: it is
    the product admitting something did not work, which is worth more than a
    confident reply that wastes somebody's afternoon.
    """
    names = ", ".join(f"`{name}`" for name in (verdict.missing + verdict.empty))
    return f"⚠️ Checked the workspace: {names} was not actually produced."


def _record_artifacts(conn, context: TurnContext, started_at: int) -> None:
    """Pin whatever this turn left on disk to the thread that asked for it."""
    from crew import artifacts as crew_artifacts

    try:
        rows = crew_artifacts.record_turn_output(
            conn, context.bot_id, thread_id=context.thread_id,
            turn_id=context.turn_id, since_ms=started_at,
        )
    except Exception:
        log.debug("crew: could not record this turn's files", exc_info=True)
        return
    from crew import contract as crew_contract

    for row in rows:
        emit_event(crew_contract.artifact_created(row))


def _settle_reply(conn, reply: dict, final: str) -> None:
    """Finish the streaming reply row: write the text, clear the flag, announce.

    An empty final response is normal — a teammate that filed a report chip and
    had nothing left to say produces one. The row is deleted rather than left
    as an empty bubble, and the client is told to drop it.

    Two frames, and both are needed. ``message.updated`` carries the *text*:
    the row was created empty and finished with an UPDATE, so the rowid tail
    will never re-deliver it, and a provider that does not stream at all would
    otherwise leave the bubble blank forever. ``message.completed`` then clears
    the spinner and fires the notification.
    """
    from crew import contract as crew_contract

    if final:
        crew_db.update_message_text(conn, int(reply["id"]), final, streaming=False)
        emit_event(
            crew_contract.message_updated({**reply, "content": final, "streaming": False})
        )
        emit_event(
            {
                "type": "message.completed",
                "messageId": reply["ext_id"],
                "threadId": reply["thread_id"],
                "notify": True,
            }
        )
        return

    conn.execute("DELETE FROM messages WHERE id = ?", (int(reply["id"]),))
    conn.commit()
    emit_event(
        {
            "type": "message.dropped",
            "messageId": reply["ext_id"],
            "threadId": reply["thread_id"],
        }
    )


def start_turn_async(bot_id: str, thread_id: str, text: str, **kwargs) -> threading.Thread:
    """Run a turn on a worker thread with this context propagated.

    ``contextvars.copy_context()`` is not optional here: without it the worker
    starts with an empty context and loses the approval/session identity that
    ``tools/thread_context.py`` exists to carry, which downgrades dangerous
    command checks to their non-interactive auto-approve branch.
    """
    ctx = contextvars.copy_context()
    thread = threading.Thread(
        target=ctx.run,
        args=(lambda: start_turn(bot_id, thread_id, text, **kwargs),),
        name=f"crew-turn-{bot_id}",
        daemon=True,
    )
    thread.start()
    return thread


# ---------------------------------------------------------------------------
# Handoffs
# ---------------------------------------------------------------------------


def relay(from_bot_id: str, to_bot_id: str, content: str, hop: int) -> dict:
    """Hand a scoped task to a teammate. Returns ``{delivered, reason?, to_name?}``.

    Deliberately **not** awaited: the teammate handing work off has finished
    its part, and blocking it until the recipient finishes would serialise the
    crew into one worker. The chip lands in the recipient's thread immediately
    so the operator sees the handoff before the work is done.
    """
    if hop >= MAX_HOPS:
        return {"delivered": False, "reason": HOP_LIMIT_MESSAGE}

    rules = a2a_rules()
    if not can_message(rules, from_bot_id, to_bot_id):
        return {"delivered": False, "reason": deny_reason(rules, from_bot_id, to_bot_id)}

    conn = crew_db.connect()
    target = crew_db.get_bot(conn, to_bot_id)
    if target is None:
        return {"delivered": False, "reason": f"There is no teammate called {to_bot_id}."}
    sender = crew_db.get_bot(conn, from_bot_id)
    from_name = sender["name"] if sender else from_bot_id

    target_thread = crew_db.ensure_dm_thread(conn, to_bot_id)
    crew_db.insert_message(
        conn,
        thread_id=target_thread,
        sender=from_bot_id,
        kind="bot_ref",
        payload={"from": from_bot_id, "from_name": from_name, "content": content},
    )

    # Recorded *before* the turn starts, because the turn may settle on
    # another thread before this function returns and it has to find the row.
    crew_handoffs.record(
        conn,
        from_bot_id=from_bot_id,
        to_bot_id=to_bot_id,
        from_thread_id=crew_db.dm_thread_id(from_bot_id),
        ask=content,
        hop=hop + 1,
    )

    start_turn_async(
        to_bot_id,
        target_thread,
        prompts.handoff_seed(from_name, from_bot_id, content),
        persist_user_message=False,
        hop=hop + 1,
    )
    return {"delivered": True, "to_name": target["name"]}


def _answer_handoff(conn, bot: dict, context: TurnContext, final: str, verdict) -> None:
    """If this turn owed somebody an answer, take it back to them.

    Called once a turn has settled, so ``final`` is the text the operator can
    actually see — which is the text worth carrying back. A teammate that
    answered by filing chips and saying nothing has produced something for its
    own thread and nothing quotable for anybody else's.

    Failures are swallowed. The answer is already in the receiver's thread; not
    managing to echo it is worse than the status quo by nothing at all, and
    taking a turn down over it would lose the work.
    """
    try:
        owed = crew_handoffs.pending_for(conn, context.bot_id)
        if owed is None:
            return
        if not crew_handoffs.close(conn, owed["id"]):
            return                      # somebody else's turn already took it

        asker = crew_db.get_bot(conn, owed["from_bot_id"])
        if asker is None:
            return

        # The *verdict*, not just the text. A turn that ended badly still
        # settles a bubble — F5 puts the teammate's own words in it with a
        # warning underneath — and carrying that back would hand the asker a
        # failure notice dressed as an answer.
        answer = (final or "").strip() if verdict.deliverable else ""
        if not answer:
            # Nothing to re-ask with. Close the loop visibly rather than
            # inventing a round: a chip costs nothing and "Scout came back
            # with nothing" is a fact, where a model turn spent narrating an
            # absence is a fabricated answer.
            crew_db.insert_message(
                conn,
                thread_id=owed["from_thread_id"],
                sender=context.bot_id,
                kind="bot_ref",
                payload={
                    "from": context.bot_id, "from_name": bot["name"],
                    "content": f"Came back with nothing on: {owed['ask']}",
                },
            )
            return

        if int(owed["hop"]) >= MAX_HOPS:
            # The dispatch spent the budget. Leave the answer where it is
            # rather than starting a turn that `relay` would have refused.
            log.info("crew: not carrying %s's answer back — hop limit", context.bot_id)
            return

        start_turn_async(
            owed["from_bot_id"],
            owed["from_thread_id"],
            prompts.handoff_return_seed(bot["name"], context.bot_id, owed["ask"], answer),
            persist_user_message=False,
            hop=int(owed["hop"]) + 1,
        )
    except Exception:
        log.debug("crew: could not carry an answer back to the asker", exc_info=True)


# ---------------------------------------------------------------------------
# Group rounds
# ---------------------------------------------------------------------------


def run_group_round(
    thread_id: str,
    text: str,
    *,
    turn_id: str = "",
    persist_user_message: bool = True,
) -> None:
    """Ask whoever was addressed, then let the chief close an open round.

    Members speak **sequentially**, non-chief first and the chief last. The
    order is the feature: each speaker's turn is a separate agent run reading
    the same thread, so everyone sees what was already said, and the chief has
    a full set of reports to build the dispatch table from. Running them in
    parallel would be faster and would produce four people answering the same
    question.

    Addressing somebody by name narrows that to them. Before this, "@Ada can
    you check the deploy?" ran four agent turns and produced three answers
    nobody asked for, which is both the cost of four model runs and the reason
    group threads got quiet — a room where every question summons everyone is
    a room people stop asking questions in.
    """
    conn = crew_db.connect()
    thread = crew_db.get_thread(conn, thread_id)
    if thread is None:
        raise ValueError(f"No thread called {thread_id}.")

    chief = roster.chief_id()
    members = [crew_db.get_bot(conn, bot_id) for bot_id in crew_db.thread_members(conn, thread_id)]
    members = [m for m in members if m]
    names = [m["name"] for m in members]
    speakers, addressed = crew_mentions.speakers_for(text, members, chief_id=chief)

    if persist_user_message:
        crew_db.insert_message(
            conn, thread_id=thread_id, sender="user", kind="text", content=text,
            # Stamped here and never derived again. Everything downstream — who
            # answers, and whatever a client wants to highlight — reads this
            # list, so there is exactly one answer to "who was this for" and no
            # way for two parsers to drift apart on it.
            payload={"mentions": addressed} if addressed else None,
        )

    for index, bot in enumerate(speakers):
        if addressed:
            seed = prompts.group_addressed_seed(text, bot["name"], others=len(speakers) > 1)
        elif bot["id"] == chief:
            seed = prompts.group_chief_seed(text)
        else:
            seed = prompts.group_member_seed(text)
        start_turn(
            bot["id"],
            thread_id,
            seed,
            persist_user_message=False,
            # Only the first speaker inherits the caller's turn. The client is
            # holding one optimistic reply bubble keyed on `{turn}:agent`, so
            # exactly one reply has to claim it; everyone after that is a new
            # message arriving in the room, which is what a group round looks
            # like anyway.
            turn_id=turn_id if index == 0 else None,
            group=(thread["title"], names),
        )


def run_group_round_async(thread_id: str, text: str, **kwargs) -> threading.Thread:
    ctx = contextvars.copy_context()
    thread = threading.Thread(
        target=ctx.run,
        args=(lambda: run_group_round(thread_id, text, **kwargs),),
        name=f"crew-group-{thread_id}",
        daemon=True,
    )
    thread.start()
    return thread


# ---------------------------------------------------------------------------
# Approvals
# ---------------------------------------------------------------------------


def settle_approval(
    approval_id: int, decision: str, *, expect_hash: str = "", note: str = ""
) -> str:
    """Resolve an approval and resume the teammate. Returns a status token.

    ``"gone"`` — no such approval (404).
    ``"settled"`` — someone already decided it, or it lapsed unanswered (409).
    **No turn is started**, which is what stops a double-clicked Approve from
    sending twice.
    ``"stale"`` — the card changed since the operator opened it (409). Nothing
    is decided: approving something other than what you read is the one failure
    this whole mechanism exists to prevent.
    ``"ok"`` — decided now; the teammate is resuming on a worker.
    """
    conn = crew_db.connect()
    if crew_approvals.get_approval(conn, approval_id) is None:
        return "gone"

    try:
        approval = crew_approvals.resolve_approval(
            conn, approval_id, decision, expect_hash=expect_hash, note=note  # type: ignore[arg-type]
        )
    except crew_approvals.StaleApproval:
        return "stale"
    if approval is None:
        return "settled"

    from crew import audit as crew_audit
    from crew import contract as crew_contract

    crew_audit.record(
        conn,
        event_type="approval.decided",
        bot_id=approval["bot_id"],
        actor=crew_audit.ACTOR_OPERATOR,
        thread_id=approval["thread_id"],
        turn_id=approval.get("turn_id") or "",
        tool_call_id=approval.get("tool_call_id") or "",
        tool=approval.get("tool") or "",
        subject=approval["action"],
        detail=note,
        status=approval["status"],
    )

    if approval["message_id"]:
        payload = {
            "approval_id": approval["id"],
            "ref": approval.get("ref"),
            "action": approval["action"],
            "detail": approval["detail"],
            "scope": approval.get("scope") or [],
            "status": approval["status"],
        }
        crew_db.update_message_payload(conn, approval["message_id"], payload)
        # Same reason as _settle_reply: rewriting a payload in place is an
        # UPDATE, which the rowid tail cannot see. Without this the chip stays
        # on "Waiting for you" until the operator reloads the thread.
        chip = crew_db.get_message(conn, int(approval["message_id"]))
        if chip is not None:
            emit_event(crew_contract.message_updated(chip))

    emit_event(crew_contract.approval_updated(approval))

    crew_db.insert_message(
        conn,
        thread_id=approval["thread_id"],
        sender="user",
        kind="approval_resolved",
        payload={
            "approval_id": approval["id"],
            "action": approval["action"],
            "status": approval["status"],
        },
    )

    seed = (
        prompts.approved_seed(approval["action"], note)
        if decision == "approve"
        else prompts.discarded_seed(approval["action"], note)
    )
    start_turn_async(
        approval["bot_id"], approval["thread_id"], seed, persist_user_message=False
    )
    return "ok"


# ---------------------------------------------------------------------------
# Inbound dispatch
# ---------------------------------------------------------------------------


def handle_user_message(thread_id: str, text: str) -> dict:
    """Route one typed message. Returns the **persisted user message row**.

    Three shapes, in priority order: a bare 👍 releases the newest pending
    approval in this thread, a group thread runs a round, and anything else is
    a turn for that teammate.

    All three persist the operator's words first and hand back that row, and
    the turn id is minted here rather than on the worker. Both are required by
    the client: it shows an optimistic bubble the instant Enter is pressed and
    reconciles it against the returned id, reading ``{turn}`` out of
    ``{turn}:user`` to know which ``{turn}:agent`` its reply bubble becomes.
    A 202 with no message would leave that bubble unclaimed, and it would
    vanish on the next snapshot refresh — including for 👍, which used to
    persist nothing at all.

    The thread is validated *before* the insert so a bad id cannot leave an
    orphan row in a thread nobody will ever open.
    """
    conn = crew_db.connect()
    body = (text or "").strip()
    if not body:
        raise ValueError("Say something.")

    is_group = crew_db.is_group_thread(thread_id)
    bot_id = crew_db.bot_id_of_dm(thread_id)
    if is_group:
        if crew_db.get_thread(conn, thread_id) is None:
            raise ValueError(f"No thread called {thread_id}.")
    elif not bot_id or crew_db.get_bot(conn, bot_id) is None:
        raise ValueError(f"No thread called {thread_id}.")

    turn_id = new_turn_id()
    message = crew_db.insert_message(
        conn,
        thread_id=thread_id,
        sender="user",
        kind="text",
        content=body,
        turn_id=turn_id,
        ext_id=f"{turn_id}:user",
    )

    if crew_approvals.is_thumbs_up(body):
        pending = crew_approvals.latest_pending_approval(conn, thread_id)
        if pending is not None:
            # The continuation turn mints its own id — it is a different turn,
            # started by the decision rather than by these two characters.
            settle_approval(int(pending["id"]), "approve")
            return message

    if is_group:
        run_group_round_async(thread_id, body, turn_id=turn_id, persist_user_message=False)
        return message

    start_turn_async(
        bot_id, thread_id, body, turn_id=turn_id, persist_user_message=False
    )
    return message
