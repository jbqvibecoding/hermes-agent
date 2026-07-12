"""Normalize Hermes tool-call args into (file_path, command, is_read_only).

Ported from OpenHarness' engine helpers (_resolve_permission_file_path /
_extract_permission_command), adapted to Hermes tool arg conventions.
"""

from __future__ import annotations

from pathlib import Path

# Hermes arg keys that carry a filesystem path.
_PATH_KEYS = ("file_path", "path", "root", "directory", "dir")

# Tools that never mutate state (permission-mode always allows them). Extended
# by operator config. Matched by exact name OR by a name substring below.
DEFAULT_READ_ONLY_TOOLS: frozenset[str] = frozenset({
    "read_file",
    "read",
    "grep",
    "glob",
    "ls",
    "list_dir",
    "web_search",
    "web",
    "view_image",
    "vision",
    "session_search",
    "tool_search",
    "tool_describe",
    "skills_list",
    "skill_view",
})

# Read-only if the tool name contains any of these tokens (covers the deferred
# camel_* research/search toolkits: search_*, *_scholar, arxiv_*, weather_*, …).
_READ_ONLY_SUBSTRINGS = (
    "search",
    "_read",
    "read_",
    "get_",
    "_get",
    "list_",
    "view_",
    "wiki",
    "scholar",
    "arxiv",
    "weather",
    "semantic",
)


def resolve_file_path(args: dict, cwd: str | None = None) -> str | None:
    """Return the absolute, resolved path referenced by *args*, if any."""
    base = Path(cwd).expanduser() if cwd else Path.cwd()
    for key in _PATH_KEYS:
        value = args.get(key)
        if isinstance(value, str) and value.strip():
            path = Path(value).expanduser()
            if not path.is_absolute():
                path = base / path
            try:
                return str(path.resolve())
            except (OSError, RuntimeError):
                return str(path)
    return None


def extract_command(args: dict) -> str | None:
    """Return the shell command referenced by *args*, if any."""
    for key in ("command", "cmd", "script"):
        value = args.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return None


def is_read_only(tool_name: str, extra_read_only: frozenset[str] = frozenset()) -> bool:
    """Best-effort read-only classification for permission gating."""
    name = (tool_name or "").lower()
    if name in DEFAULT_READ_ONLY_TOOLS or name in extra_read_only:
        return True
    return any(token in name for token in _READ_ONLY_SUBSTRINGS)
