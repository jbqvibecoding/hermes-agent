"""Teammate-to-teammate handoff rules — ported from OpenGrokBot's ``a2a.ts``.

Two teammates that can freely message each other will eventually echo at each
other, and a teammate that can reach every colleague turns one careless turn
into a fan-out across the whole roster. So peer messaging is **off by default**
and the chief is the only hub: anything else needs an explicit direction in
``crew.a2a_allow``.

``MAX_HOPS = 2`` is the other half: enough for one dispatch plus one reply,
which is the whole legitimate shape of a handoff. The third hop is an echo.
"""

from __future__ import annotations

from dataclasses import dataclass, field

# One dispatch + one reply. Anything past that is a loop, not a conversation.
MAX_HOPS = 2


@dataclass(frozen=True)
class A2ARules:
    """Who may hand work to whom.

    ``chief_id`` is a hub: it can reach everyone and everyone can reach it.
    ``pairs`` are additional **directed** edges, so allowing ``a>b`` does not
    silently allow ``b>a``.
    """

    chief_id: str
    pairs: tuple[tuple[str, str], ...] = field(default_factory=tuple)


def parse_a2a_allow(spec: str, chief_id: str) -> A2ARules:
    """Parse ``"researcher>market-watch,market-watch>researcher"`` into rules.

    Malformed entries are dropped rather than raised: a typo in config should
    narrow what is permitted, never crash a teammate mid-turn. Dropping is the
    fail-closed direction, so the silence is safe.
    """
    pairs: list[tuple[str, str]] = []
    for item in (spec or "").split(","):
        head, sep, tail = item.partition(">")
        if not sep:
            continue
        frm, to = head.strip(), tail.strip()
        if frm and to:
            pairs.append((frm, to))
    return A2ARules(chief_id=chief_id, pairs=tuple(pairs))


def can_message(rules: A2ARules, frm: str, to: str) -> bool:
    if not frm or not to or frm == to:
        return False
    if frm == rules.chief_id or to == rules.chief_id:
        return True
    return (frm, to) in rules.pairs


def deny_reason(rules: A2ARules, frm: str, to: str) -> str:
    """Model-facing prose for a refused handoff.

    It names the fallback route on purpose: a teammate told only "no" tends to
    do the work itself anyway, while one told "route it through the chief"
    does the right thing.
    """
    if frm == to:
        return "You cannot message yourself."
    return (
        f"Messaging {to} is not allowlisted for you. Ask your operator to allow it, "
        f"or route it through {rules.chief_id}."
    )


HOP_LIMIT_MESSAGE = (
    "Relay limit reached — reply to your operator instead of passing this on again."
)
