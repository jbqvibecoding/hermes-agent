"""DeerFlow-style memory as a Hermes ``MemoryProvider`` plugin.

Implements Hermes' :class:`agent.memory_provider.MemoryProvider` ABC using
DeerFlow's file-backed fact store + LLM extraction + age-based staleness
pruning. LLM calls route through Hermes' host model (``call_llm``), so no
separate provider credentials are needed.

Lifecycle mapping onto the ABC:

* ``sync_turn``   — buffer the turn's user/assistant text per session.
* ``prefetch``    — inject the top facts (recall) before each turn.
* ``on_pre_compress`` / ``on_session_end`` — flush the buffer: extract facts
  via the host LLM, run the staleness pass, and persist.
"""

from __future__ import annotations

import logging
import threading
from typing import Any, Dict, List, Optional

from agent.memory_provider import MemoryProvider

from plugins.memory.deerflow.extractor import (
    DEFAULT_PROTECTED_CATEGORIES,
    DEFAULT_STALENESS_AGE_DAYS,
    extract_facts,
    select_stale_candidates,
)
from plugins.memory.deerflow.storage import FileMemoryStorage

logger = logging.getLogger(__name__)

PROVIDER_NAME = "deerflow"
MAX_INJECT_FACTS = 15


def _host_call_llm(**kwargs: Any) -> Any:
    from agent.auxiliary_client import call_llm

    return call_llm(**kwargs)


class DeerflowMemoryProvider(MemoryProvider):
    """Cross-session persistent memory (DeerFlow schema) for Hermes."""

    def __init__(
        self, *, call_llm: Any = None, storage: Optional[FileMemoryStorage] = None
    ):
        self._call_llm = call_llm or _host_call_llm
        self._storage = storage
        self._user_id = "default"
        self._session_id = ""
        self._buffers: Dict[str, List[str]] = {}
        self._lock = threading.Lock()

    # -- identity / availability --------------------------------------------

    @property
    def name(self) -> str:
        return PROVIDER_NAME

    def is_available(self) -> bool:
        """Active only when the operator selects ``memory.provider: deerflow``."""
        import os

        if os.environ.get("HERMES_MEMORY_PROVIDER", "").strip() == PROVIDER_NAME:
            return True
        try:
            from hermes_cli.config import load_config

            cfg = load_config() or {}
        except Exception:  # noqa: BLE001
            return False
        return (cfg.get("memory") or {}).get("provider") == PROVIDER_NAME

    # -- lifecycle ----------------------------------------------------------

    def initialize(self, session_id: str, **kwargs: Any) -> None:
        from pathlib import Path

        self._session_id = session_id or ""
        self._user_id = kwargs.get("user_id") or "default"
        if self._storage is None:
            hermes_home = kwargs.get("hermes_home") or str(Path.home() / ".hermes")
            self._storage = FileMemoryStorage(Path(hermes_home) / "deerflow-memory")

    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        # Context-only provider: injects recall via prefetch, exposes no tools.
        return []

    def system_prompt_block(self) -> str:
        return ""

    # -- recall (injection) -------------------------------------------------

    def prefetch(self, query: str, *, session_id: str = "") -> str:
        if self._storage is None:
            return ""
        data = self._storage.load(self._user_id)
        facts = [f for f in data.get("facts", []) if isinstance(f, dict)]
        if not facts:
            return ""
        facts.sort(key=lambda f: f.get("confidence", 0.0), reverse=True)
        top = facts[:MAX_INJECT_FACTS]
        lines = [
            f"- ({f.get('category', 'context')}) {f.get('content', '')}" for f in top
        ]
        return "<memory>\n" + "\n".join(lines) + "\n</memory>"

    # -- capture ------------------------------------------------------------

    def sync_turn(
        self,
        user_content: str,
        assistant_content: str,
        *,
        session_id: str = "",
        messages: Optional[List[Dict[str, Any]]] = None,
    ) -> None:
        key = session_id or self._session_id or "default"
        snippet = ""
        if user_content.strip():
            snippet += f"User: {user_content.strip()}\n"
        if assistant_content.strip():
            snippet += f"Assistant: {assistant_content.strip()}\n"
        if not snippet:
            return
        with self._lock:
            self._buffers.setdefault(key, []).append(snippet)

    def _drain(self, key: str) -> str:
        with self._lock:
            parts = self._buffers.pop(key, [])
        return "".join(parts).strip()

    def _flush(self, key: str) -> None:
        conversation = self._drain(key)
        if not conversation or self._storage is None:
            return
        data = self._storage.load(self._user_id)
        facts = [f for f in data.get("facts", []) if isinstance(f, dict)]
        existing = {f.get("content", "").strip() for f in facts}
        new_facts = extract_facts(
            conversation, existing_contents=existing, call_llm=self._call_llm
        )
        if not new_facts:
            return
        data["facts"] = facts + new_facts
        self._storage.save(data, self._user_id)
        logger.info(
            "deerflow-memory: stored %d new fact(s) for user %s",
            len(new_facts),
            self._user_id,
        )

    def on_pre_compress(self, messages: List[Dict[str, Any]]) -> str:
        # Flush before history is compacted so facts aren't lost.
        self._flush(self._session_id or "default")
        return ""

    def on_session_end(self, messages: List[Dict[str, Any]]) -> None:
        self._flush(self._session_id or "default")

    def consolidate(
        self, *, force: bool = False, preview: bool = False, **kwargs: Any
    ) -> Any:
        """Run one transactional "auto-dream" consolidation pass.

        Out-of-band counterpart to the inline extraction done by ``sync_turn``:
        merges near-duplicate facts, drops superseded ones, with backup +
        rollback. Intended to be driven periodically (e.g. a Hermes cron
        routine). See :mod:`plugins.memory.deerflow.autodream`.
        """
        from plugins.memory.deerflow.autodream import (
            ConsolidationResult,
            run_consolidation,
        )

        if self._storage is None:
            return ConsolidationResult(reason="provider not initialized")
        return run_consolidation(
            self._storage,
            self._user_id,
            call_llm=self._call_llm,
            force=force,
            preview=preview,
            **kwargs,
        )

    def stale_candidate_count(self) -> int:
        """Diagnostics: how many stored facts are staleness candidates."""
        if self._storage is None:
            return 0
        facts = [
            f
            for f in self._storage.load(self._user_id).get("facts", [])
            if isinstance(f, dict)
        ]
        return len(
            select_stale_candidates(
                facts,
                age_days=DEFAULT_STALENESS_AGE_DAYS,
                protected_categories=DEFAULT_PROTECTED_CATEGORIES,
            )
        )

    def shutdown(self) -> None:
        for key in list(self._buffers.keys()):
            try:
                self._flush(key)
            except Exception:  # noqa: BLE001
                pass
