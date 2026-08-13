"""Read Claude Code / Codex native ``hooks.json`` files.

Ported from DeepSeek Harness (``dsh``, MIT) — ``packages/hooks/hook-protocol``
(``codec.ts``, ``merge.ts``, ``matcher.ts``).

Why this exists
---------------
The rest of this plugin is Hermes' own four-type hook model (command / prompt /
http / agent, ported from OpenHarness). This module adds a *second source*
beside it: the hook files those two products already write. A user arriving with
a working ``hooks.json`` can point Hermes at it instead of translating it by
hand.

The details below look fussy, and that is the point — they are the behaviours
you only learn by reading a real implementation, and guessing at them produces a
reader that is subtly wrong in the cases that matter (a block that does not
block, a matcher that fires on the wrong tool).

Scope
-----
``command`` hooks only, matching dsh, which parses the other types and skips
them with a warning. Hermes' own four-type model remains the way to express a
prompt/http/agent hook.

Two honest limits
-----------------
* ``allow`` does **not** mean "pre-authorised" here. In Claude Code it skips the
  permission prompt; Hermes has no mechanism for a hook to waive a downstream
  gate, so ``allow`` degrades to "this hook raises no objection" and the
  ordinary approval path still runs. Deny and ask map exactly; allow does not.
* Only ``pre_tool_call`` can act on a decision at all — it is the one Hermes
  hook whose return value is read. On any other event a decision is recorded
  and logged, not enforced. That is a property of Hermes' hook sites, not of
  this decoder.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

logger = logging.getLogger(__name__)

# Dialects.
CLAUDE_CODE = "claude_code"
CODEX = "codex"
DIALECTS = (CLAUDE_CODE, CODEX)

# Decision levels, weakest to strongest.
NONE = "none"
ALLOW = "allow"
ASK = "ask"
DENY = "deny"

_PRECEDENCE: Dict[str, int] = {NONE: 0, ALLOW: 1, ASK: 2, DENY: 3}

# The exit code that means "block", as opposed to "this hook failed".
BLOCKING_EXIT_CODE = 2

# Claude Code event names -> Hermes hook names.
CLAUDE_EVENT_ALIASES: Dict[str, str] = {
    "PreToolUse": "pre_tool_call",
    "PostToolUse": "post_tool_call",
    "SessionStart": "on_session_start",
    "SessionEnd": "on_session_end",
    "UserPromptSubmit": "pre_llm_call",
    "PreCompact": "pre_llm_call",
    "Stop": "pre_verify",
    "SubagentStop": "subagent_stop",
}

# Codex uses snake_case event names.
CODEX_EVENT_ALIASES: Dict[str, str] = {
    "pre_tool_use": "pre_tool_call",
    "post_tool_use": "post_tool_call",
    "session_start": "on_session_start",
    "session_end": "on_session_end",
    "user_prompt_submit": "pre_llm_call",
    "stop": "pre_verify",
    "subagent_stop": "subagent_stop",
}

# A Claude Code matcher made only of these characters is read as a literal list
# of alternatives separated by '|', NOT as a regex. "Write|Edit" therefore means
# exactly those two tool names — not the regex alternation that would also match
# "Rewrite". Anything containing another character is treated as a regex.
_LITERAL_MATCHER_RE = re.compile(r"^[A-Za-z0-9_|]+$")

_MATCH_ALL = {None, "", "*"}


class NativeHookConfigError(ValueError):
    """A native hooks file is malformed.

    Raised while *parsing*, never while matching. An invalid regex is a
    configuration mistake the operator should hear about when the file loads,
    not a silent non-match discovered later at a moment nobody is watching.
    """


# ---------------------------------------------------------------------------
# Matcher
# ---------------------------------------------------------------------------


def compile_matcher(
    pattern: Optional[str], *, dialect: str = CLAUDE_CODE
) -> Callable[[str], bool]:
    """Compile a matcher into a predicate over the event subject.

    The two products differ, and the difference is observable:

    * Claude Code treats a pattern of only ``[A-Za-z0-9_|]`` as a literal
      pipe-separated list; everything else is an unanchored regex.
    * Codex always compiles a regex.

    Missing, empty and ``"*"`` match everything in both.
    """
    if pattern in _MATCH_ALL:
        return lambda _subject: True

    text = str(pattern)

    if dialect == CLAUDE_CODE and _LITERAL_MATCHER_RE.match(text):
        alternatives = {part for part in text.split("|") if part}
        return lambda subject: subject in alternatives

    try:
        compiled = re.compile(text)
    except re.error as exc:
        raise NativeHookConfigError(f"invalid matcher regex {text!r}: {exc}") from exc
    # Unanchored: both products use a search, not a full match.
    return lambda subject: compiled.search(subject or "") is not None


# ---------------------------------------------------------------------------
# Codec
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class HookDecision:
    """One hook's verdict, decoded from its exit code and stdout/stderr."""

    permission: str = NONE
    reason: str = ""
    continue_: Optional[bool] = None
    stop_reason: str = ""
    # Facts worth keeping even when they did not affect the outcome — notably a
    # hookSpecificOutput whose hookEventName did not match, which is dropped
    # from the decision but retained here so a confused operator can find out
    # why their hook did nothing.
    audit: Tuple[str, ...] = ()

    def blocks(self) -> bool:
        return self.permission == DENY

    def asks(self) -> bool:
        return self.permission == ASK


def _lenient_json(stdout: str) -> Tuple[Optional[Dict[str, Any]], str]:
    """Parse stdout as JSON only when it looks like JSON.

    Returns ``(parsed_or_None, audit_note)``. A clean exit whose stdout is not
    valid JSON is **not** an error: plenty of hooks print human-readable text
    and mean nothing structured by it. Treating that as a failure would make
    ordinary logging hooks look broken.
    """
    text = (stdout or "").lstrip()
    if not text.startswith("{"):
        return None, ""
    try:
        parsed = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return None, "stdout began with '{' but was not valid JSON; ignored"
    if not isinstance(parsed, dict):
        return None, "stdout JSON was not an object; ignored"
    return parsed, ""


def decode_hook_output(
    exit_code: int,
    stdout: str = "",
    stderr: str = "",
    *,
    event: str = "",
) -> HookDecision:
    """Turn one hook process's result into a decision.

    Exit code first:

    * ``2`` blocks, and **stderr** carries the reason. This is the channel a
      shell script can use without emitting any JSON at all.
    * ``0`` may carry a structured decision on stdout.
    * anything else is a hook that failed. A broken hook must not silently
      become a block — it is recorded and otherwise ignored.
    """
    audit: List[str] = []

    if exit_code == BLOCKING_EXIT_CODE:
        reason = (stderr or "").strip() or "blocked by hook (exit code 2)"
        return HookDecision(permission=DENY, reason=reason)

    if exit_code != 0:
        note = (stderr or "").strip()
        return HookDecision(
            permission=NONE,
            audit=(f"hook exited {exit_code}" + (f": {note}" if note else ""),),
        )

    parsed, note = _lenient_json(stdout)
    if note:
        audit.append(note)
    if parsed is None:
        return HookDecision(permission=NONE, audit=tuple(audit))

    permission = NONE
    reason = ""

    # Channel 1 — the legacy top-level decision. Only these two words count;
    # anything else is not a decision, however decisive it sounds.
    legacy = parsed.get("decision")
    if legacy == "block":
        permission = DENY
        reason = str(parsed.get("reason") or "").strip()
    elif legacy == "approve":
        permission = ALLOW
        reason = str(parsed.get("reason") or "").strip()
    elif legacy is not None:
        audit.append(f"unrecognised decision {legacy!r}; ignored")

    # Channel 2 — hookSpecificOutput. Deliberately separate from channel 1 and
    # folded in afterwards, because it is gated on the event discriminator.
    specific = parsed.get("hookSpecificOutput")
    if isinstance(specific, dict):
        declared_event = specific.get("hookEventName")
        if declared_event and event and declared_event != event:
            # The payload is describing a different event than the one that
            # fired. Its event-scoped fields are discarded — but the
            # discriminator is kept, because "your hook answered for
            # PostToolUse while PreToolUse was firing" is exactly the fact an
            # operator needs and would otherwise never see.
            audit.append(
                f"hookSpecificOutput declared hookEventName={declared_event!r} "
                f"but {event!r} fired; event-scoped fields dropped"
            )
        else:
            decision = specific.get("permissionDecision")
            if decision in (ALLOW, DENY, ASK):
                if _PRECEDENCE[decision] >= _PRECEDENCE[permission]:
                    permission = decision
                    specific_reason = str(
                        specific.get("permissionDecisionReason") or ""
                    ).strip()
                    reason = specific_reason or reason
            elif decision is not None:
                audit.append(f"unrecognised permissionDecision {decision!r}; ignored")

    continue_ = parsed.get("continue")
    continue_flag = continue_ if isinstance(continue_, bool) else None

    return HookDecision(
        permission=permission,
        reason=reason,
        continue_=continue_flag,
        stop_reason=str(parsed.get("stopReason") or "").strip(),
        audit=tuple(audit),
    )


# ---------------------------------------------------------------------------
# Merge
# ---------------------------------------------------------------------------


def merge_decisions(decisions: Sequence[HookDecision]) -> HookDecision:
    """Combine several hooks' decisions into one.

    ``deny > ask > allow > none``, and only the winning level's reasons are
    kept. That last part matters: showing the user why an *allow* hook was
    happy, next to the deny that actually stopped them, reads as though the
    allow were part of the explanation.

    ``continue: false`` is first-wins — the first hook to halt the turn owns the
    stop reason, and a later one cannot overwrite the account of why things
    stopped.
    """
    if not decisions:
        return HookDecision()

    winner = max(
        (_PRECEDENCE.get(d.permission, 0) for d in decisions),
        default=0,
    )
    permission = next(
        (level for level, rank in _PRECEDENCE.items() if rank == winner), NONE
    )

    reasons: List[str] = []
    for decision in decisions:
        if _PRECEDENCE.get(decision.permission, 0) == winner and decision.reason:
            if decision.reason not in reasons:
                reasons.append(decision.reason)

    continue_flag: Optional[bool] = None
    stop_reason = ""
    for decision in decisions:
        if decision.continue_ is False:
            continue_flag = False
            stop_reason = decision.stop_reason
            break  # first-wins
        if decision.continue_ is True and continue_flag is None:
            continue_flag = True

    audit: List[str] = []
    for decision in decisions:
        audit.extend(decision.audit)

    return HookDecision(
        permission=permission,
        reason="; ".join(reasons),
        continue_=continue_flag,
        stop_reason=stop_reason,
        audit=tuple(audit),
    )


def to_directive(decision: HookDecision) -> Optional[Dict[str, Any]]:
    """Map a merged decision onto Hermes' ``pre_tool_call`` directive contract.

    ``deny`` vetoes; ``ask`` escalates to the human-approval gate — the same
    ``[o]nce/[s]ession/[a]lways/[d]eny`` prompt Tier-2 dangerous commands use.
    ``allow`` and ``none`` both return ``None``: see the module docstring on why
    ``allow`` cannot mean "pre-authorised" here.
    """
    if decision.permission == DENY:
        return {
            "action": "block",
            "message": decision.reason or "blocked by a native hook",
        }
    if decision.permission == ASK:
        return {
            "action": "approve",
            "message": decision.reason or "a native hook requested confirmation",
            "rule_key": "native_hook",
        }
    return None


# ---------------------------------------------------------------------------
# Loading a hooks file
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class NativeCommandHook:
    """One ``command`` entry from a native hooks file."""

    command: str
    matcher: Optional[str] = None
    timeout_seconds: int = 60
    dialect: str = CLAUDE_CODE
    source_event: str = ""
    _predicate: Optional[Callable[[str], bool]] = field(default=None, compare=False)

    def matches(self, subject: str) -> bool:
        if self._predicate is None:
            return True
        return self._predicate(subject or "")


def _iter_hook_entries(group: Any) -> List[Dict[str, Any]]:
    """Yield the ``hooks: [...]`` entries of one matcher group."""
    if not isinstance(group, dict):
        return []
    entries = group.get("hooks")
    if not isinstance(entries, list):
        return []
    return [entry for entry in entries if isinstance(entry, dict)]


def load_native_hooks(
    data: Any, *, dialect: str = CLAUDE_CODE
) -> Dict[str, List[NativeCommandHook]]:
    """Parse a native hooks document into Hermes-keyed command hooks.

    Accepts either the whole settings object (with a top-level ``hooks`` key,
    as Claude Code's ``settings.json`` has) or the hooks map on its own.

    Raises :class:`NativeHookConfigError` on an invalid matcher regex, because
    a hooks file that cannot be matched against is a broken hooks file and the
    operator should be told at load time.
    """
    if dialect not in DIALECTS:
        raise NativeHookConfigError(
            f"unknown hooks dialect {dialect!r} (expected one of {', '.join(DIALECTS)})"
        )

    if isinstance(data, dict) and isinstance(data.get("hooks"), dict):
        data = data["hooks"]
    if not isinstance(data, dict):
        return {}

    aliases = CLAUDE_EVENT_ALIASES if dialect == CLAUDE_CODE else CODEX_EVENT_ALIASES

    try:
        from hermes_cli.plugins import VALID_HOOKS
    except Exception:  # pragma: no cover - only in a stripped environment
        VALID_HOOKS = set()

    loaded: Dict[str, List[NativeCommandHook]] = {}
    for raw_event, groups in data.items():
        hermes_event = aliases.get(raw_event, raw_event)
        if VALID_HOOKS and hermes_event not in VALID_HOOKS:
            logger.warning("native hooks: ignoring unsupported event %r", raw_event)
            continue
        if not isinstance(groups, list):
            continue
        for group in groups:
            matcher = group.get("matcher") if isinstance(group, dict) else None
            predicate = compile_matcher(matcher, dialect=dialect)
            for entry in _iter_hook_entries(group):
                entry_type = entry.get("type", "command")
                if entry_type != "command":
                    # dsh does the same: parse it, then decline to run it.
                    logger.warning(
                        "native hooks: %s hook of type %r is not supported; "
                        "use Hermes' own declarative_hooks config for that type",
                        raw_event,
                        entry_type,
                    )
                    continue
                command = str(entry.get("command") or "").strip()
                if not command:
                    continue
                timeout = entry.get("timeout")
                try:
                    timeout_seconds = max(1, min(600, int(timeout)))
                except (TypeError, ValueError):
                    timeout_seconds = 60
                loaded.setdefault(hermes_event, []).append(
                    NativeCommandHook(
                        command=command,
                        matcher=matcher,
                        timeout_seconds=timeout_seconds,
                        dialect=dialect,
                        source_event=raw_event,
                        _predicate=predicate,
                    )
                )
    return loaded


# ---------------------------------------------------------------------------
# Running them
# ---------------------------------------------------------------------------


def subject_for(payload: Dict[str, Any]) -> str:
    """The string a matcher is tested against.

    For a tool event that is the tool name — which is what both products'
    matchers are written for.
    """
    if not isinstance(payload, dict):
        return ""
    return str(payload.get("tool_name") or payload.get("event") or "")


def run_native_hooks(
    hooks: Sequence[NativeCommandHook],
    event: str,
    payload: Dict[str, Any],
    *,
    cwd: str = "",
    runner: Optional[Callable[..., Tuple[int, str, str]]] = None,
) -> HookDecision:
    """Run the hooks whose matcher selects this payload and merge their verdicts.

    The payload reaches the hook on **stdin** as JSON, which is how both
    products invoke theirs — so an existing script that reads stdin works
    unchanged.

    Never raises. A hook that times out or cannot be spawned contributes an
    audit note and no decision: a broken hook must not become a silent block,
    and it must not take the turn down with it either.
    """
    subject = subject_for(payload)
    selected = [hook for hook in hooks if hook.matches(subject)]
    if not selected:
        return HookDecision()

    try:
        payload_json = json.dumps(payload, default=str)
    except (TypeError, ValueError):
        payload_json = "{}"

    execute = runner or _spawn_hook
    decisions: List[HookDecision] = []
    for hook in selected:
        try:
            exit_code, stdout, stderr = execute(
                hook.command,
                payload_json=payload_json,
                cwd=cwd,
                event=hook.source_event or event,
                timeout=hook.timeout_seconds,
            )
        except Exception as exc:  # noqa: BLE001 — a hook must never crash the agent
            decisions.append(
                HookDecision(audit=(f"hook {hook.command!r} could not run: {exc}",))
            )
            continue
        decisions.append(
            decode_hook_output(
                exit_code, stdout, stderr, event=hook.source_event or event
            )
        )

    merged = merge_decisions(decisions)
    for note in merged.audit:
        logger.warning("native hooks: %s (%s)", note, event)
    return merged


def _spawn_hook(
    command: str,
    *,
    payload_json: str,
    cwd: str,
    event: str,
    timeout: int,
) -> Tuple[int, str, str]:
    """Run one hook command, feeding the payload on stdin."""
    import os
    import subprocess

    env = {
        **os.environ,
        "HERMES_HOOK_EVENT": event,
        "CLAUDE_HOOK_EVENT": event,
    }
    try:
        proc = subprocess.run(
            command,
            shell=True,
            cwd=cwd or None,
            env=env,
            input=payload_json,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        # Not a block. A hook that hangs has told us nothing, and inventing a
        # verdict on its behalf is worse than proceeding without one.
        return 1, "", f"hook timed out after {timeout}s"
    return proc.returncode, proc.stdout or "", proc.stderr or ""


__all__ = [
    "ALLOW",
    "ASK",
    "BLOCKING_EXIT_CODE",
    "CLAUDE_CODE",
    "CLAUDE_EVENT_ALIASES",
    "CODEX",
    "CODEX_EVENT_ALIASES",
    "DENY",
    "DIALECTS",
    "NONE",
    "HookDecision",
    "NativeCommandHook",
    "NativeHookConfigError",
    "compile_matcher",
    "decode_hook_output",
    "load_native_hooks",
    "merge_decisions",
    "run_native_hooks",
    "subject_for",
    "to_directive",
]
