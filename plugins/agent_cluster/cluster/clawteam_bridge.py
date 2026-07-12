"""ClawTeam MCP bridge — process-level reuse of the ClawTeam task substrate.

No ``import clawteam`` anywhere: ClawTeam is an external tool
(``pip install clawteam``). Its stdio MCP server (``clawteam-mcp``) is wired
into Hermes via ``mcp_servers.clawteam`` in config.yaml, which registers its
26 tools under the Hermes registry as ``mcp__<server>__<tool>``
(``tools/mcp_tool.py mcp_prefixed_tool_name``). This bridge dispatches those
tools through the same ``ctx.dispatch_tool`` path the plugin already uses for
``delegate_task``.

Workspace worktree create/merge/cleanup are CLI-only in ClawTeam (the MCP
workspace tools are read-only analysis), so those go through a ``clawteam``
subprocess — still zero Python import coupling.
"""
from __future__ import annotations

import json
import shutil
import subprocess
from typing import Any, Callable, Dict, List, Optional

INSTALL_HINT = (
    "ClawTeam bridge unavailable. Install and wire it up: "
    "1) pip install clawteam  "
    "2) add to Hermes config.yaml: mcp_servers.{server}.command: clawteam-mcp  "
    "3) restart Hermes so the mcp__{server}__* tools register."
)


class ClawTeamUnavailable(RuntimeError):
    def __init__(self, server: str, detail: str = "") -> None:
        message = INSTALL_HINT.format(server=server)
        if detail:
            message = f"{message} (detail: {detail})"
        super().__init__(message)


def _snake(key: str) -> str:
    out = []
    for ch in key:
        if ch.isupper():
            out.append("_")
            out.append(ch.lower())
        else:
            out.append(ch)
    return "".join(out)


def normalize_keys(value: Any) -> Any:
    """Recursively convert camelCase dict keys to snake_case.

    ClawTeam serializes pydantic models ``by_alias`` (camelCase JSON, e.g.
    ``blockedBy``); the plugin works in snake_case throughout.
    """
    if isinstance(value, dict):
        return {_snake(str(k)): normalize_keys(v) for k, v in value.items()}
    if isinstance(value, list):
        return [normalize_keys(item) for item in value]
    return value


class ClawTeamBridge:
    """Thin dispatcher over the clawteam MCP tool surface + workspace CLI."""

    def __init__(self, dispatch: Callable[[str, Dict[str, Any]], Any], server: str = "clawteam") -> None:
        self._dispatch = dispatch
        self.server = server

    def tool_name(self, tool: str) -> str:
        return f"mcp__{self.server}__{tool}"

    def call(self, tool: str, **args: Any) -> Any:
        """Dispatch one clawteam MCP tool; return parsed, snake_cased payload."""
        try:
            raw = self._dispatch(self.tool_name(tool), args)
        except Exception as exc:
            raise ClawTeamUnavailable(self.server, str(exc)) from exc
        return normalize_keys(self._parse(raw))

    @staticmethod
    def _parse(raw: Any) -> Any:
        if isinstance(raw, (dict, list)):
            return raw
        if isinstance(raw, str):
            text = raw.strip()
            if text.startswith(("{", "[")):
                try:
                    return json.loads(text)
                except Exception:
                    pass
            return text
        return raw

    def available(self) -> bool:
        """Probe the bridge with the cheapest read-only tool."""
        try:
            self.call("team_list")
            return True
        except Exception:
            return False

    # -- task board -----------------------------------------------------------

    def team_create(self, team: str, leader_name: str = "hermes-lead", leader_id: str = "hermes") -> Any:
        return self.call(
            "team_create", team_name=team, leader_name=leader_name, leader_id=leader_id,
            description="agent-cluster swarm team",
        )

    def member_add(self, team: str, name: str, agent_id: str, agent_type: str = "general-purpose") -> Any:
        return self.call(
            "team_member_add", team_name=team, member_name=name,
            agent_id=agent_id, agent_type=agent_type,
        )

    def task_create(
        self,
        team: str,
        subject: str,
        description: str = "",
        owner: str = "",
        priority: Optional[str] = None,
        blocked_by: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        args: Dict[str, Any] = {
            "team_name": team, "subject": subject, "description": description, "owner": owner,
        }
        if priority:
            args["priority"] = priority
        if blocked_by:
            args["blocked_by"] = blocked_by
        if metadata:
            args["metadata"] = metadata
        return self.call("task_create", **args)

    def task_update(self, team: str, task_id: str, **fields: Any) -> Dict[str, Any]:
        return self.call("task_update", team_name=team, task_id=task_id, **fields)

    def task_list(self, team: str, status: str = "", sort_by_priority: bool = False) -> List[Dict[str, Any]]:
        args: Dict[str, Any] = {"team_name": team}
        if status:
            args["status"] = status
        if sort_by_priority:
            args["sort_by_priority"] = True
        result = self.call("task_list", **args)
        return result if isinstance(result, list) else []

    def task_stats(self, team: str) -> Dict[str, Any]:
        result = self.call("task_stats", team_name=team)
        return result if isinstance(result, dict) else {}

    # -- workspace (CLI-only in ClawTeam) ---------------------------------------

    @staticmethod
    def cli_available() -> bool:
        return shutil.which("clawteam") is not None

    @staticmethod
    def _run_cli(args: List[str], cwd: Optional[str] = None) -> subprocess.CompletedProcess:
        return subprocess.run(
            ["clawteam", *args], capture_output=True, text=True, timeout=120, cwd=cwd,
        )

    def workspace_create(self, team: str, agent: str, repo: str) -> Dict[str, Any]:
        """Create a per-agent worktree; returns {ok, path?, branch?, error?}."""
        if not self.cli_available():
            return {"ok": False, "error": "clawteam CLI not on PATH"}
        proc = self._run_cli(["workspace", "create", team, agent], cwd=repo)
        if proc.returncode != 0:
            return {"ok": False, "error": (proc.stderr or proc.stdout).strip()[:500]}
        # Branch/path follow ClawTeam conventions: clawteam/{team}/{agent} at
        # ~/.clawteam/workspaces/{team}/{agent} — parse from output when
        # present, fall back to the convention.
        out = proc.stdout.strip()
        return {
            "ok": True,
            "branch": f"clawteam/{team}/{agent}",
            "output": out[:500],
        }

    def workspace_merge(self, team: str, agent: str, repo: str) -> Dict[str, Any]:
        if not self.cli_available():
            return {"ok": False, "error": "clawteam CLI not on PATH"}
        proc = self._run_cli(["workspace", "merge", team, agent], cwd=repo)
        ok = proc.returncode == 0
        return {
            "ok": ok,
            "output": (proc.stdout or "").strip()[:500],
            "error": None if ok else (proc.stderr or proc.stdout).strip()[:500],
        }

    def workspace_cleanup(self, team: str, agent: str, repo: str) -> Dict[str, Any]:
        if not self.cli_available():
            return {"ok": False, "error": "clawteam CLI not on PATH"}
        proc = self._run_cli(["workspace", "cleanup", team, agent], cwd=repo)
        ok = proc.returncode == 0
        return {"ok": ok, "error": None if ok else (proc.stderr or proc.stdout).strip()[:500]}
