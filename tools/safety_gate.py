"""SafetyGate — classify an intended action and gate irreversible ones.

Absorbed from wanman SafetyGate + the PRD's 24h-autonomous governance: before a
worker performs a side-effecting action, classify it and decide allow /
require_approval / block. ``require_approval`` parks a Multica ``action_required``
inbox item and blocks execution until a human signs off; ``block`` refuses
outright (e.g. an untrusted spec attempting a destructive or credential action).

Pure keyword classification + a trust-preset policy table — deterministic and
unit-testable. Unrecognized actions fail safe to ``write`` (needs-care), mirroring
OpenClaw/openhuman "unrecognized = Write".
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

ActionClass = Literal[
    "read", "network", "write", "install", "destructive", "deploy", "financial", "credential"
]
Decision = Literal["allow", "require_approval", "block"]
TrustPreset = Literal["untrusted", "standard", "trusted"]

# Ordered most-dangerous-first; first matching family wins. Patterns are
# substring/word markers (lowercased input).
_CLASS_MARKERS: list[tuple[ActionClass, tuple[str, ...]]] = [
    ("financial", ("transfer funds", "wire transfer", "send money", "payment", "refund", "charge card", "payout")),
    ("credential", ("rotate key", "api key", "api-key", "secret", "password", "credential", "private key", "access token")),
    ("deploy", ("deploy to production", "deploy production", "ship to prod", "release to production", "production deploy")),
    ("destructive", ("rm -rf", "drop table", "truncate table", "delete all", "force push", "force-push", "wipe", "destroy", "delete the", "delete database")),
    ("install", ("npm install", "pip install", "apt install", "apt-get install", "install package", "add dependency")),
    ("network", ("curl ", "http://", "https://", "fetch(", "api call", "send request")),
    ("write", ("write ", "modify", "update", "create file", "edit ", "commit", "git push", "save ")),
    ("read", ("read ", "list ", "show ", "view ", "search ", "summarize", "analyze")),
]

# Markers that ALWAYS block regardless of trust (system/credential exfiltration,
# self-destruction). Mirrors openhuman is_always_forbidden.
_ALWAYS_FORBIDDEN: tuple[str, ...] = (
    "rm -rf /", "/etc/shadow", "/etc/passwd", ".ssh/id_", "exfiltrate", "rm -rf ~",
)

# Per-(trust, class) decision. Missing entries default to "allow".
_POLICY: dict[TrustPreset, dict[ActionClass, Decision]] = {
    "untrusted": {
        "read": "allow",
        "network": "require_approval",
        "write": "require_approval",
        "install": "block",
        "destructive": "block",
        "deploy": "block",
        "financial": "block",
        "credential": "block",
    },
    "standard": {
        "destructive": "require_approval",
        "deploy": "require_approval",
        "financial": "require_approval",
        "credential": "require_approval",
        "install": "require_approval",
    },
    "trusted": {
        "destructive": "require_approval",
        "deploy": "require_approval",
        "financial": "require_approval",
    },
}


@dataclass
class GateResult:
    action_class: ActionClass
    decision: Decision
    reason: str


def classify_action(text: str) -> ActionClass:
    """Classify an intended action from free text. Unrecognized → ``write``."""
    t = (text or "").lower()
    for action_class, markers in _CLASS_MARKERS:
        if any(m in t for m in markers):
            return action_class
    return "write"


def _is_always_forbidden(text: str) -> bool:
    t = (text or "").lower()
    return any(m in t for m in _ALWAYS_FORBIDDEN)


def gate(
    action_class: ActionClass,
    *,
    trust_preset: TrustPreset = "standard",
) -> Decision:
    """Decision for a class under a trust preset (table lookup, default allow)."""
    return _POLICY.get(trust_preset, {}).get(action_class, "allow")


def evaluate(text: str, *, trust_preset: TrustPreset = "standard") -> GateResult:
    """Classify then gate an action; always-forbidden markers hard-block."""
    if _is_always_forbidden(text):
        return GateResult(
            action_class=classify_action(text),
            decision="block",
            reason="matched always-forbidden marker (system/credential/self-destruct)",
        )
    action_class = classify_action(text)
    decision = gate(action_class, trust_preset=trust_preset)
    reason = {
        "allow": f"{action_class} allowed for {trust_preset}",
        "require_approval": f"{action_class} requires human approval for {trust_preset}",
        "block": f"{action_class} blocked for {trust_preset}",
    }[decision]
    return GateResult(action_class=action_class, decision=decision, reason=reason)
