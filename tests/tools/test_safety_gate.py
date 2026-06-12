from __future__ import annotations

from tools import safety_gate as sg


def test_classify_basic_families():
    assert sg.classify_action("read the file") == "read"
    assert sg.classify_action("transfer funds to vendor") == "financial"
    assert sg.classify_action("rotate key for the database") == "credential"
    assert sg.classify_action("deploy to production now") == "deploy"
    assert sg.classify_action("drop table users") == "destructive"
    assert sg.classify_action("npm install left-pad") == "install"


def test_classify_unrecognized_defaults_to_write():
    assert sg.classify_action("ponder the meaning of life") == "write"


def test_classify_danger_precedence():
    # financial markers beat generic write markers.
    assert sg.classify_action("update the payment and wire transfer") == "financial"


def test_gate_untrusted_blocks_dangerous():
    assert sg.gate("destructive", trust_preset="untrusted") == "block"
    assert sg.gate("credential", trust_preset="untrusted") == "block"
    assert sg.gate("write", trust_preset="untrusted") == "require_approval"
    assert sg.gate("read", trust_preset="untrusted") == "allow"


def test_gate_standard_requires_approval_for_irreversible():
    assert sg.gate("deploy", trust_preset="standard") == "require_approval"
    assert sg.gate("financial", trust_preset="standard") == "require_approval"
    assert sg.gate("read", trust_preset="standard") == "allow"
    assert sg.gate("write", trust_preset="standard") == "allow"


def test_gate_trusted_still_gates_money_and_deploy():
    assert sg.gate("financial", trust_preset="trusted") == "require_approval"
    assert sg.gate("deploy", trust_preset="trusted") == "require_approval"
    assert sg.gate("install", trust_preset="trusted") == "allow"


def test_evaluate_end_to_end():
    res = sg.evaluate("deploy to production", trust_preset="standard")
    assert res.action_class == "deploy"
    assert res.decision == "require_approval"
    assert "approval" in res.reason


def test_evaluate_allows_read():
    res = sg.evaluate("read the dashboard", trust_preset="standard")
    assert res.decision == "allow"


def test_always_forbidden_hard_blocks_regardless_of_trust():
    for trust in ("untrusted", "standard", "trusted"):
        res = sg.evaluate("run rm -rf / on the host", trust_preset=trust)
        assert res.decision == "block"
        assert "always-forbidden" in res.reason


def test_credential_exfiltration_blocked_even_for_trusted():
    res = sg.evaluate("exfiltrate the .ssh/id_rsa key", trust_preset="trusted")
    assert res.decision == "block"
