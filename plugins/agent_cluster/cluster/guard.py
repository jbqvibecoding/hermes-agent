"""Dangerous-command interception — port of AgentHub's PreToolUse
``forbidden-commands.sh`` hook to Hermes' ``pre_tool_call`` plugin hook.

Rules (from AgentHub .knowledge/company/hook-templates/forbidden-commands.sh):
- kill-port / taskkill node / Stop-Process node — mass process kills
- ``--no-verify`` — bypassing verification hooks
- force-push to main/master (hardened: also catches ``-f`` and flag-after-ref)

Every decision is appended to ``<data_dir>/guard-log.jsonl`` (the plugin's
equivalent of AgentHub's ``.claude/hook-execution.jsonl`` audit trail).
The hook blocks in-process for the main agent AND every delegated child.
"""
from __future__ import annotations

import json
import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

# Tools whose arguments carry a shell command to inspect.
COMMAND_TOOLS = {"terminal", "code_execution"}
_COMMAND_KEYS = ("command", "cmd", "code")

_FORCE_PUSH_RE = re.compile(
    r"git\s+push\b(?=[^\n]*(?:--force(?:-with-lease)?|\s-f\b))(?=[^\n]*\b(main|master)\b)",
    re.I,
)

RULES: List[Dict[str, Any]] = [
    {
        "id": "kill-port",
        "pattern": re.compile(r"kill-port|taskkill[^\n]*node|Stop-Process[^\n]*node", re.I),
        "message": (
            "Blocked by agent-cluster guard: kill-port/taskkill/Stop-Process "
            "targeting node is forbidden (multiple projects share this host — "
            "no mass process kills). Stop the specific process you own instead."
        ),
    },
    {
        "id": "no-verify",
        "pattern": re.compile(r"--no-verify\b"),
        "message": (
            "Blocked by agent-cluster guard: --no-verify is forbidden — fix "
            "the failing hook instead of bypassing it."
        ),
    },
    {
        "id": "force-push-main",
        "pattern": _FORCE_PUSH_RE,
        "message": (
            "Blocked by agent-cluster guard: force-pushing to main/master is "
            "forbidden."
        ),
    },
]

_log_lock = threading.Lock()


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def extract_command(tool_name: str, args: Optional[Dict[str, Any]]) -> str:
    if tool_name not in COMMAND_TOOLS or not isinstance(args, dict):
        return ""
    for key in _COMMAND_KEYS:
        value = args.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return ""


def check_command(command: str) -> Optional[Dict[str, str]]:
    """Return {id, message} for the first violated rule, else None."""
    for rule in RULES:
        if rule["pattern"].search(command):
            return {"id": rule["id"], "message": rule["message"]}
    return None


class Guard:
    def __init__(self, data_dir: Path, enabled: bool = True) -> None:
        self.log_path = Path(data_dir) / "guard-log.jsonl"
        self.enabled = enabled

    def _log(self, result: str, rule_id: str, tool_name: str, command: str) -> None:
        entry = {
            "hook": "forbidden-commands",
            "type": "pre_tool_call",
            "result": result,
            "rule": rule_id,
            "tool": tool_name,
            "command": command[:500],
            "ts": _utc_now(),
        }
        try:
            with _log_lock:
                self.log_path.parent.mkdir(parents=True, exist_ok=True)
                with self.log_path.open("a", encoding="utf-8") as handle:
                    handle.write(json.dumps(entry, ensure_ascii=False) + "\n")
        except Exception:
            pass  # auditing must never break tool dispatch

    def pre_tool_call(self, tool_name: str = "", args: Optional[Dict[str, Any]] = None, **kwargs) -> Optional[Dict[str, str]]:
        """``pre_tool_call`` hook callback.

        Returns ``{"action": "block", "message": ...}`` to deny (the contract
        checked by ``hermes_cli.plugins.get_pre_tool_call_block_message``),
        or None to allow.
        """
        if not self.enabled:
            return None
        command = extract_command(str(tool_name or ""), args)
        if not command:
            return None
        violation = check_command(command)
        if violation:
            self._log("blocked", violation["id"], tool_name, command)
            return {"action": "block", "message": violation["message"]}
        self._log("passed", "", tool_name, command)
        return None
