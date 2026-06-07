"""SubagentSpec registry — DAO over the shared kanban SQLite DB.

The registry owns three tables that live in the *same* SQLite file as the
kanban board (resolved via :func:`hermes_cli.kanban_db.kanban_db_path`), so
specs, tasks, and outcomes share one durable store and one connection-hardening
path. We do NOT touch kanban's ``SCHEMA_SQL``: this module runs its own
idempotent ``CREATE TABLE IF NOT EXISTS`` migration (:func:`ensure_spec_schema`)
on top of a hardened ``kb.connect`` connection. Column names mirror paperclip's
``Agent`` so a later lift into the paperclip control plane is a column rename,
not a remodel.

Tables:

* ``subagent_specs``       — the spec body (one row per version).
* ``subagent_spec_stats``  — Agent DNA stats, keyed ``(spec_id, tenant)``;
  split out so high-frequency Evolution writes don't churn the spec row.
  This is the single source the Task Router's Route Score reads from.
* ``subagent_outcomes``    — one row per worker/critic result: the raw event
  stream stats roll up from, and the Failure Memory store (Recovery level 5).
"""

from __future__ import annotations

import re
import sqlite3
import time
from pathlib import Path
from typing import Iterable, Optional

from hermes_cli import kanban_db as kb
from hermes_cli.subagent_spec import SpecStats, SubagentSpec

# Outcome classes that count toward win/fail sample size. ``blocked`` (human
# gate / awaiting approval) is recorded for audit but does not move win_rate.
_WIN_OUTCOMES = frozenset({"pass"})
_FAIL_OUTCOMES = frozenset({"fail", "timeout", "crashed"})


SPEC_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS subagent_specs (
    id                      TEXT PRIMARY KEY,
    slug                    TEXT NOT NULL,
    name                    TEXT NOT NULL,
    role                    TEXT NOT NULL DEFAULT 'leaf',
    domain                  TEXT NOT NULL DEFAULT 'general',
    title                   TEXT,
    emoji                   TEXT,
    color                   TEXT,
    vibe                    TEXT,
    description             TEXT NOT NULL DEFAULT '',
    capability_tags         TEXT,                          -- JSON array
    system_prompt           TEXT NOT NULL DEFAULT '',
    contract_template       TEXT,                          -- JSON FourPartContract
    tools                   TEXT,                          -- JSON array (allow-list)
    disallowed_tools        TEXT,                          -- JSON array
    skills                  TEXT,                          -- JSON array or NULL
    max_turns               INTEGER NOT NULL DEFAULT 50,
    timeout_seconds         INTEGER NOT NULL DEFAULT 900,
    runtime_hint            TEXT NOT NULL DEFAULT 'either',
    model_profile           TEXT NOT NULL DEFAULT 'default',
    model                   TEXT,
    budget_monthly_cents    INTEGER NOT NULL DEFAULT 0,
    cost_cap_per_task_cents INTEGER,
    auth_profile            TEXT,
    trust_preset            TEXT NOT NULL DEFAULT 'standard',
    can_create_agents       INTEGER NOT NULL DEFAULT 0,
    provenance              TEXT NOT NULL DEFAULT 'generated',
    parent_spec_id          TEXT,
    version                 INTEGER NOT NULL DEFAULT 1,
    source_path             TEXT,
    content_hash            TEXT,
    status                  TEXT NOT NULL DEFAULT 'active',
    tenant                  TEXT,
    multica_agent_id        TEXT,
    created_at              INTEGER NOT NULL,
    updated_at              INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_specs_domain ON subagent_specs(domain, status);
CREATE INDEX IF NOT EXISTS idx_specs_tenant ON subagent_specs(tenant, status);
CREATE INDEX IF NOT EXISTS idx_specs_slug   ON subagent_specs(domain, slug, version);
CREATE INDEX IF NOT EXISTS idx_specs_source ON subagent_specs(source_path);

CREATE TABLE IF NOT EXISTS subagent_spec_stats (
    spec_id        TEXT NOT NULL,
    tenant         TEXT NOT NULL DEFAULT '',
    usage_count    INTEGER NOT NULL DEFAULT 0,
    win_count      INTEGER NOT NULL DEFAULT 0,
    fail_count     INTEGER NOT NULL DEFAULT 0,
    win_rate       REAL    NOT NULL DEFAULT 0.0,
    avg_cost_cents REAL    NOT NULL DEFAULT 0.0,
    avg_latency_ms INTEGER NOT NULL DEFAULT 0,
    sample_size    INTEGER NOT NULL DEFAULT 0,
    last_used_at   INTEGER,
    PRIMARY KEY (spec_id, tenant)
);

CREATE TABLE IF NOT EXISTS subagent_outcomes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    spec_id        TEXT NOT NULL,
    task_id        TEXT NOT NULL,
    tenant         TEXT NOT NULL DEFAULT '',
    runtime        TEXT NOT NULL,
    outcome        TEXT NOT NULL,
    critic_verdict TEXT,
    cost_cents     INTEGER,
    latency_ms     INTEGER,
    failure_class  TEXT,
    failure_note   TEXT,
    created_at     INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_outcomes_spec ON subagent_outcomes(spec_id, created_at);
CREATE INDEX IF NOT EXISTS idx_outcomes_task ON subagent_outcomes(task_id);
"""


# ---------------------------------------------------------------------------
# id / slug helpers
# ---------------------------------------------------------------------------

_SLUG_RE = re.compile(r"[^a-z0-9]+")
_SPEC_ID_RE = re.compile(r"^spec-(?P<domain>[a-z0-9-]+?)-(?P<slug>[a-z0-9-]+)-v(?P<version>\d+)$")


def slugify(text: str) -> str:
    """Lowercase, hyphen-separated slug. Empty input → ``unnamed``."""
    s = _SLUG_RE.sub("-", text.strip().lower()).strip("-")
    return s or "unnamed"


def make_spec_id(domain: str, slug: str, version: int) -> str:
    return f"spec-{slugify(domain)}-{slug}-v{version}"


def parse_spec_id(spec_id: str) -> Optional[tuple[str, str, int]]:
    """Return ``(domain, slug, version)`` or ``None`` if not a canonical id."""
    m = _SPEC_ID_RE.match(spec_id or "")
    if not m:
        return None
    return m.group("domain"), m.group("slug"), int(m.group("version"))


def _now() -> int:
    return int(time.time())


def _tenant_key(tenant: Optional[str]) -> str:
    """Normalize tenant for stats/outcome keying. ``None`` → ``''`` (global)."""
    return tenant or ""


# ---------------------------------------------------------------------------
# connection + schema
# ---------------------------------------------------------------------------

def ensure_spec_schema(conn: sqlite3.Connection) -> None:
    """Idempotently create the spec tables/indexes on ``conn``.

    Safe to call on every connect: pure ``CREATE TABLE/INDEX IF NOT EXISTS``.
    """
    conn.executescript(SPEC_SCHEMA_SQL)


def connect(
    db_path: Optional[Path] = None,
    *,
    board: Optional[str] = None,
) -> sqlite3.Connection:
    """Open the shared kanban DB (hardened) and ensure the spec schema.

    Reuses :func:`kanban_db.connect` so WAL, health checks, and cross-process
    init locking apply uniformly; then layers the spec tables on top.
    """
    conn = kb.connect(db_path=db_path, board=board)
    ensure_spec_schema(conn)
    return conn


# ---------------------------------------------------------------------------
# spec CRUD + versioning
# ---------------------------------------------------------------------------

def _spec_slug(spec: SubagentSpec) -> str:
    parsed = parse_spec_id(spec.id)
    if parsed:
        return parsed[1]
    return slugify(spec.name)


def upsert_spec(
    conn: sqlite3.Connection,
    spec: SubagentSpec,
    *,
    content_hash: Optional[str] = None,
) -> SubagentSpec:
    """Insert or replace a spec row (by ``id``). Returns the persisted spec.

    Stamps ``created_at`` on first write and always refreshes ``updated_at``.
    Stats are NOT written here (they live in their own table).
    """
    now = _now()
    existing = conn.execute(
        "SELECT created_at FROM subagent_specs WHERE id = ?", (spec.id,)
    ).fetchone()
    spec.created_at = existing["created_at"] if existing else (spec.created_at or now)
    spec.updated_at = now
    row = spec.to_row()
    row["slug"] = _spec_slug(spec)
    row["content_hash"] = content_hash
    cols = list(row.keys())
    placeholders = ", ".join(f":{c}" for c in cols)
    col_list = ", ".join(cols)
    with kb.write_txn(conn):
        conn.execute(
            f"INSERT OR REPLACE INTO subagent_specs ({col_list}) VALUES ({placeholders})",
            row,
        )
    return spec


def get_spec(conn: sqlite3.Connection, spec_id: str) -> Optional[SubagentSpec]:
    row = conn.execute(
        "SELECT * FROM subagent_specs WHERE id = ?", (spec_id,)
    ).fetchone()
    if not row:
        return None
    stats = get_stats(conn, spec_id, _row_tenant(row))
    return SubagentSpec.from_row(row, stats=stats)


def _row_tenant(row: sqlite3.Row) -> Optional[str]:
    try:
        return row["tenant"]
    except (KeyError, IndexError):
        return None


def max_version(
    conn: sqlite3.Connection,
    domain: str,
    slug: str,
    *,
    tenant: Optional[str] = None,
) -> int:
    """Highest version number for ``(domain, slug)`` (0 if none exist).

    ``tenant=None`` matches global (NULL-tenant) specs; a concrete tenant
    matches that tenant's rows plus global presets.
    """
    if tenant is None:
        row = conn.execute(
            "SELECT MAX(version) AS v FROM subagent_specs "
            "WHERE domain = ? AND slug = ? AND tenant IS NULL",
            (slugify(domain), slug),
        ).fetchone()
    else:
        row = conn.execute(
            "SELECT MAX(version) AS v FROM subagent_specs "
            "WHERE domain = ? AND slug = ? AND (tenant = ? OR tenant IS NULL)",
            (slugify(domain), slug, tenant),
        ).fetchone()
    return int(row["v"]) if row and row["v"] is not None else 0


def get_active_spec_by_slug(
    conn: sqlite3.Connection,
    domain: str,
    slug: str,
    *,
    tenant: Optional[str] = None,
) -> Optional[SubagentSpec]:
    """Highest *active* version for ``(domain, slug)`` visible to ``tenant``.

    Tenant-scoped specs win over global presets at the same version; routing
    always picks the newest active version.
    """
    rows = conn.execute(
        "SELECT * FROM subagent_specs "
        "WHERE domain = ? AND slug = ? AND status = 'active' "
        "AND (tenant IS NULL OR tenant = ?) "
        "ORDER BY version DESC, (tenant IS NOT NULL) DESC LIMIT 1",
        (slugify(domain), slug, _tenant_key(tenant) if tenant else None),
    ).fetchall()
    if not rows:
        return None
    row = rows[0]
    return SubagentSpec.from_row(row, stats=get_stats(conn, row["id"], _row_tenant(row)))


def list_specs(
    conn: sqlite3.Connection,
    *,
    domain: Optional[str] = None,
    tenant: Optional[str] = None,
    status: Optional[str] = "active",
    provenance: Optional[str] = None,
) -> list[SubagentSpec]:
    """List specs with optional filters. ``tenant`` includes global presets."""
    clauses: list[str] = []
    params: list[object] = []
    if domain is not None:
        clauses.append("domain = ?")
        params.append(slugify(domain))
    if status is not None:
        clauses.append("status = ?")
        params.append(status)
    if provenance is not None:
        clauses.append("provenance = ?")
        params.append(provenance)
    if tenant is not None:
        clauses.append("(tenant IS NULL OR tenant = ?)")
        params.append(tenant)
    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    rows = conn.execute(
        f"SELECT * FROM subagent_specs{where} ORDER BY domain, slug, version DESC",
        params,
    ).fetchall()
    return [
        SubagentSpec.from_row(r, stats=get_stats(conn, r["id"], _row_tenant(r)))
        for r in rows
    ]


def set_status(conn: sqlite3.Connection, spec_id: str, status: str) -> bool:
    """Transition a spec's lifecycle status. Returns True if a row changed."""
    with kb.write_txn(conn):
        cur = conn.execute(
            "UPDATE subagent_specs SET status = ?, updated_at = ? WHERE id = ?",
            (status, _now(), spec_id),
        )
    return cur.rowcount > 0


def register_next_version(
    conn: sqlite3.Connection,
    spec: SubagentSpec,
    *,
    deprecate_previous: bool = True,
) -> SubagentSpec:
    """Persist ``spec`` as the next version of its ``(domain, slug)`` lineage.

    Assigns ``id``/``version``/``parent_spec_id`` from the current max version,
    optionally deprecating the previous active version (Evolution / mutation).
    """
    slug = _spec_slug(spec)
    prev_version = max_version(conn, spec.domain, slug, tenant=spec.tenant)
    new_version = prev_version + 1
    if prev_version >= 1:
        prev_id = make_spec_id(spec.domain, slug, prev_version)
        spec.parent_spec_id = prev_id
        if deprecate_previous:
            set_status(conn, prev_id, "deprecated")
    spec.version = new_version
    spec.id = make_spec_id(spec.domain, slug, new_version)
    return upsert_spec(conn, spec)


# ---------------------------------------------------------------------------
# preset idempotency
# ---------------------------------------------------------------------------

def upsert_preset(
    conn: sqlite3.Connection,
    spec: SubagentSpec,
    *,
    content_hash: str,
) -> str:
    """Idempotently load a preset spec, keyed on ``source_path`` + content hash.

    Returns one of ``"inserted"``, ``"updated"``, ``"unchanged"`` so the loader
    can report what happened. Re-running on an unchanged file is a no-op.
    """
    existing = None
    if spec.source_path:
        existing = conn.execute(
            "SELECT id, content_hash FROM subagent_specs WHERE source_path = ?",
            (spec.source_path,),
        ).fetchone()
    if existing is None:
        upsert_spec(conn, spec, content_hash=content_hash)
        return "inserted"
    if existing["content_hash"] == content_hash:
        return "unchanged"
    # File changed on disk → refresh in place, keeping the same id/version.
    spec.id = existing["id"]
    upsert_spec(conn, spec, content_hash=content_hash)
    return "updated"


# ---------------------------------------------------------------------------
# stats + outcomes (Memory Graph)
# ---------------------------------------------------------------------------

def get_stats(
    conn: sqlite3.Connection, spec_id: str, tenant: Optional[str]
) -> SpecStats:
    row = conn.execute(
        "SELECT * FROM subagent_spec_stats WHERE spec_id = ? AND tenant = ?",
        (spec_id, _tenant_key(tenant)),
    ).fetchone()
    if not row:
        return SpecStats()
    return SpecStats(
        usage_count=row["usage_count"],
        win_count=row["win_count"],
        fail_count=row["fail_count"],
        win_rate=row["win_rate"],
        avg_cost_cents=row["avg_cost_cents"],
        avg_latency_ms=row["avg_latency_ms"],
        sample_size=row["sample_size"],
        last_used_at=row["last_used_at"],
    )


def record_outcome(
    conn: sqlite3.Connection,
    *,
    spec_id: str,
    task_id: str,
    runtime: str,
    outcome: str,
    tenant: Optional[str] = None,
    critic_verdict: Optional[str] = None,
    cost_cents: Optional[int] = None,
    latency_ms: Optional[int] = None,
    failure_class: Optional[str] = None,
    failure_note: Optional[str] = None,
) -> SpecStats:
    """Append one outcome row and roll up ``subagent_spec_stats`` from scratch.

    Recomputing the aggregate from ``subagent_outcomes`` each time (rather than
    incrementally) keeps stats drift-free; at preset scale this is cheap and the
    ``idx_outcomes_spec`` index keeps the scan bounded.
    """
    tkey = _tenant_key(tenant)
    now = _now()
    with kb.write_txn(conn):
        conn.execute(
            "INSERT INTO subagent_outcomes "
            "(spec_id, task_id, tenant, runtime, outcome, critic_verdict, "
            " cost_cents, latency_ms, failure_class, failure_note, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                spec_id, task_id, tkey, runtime, outcome, critic_verdict,
                cost_cents, latency_ms, failure_class, failure_note, now,
            ),
        )
        agg = conn.execute(
            "SELECT "
            "  COUNT(*) AS usage_count, "
            "  SUM(CASE WHEN outcome IN ('pass') THEN 1 ELSE 0 END) AS win_count, "
            "  SUM(CASE WHEN outcome IN ('fail','timeout','crashed') THEN 1 ELSE 0 END) AS fail_count, "
            "  AVG(cost_cents) AS avg_cost, "
            "  AVG(latency_ms) AS avg_latency, "
            "  MAX(created_at) AS last_used "
            "FROM subagent_outcomes WHERE spec_id = ? AND tenant = ?",
            (spec_id, tkey),
        ).fetchone()
        win = int(agg["win_count"] or 0)
        fail = int(agg["fail_count"] or 0)
        sample = win + fail
        win_rate = (win / sample) if sample else 0.0
        stats = SpecStats(
            usage_count=int(agg["usage_count"] or 0),
            win_count=win,
            fail_count=fail,
            win_rate=win_rate,
            avg_cost_cents=float(agg["avg_cost"] or 0.0),
            avg_latency_ms=int(agg["avg_latency"] or 0),
            sample_size=sample,
            last_used_at=agg["last_used"],
        )
        conn.execute(
            "INSERT OR REPLACE INTO subagent_spec_stats "
            "(spec_id, tenant, usage_count, win_count, fail_count, win_rate, "
            " avg_cost_cents, avg_latency_ms, sample_size, last_used_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                spec_id, tkey, stats.usage_count, stats.win_count, stats.fail_count,
                stats.win_rate, stats.avg_cost_cents, stats.avg_latency_ms,
                stats.sample_size, stats.last_used_at,
            ),
        )
    return stats


def recent_failures(
    conn: sqlite3.Connection,
    spec_id: str,
    *,
    tenant: Optional[str] = None,
    limit: int = 5,
) -> list[sqlite3.Row]:
    """Most recent failure-memory rows for a spec (Recovery / Route Score)."""
    return conn.execute(
        "SELECT * FROM subagent_outcomes "
        "WHERE spec_id = ? AND tenant = ? AND outcome IN ('fail','timeout','crashed') "
        "ORDER BY created_at DESC LIMIT ?",
        (spec_id, _tenant_key(tenant), limit),
    ).fetchall()


def all_spec_ids(conn: sqlite3.Connection) -> Iterable[str]:
    return [r["id"] for r in conn.execute("SELECT id FROM subagent_specs")]
