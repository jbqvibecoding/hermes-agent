from __future__ import annotations

import pytest

from hermes_cli import kanban_db as kb
from tools import orchestrate_store as store


@pytest.fixture
def conn(tmp_path):
    c = kb.connect(db_path=tmp_path / "kanban.db")
    store.ensure_run_schema(c)
    yield c
    c.close()


def test_create_and_get_run(conn):
    rec = store.create_run(
        conn, run_id="run_1", brief="build app", tier="very_complex", scale="org",
        departments=["eng", "product"], plan={"task_map": {"st0": "t_a"}},
        board_id="run_1", status="running",
    )
    assert rec.status == "running"
    got = store.get_run(conn, "run_1")
    assert got is not None
    assert got.brief == "build app"
    assert got.departments == ["eng", "product"]
    assert got.plan["task_map"]["st0"] == "t_a"


def test_get_missing_run_is_none(conn):
    assert store.get_run(conn, "nope") is None


def test_update_run_status_and_plan(conn):
    store.create_run(
        conn, run_id="run_2", brief="x", tier="complex", scale="small",
        departments=[], plan={}, status="running",
    )
    assert store.update_run(conn, "run_2", status="done", plan={"k": 1}) is True
    got = store.get_run(conn, "run_2")
    assert got.status == "done"
    assert got.plan == {"k": 1}


def test_invalid_status_rejected(conn):
    with pytest.raises(ValueError):
        store.create_run(
            conn, run_id="r", brief="x", tier="complex", scale="small",
            departments=[], plan={}, status="bogus",
        )


def test_list_runs_orders_recent_first(conn):
    for i in range(3):
        store.create_run(
            conn, run_id=f"r{i}", brief="x", tier="complex", scale="small",
            departments=[], plan={}, tenant="ws1",
        )
    runs = store.list_runs(conn, tenant="ws1")
    assert [r.run_id for r in runs][:1] == ["r2"]  # most recent first
    assert len(runs) == 3
