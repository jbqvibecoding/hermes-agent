"""What a task intends to do, and what it read while doing it.

Two small vocabularies, both ported from OpenMuse's ``packages/domain``
(``TaskStep`` and ``Evidence``, MIT), kept in one module because they answer the
same question from two sides: *what is this thing doing, and why does it say
what it says?*

**Steps are seeded before the model runs.** OpenMuse builds a default list per
task kind and lets the model replace it wholesale. That ordering is the useful
part: the operator can see the intended shape of the work the moment it is
queued, rather than after the first turn has already spent a few minutes. A
plan that only appears once the model has decided on one is a log, not a plan.

**Evidence is only ever what was read.** Writing a file is not evidence of
anything; reading a page is. It answers a different question from the audit
ledger, which is why both exist: the ledger says what the teammate *did*, and
one line of evidence says what it was *looking at* when it decided to.

``TaskStep.status`` is deliberately not the task status union. OpenMuse keeps
them separate and so do we — a step can be ``waiting`` while the task is
``running``, and merging them would force one of the two to lie.
"""

from __future__ import annotations

import re
from typing import Any, Optional

#: A step's life. Note `waiting` — the step is blocked on somebody, which is a
#: different thing from the task being blocked.
STEP_STATUSES = ("pending", "running", "succeeded", "failed", "waiting")

#: Where a piece of evidence came from.
EVIDENCE_KINDS = ("mail", "file", "web", "user")

_TITLE_LIMIT = 120
_EXCERPT_LIMIT = 400
#: Enough to reconstruct a line of reasoning; past this it is a transcript, and
#: a transcript is what the audit ledger and the activity strip are for.
MAX_EVIDENCE = 24

#: Default steps per kind. Ported in shape from OpenMuse's `service.ts`, with
#: our own kinds. Written as the teammate would describe its own work, because
#: this is what the operator reads before anything has happened.
_SEEDS: dict[str, tuple[str, ...]] = {
    "routine": (
        "Pick up where the routine left off",
        "Do the work it describes",
        "Report back in the thread",
    ),
    "research": (
        "Work out what is actually being asked",
        "Gather the sources",
        "Check them against each other",
        "Write up what they say",
    ),
    "deliverable": (
        "Work out what is actually being asked",
        "Gather the material",
        "Build the file",
        "Check it opens and is not empty",
    ),
}
_DEFAULT_SEED = (
    "Work out what is actually being asked",
    "Plan the work",
    "Do it",
    "Report back",
)


def seed_plan(kind: str) -> list[dict]:
    """The steps a task starts with, before the model has said anything."""
    titles = _SEEDS.get(kind, _DEFAULT_SEED)
    return [
        {"id": str(index), "title": title, "status": "pending", "detail": ""}
        for index, title in enumerate(titles)
    ]


def normalise_plan(raw: Any) -> list[dict]:
    """Coerce whatever the model sent into steps, dropping what makes no sense.

    Lenient on purpose. A model that returns a bare list of strings has still
    told us its plan, and refusing it would replace a usable plan with none.
    What is *not* lenient is the status: an unrecognised one becomes
    ``pending``, because a step claiming to be ``succeeded`` in a vocabulary
    nobody agreed on is worse than one that admits it has not started.
    """
    if not isinstance(raw, list):
        return []
    steps: list[dict] = []
    for index, item in enumerate(raw):
        if isinstance(item, str):
            item = {"title": item}
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()
        if not title:
            continue
        status = str(item.get("status") or "pending")
        steps.append({
            "id": str(item.get("id") or index),
            "title": title[:_TITLE_LIMIT],
            "status": status if status in STEP_STATUSES else "pending",
            "detail": str(item.get("detail") or "")[:_TITLE_LIMIT],
        })
    return steps


# ---------------------------------------------------------------------------
# Evidence
# ---------------------------------------------------------------------------

#: Tools whose *result* is something the teammate read. Reading is what makes
#: evidence; a write tells you nothing about why a conclusion was reached.
#:
#: Matched on the tool name because that is what the hook has, and kept as
#: patterns rather than a fixed list so a build with more tools than this one
#: still records the obvious ones.
#: Checked first, and it has to be: a subject word alone does not say which
#: direction the tool goes. `send_email` contains "mail" and reads nothing —
#: filing it as evidence would claim the teammate learned something from an
#: email it wrote. Same for `post_page`, `write_file`, `create_doc`.
_WRITE_VERBS = re.compile(
    r"^send|_send|^post|_post|reply|^write|_write|^create|_create|delete|"
    r"^update|_update|patch|upload|publish|^pay|purchase|book_|^edit|_edit"
)

_READ_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    # File before web, because `search_files` is a file tool and a bare
    # "search" token would otherwise claim it for the web.
    ("file", re.compile(r"read_file|read_terminal|glob|^ls$|search_files|grep|^cat")),
    ("mail", re.compile(r"mail|imap|inbox")),
    ("web", re.compile(r"^browser_|^web_|web_search|search_web|fetch|scrape|url|page")),
)

#: Argument names that usually say what was read, in the order worth trying.
_SUBJECT_KEYS = ("url", "path", "file_path", "query", "q", "subject", "pattern")


def evidence_kind(tool_name: str) -> Optional[str]:
    """Which kind of evidence this tool produces, or ``None`` if it produces none."""
    name = (tool_name or "").strip().lower()
    if not name or _WRITE_VERBS.search(name):
        return None
    for kind, pattern in _READ_PATTERNS:
        if pattern.search(name):
            return kind
    return None


def evidence_from_call(tool_name: str, args: Any, result: Any) -> Optional[dict]:
    """One piece of evidence from a tool call, or ``None``.

    The excerpt is the head of whatever came back — not a summary. Summarising
    here would mean a model deciding what mattered about its own sources, which
    is precisely the thing a person opens this panel to check for themselves.
    """
    kind = evidence_kind(tool_name)
    if kind is None:
        return None

    from crew import activity as crew_activity

    text = crew_activity.tool_result_text(result) or ""
    text = " ".join(text.split())
    if not text:
        return None

    title = ""
    url = ""
    if isinstance(args, dict):
        for key in _SUBJECT_KEYS:
            value = args.get(key)
            if isinstance(value, str) and value.strip():
                title = " ".join(value.split())[:_TITLE_LIMIT]
                if key == "url":
                    url = value.strip()
                break
    return {
        "kind": kind,
        "title": title or tool_name,
        "excerpt": text[:_EXCERPT_LIMIT],
        "url": url,
    }


def append_evidence(existing: Any, item: dict) -> list[dict]:
    """Add one piece, keeping the list bounded and free of exact repeats.

    A teammate that reads the same page twice has not learned anything twice,
    and a panel that says so makes the genuinely distinct sources harder to
    see. Oldest go first when the cap is hit: the recent ones are the ones the
    current conclusion rests on.
    """
    items = [e for e in existing if isinstance(e, dict)] if isinstance(existing, list) else []
    seen = (item.get("title"), item.get("excerpt"))
    items = [e for e in items if (e.get("title"), e.get("excerpt")) != seen]
    items.append(item)
    return items[-MAX_EVIDENCE:]
