"""Validation for the ``✓ system → result · count`` report payload.

Ported from OpenGrokBot's ``gateway/src/report.ts``. Strictness is the point:
a malformed report is rejected and the error string is handed back to the model
as the tool result, which retries with a well-formed one. Accepting a sloppy
payload and rendering a half-empty chip would teach the model that the grammar
is optional, and the grammar is the product.
"""

from __future__ import annotations

from typing import Any, Optional


def validate_report_payload(payload: Any) -> Optional[dict]:
    """Return a normalised report payload, or ``None`` when it is malformed.

    Valid shape::

        {"lines": [{"system": str, "result": str, "count"?: str}, ...],
         "closing"?: str}

    Rejects: a non-dict, an absent/non-list/empty ``lines``, any line that is
    not a dict, any blank or non-string ``system``/``result``, and a non-string
    ``count``. Whitespace is stripped; a blank ``count`` or ``closing`` is
    dropped rather than emitted as an empty span the chip would render as a
    stray separator.
    """
    if not isinstance(payload, dict):
        return None

    raw_lines = payload.get("lines")
    if not isinstance(raw_lines, list) or not raw_lines:
        return None

    lines: list[dict] = []
    for raw in raw_lines:
        if not isinstance(raw, dict):
            return None
        system = raw.get("system")
        result = raw.get("result")
        count = raw.get("count")
        if not isinstance(system, str) or not system.strip():
            return None
        if not isinstance(result, str) or not result.strip():
            return None
        if count is not None and not isinstance(count, str):
            return None
        line = {"system": system.strip(), "result": result.strip()}
        if isinstance(count, str) and count.strip():
            line["count"] = count.strip()
        lines.append(line)

    closing = payload.get("closing")
    out: dict = {"lines": lines}
    if isinstance(closing, str) and closing.strip():
        out["closing"] = closing.strip()
    return out


def render_report_text(payload: dict) -> str:
    """Render a validated report as plain text.

    The browser draws the chip; this is for the surfaces that cannot — a cron
    job's ``last_output``, a delivered notification, the projection of a past
    report back into model history.
    """
    parts = []
    for line in payload.get("lines", []):
        text = f"✓ {line['system']} → {line['result']}"
        if line.get("count"):
            text += f" · {line['count']}"
        parts.append(text)
    closing = payload.get("closing")
    if closing:
        parts.append(closing)
    return "\n".join(parts)
