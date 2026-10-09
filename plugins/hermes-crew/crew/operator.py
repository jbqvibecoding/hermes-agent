"""Hermes Crew — the one thing every teammate should not have to be told twice.

Each teammate already has a soul and a memory of its own: ``SOUL.md`` is who it
is, ``MEMORY.md`` holds the rules the operator gave *it*. What was missing is
the half that belongs to nobody in particular — **who the operator is, and what
they are trying to get done.** Without it, "the Q3 launch", "Dana", and "we
don't email suppliers directly" have to be explained to each teammate
separately, and a teammate hired next week starts from nothing.

The idea is LifeOS' TELOS (MIT, © 2025-2026 Daniel Miessler), which is the
whole point of that project: capture who you are and where you are trying to
go, then let an AI that knows you help you get there.

**What is deliberately not ported.** TELOS is nineteen files —
``BELIEFS.md``, ``MOVIES.md``, ``TRAUMAS.md``, ``WRONG.md`` and so on. That is
a life-operating-system's shape, and a good one, but this product is teammates
doing work: a teammate does not act differently for knowing the operator's
favourite film, and every character of this file is paid for on *every* API
call of *every* teammate. So it is one file, and two of TELOS' axes are
already ours and stay where they are:

* red lines → ``crew.never``, which is enforced in code rather than read as
  prose (:func:`crew.policy.hard_floor`),
* per-teammate standing rules → that teammate's own ``MEMORY.md``, written by
  ``save_memory_rule``.

**No tool writes this.** It is the operator's own description of themselves and
their work; a teammate proposing edits to it is a different feature with
different risks, and ``save_memory_rule`` already covers "remember this about
how I want *you* to behave". Zero new model-tool footprint.

**It warns rather than truncating.** LifeOS hit the inverse of this in Hermes
and was right to call it out: an identity file silently cut at a cap fails in
the worst way, because nothing looks wrong. The core now warns when it trims a
context file; this refuses to pad the prompt with an over-long one and says so
in the log and to the operator's own dashboard.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

log = logging.getLogger(__name__)

FILENAME = "OPERATOR.md"

#: Roughly 1,200 words. Generous for "who I am and what I'm doing", and small
#: enough that the whole crew carrying it on every turn stays cheap. A file
#: over the cap is reported, never quietly trimmed.
MAX_CHARS = 8_000

#: What an empty file is seeded with. Questions rather than headings, because a
#: blank ``## People`` invites nothing and an operator filling in answers
#: produces something a teammate can actually use.
#: Every line is a heading or a comment, deliberately: :func:`meaningful` reads
#: an untouched template as "says nothing", and a stray uncommented sentence
#: here would make the crew carry the instructions *to the operator* on every
#: turn forever. (That is not hypothetical — the first draft of this template
#: had its guidance as plain prose and the "not in use" test caught it.)
TEMPLATE = """\
# About your operator

<!-- Everything here is read by EVERY teammate on every turn. Keep it to what
     changes how they work; anything that is about one teammate belongs in that
     teammate's own memory instead — tell it "from now on…" in its thread. -->

## Who I am

<!-- Name, what you do, where you are. Timezone and working hours matter more
     than they look: they decide whether 3pm is urgent. -->

## What I'm trying to get done

<!-- The two or three things in flight right now, with names a teammate will
     see in your messages — "the Q3 launch", "the Henley migration". A teammate
     that recognises the name can connect a task to it without asking. -->

## People and accounts that come up

<!-- Who Dana is. Which inbox is the real one. Which of these are yours and
     which are a colleague's. -->

## How I want to be worked with

<!-- Short answers to: how much do you want to be asked? what reads as noise?
     what does "done" look like for you? -->
"""


def operator_file() -> Path:
    from crew import db as crew_db

    return crew_db.crew_home() / FILENAME


def read() -> str:
    """The operator's context, or ``""`` when there is none worth sending.

    An unedited template counts as none: shipping the prompt a page of
    commented-out questions would spend tokens on every turn to tell every
    teammate nothing.
    """
    path = operator_file()
    try:
        if not path.is_file():
            return ""
        raw = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        log.warning("crew: could not read %s", path, exc_info=True)
        return ""

    if len(raw) > MAX_CHARS:
        # Not truncated. A context file cut in the middle fails silently, and
        # this one is read by the whole crew — so it is dropped loudly instead,
        # and `status()` tells the dashboard why.
        log.warning(
            "crew: %s is %d characters, over the %d cap, so it is NOT being sent to "
            "teammates. Shorten it — everything in it is paid for on every turn of "
            "every teammate.", path, len(raw), MAX_CHARS,
        )
        return ""

    if not meaningful(raw):
        return ""
    return raw.strip()


def meaningful(raw: str) -> bool:
    """Whether this file says anything a teammate could use.

    Comments and headings are scaffolding. What counts is prose the operator
    typed: at least one non-blank line that is not a heading and not inside an
    HTML comment.
    """
    body = _strip_comments(raw)
    for line in body.splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            return True
    return False


def _strip_comments(raw: str) -> str:
    out = []
    depth = 0
    rest = raw
    while rest:
        if depth == 0:
            head, marker, rest = rest.partition("<!--")
            out.append(head)
            if not marker:
                break
            depth = 1
        else:
            _hidden, marker, rest = rest.partition("-->")
            if not marker:
                break
            depth = 0
    return "".join(out)


def ensure_template() -> Path:
    """Write the template if nothing is there yet. Never overwrites."""
    path = operator_file()
    try:
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(TEMPLATE, encoding="utf-8")
    except OSError:
        log.warning("crew: could not seed %s", path, exc_info=True)
    return path


def status() -> dict:
    """What the dashboard shows about this file, including why it is unused."""
    path = operator_file()
    try:
        exists = path.is_file()
        raw = path.read_text(encoding="utf-8", errors="replace") if exists else ""
    except OSError:
        return {"exists": False, "chars": 0, "max_chars": MAX_CHARS, "in_use": False,
                "problem": "the file could not be read"}

    problem = ""
    if not exists:
        problem = "no file yet"
    elif len(raw) > MAX_CHARS:
        problem = (
            f"{len(raw):,} characters is over the {MAX_CHARS:,} cap, so it is not being "
            "sent to teammates. Shorten it rather than letting it be cut in the middle."
        )
    elif not meaningful(raw):
        problem = "still just the template — fill in a section and the crew will read it"

    return {
        "exists": exists,
        "chars": len(raw),
        "max_chars": MAX_CHARS,
        "in_use": not problem,
        "problem": problem,
    }


def write(content: str) -> dict:
    """Replace the file. The operator's call; no tool reaches this."""
    text = str(content or "")
    if len(text) > MAX_CHARS:
        raise ValueError(
            f"That is {len(text):,} characters and the cap is {MAX_CHARS:,}. Every "
            "character here is sent on every turn of every teammate, so this one is "
            "worth keeping short."
        )
    path = operator_file()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return status()


def prompt_block() -> Optional[str]:
    """The operator's context as a prompt section, or None.

    Unfenced, deliberately. Every other body of text a teammate reads arrives
    quoted — a colleague's handoff, a Space page, a fetched web page — because
    somebody else wrote it. This one *is* the operator, and the operator is the
    one voice a teammate takes instructions from. Fencing it would teach the
    teammate to discount the only source it should trust.
    """
    body = read()
    if not body:
        return None
    return f"## About your operator\n\n{body}"
