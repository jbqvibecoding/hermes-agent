"""Declarative hook definitions (ported from OpenHarness ``hooks/schemas.py``).

Four hook types — ``command`` / ``prompt`` / ``http`` / ``agent`` — each with a
``matcher`` (fnmatch against the event subject), a ``priority`` (higher runs
first), ``block_on_failure``, and ``timeout_seconds``.

Adaptation from upstream: upstream models these with pydantic. Hermes' plugin
layer must stay importable in minimal environments (the test venv has no
pydantic), so these are plain dataclasses with a hand-written ``from_dict`` that
does the same clamping/validation pydantic's ``Field(ge=, le=)`` did.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

# Upstream Field(ge=1, le=600) / (ge=1, le=1200) bounds.
MIN_TIMEOUT = 1
MAX_TIMEOUT = 600
MAX_AGENT_TIMEOUT = 1200


class HookConfigError(ValueError):
    """Raised when a hook definition in the config is malformed."""


@dataclass
class BaseHookDefinition:
    """Fields shared by every hook type."""

    type: str = ""
    timeout_seconds: int = 30
    matcher: Optional[str] = None
    block_on_failure: bool = False
    priority: int = 0
    """Higher priority runs first within an event; ties keep config order."""


@dataclass
class CommandHookDefinition(BaseHookDefinition):
    """A hook that executes a shell command."""

    command: str = ""


@dataclass
class PromptHookDefinition(BaseHookDefinition):
    """A hook that asks the model to validate a condition."""

    prompt: str = ""
    model: Optional[str] = None


@dataclass
class HttpHookDefinition(BaseHookDefinition):
    """A hook that POSTs the event payload to an HTTP endpoint."""

    url: str = ""
    headers: Dict[str, str] = field(default_factory=dict)


@dataclass
class AgentHookDefinition(BaseHookDefinition):
    """A hook that performs a deeper model-based validation."""

    prompt: str = ""
    model: Optional[str] = None


HookDefinition = BaseHookDefinition

# Upstream defaults: command/http are advisory (block_on_failure False);
# prompt/agent are gates (True).
_DEFAULTS = {
    "command": {"timeout": 30, "block": False, "max_timeout": MAX_TIMEOUT},
    "http": {"timeout": 30, "block": False, "max_timeout": MAX_TIMEOUT},
    "prompt": {"timeout": 30, "block": True, "max_timeout": MAX_TIMEOUT},
    "agent": {"timeout": 60, "block": True, "max_timeout": MAX_AGENT_TIMEOUT},
}


def _clamp(value: Any, default: int, maximum: int) -> int:
    try:
        seconds = int(value)
    except (TypeError, ValueError):
        return default
    return max(MIN_TIMEOUT, min(maximum, seconds))


def _as_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _optional_str(value: Any) -> Optional[str]:
    if isinstance(value, str) and value.strip():
        return value
    return None


def hook_from_dict(raw: Any) -> HookDefinition:
    """Build a hook definition from a config mapping.

    Raises:
        HookConfigError: unknown type, or a required field is missing/empty.
    """
    if not isinstance(raw, dict):
        raise HookConfigError(f"hook must be a mapping, got {type(raw).__name__}")

    hook_type = str(raw.get("type") or "").strip().lower()
    spec = _DEFAULTS.get(hook_type)
    if spec is None:
        raise HookConfigError(
            f"unknown hook type {hook_type!r} (expected one of: "
            + ", ".join(sorted(_DEFAULTS))
            + ")"
        )

    common: Dict[str, Any] = {
        "type": hook_type,
        "timeout_seconds": _clamp(
            raw.get("timeout_seconds", spec["timeout"]),
            spec["timeout"],
            spec["max_timeout"],
        ),
        "matcher": _optional_str(raw.get("matcher")),
        "block_on_failure": bool(raw.get("block_on_failure", spec["block"])),
        "priority": _as_int(raw.get("priority"), 0),
    }

    def _required(key: str) -> str:
        value = raw.get(key)
        if not isinstance(value, str) or not value.strip():
            raise HookConfigError(f"{hook_type} hook requires a non-empty {key!r}")
        return value

    if hook_type == "command":
        return CommandHookDefinition(command=_required("command"), **common)
    if hook_type == "http":
        headers = raw.get("headers") or {}
        if not isinstance(headers, dict):
            raise HookConfigError("http hook 'headers' must be a mapping")
        return HttpHookDefinition(
            url=_required("url"),
            headers={str(k): str(v) for k, v in headers.items()},
            **common,
        )
    model = _optional_str(raw.get("model"))
    if hook_type == "prompt":
        return PromptHookDefinition(prompt=_required("prompt"), model=model, **common)
    return AgentHookDefinition(prompt=_required("prompt"), model=model, **common)


def hook_detail(hook: HookDefinition) -> str:
    """Return the hook's primary payload (command / prompt / url) for logs."""
    return (
        getattr(hook, "command", "")
        or getattr(hook, "prompt", "")
        or getattr(hook, "url", "")
    )


def load_hook_definitions(raw: Any) -> Dict[str, List[HookDefinition]]:
    """Parse ``{event: [hook, ...]}`` config into definitions, sorted by priority.

    Malformed individual hooks are skipped (with the error attached to the
    returned ``errors`` via :func:`load_hook_definitions_with_errors`); this
    thin wrapper keeps the common call site simple.
    """
    definitions, _errors = load_hook_definitions_with_errors(raw)
    return definitions


def load_hook_definitions_with_errors(
    raw: Any,
) -> tuple[Dict[str, List[HookDefinition]], List[str]]:
    """Same as :func:`load_hook_definitions`, also returning per-hook errors."""
    definitions: Dict[str, List[HookDefinition]] = {}
    errors: List[str] = []
    if not isinstance(raw, dict):
        return definitions, errors

    for event, hooks in raw.items():
        event_name = str(event).strip()
        if not event_name or not isinstance(hooks, list):
            continue
        parsed: List[HookDefinition] = []
        for index, entry in enumerate(hooks):
            try:
                parsed.append(hook_from_dict(entry))
            except HookConfigError as exc:
                errors.append(f"{event_name}[{index}]: {exc}")
        if parsed:
            # Stable sort: higher priority first, config order preserved on ties.
            parsed.sort(key=lambda hook: -hook.priority)
            definitions[event_name] = parsed
    return definitions, errors
