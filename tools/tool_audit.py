"""A durable record of what the agent did, what was decided, and what happened.

Ported from CopilotKit's OpenBot (MIT) — ``server/src/computer/gateway.ts``
and ``server/src/audit.ts``.

What Hermes had before this
---------------------------
Three partial substitutes, none of them an audit trail:

* the SQLite session store keeps a *transcript* — what the model asked for and
  what came back — but not the decision, and it is subject to compaction and
  ``/delete``;
* ``plugins/observability/ndjson`` writes the right shape but ships **opt-in**,
  drops keys, and truncates values at 2,000 chars (good for watching a run,
  lossy for reconstructing one);
* the rotating text logs carry approval decisions as prose, unstructured, and
  rotate away.

The one properly-shaped audit log in the repo covered dashboard auth events
only. This module gives tool calls the same treatment, on the shared core in
``hermes_cli/audit_log.py``.

The ordering that makes it worth having
---------------------------------------
OpenBot's gateway writes the decision row **before** the action runs, and
writes a second row if an allowed action then fails. The comment in their
codebase is the justification: *"There is no path that acts without the record
existing first."* An audit written afterwards is a record of things that
finished — the interesting failures are the ones that did not.

:func:`record_decision` and :func:`record_outcome` are the two halves, and
:func:`audited_action` puts them in the right order so a caller cannot get it
wrong.

Scope, stated plainly
---------------------
This is wired to the human-in-the-loop browser events (B1/B2) and to the
universal ``post_tool_call`` emitter. It is **not** a universal
pre-authorisation gate over every tool: Hermes' approval layer covers shell and
``execute_code`` only, so for most tools there is no decision to record yet.
Making that gate universal is a larger change and is not what this module
claims to have done.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Optional

from hermes_cli.audit_log import AuditWriter, resolve_hermes_home

logger = logging.getLogger(__name__)

# Field names that must never reach the log. Anything holding the content of a
# secret, a credential, or a whole conversation.
REDACTED_FIELDS = frozenset({
    "secret",
    "password",
    "passwd",
    "value",
    "token",
    "api_key",
    "apikey",
    "authorization",
    "auth",
    "cookie",
    "credential",
    "credentials",
    "private_key",
    "access_token",
    "refresh_token",
    "session_token",
    "messages",
    "conversation_history",
    "prompt",
    "text",
})

# --- Event vocabulary ------------------------------------------------------
# Flat strings rather than an enum so a caller in another module can add an
# event without editing this file — the log is append-only and self-describing,
# so an unrecognised event name is readable, whereas a missing record is not.

TOOL_CALLED = "tool.called"
TOOL_SUCCEEDED = "tool.succeeded"
TOOL_FAILED = "tool.failed"
TOOL_REFUSED = "tool.refused"

BROWSER_HELP_REQUESTED = "browser.help_requested"
BROWSER_CONTROL_TAKEN = "browser.control_taken"
BROWSER_CONTROL_RELEASED = "browser.control_released"
BROWSER_ACTION_REFUSED = "browser.action_refused"
BROWSER_SECRET_REQUESTED = "browser.secret_requested"
BROWSER_SECRET_SUPPLIED = "browser.secret_supplied"
BROWSER_VIEW_STALE = "browser.view_stale"

_writer: Optional[AuditWriter] = None


def _resolve_path() -> Path:
    return resolve_hermes_home() / "logs" / "tool-audit.log"


def get_writer() -> AuditWriter:
    """The process-wide writer, created on first use."""
    global _writer
    if _writer is None:
        _writer = AuditWriter(
            _resolve_path(), redacted_fields=REDACTED_FIELDS, name="tool-audit"
        )
    return _writer


def reset_writer() -> None:
    """Drop the cached writer so the next call re-resolves the path.

    For tests that point ``HERMES_HOME`` somewhere temporary, and for a profile
    switch at runtime.
    """
    global _writer
    _writer = None


def record(event: str, **fields: Any) -> bool:
    """Append one audit event. Never raises."""
    try:
        return get_writer().write(event, **fields)
    except Exception as exc:  # noqa: BLE001 — auditing must not break the agent
        logger.warning("tool audit record failed: %s", exc)
        return False


def record_decision(
    tool_name: str,
    *,
    allowed: bool,
    reason: str = "",
    rule: str = "",
    **fields: Any,
) -> bool:
    """Record what was decided, **before** the action runs.

    ``allowed=False`` is terminal — the action does not happen, so no outcome
    follows. ``allowed=True`` must be followed by :func:`record_outcome`, which
    is why :func:`audited_action` exists.
    """
    return record(
        TOOL_CALLED if allowed else TOOL_REFUSED,
        tool=tool_name,
        allowed=bool(allowed),
        reason=reason,
        rule=rule,
        **fields,
    )


def record_outcome(tool_name: str, *, ok: bool, error: str = "", **fields: Any) -> bool:
    """Record what actually happened after an allowed action.

    The separate failure record is the point: without it, "allowed" in the log
    reads as "happened", and the cases where those differ are the ones worth
    looking into.
    """
    return record(
        TOOL_SUCCEEDED if ok else TOOL_FAILED,
        tool=tool_name,
        ok=bool(ok),
        error=error,
        **fields,
    )


_CONFIG_KEY = "audit"


def audit_enabled() -> bool:
    """Whether the per-tool-call audit trail is on. **Off by default.**

    Reasoning for the default: this writes a line for every tool call, on every
    turn, forever, with no rotation. Turning that on for everyone without being
    asked would be a disk-usage change made on their behalf. The handover and
    secret events (B1/B2) are *not* behind this flag — they are rare, they are
    security-relevant, and they have no other record anywhere.

    ``config.yaml``::

        audit:
          tool_calls: true

    Never raises; an unreadable config means off.
    """
    try:
        from hermes_cli.config import load_config

        section = (load_config() or {}).get(_CONFIG_KEY)
        if isinstance(section, dict):
            return bool(section.get("tool_calls", False))
    except Exception:  # noqa: BLE001 — an unreadable config means off
        pass
    return False


def record_tool_call(
    *,
    tool_name: str,
    args: Any = None,
    task_id: str = "",
    session_id: str = "",
    tool_call_id: str = "",
    duration_ms: int = 0,
    status: str = "",
    error_type: str = "",
    error_message: str = "",
) -> bool:
    """Record one completed tool call.

    Called from ``model_tools._emit_post_tool_call_hook``, which every
    registry-dispatched tool passes through. Note what this is **not**: a
    pre-authorisation record. It is written after the call, because at this
    point in Hermes there is no universal decision to record beforehand — the
    approval gate covers shell and ``execute_code`` only. Calls that were
    *refused* by that gate are recorded by the refusal path, not here.
    """
    ok = str(status or "").lower() not in {"error", "failed", "failure"}
    return record(
        TOOL_SUCCEEDED if ok else TOOL_FAILED,
        tool=tool_name,
        args=args if isinstance(args, dict) else {},
        task_id=task_id,
        session_id=session_id,
        tool_call_id=tool_call_id,
        duration_ms=duration_ms,
        ok=ok,
        error_type=error_type,
        error=error_message,
    )


@contextmanager
def audited_action(tool_name: str, **fields: Any):
    """Write the decision, run the body, then write the outcome.

    Puts the two halves in the order that makes the log trustworthy, so a
    caller cannot accidentally record only the happy path::

        with audited_action("browser_click", ref="@e5"):
            do_the_click()

    An exception from the body is recorded as a failure and then re-raised
    unchanged — the audit observes, it does not swallow.
    """
    record_decision(tool_name, allowed=True, **fields)
    try:
        yield
    except Exception as exc:
        record_outcome(
            tool_name,
            ok=False,
            error=f"{type(exc).__name__}: {exc}",
            **fields,
        )
        raise
    record_outcome(tool_name, ok=True, **fields)


__all__ = [
    "BROWSER_ACTION_REFUSED",
    "BROWSER_CONTROL_RELEASED",
    "BROWSER_CONTROL_TAKEN",
    "BROWSER_HELP_REQUESTED",
    "BROWSER_SECRET_REQUESTED",
    "BROWSER_SECRET_SUPPLIED",
    "BROWSER_VIEW_STALE",
    "REDACTED_FIELDS",
    "TOOL_CALLED",
    "TOOL_FAILED",
    "TOOL_REFUSED",
    "TOOL_SUCCEEDED",
    "audit_enabled",
    "audited_action",
    "get_writer",
    "record",
    "record_decision",
    "record_outcome",
    "record_tool_call",
    "reset_writer",
]
