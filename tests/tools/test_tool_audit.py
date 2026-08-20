"""B4: a durable, append-only record of decisions and outcomes."""

from __future__ import annotations

import json

import pytest

from hermes_cli.audit_log import AuditWriter, redact
from tools import tool_audit


@pytest.fixture
def audit(tmp_path, monkeypatch):
    """Point the audit log at a temp HERMES_HOME and hand back a reader."""
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    tool_audit.reset_writer()
    yield lambda: _lines(tmp_path / "logs" / "tool-audit.log")
    tool_audit.reset_writer()


def _lines(path):
    if not path.exists():
        return []
    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


# ---------------------------------------------------------------------------
# The writer
# ---------------------------------------------------------------------------


def test_each_event_is_one_self_contained_json_line(audit):
    tool_audit.record("a", x=1)
    tool_audit.record("b", y=2)
    records = audit()
    assert [r["event"] for r in records] == ["a", "b"]
    assert records[0]["x"] == 1
    assert all("ts" in r for r in records)


def test_the_log_is_appended_never_rewritten(audit, tmp_path):
    tool_audit.record("first")
    tool_audit.reset_writer()
    tool_audit.record("second")
    assert [r["event"] for r in audit()] == ["first", "second"]


def test_a_truncated_log_still_parses_up_to_the_last_whole_line(tmp_path):
    """One object per line is what makes a half-written log usable."""
    path = tmp_path / "a.log"
    writer = AuditWriter(path)
    writer.write("one")
    writer.write("two")
    raw = path.read_text()
    path.write_text(raw[: len(raw) - 4])
    good = [
        json.loads(line)
        for line in path.read_text().splitlines()
        if line.strip().endswith("}")
    ]
    assert good and good[0]["event"] == "one"


def test_parent_directories_are_created(tmp_path):
    writer = AuditWriter(tmp_path / "deep" / "nested" / "a.log")
    assert writer.write("e") is True


def test_a_write_failure_is_reported_not_raised(tmp_path, monkeypatch):
    """Auditing must not make the audited thing fail."""
    writer = AuditWriter(tmp_path / "a.log")

    def _boom(*_a, **_kw):
        raise OSError("disk full")

    monkeypatch.setattr("builtins.open", _boom)
    assert writer.write("e") is False


def test_an_unserialisable_value_does_not_raise(tmp_path):
    class Weird:
        def __repr__(self):
            return "<weird>"

    writer = AuditWriter(tmp_path / "a.log")
    assert writer.write("e", obj=Weird()) is True


def test_the_agent_is_not_broken_by_a_broken_audit(monkeypatch):
    monkeypatch.setattr(
        tool_audit, "get_writer", lambda: (_ for _ in ()).throw(RuntimeError("x"))
    )
    assert tool_audit.record("e") is False  # reported, not raised


# ---------------------------------------------------------------------------
# Redaction — by field name, never by inspecting values
# ---------------------------------------------------------------------------


def test_secret_bearing_field_names_never_reach_the_log(audit):
    tool_audit.record(
        "e", password="hunter2", api_key="sk-live", tool="browser_type", ref="@e5"
    )
    record = audit()[0]
    assert "password" not in record
    assert "api_key" not in record
    assert record["tool"] == "browser_type"
    assert "hunter2" not in json.dumps(record)


def test_redaction_reaches_nested_arguments(audit):
    """Tool arguments are nested by nature; a secret one level down is exactly
    as sensitive as one at the top."""
    tool_audit.record("e", args={"url": "https://x", "token": "sk-live-abc"})
    record = audit()[0]
    assert record["args"]["url"] == "https://x"
    assert "token" not in record["args"]
    assert "sk-live-abc" not in json.dumps(record)


def test_redaction_reaches_into_lists_of_dicts(audit):
    tool_audit.record("e", items=[{"name": "a", "secret": "s3cr3t"}])
    assert "s3cr3t" not in json.dumps(audit()[0])


def test_redaction_is_case_insensitive():
    out = redact(
        {"Password": "x", "API_KEY": "y", "ok": 1}, frozenset({"password", "api_key"})
    )
    assert out == {"ok": 1}


def test_a_self_referential_structure_does_not_spin():
    payload = {}
    payload["self"] = payload
    out = redact(payload, frozenset())
    assert out  # returns something rather than recursing forever


def test_oversized_values_are_clamped_and_say_so(tmp_path):
    writer = AuditWriter(tmp_path / "a.log", max_value_chars=50)
    writer.write("e", blob="x" * 500)
    record = _lines(tmp_path / "a.log")[0]
    assert len(record["blob"]) < 200
    assert "+450 chars" in record["blob"]


# ---------------------------------------------------------------------------
# Pre-authorisation ordering
# ---------------------------------------------------------------------------


def test_the_decision_is_written_before_the_action_runs(audit):
    """The property that makes the log worth having: proved by an action that
    never finishes."""
    with pytest.raises(RuntimeError):
        with tool_audit.audited_action("browser_click", ref="@e5"):
            raise RuntimeError("the action blew up")

    events = [r["event"] for r in audit()]
    assert events == [tool_audit.TOOL_CALLED, tool_audit.TOOL_FAILED]


def test_an_allowed_action_that_fails_gets_its_own_record(audit):
    """Without this, "allowed" in the log reads as "happened"."""
    with pytest.raises(ValueError):
        with tool_audit.audited_action("t"):
            raise ValueError("nope")

    failure = audit()[-1]
    assert failure["event"] == tool_audit.TOOL_FAILED
    assert failure["ok"] is False
    assert "ValueError" in failure["error"]


def test_the_exception_is_re_raised_unchanged(audit):
    """The audit observes; it does not swallow."""
    sentinel = ValueError("original")
    with pytest.raises(ValueError) as excinfo:
        with tool_audit.audited_action("t"):
            raise sentinel
    assert excinfo.value is sentinel


def test_a_successful_action_records_both_halves(audit):
    with tool_audit.audited_action("browser_click", ref="@e5"):
        pass
    events = [r["event"] for r in audit()]
    assert events == [tool_audit.TOOL_CALLED, tool_audit.TOOL_SUCCEEDED]


def test_a_refusal_is_terminal_and_has_no_outcome(audit):
    tool_audit.record_decision(
        "terminal", allowed=False, reason="hardline", rule="rm -rf /"
    )
    records = audit()
    assert len(records) == 1
    assert records[0]["event"] == tool_audit.TOOL_REFUSED
    assert records[0]["allowed"] is False
    assert records[0]["rule"] == "rm -rf /"


def test_the_refusal_carries_the_rule_that_caused_it(audit):
    """An operator reading a refusal needs to know which rule fired."""
    tool_audit.record_decision("t", allowed=False, reason="blocked", rule="deny:prod")
    assert audit()[0]["rule"] == "deny:prod"


# ---------------------------------------------------------------------------
# Location
# ---------------------------------------------------------------------------


def test_the_log_lives_under_hermes_home(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    tool_audit.reset_writer()
    tool_audit.record("e")
    assert (tmp_path / "logs" / "tool-audit.log").exists()
    tool_audit.reset_writer()


def test_a_profile_switch_is_picked_up_after_reset(tmp_path, monkeypatch):
    first, second = tmp_path / "a", tmp_path / "b"
    monkeypatch.setenv("HERMES_HOME", str(first))
    tool_audit.reset_writer()
    tool_audit.record("e")
    monkeypatch.setenv("HERMES_HOME", str(second))
    tool_audit.reset_writer()
    tool_audit.record("e")
    assert (first / "logs" / "tool-audit.log").exists()
    assert (second / "logs" / "tool-audit.log").exists()
    tool_audit.reset_writer()


# ---------------------------------------------------------------------------
# The shared core still serves the auth log it came from
# ---------------------------------------------------------------------------


def test_the_auth_audit_log_still_works(tmp_path, monkeypatch):
    monkeypatch.setenv("HERMES_HOME", str(tmp_path))
    from hermes_cli.dashboard_auth.audit import AuditEvent, audit_log

    audit_log(AuditEvent.LOGIN_SUCCESS, user="alice", access_token="should-not-appear")
    record = _lines(tmp_path / "logs" / "dashboard-auth.log")[0]
    assert record["event"] == "login_success"
    assert record["user"] == "alice"
    assert "access_token" not in record


def test_the_shared_core_imports_only_the_standard_library():
    """The module it was extracted from is imported very early in startup; an
    import cycle introduced here would be a boot failure, not a test failure."""
    import pathlib

    import hermes_cli.audit_log as mod

    source = pathlib.Path(mod.__file__).read_text(encoding="utf-8")
    for line in source.splitlines():
        stripped = line.strip()
        if stripped.startswith(("import ", "from ")) and "hermes" in stripped:
            assert "hermes_constants" not in stripped, stripped
            assert not stripped.startswith("from hermes_cli"), stripped
            assert not stripped.startswith("import hermes"), stripped


# ---------------------------------------------------------------------------
# Per-tool-call auditing (opt-in)
# ---------------------------------------------------------------------------


def test_per_tool_auditing_is_off_by_default(monkeypatch):
    """It writes a line per tool call forever with no rotation; turning that on
    for everyone unasked would be a disk-usage decision made on their behalf."""
    monkeypatch.setattr("hermes_cli.config.load_config", lambda *a, **k: {})
    assert tool_audit.audit_enabled() is False


def test_per_tool_auditing_turns_on_from_config(monkeypatch):
    monkeypatch.setattr(
        "hermes_cli.config.load_config",
        lambda *a, **k: {"audit": {"tool_calls": True}},
    )
    assert tool_audit.audit_enabled() is True


def test_an_unreadable_config_means_off(monkeypatch):
    monkeypatch.setattr(
        "hermes_cli.config.load_config",
        lambda *a, **k: (_ for _ in ()).throw(OSError("no config")),
    )
    assert tool_audit.audit_enabled() is False


def test_a_recorded_tool_call_keeps_the_useful_fields(audit):
    tool_audit.record_tool_call(
        tool_name="terminal",
        args={"command": "ls -la"},
        task_id="t1",
        session_id="s1",
        duration_ms=42,
        status="ok",
    )
    record = audit()[0]
    assert record["event"] == tool_audit.TOOL_SUCCEEDED
    assert record["tool"] == "terminal"
    assert record["args"]["command"] == "ls -la"
    assert record["duration_ms"] == 42
    assert record["ok"] is True


def test_a_failed_tool_call_is_recorded_as_failed(audit):
    tool_audit.record_tool_call(
        tool_name="terminal", status="error", error_type="OSError", error_message="boom"
    )
    record = audit()[0]
    assert record["event"] == tool_audit.TOOL_FAILED
    assert record["ok"] is False
    assert record["error_type"] == "OSError"


def test_tool_arguments_are_redacted_before_they_land(audit):
    tool_audit.record_tool_call(
        tool_name="http", args={"url": "https://x", "api_key": "sk-live-secret"}
    )
    assert "sk-live-secret" not in json.dumps(audit()[0])


def test_non_dict_arguments_do_not_break_the_record(audit):
    tool_audit.record_tool_call(tool_name="t", args="not a dict")
    assert audit()[0]["args"] == {}
