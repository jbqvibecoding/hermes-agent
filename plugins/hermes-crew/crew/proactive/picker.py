"""What is worth raising unprompted, and in what order.

Ported in structure from octop's ``infra/proactive/picker.py`` (MIT — see
``NOTICE.md``): ``score = intensity x kind_weight x recency_weight``, dedup, a
top-K cut, and — the nicest thing in it — **widening the window rather than
falling silent** when everything recent has already been said.

**The axes are ours, and that is deliberate.** octop scores emotional episodes:
its weights are 1.5 for sad/angry/anxious, 1.2 for tired, 1.0 for happy. It is
a companion product and those are the right axes for it. A crew teammate is a
colleague, and copying the emotion table would have meant first building a
sentiment classifier over work threads — inventing the input to fit the
algorithm. What a teammate actually has to be sorry about is **unfinished
business**, and crew.db already records all of it:

* an approval released and never seen through (``outcome_unknown``) — the state
  that exists precisely because "we sent it and then died" is not "it failed",
* an approval nobody decided before it expired, so the teammate is stopped and
  the operator thinks it is working,
* a routine suspended after repeated failure, which said so once and then went
  quiet,
* work that failed, or that is still waiting on somebody.

So the shape is octop's and the substance is the audit trail we already keep.
Two mappings worth stating:

``intensity`` becomes **how long it has been stuck**, because that is what
actually rises for an unresolved thing. Nothing about a stalled approval gets
better on its own.

Dedup by *person* becomes dedup by **subject** — one item per approval, routine
or task. Theirs keeps one episode per person so one nudge does not mention the
same colleague twice; ours keeps one item per thing so one nudge does not
mention the same broken routine three times. Same intent, different noun.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

DAY_MS = 86_400_000

#: How far back to look, and how far to widen to when everything inside the
#: first window has already been raised. Both octop's, unchanged: a teammate
#: with nothing new to say should reach further back before it says nothing.
WINDOW_DAYS = 7
FALLBACK_DAYS = 30

#: At most this many things in one message. Three is octop's, and it is about
#: as many as anybody reads in an unsolicited note.
TOP_K = 3

#: Past this, "it has been stuck a while" stops getting more true.
_MAX_INTENSITY_DAYS = 5.0

#: What kind of standstill this is, and how much it deserves to be raised.
#: The 1.5 tier is not "important" — it is **"a person has to do something and
#: nobody knows they do"**. An `outcome_unknown` approval may have sent a real
#: email; an expired one has the teammate stopped while the operator believes
#: it is working; a suspended routine stopped reporting after saying so once.
KIND_WEIGHTS: dict[str, float] = {
    "approval_outcome_unknown": 1.5,
    "approval_expired": 1.5,
    "routine_suspended": 1.5,
    "task_failed": 1.2,
    "task_waiting": 1.2,
    "task_delivered": 1.0,
}


@dataclass(frozen=True)
class Candidate:
    """One thing a teammate could raise.

    ``subject`` is the dedup key and it names the *thing*, not the message —
    ``approval:12``, not ``msg:88``. A rendering can be produced twice; the
    standstill should only be raised once.
    """

    subject: str
    kind: str
    summary: str
    at_ms: int

    @property
    def weight(self) -> float:
        return KIND_WEIGHTS.get(self.kind, 1.0)


def intensity(candidate: Candidate, now_ms: int) -> float:
    """How stuck it is, from 1.0 up, capped.

    Days, not hours: a teammate that raises something four hours old is being
    twitchy, and the cap stops a single forgotten item from outranking
    everything else forever once it is a month old.
    """
    days = max(0.0, (now_ms - candidate.at_ms) / DAY_MS)
    return 1.0 + min(days, _MAX_INTENSITY_DAYS)


def recency_weight(candidate: Candidate, now_ms: int) -> float:
    """octop's decay ladder, unchanged: 1.0 / 0.8 / 0.6.

    It pulls the opposite way from :func:`intensity`, and that tension is the
    point — something stuck for two days beats both something stuck for two
    hours and something stuck since last month that has clearly been left.
    """
    days = (now_ms - candidate.at_ms) / DAY_MS
    if days < 1:
        return 1.0
    if days < 3:
        return 0.8
    return 0.6


def score(candidate: Candidate, now_ms: int) -> float:
    return intensity(candidate, now_ms) * candidate.weight * recency_weight(candidate, now_ms)


@dataclass(frozen=True)
class Pick:
    candidates: tuple[Candidate, ...]
    window_days: int


def pick(
    candidates: list[Candidate], *, raised: set[str], now_ms: int,
    window_days: int = WINDOW_DAYS, fallback_days: int = FALLBACK_DAYS,
    top_k: int = TOP_K,
) -> Pick:
    """The best few things to raise, or nothing.

    Tries the near window first and widens once. Widening is octop's, and it is
    the difference between a teammate that goes quiet for a week because the
    only news is eight days old and one that says "this is still sitting
    there". Widening *after* the near window comes back empty, rather than
    searching the wide one outright, keeps recent things winning when there are
    any.
    """
    for days in (window_days, fallback_days):
        chosen = _in_window(candidates, raised=raised, now_ms=now_ms, days=days, top_k=top_k)
        if chosen:
            return Pick(tuple(chosen), days)
    return Pick((), fallback_days)


def _in_window(
    candidates: list[Candidate], *, raised: set[str], now_ms: int, days: int, top_k: int,
) -> list[Candidate]:
    cutoff = now_ms - days * DAY_MS
    fresh = [
        c for c in candidates
        if c.subject not in raised and cutoff <= c.at_ms <= now_ms
    ]
    if not fresh:
        return []

    ranked = sorted(fresh, key=lambda c: score(c, now_ms), reverse=True)

    seen: set[str] = set()
    deduped: list[Candidate] = []
    for candidate in ranked:
        if candidate.subject in seen:
            continue
        seen.add(candidate.subject)
        deduped.append(candidate)
    return deduped[:top_k]


# ---------------------------------------------------------------------------
# Reading the candidates out of crew.db
# ---------------------------------------------------------------------------


def _summary(text: str, limit: int = 140) -> str:
    text = " ".join(str(text or "").split())
    return text[:limit]


def candidates_for(conn, bot_id: str, *, now_ms: int, days: int = FALLBACK_DAYS) -> list[Candidate]:
    """Everything this teammate could reasonably bring up.

    One query per source rather than a union, because the sources do not share
    a shape and pretending they do would mean a SELECT nobody can read six
    months from now. The widest window is read once; :func:`pick` narrows.
    """
    cutoff = now_ms - days * DAY_MS
    found: list[Candidate] = []

    for row in conn.execute(
        "SELECT id, action, status, created_at FROM approvals "
        "WHERE bot_id = ? AND status IN ('outcome_unknown', 'expired') AND created_at >= ?",
        (bot_id, cutoff),
    ).fetchall():
        unknown = row["status"] == "outcome_unknown"
        found.append(Candidate(
            subject=f"approval:{row['id']}",
            kind="approval_outcome_unknown" if unknown else "approval_expired",
            summary=(
                f"“{_summary(row['action'])}” was released and I never saw how it ended — "
                f"somebody needs to check whether it actually went out"
                if unknown else
                f"“{_summary(row['action'])}” expired before anyone decided, so I stopped there"
            ),
            at_ms=int(row["created_at"] or 0),
        ))

    for row in conn.execute(
        "SELECT id, title, kind, status, error, updated_at FROM tasks "
        "WHERE bot_id = ? AND updated_at >= ? AND status IN "
        "('failed', 'waiting_input', 'waiting_approval', 'succeeded')",
        (bot_id, cutoff),
    ).fetchall():
        status = row["status"]
        if status == "failed":
            kind = "task_failed"
            summary = f"“{_summary(row['title'] or row['kind'])}” failed: {_summary(row['error'])}"
        elif status == "succeeded":
            kind = "task_delivered"
            summary = f"I finished “{_summary(row['title'] or row['kind'])}” — did that land right?"
        else:
            kind = "task_waiting"
            summary = f"“{_summary(row['title'] or row['kind'])}” is still waiting on you"
        found.append(Candidate(
            subject=f"task:{row['id']}", kind=kind, summary=summary,
            at_ms=int(row["updated_at"] or 0),
        ))

    for row in conn.execute(
        "SELECT job_id, failures, last_error, notified_at FROM routine_health "
        "WHERE bot_id = ? AND notified_at >= ?",
        (bot_id, cutoff),
    ).fetchall():
        found.append(Candidate(
            subject=f"routine:{row['job_id']}",
            kind="routine_suspended",
            summary=(
                f"one of my routines is still paused after {row['failures']} failures "
                f"({_summary(row['last_error'])}) and nothing has changed since"
            ),
            at_ms=int(row["notified_at"] or 0),
        ))

    return found


def already_raised(conn, bot_id: str, *, now_ms: int, days: int = FALLBACK_DAYS) -> set[str]:
    """Subjects this teammate has brought up before, inside the widest window."""
    cutoff = now_ms - days * DAY_MS
    rows = conn.execute(
        "SELECT subject FROM proactive_pushes WHERE bot_id = ? AND created_at >= ?",
        (bot_id, cutoff),
    ).fetchall()
    return {row["subject"] for row in rows}


def record_raised(conn, bot_id: str, subjects: list[str], *, now_ms: Optional[int] = None) -> None:
    """Remember what was just raised. Called **after** the message lands."""
    from crew import db as crew_db

    stamp = crew_db.now_ms() if now_ms is None else now_ms
    conn.executemany(
        "INSERT INTO proactive_pushes (bot_id, subject, created_at) VALUES (?, ?, ?)",
        [(bot_id, subject, stamp) for subject in subjects],
    )
    conn.commit()
