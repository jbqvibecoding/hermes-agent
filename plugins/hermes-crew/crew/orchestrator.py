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
    """

    bot_id: str
    thread_id: str
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


# Broadcast sink, installed by the dashboard plugin. Kept as a plain hook so
# the orchestrator is testable, and usable, with no web server running — a
# routine firing in the gateway process has no WebSocket to talk to and must
# still work.
StatusSink = Callable[[str, str], None]
_status_sink: Optional[StatusSink] = None


def set_status_sink(sink: Optional[StatusSink]) -> None:
    global _status_sink
    _status_sink = sink


def _emit_status(bot_id: str, state: str) -> None:
    if _status_sink is None:
        return
    try:
        _status_sink(bot_id, state)
    except Exception:
        log.debug("crew: status sink failed", exc_info=True)


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
    hop: int = 0,
    group: Optional[tuple[str, Sequence[str]]] = None,
) -> dict:
    """Run one turn for one teammate and return ``AIAgent``'s result dict.

    Synchronous by design: the HTTP layer answers 202 and calls this on a
    worker, so everything the operator sees arrives over the event stream. The
    caller is responsible for not blocking a request thread on it.
    """
    conn = crew_db.connect()
    bot = crew_db.get_bot(conn, bot_id)
    if bot is None:
        raise ValueError(f"No teammate called {bot_id}.")

    if persist_user_message:
        crew_db.insert_message(
            conn, thread_id=thread_id, sender="user", kind="text", content=text
        )

    context = TurnContext(
        bot_id=bot_id,
        thread_id=thread_id,
        hop=hop,
        group_title=group[0] if group else None,
    )
    token = _turn_context.set(context)
    _emit_status(bot_id, "thinking")
    try:
        with _thread_lock(thread_id), _profile_scope(bot_id):
            computer_live = _prepare_computer(bot_id, want=has_computer(bot_id))
            agent = _get_agent(bot, thread_id, has_computer=computer_live, group=group)
            result = agent.run_conversation(
                user_message=text,
                task_id=crew_computer.task_id_for(bot_id),
            )

        final = (result or {}).get("final_response") or ""
        if final.strip():
            crew_db.insert_message(
                conn, thread_id=thread_id, sender=bot_id, kind="text", content=final.strip()
            )
        elif (result or {}).get("error"):
            crew_db.insert_message(
                conn,
                thread_id=thread_id,
                sender=bot_id,
                kind="text",
                content=f"⚠️ {bot['name']} hit an error: {result['error']}",
            )
        return result or {}
    except Exception as exc:  # noqa: BLE001 — the thread must show what broke
        log.exception("crew: turn failed for %s in %s", bot_id, thread_id)
        crew_db.insert_message(
            conn,
            thread_id=thread_id,
            sender=bot_id,
            kind="text",
            content=f"⚠️ {bot['name']} hit an error: {exc}",
        )
        return {"error": str(exc)}
    finally:
        _turn_context.reset(token)
        _emit_status(bot_id, "idle")


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


def run_group_round(thread_id: str, text: str) -> None:
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

    crew_db.insert_message(conn, thread_id=thread_id, sender="user", kind="text", content=text)

    chief = roster.chief_id()
    members = [crew_db.get_bot(conn, bot_id) for bot_id in crew_db.thread_members(conn, thread_id)]
    members = [m for m in members if m]
    names = [m["name"] for m in members]
    speakers = [m for m in members if m["id"] != chief] + [m for m in members if m["id"] == chief]

    for bot in speakers:
        seed = prompts.group_chief_seed(text) if bot["id"] == chief else prompts.group_member_seed(text)
        start_turn(
            bot["id"],
            thread_id,
            seed,
            persist_user_message=False,
            group=(thread["title"], names),
        )


def run_group_round_async(thread_id: str, text: str) -> threading.Thread:
    ctx = contextvars.copy_context()
    thread = threading.Thread(
        target=ctx.run,
        args=(lambda: run_group_round(thread_id, text),),
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

    if approval["message_id"]:
        crew_db.update_message_payload(
            conn,
            approval["message_id"],
            {
                "approval_id": approval["id"],
                "action": approval["action"],
                "detail": approval["detail"],
                "status": approval["status"],
            },
        )

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
    """Route one typed message. Returns what the HTTP layer should report.

    Three shapes, in priority order: a bare 👍 releases the newest pending
    approval in this thread, a group thread runs a round, and anything else is
    a turn for that teammate.
    """
    conn = crew_db.connect()
    body = (text or "").strip()
    if not body:
        raise ValueError("Say something.")

    if crew_approvals.is_thumbs_up(body):
        pending = crew_approvals.latest_pending_approval(conn, thread_id)
        if pending is not None:
            outcome = settle_approval(int(pending["id"]), "approve")
            return {"ok": True, "approved": outcome == "ok", "approval_id": pending["id"]}

    if crew_db.is_group_thread(thread_id):
        run_group_round_async(thread_id, body)
        return {"ok": True, "group": True}

    bot_id = crew_db.bot_id_of_dm(thread_id)
    if not bot_id or crew_db.get_bot(conn, bot_id) is None:
        raise ValueError(f"No thread called {thread_id}.")
    start_turn_async(bot_id, thread_id, body)
    return {"ok": True}
