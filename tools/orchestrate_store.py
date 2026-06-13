"""Local Hermes run store for Merlion orchestration runs.

Persists only the run *header + immutable plan* (`merlion_runs`). Execution
state (per-subtask status) lives solely in the kanban tasks created by
``orchestrate.start_run`` — this table never duplicates it, avoiding dual-write
drift. A run snapshot merges the static plan here with live kanban task status.

Piggybacks on the shared kanban SQLite connection (same DB as the spec
registry), so a run, its specs, and its tasks all live in one store.
"""

from __future__ import annotations

import json
import time
from dataclasses import dataclass, field
from typing import Any, Optional

import sqlite3

RUN_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS merlion_runs (
    run_id           TEXT PRIMARY KEY,
    brief            TEXT NOT NULL,
    tier             TEXT NOT NULL,
    scale            TEXT NOT NULL,
    departments_json TEXT,                 -- JSON array of department ids
    plan_json        TEXT,                 -- serialized OrchestrationPlan (immutable)
    board_id         TEXT,                 -- kanban board for this run's tasks
    status           TEXT NOT NULL DEFAULT 'planning',  -- planning|running|done|failed
    tenant           TEXT,
    created_at       INTEGER NOT NULL,
    updated_at       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_merlion_runs_tenant ON merlion_runs(tenant, created_at);
"""

VALID_RUN_STATUSES: frozenset[str] = frozenset({"planning", "running", "done", "failed"})


@dataclass
class RunRecord:
    run_id: str
    brief: str
    tier: str
    scale: str
    departments: list[str] = field(default_factory=list)
    plan: dict[str, Any] = field(default_factory=dict)
    board_id: Optional[str] = None
    status: str = "planning"
    tenant: Optional[str] = None
    created_at: int = 0
    updated_at: int = 0

    @classmethod
    def from_row(cls, row: Any) -> "RunRecord":
        get = row.__getitem__
        return cls(
            run_id=get("run_id"),
            brief=get("brief"),
            tier=get("tier"),
            scale=get("scale"),
            departments=json.loads(get("departments_json") or "[]"),
            plan=json.loads(get("plan_json") or "{}"),
            board_id=get("board_id"),
            status=get("status"),
            tenant=get("tenant"),
            created_at=get("created_at"),
            updated_at=get("updated_at"),
        )


def ensure_run_schema(conn: sqlite3.Connection) -> None:
    """Idempotently create the run table/index. Safe on every connect."""
    conn.executescript(RUN_SCHEMA_SQL)


def _now() -> int:
    return int(time.time())


def create_run(
    conn: sqlite3.Connection,
    *,
    run_id: str,
    brief: str,
    tier: str,
    scale: str,
    departments: list[str],
    plan: dict[str, Any],
    board_id: Optional[str] = None,
    tenant: Optional[str] = None,
    status: str = "planning",
) -> RunRecord:
    if status not in VALID_RUN_STATUSES:
        raise ValueError(f"status must be one of {sorted(VALID_RUN_STATUSES)}")
    now = _now()
    rec = RunRecord(
        run_id=run_id, brief=brief, tier=tier, scale=scale,
        departments=list(departments), plan=plan, board_id=board_id,
        status=status, tenant=tenant, created_at=now, updated_at=now,
    )
    conn.execute(
        "INSERT INTO merlion_runs (run_id, brief, tier, scale, departments_json, "
        "plan_json, board_id, status, tenant, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            rec.run_id, rec.brief, rec.tier, rec.scale,
            json.dumps(rec.departments), json.dumps(rec.plan), rec.board_id,
            rec.status, rec.tenant, rec.created_at, rec.updated_at,
        ),
    )
    conn.commit()
    return rec


def get_run(conn: sqlite3.Connection, run_id: str) -> Optional[RunRecord]:
    row = conn.execute(
        "SELECT * FROM merlion_runs WHERE run_id = ?", (run_id,)
    ).fetchone()
    return RunRecord.from_row(row) if row else None


def update_run(
    conn: sqlite3.Connection,
    run_id: str,
    *,
    status: Optional[str] = None,
    plan: Optional[dict[str, Any]] = None,
) -> bool:
    """Update run status and/or plan. Returns True if a row changed."""
    sets: list[str] = ["updated_at = ?"]
    params: list[Any] = [_now()]
    if status is not None:
        if status not in VALID_RUN_STATUSES:
            raise ValueError(f"status must be one of {sorted(VALID_RUN_STATUSES)}")
        sets.append("status = ?")
        params.append(status)
    if plan is not None:
        sets.append("plan_json = ?")
        params.append(json.dumps(plan))
    params.append(run_id)
    cur = conn.execute(
        f"UPDATE merlion_runs SET {', '.join(sets)} WHERE run_id = ?", params
    )
    conn.commit()
    return cur.rowcount > 0


def list_runs(
    conn: sqlite3.Connection,
    *,
    tenant: Optional[str] = None,
    limit: Optional[int] = None,
) -> list[RunRecord]:
    query = "SELECT * FROM merlion_runs"
    params: list[Any] = []
    if tenant is not None:
        query += " WHERE tenant = ?"
        params.append(tenant)
    query += " ORDER BY created_at DESC"
    if limit is not None:
        query += " LIMIT ?"
        params.append(int(limit))
    return [RunRecord.from_row(r) for r in conn.execute(query, params)]
