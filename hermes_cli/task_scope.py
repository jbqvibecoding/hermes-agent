"""Path-scope conflict detection for concurrently active kanban tasks.

Ported from wanman (`packages/runtime/src/task-pool.ts`, Apache-2.0):

    Copyright wanman contributors.
    Licensed under the Apache License, Version 2.0.
    http://www.apache.org/licenses/LICENSE-2.0

**Why this exists.** Kanban already isolates concurrent tasks at *execution*
time: each one can get its own git worktree (``workspace_kind='worktree'``), so
two workers never trip over each other's checkout. What that does not prevent
is a *semantic* conflict — two tasks editing the same file in their respective
worktrees, which stays invisible until both branches try to land. This closes
that by refusing, at creation time, to open a task whose declared file scope
overlaps one already in flight.

The two mechanisms are complementary: worktrees stop interference while work
runs, scopes stop the collision from being scheduled in the first place.

**Modifications from upstream.** The overlap algorithm and its four cases are
ported faithfully. Upstream returns the conflicting rows and leaves the caller
to decide; the SQL-facing half of that lives in ``kanban_db`` here, so this
module stays a dependency-free pure function set that is trivial to test.
Scope parsing is also more forgiving than upstream's ``JSON.parse``: a
malformed or absent scope degrades to "no declared scope", which never
conflicts, so an old row or a hand-edited DB can't wedge task creation.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any, Iterable, List, Optional, Sequence, Tuple


@dataclass(frozen=True)
class TaskScope:
    """The set of files a task declares it will touch.

    ``paths`` are exact repo-relative file or directory paths. ``patterns`` are
    prefix globs (``src/api/**``); only a trailing ``/*`` or ``/**`` is
    meaningful — see :func:`pattern_to_prefix`.

    An empty scope means "undeclared", and never conflicts with anything.
    """

    paths: Tuple[str, ...] = ()
    patterns: Tuple[str, ...] = ()

    def is_empty(self) -> bool:
        return not self.paths and not self.patterns

    def to_json(self) -> str:
        return json.dumps({"paths": list(self.paths), "patterns": list(self.patterns)})


def _clean(values: Any) -> Tuple[str, ...]:
    """Normalise a path/pattern list: strings only, trimmed, de-duplicated."""
    if not isinstance(values, (list, tuple)):
        return ()
    seen: List[str] = []
    for value in values:
        if not isinstance(value, str):
            continue
        cleaned = value.strip().strip("/")
        if cleaned and cleaned not in seen:
            seen.append(cleaned)
    return tuple(seen)


def make_scope(
    paths: Optional[Iterable[str]] = None,
    patterns: Optional[Iterable[str]] = None,
) -> TaskScope:
    """Build a normalised :class:`TaskScope` from raw path/pattern lists."""
    return TaskScope(
        paths=_clean(list(paths) if paths is not None else []),
        patterns=_clean(list(patterns) if patterns is not None else []),
    )


def parse_scope(raw: Any) -> TaskScope:
    """Parse a stored scope (JSON string or mapping) into a :class:`TaskScope`.

    Never raises: anything unrecognisable becomes an empty (non-conflicting)
    scope, so a legacy row or hand-edited value cannot block task creation.
    """
    if raw is None or isinstance(raw, TaskScope):
        return raw if isinstance(raw, TaskScope) else TaskScope()
    if isinstance(raw, str):
        text = raw.strip()
        if not text:
            return TaskScope()
        try:
            raw = json.loads(text)
        except (ValueError, TypeError):
            return TaskScope()
    if not isinstance(raw, dict):
        return TaskScope()
    return make_scope(raw.get("paths"), raw.get("patterns"))


def pattern_to_prefix(pattern: str) -> str:
    """Strip a trailing ``/**`` or ``/*`` to get the pattern's directory prefix."""
    if pattern.endswith("/**"):
        return pattern[:-3]
    if pattern.endswith("/*"):
        return pattern[:-2]
    return pattern


def path_matches_pattern(path: str, pattern: str) -> bool:
    """Whether *path* falls under *pattern*'s prefix (or is the prefix itself)."""
    prefix = pattern_to_prefix(pattern)
    return path == prefix or path.startswith(prefix + "/")


def patterns_overlap(a: str, b: str) -> bool:
    """Whether two prefix patterns cover any common path.

    True when either prefix contains the other, or they are equal.
    """
    prefix_a = pattern_to_prefix(a)
    prefix_b = pattern_to_prefix(b)
    return (
        prefix_a == prefix_b
        or prefix_a.startswith(prefix_b + "/")
        or prefix_b.startswith(prefix_a + "/")
    )


def scopes_overlap(a: TaskScope, b: TaskScope) -> bool:
    """Whether two task scopes touch any common file.

    Four cases, matching upstream:

    1. exact path intersection,
    2. ``a``'s patterns against ``b``'s paths,
    3. ``b``'s patterns against ``a``'s paths,
    4. pattern-against-pattern prefix containment.
    """
    # An undeclared scope makes no claim, so it can't collide with one.
    if a.is_empty() or b.is_empty():
        return False

    # (1) exact path intersection
    b_paths = set(b.paths)
    for path in a.paths:
        if path in b_paths:
            return True

    # (2) a's patterns vs b's paths
    for pattern in a.patterns:
        for path in b.paths:
            if path_matches_pattern(path, pattern):
                return True

    # (3) b's patterns vs a's paths
    for pattern in b.patterns:
        for path in a.paths:
            if path_matches_pattern(path, pattern):
                return True

    # (4) pattern vs pattern
    for pattern_a in a.patterns:
        for pattern_b in b.patterns:
            if patterns_overlap(pattern_a, pattern_b):
                return True

    return False


class ScopeConflictError(ValueError):
    """Raised when a task's declared scope overlaps one already in flight.

    Subclasses ``ValueError`` so existing ``create_task`` callers that catch
    validation errors keep working, while callers that care can catch this
    specifically and inspect :attr:`conflicts`.
    """

    def __init__(self, message: str, conflicts: Sequence["ScopeConflict"] = ()):
        super().__init__(message)
        self.conflicts = list(conflicts)


@dataclass(frozen=True)
class ScopeConflict:
    """One active task whose scope overlaps a proposed scope."""

    task_id: str
    title: str = ""
    assignee: Optional[str] = None
    status: str = ""


def find_conflicts(
    scope: TaskScope,
    active: Sequence[Any],
    *,
    exclude_task_id: Optional[str] = None,
) -> List[ScopeConflict]:
    """Return the active tasks whose scope overlaps *scope*.

    *active* holds row-like objects (sqlite3.Row, dict, or dataclass) carrying
    at least ``id`` and ``scope``; ``title``/``assignee``/``status`` are used
    for the error message when present.
    """
    conflicts: List[ScopeConflict] = []
    if scope.is_empty():
        return conflicts

    for row in active:
        task_id = str(_field(row, "id") or "")
        if not task_id or (exclude_task_id and task_id == exclude_task_id):
            continue
        if not scopes_overlap(scope, parse_scope(_field(row, "scope"))):
            continue
        conflicts.append(
            ScopeConflict(
                task_id=task_id,
                title=str(_field(row, "title") or ""),
                assignee=_field(row, "assignee"),
                status=str(_field(row, "status") or ""),
            )
        )
    return conflicts


def _field(row: Any, name: str) -> Any:
    """Read *name* from a sqlite3.Row, mapping, or object. None when absent."""
    if isinstance(row, dict):
        return row.get(name)
    try:
        return row[name]
    except (TypeError, KeyError, IndexError):
        return getattr(row, name, None)


def format_conflict_error(conflicts: Sequence[ScopeConflict]) -> str:
    """Render a human-readable refusal message naming the blocking tasks."""
    if not conflicts:
        return ""
    parts = []
    for conflict in conflicts:
        label = conflict.task_id[:8]
        if conflict.title:
            label += f" ({conflict.title[:40]})"
        if conflict.assignee:
            label += f" [{conflict.assignee}]"
        parts.append(label)
    return (
        "Task scope conflicts with active task(s): "
        + ", ".join(parts)
        + ". Narrow the scope, or wait for those tasks to finish."
    )


# Kanban statuses that count as "in flight" for conflict purposes — Hermes'
# own vocabulary (``kanban_db.VALID_STATUSES``), not wanman's. A ``done`` or
# ``archived`` task no longer holds a claim on its files, and ``triage`` is
# excluded because a task still being specified has not committed to a scope.
ACTIVE_STATUSES: Tuple[str, ...] = (
    "todo",
    "scheduled",
    "ready",
    "running",
    "blocked",
    "review",
)


@dataclass
class ScopeCheckResult:
    """Outcome of a scope check: allowed, or refused with named conflicts."""

    allowed: bool
    conflicts: List[ScopeConflict] = field(default_factory=list)
    message: str = ""

    @classmethod
    def ok(cls) -> "ScopeCheckResult":
        return cls(allowed=True)

    @classmethod
    def refused(cls, conflicts: List[ScopeConflict]) -> "ScopeCheckResult":
        return cls(
            allowed=False, conflicts=conflicts, message=format_conflict_error(conflicts)
        )


def check_scope(
    scope: TaskScope,
    active: Sequence[Any],
    *,
    exclude_task_id: Optional[str] = None,
) -> ScopeCheckResult:
    """Allow or refuse *scope* against the currently active tasks."""
    conflicts = find_conflicts(scope, active, exclude_task_id=exclude_task_id)
    return ScopeCheckResult.refused(conflicts) if conflicts else ScopeCheckResult.ok()
