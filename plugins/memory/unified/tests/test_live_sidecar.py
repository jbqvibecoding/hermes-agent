"""Provider <-> real sidecar over HTTP.

The defects these cover lived *between* the two halves: each side was
self-consistent and they disagreed about what a field meant. A mocked client
cannot see that, so these start a real sidecar in-process and drive the
provider against it. They skip cleanly when hindsight-unified is not
importable (point PYTHONPATH at the hindsight/hindsight-unified checkout).
"""

from __future__ import annotations

import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest import mock

try:
    import hindsight_unified.server as server_mod
    from hindsight_unified.config import Settings
    from hindsight_unified.engine import UnifiedEngine
except ImportError:  # pragma: no cover - environment-dependent
    server_mod = None

from plugins.memory.unified import UnifiedMemoryProvider
from plugins.memory.unified.client import UnifiedMemoryClient


@unittest.skipIf(server_mod is None, "hindsight-unified not importable")
class LiveSidecarTests(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.engine = UnifiedEngine(
            Settings(
                host="127.0.0.1",
                port=0,
                home=Path(self._tmp.name),
                enable_hindsight=False,
                enable_everos=True,
                enable_mempalace=True,
                enable_openviking=True,
                enable_memos=True,
            )
        )
        self.engine.start()
        server_mod._engine = self.engine
        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), server_mod.Handler)
        threading.Thread(target=self.httpd.serve_forever, daemon=True).start()
        self.base = f"http://127.0.0.1:{self.httpd.server_address[1]}"
        # Cleanups run last-in-first-out, so every provider registered later
        # shuts down (and sends its session-end) while the server still
        # answers. Tearing the server down in tearDown() instead left each
        # provider's final request waiting on a socket nobody served.
        self.addCleanup(self._tmp.cleanup)
        self.addCleanup(setattr, server_mod, "_engine", None)
        self.addCleanup(self.engine.stop)
        self.addCleanup(self.httpd.server_close)
        self.addCleanup(self.httpd.shutdown)

    def _provider(self, session_id: str = "sess-A", **init_kwargs) -> UnifiedMemoryProvider:
        """A provider initialised through its real initialize(), pointed at this
        sidecar. Only process supervision is replaced: the gate and session
        logic under test run exactly as they do in Hermes."""
        supervisor = mock.Mock()
        supervisor.is_running.return_value = True
        supervisor.client = UnifiedMemoryClient(base_url=self.base)
        p = UnifiedMemoryProvider()
        with (
            mock.patch("plugins.memory.unified.SidecarSupervisor", return_value=supervisor),
            mock.patch.object(UnifiedMemoryProvider, "_start_watchdog"),
        ):
            p.initialize(session_id, agent_identity="test", **init_kwargs)
        self.addCleanup(p.shutdown)
        return p

    def _sync(self, p: UnifiedMemoryProvider, user: str, assistant: str, **kw) -> None:
        p.sync_turn(user, assistant, **kw)
        with p._sync_lock:
            pending = list(p._active_syncs)
        for t in pending:
            t.join(timeout=5)

    def _entries(self) -> list:
        return self.engine._substrate._load(self.engine._settings.bank_dir("hermes-test"))

    # -- session provenance -------------------------------------------------

    def test_a_turn_is_filed_under_its_conversation_not_its_bank(self) -> None:
        """Every turn used to carry the bank's name as its session, so which
        conversation it came from was unrecoverable."""
        p = self._provider("sess-A")
        self._sync(p, "the staging db listens on 6543", "Understood.", session_id="sess-A")
        (entry,) = self._entries()
        self.assertEqual(entry.session_key, "sess-A")
        # ...while still landing in the identity's bank, so memory accumulates.
        self.assertTrue(self.engine._settings.bank_dir("hermes-test").exists())

    def test_the_followup_lane_reads_this_conversation_not_another(self) -> None:
        """Two conversations on one identity (say, gateway and CLI) interleave.

        The rewrite lane folds "the last two turns" into a follow-up query.
        Keyed by bank, that was whichever conversation wrote last.
        """
        a = self._provider("sess-A")
        b = self._provider("sess-B")
        self._sync(a, "We compared Kafka and NATS for the broker.", "Okay.", session_id="sess-A")
        self._sync(b, "Lunch is at noon on Fridays.", "Sure thing.", session_id="sess-B")
        bank_dir = self.engine._settings.bank_dir("hermes-test")
        recent = self.engine._substrate.recent_turns(bank_dir, session_key="sess-A", limit=2)
        self.assertEqual([u for u, _ in recent], ["We compared Kafka and NATS for the broker."])

    def test_prefetch_asks_for_this_conversations_recent_turns(self) -> None:
        p = self._provider("sess-A")
        with mock.patch.object(p._client, "recall", wraps=p._client.recall) as recall:
            p.prefetch("and the other one?", session_id="sess-A")
        self.assertEqual(recall.call_args.kwargs["session_key"], "sess-A")
        self.assertEqual(recall.call_args.kwargs["bank"], "hermes-test")

    def test_conversation_search_still_spans_every_session(self) -> None:
        """The server treats session_key as a filter on this endpoint. Once turns
        carry real session ids, sending the bank there would match nothing."""
        p = self._provider("sess-A")
        self._sync(p, "the reaper job trims old blobs", "Got it.", session_id="sess-A")
        p._session_id = "sess-B"  # a later conversation searching history
        out = p.handle_tool_call("unified_conversation_search", {"query": "reaper"})
        self.assertIn("reaper", out)

    def test_session_switch_updates_the_cached_id(self) -> None:
        p = self._provider("sess-A")
        p.on_session_switch("sess-B", parent_session_id="sess-A", reset=True)
        p.on_memory_write("add", "user", "prefers tabs")
        self.assertEqual([e.session_key for e in self._entries()], ["sess-B"])

    def test_prefetch_recalls_across_sessions(self) -> None:
        """Provenance must not narrow recall: memory is per identity."""
        a = self._provider("sess-A")
        self._sync(a, "the staging db listens on 6543", "Understood.", session_id="sess-A")
        b = self._provider("sess-B")
        self.assertIn("6543", b.prefetch("what port does the staging db use?", session_id="sess-B"))

    # -- write gating -------------------------------------------------------

    def test_a_non_primary_context_reads_but_never_writes(self) -> None:
        p = self._provider("sess-A", agent_context="cron")
        self._sync(p, "cron system prompt: summarize the inbox", "done", session_id="sess-A")
        p.on_memory_write("add", "user", "anything")
        self.assertEqual(self._entries(), [])


if __name__ == "__main__":
    unittest.main()
