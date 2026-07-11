"""Unified provider tests — availability gating, breaker, and recovery.

Run from the hermes-agent repo root:
    python -m pytest plugins/memory/unified/tests -q
Requires hindsight-unified importable (e.g. PYTHONPATH pointing at the
hindsight/hindsight-unified checkout) for the live-sidecar tests; those
skip cleanly when it is absent.
"""

from __future__ import annotations

import json
import os
import time
import unittest
from unittest import mock

from plugins.memory.unified import (
    UnifiedMemoryProvider,
    _coerce_limit,
    _resolve_host,
    _resolve_port,
)


class ResolverTests(unittest.TestCase):
    def test_port_default_and_invalid(self):
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("UNIFIED_MEMORY_GATEWAY_PORT", None)
            self.assertEqual(_resolve_port(), 8766)
        with mock.patch.dict(os.environ, {"UNIFIED_MEMORY_GATEWAY_PORT": "banana"}):
            self.assertEqual(_resolve_port(), 8766)
        with mock.patch.dict(os.environ, {"UNIFIED_MEMORY_GATEWAY_PORT": "99999"}):
            self.assertEqual(_resolve_port(), 8766)
        with mock.patch.dict(os.environ, {"UNIFIED_MEMORY_GATEWAY_PORT": " 9001 "}):
            self.assertEqual(_resolve_port(), 9001)

    def test_host_default(self):
        with mock.patch.dict(os.environ, {"UNIFIED_MEMORY_GATEWAY_HOST": "  "}):
            self.assertEqual(_resolve_host(), "127.0.0.1")

    def test_coerce_limit(self):
        self.assertEqual(_coerce_limit(None), 5)
        self.assertEqual(_coerce_limit("10"), 10)
        self.assertEqual(_coerce_limit("10.7"), 10)
        self.assertEqual(_coerce_limit(True), 5)   # bool is not a count
        self.assertEqual(_coerce_limit(-3), 1)
        self.assertEqual(_coerce_limit(999), 20)
        self.assertEqual(_coerce_limit("abc"), 5)


class BreakerTests(unittest.TestCase):
    def test_breaker_opens_after_threshold_and_cools_down(self):
        p = UnifiedMemoryProvider()
        for _ in range(4):
            p._record_failure()
        self.assertFalse(p._is_breaker_open())
        p._record_failure()  # 5th failure trips it
        self.assertTrue(p._is_breaker_open())
        # Force-expire the cooldown; breaker must close and reset.
        p._breaker_open_until = time.monotonic() - 1
        self.assertFalse(p._is_breaker_open())
        self.assertEqual(p._consecutive_failures, 0)

    def test_success_resets_counter(self):
        p = UnifiedMemoryProvider()
        p._record_failure()
        p._record_failure()
        p._record_success()
        self.assertEqual(p._consecutive_failures, 0)


class OfflineBehaviourTests(unittest.TestCase):
    """Provider gracefully degrades when no sidecar exists at all."""

    def test_prefetch_and_sync_are_safe_noops(self):
        p = UnifiedMemoryProvider()
        # Not initialized: no supervisor, breaker closed.
        self.assertEqual(p.prefetch("anything"), "")
        p.sync_turn("u", "a")  # must not raise
        self.assertEqual(p.system_prompt_block(), "")

    def test_tool_call_reports_unavailable(self):
        p = UnifiedMemoryProvider()
        out = json.loads(p.handle_tool_call("unified_memory_search", {"query": "x"}))
        self.assertIn("error", out)

    def test_tool_schemas_optimistic_after_init_flag(self):
        p = UnifiedMemoryProvider()
        p._initialized = True
        names = [s["name"] for s in p.get_tool_schemas()]
        self.assertEqual(
            names,
            ["unified_memory_search", "unified_conversation_search", "unified_memory_reflect"],
        )

    def test_shutdown_idempotent_without_init(self):
        p = UnifiedMemoryProvider()
        p.shutdown()
        p.shutdown()


class RecoveryGuardTests(unittest.TestCase):
    def test_recover_refuses_after_shutdown(self):
        p = UnifiedMemoryProvider()
        p._supervisor = None  # shutdown() state
        self.assertFalse(p._try_recover_sidecar())

    def test_recover_throttled_by_cooldown(self):
        p = UnifiedMemoryProvider()
        p._supervisor = mock.Mock()
        p._last_recover_attempt = time.monotonic()  # just attempted
        self.assertFalse(p._try_recover_sidecar())
        p._supervisor.is_running.assert_not_called()

    def test_recover_reattaches_client_on_success(self):
        p = UnifiedMemoryProvider()
        supervisor = mock.Mock()
        supervisor.is_running.return_value = True
        supervisor.client = mock.sentinel.client
        p._supervisor = supervisor
        p._consecutive_failures = 5
        p._breaker_open_until = time.monotonic() + 60
        self.assertTrue(p._try_recover_sidecar())
        self.assertIs(p._client, mock.sentinel.client)
        self.assertTrue(p._sidecar_available)
        self.assertEqual(p._consecutive_failures, 0)  # breaker reset

    def test_ensure_alive_respects_open_breaker(self):
        p = UnifiedMemoryProvider()
        p._supervisor = mock.Mock()
        p._consecutive_failures = 5
        p._breaker_open_until = time.monotonic() + 60
        self.assertFalse(p._ensure_alive_for_request())
        p._supervisor.is_running.assert_not_called()


if __name__ == "__main__":
    unittest.main()
