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
import threading
import time
import uuid
from dataclasses import dataclass
from typing import Any, Callable, Optional, Sequence

from crew import approvals as crew_approvals
from crew import computer as crew_computer
from crew import db as crew_db
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


# Who is mid-turn right now. Deliberately in-process and not persisted: a
# crashed or restarted process must not leave a teammate looking busy forever,
# and the truthful answer after a restart is "nobody is working", because
# nobody is. A counter rather than a set because a teammate can be running a
# DM turn and a group round at the same time.
_working: dict[str, int] = {}
_working_lock = threading.Lock()


def working_bot_ids() -> frozenset[str]:
    with _working_lock:
        return frozenset(bot_id for bot_id, depth in _working.items() if depth > 0)


def _mark_working(bot_id: str, delta: int) -> None:
    with _working_lock:
        depth = _working.get(bot_id, 0) + delta
        if depth > 0:
            _working[bot_id] = depth
        else:
            _working.pop(bot_id, None)


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


def _toolsets_for(bot_id: str, *, has_computer: bool) -> list[str]:
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
        enabled_toolsets=_toolsets_for(bot["id"], has_computer=has_computer),
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


def _profile_scope(bot_id: str):
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
    _mark_working(bot_id, +1)
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

    try:
        with _thread_lock(thread_id), _profile_scope(bot_id):
            computer_live = _prepare_computer(bot_id, want=has_computer(bot_id))
            agent = _get_agent(bot, thread_id, has_computer=computer_live, group=group)
            _attach_turn_callbacks(agent, context, reply)
            result = agent.run_conversation(
                user_message=text,
                task_id=crew_computer.task_id_for(bot_id),
            )

        final = ((result or {}).get("final_response") or "").strip()
        if not final and (result or {}).get("error"):
            final = f"⚠️ {bot['name']} hit an error: {result['error']}"
        _settle_reply(conn, reply, final)
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
        emit_status(bot_id, roster.teammate_status(conn, bot_id, working=bot_id in working_bot_ids()))


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

    start_turn_async(
        to_bot_id,
        target_thread,
        prompts.handoff_seed(from_name, from_bot_id, content),
        persist_user_message=False,
        hop=hop + 1,
    )
    return {"delivered": True, "to_name": target["name"]}


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
    """Ask the room, then let the chief close it.

    Members speak **sequentially**, non-chief first and the chief last. The
    order is the feature: each speaker's turn is a separate agent run reading
    the same thread, so everyone sees what was already said, and the chief has
    a full set of reports to build the dispatch table from. Running them in
    parallel would be faster and would produce four people answering the same
    question.
    """
    conn = crew_db.connect()
    thread = crew_db.get_thread(conn, thread_id)
    if thread is None:
        raise ValueError(f"No thread called {thread_id}.")

    if persist_user_message:
        crew_db.insert_message(
            conn, thread_id=thread_id, sender="user", kind="text", content=text
        )

    chief = roster.chief_id()
    members = [crew_db.get_bot(conn, bot_id) for bot_id in crew_db.thread_members(conn, thread_id)]
    members = [m for m in members if m]
    names = [m["name"] for m in members]
    speakers = [m for m in members if m["id"] != chief] + [m for m in members if m["id"] == chief]

    for index, bot in enumerate(speakers):
        seed = prompts.group_chief_seed(text) if bot["id"] == chief else prompts.group_member_seed(text)
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


def settle_approval(approval_id: int, decision: str) -> str:
    """Resolve an approval and resume the teammate. Returns a status token.

    ``"gone"`` — no such approval (404).
    ``"settled"`` — someone already decided it (409). **No turn is started**,
    which is what stops a double-clicked Approve from sending twice.
    ``"ok"`` — decided now; the teammate is resuming on a worker.
    """
    conn = crew_db.connect()
    if crew_approvals.get_approval(conn, approval_id) is None:
        return "gone"

    approval = crew_approvals.resolve_approval(conn, approval_id, decision)  # type: ignore[arg-type]
    if approval is None:
        return "settled"

    from crew import contract as crew_contract

    if approval["message_id"]:
        payload = {
            "approval_id": approval["id"],
            "action": approval["action"],
            "detail": approval["detail"],
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
        prompts.approved_seed(approval["action"])
        if decision == "approve"
        else prompts.discarded_seed(approval["action"])
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
