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
import uuid
from datetime import datetime, timezone
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
    created_at  INTEGER NOT NULL,
    -- Whether this teammate may speak without being spoken to. Default on:
    -- a teammate that only ever answers is a command line with a face.
    -- The column exists so "this one is too chatty" is one switch rather
    -- than turning the whole idea off for everybody.
    proactive   INTEGER NOT NULL DEFAULT 1,
    -- When it is next allowed to. **In the database, not in a sleeping
    -- task.** octop keeps this in an asyncio.Task that awaits for hours,
    -- and re-rolls every agent's time from scratch on restart — so a
    -- gateway that restarts often can starve everybody indefinitely. A
    -- stored timestamp survives the restart and keeps waiting.
    next_speak_at INTEGER NOT NULL DEFAULT 0,
    -- When the gardener last looked at this teammate's standing rules. 0 means
    -- never, which is what every existing row reads as — so the first sweep
    -- after an upgrade considers everybody once and then settles into the
    -- cooldown.
    gardened_at   INTEGER NOT NULL DEFAULT 0
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

-- `id` stays an AUTOINCREMENT integer because it is the event tail's cursor.
-- `ext_id` is the *client-facing* identity: `{turn}:user`, `{turn}:agent`,
-- `{turn}:chip:{n}`. The ported useCrewController reconciles optimistic
-- bubbles against server messages by parsing exactly those shapes, so the two
-- identities have different jobs and both have to exist. See crew/contract.py.
CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ext_id      TEXT,
    turn_id     TEXT NOT NULL DEFAULT '',
    thread_id   TEXT NOT NULL,
    sender      TEXT NOT NULL,
    kind        TEXT NOT NULL DEFAULT 'text',
    content     TEXT NOT NULL DEFAULT '',
    payload     TEXT,
    streaming   INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_ext ON messages(ext_id) WHERE ext_id IS NOT NULL;

-- `ref` is a short, typeable handle (4 hex) so a decision can be made from a
-- chat reply rather than only from the panel — ported from octop's HITL store.
-- `content_hash` covers what the operator was shown; deciding against a stale
-- hash is refused, because approving something other than what you read is the
-- one failure this whole mechanism exists to prevent.
-- `scope` is the JSON the approval card renders as a checklist: for a held
-- tool call it is what that call would actually touch.
CREATE TABLE IF NOT EXISTS approvals (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ref          TEXT,
    thread_id    TEXT NOT NULL,
    bot_id       TEXT NOT NULL,
    action       TEXT NOT NULL,
    detail       TEXT NOT NULL DEFAULT '',
    scope        TEXT,
    tool         TEXT NOT NULL DEFAULT '',
    tool_call_id TEXT NOT NULL DEFAULT '',
    turn_id      TEXT NOT NULL DEFAULT '',
    source       TEXT NOT NULL DEFAULT '',
    content_hash TEXT NOT NULL DEFAULT '',
    idem_key     TEXT,
    status       TEXT NOT NULL DEFAULT 'pending',
    note         TEXT NOT NULL DEFAULT '',
    message_id   INTEGER,
    created_at   INTEGER NOT NULL,
    expires_at   INTEGER,
    resolved_at  INTEGER,
    -- An approved hold releases the blocked call exactly once. Without this the
    -- approval would stand as a permanent permission for that exact call, and
    -- "send this invoice" would quietly become "you may send this invoice
    -- whenever you like".
    consumed_at  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_approvals_thread ON approvals(thread_id, status);

-- What each teammate may reach. A row is the permission; no row means the
-- risk table in crew/grants.py decides. Deliberately no `enabled` column —
-- see that module.
CREATE TABLE IF NOT EXISTS grants (
    bot_id     TEXT NOT NULL,
    tool       TEXT NOT NULL,          -- a tool name, or 'toolset:<name>'
    mode       TEXT NOT NULL,          -- deny | ask | allow
    note       TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (bot_id, tool)
);

-- Append-only. One row per attempt, including refused ones. Arguments are a
-- digest plus a one-line subject, never the raw values — see crew/audit.py.
CREATE TABLE IF NOT EXISTS audit (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id       TEXT NOT NULL DEFAULT '',
    actor        TEXT NOT NULL DEFAULT '_system',
    thread_id    TEXT NOT NULL DEFAULT '',
    turn_id      TEXT NOT NULL DEFAULT '',
    tool_call_id TEXT NOT NULL DEFAULT '',
    event_type   TEXT NOT NULL,
    tool         TEXT NOT NULL DEFAULT '',
    args_digest  TEXT NOT NULL DEFAULT '',
    subject      TEXT NOT NULL DEFAULT '',
    detail       TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT '',
    duration_ms  INTEGER,
    created_at   INTEGER NOT NULL
);
-- What a teammate has actually produced. Keyed on (bot_id, rel_path) so
-- re-running a script updates one row instead of stacking versions — the
-- operator wants "the deck", not its history. The row is a claim about a file,
-- not the file: `crew/artifacts.py::list_artifacts` reconciles against disk,
-- because a container can be reset out from under it.
CREATE TABLE IF NOT EXISTS artifacts (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id     TEXT NOT NULL,
    thread_id  TEXT NOT NULL DEFAULT '',
    turn_id    TEXT NOT NULL DEFAULT '',
    rel_path   TEXT NOT NULL,
    kind       TEXT NOT NULL DEFAULT '',
    size       INTEGER NOT NULL DEFAULT 0,
    mtime      INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    UNIQUE (bot_id, rel_path)
);
CREATE INDEX IF NOT EXISTS idx_artifacts_bot ON artifacts(bot_id, mtime DESC);

CREATE INDEX IF NOT EXISTS idx_audit_bot ON audit(bot_id, id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit(event_type, id);

-- Work that outlives the process that started it.
--
-- The lease is the whole mechanism. A worker claims a task by writing its own
-- `lease_id` and a `lease_until` in the near future, and renews while it runs.
-- If the process dies the renewals stop, the lease goes stale, and the next
-- tick in any process takes it over. There is deliberately no startup sweep:
-- no statement run at boot can tell "the run I crashed out of" from "a run a
-- healthy peer is in the middle of", and every process here loads the same
-- plugin. Expiry answers both without having to know which.
--
-- `paused` is NOT terminal. The terminal set is succeeded / failed / cancelled.
CREATE TABLE IF NOT EXISTS tasks (
    id           TEXT PRIMARY KEY,
    bot_id       TEXT NOT NULL,
    thread_id    TEXT NOT NULL DEFAULT '',
    kind         TEXT NOT NULL DEFAULT 'agent',
    title        TEXT NOT NULL DEFAULT '',
    input        TEXT,                       -- JSON: what to do
    state        TEXT,                       -- JSON: the worker's own scratch
    status       TEXT NOT NULL DEFAULT 'queued',
    plan         TEXT,                       -- JSON: TaskStep[]
    evidence     TEXT,                       -- JSON: Evidence[]
    lease_id     TEXT,
    lease_until  INTEGER,
    attempts     INTEGER NOT NULL DEFAULT 0,
    next_run_at  INTEGER,
    error        TEXT NOT NULL DEFAULT '',
    idem_key     TEXT,
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL
);
-- The due query's shape: status first, then the two time columns it compares.
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(status, lease_until, next_run_at);
CREATE INDEX IF NOT EXISTS idx_tasks_bot ON tasks(bot_id, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_idem ON tasks(idem_key) WHERE idem_key IS NOT NULL;

-- How a routine has been behaving, which the host's cron store cannot say.
--
-- `mark_job_run` writes `last_run_at` on success *and* on failure, so the
-- host's field means "last attempt". The two are kept apart here for the
-- reason rowboat keeps them apart: an attempt timestamp is what a backoff
-- window is measured from, and a success timestamp is what tells you the
-- routine is actually working. One column cannot be both, and conflating them
-- makes a routine that has failed forty times look freshly successful.
--
-- `notified_at` exists so the operator is told once when a routine is
-- suspended, not once per fire. A teammate that reports the same failure every
-- ten minutes trains people to ignore it.
CREATE TABLE IF NOT EXISTS routine_health (
    job_id          TEXT PRIMARY KEY,
    bot_id          TEXT NOT NULL DEFAULT '',
    failures        INTEGER NOT NULL DEFAULT 0,   -- consecutive; reset by success
    last_attempt_at INTEGER NOT NULL DEFAULT 0,   -- written before the run
    last_run_at     INTEGER NOT NULL DEFAULT 0,   -- written only on success
    notified_at     INTEGER NOT NULL DEFAULT 0,
    last_error      TEXT NOT NULL DEFAULT ''
);

-- What a teammate has already raised unprompted, so it does not raise the
-- same thing twice. `subject` is a stable key for the thing itself
-- (`approval:12`, `routine:<job>`, `task:<id>`) rather than for the message,
-- because the message is a rendering and the standstill is the fact.
CREATE TABLE IF NOT EXISTS proactive_pushes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id      TEXT NOT NULL,
    subject     TEXT NOT NULL,
    created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_proactive_bot ON proactive_pushes(bot_id, created_at);

CREATE TABLE IF NOT EXISTS sections (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL DEFAULT '',
    position    INTEGER NOT NULL DEFAULT 0,
    collapsed   INTEGER NOT NULL DEFAULT 0
);

-- One row per tool call, keyed by the model's tool_call_id so start and
-- completion upsert the same row (see crew/activity.py). `seq` is a monotonic
-- counter the event tail rides, because the primary key is a string id and
-- rowid would be reused after a delete.
CREATE TABLE IF NOT EXISTS activities (
    id          TEXT PRIMARY KEY,
    seq         INTEGER,
    thread_id   TEXT NOT NULL,
    turn_id     TEXT NOT NULL DEFAULT '',
    kind        TEXT NOT NULL DEFAULT 'status',
    title       TEXT NOT NULL DEFAULT '',
    detail      TEXT NOT NULL DEFAULT '',
    output      TEXT,
    status      TEXT NOT NULL DEFAULT 'running',
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activities_thread ON activities(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_activities_seq ON activities(seq);
CREATE INDEX IF NOT EXISTS idx_activities_turn ON activities(turn_id, status);

-- A single monotonic counter shared by every tailable table. The messages tail
-- can use AUTOINCREMENT rowids, but activities are upserted — an update has to
-- move the row to the *end* of the stream so subscribers see the change, which
-- a rowid cannot do.
CREATE TABLE IF NOT EXISTS stream_cursor (
    id   INTEGER PRIMARY KEY CHECK (id = 1),
    seq  INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO stream_cursor (id, seq) VALUES (1, 0);
"""

# Additive column migrations, applied idempotently after _SCHEMA. Each entry is
# (table, column, full ALTER statement). A column that already exists is
# skipped by the PRAGMA check rather than by swallowing the OperationalError,
# so a genuinely malformed statement still surfaces.
#
# The approvals columns are here rather than only in _SCHEMA because
# `CREATE TABLE IF NOT EXISTS` is a no-op against a database created by an
# earlier version — the table is there, the columns are not. The UNIQUE indexes
# on `ref`/`idem_key` need no migration: _SCHEMA's `CREATE INDEX IF NOT EXISTS`
# runs on every connect and lands once the columns exist.
_MIGRATIONS: tuple[tuple[str, str, str], ...] = (
    ("bots", "proactive", "ALTER TABLE bots ADD COLUMN proactive INTEGER NOT NULL DEFAULT 1"),
    ("bots", "next_speak_at", "ALTER TABLE bots ADD COLUMN next_speak_at INTEGER NOT NULL DEFAULT 0"),
    ("bots", "gardened_at", "ALTER TABLE bots ADD COLUMN gardened_at INTEGER NOT NULL DEFAULT 0"),
    ("approvals", "ref", "ALTER TABLE approvals ADD COLUMN ref TEXT"),
    ("approvals", "scope", "ALTER TABLE approvals ADD COLUMN scope TEXT"),
    ("approvals", "tool", "ALTER TABLE approvals ADD COLUMN tool TEXT NOT NULL DEFAULT ''"),
    ("approvals", "tool_call_id", "ALTER TABLE approvals ADD COLUMN tool_call_id TEXT NOT NULL DEFAULT ''"),
    ("approvals", "turn_id", "ALTER TABLE approvals ADD COLUMN turn_id TEXT NOT NULL DEFAULT ''"),
    ("approvals", "source", "ALTER TABLE approvals ADD COLUMN source TEXT NOT NULL DEFAULT ''"),
    ("approvals", "content_hash", "ALTER TABLE approvals ADD COLUMN content_hash TEXT NOT NULL DEFAULT ''"),
    ("approvals", "idem_key", "ALTER TABLE approvals ADD COLUMN idem_key TEXT"),
    ("approvals", "note", "ALTER TABLE approvals ADD COLUMN note TEXT NOT NULL DEFAULT ''"),
    ("approvals", "expires_at", "ALTER TABLE approvals ADD COLUMN expires_at INTEGER"),
    ("approvals", "consumed_at", "ALTER TABLE approvals ADD COLUMN consumed_at INTEGER"),
)

# Indexes over columns that _MIGRATIONS may have just added. They cannot live in
# _SCHEMA: that runs first, and on a database from an earlier version the column
# does not exist yet, so `CREATE INDEX ON approvals(ref)` would raise inside
# `executescript` and break every connect.
_POST_MIGRATION_SCHEMA = """
CREATE UNIQUE INDEX IF NOT EXISTS idx_approvals_ref ON approvals(ref) WHERE ref IS NOT NULL;
-- Not unique: an approved hold is consumed by the call it released, and the
-- same action asked for again next week is a new decision, not a replay of the
-- old one. Uniqueness here would make "send the standup summary" approvable
-- once and then permanently unaskable.
CREATE INDEX IF NOT EXISTS idx_approvals_idem ON approvals(idem_key) WHERE idem_key IS NOT NULL;
"""

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
    conn.executescript(_POST_MIGRATION_SCHEMA)
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


def iso(epoch_ms: Optional[int]) -> str:
    """Epoch milliseconds → ISO-8601.

    Everything that crosses the wire uses this: the ported React components
    call ``Date.parse()`` on timestamps (``WorkingActivity`` computes its
    elapsed-time label that way), and ``Date.parse`` of a bare number is NaN.
    """
    if not epoch_ms:
        return datetime.now(timezone.utc).isoformat()
    return datetime.fromtimestamp(epoch_ms / 1000, tz=timezone.utc).isoformat()


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


def update_bot(
    conn: sqlite3.Connection,
    bot_id: str,
    *,
    name: Optional[str] = None,
    role: Optional[str] = None,
    emoji: Optional[str] = None,
    section_id: Optional[str] = None,
    proactive: Optional[bool] = None,
) -> Optional[dict]:
    """Change a teammate's display fields. ``None`` means "leave this alone".

    Only the presentation layer is editable here. The teammate's *identity* is
    its ``SOUL.md`` and its id is its profile name, and neither can be renamed
    from a text field without moving a directory out from under a running turn.
    """
    updates = {
        "name": name, "role": role, "emoji": emoji, "section_id": section_id,
        # A bool, so `is not None` below is doing real work: `False` is a
        # meaningful value here ("stop talking to me") and a truthiness filter
        # would drop exactly the setting somebody cared enough to change.
        "proactive": None if proactive is None else int(bool(proactive)),
    }
    changes = {key: value for key, value in updates.items() if value is not None}
    if changes:
        assignments = ", ".join(f"{key} = ?" for key in changes)
        conn.execute(
            f"UPDATE bots SET {assignments} WHERE id = ?", (*changes.values(), bot_id)
        )
        conn.commit()
    return get_bot(conn, bot_id)


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
    msg["streaming"] = bool(msg.get("streaming"))
    return msg


def insert_message(
    conn: sqlite3.Connection,
    *,
    thread_id: str,
    sender: str,
    kind: str = "text",
    content: str = "",
    payload: Any = None,
    turn_id: str = "",
    ext_id: Optional[str] = None,
    streaming: bool = False,
) -> dict:
    """Append one chip to a thread and return it as the client will see it.

    ``sender`` is ``"user"`` or a bot id. The returned dict is the row the
    ``/events`` tail will broadcast, so callers that need the new ``id``
    (approvals must backfill it — see :mod:`crew.approvals`) get it here
    without a second read.

    ``ext_id`` defaults to ``{turn_id}:chip:{uuid}`` for chips when a turn is
    known; the orchestrator passes the explicit ``{turn}:user`` / ``{turn}:agent``
    for the two messages the client reconciles against.
    """
    if kind not in MESSAGE_KINDS:
        raise ValueError(f"unknown message kind: {kind!r}")
    created_at = now_ms()
    payload_json = None if payload is None else json.dumps(payload, ensure_ascii=False)
    if ext_id is None and turn_id:
        ext_id = f"{turn_id}:chip:{uuid.uuid4().hex[:8]}"
    cur = conn.execute(
        """
        INSERT INTO messages (ext_id, turn_id, thread_id, sender, kind, content, payload, streaming, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (ext_id, turn_id, thread_id, sender, kind, content, payload_json,
         1 if streaming else 0, created_at),
    )
    conn.commit()
    return {
        "id": int(cur.lastrowid),
        "ext_id": ext_id,
        "turn_id": turn_id,
        "thread_id": thread_id,
        "sender": sender,
        "kind": kind,
        "content": content,
        "payload": payload,
        "streaming": streaming,
        "created_at": created_at,
    }


def update_message_text(
    conn: sqlite3.Connection, message_id: int, content: str, *, streaming: bool
) -> None:
    """Replace a streaming message's accumulated text.

    Called on a throttle while deltas arrive, and once more when the turn
    settles. Persisting every token would mean one SQLite write per token for
    no benefit: the live text reaches the browser over the event stream, and
    the row only has to be correct for whoever opens the thread *later*.
    """
    conn.execute(
        "UPDATE messages SET content = ?, streaming = ? WHERE id = ?",
        (content, 1 if streaming else 0, message_id),
    )
    conn.commit()


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


def get_message(conn: sqlite3.Connection, message_id: int) -> Optional[dict]:
    row = conn.execute("SELECT * FROM messages WHERE id = ?", (message_id,)).fetchone()
    return _parse_message(row) if row else None


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


# ---------------------------------------------------------------------------
# Stream cursor
#
# Messages are append-only, so their AUTOINCREMENT rowid is a perfectly good
# tail cursor. Activities are not: a tool call is upserted from `running` to
# `completed` under the same id, and an UPDATE leaves the rowid where it was —
# so a rowid tail would never re-deliver it and the spinner would spin forever.
# A shared counter bumped on every write puts the updated row back at the end
# of the stream, which is what the subscriber needs to see.
# ---------------------------------------------------------------------------


def next_seq(conn: sqlite3.Connection) -> int:
    """Claim the next stream sequence number."""
    conn.execute("UPDATE stream_cursor SET seq = seq + 1 WHERE id = 1")
    row = conn.execute("SELECT seq FROM stream_cursor WHERE id = 1").fetchone()
    return int(row["seq"])


def max_activity_seq(conn: sqlite3.Connection) -> int:
    row = conn.execute("SELECT COALESCE(MAX(seq), 0) AS m FROM activities").fetchone()
    return int(row["m"])


def activities_after(conn: sqlite3.Connection, after_seq: int, limit: int = 200) -> list[dict]:
    """Activities whose sequence is greater than ``after_seq``, oldest first."""
    from crew.activity import _to_event

    rows = conn.execute(
        "SELECT * FROM activities WHERE seq > ? ORDER BY seq ASC LIMIT ?",
        (after_seq, limit),
    ).fetchall()
    return [_to_event(r) for r in rows]
