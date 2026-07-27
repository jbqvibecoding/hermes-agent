"""File-backed memory storage (schema + I/O), ported from DeerFlow.

Mirrors DeerFlow's ``agents/memory/storage.py`` fact schema and atomic
file storage, adapted to Hermes:

* per-user JSON at ``{base_dir}/users/{user_id}/memory.json``;
* atomic temp-file + rename writes;
* mtime-invalidated in-memory cache keyed by ``user_id``.

The schema is DeerFlow's: ``user`` / ``history`` context summaries plus a
``facts`` list of discrete ``{id, content, category, confidence, createdAt,
source}`` entries.
"""

from __future__ import annotations

import json
import logging
import re
import threading
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

FACT_CATEGORIES = (
    "preference",
    "knowledge",
    "context",
    "behavior",
    "goal",
    "correction",
)
_SAFE_USER_RE = re.compile(r"[^A-Za-z0-9._-]+")


def utc_now_iso_z() -> str:
    """Current UTC time as ISO-8601 with a ``Z`` suffix."""
    return datetime.now(UTC).isoformat().removesuffix("+00:00") + "Z"


def safe_user_id(user_id: str | None) -> str:
    cleaned = _SAFE_USER_RE.sub("_", (user_id or "").strip()).strip("._")
    return (cleaned or "default").replace("..", "_")[:128]


def create_empty_memory() -> dict[str, Any]:
    """Create an empty memory structure (DeerFlow schema)."""
    return {
        "version": "1.0",
        "lastUpdated": utc_now_iso_z(),
        "user": {
            "workContext": {"summary": "", "updatedAt": ""},
            "personalContext": {"summary": "", "updatedAt": ""},
            "topOfMind": {"summary": "", "updatedAt": ""},
        },
        "history": {
            "recentMonths": {"summary": "", "updatedAt": ""},
            "earlierContext": {"summary": "", "updatedAt": ""},
            "longTermBackground": {"summary": "", "updatedAt": ""},
        },
        "facts": [],
    }


def make_fact(
    content: str,
    category: str = "context",
    confidence: float = 0.5,
    *,
    source: str = "extracted",
) -> dict[str, Any]:
    """Build a discrete fact entry (DeerFlow schema)."""
    content = content.strip()
    if not content:
        raise ValueError("fact content must be non-empty")
    category = (category or "context").strip() or "context"
    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0.5
    confidence = max(0.0, min(1.0, confidence))
    return {
        "id": f"fact_{uuid.uuid4().hex[:8]}",
        "content": content,
        "category": category,
        "confidence": confidence,
        "createdAt": utc_now_iso_z(),
        "source": source,
    }


class FileMemoryStorage:
    """Per-user JSON memory storage with atomic writes and mtime cache."""

    def __init__(self, base_dir: str | Path):
        self._base = Path(base_dir)
        self._cache: dict[str, tuple[dict[str, Any], float | None]] = {}
        self._lock = threading.Lock()

    def _path(self, user_id: str | None) -> Path:
        return self._base / "users" / safe_user_id(user_id) / "memory.json"

    def _read_file(self, path: Path) -> dict[str, Any]:
        if not path.exists():
            return create_empty_memory()
        try:
            with open(path, encoding="utf-8") as f:
                data = json.load(f)
            if not isinstance(data, dict):
                return create_empty_memory()
            data.setdefault("facts", [])
            return data
        except (json.JSONDecodeError, OSError) as exc:
            logger.warning("deerflow-memory: failed to read %s: %s", path, exc)
            return create_empty_memory()

    def load(self, user_id: str | None = None) -> dict[str, Any]:
        path = self._path(user_id)
        key = safe_user_id(user_id)
        try:
            mtime = path.stat().st_mtime if path.exists() else None
        except OSError:
            mtime = None
        with self._lock:
            cached = self._cache.get(key)
            if cached is not None and cached[1] == mtime:
                return cached[0]
        data = self._read_file(path)
        with self._lock:
            self._cache[key] = (data, mtime)
        return data

    def save(self, memory_data: dict[str, Any], user_id: str | None = None) -> bool:
        path = self._path(user_id)
        key = safe_user_id(user_id)
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            payload = {**memory_data, "lastUpdated": utc_now_iso_z()}
            tmp = path.with_suffix(f".{uuid.uuid4().hex}.tmp")
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2, ensure_ascii=False)
            tmp.replace(path)
            try:
                mtime = path.stat().st_mtime
            except OSError:
                mtime = None
            with self._lock:
                self._cache[key] = (payload, mtime)
            return True
        except OSError as exc:
            logger.error("deerflow-memory: failed to save %s: %s", path, exc)
            return False
