"""When a teammate is next allowed to speak unprompted.

``compute_next_trigger`` is ported from octop's
``infra/proactive/scheduler.py`` (MIT — see ``NOTICE.md``). It was already a
pure function there, with no ``self`` and no I/O, so it comes across almost
verbatim; the timezone resolution is ours because ours comes from the host's
cron settings rather than a per-user preferences blob.

Two properties of the original are worth naming, because both are easy to lose
in a rewrite and neither is obvious:

**The next time is computed after a push completes, not on a fixed grid.**
A teammate that spoke at 10:04 next speaks at 10:04 + a random interval, so a
roomful of teammates spreads out by itself instead of everybody arriving on the
hour. Nothing coordinates them; the randomness does it.

**A candidate outside the active window does not clamp to the boundary** — it
moves to the next window's start *plus* a random offset of up to two hours.
Clamping would pile every deferred teammate onto 09:00 exactly, which is the
one time of day somebody is least able to absorb three of them at once.

Where this departs from octop is not in the maths but in where the answer is
kept. Theirs lives in an ``asyncio.Task`` that awaits for hours, and a restart
re-rolls every agent's time from scratch — so a gateway that restarts often can
starve a teammate indefinitely, and nobody would ever notice, because the
symptom is silence. Ours is a column, read by a loop that already runs.
"""

from __future__ import annotations

import random
from datetime import datetime, time, timedelta
from typing import Optional

#: Never schedule anything closer than this. Ported from octop's
#: ``_MIN_SLEEP_SECONDS`` guard, which exists because a ``min_interval`` of 0
#: turns the loop into a busy spin. Ours cannot spin — the worker ticks on its
#: own schedule regardless — but the failure it prevents is the same one
#: wearing different clothes: a teammate that speaks every time the loop comes
#: round, which is every few seconds.
MIN_LEAD_S = 60

#: The window a deferred teammate lands in, past the start of the next active
#: period. Two hours, so a morning does not begin with a queue.
_SPREAD_MINUTES = 120


def parse_hhmm(value: str, fallback: time) -> time:
    """``"09:00"`` to a ``time``, or the fallback.

    Lenient because this is a config value a person typed. A malformed active
    window that raised would take the whole worker tick down with it, and the
    honest failure for "I cannot read your quiet hours" is to use the default
    ones, not to stop the teammate speaking forever.
    """
    try:
        hour, _, minute = str(value or "").partition(":")
        return time(int(hour), int(minute))
    except (TypeError, ValueError):
        return fallback


def in_active_hours(moment: datetime, *, start: time, end: time) -> bool:
    """Whether this local time falls inside the window.

    Windows that wrap past midnight (``22:00``–``06:00``) are read as wrapping,
    which octop's version does not handle — its ``start <= t < end`` silently
    makes such a window empty, and an empty window means a teammate that is
    never allowed to speak and never says why.
    """
    current = moment.time().replace(second=0, microsecond=0)
    if start <= end:
        return start <= current < end
    return current >= start or current < end


def compute_next_trigger(
    *,
    now: datetime,
    active_start: time,
    active_end: time,
    min_interval_hours: float,
    max_interval_hours: float,
    rng: Optional[random.Random] = None,
) -> datetime:
    """The next moment this teammate may speak.

    ``now`` is expected to already be in the teammate's local zone; the caller
    owns that conversion because it is the caller that knows where the answer
    is going to be stored.

    ``rng`` is injectable so the tests can drive the boundaries deterministically
    rather than by looping and hoping — the whole point of this being a pure
    function is that its edges can be asserted.
    """
    chooser = rng or random

    low = max(0, int(min_interval_hours * 60))
    high = max(low, int(max_interval_hours * 60))
    candidate = now + timedelta(minutes=chooser.randint(low, high))

    if not in_active_hours(candidate, start=active_start, end=active_end):
        # Today's window if it has not opened yet, otherwise tomorrow's, plus a
        # spread so deferred teammates do not all arrive at the same minute.
        opens_today = datetime.combine(candidate.date(), active_start, tzinfo=candidate.tzinfo)
        opens = opens_today if opens_today > candidate else datetime.combine(
            candidate.date() + timedelta(days=1), active_start, tzinfo=candidate.tzinfo,
        )
        candidate = opens + timedelta(minutes=chooser.randint(0, _SPREAD_MINUTES))

    # The floor is applied last, so no branch above can hand back a time that
    # has already passed — including the "today's window opens later" branch on
    # a clock that has drifted.
    floor = now + timedelta(seconds=MIN_LEAD_S)
    return candidate if candidate > floor else floor
