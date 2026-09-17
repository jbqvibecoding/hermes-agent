"""Turn a cron expression into the sentence the routine chip shows.

Ported from grok-bot 0.18's ``source/shared/automation-schedule.ts``, which is
a markedly better humaniser than OpenGrokBot's ``describeCron``: it handles
weekday/weekend sets, day ranges, multi-hour strides with a time window,
month-day ordinals, ``CRON_TZ=`` prefixes and ``@``-aliases.

The governing rule is the original's and it is the reason this is worth
porting rather than approximating: **when the shape is not recognised, return
the raw expression.** A wrong sentence about when a routine fires is worse
than no sentence — the operator would believe it.

Also understands the two interval spellings that reach us: grok-bot's
``@every 5m`` and the ``every 30m`` that Hermes's own ``cron.jobs``
``parse_schedule`` accepts.
"""

from __future__ import annotations

import re
from typing import Iterable, Optional, Sequence

_EVERY_PATTERN = re.compile(r"^@?every\s+(\d+)\s*(s|m|h|d)$", re.IGNORECASE)
_TZ_PATTERN = re.compile(r"^(?:CRON_TZ|TZ)=(\S+)\s+")

_UNIT_NAME = {"s": "second", "m": "minute", "h": "hour", "d": "day"}

_CRON_ALIASES = {
    "@hourly": "0 * * * *",
    "@daily": "0 0 * * *",
    "@midnight": "0 0 * * *",
    "@weekly": "0 0 * * 0",
    "@monthly": "0 0 1 * *",
    "@yearly": "0 0 1 1 *",
    "@annually": "0 0 1 1 *",
}

_DAYS = ("Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday")
_DAYS_SHORT = ("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat")
_MONTHS = (
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
)


class CronMatcher:
    """A parsed 5-field cron expression plus the restriction flags.

    ``day_of_month_restricted`` / ``day_of_week_restricted`` record whether the
    *field* was something other than ``*``, which is not the same as the parsed
    set being smaller than the full range: ``0-6`` for day-of-week is every day
    yet still "restricted", and cron's day fields OR together only when both
    are restricted. Keeping the flags separate from the sets is what makes that
    expressible.
    """

    __slots__ = (
        "minute", "hour", "day_of_month", "month", "day_of_week",
        "day_of_month_restricted", "day_of_week_restricted", "time_zone",
    )

    def __init__(
        self,
        minute: set[int],
        hour: set[int],
        day_of_month: set[int],
        month: set[int],
        day_of_week: set[int],
        day_of_month_restricted: bool,
        day_of_week_restricted: bool,
        time_zone: Optional[str] = None,
    ) -> None:
        self.minute = minute
        self.hour = hour
        self.day_of_month = day_of_month
        self.month = month
        self.day_of_week = day_of_week
        self.day_of_month_restricted = day_of_month_restricted
        self.day_of_week_restricted = day_of_week_restricted
        self.time_zone = time_zone


def normalize_schedule(raw: str) -> str:
    return " ".join((raw or "").strip().split())


def split_schedule_timezone(schedule: str) -> tuple[str, Optional[str]]:
    """Split a leading ``CRON_TZ=Europe/Berlin`` / ``TZ=...`` off the expression."""
    normalized = normalize_schedule(schedule)
    match = _TZ_PATTERN.match(normalized)
    if not match:
        return normalized, None
    return normalized[match.end():], match.group(1)


def expand_cron_alias(schedule: str) -> str:
    return _CRON_ALIASES.get(schedule.lower(), schedule)


def parse_cron_field(field: str, lo: int, hi: int) -> Optional[set[int]]:
    """Parse one cron field (``*``, ``a``, ``a-b``, ``*/n``, ``a-b/n``, lists).

    Returns ``None`` for anything out of range or malformed, which propagates
    up to "unrecognised" and hence to returning the raw expression.
    """
    values: set[int] = set()
    for part in field.split(","):
        pieces = part.split("/")
        if len(pieces) > 2:
            return None
        range_part = pieces[0] or ""
        try:
            step = int(pieces[1]) if len(pieces) == 2 else 1
        except ValueError:
            return None
        if step <= 0:
            return None

        if range_part in ("*", ""):
            start, end = lo, hi
        elif "-" in range_part:
            bits = range_part.split("-")
            if len(bits) != 2:
                return None
            try:
                start, end = int(bits[0]), int(bits[1])
            except ValueError:
                return None
        else:
            try:
                start = int(range_part)
            except ValueError:
                return None
            # A bare value with a step means "from here to the top of the range"
            # (`5/10` in the hour field is 5, 15). Without a step it is just 5.
            end = hi if len(pieces) == 2 else start

        if start < lo or end > hi or start > end:
            return None
        values.update(range(start, end + 1, step))

    return values or None


def parse_cron(expression: str) -> Optional[CronMatcher]:
    fields = expression.split(" ")
    if len(fields) != 5:
        return None
    mi, hr, dom, mo, dow = fields
    minute = parse_cron_field(mi, 0, 59)
    hour = parse_cron_field(hr, 0, 23)
    day_of_month = parse_cron_field(dom, 1, 31)
    month = parse_cron_field(mo, 1, 12)
    raw_dow = parse_cron_field(dow, 0, 7)
    if None in (minute, hour, day_of_month, month, raw_dow):
        return None
    # Cron allows both 0 and 7 for Sunday.
    day_of_week = {0 if d == 7 else d for d in raw_dow}  # type: ignore[union-attr]
    return CronMatcher(
        minute=minute,  # type: ignore[arg-type]
        hour=hour,  # type: ignore[arg-type]
        day_of_month=day_of_month,  # type: ignore[arg-type]
        month=month,  # type: ignore[arg-type]
        day_of_week=day_of_week,
        day_of_month_restricted=dom != "*",
        day_of_week_restricted=dow != "*",
    )


def compile_cron_matcher(schedule: str) -> Optional[CronMatcher]:
    expr, time_zone = split_schedule_timezone(schedule)
    matcher = parse_cron(expand_cron_alias(expr))
    if matcher is not None and time_zone:
        matcher.time_zone = time_zone
    return matcher


def parse_every_interval(schedule: str) -> Optional[tuple[int, str]]:
    """Parse ``@every 5m`` / ``every 30m`` into ``(amount, unit_letter)``."""
    match = _EVERY_PATTERN.match(normalize_schedule(schedule))
    if not match:
        return None
    amount = int(match.group(1))
    unit = match.group(2).lower()
    if amount <= 0 or unit not in _UNIT_NAME:
        return None
    return amount, unit


# --- prose helpers ---------------------------------------------------------


def _join_and(parts: Sequence[str]) -> str:
    if len(parts) <= 1:
        return parts[0] if parts else ""
    if len(parts) == 2:
        return f"{parts[0]} and {parts[1]}"
    return f"{', '.join(parts[:-1])}, and {parts[-1]}"


def _ordinal(day: int) -> str:
    if day % 100 in (11, 12, 13):
        suffix = "th"
    else:
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
    return f"{day}{suffix}"


def _stride(sorted_values: Sequence[int]) -> Optional[int]:
    """Return the constant gap between values, or ``None`` if uneven."""
    if len(sorted_values) < 2:
        return None
    step = sorted_values[1] - sorted_values[0]
    if step <= 0:
        return None
    for i in range(2, len(sorted_values)):
        if sorted_values[i] - sorted_values[i - 1] != step:
            return None
    return step


def _clock(hour: int, minute: int) -> str:
    period = "AM" if hour < 12 else "PM"
    display = 12 if hour % 12 == 0 else hour % 12
    return f"{display}:{minute:02d} {period}"


def _ascending(values: Iterable[int]) -> list[int]:
    return sorted(values)


def _describe_days(m: CronMatcher) -> Optional[tuple[str, Optional[str]]]:
    """Return ``(lead, on)`` phrasings for the day part, or ``None``.

    ``lead`` starts a sentence ("Weekdays"); ``on`` is the clause appended to
    an interval ("… on weekdays"). ``None`` for ``on`` means the day part adds
    nothing to an interval phrasing ("Every hour" needs no "on every day").
    """
    month_full = len(m.month) == 12
    dom = m.day_of_month_restricted and len(m.day_of_month) < 31
    dow = m.day_of_week_restricted and len(m.day_of_week) < 7

    # Cron ORs the two day fields when both are restricted. No short English
    # sentence says that honestly, so decline.
    if dom and dow:
        return None

    if dow:
        if not month_full:
            return None
        if m.day_of_week == {1, 2, 3, 4, 5}:
            return "Weekdays", " on weekdays"
        if m.day_of_week == {0, 6}:
            return "Weekends", " on weekends"
        days = _ascending(m.day_of_week)
        if len(days) > 3:
            if _stride(days) != 1:
                return None
            span = f"{_DAYS_SHORT[days[0]]}–{_DAYS_SHORT[days[-1]]}"
            return span, f", {span}"
        joined = _join_and([_DAYS[d] for d in days])
        return f"Every {joined}", f" on {joined}"

    if dom:
        days = _ascending(m.day_of_month)
        if month_full:
            if len(days) > 3:
                return None
            ordinals = _join_and([_ordinal(d) for d in days])
            return f"On the {ordinals} of every month", f" on the {ordinals} of every month"
        if len(m.month) == 1 and len(days) == 1:
            date = f"{_MONTHS[next(iter(m.month)) - 1]} {days[0]}"
            return f"Every {date}", f" on {date}"
        return None

    return ("Every day", None) if month_full else None


def _describe_time(m: CronMatcher) -> Optional[dict]:
    """Return ``{"kind": "times"|"interval", ...}`` for the time part, or ``None``."""
    minutes = _ascending(m.minute)
    hours = _ascending(m.hour)
    if not minutes or not hours:
        return None
    first_m, last_m = minutes[0], minutes[-1]
    first_h, last_h = hours[0], hours[-1]
    full_hours = len(hours) == 24

    if len(minutes) == 1:
        suffix = "" if first_m == 0 else f" at :{first_m:02d}"
        if full_hours:
            return {"kind": "interval", "base": f"Every hour{suffix}", "window": None}
        if len(hours) == 1:
            return {"kind": "times", "times": [_clock(first_h, first_m)]}
        step = _stride(hours)
        if step is not None:
            base = "Every hour" if step == 1 else f"Every {step} hours"
            # Starts at midnight and the next tick would wrap: it covers the
            # whole day, so no window clause is needed.
            if first_h == 0 and last_h + step > 23:
                return {"kind": "interval", "base": f"{base}{suffix}", "window": None}
            if step == 1 or len(hours) > 3:
                return {
                    "kind": "interval",
                    "base": base,
                    "window": f"{_clock(first_h, first_m)} – {_clock(last_h, first_m)}",
                }
        if len(hours) <= 3:
            return {"kind": "times", "times": [_clock(h, first_m) for h in hours]}
        return None

    step = _stride(minutes) if minutes[0] == 0 else None
    interval = step if (step is not None and last_m + step > 59) else None

    if interval is not None:
        base = "Every minute" if interval == 1 else f"Every {interval} minutes"
    else:
        if len(minutes) > 3:
            return None
        if not full_hours and len(hours) == 1:
            return {"kind": "times", "times": [_clock(first_h, mi) for mi in minutes]}
        base = f"Every hour at {_join_and([f':{mi:02d}' for mi in minutes])}"

    if full_hours:
        return {"kind": "interval", "base": base, "window": None}
    if not (len(hours) == 1 or _stride(hours) == 1):
        return None
    return {
        "kind": "interval",
        "base": base,
        "window": f"{_clock(first_h, first_m)} – {_clock(last_h, last_m)}",
    }


def describe_schedule(schedule: str) -> str:
    """Return a plain-English rendering, or the expression itself if unsure."""
    normalized = normalize_schedule(schedule)
    if not normalized:
        return ""

    interval = parse_every_interval(normalized)
    if interval is not None:
        amount, unit = interval
        name = _UNIT_NAME[unit]
        return f"Every {name}" if amount == 1 else f"Every {amount} {name}s"

    matcher = compile_cron_matcher(normalized)
    if matcher is None:
        return normalized

    days = _describe_days(matcher)
    time = _describe_time(matcher)
    if days is None or time is None:
        return normalized

    lead, on = days
    if time["kind"] == "times":
        prose = f"{lead} at {_join_and(time['times'])}"
    else:
        window = "" if time["window"] is None else f", {time['window']}"
        prose = f"{time['base']}{on or ''}{window}"

    return prose if matcher.time_zone is None else f"{prose} ({matcher.time_zone})"


def is_valid_schedule(schedule: str) -> bool:
    """Whether ``create_routine`` should accept this expression.

    Accepts the interval spellings and any 5-field cron the parser understands.
    Deliberately stricter than ``cron.jobs.parse_schedule`` (which also takes
    one-shot timestamps): a routine is by definition recurring, and a teammate
    that schedules a one-shot "routine" has misunderstood the tool.
    """
    normalized = normalize_schedule(schedule)
    if not normalized:
        return False
    if parse_every_interval(normalized) is not None:
        return True
    return compile_cron_matcher(normalized) is not None
