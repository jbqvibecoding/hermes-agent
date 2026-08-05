"""Tests for the local NDJSON observability sink (W3)."""

from __future__ import annotations

import json
import os

import pytest

from plugins.observability.ndjson import (
    PATH_ENV,
    SUBSCRIBED_HOOKS,
    NdjsonSink,
    make_callback,
    register,
    resolve_config,
)


class _Ctx:
    def __init__(self):
        self.hooks = []

    def register_hook(self, name, callback):
        self.hooks.append((name, callback))


def _lines(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


# ---------------------------------------------------------------------------
# Writing
# ---------------------------------------------------------------------------


def test_each_event_is_one_self_contained_json_line(tmp_path):
    log = tmp_path / "events.ndjson"
    sink = NdjsonSink(log, heartbeat_seconds=0)
    sink.write("a", {"x": 1})
    sink.write("b", {"y": 2})

    records = _lines(log)
    assert [r["event"] for r in records] == ["a", "b"]
    assert records[0]["x"] == 1
    assert all("ts" in r for r in records)


def test_parent_directories_are_created(tmp_path):
    log = tmp_path / "deep" / "nested" / "events.ndjson"
    assert NdjsonSink(log, heartbeat_seconds=0).write("e")
    assert log.exists()


def test_appends_rather_than_truncating(tmp_path):
    log = tmp_path / "events.ndjson"
    NdjsonSink(log, heartbeat_seconds=0).write("first")
    NdjsonSink(log, heartbeat_seconds=0).write("second")
    assert len(_lines(log)) == 2


def test_a_truncated_file_still_parses_up_to_the_last_full_line(tmp_path):
    """One object per line is what makes a crash-truncated log usable."""
    log = tmp_path / "events.ndjson"
    sink = NdjsonSink(log, heartbeat_seconds=0)
    sink.write("one")
    sink.write("two")
    raw = log.read_text()
    log.write_text(raw[: len(raw) - 5])  # chop the tail mid-line

    good = [
        json.loads(line)
        for line in log.read_text().splitlines()
        if line.strip().endswith("}")
    ]
    assert good and good[0]["event"] == "one"


# ---------------------------------------------------------------------------
# Never break the run
# ---------------------------------------------------------------------------


def test_write_failure_is_swallowed(tmp_path, monkeypatch):
    sink = NdjsonSink(tmp_path / "events.ndjson", heartbeat_seconds=0)

    def _boom(*_a, **_kw):
        raise OSError("disk full")

    monkeypatch.setattr("pathlib.Path.open", _boom)
    assert sink.write("e") is False  # reported, not raised


def test_unserialisable_payload_does_not_raise(tmp_path):
    sink = NdjsonSink(tmp_path / "events.ndjson", heartbeat_seconds=0)

    class Weird:
        def __repr__(self):
            return "<weird>"

    # default=str handles it rather than exploding.
    assert sink.write("e", {"obj": Weird()}) is True


def test_heartbeat_failure_does_not_lose_the_event(tmp_path, monkeypatch):
    log = tmp_path / "events.ndjson"
    sink = NdjsonSink(log, heartbeat_seconds=1)
    monkeypatch.setattr(
        "pathlib.Path.write_text", lambda *a, **kw: (_ for _ in ()).throw(OSError("x"))
    )
    assert sink.write("e") is True
    assert len(_lines(log)) == 1


# ---------------------------------------------------------------------------
# Sanitisation
# ---------------------------------------------------------------------------


def test_bulky_and_sensitive_keys_are_dropped(tmp_path):
    log = tmp_path / "events.ndjson"
    NdjsonSink(log, heartbeat_seconds=0).write(
        "e",
        {"messages": [1, 2, 3], "api_key": "secret", "tool_name": "terminal"},
    )
    record = _lines(log)[0]
    assert "messages" not in record
    assert "api_key" not in record
    assert record["tool_name"] == "terminal"


def test_oversized_strings_are_clamped(tmp_path):
    log = tmp_path / "events.ndjson"
    NdjsonSink(log, heartbeat_seconds=0, max_value_chars=50).write(
        "e", {"blob": "x" * 500}
    )
    blob = _lines(log)[0]["blob"]
    assert len(blob) < 200
    assert "+450 chars" in blob


# ---------------------------------------------------------------------------
# Heartbeat
# ---------------------------------------------------------------------------


def test_heartbeat_file_carries_pid_and_last_tick(tmp_path):
    sink = NdjsonSink(tmp_path / "events.ndjson", heartbeat_seconds=1)
    sink.write("e")
    payload = json.loads(sink.heartbeat_path.read_text())
    assert payload["pid"] == os.getpid()
    assert payload["last_tick"] > 0
    assert payload["events"] == 1


def test_heartbeat_can_be_disabled(tmp_path):
    sink = NdjsonSink(tmp_path / "events.ndjson", heartbeat_seconds=0)
    sink.write("e")
    assert not sink.heartbeat_path.exists()


# ---------------------------------------------------------------------------
# Config + registration (opt-in, zero impact)
# ---------------------------------------------------------------------------


def test_no_config_means_no_registration(monkeypatch):
    monkeypatch.delenv(PATH_ENV, raising=False)
    monkeypatch.setattr("plugins.observability.ndjson.resolve_config", lambda: None)
    ctx = _Ctx()
    register(ctx)
    assert ctx.hooks == []


def test_env_path_enables_the_sink(monkeypatch, tmp_path):
    monkeypatch.setenv(PATH_ENV, str(tmp_path / "e.ndjson"))
    monkeypatch.setattr("hermes_cli.config.load_config", lambda *a, **k: {})
    assert resolve_config()["path"].endswith("e.ndjson")


def test_config_path_enables_the_sink(monkeypatch):
    monkeypatch.delenv(PATH_ENV, raising=False)
    monkeypatch.setattr(
        "hermes_cli.config.load_config",
        lambda *a, **k: {"observability": {"ndjson": {"path": "/tmp/x.ndjson"}}},
    )
    assert resolve_config()["path"] == "/tmp/x.ndjson"


def test_enabled_false_disables_config_path(monkeypatch):
    monkeypatch.delenv(PATH_ENV, raising=False)
    monkeypatch.setattr(
        "hermes_cli.config.load_config",
        lambda *a, **k: {
            "observability": {"ndjson": {"path": "/tmp/x.ndjson", "enabled": False}}
        },
    )
    assert resolve_config() is None


def test_disable_env_wins(monkeypatch, tmp_path):
    monkeypatch.setenv(PATH_ENV, str(tmp_path / "e.ndjson"))
    monkeypatch.setenv("HERMES_NDJSON", "0")
    ctx = _Ctx()
    register(ctx)
    assert ctx.hooks == []


def test_registers_every_subscribed_hook(monkeypatch, tmp_path):
    monkeypatch.delenv("HERMES_NDJSON", raising=False)
    monkeypatch.setenv(PATH_ENV, str(tmp_path / "e.ndjson"))
    monkeypatch.setattr("hermes_cli.config.load_config", lambda *a, **k: {})
    ctx = _Ctx()
    register(ctx)
    assert [name for name, _cb in ctx.hooks] == list(SUBSCRIBED_HOOKS)


def test_subscribed_hooks_are_all_valid_hook_names():
    from hermes_cli.plugins import VALID_HOOKS

    assert set(SUBSCRIBED_HOOKS) <= VALID_HOOKS


def test_callback_returns_none_so_it_cannot_veto_a_tool_call(tmp_path):
    """A pre_tool_call observer returning a dict would be read as a directive."""
    sink = NdjsonSink(tmp_path / "e.ndjson", heartbeat_seconds=0)
    callback = make_callback(sink, "pre_tool_call")
    assert callback(tool_name="terminal", args={}) is None


def test_end_to_end_board_tick_is_recorded(tmp_path):
    log = tmp_path / "e.ndjson"
    sink = NdjsonSink(log, heartbeat_seconds=0)
    make_callback(sink, "kanban_board_tick")(
        classification="backlog_stuck",
        reasons=["2 runnable task(s) with no worker"],
        snapshot={"total_tasks": 2},
    )
    record = _lines(log)[0]
    assert record["event"] == "kanban_board_tick"
    assert record["classification"] == "backlog_stuck"
    assert record["snapshot"]["total_tasks"] == 2


def test_plugin_is_discovered_by_the_loader():
    import hermes_cli.config as config_mod
    from hermes_cli.plugins import PluginManager

    original = config_mod.load_config
    config_mod.load_config = lambda *a, **k: {"plugins": {"enabled": ["ndjson"]}}
    try:
        manager = PluginManager()
        manager.discover_and_load()
        names = {p.get("name") for p in manager.list_plugins()}
        assert "ndjson" in names
    finally:
        config_mod.load_config = original
