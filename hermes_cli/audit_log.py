"""Append-only JSONL audit logging — the shared core.

Extracted from ``hermes_cli/dashboard_auth/audit.py``, which had the right
shape (one JSON object per line, enumerated event types, a frozenset of field
names that must never be written, a write lock, and a writer that logs its own
failures rather than raising) but only covered dashboard authentication events.
Tool calls — the thing an operator most wants a record of — had none.

Rather than write a second one, the mechanism lives here and both use it. The
auth log keeps its own path, event enum and redaction set; see
``tools/tool_audit.py`` for the tool-call vocabulary.

**Dependency discipline is deliberate.** This module imports only the standard
library. The original carried a comment explaining why — it is imported from
middleware that loads very early in startup — and extracting it must not
quietly introduce the import cycle that comment exists to prevent.

Why append-only matters
-----------------------
An audit record is worth having only to the extent it cannot be quietly
revised. This module never opens a log for anything but append, and never
rewrites a line. That is weaker than the database trigger CopilotKit's OpenBot
uses (``CREATE TRIGGER audit_events_append_only``), and the difference is worth
stating plainly: a file an operator can edit is a record of what happened, not
proof of it.

Ported discipline from OpenBot (MIT) — ``server/src/audit.ts``: never record
the payload of a secret, redact by field name, and write the decision *before*
the action so that "allowed" can never be mistaken for "happened".
"""

from __future__ import annotations

import datetime as _dt
import json
import logging
import os
import threading
from pathlib import Path
from typing import Any, Dict, FrozenSet, Iterable, Optional

_log = logging.getLogger(__name__)

# One lock per process, shared across writers. Audit volume is low and the
# critical section is a single append, so contention is not a concern; a
# single lock is easier to reason about than one per file.
_WRITE_LOCK = threading.Lock()

# How much of any single string value is kept. Larger than the NDJSON
# observability sink's 2,000 because that sink is for watching a run and this
# is for reconstructing one, but still bounded: an audit log that can be filled
# with one tool result is an audit log that can be made to rotate away.
DEFAULT_MAX_VALUE_CHARS = 20_000


def resolve_hermes_home() -> Path:
    """``$HERMES_HOME``, else ``~/.hermes``.

    A local copy of ``hermes_constants.get_hermes_home`` semantics, for the
    dependency reason in the module docstring.
    """
    return Path(os.environ.get("HERMES_HOME") or str(Path.home() / ".hermes"))


def _clamp(value: Any, max_chars: int) -> Any:
    """Bound a single value, marking any truncation in the value itself."""
    if isinstance(value, str) and len(value) > max_chars:
        return value[:max_chars] + f"…[+{len(value) - max_chars} chars]"
    return value


def redact(
    fields: Dict[str, Any],
    redacted: FrozenSet[str],
    *,
    max_value_chars: int = DEFAULT_MAX_VALUE_CHARS,
    _depth: int = 0,
) -> Dict[str, Any]:
    """Drop fields whose *name* says they hold something that must not be kept.

    Recursive, unlike the original: a secret one level down inside an argument
    dict is exactly as sensitive as one at the top, and tool arguments are
    nested by nature. Depth is capped so a self-referential structure cannot
    spin here.

    Matching is case-insensitive on the exact key name. It deliberately does
    *not* try to detect secrets by looking at values — that is a filter over
    something you already decided to write down, and the stronger property is
    not writing it.
    """
    if _depth > 6:
        return {"_truncated": "structure too deep for the audit log"}

    out: Dict[str, Any] = {}
    for key, value in fields.items():
        if str(key).lower() in redacted:
            continue
        if isinstance(value, dict):
            out[key] = redact(
                value, redacted, max_value_chars=max_value_chars, _depth=_depth + 1
            )
        elif isinstance(value, (list, tuple)):
            out[key] = [
                redact(v, redacted, max_value_chars=max_value_chars, _depth=_depth + 1)
                if isinstance(v, dict)
                else _clamp(v, max_value_chars)
                for v in list(value)[:100]
            ]
        else:
            out[key] = _clamp(value, max_value_chars)
    return out


class AuditWriter:
    """Appends one JSON object per line to a log, and never raises.

    A writer that could raise would make the thing being audited fail because
    the auditing failed, which is the wrong trade in both directions: the
    action should happen, and the operator should find out the record is
    missing from the warning in the log rather than from an incident.
    """

    def __init__(
        self,
        path: Path,
        *,
        redacted_fields: Iterable[str] = (),
        name: str = "audit",
        max_value_chars: int = DEFAULT_MAX_VALUE_CHARS,
    ) -> None:
        self._path = Path(path)
        self._redacted = frozenset(str(f).lower() for f in redacted_fields)
        self._name = name
        self._max_value_chars = max_value_chars

    @property
    def path(self) -> Path:
        return self._path

    @property
    def redacted_fields(self) -> FrozenSet[str]:
        return self._redacted

    def write(self, event: str, **fields: Any) -> bool:
        """Append one event. Returns whether it reached disk.

        The return value exists so a caller that genuinely needs to know (a
        test, a health check) can ask, without anyone being forced to handle an
        exception on a path where the answer does not change what they do.
        """
        try:
            entry: Dict[str, Any] = {
                "ts": _dt.datetime.now(_dt.timezone.utc).isoformat(),
                "event": str(event),
            }
            entry.update(
                redact(fields, self._redacted, max_value_chars=self._max_value_chars)
            )
            line = json.dumps(entry, separators=(",", ":"), default=str) + "\n"
        except Exception as exc:  # noqa: BLE001 — see class docstring
            _log.warning(
                "%s audit log could not serialise an event: %s", self._name, exc
            )
            return False

        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            with _WRITE_LOCK:
                # Append mode only. Nothing in this module opens a log for
                # writing or truncation.
                with open(self._path, "a", encoding="utf-8") as handle:
                    handle.write(line)
            return True
        except Exception as exc:  # noqa: BLE001 — see class docstring
            _log.warning("%s audit log write failed: %s", self._name, exc)
            return False


__all__ = [
    "DEFAULT_MAX_VALUE_CHARS",
    "AuditWriter",
    "redact",
    "resolve_hermes_home",
]
