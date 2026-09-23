"""Checking that what the teammate said it produced is actually there.

A model that has been asked for a deck and cannot manage one will, reliably,
write a paragraph describing the deck it made. Not as deception — it is
summarising an intention it never carried out, and nothing downstream can tell
that from a summary of work that happened. The operator finds out when they go
looking for the file.

The idea is openworkbuddy's; **no code is taken from it** — it is PolyForm
Noncommercial, which conflicts with this repo's MIT, so this file is written
from scratch against our own workspace and our own turn loop. What is borrowed
is a set of observations, each of which cost somebody a real incident:

**Existence is not enough — a zero-byte file is a failure too.** A script that
dies halfway through ``prs.save()`` leaves an empty shell. Checking only that
the path exists marks that delivery successful, and the operator downloads
something their machine refuses to open.

**Tell the model the check exists.** Announcing the verification and then
actually running it is the whole trick: neither half works alone. A prompt that
threatens a check nobody runs teaches the model the threat is empty; a check
nobody announced produces a pushback the model finds baffling and argues with.

**Bias the whole thing toward letting work through.** Every condition here is
a conjunction, and every ambiguity resolves to "fine". A teammate wrongly
accused of not delivering burns two turns defending itself, and the operator
watches a working system call itself broken — which costs more trust than the
occasional missed empty file.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Optional

log = logging.getLogger(__name__)

#: How many times a turn may be sent back. Two, because the first pushback
#: catches the common case — the model narrated a plan — and by the third the
#: problem is not one more attempt can fix, it is that the teammate cannot do
#: this and should say so instead of being asked again.
MAX_PUSHBACKS = 2

#: Below this, do not start another attempt. A pushback that is cut off partway
#: leaves the operator with a half-written file *and* a reply that never
#: arrived, which is strictly worse than the honest first answer.
MIN_BUDGET_S = 30.0

#: What counts as a file name in a reply. Extensions are limited to the things
#: a teammate is actually asked to deliver: matching any dotted word turns
#: "see main.py, line 4" and "example.com" into delivery claims.
_DELIVERABLE_EXT = (
    "pptx|ppt|docx|doc|xlsx|xls|pdf|csv|tsv|md|txt|json|html|png|jpg|jpeg|svg|zip"
)
#: No spaces inside the name. `Q3 Review.pptx` is a real file name and this will
#: not find it — but a character class that allowed spaces walks backwards
#: across the whole sentence, and "I saved the deck as q3.pptx" becomes a claim
#: about a file called "saved the deck as q3.pptx". A missed claim lets honest
#: work through; a mangled one accuses a teammate of failing to produce a file
#: nobody ever named.
_CLAIM_RE = re.compile(
    r"(?<![\w.-])([\w一-鿿][\w一-鿿()-]{0,80}\.(?:" + _DELIVERABLE_EXT + r"))(?![\w-])",
    re.IGNORECASE,
)

#: Sentences, without cutting a file name in half. Splitting on every period
#: turns `q3-review.pptx` into two sentences and the claim vanishes into the
#: gap, so a Latin full stop only ends a sentence when whitespace follows it.
#: CJK punctuation needs no such care — it never appears inside a file name.
_SENTENCE_RE = re.compile(r"(?<=[.!?])\s+|(?<=[。！？；\n])")

#: A reply only counts as claiming delivery if it says so. "I could put this in
#: a report.docx if you like" names a file and delivers nothing, and pushing
#: back on an offer is the most annoying possible false positive.
_DELIVERY_VERBS = re.compile(
    r"\b(saved|wrote|written|created|generated|produced|exported|built|made|"
    r"attached|output|prepared|placed|put)\b"
    r"|已(?:保存|生成|创建|写入|导出|做好|完成)|生成了|保存到|放在",
    re.IGNORECASE,
)

#: …and not if it is describing what it is about to do, or could not.
_NON_DELIVERY = re.compile(
    r"\b(will|would|could|can|plan to|going to|about to|unable|cannot|can't|failed to)\b"
    r"|准备|打算|将会|无法|不能",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Problem:
    rel_path: str
    reason: str   # missing | empty


@dataclass(frozen=True)
class Verdict:
    """What the delivery check found. ``ok`` means let the turn stand."""

    ok: bool
    problems: tuple[Problem, ...] = ()
    claimed: tuple[str, ...] = ()

    @property
    def missing(self) -> tuple[str, ...]:
        return tuple(p.rel_path for p in self.problems if p.reason == "missing")

    @property
    def empty(self) -> tuple[str, ...]:
        return tuple(p.rel_path for p in self.problems if p.reason == "empty")


def claimed_files(text: str) -> list[str]:
    """File names this reply says it produced.

    Three conditions, all of which must hold, because each one on its own is
    wrong often enough to be useless:

    1. a name that looks like a deliverable,
    2. a verb saying it was done rather than proposed,
    3. no hedge in the same sentence turning it into a plan or an apology.

    Sentence-level rather than reply-level on purpose. "I couldn't reach the
    API, so I wrote what I have to notes.md" is a real delivery in a reply that
    also contains a failure, and judging the whole message would throw it away.
    """
    found: list[str] = []
    for sentence in _SENTENCE_RE.split(text or ""):
        if not _DELIVERY_VERBS.search(sentence) or _NON_DELIVERY.search(sentence):
            continue
        for match in _CLAIM_RE.finditer(sentence):
            name = match.group(1).strip().strip("`\"'·,，。")
            if name and name not in found:
                found.append(name)
    return found


def check_delivery(bot_id: str, text: str) -> Verdict:
    """Compare what the reply claims against what is on disk.

    Matching is by basename rather than by path. The teammate works in the
    container's ``/workspace`` and may say ``/workspace/deck.pptx``,
    ``./deck.pptx`` or just ``deck.pptx`` for the same file, and a mismatch in
    spelling is not a missing delivery.
    """
    from crew import artifacts as crew_artifacts

    claims = claimed_files(text)
    if not claims:
        return Verdict(ok=True)

    try:
        on_disk = {
            item["rel_path"].split("/")[-1].lower(): item
            for item in crew_artifacts.scan_workspace(bot_id)
        }
    except Exception:
        # No workspace to check against — a teammate with no computer, or a
        # container that is not up. Accusing it of not delivering because we
        # could not look is the one failure mode worth ruling out completely.
        log.debug("crew: could not read %s's workspace; not checking delivery", bot_id, exc_info=True)
        return Verdict(ok=True)

    problems: list[Problem] = []
    for claim in claims:
        found = on_disk.get(claim.split("/")[-1].lower())
        if found is None:
            problems.append(Problem(claim, "missing"))
        elif found["size"] == 0:
            problems.append(Problem(claim, "empty"))

    return Verdict(ok=not problems, problems=tuple(problems), claimed=tuple(claims))


def pushback_seed(verdict: Verdict, attempt: int) -> str:
    """The turn that sends it back. Written to be actionable, not scolding.

    It says what was checked, what was found, and what to do — including the
    option of saying it cannot. A teammate with no route to the file needs
    permission to say so; without that, the only move left is to claim harder.
    """
    lines: list[str] = []
    if verdict.missing:
        lines.append(
            f"You said you produced {_join(verdict.missing)}, but "
            f"{'they are' if len(verdict.missing) > 1 else 'it is'} not in your workspace."
        )
    if verdict.empty:
        lines.append(
            f"{_join(verdict.empty)} {'are' if len(verdict.empty) > 1 else 'is'} "
            f"there but empty — 0 bytes, so whatever wrote "
            f"{'them' if len(verdict.empty) > 1 else 'it'} did not finish."
        )
    lines.append(
        "Your workspace was checked after your reply, which is where that comes from."
    )
    lines.append(
        "Actually create the file now — write the script, run it, and confirm the size is "
        "not zero before you answer. If you cannot, say plainly what stopped you and what "
        "you need; do not describe a file you have not made."
    )
    if attempt >= MAX_PUSHBACKS:
        lines.append("This is the last attempt, so an honest 'I could not' is the right answer if it is true.")
    return " ".join(lines)


def _join(names: tuple[str, ...]) -> str:
    quoted = [f"`{name}`" for name in names]
    if len(quoted) == 1:
        return quoted[0]
    return ", ".join(quoted[:-1]) + f" and {quoted[-1]}"
