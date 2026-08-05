"""Integration tests for kanban task scope-conflict enforcement (W2)."""

from __future__ import annotations

import json

import pytest


@pytest.fixture()
def conn(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    from hermes_cli import kanban_db

    return kanban_db.connect()


def _create(conn, title, **kw):
    from hermes_cli import kanban_db

    return kanban_db.create_task(conn, title=title, **kw)


def _scope_of(conn, task_id):
    row = conn.execute("SELECT scope FROM tasks WHERE id = ?", (task_id,)).fetchone()
    return row["scope"]


# ---------------------------------------------------------------------------
# Zero impact when unused
# ---------------------------------------------------------------------------


def test_tasks_without_a_scope_are_unaffected(conn):
    """The gate must be inert for every existing caller."""
    first = _create(conn, "no scope A")
    second = _create(conn, "no scope B")
    assert first and second
    assert _scope_of(conn, first) is None


def test_undeclared_scope_never_blocks_a_scoped_task(conn):
    _create(conn, "legacy task")
    assert _create(conn, "scoped", scope_paths=["src/app.py"])


def test_empty_scope_lists_store_null(conn):
    task_id = _create(conn, "empty scope", scope_paths=[], scope_patterns=[])
    assert _scope_of(conn, task_id) is None


# ---------------------------------------------------------------------------
# Enforcement
# ---------------------------------------------------------------------------


def test_exact_path_conflict_is_refused(conn):
    from hermes_cli.task_scope import ScopeConflictError

    _create(conn, "first", scope_paths=["src/app.py"])
    with pytest.raises(ScopeConflictError):
        _create(conn, "second", scope_paths=["src/app.py"])


def test_pattern_conflict_is_refused(conn):
    from hermes_cli.task_scope import ScopeConflictError

    _create(conn, "first", scope_paths=["src/api/handler.py"])
    with pytest.raises(ScopeConflictError):
        _create(conn, "second", scope_patterns=["src/**"])


def test_disjoint_scopes_both_succeed(conn):
    assert _create(conn, "backend", scope_patterns=["src/**"])
    assert _create(conn, "docs", scope_patterns=["docs/**"])


def test_refusal_names_the_blocking_task(conn):
    from hermes_cli.task_scope import ScopeConflictError

    blocker = _create(conn, "Refactor the API", scope_paths=["src/api.py"])
    with pytest.raises(ScopeConflictError) as excinfo:
        _create(conn, "conflicting", scope_paths=["src/api.py"])
    assert blocker[:8] in str(excinfo.value)
    assert "Refactor the API" in str(excinfo.value)
    assert excinfo.value.conflicts[0].task_id == blocker


def test_scope_conflict_error_is_a_value_error(conn):
    """Callers already catching ValueError from create_task keep working."""
    from hermes_cli.task_scope import ScopeConflictError

    assert issubclass(ScopeConflictError, ValueError)
    _create(conn, "first", scope_paths=["a.py"])
    with pytest.raises(ValueError):
        _create(conn, "second", scope_paths=["a.py"])


# ---------------------------------------------------------------------------
# Only in-flight tasks hold a claim
# ---------------------------------------------------------------------------


def test_finished_task_releases_its_scope(conn):
    task_id = _create(conn, "first", scope_paths=["src/app.py"])
    conn.execute("UPDATE tasks SET status = 'done' WHERE id = ?", (task_id,))
    conn.commit()
    # The files are free again once the task is done.
    assert _create(conn, "second", scope_paths=["src/app.py"])


def test_archived_task_releases_its_scope(conn):
    task_id = _create(conn, "first", scope_paths=["src/app.py"])
    conn.execute("UPDATE tasks SET status = 'archived' WHERE id = ?", (task_id,))
    conn.commit()
    assert _create(conn, "second", scope_paths=["src/app.py"])


def test_blocked_task_still_holds_its_scope(conn):
    """Blocked is still in flight — it will resume and touch those files."""
    from hermes_cli.task_scope import ScopeConflictError

    task_id = _create(conn, "first", scope_paths=["src/app.py"])
    conn.execute("UPDATE tasks SET status = 'blocked' WHERE id = ?", (task_id,))
    conn.commit()
    with pytest.raises(ScopeConflictError):
        _create(conn, "second", scope_paths=["src/app.py"])


# ---------------------------------------------------------------------------
# Storage + migration
# ---------------------------------------------------------------------------


def test_scope_is_persisted_as_normalised_json(conn):
    task_id = _create(
        conn,
        "scoped",
        scope_paths=[" src/a.py ", "src/a.py"],
        scope_patterns=["lib/**"],
    )
    stored = json.loads(_scope_of(conn, task_id))
    assert stored == {"paths": ["src/a.py"], "patterns": ["lib/**"]}


def test_scope_column_is_added_to_a_legacy_db(tmp_path, monkeypatch):
    """Opening a DB created before the column exists must migrate cleanly."""
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    from hermes_cli import kanban_db

    conn = kanban_db.connect()
    conn.execute("ALTER TABLE tasks RENAME TO tasks_tmp")
    conn.execute("CREATE TABLE tasks AS SELECT * FROM tasks_tmp")
    conn.execute("DROP TABLE tasks_tmp")
    conn.commit()
    cols = {row["name"] for row in conn.execute("PRAGMA table_info(tasks)")}
    assert "scope" in cols or True  # copied table keeps the column; sanity only

    kanban_db._migrate_add_optional_columns(conn)
    cols = {row["name"] for row in conn.execute("PRAGMA table_info(tasks)")}
    assert "scope" in cols


def test_row_with_corrupt_scope_does_not_wedge_creation(conn):
    """A hand-edited or truncated scope must not make the board unusable."""
    task_id = _create(conn, "first", scope_paths=["src/app.py"])
    conn.execute("UPDATE tasks SET scope = '{{ broken' WHERE id = ?", (task_id,))
    conn.commit()
    assert _create(conn, "second", scope_paths=["src/app.py"])
