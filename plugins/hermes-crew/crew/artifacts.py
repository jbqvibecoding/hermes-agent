"""The files a teammate actually produced, pinned to the thread that asked.

Until this existed a teammate could spend ten minutes building a deck and the
only trace was a paragraph saying it had. The file was real — it was sitting in
the container's ``/workspace`` — but nothing in the product knew, so nobody
could open it.

Ported in vocabulary from octop's
``infra/agents/middleware/thread_artifacts.py`` (MIT): the structured path keys,
the "does this look like a file name" predicate, and the rule that a tool result
is scanned for paths only when the arguments did not yield one.

**Where we had to diverge, and it is the whole point.** octop only looks at
tools on an allow-list — ``write_file``, ``edit_file``, ``send_file``,
``desktop_screenshot``. That is right for a product whose agent writes files by
calling a file tool. Ours does not: asked for a deck, a teammate writes
``make_deck.py`` and runs it, and the ``.pptx`` appears as a side effect of a
``terminal`` call whose result says nothing about it. A tool-name allow-list
would miss the exact case the operator cares about.

So the workspace is the source of truth. After a turn we look at what is on
disk and newer than the turn started, and that is the delivery. A file that
exists was produced, whatever produced it; a claim with no file behind it is not
a delivery no matter how the tool call was spelled.
"""

from __future__ import annotations

import json
import logging
import re
import sqlite3
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any, Optional

log = logging.getLogger(__name__)

#: Tools whose arguments name a file directly. Kept from octop because when one
#: of these *is* used, its arguments are a better answer than a disk scan: they
#: say which file this particular call was about.
ARTIFACT_TOOL_BASES = frozenset({
    "write_file", "edit_file", "patch_file", "create_file",
    "send_file", "send_file_to_user", "save_file", "download_file",
})

#: octop's key list, plus the ones Hermes's own file tools use.
_PATH_KEYS = ("path", "file_path", "filepath", "dest", "target_path", "output_path", "filename")

#: "Looks like a file name": a short extension at the end. Deliberately loose —
#: the workspace scan is what decides, and this only stops a directory or a bare
#: number from being filed as a deliverable.
_PATH_EXT_RE = re.compile(r"\.[A-Za-z][A-Za-z0-9._+-]{0,11}$")

#: Never offered as a deliverable. Screenshots have their own route and their
#: own chip; the rest is the machinery a teammate leaves behind, and an operator
#: who asked for a report does not want `__pycache__` in the list.
_IGNORED_DIRS = frozenset({
    "screenshots", "__pycache__", ".git", ".cache", "node_modules",
    ".venv", "venv", ".ipynb_checkpoints", ".pytest_cache",
})
_IGNORED_SUFFIXES = (".pyc", ".pyo", ".log", ".tmp", ".swp", ".part", ".crdownload")

#: How deep to walk. A teammate that buried its deliverable eight levels down
#: has a different problem, and an unbounded walk over a workspace somebody
#: cloned a repo into would stall the turn.
_MAX_DEPTH = 4
_MAX_FILES = 200

#: What the file panel calls each kind. Not a MIME type: the operator is being
#: told what they are about to open, not what to parse it with.
_KINDS: tuple[tuple[str, frozenset[str]], ...] = (
    ("slides", frozenset({".pptx", ".ppt", ".key", ".odp"})),
    ("document", frozenset({".docx", ".doc", ".odt", ".rtf", ".pdf"})),
    ("sheet", frozenset({".xlsx", ".xls", ".ods", ".csv", ".tsv"})),
    ("image", frozenset({".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"})),
    ("data", frozenset({".json", ".yaml", ".yml", ".xml", ".parquet"})),
    ("text", frozenset({".md", ".txt", ".html", ".htm"})),
    ("code", frozenset({".py", ".js", ".ts", ".sh", ".sql", ".r", ".ipynb"})),
    ("archive", frozenset({".zip", ".tar", ".gz", ".7z"})),
)


def kind_of(rel_path: str) -> str:
    suffix = Path(rel_path).suffix.lower()
    for kind, suffixes in _KINDS:
        if suffix in suffixes:
            return kind
    return "file"


def tool_name_base(name: str) -> str:
    trimmed = (name or "").strip()
    slash = trimmed.rfind("/")
    return trimmed[slash + 1:] if slash >= 0 else trimmed


def is_artifact_tool(name: Optional[str]) -> bool:
    return tool_name_base(name or "").lower() in ARTIFACT_TOOL_BASES


def looks_like_a_file(path: str) -> bool:
    """Is this a name somebody could open? Not whether it exists."""
    cleaned = (path or "").strip().replace("\\", "/")
    if not cleaned or cleaned in {".", "/"}:
        return False
    base = cleaned.rstrip("/").split("/")[-1] or cleaned
    if re.fullmatch(r"[\d.]+", base):
        return False
    return bool(_PATH_EXT_RE.search(base))


def extract_paths(tool_name: str, args: Any = None, result: Any = None) -> list[str]:
    """Paths this tool call named, most reliable source first.

    Arguments before result text, which is octop's ordering and the right one:
    a result is prose the model or the tool wrote and may mention a file it did
    not touch, while an argument is what the call was actually about.
    """
    if not is_artifact_tool(tool_name):
        return []
    found = _paths_from_args(args)
    if found:
        return found
    return _paths_from_result(result)


def _paths_from_args(raw: Any) -> list[str]:
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (ValueError, TypeError):
            return []
    if not isinstance(raw, Mapping):
        return []
    for key in _PATH_KEYS:
        value = raw.get(key)
        if isinstance(value, str) and value.strip() and looks_like_a_file(value):
            return [value.strip()]
    return []


def _paths_from_result(result: Any) -> list[str]:
    if isinstance(result, str):
        text = result.strip()
        if text[:1] in "{[":
            try:
                return _paths_from_result(json.loads(text))
            except (ValueError, TypeError):
                return []
        return []
    if isinstance(result, Mapping):
        return _paths_from_args(result)
    if isinstance(result, Sequence) and not isinstance(result, (str, bytes)):
        for item in result:
            found = _paths_from_result(item)
            if found:
                return found
    return []


# ---------------------------------------------------------------------------
# The workspace itself
# ---------------------------------------------------------------------------


def scan_workspace(bot_id: str, *, since_ms: int = 0) -> list[dict]:
    """Every file in this teammate's workspace, newest first.

    ``since_ms`` narrows it to what this turn touched. Zero means "everything",
    which is what the file panel asks for.

    Empty files are returned rather than filtered. That is deliberate and it is
    half of :mod:`crew.verify`'s job: a script that died mid-write leaves a
    zero-byte file, and a scan that hid it would make the failure look like the
    file was never created — a much harder thing to diagnose than an empty one.
    """
    from crew import computer as crew_computer

    root = crew_computer.workspace_dir(bot_id)
    if not root.is_dir():
        return []

    found: list[dict] = []
    for path in _walk(root, root, depth=0):
        try:
            stat = path.stat()
        except OSError:
            continue
        mtime_ms = int(stat.st_mtime * 1000)
        if since_ms and mtime_ms < since_ms:
            continue
        rel = path.relative_to(root).as_posix()
        found.append({
            "rel_path": rel,
            "kind": kind_of(rel),
            "size": int(stat.st_size),
            "mtime": mtime_ms,
        })
        if len(found) >= _MAX_FILES:
            break
    found.sort(key=lambda item: item["mtime"], reverse=True)
    return found


def _walk(directory: Path, root: Path, *, depth: int):
    if depth > _MAX_DEPTH:
        return
    try:
        entries = sorted(directory.iterdir())
    except OSError:
        return
    for entry in entries:
        name = entry.name
        if name.startswith("."):
            continue
        if entry.is_dir():
            if name in _IGNORED_DIRS:
                continue
            # A symlinked directory can point anywhere, including out of the
            # workspace. Following one would let a teammate offer the host's
            # files for download through a route built to serve its own.
            if entry.is_symlink():
                continue
            yield from _walk(entry, root, depth=depth + 1)
        elif entry.is_file() and not entry.is_symlink():
            if name.endswith(_IGNORED_SUFFIXES):
                continue
            yield entry


#: Same shape as the screenshot guard: matched against an allowlist rather than
#: sanitised, because this route is reachable from a browser and a `..` here
#: serves whatever the dashboard process can read.
#: The leading character is constrained as tightly as the rest but for one
#: thing: it may not be a dot. That is the whole traversal defence at the
#: segment level — no `..`, and no dotfile either.
_SAFE_SEGMENT = re.compile(r"^[^\W_][\w .()一-鿿-]{0,120}$", re.UNICODE)


def artifact_file_path(bot_id: str, rel_path: str) -> Optional[Path]:
    """Resolve a download request, or ``None`` when it is not one.

    Every segment is checked, not just the joined result: ``a/../../../etc`` has
    no segment that looks wrong on its own and a whole-string check would let
    the join do the walking. The containment check afterwards is the belt to
    that braces — a resolved path that escaped the workspace is refused even if
    every segment passed, which is what catches a symlink planted inside.
    """
    from crew import computer as crew_computer

    if not rel_path or rel_path.startswith("/") or "\\" in rel_path:
        return None
    segments = rel_path.split("/")
    if not all(_SAFE_SEGMENT.match(segment) for segment in segments):
        return None
    if segments[0] in _IGNORED_DIRS:
        return None

    root = crew_computer.workspace_dir(bot_id)
    try:
        candidate = (root / rel_path).resolve()
        if not candidate.is_relative_to(root.resolve()):
            return None
    except OSError:
        return None
    return candidate if candidate.is_file() else None


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------


def record(
    conn: sqlite3.Connection,
    *,
    bot_id: str,
    rel_path: str,
    size: int,
    mtime: int,
    thread_id: str = "",
    turn_id: str = "",
) -> dict:
    """Pin one file to the teammate that made it.

    Keyed on ``(bot_id, rel_path)`` so saving the same deck four times updates
    one row instead of stacking four. The operator wants "the deck", not its
    version history — and a list that grows every time a script is re-run stops
    being a list of deliverables.
    """
    from crew.db import now_ms

    conn.execute(
        """
        INSERT INTO artifacts (bot_id, thread_id, turn_id, rel_path, kind, size, mtime, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(bot_id, rel_path) DO UPDATE SET
            thread_id = excluded.thread_id,
            turn_id   = excluded.turn_id,
            size      = excluded.size,
            mtime     = excluded.mtime
        """,
        (bot_id, thread_id, turn_id, rel_path, kind_of(rel_path), size, mtime, now_ms()),
    )
    conn.commit()
    row = conn.execute(
        "SELECT * FROM artifacts WHERE bot_id = ? AND rel_path = ?", (bot_id, rel_path)
    ).fetchone()
    return dict(row) if row else {}


def record_turn_output(
    conn: sqlite3.Connection, bot_id: str, *, thread_id: str, turn_id: str, since_ms: int
) -> list[dict]:
    """Everything this turn left behind. Returns what was newly recorded."""
    rows: list[dict] = []
    for found in scan_workspace(bot_id, since_ms=since_ms):
        rows.append(record(
            conn, bot_id=bot_id, rel_path=found["rel_path"], size=found["size"],
            mtime=found["mtime"], thread_id=thread_id, turn_id=turn_id,
        ))
    return [row for row in rows if row]


def list_artifacts(conn: sqlite3.Connection, bot_id: str, limit: int = 100) -> list[dict]:
    """What this teammate has produced, newest first.

    Reconciled against the disk on the way out. A teammate's container can be
    reset and its workspace volume kept or dropped, so a row is a claim about a
    file, not the file itself — and a download button for something that is no
    longer there is worse than not listing it.
    """
    rows = conn.execute(
        "SELECT * FROM artifacts WHERE bot_id = ? ORDER BY mtime DESC LIMIT ?",
        (bot_id, max(1, min(limit, 500))),
    ).fetchall()
    out: list[dict] = []
    stale: list[str] = []
    for row in rows:
        item = dict(row)
        path = artifact_file_path(bot_id, item["rel_path"])
        if path is None:
            stale.append(item["rel_path"])
            continue
        try:
            item["size"] = path.stat().st_size
        except OSError:
            stale.append(item["rel_path"])
            continue
        out.append(item)
    if stale:
        conn.executemany(
            "DELETE FROM artifacts WHERE bot_id = ? AND rel_path = ?",
            [(bot_id, rel) for rel in stale],
        )
        conn.commit()
    return out


def forget(conn: sqlite3.Connection, bot_id: str, rel_path: str) -> None:
    conn.execute(
        "DELETE FROM artifacts WHERE bot_id = ? AND rel_path = ?", (bot_id, rel_path)
    )
    conn.commit()
