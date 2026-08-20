"""Audit log for dashboard-auth events.

Profile-aware location: ``$HERMES_HOME/logs/dashboard-auth.log``.
Format: one JSON object per line. Token-like fields are stripped before
serialisation to avoid leaking refresh tokens or JWTs to disk.

This module deliberately keeps a minimal dependency surface — no imports
from ``hermes_constants`` or other hermes_cli modules — so it can be
imported safely from middleware code that loads early in the startup
sequence.
"""
from __future__ import annotations

import enum
import os
from pathlib import Path
from typing import Any

# Field names that must never appear in the log raw. Any kwarg matching
# these is silently dropped.
_REDACTED_FIELDS: frozenset = frozenset({
    "access_token", "refresh_token", "code", "code_verifier",
    "state", "ticket", "cookie", "Authorization", "authorization",
})


class AuditEvent(enum.Enum):
    """Event types written to dashboard-auth.log.

    Values are the literal ``event`` field on the JSON line.
    """

    LOGIN_START = "login_start"
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    REFRESH_SUCCESS = "refresh_success"
    REFRESH_FAILURE = "refresh_failure"
    REVOKE = "revoke"
    SESSION_VERIFY_FAILURE = "session_verify_failure"
    WS_TICKET_MINTED = "ws_ticket_minted"
    WS_TICKET_REJECTED = "ws_ticket_rejected"
    TOKEN_AUTH_SUCCESS = "token_auth_success"
    TOKEN_AUTH_FAILURE = "token_auth_failure"


def _resolve_log_path() -> Path:
    """``$HERMES_HOME/logs/dashboard-auth.log`` with the standard fallback.

    Mirrors ``hermes_constants.get_hermes_home`` semantics: env var wins,
    else ``~/.hermes``. A local copy avoids an import cycle with the
    middleware which lives below ``hermes_cli``.
    """
    home = os.environ.get("HERMES_HOME") or str(Path.home() / ".hermes")
    return Path(home) / "logs" / "dashboard-auth.log"


def audit_log(event: AuditEvent, **fields: Any) -> None:
    """Append one event to the audit log.

    Token-like fields are dropped. Missing log directory is created.
    Write failures are logged at WARNING but never raise — auth must not
    fail because the audit logger broke.

    The mechanism now lives in :mod:`hermes_cli.audit_log`, shared with the
    tool-call audit trail; this module keeps the auth-specific path, event enum
    and redaction set. ``hermes_cli.audit_log`` imports only the standard
    library, so the early-startup constraint in this module's docstring still
    holds.

    The path is resolved per call rather than cached, preserving the previous
    behaviour of honouring a ``HERMES_HOME`` that changes at runtime.
    """
    from hermes_cli.audit_log import AuditWriter

    AuditWriter(
        _resolve_log_path(),
        redacted_fields=_REDACTED_FIELDS,
        name="dashboard-auth",
    ).write(event.value, **fields)
