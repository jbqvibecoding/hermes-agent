"""Unified Memory Provider — one memory mechanism fusing six systems.

Bridges Hermes to the hindsight-unified sidecar, which composes:
  Hindsight (retrieval/storage brain), EverOS (md-as-truth substrate),
  mempalace (verbatim + AAAK triage), OpenViking (tiered context assembly),
  MemOS (MemCube portability), and the tencentdb L0->L3 pipeline shape.

The provider is a thin stdlib HTTP client + supervisor; all heavy lifting
happens in the sidecar. Reliability engineering (circuit breaker, resurrect
throttle, watchdog, bounded sync threads) is inherited from the
memory_tencentdb provider, which pioneered this pattern.

Config via environment variables:
  UNIFIED_MEMORY_GATEWAY_HOST — sidecar host (default: 127.0.0.1)
  UNIFIED_MEMORY_GATEWAY_PORT — sidecar port (default: 8766)
  UNIFIED_MEMORY_SIDECAR_CMD  — command to start the sidecar (optional; if
                                unset, auto-discovers the hindsight-unified
                                package or a hindsight/ checkout)
  UNIFIED_MEMORY_HOME         — sidecar data root (default: $HERMES_HOME/unified)
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
import uuid
from collections import deque
from dataclasses import dataclass
from typing import Any, Deque, Dict, List, Optional

from agent.memory_provider import MemoryProvider

from .client import UnifiedMemoryClient
from .supervisor import DEFAULT_HOST, DEFAULT_PORT, SidecarSupervisor

logger = logging.getLogger(__name__)

# Circuit breaker: after N consecutive failures, pause API calls.
_BREAKER_THRESHOLD = 5
_BREAKER_COOLDOWN_SECS = 60

# Minimum seconds between two consecutive ensure_running() attempts triggered
# by in-flight request failures. Smaller than the breaker cooldown so revival
# can happen within a breaker-open window; larger than a failed health wait so
# attempts never overlap.
_RECOVER_COOLDOWN_SECS = 15

# Background sync thread limits (bounded backpressure).
_MAX_INFLIGHT_SYNCS = 4
_SYNC_JOIN_TIMEOUT_SECS = 5.0
_SHUTDOWN_JOIN_TIMEOUT_SECS = 5.0

# Turns that could not be delivered wait here and are retried in order. Each
# carries the idempotency key it was first sent with, so a retry of a request
# that in fact landed (it timed out client-side after the sidecar wrote it) is
# recognised and not written twice. Bounded, so a sidecar that stays down
# cannot grow the agent's memory without limit.
_MAX_PENDING_TURNS = 256

# Watchdog cadence — the only mechanism that recovers from "sidecar died while
# no requests were in flight" and the stuck-unavailable state.
_WATCHDOG_INTERVAL_SECS = 10.0
_WATCHDOG_SHUTDOWN_TIMEOUT_SECS = 2.0


def _resolve_port(default: int = DEFAULT_PORT) -> int:
    raw = os.environ.get("UNIFIED_MEMORY_GATEWAY_PORT")
    if raw is None or not raw.strip():
        return default
    try:
        port = int(raw.strip())
    except ValueError:
        logger.warning("Invalid UNIFIED_MEMORY_GATEWAY_PORT=%r; using %d", raw, default)
        return default
    if not (1 <= port <= 65535):
        logger.warning("UNIFIED_MEMORY_GATEWAY_PORT=%d out of range; using %d", port, default)
        return default
    return port


def _resolve_host(default: str = DEFAULT_HOST) -> str:
    raw = os.environ.get("UNIFIED_MEMORY_GATEWAY_HOST")
    if raw is None:
        return default
    host = raw.strip()
    return host or default


_DEFAULT_SEARCH_LIMIT = 5
_MAX_SEARCH_LIMIT = 20


def _coerce_limit(
    raw: Any,
    *,
    default: int = _DEFAULT_SEARCH_LIMIT,
    maximum: int = _MAX_SEARCH_LIMIT,
) -> int:
    """Coerce a tool-call ``limit`` arg into a valid int in ``[1, maximum]``.

    LLM tool calls regularly ignore JSON-Schema types (strings, floats, None,
    bools); fall back to the default instead of surfacing a ValueError.
    """
    if raw is None or raw == "":
        return default
    if isinstance(raw, bool):
        return default
    try:
        value = int(float(raw))
    except (TypeError, ValueError):
        logger.warning("unified-memory: ignoring invalid limit=%r; using %d", raw, default)
        return default
    return max(1, min(value, maximum))


# ---------------------------------------------------------------------------
# Tool schemas
# ---------------------------------------------------------------------------

MEMORY_SEARCH_SCHEMA = {
    "name": "unified_memory_search",
    "description": (
        "Search the user's long-term memory (extracted facts, entities, and "
        "observations fused from all memory layers). Use this to recall the "
        "user's preferences, past events, instructions, or context from "
        "previous conversations. Returns relevant memories ranked by fused "
        "relevance across semantic, keyword, graph, and temporal retrieval."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "What you want to recall about the user or past sessions.",
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of results (default: 5, max: 20).",
            },
            "type": {
                "type": "string",
                "enum": ["world", "experience", "observation"],
                "description": "Optional fact-type filter.",
            },
        },
        "required": ["query"],
    },
}

CONVERSATION_SEARCH_SCHEMA = {
    "name": "unified_conversation_search",
    "description": (
        "Search verbatim past conversation history (the user's exact words, "
        "never summarized). Use when unified_memory_search lacks the detail "
        "you need, or when the user's exact phrasing matters."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "What conversation content you want to find.",
            },
            "limit": {
                "type": "integer",
                "description": "Maximum number of turns to return (default: 5, max: 20).",
            },
        },
        "required": ["query"],
    },
}

REFLECT_SCHEMA = {
    "name": "unified_memory_reflect",
    "description": (
        "Ask the memory system to reason over everything it knows and "
        "synthesize an answer (persona-level reflection). Slower than search; "
        "use for questions that need combining many memories, e.g. 'what does "
        "the user value in code reviews?'"
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "The question to reflect on.",
            },
        },
        "required": ["query"],
    },
}


@dataclass(frozen=True)
class _PendingTurn:
    """One turn awaiting delivery, with the key that makes its retry safe."""

    user: str
    assistant: str
    session_key: str
    idempotency_key: str


# ---------------------------------------------------------------------------
# MemoryProvider implementation
# ---------------------------------------------------------------------------

class UnifiedMemoryProvider(MemoryProvider):
    """Unified six-system memory via the hindsight-unified sidecar."""

    def __init__(self):
        self._supervisor: Optional[SidecarSupervisor] = None
        self._client: Optional[UnifiedMemoryClient] = None
        self._session_id = ""
        self._user_id = ""
        self._bank = "default"
        self._sidecar_available = False
        self._initialized = False
        # Whether this agent may write to memory at all (see initialize()).
        self._write_enabled = True

        # Background sync threads (bounded, tracked for shutdown joins).
        self._sync_lock = threading.Lock()
        self._active_syncs: List[threading.Thread] = []

        # Undelivered turns, oldest first, and a lock so only one thread
        # drains them at a time (a drain must not reorder or double-send).
        self._pending: Deque[_PendingTurn] = deque()
        self._pending_lock = threading.Lock()
        self._drain_lock = threading.Lock()
        self._dropped_turns = 0

        # Circuit breaker.
        self._consecutive_failures = 0
        self._breaker_open_until = 0.0

        # Recovery state. -inf so the first attempt always passes the throttle
        # (monotonic() may start near zero on some platforms).
        self._recover_lock = threading.Lock()
        self._last_recover_attempt = float("-inf")

        # Watchdog.
        self._watchdog_thread: Optional[threading.Thread] = None
        self._watchdog_stop = threading.Event()

    # -- Properties -----------------------------------------------------------

    @property
    def name(self) -> str:
        return "unified"

    # -- Circuit breaker ------------------------------------------------------

    def _is_breaker_open(self) -> bool:
        if self._consecutive_failures < _BREAKER_THRESHOLD:
            return False
        if time.monotonic() >= self._breaker_open_until:
            self._consecutive_failures = 0
            return False
        return True

    def _record_success(self):
        self._consecutive_failures = 0

    def _record_failure(self):
        self._consecutive_failures += 1
        if self._consecutive_failures >= _BREAKER_THRESHOLD:
            self._breaker_open_until = time.monotonic() + _BREAKER_COOLDOWN_SECS
            logger.warning(
                "unified-memory circuit breaker tripped after %d failures. Pausing for %ds.",
                self._consecutive_failures, _BREAKER_COOLDOWN_SECS,
            )

    # -- Sidecar auto-resurrect ------------------------------------------------

    def _try_recover_sidecar(self, *, bypass_cooldown: bool = False) -> bool:
        """Best-effort re-probe / re-launch of the sidecar.

        Guarantees: never raises; never blocks a losing thread (non-blocking
        lock acquire); throttled unless the watchdog opts out; refuses to run
        after shutdown(); on success resets breaker + reattaches client.
        """
        supervisor = self._supervisor
        if supervisor is None:
            return False

        if not bypass_cooldown:
            now = time.monotonic()
            if now - self._last_recover_attempt < _RECOVER_COOLDOWN_SECS:
                return False

        if not self._recover_lock.acquire(blocking=False):
            return False

        try:
            supervisor = self._supervisor
            if supervisor is None:
                return False
            if not bypass_cooldown:
                now = time.monotonic()
                if now - self._last_recover_attempt < _RECOVER_COOLDOWN_SECS:
                    return False

            if supervisor.is_running():
                logger.info("unified-memory sidecar reachable again; restoring provider state.")
                ok = True
            else:
                logger.warning("unified-memory sidecar appears down; attempting to resurrect.")
                ok = supervisor.ensure_running()

            self._last_recover_attempt = time.monotonic()

            if ok:
                self._client = supervisor.client
                self._sidecar_available = True
                self._consecutive_failures = 0
                self._breaker_open_until = 0.0
                logger.info("unified-memory sidecar recovery succeeded.")
                return True

            logger.warning(
                "unified-memory sidecar recovery failed; will retry no sooner than %ds.",
                _RECOVER_COOLDOWN_SECS,
            )
            return False
        except Exception as e:
            self._last_recover_attempt = time.monotonic()
            logger.warning("unified-memory sidecar recovery raised: %s", e)
            return False
        finally:
            self._recover_lock.release()

    # -- Watchdog & lazy probe -------------------------------------------------

    def _ensure_alive_for_request(self) -> bool:
        """Lazy probe so request paths can self-heal a stuck-unavailable state."""
        if self._sidecar_available:
            return True
        if self._is_breaker_open():
            return False
        self._try_recover_sidecar()
        return self._sidecar_available

    def _start_watchdog(self) -> None:
        if self._watchdog_thread is not None and self._watchdog_thread.is_alive():
            return
        self._watchdog_stop.clear()
        thread = threading.Thread(
            target=self._watchdog_loop, daemon=True, name="unified-memory-watchdog",
        )
        self._watchdog_thread = thread
        thread.start()

    def _watchdog_loop(self) -> None:
        logger.debug("unified-memory watchdog started (interval=%.1fs)", _WATCHDOG_INTERVAL_SECS)
        while not self._watchdog_stop.wait(timeout=_WATCHDOG_INTERVAL_SECS):
            try:
                supervisor = self._supervisor
                if supervisor is None:
                    break
                if self._sidecar_available and supervisor.is_process_alive():
                    self._drain_if_pending()
                    continue
                healthy = False
                try:
                    healthy = supervisor.is_running()
                except Exception as e:
                    logger.debug("unified-memory watchdog health probe raised: %s", e)
                if healthy:
                    if not self._sidecar_available:
                        logger.info(
                            "unified-memory watchdog: sidecar reachable; restoring provider state."
                        )
                        self._client = supervisor.client
                        self._sidecar_available = True
                        self._consecutive_failures = 0
                        self._breaker_open_until = 0.0
                    # Turns held while it was away go out now, in order.
                    self._drain_if_pending()
                    continue
                logger.warning("unified-memory watchdog: sidecar unreachable; attempting resurrect.")
                self._try_recover_sidecar(bypass_cooldown=True)
            except Exception as e:
                logger.warning("unified-memory watchdog iteration raised (continuing): %s", e)
        logger.debug("unified-memory watchdog exiting")

    def _stop_watchdog(self) -> None:
        self._watchdog_stop.set()
        thread = self._watchdog_thread
        self._watchdog_thread = None
        if thread is None:
            return
        thread.join(timeout=_WATCHDOG_SHUTDOWN_TIMEOUT_SECS)

    # -- Core lifecycle ---------------------------------------------------------

    def is_available(self) -> bool:
        """Config/deps check only — no blocking network calls unless unconfigured."""
        if os.environ.get("UNIFIED_MEMORY_SIDECAR_CMD"):
            return True
        if os.environ.get("UNIFIED_MEMORY_GATEWAY_PORT"):
            return True
        # The sidecar package importable locally means we can always launch it.
        try:
            import hindsight_unified  # noqa: F401
            return True
        except Exception:
            pass
        from .supervisor import discover_sidecar_cmd
        if discover_sidecar_cmd():
            return True
        # Last resort: is one already running on the default address?
        client = UnifiedMemoryClient(
            base_url=f"http://{_resolve_host()}:{_resolve_port()}", timeout=2,
        )
        try:
            result = client.health(timeout=2)
            return result.get("status") in ("ok", "degraded")
        except Exception:
            return False

    def initialize(self, session_id: str, **kwargs) -> None:
        """Start or connect to the sidecar (in the background — never blocks
        agent startup)."""
        self._session_id = session_id
        self._user_id = kwargs.get("user_id", "") or "default"
        # The MemoryProvider contract: "Providers should skip writes for
        # non-primary contexts (cron system prompts would corrupt user
        # representations)". Hermes currently isolates cron, subagents and
        # background review one level up (skip_memory=True), so this guard is
        # not what keeps them out today - it is what keeps them out if that
        # ever changes, or if this provider runs under a host that relies on
        # the contract alone. Recall stays enabled either way.
        agent_context = str(kwargs.get("agent_context", "") or "primary")
        self._write_enabled = agent_context == "primary"
        if not self._write_enabled:
            logger.info("unified memory: read-only for agent_context=%s", agent_context)
        # Bank = stable per-identity namespace, NOT per-session: memory must
        # accumulate across sessions. agent_identity (profile) wins, then
        # workspace, then user.
        identity = (
            kwargs.get("agent_identity", "")
            or kwargs.get("agent_workspace", "")
            or self._user_id
        )
        self._bank = f"hermes-{identity}" if identity else "hermes-default"

        host = _resolve_host()
        port = _resolve_port()
        self._supervisor = SidecarSupervisor(host=host, port=port)
        self._initialized = True

        def _background_start():
            try:
                available = self._supervisor.ensure_running()
                if available:
                    self._client = self._supervisor.client
                    self._sidecar_available = True
                    logger.info(
                        "unified memory sidecar ready (background start, %s:%d)", host, port,
                    )
                else:
                    logger.warning(
                        "unified memory sidecar not available after background start. "
                        "Memory features disabled until it is reachable. Set "
                        "UNIFIED_MEMORY_SIDECAR_CMD or install hindsight-unified."
                    )
            except Exception as e:
                logger.warning("unified memory background start failed (non-fatal): %s", e)

        if self._supervisor.is_running():
            self._client = self._supervisor.client
            self._sidecar_available = True
            logger.info("unified memory sidecar already running (%s:%d)", host, port)
        else:
            threading.Thread(
                target=_background_start, daemon=True, name="unified-memory-init",
            ).start()

        # Watchdog runs regardless of initial outcome so a late external fix
        # is picked up without restarting Hermes.
        self._start_watchdog()

    def system_prompt_block(self) -> str:
        if not self._sidecar_available:
            return ""
        return (
            "# Unified Memory\n"
            f"Active. Bank: {self._bank}.\n"
            "Layered long-term memory: verbatim conversation log (markdown truth), "
            "fact/entity/temporal extraction, consolidation, and persona reflection, "
            "fused from semantic + keyword + graph + temporal retrieval.\n"
            "Tools: unified_memory_search (facts), unified_conversation_search "
            "(exact past words), unified_memory_reflect (synthesized reasoning)."
        )

    # One line, injected only when memory could not be consulted at all, so the
    # model does not mistake "I could not look" for "there is nothing".
    # Deliberately NOT emitted for a structurally degraded sidecar (no semantic
    # brain installed): that is the default zero-dependency deployment, and
    # noting it on every empty turn would be permanent prompt noise. It is
    # already stated once in system_prompt_block().
    _UNAVAILABLE_NOTE = (
        "## Unified Memory\n"
        "Unavailable this turn (the memory service could not be reached), so no "
        "past context was retrieved. Treat this as unknown, not as absent."
    )

    def prefetch(self, query: str, *, session_id: str = "") -> str:
        """Synchronous recall — inject fused memory context for this turn."""
        if not query:
            return ""
        if not self._ensure_alive_for_request() or not self._client:
            return self._UNAVAILABLE_NOTE
        try:
            result = self._client.recall(
                query=query,
                bank=self._bank,
                # The conversation, not the bank: the sidecar folds this
                # session's last turns into the query to resolve follow-ups
                # like "and the other one?". Keyed by bank, that was the
                # bank's last turns from whichever conversation wrote them.
                session_key=session_id or self._session_id,
                user_id=self._user_id,
            )
            context = result.get("context", "")
            self._record_success()
            if context:
                return f"## Unified Memory\n{context}"
            # A genuinely empty memory costs no tokens to report.
            return ""
        except Exception as e:
            self._record_failure()
            logger.debug("unified-memory prefetch failed: %s", e)
            self._try_recover_sidecar()
            return self._UNAVAILABLE_NOTE

    def queue_prefetch(self, query: str, *, session_id: str = "") -> None:
        """No-op — recall is synchronous in prefetch()."""

    def sync_turn(
        self,
        user_content: str,
        assistant_content: str,
        *,
        session_id: str = "",
        messages: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        """Capture the turn (non-blocking, bounded background threads).

        A turn that cannot be delivered now is held and retried, never
        dropped. It used to be dropped whenever the sidecar was down or the
        breaker open - the real way turns went missing, and the reason
        on_pre_compress once re-captured whole spans to compensate.
        """
        if not self._write_enabled:
            return
        turn = _PendingTurn(
            user=user_content,
            assistant=assistant_content,
            session_key=session_id or self._session_id,
            # Minted once per turn and kept across retries: that is what lets
            # the sidecar recognise a retry of a request that already landed.
            idempotency_key=uuid.uuid4().hex,
        )
        if not self._ensure_alive_for_request() or not self._client:
            self._hold(turn)
            return

        def _sync():
            self._deliver(turn)

        # Bounded backpressure: cap in-flight syncs; wait briefly on the oldest
        # before spawning a new one so a hung sidecar can't grow threads.
        oldest_to_join: Optional[threading.Thread] = None
        with self._sync_lock:
            self._active_syncs = [t for t in self._active_syncs if t.is_alive()]
            if len(self._active_syncs) >= _MAX_INFLIGHT_SYNCS:
                oldest_to_join = self._active_syncs[0]

        if oldest_to_join is not None:
            oldest_to_join.join(timeout=_SYNC_JOIN_TIMEOUT_SECS)
            if oldest_to_join.is_alive():
                logger.warning(
                    "unified-memory sync backlog: oldest sync still running after "
                    "%.1fs; continuing (sidecar may be hung).", _SYNC_JOIN_TIMEOUT_SECS,
                )

        thread = threading.Thread(target=_sync, daemon=True, name="unified-memory-sync")
        with self._sync_lock:
            self._active_syncs = [t for t in self._active_syncs if t.is_alive()]
            self._active_syncs.append(thread)
        thread.start()

    def _send(self, turn: _PendingTurn) -> bool:
        """One delivery attempt. True only when the sidecar accepted it."""
        client = self._client
        if client is None:
            return False
        try:
            client.capture(
                user_content=turn.user,
                assistant_content=turn.assistant,
                bank=self._bank,
                session_key=turn.session_key,
                user_id=self._user_id,
                idempotency_key=turn.idempotency_key,
            )
            self._record_success()
            return True
        except Exception as e:
            self._record_failure()
            logger.warning("unified-memory sync failed (will retry): %s", e)
            self._try_recover_sidecar()
            return False

    def _hold(self, turn: _PendingTurn) -> None:
        """Queue a turn for retry, dropping the oldest - loudly - if full."""
        with self._pending_lock:
            if len(self._pending) >= _MAX_PENDING_TURNS:
                self._pending.popleft()
                self._dropped_turns += 1
                logger.warning(
                    "unified-memory: retry buffer full (%d); dropped the oldest "
                    "undelivered turn (%d dropped this process).",
                    _MAX_PENDING_TURNS, self._dropped_turns,
                )
            self._pending.append(turn)

    def _drain_pending(self) -> bool:
        """Deliver held turns oldest-first. True when none remain.

        Stops at the first failure so order is kept: a later turn must never
        land before an earlier one that is still waiting. A turn leaves the
        queue only after the sidecar has accepted it.
        """
        with self._drain_lock:
            while True:
                with self._pending_lock:
                    if not self._pending:
                        return True
                    turn = self._pending[0]
                if not self._send(turn):
                    return False
                with self._pending_lock:
                    if self._pending and self._pending[0] is turn:
                        self._pending.popleft()

    def _deliver(self, turn: _PendingTurn) -> None:
        """Send a new turn behind any that are still waiting."""
        if self._drain_pending() and self._send(turn):
            return
        self._hold(turn)

    def _drain_if_pending(self) -> None:
        with self._pending_lock:
            waiting = bool(self._pending)
        if waiting:
            self._drain_pending()

    def shutdown(self) -> None:
        """Clean shutdown — flush and release resources."""
        self._stop_watchdog()

        with self._sync_lock:
            pending = list(self._active_syncs)
            self._active_syncs.clear()
        for t in pending:
            if not t.is_alive():
                continue
            t.join(timeout=_SHUTDOWN_JOIN_TIMEOUT_SECS)
            if t.is_alive():
                logger.warning(
                    "unified-memory shutdown: sync thread %s still alive after %.1fs; "
                    "abandoning (daemon).", t.name, _SHUTDOWN_JOIN_TIMEOUT_SECS,
                )

        if self._client and self._sidecar_available:
            # Last chance for held turns. Whatever still cannot be delivered is
            # reported, since it is about to be lost with the process.
            if not self._drain_pending():
                with self._pending_lock:
                    lost = len(self._pending)
                logger.warning(
                    "unified-memory shutdown: %d turn(s) could not be delivered.", lost
                )
            try:
                self._client.end_session(bank=self._bank, user_id=self._user_id)
            except Exception as e:
                logger.debug("unified-memory session end failed: %s", e)

        # Do NOT stop the sidecar — it may serve other sessions. Drop our
        # references so in-flight recovery attempts bail out.
        self._client = None
        self._sidecar_available = False
        self._initialized = False
        self._supervisor = None

    # -- Tools ------------------------------------------------------------------

    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        # Return schemas optimistically: MemoryManager builds its tool routing
        # table BEFORE initialize(), so returning [] here would make the tools
        # unroutable even after a successful start.
        if self._sidecar_available or self._initialized:
            return [MEMORY_SEARCH_SCHEMA, CONVERSATION_SEARCH_SCHEMA, REFLECT_SCHEMA]
        if os.environ.get("UNIFIED_MEMORY_SIDECAR_CMD") or os.environ.get("UNIFIED_MEMORY_GATEWAY_PORT"):
            return [MEMORY_SEARCH_SCHEMA, CONVERSATION_SEARCH_SCHEMA, REFLECT_SCHEMA]
        return []

    def handle_tool_call(self, tool_name: str, args: Dict[str, Any], **kwargs) -> str:
        self._ensure_alive_for_request()
        if not self._client:
            return json.dumps({
                "error": "unified memory sidecar is not connected; memory search is temporarily unavailable.",
                "hint": "The sidecar may still be starting. Try again in a moment.",
            })
        if self._is_breaker_open():
            return json.dumps({"error": "unified memory temporarily unavailable (circuit breaker open)."})

        try:
            if tool_name == "unified_memory_search":
                query = args.get("query", "")
                if not query:
                    return json.dumps({"error": "Missing required parameter: query"})
                result = self._client.search_memories(
                    query=query,
                    bank=self._bank,
                    limit=_coerce_limit(args.get("limit")),
                    type_filter=args.get("type", ""),
                )
                self._record_success()
                return json.dumps(result, ensure_ascii=False)

            if tool_name == "unified_conversation_search":
                query = args.get("query", "")
                if not query:
                    return json.dumps({"error": "Missing required parameter: query"})
                result = self._client.search_conversations(
                    query=query,
                    bank=self._bank,
                    limit=_coerce_limit(args.get("limit")),
                )
                self._record_success()
                return json.dumps(result, ensure_ascii=False)

            if tool_name == "unified_memory_reflect":
                query = args.get("query", "")
                if not query:
                    return json.dumps({"error": "Missing required parameter: query"})
                result = self._client.reflect(query=query, bank=self._bank)
                self._record_success()
                return json.dumps(result, ensure_ascii=False)

            return json.dumps({"error": f"Unknown tool: {tool_name}"})

        except Exception as e:
            self._record_failure()
            self._try_recover_sidecar()
            return json.dumps({"error": f"Tool call failed: {e}"})

    # -- Optional hooks ----------------------------------------------------------

    def on_session_end(self, messages: List[Dict[str, Any]]) -> None:
        """Trigger L2 consolidation on the sidecar."""
        if self._client and self._sidecar_available:
            try:
                self._client.end_session(bank=self._bank, user_id=self._user_id)
            except Exception as e:
                logger.debug("unified-memory on_session_end failed: %s", e)

    def on_session_switch(
        self,
        new_session_id: str,
        *,
        parent_session_id: str = "",
        reset: bool = False,
        rewound: bool = False,
        **kwargs: Any,
    ) -> None:
        """Follow /resume, /branch, /reset, /new and compression to the new id.

        The contract asks providers that cache a session id in initialize() to
        update it here. Turns synced with an explicit session_id are already
        attributed correctly; this keeps every path that falls back to the
        cached id - memory-write mirroring, a prefetch issued without one -
        from filing the new conversation under the old one.
        """
        if new_session_id:
            self._session_id = str(new_session_id)

    def on_pre_compress(self, messages: List[Dict[str, Any]]) -> str:
        """Before compression: deliver any held turns. Writes nothing new.

        This used to re-capture the whole span about to be compressed, as one
        entry. Every turn in it had already been captured by sync_turn, so
        each compression wrote a duplicate - and a merged one, all user text
        then all assistant text, up to 32k characters. Measured, it ranked
        first for a query about one of its fifteen turns and took 40% of the
        context. Its rationale was turns lost while the sidecar was down; those
        are now held and retried instead, so the span is already covered.
        """
        if self._client and self._sidecar_available:
            self._drain_if_pending()
        return ""

    def on_memory_write(
        self,
        action: str,
        target: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Mirror built-in MEMORY.md/USER.md writes into unified memory."""
        if not self._write_enabled:
            return
        if not (self._client and self._sidecar_available) or not content:
            return
        if action == "remove":
            return  # deletions of builtin notes are not memory events
        try:
            self._client.capture(
                user_content="",
                assistant_content=f"[builtin-memory:{target}:{action}] {content}",
                bank=self._bank,
                session_key=self._session_id,
                user_id=self._user_id,
            )
        except Exception as e:
            logger.debug("unified-memory on_memory_write mirror failed: %s", e)

    def backup_paths(self) -> List[str]:
        """Sidecar data root (md substrate + exports), resolved from env only."""
        env = os.environ.get("UNIFIED_MEMORY_HOME")
        if env and env.strip():
            return [env.strip()]
        hermes_home = os.environ.get("HERMES_HOME")
        if hermes_home and hermes_home.strip():
            # Inside HERMES_HOME — hermes backup already covers it.
            return []
        home = os.environ.get("HOME") or os.environ.get("USERPROFILE") or ""
        return [os.path.join(home, ".hermes", "unified")] if home else []

    # -- Config --------------------------------------------------------------------

    def get_config_schema(self) -> List[Dict[str, Any]]:
        return [
            {
                "key": "sidecar_cmd",
                "description": "Command to start the unified memory sidecar (e.g. 'python -m hindsight_unified.server')",
                "env_var": "UNIFIED_MEMORY_SIDECAR_CMD",
                "required": False,
            },
            {
                "key": "gateway_host",
                "description": "Sidecar host",
                "default": "127.0.0.1",
                "env_var": "UNIFIED_MEMORY_GATEWAY_HOST",
            },
            {
                "key": "gateway_port",
                "description": "Sidecar port",
                "default": "8766",
                "env_var": "UNIFIED_MEMORY_GATEWAY_PORT",
            },
            {
                "key": "home",
                "description": "Data root for the verbatim markdown substrate and exports",
                "env_var": "UNIFIED_MEMORY_HOME",
                "required": False,
            },
        ]


# ---------------------------------------------------------------------------
# Plugin entry point
# ---------------------------------------------------------------------------

def register(ctx) -> None:
    """Register the unified memory provider plugin."""
    ctx.register_memory_provider(UnifiedMemoryProvider())
