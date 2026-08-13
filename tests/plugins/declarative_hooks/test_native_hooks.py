"""D2: reading Claude Code / Codex native hooks.json files."""

from __future__ import annotations

import json

import pytest

from plugins.declarative_hooks.native import (
    ALLOW,
    ASK,
    CLAUDE_CODE,
    CODEX,
    DENY,
    NONE,
    HookDecision,
    NativeHookConfigError,
    compile_matcher,
    decode_hook_output,
    load_native_hooks,
    merge_decisions,
    run_native_hooks,
    to_directive,
)


# ---------------------------------------------------------------------------
# Matcher: the two dialects genuinely differ
# ---------------------------------------------------------------------------


def test_claude_code_treats_a_word_pattern_as_literal_alternatives():
    """ "Write|Edit" means those two tools — not the regex, which would also
    match "Rewrite"."""
    match = compile_matcher("Write|Edit", dialect=CLAUDE_CODE)
    assert match("Write")
    assert match("Edit")
    assert not match("Rewrite")
    assert not match("Writer")


def test_codex_compiles_the_same_pattern_as_a_regex():
    match = compile_matcher("Write|Edit", dialect=CODEX)
    assert match("Write")
    # The difference: an unanchored regex search also hits a longer tool name
    # that merely contains an alternative. Claude Code's literal reading does not.
    assert match("WriteFile")
    assert not compile_matcher("Write|Edit", dialect=CLAUDE_CODE)("WriteFile")


def test_claude_code_falls_back_to_regex_for_non_word_patterns():
    match = compile_matcher("^mcp__.*", dialect=CLAUDE_CODE)
    assert match("mcp__github__list")
    assert not match("terminal")


@pytest.mark.parametrize("pattern", [None, "", "*"])
@pytest.mark.parametrize("dialect", [CLAUDE_CODE, CODEX])
def test_missing_empty_and_star_match_everything(pattern, dialect):
    match = compile_matcher(pattern, dialect=dialect)
    assert match("anything")
    assert match("")


def test_matching_is_unanchored():
    assert compile_matcher("tool", dialect=CODEX)("my_tool_name")


def test_an_invalid_regex_raises_at_parse_time_not_match_time():
    """A hooks file you cannot match against is broken, and the operator should
    hear about it when it loads."""
    with pytest.raises(NativeHookConfigError):
        compile_matcher("(unclosed", dialect=CODEX)


def test_an_invalid_regex_in_a_file_raises_while_loading_it():
    doc = {"PreToolUse": [{"matcher": "[bad", "hooks": [{"command": "x"}]}]}
    with pytest.raises(NativeHookConfigError):
        load_native_hooks(doc, dialect=CLAUDE_CODE)


# ---------------------------------------------------------------------------
# Codec: exit codes
# ---------------------------------------------------------------------------


def test_exit_two_blocks_and_stderr_becomes_the_reason():
    decision = decode_hook_output(2, stdout="", stderr="touching prod is not allowed")
    assert decision.permission == DENY
    assert decision.reason == "touching prod is not allowed"


def test_exit_two_without_stderr_still_blocks_with_a_default_reason():
    assert decode_hook_output(2).permission == DENY
    assert decode_hook_output(2).reason


def test_a_failing_hook_does_not_become_a_block():
    """A broken hook has told us nothing; inventing a verdict for it is worse
    than proceeding without one."""
    decision = decode_hook_output(127, stderr="command not found")
    assert decision.permission == NONE
    assert any("127" in note for note in decision.audit)


def test_a_clean_exit_with_plain_text_is_not_an_error():
    decision = decode_hook_output(0, stdout="audited ok\n")
    assert decision.permission == NONE
    assert decision.audit == ()


def test_malformed_json_on_a_clean_exit_is_ignored_not_failed():
    decision = decode_hook_output(0, stdout='{"decision": ')
    assert decision.permission == NONE
    assert any("not valid JSON" in note for note in decision.audit)


def test_json_that_is_not_an_object_is_ignored():
    decision = decode_hook_output(0, stdout='{"a": 1}'.replace('{"a": 1}', "{}"))
    assert decision.permission == NONE


# ---------------------------------------------------------------------------
# Codec: the two decision channels
# ---------------------------------------------------------------------------


def test_legacy_decision_block():
    decision = decode_hook_output(
        0, stdout=json.dumps({"decision": "block", "reason": "nope"})
    )
    assert decision.permission == DENY
    assert decision.reason == "nope"


def test_legacy_decision_approve():
    decision = decode_hook_output(0, stdout=json.dumps({"decision": "approve"}))
    assert decision.permission == ALLOW


def test_legacy_channel_only_honours_its_two_words():
    decision = decode_hook_output(0, stdout=json.dumps({"decision": "deny"}))
    assert decision.permission == NONE  # "deny" is not a legacy-channel word
    assert any("unrecognised decision" in note for note in decision.audit)


@pytest.mark.parametrize(
    "value,expected", [("allow", ALLOW), ("deny", DENY), ("ask", ASK)]
)
def test_hook_specific_output_permission_decisions(value, expected):
    payload = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": value,
            "permissionDecisionReason": "because",
        }
    }
    decision = decode_hook_output(0, stdout=json.dumps(payload), event="PreToolUse")
    assert decision.permission == expected
    assert decision.reason == "because"


def test_hook_specific_output_only_honours_its_three_words():
    payload = {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "block",
        }
    }
    decision = decode_hook_output(0, stdout=json.dumps(payload), event="PreToolUse")
    assert decision.permission == NONE
    assert any("unrecognised permissionDecision" in n for n in decision.audit)


def test_a_mismatched_event_discriminator_drops_the_decision():
    payload = {
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": "wrong event",
        }
    }
    decision = decode_hook_output(0, stdout=json.dumps(payload), event="PreToolUse")
    assert decision.permission == NONE
    assert decision.reason == ""


def test_a_mismatched_event_discriminator_is_kept_for_audit():
    """The one fact the operator needs to understand why nothing happened."""
    payload = {
        "hookSpecificOutput": {
            "hookEventName": "PostToolUse",
            "permissionDecision": "deny",
        }
    }
    decision = decode_hook_output(0, stdout=json.dumps(payload), event="PreToolUse")
    joined = " ".join(decision.audit)
    assert "PostToolUse" in joined and "PreToolUse" in joined


def test_a_missing_discriminator_is_accepted():
    payload = {"hookSpecificOutput": {"permissionDecision": "deny"}}
    decision = decode_hook_output(0, stdout=json.dumps(payload), event="PreToolUse")
    assert decision.permission == DENY


def test_the_stronger_of_the_two_channels_wins_within_one_hook():
    payload = {
        "decision": "approve",
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": "the specific channel said no",
        },
    }
    decision = decode_hook_output(0, stdout=json.dumps(payload), event="PreToolUse")
    assert decision.permission == DENY
    assert decision.reason == "the specific channel said no"


def test_continue_false_and_stop_reason_are_captured():
    payload = {"continue": False, "stopReason": "budget exhausted"}
    decision = decode_hook_output(0, stdout=json.dumps(payload))
    assert decision.continue_ is False
    assert decision.stop_reason == "budget exhausted"


def test_a_non_boolean_continue_is_ignored():
    decision = decode_hook_output(0, stdout=json.dumps({"continue": "no"}))
    assert decision.continue_ is None


# ---------------------------------------------------------------------------
# Merge
# ---------------------------------------------------------------------------


def test_deny_beats_ask_beats_allow_beats_none():
    merged = merge_decisions([
        HookDecision(permission=NONE),
        HookDecision(permission=ALLOW),
        HookDecision(permission=ASK),
        HookDecision(permission=DENY),
    ])
    assert merged.permission == DENY


def test_ask_beats_allow():
    merged = merge_decisions([
        HookDecision(permission=ALLOW),
        HookDecision(permission=ASK),
    ])
    assert merged.permission == ASK


def test_only_the_winning_levels_reasons_are_shown():
    """Showing an allow's reasoning beside the deny that stopped you reads as
    though the allow were part of the explanation."""
    merged = merge_decisions([
        HookDecision(permission=ALLOW, reason="looks fine to me"),
        HookDecision(permission=DENY, reason="production path"),
    ])
    assert merged.reason == "production path"
    assert "looks fine" not in merged.reason


def test_several_reasons_at_the_winning_level_are_joined():
    merged = merge_decisions([
        HookDecision(permission=DENY, reason="first"),
        HookDecision(permission=DENY, reason="second"),
    ])
    assert merged.reason == "first; second"


def test_duplicate_reasons_are_not_repeated():
    merged = merge_decisions([
        HookDecision(permission=DENY, reason="same"),
        HookDecision(permission=DENY, reason="same"),
    ])
    assert merged.reason == "same"


def test_continue_false_is_first_wins():
    """The first hook to halt the turn owns the account of why."""
    merged = merge_decisions([
        HookDecision(continue_=False, stop_reason="first reason"),
        HookDecision(continue_=False, stop_reason="second reason"),
    ])
    assert merged.continue_ is False
    assert merged.stop_reason == "first reason"


def test_merging_nothing_is_a_no_decision():
    assert merge_decisions([]).permission == NONE


def test_audit_notes_from_every_hook_survive_the_merge():
    merged = merge_decisions([
        HookDecision(audit=("a",)),
        HookDecision(permission=DENY, audit=("b",)),
    ])
    assert set(merged.audit) == {"a", "b"}


# ---------------------------------------------------------------------------
# Mapping onto Hermes' directive contract
# ---------------------------------------------------------------------------


def test_deny_becomes_a_block_directive():
    directive = to_directive(HookDecision(permission=DENY, reason="no"))
    assert directive == {"action": "block", "message": "no"}


def test_ask_escalates_to_the_human_approval_gate():
    directive = to_directive(HookDecision(permission=ASK, reason="confirm?"))
    assert directive["action"] == "approve"
    assert directive["message"] == "confirm?"


@pytest.mark.parametrize("permission", [ALLOW, NONE])
def test_allow_and_none_produce_no_directive(permission):
    """Hermes has no way for a hook to waive a downstream gate, so allow can
    only mean "no objection from me" — not "pre-authorised"."""
    assert to_directive(HookDecision(permission=permission)) is None


def test_a_directive_always_carries_a_message():
    assert to_directive(HookDecision(permission=DENY))["message"]
    assert to_directive(HookDecision(permission=ASK))["message"]


# ---------------------------------------------------------------------------
# Loading a real-shaped file
# ---------------------------------------------------------------------------


CLAUDE_SETTINGS = {
    "hooks": {
        "PreToolUse": [
            {
                "matcher": "Bash",
                "hooks": [{"type": "command", "command": "./guard.sh", "timeout": 10}],
            },
            {
                "matcher": "Write|Edit",
                "hooks": [{"type": "command", "command": "./fmt.sh"}],
            },
        ],
        "PostToolUse": [{"hooks": [{"type": "command", "command": "./log.sh"}]}],
    }
}


def test_a_settings_object_with_a_hooks_key_is_unwrapped():
    loaded = load_native_hooks(CLAUDE_SETTINGS, dialect=CLAUDE_CODE)
    assert set(loaded) == {"pre_tool_call", "post_tool_call"}
    assert len(loaded["pre_tool_call"]) == 2


def test_a_bare_hooks_map_also_loads():
    loaded = load_native_hooks(CLAUDE_SETTINGS["hooks"], dialect=CLAUDE_CODE)
    assert "pre_tool_call" in loaded


def test_event_names_are_mapped_to_hermes_hooks():
    loaded = load_native_hooks(
        {"pre_tool_use": [{"hooks": [{"command": "x"}]}]}, dialect=CODEX
    )
    assert "pre_tool_call" in loaded


def test_timeouts_are_read_and_clamped():
    loaded = load_native_hooks(CLAUDE_SETTINGS, dialect=CLAUDE_CODE)
    assert loaded["pre_tool_call"][0].timeout_seconds == 10
    absurd = load_native_hooks(
        {"PreToolUse": [{"hooks": [{"command": "x", "timeout": 99999}]}]},
        dialect=CLAUDE_CODE,
    )
    assert absurd["pre_tool_call"][0].timeout_seconds == 600


def test_a_bad_timeout_falls_back_to_the_default():
    loaded = load_native_hooks(
        {"PreToolUse": [{"hooks": [{"command": "x", "timeout": "soon"}]}]},
        dialect=CLAUDE_CODE,
    )
    assert loaded["pre_tool_call"][0].timeout_seconds == 60


def test_non_command_hook_types_are_skipped():
    loaded = load_native_hooks(
        {"PreToolUse": [{"hooks": [{"type": "prompt", "prompt": "hi"}]}]},
        dialect=CLAUDE_CODE,
    )
    assert loaded == {}


def test_entries_without_a_command_are_skipped():
    loaded = load_native_hooks(
        {"PreToolUse": [{"hooks": [{"type": "command", "command": "  "}]}]},
        dialect=CLAUDE_CODE,
    )
    assert loaded == {}


def test_unknown_events_are_skipped():
    assert (
        load_native_hooks(
            {"NotAnEvent": [{"hooks": [{"command": "x"}]}]}, dialect=CLAUDE_CODE
        )
        == {}
    )


def test_an_unknown_dialect_is_rejected():
    with pytest.raises(NativeHookConfigError):
        load_native_hooks({}, dialect="emacs")


def test_garbage_input_yields_no_hooks():
    assert load_native_hooks(None, dialect=CLAUDE_CODE) == {}
    assert load_native_hooks([], dialect=CLAUDE_CODE) == {}
    assert load_native_hooks({"PreToolUse": "nope"}, dialect=CLAUDE_CODE) == {}


def test_loaded_hooks_carry_a_working_matcher():
    loaded = load_native_hooks(CLAUDE_SETTINGS, dialect=CLAUDE_CODE)
    bash_hook, edit_hook = loaded["pre_tool_call"]
    assert bash_hook.matches("Bash")
    assert not bash_hook.matches("Write")
    assert edit_hook.matches("Edit")


# ---------------------------------------------------------------------------
# End to end
# ---------------------------------------------------------------------------


def _fake_runner(script):
    """Return a runner that answers per command with (exit, stdout, stderr)."""

    def _run(command, *, payload_json, cwd, event, timeout):
        _run.seen.append((command, payload_json, event))
        return script[command]

    _run.seen = []
    return _run


def test_end_to_end_a_deny_reaches_the_directive():
    loaded = load_native_hooks(CLAUDE_SETTINGS, dialect=CLAUDE_CODE)
    runner = _fake_runner({"./guard.sh": (2, "", "rm -rf is not allowed")})
    decision = run_native_hooks(
        loaded["pre_tool_call"],
        "pre_tool_call",
        {"tool_name": "Bash", "args": {"command": "rm -rf /"}},
        runner=runner,
    )
    assert to_directive(decision) == {
        "action": "block",
        "message": "rm -rf is not allowed",
    }


def test_end_to_end_only_matching_hooks_run():
    loaded = load_native_hooks(CLAUDE_SETTINGS, dialect=CLAUDE_CODE)
    runner = _fake_runner({"./fmt.sh": (0, "", "")})
    run_native_hooks(
        loaded["pre_tool_call"], "pre_tool_call", {"tool_name": "Write"}, runner=runner
    )
    assert [cmd for cmd, _p, _e in runner.seen] == ["./fmt.sh"]


def test_the_payload_reaches_the_hook_as_json():
    loaded = load_native_hooks(CLAUDE_SETTINGS, dialect=CLAUDE_CODE)
    runner = _fake_runner({"./guard.sh": (0, "", "")})
    run_native_hooks(
        loaded["pre_tool_call"],
        "pre_tool_call",
        {"tool_name": "Bash", "args": {"command": "ls"}},
        runner=runner,
    )
    _cmd, payload_json, event = runner.seen[0]
    assert json.loads(payload_json)["args"]["command"] == "ls"
    assert event == "PreToolUse"  # the hook sees its own dialect's event name


def test_no_matching_hooks_is_a_no_decision():
    loaded = load_native_hooks(CLAUDE_SETTINGS, dialect=CLAUDE_CODE)
    decision = run_native_hooks(
        loaded["pre_tool_call"], "pre_tool_call", {"tool_name": "WebSearch"}
    )
    assert decision.permission == NONE


def test_a_hook_that_cannot_run_does_not_block():
    loaded = load_native_hooks(CLAUDE_SETTINGS, dialect=CLAUDE_CODE)

    def _explode(*_a, **_kw):
        raise OSError("no such file")

    decision = run_native_hooks(
        loaded["pre_tool_call"], "pre_tool_call", {"tool_name": "Bash"}, runner=_explode
    )
    assert decision.permission == NONE
    assert decision.audit


def test_an_unserialisable_payload_does_not_stop_the_hooks_running():
    loaded = load_native_hooks(CLAUDE_SETTINGS, dialect=CLAUDE_CODE)
    runner = _fake_runner({"./guard.sh": (0, "", "")})

    class Weird:
        pass

    decision = run_native_hooks(
        loaded["pre_tool_call"],
        "pre_tool_call",
        {"tool_name": "Bash", "obj": Weird()},
        runner=runner,
    )
    assert decision.permission == NONE
    assert runner.seen


def test_several_hooks_merge_by_precedence():
    doc = {
        "PreToolUse": [
            {"hooks": [{"command": "a"}, {"command": "b"}, {"command": "c"}]}
        ]
    }
    loaded = load_native_hooks(doc, dialect=CLAUDE_CODE)
    runner = _fake_runner({
        "a": (0, json.dumps({"decision": "approve", "reason": "fine"}), ""),
        "b": (
            0,
            json.dumps({
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "ask",
                    "permissionDecisionReason": "please confirm",
                }
            }),
            "",
        ),
        "c": (0, "", ""),
    })
    decision = run_native_hooks(
        loaded["pre_tool_call"], "pre_tool_call", {"tool_name": "Bash"}, runner=runner
    )
    assert decision.permission == ASK
    assert decision.reason == "please confirm"
