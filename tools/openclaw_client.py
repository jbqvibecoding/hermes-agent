"""OpenClawWorkerClient — drive a user's OpenClaw Gateway over JSON-RPC.

The interop wire (Phase 4): shape a generic worker into a vertical one and run
one turn. Sequence (verified against ``packages/gateway-protocol``):

    sessions.create(key, model, message, task, parentSessionKey)
      → sessions.patch(inheritedToolAllow/Deny, subagentRole, model, thinkingLevel)
        → chat.send(sessionKey, message, idempotencyKey, timeoutMs)
          → await terminal ChatFinalEvent / GatewayAgentResponse

The frame builders and the terminal-result parser are pure and unit-testable.
The transport (a live WebSocket using ``OPENCLAW_GATEWAY_TOKEN``) is injected via
the :class:`OpenClawTransport` protocol, so framing/parsing is tested with a stub
and the real socket round-trip is gated behind an opt-in env flag. ``run_turn``
returns a :class:`tools.worker_adapter.RuntimeOutcome`, so the client plugs
straight into :class:`OpenClawWorkerAdapter` as its injected runner.
"""

from __future__ import annotations

from typing import Optional, Protocol

from tools.worker_adapter import OpenClawRequest, RuntimeOutcome

SUBAGENT_DENY_DEFAULT = "leaf"


# ---- pure frame builders (match gateway-protocol schema field names) -------

def sessions_create_params(req: OpenClawRequest, *, parent_session_key: Optional[str] = None) -> dict:
    params: dict = {"key": req.session_key, "message": req.message}
    if req.model:
        params["model"] = req.model
    if parent_session_key:
        params["parentSessionKey"] = parent_session_key
    return params


def sessions_patch_params(req: OpenClawRequest) -> dict:
    """Runtime shaping: tool allow/deny + role + model. Omit empty arrays so the
    worker keeps its defaults rather than being patched to an empty tool set."""
    params: dict = {"key": req.session_key, "subagentRole": req.subagent_role}
    if req.model:
        params["model"] = req.model
    if req.tools_allow:
        params["inheritedToolAllow"] = list(req.tools_allow)
    if req.tools_deny:
        params["inheritedToolDeny"] = list(req.tools_deny)
    return params


def chat_send_params(req: OpenClawRequest) -> dict:
    return {
        "sessionKey": req.session_key,
        "message": req.message,
        "idempotencyKey": req.idempotency_key,
        "timeoutMs": req.timeout_ms,
    }


# ---- terminal result parsing ----------------------------------------------

def is_final(event: dict) -> bool:
    """True when an event/response is terminal (ChatFinalEvent or a CLI result)."""
    state = event.get("state")
    if state in {"final", "error", "aborted"}:
        return True
    # GatewayAgentResponse (CLI --json) carries a terminal status, no 'state'.
    return state is None and "status" in event


def parse_final(event: dict) -> RuntimeOutcome:
    """Map a terminal frame to a RuntimeOutcome.

    Handles both ChatFinalEvent ``{state, message, usage, stopReason}`` and the
    CLI ``GatewayAgentResponse {status, result.payloads[].text, summary}``.
    """
    state = event.get("state")
    if state == "error":
        return RuntimeOutcome(ok=False, error_kind="error", error_note=_msg(event) or "gateway error")
    if state == "aborted":
        return RuntimeOutcome(ok=False, error_kind="crashed", error_note="run aborted")

    text = _extract_text(event)
    status = (event.get("status") or "").lower()
    if status and status not in {"ok", "done", "success", "completed", "complete"}:
        # CLI reported a non-success terminal status.
        kind = "timeout" if "timeout" in status else "error"
        return RuntimeOutcome(ok=False, text=text, error_kind=kind, error_note=status)
    return RuntimeOutcome(ok=True, text=text)


def _msg(event: dict) -> str:
    msg = event.get("message")
    if isinstance(msg, str):
        return msg
    if isinstance(msg, dict):
        return str(msg.get("text") or msg.get("content") or "")
    return ""


def _extract_text(event: dict) -> str:
    direct = _msg(event)
    if direct:
        return direct
    result = event.get("result")
    if isinstance(result, dict):
        payloads = result.get("payloads")
        if isinstance(payloads, list):
            parts = [p.get("text", "") for p in payloads if isinstance(p, dict) and p.get("text")]
            if parts:
                return "\n".join(parts)
    summary = event.get("summary")
    return summary if isinstance(summary, str) else ""


# ---- transport + client ----------------------------------------------------

class OpenClawTransport(Protocol):
    """One per-user Gateway connection (token-authed). Injected for testability."""

    def sessions_create(self, params: dict) -> dict: ...
    def sessions_patch(self, params: dict) -> dict: ...
    def chat_send(self, params: dict) -> dict: ...
    def sessions_abort(self, params: dict) -> dict: ...


class OpenClawWorkerClient:
    """Drives one worker turn over an injected transport.

    ``run`` matches :data:`tools.worker_adapter.OpenClawRunner`, so an instance
    can be passed directly as ``OpenClawWorkerAdapter(runner=client.run)``.
    """

    def __init__(self, transport: OpenClawTransport, *, parent_session_key: Optional[str] = None) -> None:
        self._t = transport
        self._parent = parent_session_key

    def run(self, req: OpenClawRequest) -> RuntimeOutcome:
        try:
            self._t.sessions_create(sessions_create_params(req, parent_session_key=self._parent))
            self._t.sessions_patch(sessions_patch_params(req))
            final = self._t.chat_send(chat_send_params(req))
        except OpenClawTransportError as exc:
            return RuntimeOutcome(ok=False, error_kind="crashed", error_note=str(exc))
        return parse_final(final)


class OpenClawTransportError(Exception):
    """Raised by a transport when the Gateway is unreachable or rejects auth."""
