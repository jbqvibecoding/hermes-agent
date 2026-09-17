"""SQLite store for the crew roster, threads, chips, and approvals.

``crew.db`` is the **bus**, not just a cache. Crew tools run in whichever
process happens to own the turn — the dashboard (interactive messages) or the
gateway (cron-fired routines) — and both do exactly one thing with their
output: insert a row into ``messages``. The dashboard's ``/events`` WebSocket
tails that table by rowid and fans new rows out to the browser. So a routine
that fires at 09:00 while the dashboard is closed still lands its report chip
in the right thread, and the chip is there when the operator next opens it.
No cross-process IPC, no message broker. This mirrors how the kanban plugin
tails ``task_events`` (``plugins/kanban/dashboard/plugin_api.py``).

Location: ``<root>/crew.db`` where ``<root>`` is the **shared** Hermes root
(``hermes_constants.get_default_hermes_root()``), i.e. the parent of
``profiles/``. Resolving through the active profile's ``HERMES_HOME`` would
fork the roster per teammate, which is nonsense — every teammate must see the
same roster to hand work to a colleague.

Schema is ported from OpenGrokBot's ``gateway/src/db.ts`` (thread id
conventions and the nine message kinds included, so the ported React chips
render unchanged), plus a ``sections`` table for the sidebar org chart.
``CREATE TABLE IF NOT EXISTS`` only — additive columns go through
``_MIGRATIONS``.
"""

from __future__ import annotations

import json
import os
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Iterable, Optional

# The nine chip kinds the thread renderer knows how to draw. Kept as a plain
# tuple (not an enum) because it crosses the wire to TypeScript, where it is
# the `MessageKind` union — the two must stay spelled identically.
MESSAGE_KINDS = (
    "text",
    "report",
    "screenshot",
    "approval_request",
    "approval_resolved",
    "memory_updated",
    "routine_created",
    "bot_ref",
    "login_request",
)

# Sidebar section that holds every teammate the operator has not filed into a
# named section. Ported from grok-bot's `shared/sidebar-sections.ts`, which
# keeps the same sentinel id so the bucket can never be renamed or deleted.
UNASSIGNED_SECTION_ID = "__agents__"
UNASSIGNED_SECTION_NAME = "Unassigned"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS bots (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT '',
    emoji       TEXT NOT NULL DEFAULT '🤖',
    section_id  TEXT NOT NULL DEFAULT '',
    position    INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS threads (
    id          TEXT PRIMARY KEY,
    kind        TEXT NOT NULL DEFAULT 'dm',
    bot_id      TEXT,
    title       TEXT NOT NULL DEFAULT '',
    created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS thread_members (
    thread_id   TEXT NOT NULL,
    bot_id      TEXT NOT NULL,
    joined_at   INTEGER NOT NULL,
    PRIMARY KEY (thread_id, bot_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id   TEXT NOT NULL,
    sender      TEXT NOT NULL,
    kind        TEXT NOT NULL DEFAULT 'text',
    content     TEXT NOT NULL DEFAULT '',
    payload     TEXT,
    created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, id);

CREATE TABLE IF NOT EXISTS approvals (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id   TEXT NOT NULL,
    bot_id      TEXT NOT NULL,
    action      TEXT NOT NULL,
    detail      TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'pending',
    message_id  INTEGER,
    created_at  INTEGER NOT NULL,
    resolved_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_approvals_thread ON approvals(thread_id, status);

CREATE TABLE IF NOT EXISTS sections (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL DEFAULT '',
    position    INTEGER NOT NULL DEFAULT 0,
    collapsed   INTEGER NOT NULL DEFAULT 0
);
"""

# Additive column migrations, applied idempotently after _SCHEMA. Each entry is
# (table, column, full ALTER statement). A column that already exists is
# skipped by the PRAGMA check rather than by swallowing the OperationalError,
# so a genuinely malformed statement still surfaces.
_MIGRATIONS: tuple[tuple[str, str, str], ...] = ()

_local = threading.local()


def crew_home() -> Path:
    """Return the shared Hermes root that anchors ``crew.db``.

    ``HERMES_CREW_HOME`` wins when set (tests, unusual deployments); otherwise
    :func:`hermes_constants.get_default_hermes_root`, which already collapses
    ``<root>/profiles/<name>`` back to ``<root>`` and returns ``HERMES_HOME``
    verbatim for Docker installs. Same contract as ``kanban_db.kanban_home()``
    and for the same reason: the roster is deliberately cross-profile.
    """
    override = os.environ.get("HERMES_CREW_HOME", "").strip()
    if override:
        return Path(override).expanduser()
    from hermes_constants import get_default_hermes_root

    return get_default_hermes_root()


def crew_db_path() -> Path:
    """Return the path to ``crew.db``.

    ``HERMES_CREW_DB`` pins the file directly — the seam the test suite uses to
    point a whole run at a tmp_path without touching the user's real root.
    """
    override = os.environ.get("HERMES_CREW_DB", "").strip()
    if override:
        return Path(override).expanduser()
    return crew_home() / "crew.db"


def connect(db_path: Optional[Path | str] = None) -> sqlite3.Connection:
    """Return a WAL-mode connection to ``crew.db``, creating the schema.

    Connections are cached per (thread, path): SQLite objects are not safe to
    share across threads, and the dashboard serves requests from a thread pool
    while the orchestrator runs turns on its own workers. Caching per thread
    keeps each one on a private handle without reopening the file per query.
    """
    path = Path(db_path) if db_path is not None else crew_db_path()
    key = str(path)
    cache = getattr(_local, "conns", None)
    if cache is None:
        cache = _local.conns = {}
    conn = cache.get(key)
    if conn is not None:
        return conn

    if key != ":memory:":
        path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(key, timeout=30.0)
    conn.row_factory = sqlite3.Row
    # WAL is what lets the gateway's cron worker append a report chip while the
    # dashboard's /events tail is reading the same table.
    if key != ":memory:":
        conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(_SCHEMA)
    _apply_migrations(conn)
    conn.commit()
    cache[key] = conn
    return conn


def _apply_migrations(conn: sqlite3.Connection) -> None:
    for table, column, statement in _MIGRATIONS:
        cols = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
        if column not in cols:
            conn.execute(statement)


def close_all() -> None:
    """Close this thread's cached connections. Tests use it between cases."""
    cache = getattr(_local, "conns", None)
    if not cache:
        return
    for conn in cache.values():
        try:
            conn.close()
        except Exception:
            pass
    cache.clear()


def now_ms() -> int:
    return int(time.time() * 1000)


# ---------------------------------------------------------------------------
# Thread ids
#
# Structural, not random: `dm:<bot_id>` and `group:<slug>`. The web client
# builds a DM thread id client-side the moment a teammate is hired, before any
# round-trip (OpenGrokBot's `web/src/App.tsx` does the same), so this
# convention is part of the wire contract and must not drift.
# ---------------------------------------------------------------------------


def dm_thread_id(bot_id: str) -> str:
    return f"dm:{bot_id}"


def is_group_thread(thread_id: str) -> bool:
    return thread_id.startswith("group:")


def bot_id_of_dm(thread_id: str) -> Optional[str]:
    return thread_id[3:] if thread_id.startswith("dm:") else None


# ---------------------------------------------------------------------------
# Bots
# ---------------------------------------------------------------------------


def upsert_bot(
    conn: sqlite3.Connection,
    *,
    bot_id: str,
    name: str,
    role: str = "",
    emoji: str = "🤖",
    section_id: str = "",
) -> None:
    """Insert or refresh a roster row.

    ``created_at`` is preserved on conflict — re-seeding on every boot must not
    reshuffle a roster the operator has already organised, and ``position`` /
    ``section_id`` are likewise left alone once set (the sidebar owns them).
    """
    conn.execute(
        """
        INSERT INTO bots (id, name, role, emoji, section_id, position, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            role = excluded.role,
            emoji = excluded.emoji
        """,
        (bot_id, name, role, emoji, section_id, now_ms()),
    )
    conn.commit()


def get_bot(conn: sqlite3.Connection, bot_id: str) -> Optional[dict]:
    row = conn.execute("SELECT * FROM bots WHERE id = ?", (bot_id,)).fetchone()
    return dict(row) if row else None


def list_bots(conn: sqlite3.Connection) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM bots ORDER BY position, name COLLATE NOCASE"
    ).fetchall()
    return [dict(r) for r in rows]


def delete_bot(conn: sqlite3.Connection, bot_id: str) -> None:
    """Remove a teammate's roster row, DM thread, chips, and approvals.

    The teammate's *profile* is not touched here — deleting the HERMES_HOME is
    ``hermes_cli.profiles.delete_profile``'s job and is a separate, louder
    decision (it destroys memory, skills, and session history).
    """
    thread_id = dm_thread_id(bot_id)
    conn.execute("DELETE FROM messages WHERE thread_id = ?", (thread_id,))
    conn.execute("DELETE FROM approvals WHERE thread_id = ?", (thread_id,))
    conn.execute("DELETE FROM thread_members WHERE bot_id = ?", (bot_id,))
    conn.execute("DELETE FROM threads WHERE id = ?", (thread_id,))
    conn.execute("DELETE FROM bots WHERE id = ?", (bot_id,))
    conn.commit()


# ---------------------------------------------------------------------------
# Threads
# ---------------------------------------------------------------------------


def ensure_dm_thread(conn: sqlite3.Connection, bot_id: str) -> str:
    thread_id = dm_thread_id(bot_id)
    conn.execute(
        "INSERT OR IGNORE INTO threads (id, kind, bot_id, created_at) VALUES (?, 'dm', ?, ?)",
        (thread_id, bot_id, now_ms()),
    )
    conn.commit()
    return thread_id


def ensure_group_thread(
    conn: sqlite3.Connection, thread_id: str, title: str, member_ids: Iterable[str]
) -> str:
    """Create or re-title a group thread and backfill its membership.

    Called on every boot so a teammate hired after the group was created still
    gets a seat. Members are never removed here — leaving a group is an
    explicit action, not a side effect of a restart.
    """
    ts = now_ms()
    conn.execute(
        """
        INSERT INTO threads (id, kind, bot_id, title, created_at) VALUES (?, 'group', NULL, ?, ?)
        ON CONFLICT(id) DO UPDATE SET title = excluded.title
        """,
        (thread_id, title, ts),
    )
    for offset, bot_id in enumerate(member_ids):
        conn.execute(
            "INSERT OR IGNORE INTO thread_members (thread_id, bot_id, joined_at) VALUES (?, ?, ?)",
            (thread_id, bot_id, ts + offset),
        )
    conn.commit()
    return thread_id


def thread_members(conn: sqlite3.Connection, thread_id: str) -> list[str]:
    rows = conn.execute(
        "SELECT bot_id FROM thread_members WHERE thread_id = ? ORDER BY joined_at, bot_id",
        (thread_id,),
    ).fetchall()
    return [r["bot_id"] for r in rows]


def get_thread(conn: sqlite3.Connection, thread_id: str) -> Optional[dict]:
    row = conn.execute("SELECT * FROM threads WHERE id = ?", (thread_id,)).fetchone()
    return dict(row) if row else None


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------


def _parse_message(row: sqlite3.Row) -> dict:
    msg = dict(row)
    raw = msg.get("payload")
    msg["payload"] = json.loads(raw) if raw else None
    return msg


def insert_message(
    conn: sqlite3.Connection,
    *,
    thread_id: str,
    sender: str,
    kind: str = "text",
    content: str = "",
    payload: Any = None,
) -> dict:
    """Append one chip to a thread and return it as the client will see it.

    ``sender`` is ``"user"`` or a bot id. The returned dict is the row the
    ``/events`` tail will broadcast, so callers that need the new ``id``
    (approvals must backfill it — see :mod:`crew.approvals`) get it here
    without a second read.
    """
    if kind not in MESSAGE_KINDS:
        raise ValueError(f"unknown message kind: {kind!r}")
    created_at = now_ms()
    payload_json = None if payload is None else json.dumps(payload, ensure_ascii=False)
    cur = conn.execute(
        """
        INSERT INTO messages (thread_id, sender, kind, content, payload, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (thread_id, sender, kind, content, payload_json, created_at),
    )
    conn.commit()
    return {
        "id": int(cur.lastrowid),
        "thread_id": thread_id,
        "sender": sender,
        "kind": kind,
        "content": content,
        "payload": payload,
        "created_at": created_at,
    }


def update_message_payload(conn: sqlite3.Connection, message_id: int, payload: Any) -> None:
    """Rewrite one chip's payload in place, keeping its id.

    Used when an approval resolves: the *same* message id is re-broadcast so
    the client upserts by id and the chip flips from pending to decided where
    it already sits, instead of a second chip appearing at the bottom.
    """
    conn.execute(
        "UPDATE messages SET payload = ? WHERE id = ?",
        (json.dumps(payload, ensure_ascii=False), message_id),
    )
    conn.commit()


def list_messages(conn: sqlite3.Connection, thread_id: str, limit: int = 200) -> list[dict]:
    """Return the last ``limit`` chips in a thread, oldest first."""
    rows = conn.execute(
        "SELECT * FROM messages WHERE thread_id = ? ORDER BY id DESC LIMIT ?",
        (thread_id, limit),
    ).fetchall()
    return [_parse_message(r) for r in reversed(rows)]


def last_message(conn: sqlite3.Connection, thread_id: str) -> Optional[dict]:
    row = conn.execute(
        "SELECT * FROM messages WHERE thread_id = ? ORDER BY id DESC LIMIT 1",
        (thread_id,),
    ).fetchone()
    return _parse_message(row) if row else None


def messages_after(conn: sqlite3.Connection, after_id: int, limit: int = 200) -> list[dict]:
    """Return chips with ``id > after_id`` across all threads, oldest first.

    This is the ``/events`` tail. A monotonic AUTOINCREMENT rowid is the whole
    cursor: whichever process inserted the row, the tail picks it up on its
    next poll and the browser never has to know a second writer existed.
    """
    rows = conn.execute(
        "SELECT * FROM messages WHERE id > ? ORDER BY id ASC LIMIT ?",
        (after_id, limit),
    ).fetchall()
    return [_parse_message(r) for r in rows]


def max_message_id(conn: sqlite3.Connection) -> int:
    row = conn.execute("SELECT COALESCE(MAX(id), 0) AS m FROM messages").fetchone()
    return int(row["m"])
