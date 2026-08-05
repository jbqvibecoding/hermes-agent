"""ndjson plugin — append Hermes lifecycle events to a local NDJSON file.

Inspired by wanman's `LoopLogger` (`packages/cli/src/loop-observability.ts`,
Apache-2.0), which persists a typed event union one JSON object per line and
keeps a small heartbeat file alongside it.

**Why this exists.** Hermes already has a good observability contract — the
read-only observer hooks in ``docs/observability/README.md`` — but both sinks
that ship (``langfuse``, ``nemo_relay``) push to an external service. There is
no way to get a durable local record without standing something up. An
append-only NDJSON file is the cheapest possible sink: no dependencies, no
network, no daemon, and any front end (a TUI, a web view, ``jq``) can tail it
and get a fully structured feed.

Design rules taken from upstream, and worth stating because they are what make
a logger safe to leave running:

* **Never break the run.** Every write is best-effort; a full disk, a revoked
  permission or a bad path degrades to silence, never to an exception in the
  agent's path.
* **One self-contained object per line.** No multi-line records, so a file
  truncated by a crash still parses up to the last complete line.
* **A heartbeat file** with pid and last-tick time, so an external monitor can
  tell "wedged" from "finished" without parsing the whole log.

**Opt-in**: with no ``observability.ndjson`` config and no ``HERMES_NDJSON_PATH``
the plugin registers nothing and writes nothing.
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

CONFIG_SECTION = "observability"
CONFIG_KEY = "ndjson"
PATH_ENV = "HERMES_NDJSON_PATH"
DISABLE_ENV = "HERMES_NDJSON"

DEFAULT_HEARTBEAT_SECONDS = 10

# Hook payload keys that are large, noisy, or may carry sensitive content. The
# observer contract already sanitizes payloads, but a local log is easy to
# forget about, so the sink stays conservative by default.
_DROP_KEYS = frozenset({
    "conversation_history",
    "messages",
    "request",
    "response",
    "api_key",
    "schema_version",
})

_MAX_VALUE_CHARS = 2000


class NdjsonSink:
    """Append-only NDJSON writer with a heartbeat companion file."""

    def __init__(
        self,
        path: str | Path,
        *,
        heartbeat_seconds: int = DEFAULT_HEARTBEAT_SECONDS,
        max_value_chars: int = _MAX_VALUE_CHARS,
    ):
        self.path = Path(path).expanduser()
        self.heartbeat_path = self.path.with_name(self.path.stem + ".heartbeat.json")
        self.heartbeat_seconds = heartbeat_seconds
        self.max_value_chars = max_value_chars
        self._lock = threading.Lock()
        self._last_heartbeat = 0.0
        self._events = 0

    # -- writing ------------------------------------------------------------

    def write(self, event: str, payload: Optional[Dict[str, Any]] = None) -> bool:
        """Append one event. Returns whether the line was written.

        Never raises: a logger that can take down the agent is worse than no
        logger at all.
        """
        record = {
            "ts": time.time(),
            "event": event,
            **_sanitize(payload or {}, self.max_value_chars),
        }
        try:
            line = json.dumps(record, ensure_ascii=False, default=str)
        except Exception:  # noqa: BLE001
            return False

        try:
            with self._lock:
                self.path.parent.mkdir(parents=True, exist_ok=True)
                with self.path.open("a", encoding="utf-8") as handle:
                    handle.write(line + "\n")
                self._events += 1
            self._maybe_heartbeat()
            return True
        except Exception as exc:  # noqa: BLE001 — best-effort by design
            logger.debug("ndjson: write failed: %s", exc)
            return False

    def _maybe_heartbeat(self) -> None:
        if self.heartbeat_seconds <= 0:
            return
        now = time.time()
        if now - self._last_heartbeat < self.heartbeat_seconds:
            return
        self._last_heartbeat = now
        try:
            payload = json.dumps({
                "pid": os.getpid(),
                "last_tick": now,
                "events": self._events,
                "log": str(self.path),
            })
            tmp = self.heartbeat_path.with_suffix(".tmp")
            tmp.write_text(payload, encoding="utf-8")
            tmp.replace(self.heartbeat_path)
        except Exception as exc:  # noqa: BLE001
            logger.debug("ndjson: heartbeat failed: %s", exc)


def _sanitize(payload: Dict[str, Any], max_chars: int) -> Dict[str, Any]:
    """Drop bulky/sensitive keys and clamp oversized values."""
    clean: Dict[str, Any] = {}
    for key, value in payload.items():
        if key in _DROP_KEYS:
            continue
        if isinstance(value, str) and len(value) > max_chars:
            value = value[:max_chars] + f"…(+{len(value) - max_chars} chars)"
        clean[key] = value
    return clean


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------


def _disabled_by_env() -> bool:
    return os.environ.get(DISABLE_ENV, "").strip().lower() in {
        "0",
        "false",
        "off",
        "no",
    }


def resolve_config() -> Optional[Dict[str, Any]]:
    """Return the sink config, or None when the plugin should stay inert.

    ``HERMES_NDJSON_PATH`` wins over ``config.yaml``'s
    ``observability.ndjson.path``; with neither set the plugin does nothing.
    """
    raw: Dict[str, Any] = {}
    try:
        from hermes_cli.config import load_config

        cfg = load_config() or {}
        section = cfg.get(CONFIG_SECTION) or {}
        if isinstance(section, dict):
            candidate = section.get(CONFIG_KEY)
            if isinstance(candidate, dict):
                raw = candidate
    except Exception as exc:  # noqa: BLE001
        logger.debug("ndjson: config unavailable: %s", exc)

    path = os.environ.get(PATH_ENV, "").strip() or str(raw.get("path") or "").strip()
    if not path:
        return None
    if raw.get("enabled") is False and not os.environ.get(PATH_ENV):
        return None

    try:
        heartbeat = int(raw.get("heartbeat_seconds", DEFAULT_HEARTBEAT_SECONDS))
    except (TypeError, ValueError):
        heartbeat = DEFAULT_HEARTBEAT_SECONDS

    return {"path": path, "heartbeat_seconds": heartbeat}


# Events the sink subscribes to. Board ticks and task lifecycle carry the
# multi-task picture; the per-turn hooks carry what one agent did.
SUBSCRIBED_HOOKS = (
    "kanban_board_tick",
    "kanban_task_claimed",
    "kanban_task_completed",
    "kanban_task_blocked",
    "on_session_start",
    "on_session_end",
    "pre_tool_call",
    "post_tool_call",
    "pre_api_request",
    "post_api_request",
)


def make_callback(sink: NdjsonSink, event: str):
    """Build the observer callback that records *event* into *sink*."""

    def _callback(**kwargs: Any) -> None:
        sink.write(event, kwargs)
        # Observer hooks must return nothing — returning a dict from
        # pre_tool_call would be read as a block/approve directive.
        return None

    return _callback


def register(ctx) -> None:
    if _disabled_by_env():
        logger.info("ndjson: disabled via %s", DISABLE_ENV)
        return

    config = resolve_config()
    if not config:
        logger.debug(
            "ndjson: no %s.%s path configured; nothing registered",
            CONFIG_SECTION,
            CONFIG_KEY,
        )
        return

    sink = NdjsonSink(config["path"], heartbeat_seconds=config["heartbeat_seconds"])
    for event in SUBSCRIBED_HOOKS:
        ctx.register_hook(event, make_callback(sink, event))
    logger.info(
        "ndjson: logging %d event type(s) to %s", len(SUBSCRIBED_HOOKS), sink.path
    )
