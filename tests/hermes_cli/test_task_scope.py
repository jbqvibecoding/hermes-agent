"""Tests for kanban task path-scope conflict detection (W2).

Ported algorithm from wanman's task-pool; these cover all four overlap cases
plus the parsing/degradation behaviour that keeps a bad stored scope from
wedging task creation.
"""

from __future__ import annotations

import json

import pytest

from hermes_cli.task_scope import (
    ScopeConflict,
    TaskScope,
    check_scope,
    find_conflicts,
    format_conflict_error,
    make_scope,
    parse_scope,
    path_matches_pattern,
    pattern_to_prefix,
    patterns_overlap,
    scopes_overlap,
)


def _row(task_id, scope, **kw):
    row = {"id": task_id, "scope": scope}
    row.update(kw)
    return row


# ---------------------------------------------------------------------------
# Normalisation and parsing
# ---------------------------------------------------------------------------


def test_make_scope_trims_and_dedupes():
    scope = make_scope([" src/a.py ", "src/a.py", "/src/b.py/"], ["src/**", "src/**"])
    assert scope.paths == ("src/a.py", "src/b.py")
    assert scope.patterns == ("src/**",)


def test_make_scope_ignores_non_strings():
    assert make_scope([1, None, "ok"], None).paths == ("ok",)


def test_empty_scope_is_empty():
    assert make_scope().is_empty()
    assert make_scope([], []).is_empty()
    assert not make_scope(["a"]).is_empty()


def test_parse_scope_roundtrips_json():
    original = make_scope(["src/a.py"], ["docs/**"])
    assert parse_scope(original.to_json()) == original


def test_parse_scope_accepts_mapping():
    assert parse_scope({"paths": ["x"], "patterns": []}).paths == ("x",)


@pytest.mark.parametrize("bad", [None, "", "   ", "not json", "[1,2]", 42, b"x"])
def test_parse_scope_degrades_to_empty_never_raises(bad):
    """A legacy row or hand-edited value must not be able to block creation."""
    assert parse_scope(bad).is_empty()


def test_parse_scope_passes_through_taskscope():
    scope = make_scope(["a"])
    assert parse_scope(scope) is scope


# ---------------------------------------------------------------------------
# Pattern primitives
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "pattern,expected",
    [("src/**", "src"), ("src/*", "src"), ("src", "src"), ("a/b/**", "a/b")],
)
def test_pattern_to_prefix(pattern, expected):
    assert pattern_to_prefix(pattern) == expected


def test_path_matches_pattern_covers_prefix_and_children():
    assert path_matches_pattern("src", "src/**")
    assert path_matches_pattern("src/api/x.py", "src/**")
    assert not path_matches_pattern("srcery/x.py", "src/**")
    assert not path_matches_pattern("other/x.py", "src/**")


def test_patterns_overlap_when_one_contains_the_other():
    assert patterns_overlap("src/**", "src/api/**")
    assert patterns_overlap("src/api/**", "src/**")
    assert patterns_overlap("src/**", "src/**")
    assert not patterns_overlap("src/**", "docs/**")
    # Sibling prefixes that share a string prefix must NOT overlap.
    assert not patterns_overlap("src/**", "srcery/**")


# ---------------------------------------------------------------------------
# The four overlap cases
# ---------------------------------------------------------------------------


def test_case1_exact_path_intersection():
    a = make_scope(["src/app.py", "README.md"])
    b = make_scope(["README.md"])
    assert scopes_overlap(a, b)


def test_case2_a_pattern_vs_b_path():
    assert scopes_overlap(make_scope(patterns=["src/**"]), make_scope(["src/api/x.py"]))


def test_case3_b_pattern_vs_a_path():
    assert scopes_overlap(make_scope(["src/api/x.py"]), make_scope(patterns=["src/**"]))


def test_case4_pattern_vs_pattern():
    assert scopes_overlap(
        make_scope(patterns=["src/**"]), make_scope(patterns=["src/api/**"])
    )


def test_disjoint_scopes_do_not_overlap():
    assert not scopes_overlap(
        make_scope(["src/a.py"], ["src/api/**"]),
        make_scope(["docs/b.md"], ["docs/**"]),
    )


def test_overlap_is_symmetric():
    a = make_scope(["src/a.py"], ["lib/**"])
    b = make_scope(["lib/x.py"])
    assert scopes_overlap(a, b) == scopes_overlap(b, a) is True


def test_undeclared_scope_never_conflicts():
    """Not declaring a scope must stay a no-op, so existing boards keep working."""
    everything = make_scope(patterns=["**"])
    assert not scopes_overlap(make_scope(), everything)
    assert not scopes_overlap(everything, make_scope())


# ---------------------------------------------------------------------------
# Conflict lookup against active tasks
# ---------------------------------------------------------------------------


def test_find_conflicts_names_the_blocking_tasks():
    active = [
        _row("aaaa1111", make_scope(["src/app.py"]).to_json(), title="Refactor app"),
        _row("bbbb2222", make_scope(["docs/x.md"]).to_json(), title="Docs"),
    ]
    conflicts = find_conflicts(make_scope(["src/app.py"]), active)
    assert [c.task_id for c in conflicts] == ["aaaa1111"]
    assert conflicts[0].title == "Refactor app"


def test_find_conflicts_excludes_self():
    active = [_row("same", make_scope(["src/a.py"]).to_json())]
    assert (
        find_conflicts(make_scope(["src/a.py"]), active, exclude_task_id="same") == []
    )


def test_find_conflicts_ignores_rows_with_unparseable_scope():
    active = [_row("x", "{{{ not json"), _row("y", None)]
    assert find_conflicts(make_scope(["src/a.py"]), active) == []


def test_find_conflicts_for_empty_scope_is_empty():
    active = [_row("x", make_scope(["src/a.py"]).to_json())]
    assert find_conflicts(make_scope(), active) == []


def test_find_conflicts_accepts_object_rows():
    class Row:
        id = "obj1"
        scope = json.dumps({"paths": ["src/a.py"], "patterns": []})
        title = "Object row"
        assignee = None
        status = "pending"

    assert find_conflicts(make_scope(["src/a.py"]), [Row()])[0].task_id == "obj1"


# ---------------------------------------------------------------------------
# Decision + message
# ---------------------------------------------------------------------------


def test_check_scope_allows_when_no_conflict():
    result = check_scope(
        make_scope(["a.py"]), [_row("x", make_scope(["b.py"]).to_json())]
    )
    assert result.allowed
    assert result.message == ""


def test_check_scope_refuses_with_a_readable_message():
    active = [
        _row(
            "deadbeef1234",
            make_scope(["src/a.py"]).to_json(),
            title="Rewrite core",
            assignee="worker-1",
        )
    ]
    result = check_scope(make_scope(patterns=["src/**"]), active)
    assert not result.allowed
    assert "deadbeef" in result.message
    assert "Rewrite core" in result.message
    assert "worker-1" in result.message
    # The message must tell the user what to do about it.
    assert "Narrow the scope" in result.message


def test_format_conflict_error_empty_is_empty():
    assert format_conflict_error([]) == ""


def test_format_conflict_error_truncates_long_titles():
    long_title = "x" * 200
    message = format_conflict_error([
        ScopeConflict(task_id="abcdefgh", title=long_title)
    ])
    assert len(message) < 200


def test_taskscope_is_hashable_and_frozen():
    scope = make_scope(["a"], ["b/**"])
    assert {scope: 1}[scope] == 1
    with pytest.raises(Exception):
        scope.paths = ("c",)  # type: ignore[misc]
