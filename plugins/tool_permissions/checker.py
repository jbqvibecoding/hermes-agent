"""Per-tool permission evaluation (ported from OpenHarness).

Hermes has no native per-tool approval / permission-mode layer. OpenHarness
(HKUDS) ships a compact, well-designed one; this ports its core
(``permissions/checker.py`` + ``modes.py``) into a self-contained module with
a local settings dataclass (no OpenHarness config dependency).

Layered precedence in :meth:`PermissionChecker.evaluate` (first match wins):
  1. un-overridable ``SENSITIVE_PATH_PATTERNS`` credential deny (prompt-injection
     defense — active in every mode, even full_auto);
  2. explicit tool deny-list;
  3. explicit tool allow-list;
  4. glob ``PathRule`` deny;
  5. ``denied_commands`` fnmatch deny (e.g. ``rm -rf /``);
  6. mode logic (full_auto → allow; read-only → allow; plan → block mutating;
     default → require confirmation for mutating tools).
"""

from __future__ import annotations

import fnmatch
import logging
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class PermissionMode(str, Enum):
    """Supported permission modes (plus ``OFF`` = plugin does nothing)."""

    OFF = "off"
    DEFAULT = "default"
    PLAN = "plan"
    FULL_AUTO = "full_auto"


# Paths always denied regardless of mode or user config — protects credential /
# key material from LLM-directed access (including via prompt injection).
# fnmatch patterns, matched against the resolved absolute path.
SENSITIVE_PATH_PATTERNS: tuple[str, ...] = (
    "*/.ssh/*",
    "*/.aws/credentials",
    "*/.aws/config",
    "*/.config/gcloud/*",
    "*/.azure/*",
    "*/.gnupg/*",
    "*/.docker/config.json",
    "*/.kube/config",
    # Hermes own credential/secret stores
    "*/.hermes/.env",
    "*/.hermes/auth.json",
    "*/.hermes/credentials.json",
)


@dataclass(frozen=True)
class PathRule:
    pattern: str
    allow: bool  # True = allow, False = deny


@dataclass
class PermissionSettings:
    """Operator-configured permission policy."""

    mode: PermissionMode = PermissionMode.OFF
    allowed_tools: frozenset[str] = field(default_factory=frozenset)
    denied_tools: frozenset[str] = field(default_factory=frozenset)
    denied_commands: tuple[str, ...] = ()
    path_rules: tuple[PathRule, ...] = ()
    read_only_tools: frozenset[str] = field(default_factory=frozenset)


@dataclass(frozen=True)
class PermissionDecision:
    allowed: bool
    requires_confirmation: bool = False
    reason: str = ""


class PermissionChecker:
    """Evaluate tool usage against the configured mode and rules."""

    def __init__(self, settings: PermissionSettings) -> None:
        self._settings = settings

    def evaluate(
        self,
        tool_name: str,
        *,
        is_read_only: bool,
        file_path: str | None = None,
        command: str | None = None,
    ) -> PermissionDecision:
        """Return whether the tool may run immediately."""
        s = self._settings

        # (1) Built-in sensitive-path protection — always active, un-overridable.
        if file_path:
            for candidate in _policy_match_paths(file_path):
                for pattern in SENSITIVE_PATH_PATTERNS:
                    if fnmatch.fnmatch(candidate, pattern):
                        return PermissionDecision(
                            allowed=False,
                            reason=(
                                f"Access denied: {file_path} is a sensitive credential "
                                f"path (matched built-in pattern '{pattern}')"
                            ),
                        )

        # (2) explicit tool deny
        if tool_name in s.denied_tools:
            return PermissionDecision(
                allowed=False, reason=f"{tool_name} is explicitly denied"
            )

        # (3) explicit tool allow
        if tool_name in s.allowed_tools:
            return PermissionDecision(
                allowed=True, reason=f"{tool_name} is explicitly allowed"
            )

        # (4) path-level deny rules
        if file_path and s.path_rules:
            for candidate in _policy_match_paths(file_path):
                for rule in s.path_rules:
                    if not rule.allow and fnmatch.fnmatch(candidate, rule.pattern):
                        return PermissionDecision(
                            allowed=False,
                            reason=f"Path {file_path} matches deny rule: {rule.pattern}",
                        )

        # (5) command deny patterns
        if command:
            for pattern in s.denied_commands:
                if isinstance(pattern, str) and fnmatch.fnmatch(command, pattern):
                    return PermissionDecision(
                        allowed=False,
                        reason=f"Command matches deny pattern: {pattern}",
                    )

        # (6a) full_auto → allow everything (that survived the deny layers)
        if s.mode == PermissionMode.FULL_AUTO:
            return PermissionDecision(allowed=True, reason="full_auto allows all tools")

        # (6b) read-only tools always allowed
        if is_read_only:
            return PermissionDecision(
                allowed=True, reason="read-only tools are allowed"
            )

        # (6c) plan mode → block mutating tools
        if s.mode == PermissionMode.PLAN:
            return PermissionDecision(
                allowed=False,
                reason="Plan mode blocks mutating tools until the user exits plan mode",
            )

        # (6d) default mode → require confirmation for mutating tools
        reason = (
            "Mutating tools require user confirmation in default permission mode. "
            "Approve the prompt, or set permissions.mode=full_auto to allow them."
        )
        hint = _bash_permission_hint(command)
        if hint:
            reason = f"{reason} {hint}"
        return PermissionDecision(
            allowed=False, requires_confirmation=True, reason=reason
        )


def _policy_match_paths(file_path: str) -> tuple[str, ...]:
    """Path forms for policy matching; directory roots also get a trailing slash
    so ``*/.ssh/*`` matches a grep/glob root of ``/home/u/.ssh``."""
    normalized = file_path.rstrip("/")
    if not normalized:
        return (file_path,)
    return (normalized, normalized + "/")


def _bash_permission_hint(command: str | None) -> str:
    if not command:
        return ""
    lowered = command.lower()
    markers = (
        "npm install",
        "pnpm install",
        "yarn install",
        "bun install",
        "pip install",
        "uv pip install",
        "poetry install",
        "cargo install",
        "create-next-app",
        "npm create ",
        "pnpm create ",
        "yarn create ",
        "bun create ",
        "npx create-",
        "npm init ",
        "pnpm init ",
        "yarn init ",
    )
    if any(m in lowered for m in markers):
        return (
            "Package installation and scaffolding commands change the workspace, "
            "so they will not run automatically in default mode."
        )
    return ""
