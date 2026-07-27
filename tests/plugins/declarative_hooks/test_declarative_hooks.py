"""Tests for the declarative-hooks plugin (ported OpenHarness hooks/)."""

from __future__ import annotations

import json
import sys
import types

import pytest

from plugins.declarative_hooks import (
    BLOCKING_EVENT,
    EVENT_ALIASES,
    make_hook_callback,
)
from plugins.declarative_hooks import _normalize_events, register
from plugins.declarative_hooks.executor import (
    AggregatedHookResult,
    HookResult,
    execute_hooks,
    inject_arguments,
    matches_hook,
    parse_hook_json,
    run_hook,
)
from plugins.declarative_hooks.schemas import (
    AgentHookDefinition,
    CommandHookDefinition,
    HookConfigError,
    HttpHookDefinition,
    PromptHookDefinition,
    hook_detail,
    hook_from_dict,
    load_hook_definitions,
    load_hook_definitions_with_errors,
)


def _verdict_llm(content):
    """A fake ``call_llm`` returning an OpenAI-shaped response with *content*."""

    def call(**kwargs):
        call.kwargs = kwargs
        msg = types.SimpleNamespace(content=content)
        return types.SimpleNamespace(choices=[types.SimpleNamespace(message=msg)])

    call.kwargs = {}
    return call


class _Ctx:
    """Minimal PluginContext stand-in capturing register_hook calls."""

    def __init__(self):
        self.hooks = []

    def register_hook(self, name, callback):
        self.hooks.append((name, callback))


# ---------------------------------------------------------------------------
# (1) schema parsing
# ---------------------------------------------------------------------------


def test_command_hook_defaults():
    hook = hook_from_dict({"type": "command", "command": "echo hi"})
    assert isinstance(hook, CommandHookDefinition)
    assert hook.command == "echo hi"
    assert hook.timeout_seconds == 30
    assert hook.block_on_failure is False  # command hooks are advisory by default
    assert hook.priority == 0
    assert hook.matcher is None


def test_prompt_and_agent_hooks_block_by_default():
    prompt = hook_from_dict({"type": "prompt", "prompt": "check $ARGUMENTS"})
    agent = hook_from_dict({"type": "agent", "prompt": "deep check"})
    assert isinstance(prompt, PromptHookDefinition)
    assert isinstance(agent, AgentHookDefinition)
    assert prompt.block_on_failure is True
    assert agent.block_on_failure is True
    assert agent.timeout_seconds == 60  # upstream agent default


def test_http_hook_headers_stringified():
    hook = hook_from_dict({
        "type": "http",
        "url": "https://example.test/h",
        "headers": {"X-K": 1},
    })
    assert isinstance(hook, HttpHookDefinition)
    assert hook.headers == {"X-K": "1"}


def test_timeout_is_clamped_to_bounds():
    assert (
        hook_from_dict({
            "type": "command",
            "command": "x",
            "timeout_seconds": 0,
        }).timeout_seconds
        == 1
    )
    assert (
        hook_from_dict({
            "type": "command",
            "command": "x",
            "timeout_seconds": 99999,
        }).timeout_seconds
        == 600
    )
    # agent hooks get the wider upper bound
    assert (
        hook_from_dict({
            "type": "agent",
            "prompt": "p",
            "timeout_seconds": 99999,
        }).timeout_seconds
        == 1200
    )
    # garbage falls back to the type default
    assert (
        hook_from_dict({
            "type": "command",
            "command": "x",
            "timeout_seconds": "soon",
        }).timeout_seconds
        == 30
    )


def test_unknown_type_and_missing_fields_rejected():
    with pytest.raises(HookConfigError):
        hook_from_dict({"type": "telepathy", "prompt": "p"})
    with pytest.raises(HookConfigError):
        hook_from_dict({"type": "command"})
    with pytest.raises(HookConfigError):
        hook_from_dict({"type": "command", "command": "   "})
    with pytest.raises(HookConfigError):
        hook_from_dict("not-a-mapping")
    with pytest.raises(HookConfigError):
        hook_from_dict({"type": "http", "url": "u", "headers": ["nope"]})


def test_hook_detail_reports_payload():
    assert hook_detail(hook_from_dict({"type": "command", "command": "ls"})) == "ls"
    assert (
        hook_detail(hook_from_dict({"type": "http", "url": "https://x.test"}))
        == "https://x.test"
    )


# ---------------------------------------------------------------------------
# (2) config loading + priority ordering
# ---------------------------------------------------------------------------


def test_load_sorts_by_priority_and_keeps_config_order_on_ties():
    raw = {
        "pre_tool_call": [
            {"type": "command", "command": "low", "priority": 1},
            {"type": "command", "command": "high", "priority": 10},
            {"type": "command", "command": "tie-a"},
            {"type": "command", "command": "tie-b"},
        ]
    }
    hooks = load_hook_definitions(raw)["pre_tool_call"]
    assert [h.command for h in hooks] == ["high", "low", "tie-a", "tie-b"]


def test_load_skips_malformed_hooks_and_reports_errors():
    raw = {
        "pre_tool_call": [
            {"type": "command", "command": "good"},
            {"type": "bogus"},
        ]
    }
    defs, errors = load_hook_definitions_with_errors(raw)
    assert [h.command for h in defs["pre_tool_call"]] == ["good"]
    assert len(errors) == 1 and "pre_tool_call[1]" in errors[0]


def test_load_ignores_non_mapping_and_non_list_entries():
    assert load_hook_definitions(None) == {}
    assert load_hook_definitions({"pre_tool_call": "nope"}) == {}
    # an event whose hooks are all malformed produces no entry at all
    assert load_hook_definitions({"pre_tool_call": [{"type": "bogus"}]}) == {}


def test_openharness_event_names_are_aliased():
    hooks = load_hook_definitions({
        "pre_tool_use": [{"type": "command", "command": "x"}]
    })
    normalized = _normalize_events(hooks)
    assert "pre_tool_call" in normalized
    assert EVENT_ALIASES["pre_tool_use"] == "pre_tool_call"


def test_unknown_event_names_are_dropped():
    hooks = load_hook_definitions({
        "on_full_moon": [{"type": "command", "command": "howl"}]
    })
    assert _normalize_events(hooks) == {}


def test_aliased_and_native_events_merge_by_priority():
    hooks = load_hook_definitions({
        "pre_tool_use": [{"type": "command", "command": "aliased", "priority": 1}],
        "pre_tool_call": [{"type": "command", "command": "native", "priority": 5}],
    })
    merged = _normalize_events(hooks)["pre_tool_call"]
    assert [h.command for h in merged] == ["native", "aliased"]


# ---------------------------------------------------------------------------
# (3) matcher
# ---------------------------------------------------------------------------


def test_matcher_absent_matches_everything():
    hook = hook_from_dict({"type": "command", "command": "x"})
    assert matches_hook(hook, {"tool_name": "anything"})


def test_matcher_uses_fnmatch_on_tool_name():
    hook = hook_from_dict({"type": "command", "command": "x", "matcher": "write_*"})
    assert matches_hook(hook, {"tool_name": "write_file"})
    assert not matches_hook(hook, {"tool_name": "read_file"})


def test_matcher_falls_back_to_prompt_then_event():
    hook = hook_from_dict({"type": "command", "command": "x", "matcher": "*deploy*"})
    assert matches_hook(hook, {"prompt": "please deploy now"})
    assert matches_hook(hook, {"event": "pre_deploy_thing"})
    assert not matches_hook(hook, {"event": "on_session_start"})


# ---------------------------------------------------------------------------
# (4) $ARGUMENTS injection + verdict parsing
# ---------------------------------------------------------------------------


def test_inject_arguments_substitutes_json_payload():
    out = inject_arguments("payload=$ARGUMENTS", {"tool_name": "terminal"})
    assert json.loads(out.split("payload=", 1)[1]) == {"tool_name": "terminal"}


def test_inject_arguments_shell_escapes_when_requested():
    import shlex

    out = inject_arguments(
        "echo $ARGUMENTS", {"cmd": "rm -rf /; echo pwned"}, shell_escape=True
    )
    # the payload must survive as exactly one shell word, metacharacters inert
    words = shlex.split(out)
    assert words[0] == "echo" and len(words) == 2
    assert json.loads(words[1]) == {"cmd": "rm -rf /; echo pwned"}


def test_inject_arguments_tolerates_unserializable_payload():
    out = inject_arguments("$ARGUMENTS", {"obj": object()})
    assert out and out != "$ARGUMENTS"


def test_parse_hook_json_accepts_strict_json():
    assert parse_hook_json('{"ok": true}') == {"ok": True}
    assert parse_hook_json('{"ok": false, "reason": "nope"}')["reason"] == "nope"


def test_parse_hook_json_accepts_bare_affirmatives():
    for text in ("ok", "TRUE", " yes "):
        assert parse_hook_json(text)["ok"] is True


def test_parse_hook_json_treats_garbage_as_rejection():
    parsed = parse_hook_json("I think this is fine, actually")
    assert parsed["ok"] is False
    assert "I think this is fine" in parsed["reason"]
    assert parse_hook_json("")["ok"] is False


# ---------------------------------------------------------------------------
# (5) command hooks
# ---------------------------------------------------------------------------


def test_command_hook_success_is_not_blocking(tmp_path):
    hook = hook_from_dict({"type": "command", "command": "echo fine"})
    result = run_hook(hook, "pre_tool_call", {}, cwd=str(tmp_path))
    assert result.success and not result.blocked
    assert "fine" in result.output


def test_command_hook_failure_blocks_only_when_configured(tmp_path):
    advisory = hook_from_dict({"type": "command", "command": "exit 3"})
    gate = hook_from_dict({
        "type": "command",
        "command": "exit 3",
        "block_on_failure": True,
    })
    assert run_hook(advisory, "pre_tool_call", {}, cwd=str(tmp_path)).blocked is False
    blocked = run_hook(gate, "pre_tool_call", {}, cwd=str(tmp_path))
    assert blocked.blocked is True
    assert blocked.metadata["returncode"] == 3


def test_command_hook_receives_event_and_payload_in_env(tmp_path):
    hook = hook_from_dict({
        "type": "command",
        "command": 'echo "$HERMES_HOOK_EVENT|$HERMES_HOOK_PAYLOAD"',
    })
    result = run_hook(
        hook, "pre_tool_call", {"tool_name": "terminal"}, cwd=str(tmp_path)
    )
    event, _, payload = result.output.partition("|")
    assert event == "pre_tool_call"
    assert json.loads(payload)["tool_name"] == "terminal"


@pytest.mark.live_system_guard_bypass  # the timeout path really kills its child
def test_command_hook_timeout_is_reported(tmp_path):
    hook = hook_from_dict({
        "type": "command",
        "command": "sleep 5",
        "timeout_seconds": 1,
        "block_on_failure": True,
    })
    result = run_hook(hook, "pre_tool_call", {}, cwd=str(tmp_path))
    assert result.blocked and "timed out" in result.reason


def test_command_hook_arguments_are_shell_safe(tmp_path):
    marker = tmp_path / "pwned"
    hook = hook_from_dict({
        "type": "command",
        "command": f"echo $ARGUMENTS > {tmp_path / 'out.txt'}",
    })
    run_hook(
        hook,
        "pre_tool_call",
        {"command": f"; touch {marker}"},
        cwd=str(tmp_path),
    )
    assert not marker.exists(), "injected payload must not execute as shell syntax"


# ---------------------------------------------------------------------------
# (6) prompt / agent hooks (host LLM)
# ---------------------------------------------------------------------------


def test_prompt_hook_passes_when_model_says_ok():
    hook = hook_from_dict({"type": "prompt", "prompt": "ok? $ARGUMENTS"})
    result = run_hook(hook, "pre_tool_call", {}, call_llm=_verdict_llm('{"ok": true}'))
    assert result.success and not result.blocked


def test_prompt_hook_blocks_with_model_reason():
    hook = hook_from_dict({"type": "prompt", "prompt": "ok?"})
    llm = _verdict_llm('{"ok": false, "reason": "deletes production data"}')
    result = run_hook(hook, "pre_tool_call", {}, call_llm=llm)
    assert result.blocked
    assert result.reason == "deletes production data"


def test_prompt_hook_injects_payload_into_the_model_prompt():
    hook = hook_from_dict({"type": "prompt", "prompt": "judge: $ARGUMENTS"})
    llm = _verdict_llm('{"ok": true}')
    run_hook(hook, "pre_tool_call", {"tool_name": "terminal"}, call_llm=llm)
    user_msg = llm.kwargs["messages"][-1]["content"]
    assert "terminal" in user_msg and "$ARGUMENTS" not in user_msg


def test_prompt_hook_model_override_is_forwarded():
    hook = hook_from_dict({"type": "prompt", "prompt": "p", "model": "some-model"})
    llm = _verdict_llm('{"ok": true}')
    run_hook(hook, "pre_tool_call", {}, call_llm=llm)
    assert llm.kwargs["model"] == "some-model"


def test_prompt_hook_without_model_override_lets_host_decide():
    hook = hook_from_dict({"type": "prompt", "prompt": "p"})
    llm = _verdict_llm('{"ok": true}')
    run_hook(hook, "pre_tool_call", {}, call_llm=llm)
    assert "model" not in llm.kwargs
    assert llm.kwargs["task"]  # routed through a host auxiliary task


def test_agent_hook_gets_a_more_thorough_system_prompt():
    agent = hook_from_dict({"type": "agent", "prompt": "p"})
    plain = hook_from_dict({"type": "prompt", "prompt": "p"})
    agent_llm, plain_llm = _verdict_llm('{"ok": true}'), _verdict_llm('{"ok": true}')
    run_hook(agent, "pre_tool_call", {}, call_llm=agent_llm)
    run_hook(plain, "pre_tool_call", {}, call_llm=plain_llm)
    agent_system = agent_llm.kwargs["messages"][0]["content"]
    plain_system = plain_llm.kwargs["messages"][0]["content"]
    assert len(agent_system) > len(plain_system)
    assert "thorough" in agent_system


def test_prompt_hook_llm_failure_blocks_when_gating():
    hook = hook_from_dict({"type": "prompt", "prompt": "p"})

    def boom(**_kwargs):
        raise RuntimeError("provider down")

    result = run_hook(hook, "pre_tool_call", {}, call_llm=boom)
    assert result.blocked and "provider down" in result.reason


def test_prompt_hook_llm_failure_is_advisory_when_not_gating():
    hook = hook_from_dict({"type": "prompt", "prompt": "p", "block_on_failure": False})

    def boom(**_kwargs):
        raise RuntimeError("provider down")

    assert run_hook(hook, "pre_tool_call", {}, call_llm=boom).blocked is False


def test_prompt_hook_handles_content_block_responses():
    hook = hook_from_dict({"type": "prompt", "prompt": "p"})

    def call(**_kwargs):
        msg = types.SimpleNamespace(content=[{"type": "text", "text": '{"ok": true}'}])
        return types.SimpleNamespace(choices=[types.SimpleNamespace(message=msg)])

    assert run_hook(hook, "pre_tool_call", {}, call_llm=call).success


def test_prompt_hook_handles_malformed_response_object():
    hook = hook_from_dict({"type": "prompt", "prompt": "p"})
    result = run_hook(hook, "pre_tool_call", {}, call_llm=lambda **_k: object())
    assert result.blocked  # unparseable verdict == rejection for a gating hook


# ---------------------------------------------------------------------------
# (7) http hooks
# ---------------------------------------------------------------------------


def test_http_hook_posts_event_and_payload(monkeypatch):
    seen = {}

    class _Response:
        is_success = True
        status_code = 200
        text = '{"ok": true}'

    class _Client:
        def __init__(self, timeout=None):
            seen["timeout"] = timeout

        def __enter__(self):
            return self

        def __exit__(self, *_exc):
            return False

        def post(self, url, json=None, headers=None):
            seen.update(url=url, json=json, headers=headers)
            return _Response()

    monkeypatch.setitem(sys.modules, "httpx", types.SimpleNamespace(Client=_Client))
    hook = hook_from_dict({
        "type": "http",
        "url": "https://audit.test/hook",
        "headers": {"X-Token": "t"},
        "timeout_seconds": 7,
    })
    result = run_hook(hook, "pre_tool_call", {"tool_name": "terminal"}, cwd="")
    assert result.success and not result.blocked
    assert seen["url"] == "https://audit.test/hook"
    assert seen["json"] == {
        "event": "pre_tool_call",
        "payload": {"tool_name": "terminal"},
    }
    assert seen["headers"] == {"X-Token": "t"}
    assert seen["timeout"] == 7


def test_http_hook_transport_error_respects_block_on_failure(monkeypatch):
    class _Client:
        def __init__(self, timeout=None):
            raise OSError("connection refused")

    monkeypatch.setitem(sys.modules, "httpx", types.SimpleNamespace(Client=_Client))
    advisory = hook_from_dict({"type": "http", "url": "https://x.test"})
    gate = hook_from_dict({
        "type": "http",
        "url": "https://x.test",
        "block_on_failure": True,
    })
    assert run_hook(advisory, "pre_tool_call", {}).blocked is False
    blocked = run_hook(gate, "pre_tool_call", {})
    assert blocked.blocked and "connection refused" in blocked.reason


# ---------------------------------------------------------------------------
# (8) aggregation
# ---------------------------------------------------------------------------


def test_execute_runs_matching_hooks_only(tmp_path):
    hooks = load_hook_definitions({
        "pre_tool_call": [
            {"type": "command", "command": "echo a", "matcher": "terminal"},
            {"type": "command", "command": "echo b", "matcher": "write_file"},
        ]
    })["pre_tool_call"]
    aggregated = execute_hooks(
        hooks, "pre_tool_call", {"tool_name": "terminal"}, cwd=str(tmp_path)
    )
    assert len(aggregated.results) == 1
    assert "a" in aggregated.results[0].output


def test_execute_stops_at_the_first_block(tmp_path):
    marker = tmp_path / "second-ran"
    hooks = load_hook_definitions({
        "pre_tool_call": [
            {
                "type": "command",
                "command": "exit 1",
                "block_on_failure": True,
                "priority": 10,
            },
            {"type": "command", "command": f"touch {marker}"},
        ]
    })["pre_tool_call"]
    aggregated = execute_hooks(hooks, "pre_tool_call", {}, cwd=str(tmp_path))
    assert aggregated.blocked
    assert len(aggregated.results) == 1
    assert not marker.exists()


def test_aggregated_reason_falls_back_to_output():
    aggregated = AggregatedHookResult(
        results=[
            HookResult(
                hook_type="command", success=False, blocked=True, output="stderr text"
            )
        ]
    )
    assert aggregated.reason == "stderr text"


def test_aggregated_empty_is_not_blocked():
    assert AggregatedHookResult().blocked is False
    assert AggregatedHookResult().reason == ""


# ---------------------------------------------------------------------------
# (9) Hermes hook-callback mapping
# ---------------------------------------------------------------------------


def test_pre_tool_call_block_maps_to_the_block_directive():
    hooks = load_hook_definitions({
        "pre_tool_call": [{"type": "prompt", "prompt": "p"}]
    })["pre_tool_call"]
    callback = make_hook_callback(
        BLOCKING_EVENT, hooks, call_llm=_verdict_llm('{"ok": false, "reason": "nope"}')
    )
    assert callback(tool_name="terminal", args={}) == {
        "action": "block",
        "message": "nope",
    }


def test_pre_tool_call_pass_returns_no_directive():
    hooks = load_hook_definitions({
        "pre_tool_call": [{"type": "prompt", "prompt": "p"}]
    })["pre_tool_call"]
    callback = make_hook_callback(
        BLOCKING_EVENT, hooks, call_llm=_verdict_llm('{"ok": true}')
    )
    assert callback(tool_name="terminal", args={}) is None


def test_non_blocking_events_never_return_a_directive():
    hooks = load_hook_definitions({
        "on_session_end": [{"type": "prompt", "prompt": "p"}]
    })["on_session_end"]
    callback = make_hook_callback(
        "on_session_end", hooks, call_llm=_verdict_llm('{"ok": false, "reason": "x"}')
    )
    assert callback(session_id="s") is None


def test_callback_passes_hook_kwargs_through_as_the_payload():
    hooks = load_hook_definitions({
        "pre_tool_call": [{"type": "prompt", "prompt": "$ARGUMENTS"}]
    })["pre_tool_call"]
    llm = _verdict_llm('{"ok": true}')
    callback = make_hook_callback(BLOCKING_EVENT, hooks, call_llm=llm)
    callback(tool_name="terminal", args={"command": "ls"}, schema_version=1)
    payload = json.loads(llm.kwargs["messages"][-1]["content"])
    assert payload["tool_name"] == "terminal"
    assert payload["args"] == {"command": "ls"}
    assert payload["event"] == "pre_tool_call"
    assert "schema_version" not in payload


def test_callback_swallows_executor_errors(monkeypatch):
    hooks = load_hook_definitions({
        "pre_tool_call": [{"type": "command", "command": "x"}]
    })["pre_tool_call"]
    monkeypatch.setattr(
        "plugins.declarative_hooks.execute_hooks",
        lambda *a, **k: (_ for _ in ()).throw(RuntimeError("boom")),
    )
    assert make_hook_callback(BLOCKING_EVENT, hooks)(tool_name="t") is None


# ---------------------------------------------------------------------------
# (10) registration — opt-in, zero impact when unconfigured
# ---------------------------------------------------------------------------


def _register_with_config(monkeypatch, raw):
    monkeypatch.setattr("plugins.declarative_hooks._load_raw_config", lambda: raw)
    ctx = _Ctx()
    register(ctx)
    return ctx


def test_register_is_a_noop_without_config(monkeypatch):
    assert _register_with_config(monkeypatch, {}).hooks == []
    assert _register_with_config(monkeypatch, None).hooks == []


def test_register_wires_one_callback_per_event(monkeypatch):
    ctx = _register_with_config(
        monkeypatch,
        {
            "pre_tool_call": [{"type": "command", "command": "a"}],
            "on_session_end": [{"type": "command", "command": "b"}],
        },
    )
    assert sorted(name for name, _cb in ctx.hooks) == [
        "on_session_end",
        "pre_tool_call",
    ]


def test_register_skips_malformed_hooks_but_keeps_the_rest(monkeypatch):
    ctx = _register_with_config(
        monkeypatch,
        {"pre_tool_call": [{"type": "bogus"}, {"type": "command", "command": "ok"}]},
    )
    assert [name for name, _cb in ctx.hooks] == ["pre_tool_call"]


def test_register_is_disabled_by_env(monkeypatch):
    monkeypatch.setenv("HERMES_DECLARATIVE_HOOKS", "0")
    ctx = _register_with_config(
        monkeypatch, {"pre_tool_call": [{"type": "command", "command": "a"}]}
    )
    assert ctx.hooks == []


def test_registered_callback_enforces_the_policy_end_to_end(monkeypatch, tmp_path):
    ctx = _register_with_config(
        monkeypatch,
        {
            "pre_tool_use": [  # OpenHarness event name
                {
                    "type": "command",
                    "command": "exit 1",
                    "matcher": "terminal",
                    "block_on_failure": True,
                }
            ]
        },
    )
    (event, callback) = ctx.hooks[0]
    assert event == "pre_tool_call"
    assert callback(tool_name="read_file", args={}) is None  # matcher misses
    directive = callback(tool_name="terminal", args={"command": "ls"})
    assert directive["action"] == "block"
