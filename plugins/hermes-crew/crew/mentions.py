"""Who a message in a room is actually addressed to.

A group round currently asks **everybody**. Say "@Ada can you check the
deploy?" in a room of four and four teammates each run a turn, four models
answer the same question, and three of those answers are noise the operator
has to read past. It is also four times the cost of the thing that was asked
for.

Ported in shape from rowboat's ``protocol/src/mentions.ts``, whose useful idea
is not the parsing — that part is a regex — but **where the parsing happens**:

    Resolve mentions once, when the message is written, and store the answer.

Nothing downstream ever looks at the text again. That matters because the
alternative drifts: a renderer parses to highlight, a router parses to decide
who speaks, a notifier parses to decide who to tell, and the day one of them
normalises an accent differently from the others, a message is highlighted for
somebody who was never asked. One resolution, stored, is one answer.

**A name inside code is not an address.** ``@media`` in a stylesheet, a
``user@host`` in a log line, an email address in a quoted error — a room where
people paste things is full of at-signs that address nobody, and a router that
treats them as addresses wakes teammates at random.
"""

from __future__ import annotations

import re
from typing import Iterable, Optional

#: Fenced blocks and inline spans are cut before anything is matched. A mention
#: is a way of speaking to somebody, and text somebody pasted is not speech.
_CODE = re.compile(r"```.*?```|`[^`\n]*`", re.DOTALL)

#: ``@name`` where the name is a run of word characters, hyphens or CJK. The
#: lookbehind is what keeps ``user@host`` and an email address out: an at-sign
#: with a word character in front of it is part of something, not a mention.
_MENTION = re.compile(r"(?<![\w.-])@([\w一-鿿][\w一-鿿-]{0,63})")


def _key(text: str) -> str:
    """The form two names are compared in.

    Case and separators are folded because people type a display name, not an
    id: "@Ada", "@ada" and "@Ada-Chen" for a teammate called *Ada Chen* are all
    the same intent. A mention that missed on capitalisation would read as the
    feature being broken.
    """
    return re.sub(r"[\s_-]+", "", str(text or "")).strip().lower()


def find(text: str) -> list[str]:
    """The raw names a message addresses, in order, without duplicates.

    Returns what was typed rather than anything resolved — resolution needs the
    roster, and keeping the two apart is what lets this be tested without one.
    """
    stripped = _CODE.sub(" ", str(text or ""))
    found: list[str] = []
    for match in _MENTION.finditer(stripped):
        name = match.group(1)
        if name not in found:
            found.append(name)
    return found


def resolve(text: str, members: Iterable[dict]) -> list[str]:
    """The bot ids a message addresses. Empty means "the room".

    Matched against both the display name and the id, because an operator may
    type either and has no reason to know the difference. An unresolvable
    mention is dropped rather than failing the message: "@ada" when nobody is
    called Ada is a typo, and a typo should not stop the room from answering.
    """
    wanted = [_key(name) for name in find(text)]
    if not wanted:
        return []

    roster = [m for m in members if m.get("id")]

    # **Two passes, not one loop.** Every id is registered before any display
    # name, so one teammate's display name can never take a key that is
    # somebody else's id. Doing it per-member instead would make the answer
    # depend on roster order: with a teammate whose *name* is "Ada" listed
    # ahead of the teammate whose *id* is `ada`, "@ada" would reach the wrong
    # one — silently, and only for rooms in that order.
    by_key: dict[str, str] = {}
    for member in roster:
        by_key.setdefault(_key(member["id"]), str(member["id"]))
    for member in roster:
        by_key.setdefault(_key(member.get("name") or ""), str(member["id"]))

    resolved: list[str] = []
    for key in wanted:
        bot_id = by_key.get(key)
        if bot_id and bot_id not in resolved:
            resolved.append(bot_id)
    return resolved


def speakers_for(
    text: str, members: list[dict], *, chief_id: str = "",
) -> tuple[list[dict], Optional[list[str]]]:
    """Who should answer this, and who was addressed.

    Returns ``(speakers, addressed)``. ``addressed`` is ``None`` when the
    message named nobody, which is the signal that this was a question to the
    room and everybody answers as before.

    **The chief is not added to an addressed round.** Its job is to close a
    round by collecting what everyone said into a dispatch table; with one
    named teammate there is nothing to collect, and adding it would mean asking
    somebody to summarise a single answer that is already on screen. Somebody
    who wants the chief can address it.
    """
    addressed = resolve(text, members)
    if not addressed:
        others = [m for m in members if m.get("id") != chief_id]
        chief = [m for m in members if m.get("id") == chief_id]
        return others + chief, None

    order = {bot_id: index for index, bot_id in enumerate(addressed)}
    speakers = sorted(
        (m for m in members if m.get("id") in order),
        key=lambda m: order[m["id"]],
    )
    return speakers, addressed
