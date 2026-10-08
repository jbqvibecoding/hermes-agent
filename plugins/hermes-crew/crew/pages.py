"""Hermes Crew — Spaces: documents a teammate and its operator both work in.

Everything else the crew writes is addressed to someone: a report chip in a
thread, a file in a teammate's workspace, a handoff to a colleague. A Space is
the first surface that is nobody's message — a document that stays where it is
while both of you edit it.

Ported in design from opendots' ``src/server/pages.ts``, which is the part of
that project that needs none of its runtime: no CopilotKit, no React, just
SQLite and a revision number. What carried over is the discipline around that
number, which is the whole idea:

* **``revision`` is an optimistic-concurrency token.** Every edit names the
  revision it was based on; the ``UPDATE`` matches on it inside a
  ``BEGIN IMMEDIATE`` transaction. Two writers racing produce one winner and
  one :class:`PageConflict`, never a silent overwrite. The teammate's edit tool
  makes ``expected_revision`` **required**, so a model physically cannot write
  a page it has not read.
* **Reparenting walks the ancestors with a seen-set.** A page moved under its
  own descendant would make a cycle that every later tree walk hangs on.

What did not carry over is their search: ``pages.ts``' caller scans every page
body in memory with ``String.includes``. :func:`search` uses SQLite FTS5, with
a substring fallback only for a Python built without it.

**Access.** :func:`resolve` re-reads ``bot_spaces`` on *every* call rather than
resolving a teammate's spaces once per turn. That is deliberate and it is the
only moment the distinction matters: an operator revoking access to a Space
while a turn is in flight expects the next tool call to stop, not the next
turn. opendots makes the same choice and says so in the error string.
"""

from __future__ import annotations

import re
import sqlite3
import uuid
from dataclasses import dataclass
from typing import Any, Optional

from crew import db as crew_db

#: Mirrors opendots' zod schema (`pageInput`). A title long enough to be a
#: paragraph is a sign the model is writing the document into the title.
MAX_TITLE = 160
MAX_CONTENT = 100_000

#: Cap on a search string before it is tokenised, as `hermes_state` caps its
#: own FTS input. A megabyte of punctuation is not a query.
MAX_QUERY = 2_048


class PageError(Exception):
    """A page operation that cannot proceed. ``status`` mirrors HTTP so the
    dashboard route and the tool handler can share one mapping."""

    status = 400

    def __init__(self, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.status = status


class PageNotFound(PageError):
    status = 404

    def __init__(self, message: str = "That page is not in this Space.") -> None:
        super().__init__(message, 404)


class PageConflict(PageError):
    status = 409

    def __init__(self, message: str) -> None:
        super().__init__(message, 409)


class SpaceAccessDenied(PageError):
    status = 403

    def __init__(self, message: str) -> None:
        super().__init__(message, 403)


# ---------------------------------------------------------------------------
# Ids
# ---------------------------------------------------------------------------


def new_space_id(conn: sqlite3.Connection, name: str) -> str:
    """A readable, unique slug for a Space.

    A slug rather than a UUID because this id is a *tool argument*: the model
    passes it, reads it back in a page link, and will sometimes have to tell
    the operator which Space it wrote to. ``marketing`` survives that trip;
    ``f47ac10b-58cc-…`` gets transcribed wrong.

    Uniqueness is by suffix. A Space named like an existing one is a normal
    thing for an operator to do and renaming theirs is not our business.
    """
    base = re.sub(r"[^a-z0-9]+", "-", (name or "").strip().lower()).strip("-")
    base = base[:48] or "space"
    candidate = base
    for suffix in range(2, 1000):
        taken = conn.execute("SELECT 1 FROM spaces WHERE id=?", (candidate,)).fetchone()
        if taken is None:
            return candidate
        candidate = f"{base}-{suffix}"
    raise PageError("Too many Spaces share that name. Give this one a distinct name.")


def _new_page_id() -> str:
    return f"pg_{uuid.uuid4().hex[:16]}"


# ---------------------------------------------------------------------------
# Spaces
# ---------------------------------------------------------------------------


def create_space(conn: sqlite3.Connection, *, name: str) -> dict:
    """Make a Space. The operator's call — no tool reaches this."""
    clean = (name or "").strip()
    if not clean:
        raise PageError("A Space needs a name.")
    space_id = new_space_id(conn, clean)
    with conn:
        conn.execute(
            "INSERT INTO spaces (id, name, created_at) VALUES (?,?,?)",
            (space_id, clean[:MAX_TITLE], crew_db.now_ms()),
        )
    return get_space(conn, space_id)


def get_space(conn: sqlite3.Connection, space_id: str) -> dict:
    row = conn.execute("SELECT * FROM spaces WHERE id=?", (space_id,)).fetchone()
    if row is None:
        raise PageNotFound("There is no Space with that id.")
    return dict(row)


def list_spaces(conn: sqlite3.Connection) -> list[dict]:
    return [dict(r) for r in conn.execute("SELECT * FROM spaces ORDER BY name, id")]


def delete_space(conn: sqlite3.Connection, space_id: str) -> bool:
    """Remove a Space, its pages and every teammate's access to it."""
    with conn:
        conn.execute("DELETE FROM pages WHERE space_id=?", (space_id,))
        conn.execute("DELETE FROM bot_spaces WHERE space_id=?", (space_id,))
        cursor = conn.execute("DELETE FROM spaces WHERE id=?", (space_id,))
    return cursor.rowcount > 0


# ---------------------------------------------------------------------------
# Access
# ---------------------------------------------------------------------------


def grant_space(conn: sqlite3.Connection, *, bot_id: str, space_id: str) -> None:
    """Invite a teammate into a Space. The operator's call."""
    get_space(conn, space_id)
    with conn:
        conn.execute(
            "INSERT OR IGNORE INTO bot_spaces (bot_id, space_id, granted_at) VALUES (?,?,?)",
            (bot_id, space_id, crew_db.now_ms()),
        )


def revoke_space(conn: sqlite3.Connection, *, bot_id: str, space_id: str) -> bool:
    with conn:
        cursor = conn.execute(
            "DELETE FROM bot_spaces WHERE bot_id=? AND space_id=?", (bot_id, space_id)
        )
    return cursor.rowcount > 0


def can_access(conn: sqlite3.Connection, *, bot_id: str, space_id: str) -> bool:
    return conn.execute(
        "SELECT 1 FROM bot_spaces WHERE bot_id=? AND space_id=?", (bot_id, space_id)
    ).fetchone() is not None


def spaces_for(conn: sqlite3.Connection, bot_id: str) -> list[dict]:
    """Every Space this teammate may use, in listing order."""
    return [
        dict(r)
        for r in conn.execute(
            "SELECT spaces.* FROM spaces JOIN bot_spaces ON bot_spaces.space_id = spaces.id "
            "WHERE bot_spaces.bot_id=? ORDER BY spaces.name, spaces.id",
            (bot_id,),
        )
    ]


def resolve(conn: sqlite3.Connection, *, bot_id: str, space_id: Optional[str] = None) -> str:
    """The Space this call is for, or a refusal.

    Called at the top of every page operation a *teammate* makes. The re-read
    is the point — see the module docstring.

    With no ``space_id``, a teammate that has exactly one Space does not have
    to name it; one with several must, because guessing which shared document
    the operator meant is the kind of help nobody wants.
    """
    if space_id:
        if not can_access(conn, bot_id=bot_id, space_id=space_id):
            raise SpaceAccessDenied(
                f"You do not have access to the Space '{space_id}'. "
                "Ask your operator to invite you, or use one you already have."
            )
        return space_id

    mine = spaces_for(conn, bot_id)
    if not mine:
        raise SpaceAccessDenied(
            "You have not been invited into any Space yet. Ask your operator for one."
        )
    if len(mine) > 1:
        names = ", ".join(f"{s['id']} ({s['name']})" for s in mine)
        raise PageError(f"Say which Space you mean. Yours are: {names}.")
    return mine[0]["id"]


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class _Draft:
    title: str
    content: str
    parent_id: Optional[str]


def _clean_draft(title: Any, content: Any, parent_id: Any) -> _Draft:
    clean_title = str(title or "").strip()
    if not clean_title:
        raise PageError("A page needs a title.")
    if len(clean_title) > MAX_TITLE:
        raise PageError(f"Page titles are at most {MAX_TITLE} characters.")
    body = "" if content is None else str(content)
    if len(body) > MAX_CONTENT:
        raise PageError(f"Page content is at most {MAX_CONTENT:,} characters.")
    parent = str(parent_id).strip() if parent_id else None
    return _Draft(clean_title, body, parent or None)


def get_page(conn: sqlite3.Connection, *, space_id: str, page_id: str) -> dict:
    row = conn.execute(
        "SELECT * FROM pages WHERE id=? AND space_id=?", (page_id, space_id)
    ).fetchone()
    if row is None:
        raise PageNotFound()
    return dict(row)


def list_pages(conn: sqlite3.Connection, space_id: str) -> list[dict]:
    return [
        dict(r)
        for r in conn.execute(
            "SELECT * FROM pages WHERE space_id=? ORDER BY created_at, id", (space_id,)
        )
    ]


def _check_parent(
    conn: sqlite3.Connection,
    *,
    space_id: str,
    parent_id: Optional[str],
    page_id: Optional[str] = None,
) -> None:
    """Refuse a parent that is missing, in another Space, or an own descendant.

    The seen-set is not belt-and-braces: without it, a pair of pages already
    pointing at each other (which a cycle check added later would have to
    tolerate) turns this walk into an infinite loop rather than an error.
    """
    seen = {page_id} if page_id else set()
    cursor = parent_id
    while cursor:
        if cursor in seen:
            raise PageError("A page cannot be moved into itself or one of its own children.")
        seen.add(cursor)
        cursor = get_page(conn, space_id=space_id, page_id=cursor)["parent_id"]


def create_page(
    conn: sqlite3.Connection,
    *,
    space_id: str,
    title: str,
    content: str = "",
    parent_id: Optional[str] = None,
    created_by: str = "",
) -> dict:
    get_space(conn, space_id)
    draft = _clean_draft(title, content, parent_id)
    _check_parent(conn, space_id=space_id, parent_id=draft.parent_id)
    page_id = _new_page_id()
    now = crew_db.now_ms()
    with conn:
        conn.execute(
            "INSERT INTO pages (id, space_id, parent_id, title, content, revision, "
            "created_at, updated_at, created_by) VALUES (?,?,?,?,?,1,?,?,?)",
            (page_id, space_id, draft.parent_id, draft.title, draft.content,
             now, now, created_by),
        )
    return get_page(conn, space_id=space_id, page_id=page_id)


def update_page(
    conn: sqlite3.Connection,
    *,
    space_id: str,
    page_id: str,
    expected_revision: int,
    title: Optional[str] = None,
    content: Optional[str] = None,
    parent_id: Any = _Draft,  # sentinel: not passed ≠ passed as None
) -> dict:
    """Write a page, or refuse because somebody else already did.

    ``parent_id`` uses a sentinel default because ``None`` is a meaningful
    value here — it means "move this page to the top level" — and the usual
    ``parent_id=None`` default would make every title-only edit silently
    unparent the page.
    """
    try:
        revision = int(expected_revision)
    except (TypeError, ValueError):
        raise PageError(
            "expected_revision must be the revision number you read from the page."
        ) from None
    if revision < 1:
        raise PageError("expected_revision must be the revision number you read.")

    # BEGIN IMMEDIATE takes the write lock before the read, so the revision
    # this decision rests on cannot change between the check and the UPDATE.
    conn.execute("BEGIN IMMEDIATE")
    try:
        page = get_page(conn, space_id=space_id, page_id=page_id)
        if page["revision"] != revision:
            raise PageConflict(
                f"This page has moved on — it is at revision {page['revision']}, "
                f"you have {revision}. Read it again and reapply your change; "
                "do not paste your draft over the newer version."
            )
        parent = page["parent_id"] if parent_id is _Draft else (
            str(parent_id).strip() or None if parent_id else None
        )
        draft = _clean_draft(
            page["title"] if title is None else title,
            page["content"] if content is None else content,
            parent,
        )
        _check_parent(conn, space_id=space_id, parent_id=draft.parent_id, page_id=page_id)
        conn.execute(
            "UPDATE pages SET title=?, content=?, parent_id=?, revision=revision+1, "
            "updated_at=? WHERE id=? AND space_id=? AND revision=?",
            (draft.title, draft.content, draft.parent_id, crew_db.now_ms(),
             page_id, space_id, revision),
        )
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    return get_page(conn, space_id=space_id, page_id=page_id)


def delete_page(conn: sqlite3.Connection, *, space_id: str, page_id: str) -> bool:
    """Remove a page, lifting its children to its own parent.

    Re-parenting rather than cascading: a page's children are usually the part
    somebody else wrote, and deleting a section header should not take the
    section with it. Each lifted child's revision is bumped, so an editor
    holding the old one is told to re-read instead of writing the old parent
    back.
    """
    conn.execute("BEGIN IMMEDIATE")
    try:
        row = conn.execute(
            "SELECT parent_id FROM pages WHERE id=? AND space_id=?", (page_id, space_id)
        ).fetchone()
        if row is None:
            conn.execute("COMMIT")
            return False
        conn.execute(
            "UPDATE pages SET parent_id=?, revision=revision+1, updated_at=? "
            "WHERE space_id=? AND parent_id=?",
            (row["parent_id"], crew_db.now_ms(), space_id, page_id),
        )
        conn.execute("DELETE FROM pages WHERE id=? AND space_id=?", (page_id, space_id))
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise
    return True


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

_TOKEN = re.compile(r"[^\W_]+", re.UNICODE)


def _match_expression(query: str) -> str:
    """Turn a person's words into an FTS5 MATCH expression.

    Every token is quoted and they are ANDed. Quoting is not cosmetic: FTS5's
    query language gives `(`, `"`, `*`, `NEAR` and `OR` meanings, so an
    unescaped ``Q3 (draft)`` raises a syntax error rather than searching, and
    a teammate would read that as "no results".
    """
    tokens = _TOKEN.findall(query[:MAX_QUERY])
    return " ".join(f'"{token}"' for token in tokens)


def _scan(
    conn: sqlite3.Connection, space_id: str, query: str, limit: int
) -> list[dict]:
    """Every page in the Space whose title or body contains all the words.

    This is what opendots' caller does for *all* searching — pull the Space and
    run ``String.includes`` over the bodies. Here it is the backstop rather
    than the mechanism, and it is bounded by one Space's pages, which is a
    human-sized number of human-written documents.
    """
    needles = [t.lower() for t in _TOKEN.findall(query[:MAX_QUERY])]
    hits = []
    for page in list_pages(conn, space_id):
        haystack = f"{page['title']}\n{page['content']}".lower()
        if all(needle in haystack for needle in needles):
            hits.append(page)
        if len(hits) >= limit:
            break
    return hits


def search(
    conn: sqlite3.Connection, *, space_id: str, query: str, limit: int = 20
) -> list[dict]:
    """Pages in one Space matching ``query``, best first.

    FTS5 ranks (bm25, title weighted over body); :func:`_scan` backs it up.
    **The scan runs whenever the index returns nothing**, and that is not
    belt-and-braces — it is load-bearing for anyone not writing in English.

    The default ``unicode61`` tokeniser classes CJK ideographs as word
    characters with no separator between them, so a page containing
    ``定价还没定`` holds that as a *single* token and the phrase ``"定价"``
    matches none of it. Searching a Chinese page therefore came back empty
    while the substring scan found it immediately. ``hermes_state`` solves the
    same problem with a second, trigram-tokenised index; that is the right
    answer for a quarter-million session messages and the wrong one here,
    where a Space holds documents a person wrote and the scan is already
    correct. Running it only on an empty result keeps the cost where it does
    no harm: a query with no hits has nothing to rank anyway.
    """
    if not (query or "").strip():
        return []
    expression = _match_expression(query)

    if expression and crew_db.fts_enabled():
        try:
            rows = conn.execute(
                "SELECT pages.* FROM pages_fts JOIN pages ON pages.rowid = pages_fts.rowid "
                "WHERE pages_fts MATCH ? AND pages.space_id = ? "
                "ORDER BY bm25(pages_fts, 2.0, 1.0) LIMIT ?",
                (expression, space_id, int(limit)),
            ).fetchall()
            if rows:
                return [dict(r) for r in rows]
        except sqlite3.OperationalError:
            # The index exists but is unusable — a downgraded SQLite, a corrupt
            # segment. Reporting no results would look like an empty Space.
            pass

    return _scan(conn, space_id, query, limit)
