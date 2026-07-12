"""tool-permissions plugin — per-tool approval / permission-mode gate.

Wires OpenHarness' PermissionChecker into Hermes' ``pre_tool_call`` hook, which
supports the ``{"action": "block"|"approve", "message": ...}`` directive
contract:

* deny  → ``block``   (the reason becomes the tool result the model sees)
* confirm → ``approve`` (escalates to Hermes' human-approval gate)
* allow → no directive (observational)

Opt-in and non-disruptive: with ``permissions.mode: off`` (default) the hook
returns nothing, so existing behavior is unchanged. Setting any other mode
(``default`` / ``plan`` / ``full_auto``) turns on enforcement — the
un-overridable credential deny-list (``SENSITIVE_PATH_PATTERNS``) and explicit
deny-lists apply in every enforcing mode, including ``full_auto``.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Optional

from plugins.tool_permissions.checker import (
    PathRule,
    PermissionChecker,
    PermissionMode,
    PermissionSettings,
)
from plugins.tool_permissions.normalize import (
    extract_command,
    is_read_only,
    resolve_file_path,
)

logger = logging.getLogger(__name__)


def _load_settings() -> PermissionSettings:
    """Build PermissionSettings from env + config.yaml (env wins)."""
    raw: dict[str, Any] = {}
    try:
        from hermes_cli.config import load_config

        cfg = load_config() or {}
        raw = cfg.get("permissions") or {}
    except Exception:  # noqa: BLE001
        raw = {}

    mode_str = (
        (os.environ.get("HERMES_PERMISSION_MODE") or raw.get("mode") or "off")
        .strip()
        .lower()
    )
    try:
        mode = PermissionMode(mode_str)
    except ValueError:
        logger.warning("tool-permissions: unknown mode %r; defaulting to off", mode_str)
        mode = PermissionMode.OFF

    def _as_set(key: str) -> frozenset[str]:
        val = raw.get(key) or []
        return frozenset(str(x) for x in val if isinstance(x, str))

    path_rules = tuple(
        PathRule(pattern=str(r.get("pattern")), allow=bool(r.get("allow", True)))
        for r in (raw.get("path_rules") or [])
        if isinstance(r, dict) and r.get("pattern")
    )

    return PermissionSettings(
        mode=mode,
        allowed_tools=_as_set("allowed_tools"),
        denied_tools=_as_set("denied_tools"),
        denied_commands=tuple(
            str(c) for c in (raw.get("denied_commands") or []) if isinstance(c, str)
        ),
        path_rules=path_rules,
        read_only_tools=_as_set("read_only_tools"),
    )


def _make_hook(checker: PermissionChecker, settings: PermissionSettings):
    def _pre_tool_call(
        tool_name: str = "",
        args: Optional[dict] = None,
        **_: Any,
    ) -> Optional[dict]:
        args = args if isinstance(args, dict) else {}
        try:
            decision = checker.evaluate(
                tool_name,
                is_read_only=is_read_only(tool_name, settings.read_only_tools),
                file_path=resolve_file_path(args),
                command=extract_command(args),
            )
        except Exception as exc:  # noqa: BLE001 — never let the gate crash a tool call
            logger.debug("tool-permissions: evaluate failed: %s", exc)
            return None

        if decision.allowed:
            return None
        if decision.requires_confirmation:
            return {"action": "approve", "message": decision.reason}
        return {"action": "block", "message": decision.reason}

    return _pre_tool_call


def register(ctx) -> None:
    settings = _load_settings()
    if settings.mode == PermissionMode.OFF:
        logger.info(
            "tool-permissions: mode=off (no enforcement). Set permissions.mode to enable."
        )
        return
    checker = PermissionChecker(settings)
    ctx.register_hook("pre_tool_call", _make_hook(checker, settings))
    logger.info("tool-permissions: enforcing mode=%s", settings.mode.value)
