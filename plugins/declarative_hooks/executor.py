"""Declarative hook execution (ported from OpenHarness ``hooks/executor.py``).

Adaptation from upstream: Hermes' plugin hook callbacks are *synchronous*, so
the async executor is rewritten with ``subprocess.run`` / ``httpx.Client``, and
the ``prompt`` / ``agent`` hooks call Hermes' host LLM entrypoint
(``agent.auxiliary_client.call_llm``) instead of a bespoke API client — a
declarative hook therefore needs no provider credentials of its own. The
matching, ``$ARGUMENTS`` injection and tolerant verdict parsing are ported
verbatim in behavior.
"""

from __future__ import annotations

import fnmatch
import json
import logging
import os
import shlex
import subprocess
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

from plugins.declarative_hooks.schemas import (
    AgentHookDefinition,
    CommandHookDefinition,
    HookDefinition,
    HttpHookDefinition,
    PromptHookDefinition,
)

logger = logging.getLogger(__name__)

MAX_OUTPUT_CHARS = 4000

_VERDICT_SYSTEM = (
    "You are validating whether a hook condition passes in Hermes. "
    'Return strict JSON: {"ok": true} or {"ok": false, "reason": "..."}.'
)
_AGENT_SUFFIX = " Be more thorough and reason over the payload before deciding."


@dataclass(frozen=True)
class HookResult:
    """Result of one hook execution."""

    hook_type: str
    success: bool
    output: str = ""
    blocked: bool = False
    reason: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AggregatedHookResult:
    """Aggregated results for one event firing."""

    results: List[HookResult] = field(default_factory=list)

    @property
    def blocked(self) -> bool:
        return any(result.blocked for result in self.results)

    @property
    def reason(self) -> str:
        for result in self.results:
            if result.blocked:
                return result.reason or result.output
        return ""


def matches_hook(hook: HookDefinition, payload: Dict[str, Any]) -> bool:
    """Return whether *hook*'s matcher selects this payload (fnmatch)."""
    matcher = getattr(hook, "matcher", None)
    if not matcher:
        return True
    subject = str(
        payload.get("tool_name") or payload.get("prompt") or payload.get("event") or ""
    )
    return fnmatch.fnmatch(subject, matcher)


def inject_arguments(
    template: str, payload: Dict[str, Any], *, shell_escape: bool = False
) -> str:
    """Substitute ``$ARGUMENTS`` with the JSON payload (shell-quoted on demand)."""
    try:
        serialized = json.dumps(payload, ensure_ascii=True, default=str)
    except (TypeError, ValueError):
        serialized = "{}"
    if shell_escape:
        serialized = shlex.quote(serialized)
    return template.replace("$ARGUMENTS", serialized)


def parse_hook_json(text: str) -> Dict[str, Any]:
    """Tolerantly parse a hook verdict into ``{"ok": bool, "reason": str}``."""
    stripped = (text or "").strip()
    try:
        parsed = json.loads(stripped)
        if isinstance(parsed, dict) and isinstance(parsed.get("ok"), bool):
            return parsed
    except json.JSONDecodeError:
        pass
    lowered = stripped.lower()
    if lowered in {"ok", "true", "yes"}:
        return {"ok": True}
    return {"ok": False, "reason": stripped or "hook returned invalid JSON"}


def _host_call_llm(**kwargs: Any) -> Any:
    """Default LLM entrypoint: Hermes' host model (no plugin-owned keys)."""
    from agent.auxiliary_client import call_llm

    return call_llm(**kwargs)


def _truncate(text: str) -> str:
    if len(text) <= MAX_OUTPUT_CHARS:
        return text
    return text[:MAX_OUTPUT_CHARS] + f"\n... (truncated, {len(text)} chars)"


def _payload_json(payload: Dict[str, Any]) -> str:
    try:
        return json.dumps(payload, default=str)
    except (TypeError, ValueError):
        return "{}"


def _run_command_hook(
    hook: CommandHookDefinition, event: str, payload: Dict[str, Any], *, cwd: str
) -> HookResult:
    command = inject_arguments(hook.command, payload, shell_escape=True)
    env = {
        **os.environ,
        "HERMES_HOOK_EVENT": event,
        "HERMES_HOOK_PAYLOAD": _payload_json(payload),
    }
    try:
        proc = subprocess.run(
            command,
            shell=True,
            cwd=cwd or None,
            env=env,
            capture_output=True,
            text=True,
            timeout=hook.timeout_seconds,
        )
    except subprocess.TimeoutExpired:
        return HookResult(
            hook_type=hook.type,
            success=False,
            blocked=hook.block_on_failure,
            reason=f"command hook timed out after {hook.timeout_seconds}s",
        )
    except Exception as exc:  # noqa: BLE001 — a broken hook must not crash the agent
        return HookResult(
            hook_type=hook.type,
            success=False,
            blocked=hook.block_on_failure,
            reason=str(exc),
        )

    output = "\n".join(
        part
        for part in ((proc.stdout or "").strip(), (proc.stderr or "").strip())
        if part
    )
    success = proc.returncode == 0
    return HookResult(
        hook_type=hook.type,
        success=success,
        output=_truncate(output),
        blocked=hook.block_on_failure and not success,
        reason=_truncate(output)
        or f"command hook failed with exit code {proc.returncode}",
        metadata={"returncode": proc.returncode},
    )


def _run_http_hook(
    hook: HttpHookDefinition, event: str, payload: Dict[str, Any]
) -> HookResult:
    try:
        import httpx

        with httpx.Client(timeout=hook.timeout_seconds) as client:
            response = client.post(
                hook.url,
                json={"event": event, "payload": payload},
                headers=hook.headers or None,
            )
        success = response.is_success
        output = _truncate(response.text or "")
        return HookResult(
            hook_type=hook.type,
            success=success,
            output=output,
            blocked=hook.block_on_failure and not success,
            reason=output or f"http hook returned {response.status_code}",
            metadata={"status_code": response.status_code},
        )
    except Exception as exc:  # noqa: BLE001
        return HookResult(
            hook_type=hook.type,
            success=False,
            blocked=hook.block_on_failure,
            reason=str(exc),
        )


def _response_text(response: Any) -> str:
    """Pull the assistant text out of an OpenAI-shaped ``call_llm`` response."""
    try:
        content = response.choices[0].message.content
    except (AttributeError, IndexError, TypeError):
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):  # some providers return content blocks
        return "".join(
            part.get("text", "")
            for part in content
            if isinstance(part, dict) and part.get("type") == "text"
        )
    return ""


def _run_prompt_like_hook(
    hook: Any,
    event: str,
    payload: Dict[str, Any],
    *,
    agent_mode: bool,
    call_llm: Callable[..., Any],
) -> HookResult:
    prompt = inject_arguments(hook.prompt, payload)
    system = _VERDICT_SYSTEM + (_AGENT_SUFFIX if agent_mode else "")
    kwargs: Dict[str, Any] = {
        "task": "compression",
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 512,
        "timeout": hook.timeout_seconds,
    }
    if hook.model:
        kwargs["model"] = hook.model
    try:
        text = _response_text(call_llm(**kwargs))
    except Exception as exc:  # noqa: BLE001
        return HookResult(
            hook_type=hook.type,
            success=False,
            blocked=hook.block_on_failure,
            reason=f"{hook.type} hook LLM call failed: {exc}",
        )

    parsed = parse_hook_json(text)
    if parsed.get("ok"):
        return HookResult(hook_type=hook.type, success=True, output=_truncate(text))
    return HookResult(
        hook_type=hook.type,
        success=False,
        output=_truncate(text),
        blocked=hook.block_on_failure,
        reason=str(parsed.get("reason") or "hook rejected the event"),
    )


def run_hook(
    hook: HookDefinition,
    event: str,
    payload: Dict[str, Any],
    *,
    cwd: str = "",
    call_llm: Optional[Callable[..., Any]] = None,
) -> HookResult:
    """Execute a single hook definition and return its result."""
    if isinstance(hook, CommandHookDefinition):
        return _run_command_hook(hook, event, payload, cwd=cwd)
    if isinstance(hook, HttpHookDefinition):
        return _run_http_hook(hook, event, payload)
    if isinstance(hook, (PromptHookDefinition, AgentHookDefinition)):
        return _run_prompt_like_hook(
            hook,
            event,
            payload,
            agent_mode=isinstance(hook, AgentHookDefinition),
            call_llm=call_llm or _host_call_llm,
        )
    return HookResult(hook_type=getattr(hook, "type", "?"), success=True)


def execute_hooks(
    hooks: List[HookDefinition],
    event: str,
    payload: Dict[str, Any],
    *,
    cwd: str = "",
    call_llm: Optional[Callable[..., Any]] = None,
) -> AggregatedHookResult:
    """Run every matching hook for *event* in order, stopping at the first block."""
    results: List[HookResult] = []
    for hook in hooks:
        if not matches_hook(hook, payload):
            continue
        result = run_hook(hook, event, payload, cwd=cwd, call_llm=call_llm)
        results.append(result)
        if result.blocked:
            # A block is terminal: later hooks can't un-block, and skipping them
            # avoids side effects for an action that is already vetoed.
            break
    return AggregatedHookResult(results=results)
