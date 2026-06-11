"""WorkerAdapter — the single interface both runtimes implement.

A :class:`SubagentSpec` is executed against a task through one adapter, mirroring
paperclip's ``adapterType`` so the Router/Recovery code stays runtime-agnostic
and the worker runtime is swappable:

* :class:`InProcessAdapter` — maps a spec to a ``delegate_task``/``_build_child_agent``
  child (Hermes in-process; cheap, low-latency, no isolation).
* :class:`OpenClawWorkerAdapter` — drives the user's OpenClaw Gateway
  (``sessions.create`` → ``sessions.patch`` shaping → ``chat.send`` → await final;
  heavy, isolated, computer-use).

Both heavy runtimes are injected (a delegate runner / an OpenClaw client), so
this connective layer is unit-testable with stubs — no child agent runtime and
no live Gateway required. After a run, :func:`run_and_record` persists the
outcome to the Memory Graph (``spec_registry.record_outcome``).
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Callable, Optional, Protocol

from hermes_cli import spec_registry as reg
from hermes_cli.subagent_spec import FourPartContract, SubagentSpec
from tools.agent_factory import render_contract

# Terminal outcome classes (shared with subagent_outcomes + Route Score).
OUTCOME_PASS = "pass"
OUTCOME_FAIL = "fail"
OUTCOME_TIMEOUT = "timeout"
OUTCOME_CRASHED = "crashed"
OUTCOME_BLOCKED = "blocked"


@dataclass
class WorkerTask:
    """The minimal task shape an adapter needs.

    Maps from a Multica ``agent_task`` (Phase 2) or a Hermes Kanban task; kept
    decoupled so the adapter layer doesn't depend on either store.
    """

    id: str
    title: str
    body: str = ""
    tenant: Optional[str] = None
    workspace: str = "."


@dataclass
class WorkerResult:
    outcome: str  # pass|fail|timeout|crashed|blocked
    summary: str = ""
    artifacts: list = field(default_factory=list)
    cost_cents: Optional[int] = None
    latency_ms: Optional[int] = None
    failure_class: Optional[str] = None
    failure_note: Optional[str] = None
    metadata: dict = field(default_factory=dict)


# ---- model resolution ------------------------------------------------------

ModelProfiles = dict  # {"cheap": "<model>", "default": "<model>"}


def resolve_model(spec: SubagentSpec, profiles: Optional[ModelProfiles] = None) -> Optional[str]:
    """Concrete model for a spec: explicit override, else profile lookup.

    No model-name literals live here — ``profiles`` is supplied by config so the
    resolver stays product-agnostic. Returns ``None`` to mean "inherit"
    (OpenClaw ``sessions.create`` model is optional; delegate inherits parent).
    """
    if spec.model:
        return spec.model
    if profiles:
        return profiles.get(spec.model_profile)
    return None


# ---- injected runtime contracts -------------------------------------------

@dataclass
class RuntimeOutcome:
    """What an injected runner reports back (both runtimes share this shape)."""

    ok: bool
    text: str = ""
    cost_cents: Optional[int] = None
    latency_ms: Optional[int] = None
    error_kind: Optional[str] = None  # "timeout"|"crashed"|"error"|None
    error_note: Optional[str] = None
    artifacts: list = field(default_factory=list)


@dataclass
class InProcessRequest:
    goal: str
    context: str
    toolsets: list
    model: Optional[str]
    role: str
    max_iterations: int
    ephemeral_system_prompt: str


@dataclass
class OpenClawRequest:
    session_key: str
    model: Optional[str]
    message: str
    tools_allow: list
    tools_deny: list
    subagent_role: str
    auth_profile: Optional[str]
    timeout_ms: int
    idempotency_key: str
    workspace: str


DelegateRunner = Callable[[InProcessRequest], RuntimeOutcome]
OpenClawRunner = Callable[[OpenClawRequest], RuntimeOutcome]


class WorkerAdapter(Protocol):
    runtime: str

    def run(self, spec: SubagentSpec, task: WorkerTask, contract: Optional[FourPartContract]) -> WorkerResult:
        ...


def _outcome_to_result(o: RuntimeOutcome, runtime: str) -> WorkerResult:
    if o.ok:
        return WorkerResult(
            outcome=OUTCOME_PASS, summary=o.text, artifacts=o.artifacts,
            cost_cents=o.cost_cents, latency_ms=o.latency_ms,
            metadata={"runtime": runtime},
        )
    outcome = {
        "timeout": OUTCOME_TIMEOUT,
        "crashed": OUTCOME_CRASHED,
    }.get(o.error_kind or "", OUTCOME_FAIL)
    return WorkerResult(
        outcome=outcome, summary=o.text, artifacts=o.artifacts,
        cost_cents=o.cost_cents, latency_ms=o.latency_ms,
        failure_class=o.error_kind, failure_note=o.error_note,
        metadata={"runtime": runtime},
    )


class InProcessAdapter:
    """Run a spec as an in-process ``delegate_task`` child (injected runner)."""

    runtime = "in_process"

    def __init__(self, runner: DelegateRunner, *, profiles: Optional[ModelProfiles] = None) -> None:
        self._runner = runner
        self._profiles = profiles

    def run(self, spec: SubagentSpec, task: WorkerTask, contract: Optional[FourPartContract]) -> WorkerResult:
        req = InProcessRequest(
            goal=render_contract(contract, task.title),
            context=task.body,
            toolsets=list(spec.tools),
            model=resolve_model(spec, self._profiles),
            role=spec.role,
            max_iterations=spec.max_turns,
            ephemeral_system_prompt=spec.system_prompt,
        )
        return _outcome_to_result(self._runner(req), self.runtime)


class OpenClawWorkerAdapter:
    """Run a spec on the user's OpenClaw Gateway (injected WS client runner).

    The runner is expected to: sessions.create(model, message) → sessions.patch
    (inheritedToolAllow/Deny, subagentRole) → chat.send(idempotencyKey) → await
    the terminal ChatFinalEvent, returning a :class:`RuntimeOutcome`.
    """

    runtime = "openclaw_worker"

    def __init__(self, runner: OpenClawRunner, *, profiles: Optional[ModelProfiles] = None) -> None:
        self._runner = runner
        self._profiles = profiles

    def run(self, spec: SubagentSpec, task: WorkerTask, contract: Optional[FourPartContract]) -> WorkerResult:
        req = OpenClawRequest(
            session_key=f"hermes-{task.id}",
            model=resolve_model(spec, self._profiles),
            message=render_contract(contract, task.title),
            tools_allow=list(spec.tools),
            tools_deny=list(spec.disallowed_tools),
            subagent_role=spec.role,
            auth_profile=spec.auth_profile,
            timeout_ms=spec.timeout_seconds * 1000,
            idempotency_key=task.id,
            workspace=task.workspace,
        )
        return _outcome_to_result(self._runner(req), self.runtime)


def run_and_record(
    conn,
    adapter: WorkerAdapter,
    spec: SubagentSpec,
    task: WorkerTask,
    contract: Optional[FourPartContract] = None,
    *,
    persist: bool = True,
) -> WorkerResult:
    """Run a spec through an adapter and persist the outcome to the Memory Graph.

    Times the run as a latency fallback when the runner doesn't report one, then
    stamps ``subagent_outcomes`` (feeding Route Score + Evolution + Recovery).
    """
    started = time.monotonic()
    result = adapter.run(spec, task, contract)
    if result.latency_ms is None:
        result.latency_ms = int((time.monotonic() - started) * 1000)
    if persist:
        reg.record_outcome(
            conn,
            spec_id=spec.id,
            task_id=task.id,
            runtime=adapter.runtime,
            outcome=result.outcome,
            tenant=task.tenant,
            critic_verdict=result.metadata.get("critic_verdict"),
            cost_cents=result.cost_cents,
            latency_ms=result.latency_ms,
            failure_class=result.failure_class,
            failure_note=result.failure_note,
        )
    return result
