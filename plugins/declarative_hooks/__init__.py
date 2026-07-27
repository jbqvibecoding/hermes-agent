"""declarative-hooks plugin — config-declared lifecycle hooks with LLM gates.

Ported from OpenHarness' ``hooks/`` subsystem. Complements the
``tool-permissions`` plugin: that one enforces *hard* rules (path/tool
deny-lists); this one lets an operator declare *soft* policy in plain language
and have a model adjudicate it — no code required.

Config lives under ``declarative_hooks:`` in ``config.yaml``::

    declarative_hooks:
      pre_tool_call:
        - type: prompt
          matcher: "terminal"
          priority: 10
          prompt: |
            Block this command if it would delete production data.
            Event payload: $ARGUMENTS
        - type: command
          command: "./scripts/audit.sh"
          block_on_failure: false

Event keys are Hermes hook names (``pre_tool_call``, ``post_tool_call``,
``on_session_start``, ...); OpenHarness names (``pre_tool_use``,
``session_start``, ...) are accepted as aliases so upstream configs port over.

**Opt-in and non-disruptive**: with no ``declarative_hooks:`` config the plugin
registers nothing, so behavior is unchanged. Only ``pre_tool_call`` can veto —
a blocking verdict there becomes ``{"action": "block", "message": reason}``,
Hermes' documented directive contract. On every other event a blocking verdict
is logged and otherwise observational, because those call sites have no veto.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Callable, Dict, List, Optional

from plugins.declarative_hooks.executor import execute_hooks
from plugins.declarative_hooks.schemas import (
    HookDefinition,
    hook_detail,
    load_hook_definitions_with_errors,
)

logger = logging.getLogger(__name__)

CONFIG_KEY = "declarative_hooks"
DISABLE_ENV = "HERMES_DECLARATIVE_HOOKS"

# OpenHarness event name -> Hermes hook name, so upstream configs port directly.
EVENT_ALIASES: Dict[str, str] = {
    "pre_tool_use": "pre_tool_call",
    "post_tool_use": "post_tool_call",
    "session_start": "on_session_start",
    "session_end": "on_session_end",
    "pre_compact": "pre_llm_call",
    "stop": "pre_verify",
    "subagent_stop": "subagent_stop",
    "user_prompt_submit": "pre_llm_call",
}

# The only Hermes hook whose return value can veto the pending action.
BLOCKING_EVENT = "pre_tool_call"


def _disabled_by_env() -> bool:
    raw = os.environ.get(DISABLE_ENV, "").strip().lower()
    return raw in {"0", "false", "off", "no"}


def _load_raw_config() -> Any:
    try:
        from hermes_cli.config import load_config

        cfg = load_config() or {}
    except Exception as exc:  # noqa: BLE001
        logger.debug("declarative-hooks: config unavailable: %s", exc)
        return {}
    return cfg.get(CONFIG_KEY) or {}


def _normalize_events(
    definitions: Dict[str, List[HookDefinition]],
) -> Dict[str, List[HookDefinition]]:
    """Map aliased event names onto Hermes hook names, merging by priority."""
    from hermes_cli.plugins import VALID_HOOKS

    normalized: Dict[str, List[HookDefinition]] = {}
    for event, hooks in definitions.items():
        name = EVENT_ALIASES.get(event, event)
        if name not in VALID_HOOKS:
            logger.warning(
                "declarative-hooks: ignoring unknown event %r (valid: %s)",
                event,
                ", ".join(sorted(VALID_HOOKS)),
            )
            continue
        normalized.setdefault(name, []).extend(hooks)
    for hooks in normalized.values():
        hooks.sort(key=lambda hook: -hook.priority)
    return normalized


def make_hook_callback(
    event: str,
    hooks: List[HookDefinition],
    *,
    cwd: str = "",
    call_llm: Optional[Callable[..., Any]] = None,
) -> Callable[..., Optional[dict]]:
    """Build the Hermes hook callback that runs *hooks* for *event*."""

    def _callback(**kwargs: Any) -> Optional[dict]:
        payload = {k: v for k, v in kwargs.items() if k != "schema_version"}
        payload.setdefault("event", event)
        try:
            aggregated = execute_hooks(
                hooks, event, payload, cwd=cwd, call_llm=call_llm
            )
        except Exception as exc:  # noqa: BLE001 — a hook must never crash the agent
            logger.warning("declarative-hooks: %s execution failed: %s", event, exc)
            return None

        if not aggregated.blocked:
            return None
        reason = aggregated.reason or "blocked by a declarative hook"
        if event == BLOCKING_EVENT:
            return {"action": "block", "message": reason}
        # Other Hermes hook sites ignore return values; surface it in the log so
        # the operator can see the policy fired even though it can't veto here.
        logger.warning(
            "declarative-hooks: %s hook reported a block (advisory here): %s",
            event,
            reason,
        )
        return None

    return _callback


def register(ctx) -> None:
    if _disabled_by_env():
        logger.info("declarative-hooks: disabled via %s", DISABLE_ENV)
        return

    definitions, errors = load_hook_definitions_with_errors(_load_raw_config())
    for error in errors:
        logger.warning("declarative-hooks: skipping malformed hook %s", error)
    if not definitions:
        # No config -> zero registrations, zero behavior change.
        logger.debug("declarative-hooks: no %s config; nothing registered", CONFIG_KEY)
        return

    cwd = os.getcwd()
    registered = 0
    for event, hooks in _normalize_events(definitions).items():
        ctx.register_hook(event, make_hook_callback(event, hooks, cwd=cwd))
        registered += len(hooks)
        for hook in hooks:
            logger.debug(
                "declarative-hooks: %s <- %s (matcher=%s, priority=%d) %s",
                event,
                hook.type,
                hook.matcher or "*",
                hook.priority,
                hook_detail(hook)[:80],
            )
    logger.info("declarative-hooks: registered %d hook(s)", registered)
