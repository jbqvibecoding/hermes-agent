"""Provider <-> real sidecar over HTTP.

The defects these cover lived *between* the two halves: each side was
self-consistent and they disagreed about what a field meant. A mocked client
cannot see that, so these start a real sidecar in-process and drive the
provider against it. They skip cleanly when hindsight-unified is not
importable (point PYTHONPATH at the hindsight/hindsight-unified checkout).
"""

from __future__ import annotations

import json
import tempfile
import threading
import time
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


    # -- delivery: held, retried, exactly once ------------------------------

    def _drain_syncs(self, p: UnifiedMemoryProvider) -> None:
        with p._sync_lock:
            pending = list(p._active_syncs)
        for t in pending:
            t.join(timeout=5)

    def test_compression_writes_no_second_copy(self) -> None:
        """Every compressed turn was already captured by sync_turn. Re-capturing
        the span wrote one merged duplicate per compression, which measurably
        outranked the turns it duplicated."""
        p = self._provider("sess-A")
        turns = [(f"note {i}: the staging db listens on 65{i:02d}", "Okay.") for i in range(6)]
        for user, assistant in turns:
            self._sync(p, user, assistant, session_id="sess-A")
        before = len(self._entries())
        messages = []
        for user, assistant in turns:
            messages += [{"role": "user", "content": user}, {"role": "assistant", "content": assistant}]
        self.assertEqual(p.on_pre_compress(messages), "")
        self.assertEqual(len(self._entries()), before)

    def test_a_turn_is_held_not_dropped_while_the_sidecar_is_down(self) -> None:
        """Previously an open breaker meant the turn was simply lost."""
        p = self._provider("sess-A")
        # Down as the provider sees it: marked unavailable, breaker open, so
        # the request path will not even try to reach the sidecar.
        p._sidecar_available = False
        p._consecutive_failures = 5
        p._breaker_open_until = time.monotonic() + 60
        p.sync_turn("first, said while memory was down", "Okay.", session_id="sess-A")
        self.assertEqual(self._entries(), [])
        self.assertEqual(len(p._pending), 1)

        # Back: what the watchdog does when the health probe succeeds.
        p._sidecar_available = True
        p._consecutive_failures = 0
        p._breaker_open_until = 0.0
        self._sync(p, "second, said after it came back", "Ack.", session_id="sess-A")
        # Both delivered, and in the order they were said.
        self.assertEqual(
            [e.user for e in self._entries()],
            ["first, said while memory was down", "second, said after it came back"],
        )
        self.assertEqual(len(p._pending), 0)

    def test_retrying_a_request_that_landed_writes_it_once(self) -> None:
        """The case the idempotency key exists for: the sidecar wrote the turn,
        but the response never reached the provider, so it looks failed."""
        p = self._provider("sess-A")
        real_capture = p._client.capture
        calls = {"n": 0}

        def lands_then_times_out(**kwargs):
            calls["n"] += 1
            result = real_capture(**kwargs)
            if calls["n"] == 1:
                raise TimeoutError("response lost after the write")
            return result

        with mock.patch.object(p._client, "capture", side_effect=lands_then_times_out):
            self._sync(p, "the reaper job trims old blobs", "Got it.", session_id="sess-A")
            self.assertEqual(len(p._pending), 1)  # looked failed, so it is held
            self.assertTrue(p._drain_pending())
        self.assertEqual(calls["n"], 2)
        self.assertEqual([e.user for e in self._entries()], ["the reaper job trims old blobs"])

    def test_the_retry_buffer_is_bounded(self) -> None:
        from plugins.memory.unified import _MAX_PENDING_TURNS, _PendingTurn

        p = self._provider("sess-A")
        for i in range(_MAX_PENDING_TURNS + 10):
            p._hold(_PendingTurn(f"u{i}", "a", "sess-A", f"k{i}"))
        self.assertEqual(len(p._pending), _MAX_PENDING_TURNS)
        self.assertEqual(p._dropped_turns, 10)
        self.assertEqual(p._pending[0].user, "u10")  # the oldest went first


    # -- the forget tool ----------------------------------------------------

    def _seed_secret(self, p: UnifiedMemoryProvider) -> None:
        self._sync(p, "My old home address is 12 Elm Street.", "Okay.", session_id="sess-A")
        self._sync(p, "My current home address is 9 Oak Lane.", "Okay.", session_id="sess-A")

    def test_a_query_alone_forgets_nothing(self) -> None:
        """The tool supermemory's provider ships forgets the top hit unseen.

        Asked to forget the *old* address, whichever address ranks first goes.
        Here a query is only ever a preview.
        """
        p = self._provider("sess-A")
        self._seed_secret(p)
        out = json.loads(p.handle_tool_call("unified_memory_forget", {"query": "home address"}))
        self.assertEqual(out["forgotten"], [])
        self.assertIn("Nothing was forgotten", out["next_step"])
        self.assertGreaterEqual(len(out["candidates"]), 2)
        # Both addresses are still recalled.
        context = p.prefetch("what is my home address?", session_id="sess-A")
        self.assertIn("Elm Street", context)
        self.assertIn("Oak Lane", context)

    def test_forgetting_by_id_removes_exactly_that_memory(self) -> None:
        p = self._provider("sess-A")
        self._seed_secret(p)
        preview = json.loads(p.handle_tool_call("unified_memory_forget", {"query": "home address"}))
        old = [c["entry_id"] for c in preview["candidates"] if "Elm Street" in c["text"]]
        out = json.loads(
            p.handle_tool_call(
                "unified_memory_forget", {"entry_ids": old, "reason": "moved house"}
            )
        )
        self.assertEqual(out["forgotten"], old)
        self.assertTrue(out["still_on_disk"])  # the agent must not call it erasure
        context = p.prefetch("what is my home address?", session_id="sess-A")
        self.assertNotIn("Elm Street", context)
        self.assertIn("Oak Lane", context)

    def test_forget_is_refused_in_a_read_only_context(self) -> None:
        p = self._provider("sess-A", agent_context="cron")
        out = json.loads(p.handle_tool_call("unified_memory_forget", {"entry_ids": ["x"]}))
        self.assertIn("read-only", out["error"])


if __name__ == "__main__":
    unittest.main()
