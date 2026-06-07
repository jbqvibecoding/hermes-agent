"""Agent Factory — dynamic vertical-subagent generation (retrieve → generate
→ validate → register), the crux of the orchestration brain.

Principle: **retrieve first, generate second, validate always.**

This module owns the *real* control logic (contract rendering, candidate
retrieval, the four-gate default-FAIL validation, dedupe, and trust-driven
registration) while keeping the two heavy/environmental pieces injectable so
the whole flow is unit-testable without an LLM, an embedding index, or a child
agent runtime:

* ``generator`` — produces a draft :class:`SubagentSpec` from a
  :class:`GenerateRequest` (real impl calls ``delegate_task`` with a narrow
  meta-agent; tests inject a stub).
* ``smoke_runner`` — the cheap one-turn dry run in gate 3 (real impl builds a
  ``_build_child_agent`` with ``max_iterations=1``; tests inject a stub).
* ``matcher`` in :func:`retrieve_candidates` — similarity scorer (default is a
  capability-tag Jaccard; an embedding/HNSW backend swaps in later).

Registration follows paperclip-aligned trust presets: ``trusted`` → active,
``standard`` → shadow (earns promotion via A/B in Evolution), ``untrusted`` or
org-changing → human approval gate.
"""

from __future__ import annotations

import sqlite3
from dataclasses import dataclass, field
from typing import Callable, Optional

from hermes_cli import spec_registry as reg
from hermes_cli.subagent_spec import (
    DEFAULT_DISALLOWED_TOOLS,
    FourPartContract,
    SubagentSpec,
)

# Tools that an ``untrusted`` spec may never hold. The Router's risk tier and
# the spec's trust_preset together gate capability; this is the hard floor.
SENSITIVE_TOOLS: frozenset[str] = frozenset(
    {
        "terminal", "bash", "shell", "execute_code", "code_execution",
        "computer_use", "browser", "send_message", "deploy",
    }
)

# Default retrieval thresholds (see plan §4.1). A hit reuses an existing spec;
# a near-hit would adapt; below near → generate. Dedupe reuses TAU_HIT.
TAU_HIT = 0.82
TAU_NEAR = 0.55


# ---------------------------------------------------------------------------
# request / result shapes
# ---------------------------------------------------------------------------

@dataclass
class GenerateRequest:
    requirement: str
    domain: str = "general"
    capability_needs: list[str] = field(default_factory=list)
    available_toolsets: list[str] = field(default_factory=list)
    available_openclaw_tools: list[str] = field(default_factory=list)
    runtime_hint_preference: str = "either"
    cost_tier: str = "default"  # cheap|default
    tenant: Optional[str] = None


@dataclass
class ValidationResult:
    ok: bool
    gate: str  # which gate produced the verdict
    errors: list[str] = field(default_factory=list)


@dataclass
class SpecMatch:
    spec: SubagentSpec
    score: float


@dataclass
class RegisterResult:
    spec_id: str
    action: str  # "registered" | "deduped" | "pending_approval"
    status: str  # the spec's resulting lifecycle status


SmokeRunner = Callable[[SubagentSpec], "SmokeOutcome"]
Generator = Callable[[GenerateRequest], SubagentSpec]
Matcher = Callable[[GenerateRequest, SubagentSpec], float]


@dataclass
class SmokeOutcome:
    ok: bool
    reason: str = ""


# ---------------------------------------------------------------------------
# contract rendering
# ---------------------------------------------------------------------------

def render_contract(contract: Optional[FourPartContract], task_text: str) -> str:
    """Render the four-part contract + task into a worker-facing message.

    Used by both adapters: the OpenClaw worker receives this as the session
    message; the in-process child receives it as the delegate goal.
    """
    parts = [f"## Task\n{task_text.strip()}"]
    if contract:
        if contract.objective:
            parts.append(f"## Objective\n{contract.objective.strip()}")
        if contract.output_format:
            parts.append(f"## Output format\n{contract.output_format.strip()}")
        if contract.tools_guidance:
            parts.append(f"## Tools & sources\n{contract.tools_guidance.strip()}")
        if contract.scope_boundaries:
            parts.append(f"## Scope boundaries (do NOT)\n{contract.scope_boundaries.strip()}")
    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# retrieval (retrieve-first)
# ---------------------------------------------------------------------------

def _tag_jaccard(a: list[str], b: list[str]) -> float:
    sa, sb = {t.lower() for t in a}, {t.lower() for t in b}
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def _default_matcher(req: GenerateRequest, spec: SubagentSpec) -> float:
    """Capability-tag Jaccard. Embedding/HNSW backend swaps in here later."""
    return _tag_jaccard(req.capability_needs, spec.capability_tags)


def retrieve_candidates(
    conn: sqlite3.Connection,
    req: GenerateRequest,
    *,
    matcher: Matcher = _default_matcher,
    limit: int = 5,
) -> list[SpecMatch]:
    """Rank existing active specs for a requirement (retrieve-first gate).

    SQL pre-filters by domain + tenant (presets are global / tenant-NULL); the
    matcher reranks. Falls back to all active specs when the domain has none,
    so a cross-domain reuse is still found.
    """
    specs = reg.list_specs(conn, domain=req.domain, tenant=req.tenant, status="active")
    if not specs:
        specs = reg.list_specs(conn, tenant=req.tenant, status="active")
    scored = [SpecMatch(spec=s, score=matcher(req, s)) for s in specs]
    scored.sort(key=lambda m: m.score, reverse=True)
    return scored[:limit]


def decide_action(matches: list[SpecMatch]) -> str:
    """Map the top match score to ``hit`` / ``adapt`` / ``generate``."""
    top = matches[0].score if matches else 0.0
    if top >= TAU_HIT:
        return "hit"
    if top >= TAU_NEAR:
        return "adapt"
    return "generate"


# ---------------------------------------------------------------------------
# validation (default-FAIL, four gates)
# ---------------------------------------------------------------------------

def _trust_allows_tools(trust_preset: str, tools: list[str]) -> Optional[str]:
    """Return an error string if the trust preset forbids any held tool."""
    if trust_preset == "untrusted":
        bad = sorted(set(tools) & SENSITIVE_TOOLS)
        if bad:
            return f"untrusted spec may not hold sensitive tools: {bad}"
    return None


def validate_spec(
    spec: SubagentSpec,
    *,
    available_toolsets: list[str],
    available_openclaw_tools: list[str],
    smoke_runner: Optional[SmokeRunner] = None,
) -> ValidationResult:
    """Four-gate, default-FAIL validation. Stops at the first failing gate.

    Gate 4 (approval) is a *registration* decision, not a validation one, so it
    lives in :func:`register_spec`.
    """
    # Gate 1 — schema.
    schema_errs = spec.validation_errors()
    if schema_errs:
        return ValidationResult(ok=False, gate="schema", errors=schema_errs)

    # Gate 2 — capability / tool allowlist.
    allowed = set(available_toolsets) | set(available_openclaw_tools)
    unknown = sorted(set(spec.tools) - allowed)
    if unknown:
        return ValidationResult(
            ok=False, gate="allowlist",
            errors=[f"tools not in available set: {unknown}"],
        )
    if not DEFAULT_DISALLOWED_TOOLS.issubset(set(spec.disallowed_tools)):
        return ValidationResult(
            ok=False, gate="allowlist",
            errors=["disallowed_tools must include the default deny-list floor"],
        )
    trust_err = _trust_allows_tools(spec.trust_preset, spec.tools)
    if trust_err:
        return ValidationResult(ok=False, gate="allowlist", errors=[trust_err])

    # Gate 3 — cheap smoke turn (injected; skipped if no runner supplied).
    if smoke_runner is not None:
        outcome = smoke_runner(spec)
        if not outcome.ok:
            return ValidationResult(
                ok=False, gate="smoke", errors=[outcome.reason or "smoke turn failed"]
            )

    return ValidationResult(ok=True, gate="ok")


# ---------------------------------------------------------------------------
# registration (dedupe + trust gate + versioning)
# ---------------------------------------------------------------------------

def _status_for_trust(trust_preset: str) -> str:
    if trust_preset == "trusted":
        return "active"
    if trust_preset == "standard":
        return "shadow"
    return "draft"  # untrusted → awaits approval


def register_spec(
    conn: sqlite3.Connection,
    spec: SubagentSpec,
    *,
    dedupe_matches: Optional[list[SpecMatch]] = None,
    on_approval_required: Optional[Callable[[SubagentSpec], None]] = None,
) -> RegisterResult:
    """Register a validated spec: dedupe → trust gate → version + persist.

    ``dedupe_matches`` (from :func:`retrieve_candidates`) short-circuits to an
    existing spec when the top match is at/above ``TAU_HIT`` — the same matcher
    that gated generation, so generation and dedupe can never diverge.
    """
    if dedupe_matches and dedupe_matches[0].score >= TAU_HIT:
        existing = dedupe_matches[0].spec
        return RegisterResult(spec_id=existing.id, action="deduped", status=existing.status)

    status = _status_for_trust(spec.trust_preset)
    spec.status = status
    persisted = reg.register_next_version(conn, spec, deprecate_previous=False)

    if status == "draft" and on_approval_required is not None:
        # untrusted / org-changing spec: park for human approval. The hook
        # typically creates a Multica action_required issue; registration stays
        # in 'draft' until a human promotes it.
        on_approval_required(persisted)
        return RegisterResult(spec_id=persisted.id, action="pending_approval", status="draft")

    return RegisterResult(spec_id=persisted.id, action="registered", status=status)


# ---------------------------------------------------------------------------
# top-level orchestration: retrieve-or-generate
# ---------------------------------------------------------------------------

def acquire_spec(
    conn: sqlite3.Connection,
    req: GenerateRequest,
    *,
    generator: Generator,
    matcher: Matcher = _default_matcher,
    smoke_runner: Optional[SmokeRunner] = None,
    on_approval_required: Optional[Callable[[SubagentSpec], None]] = None,
) -> RegisterResult:
    """Retrieve an existing spec or generate, validate, and register a new one.

    The single entry point the Router calls when it needs a spec for a step.
    ``generator``/``smoke_runner`` are injected (LLM + child runtime live
    outside this pure-logic module).
    """
    matches = retrieve_candidates(conn, req, matcher=matcher)
    if decide_action(matches) == "hit":
        top = matches[0].spec
        return RegisterResult(spec_id=top.id, action="deduped", status=top.status)

    draft = generator(req)
    draft.provenance = "generated"
    draft.tenant = req.tenant
    validation = validate_spec(
        draft,
        available_toolsets=req.available_toolsets,
        available_openclaw_tools=req.available_openclaw_tools,
        smoke_runner=smoke_runner,
    )
    if not validation.ok:
        raise FactoryValidationError(validation)
    return register_spec(
        conn, draft, dedupe_matches=matches, on_approval_required=on_approval_required
    )


class FactoryValidationError(Exception):
    """Raised when a generated spec fails the default-FAIL validation gate."""

    def __init__(self, result: ValidationResult) -> None:
        self.result = result
        super().__init__(f"spec failed at gate {result.gate}: {result.errors}")
