"""Tests for the tool-permissions plugin (ported OpenHarness PermissionChecker)."""

from __future__ import annotations

from plugins.tool_permissions import _make_hook
from plugins.tool_permissions.checker import (
    PathRule,
    PermissionChecker,
    PermissionMode,
    PermissionSettings,
)
from plugins.tool_permissions.normalize import (
    extract_command,
    is_read_only,
    resolve_file_path,
)


def _checker(**kw) -> PermissionChecker:
    return PermissionChecker(PermissionSettings(**kw))


# ---------------------------------------------------------------------------
# (1) sensitive-path credential firewall — un-overridable
# ---------------------------------------------------------------------------


def test_ssh_key_denied_even_in_full_auto():
    c = _checker(mode=PermissionMode.FULL_AUTO)
    d = c.evaluate("read_file", is_read_only=True, file_path="/home/u/.ssh/id_rsa")
    assert not d.allowed
    assert "sensitive credential path" in d.reason


def test_aws_credentials_denied():
    c = _checker(mode=PermissionMode.FULL_AUTO)
    assert not c.evaluate(
        "read_file", is_read_only=True, file_path="/home/u/.aws/credentials"
    ).allowed


def test_grep_root_of_ssh_dir_denied_via_trailing_slash():
    # Directory-scoped tool operating on the .ssh root itself.
    c = _checker(mode=PermissionMode.FULL_AUTO)
    assert not c.evaluate("grep", is_read_only=True, file_path="/home/u/.ssh").allowed


def test_normal_path_allowed_in_full_auto():
    c = _checker(mode=PermissionMode.FULL_AUTO)
    assert c.evaluate(
        "write_file", is_read_only=False, file_path="/home/u/project/x.py"
    ).allowed


# ---------------------------------------------------------------------------
# (2)-(5) deny/allow/command precedence
# ---------------------------------------------------------------------------


def test_explicit_tool_deny():
    c = _checker(mode=PermissionMode.FULL_AUTO, denied_tools=frozenset({"terminal"}))
    assert not c.evaluate("terminal", is_read_only=False, command="ls").allowed


def test_explicit_tool_allow_beats_default_mode():
    c = _checker(mode=PermissionMode.DEFAULT, allowed_tools=frozenset({"write_file"}))
    assert c.evaluate("write_file", is_read_only=False).allowed


def test_path_deny_rule():
    c = _checker(
        mode=PermissionMode.FULL_AUTO, path_rules=(PathRule("*/secret/*", allow=False),)
    )
    assert not c.evaluate(
        "write_file", is_read_only=False, file_path="/home/u/secret/x"
    ).allowed


def test_denied_command_pattern():
    c = _checker(mode=PermissionMode.FULL_AUTO, denied_commands=("rm -rf /*",))
    assert not c.evaluate("terminal", is_read_only=False, command="rm -rf /").allowed


# ---------------------------------------------------------------------------
# (6) mode logic
# ---------------------------------------------------------------------------


def test_default_mode_confirms_mutating():
    c = _checker(mode=PermissionMode.DEFAULT)
    d = c.evaluate("write_file", is_read_only=False)
    assert not d.allowed and d.requires_confirmation


def test_default_mode_allows_read_only():
    c = _checker(mode=PermissionMode.DEFAULT)
    assert c.evaluate("read_file", is_read_only=True).allowed


def test_plan_mode_blocks_mutating():
    c = _checker(mode=PermissionMode.PLAN)
    d = c.evaluate("write_file", is_read_only=False)
    assert not d.allowed and not d.requires_confirmation


def test_plan_mode_allows_read_only():
    c = _checker(mode=PermissionMode.PLAN)
    assert c.evaluate("grep", is_read_only=True).allowed


def test_bash_install_hint_added():
    c = _checker(mode=PermissionMode.DEFAULT)
    d = c.evaluate("terminal", is_read_only=False, command="pip install requests")
    assert "installation" in d.reason.lower()


# ---------------------------------------------------------------------------
# normalize
# ---------------------------------------------------------------------------


def test_resolve_file_path_absolutizes(tmp_path):
    p = resolve_file_path({"file_path": "sub/x.py"}, cwd=str(tmp_path))
    assert p == str(tmp_path / "sub" / "x.py")


def test_resolve_file_path_keys():
    assert resolve_file_path({"path": "/abs/p"}) == "/abs/p"
    assert resolve_file_path({"root": "/abs/r"}) == "/abs/r"
    assert resolve_file_path({"query": "no path"}) is None


def test_extract_command():
    assert extract_command({"command": "ls -la"}) == "ls -la"
    assert extract_command({"query": "x"}) is None


def test_is_read_only_heuristics():
    assert is_read_only("read_file")
    assert is_read_only("search_duckduckgo")
    assert is_read_only("google_scholar_search")
    assert not is_read_only("write_file")
    assert not is_read_only("terminal")


# ---------------------------------------------------------------------------
# hook directive mapping
# ---------------------------------------------------------------------------


def test_hook_blocks_sensitive_path():
    s = PermissionSettings(mode=PermissionMode.FULL_AUTO)
    hook = _make_hook(PermissionChecker(s), s)
    out = hook(tool_name="read_file", args={"file_path": "/home/u/.ssh/id_rsa"})
    assert out["action"] == "block"


def test_hook_approve_on_confirmation():
    s = PermissionSettings(mode=PermissionMode.DEFAULT)
    hook = _make_hook(PermissionChecker(s), s)
    out = hook(tool_name="write_file", args={"file_path": "/tmp/x"})
    assert out["action"] == "approve"


def test_hook_returns_none_when_allowed():
    s = PermissionSettings(mode=PermissionMode.FULL_AUTO)
    hook = _make_hook(PermissionChecker(s), s)
    assert hook(tool_name="write_file", args={"file_path": "/tmp/x"}) is None
