"""UnifiedMemoryClient — stdlib HTTP client for the unified memory sidecar.

Wraps the sidecar API endpoints with timeout and error handling.
Thread-safe — can be shared across prefetch/sync threads.

Modeled on the memory_tencentdb Gateway client; the sidecar mirrors that
Gateway's surface (recall/capture/search/session-end/seed) plus /reflect.
"""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

DEFAULT_TIMEOUT = 10  # seconds


class UnifiedMemoryClient:
    """HTTP client for the unified memory sidecar."""

    def __init__(
        self,
        base_url: str = "http://127.0.0.1:8766",
        timeout: int = DEFAULT_TIMEOUT,
    ):
        self._base_url = base_url.rstrip("/")
        self._timeout = timeout

    def _post(self, path: str, body: Dict[str, Any], timeout: Optional[int] = None) -> Dict[str, Any]:
        url = f"{self._base_url}{path}"
        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout or self._timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body_text = ""
            try:
                body_text = e.read().decode("utf-8", errors="replace")
            except Exception:
                pass
            logger.warning("unified-memory sidecar %s returned %d: %s", path, e.code, body_text[:500])
            raise
        except Exception as e:
            logger.debug("unified-memory sidecar %s failed: %s", path, e)
            raise

    def _get(self, path: str, timeout: Optional[int] = None) -> Dict[str, Any]:
        url = f"{self._base_url}{path}"
        req = urllib.request.Request(url, method="GET")
        try:
            with urllib.request.urlopen(req, timeout=timeout or self._timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            logger.debug("unified-memory sidecar GET %s failed: %s", path, e)
            raise

    # -- API methods ----------------------------------------------------------

    def health(self, timeout: int = 3) -> Dict[str, Any]:
        return self._get("/health", timeout=timeout)

    def recall(self, query: str, session_key: str, user_id: str = "") -> Dict[str, Any]:
        body: Dict[str, Any] = {"query": query, "session_key": session_key}
        if user_id:
            body["user_id"] = user_id
        return self._post("/recall", body)

    def capture(
        self,
        user_content: str,
        assistant_content: str,
        session_key: str,
        user_id: str = "",
    ) -> Dict[str, Any]:
        body: Dict[str, Any] = {
            "user_content": user_content,
            "assistant_content": assistant_content,
            "session_key": session_key,
        }
        if user_id:
            body["user_id"] = user_id
        return self._post("/capture", body)

    def search_memories(
        self, query: str, session_key: str, limit: int = 5, type_filter: str = ""
    ) -> Dict[str, Any]:
        body: Dict[str, Any] = {"query": query, "session_key": session_key, "limit": limit}
        if type_filter:
            body["type"] = type_filter
        return self._post("/search/memories", body)

    def search_conversations(
        self, query: str, session_key: str, limit: int = 5
    ) -> Dict[str, Any]:
        body: Dict[str, Any] = {"query": query, "session_key": session_key, "limit": limit}
        return self._post("/search/conversations", body)

    def reflect(self, query: str, session_key: str, timeout: int = 60) -> Dict[str, Any]:
        body: Dict[str, Any] = {"query": query, "session_key": session_key}
        return self._post("/reflect", body, timeout=timeout)

    def end_session(self, session_key: str, user_id: str = "") -> Dict[str, Any]:
        body: Dict[str, Any] = {"session_key": session_key}
        if user_id:
            body["user_id"] = user_id
        return self._post("/session/end", body)

    def seed(self, data: Any, session_key: str = "", timeout: int = 300) -> Dict[str, Any]:
        body: Dict[str, Any] = {"data": data}
        if session_key:
            body["session_key"] = session_key
        return self._post("/seed", body, timeout=timeout)
