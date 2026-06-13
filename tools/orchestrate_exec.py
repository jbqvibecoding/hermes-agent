"""Real-execution glue for orchestration runs.

The only module that touches the live ``delegate_task`` runtime. It turns a
resolved ``SubagentSpec`` into a concrete ``WorkerAdapter`` (in-process delegate
child, or an OpenClaw worker when a Gateway runner is supplied), choosing the
runtime via ``task_router.resolve_runtime``.

Everything here is injectable: ``make_delegate_runner`` takes the delegate
callable (defaulting to the real one) and a parent agent context, so the routing
logic and result parsing are unit-testable with stubs and no live LLM.
"""

from __future__ import annotations

import json
from typing import Any, Callable, Optional

from hermes_cli.subagent_spec import SubagentSpec
from tools import task_router
from tools.worker_adapter import (
    DelegateRunner,
    InProcessAdapter,
    InProcessRequest,
    ModelProfiles,
    OpenClawRunner,
    OpenClawWorkerAdapter,
    RuntimeOutcome,
    WorkerAdapter,
)

# delegate_task(goal, context, toolsets, max_iterations, role, parent_agent) -> JSON str
DelegateFn = Callable[..., str]


def parse_delegate_result(raw: str) -> RuntimeOutcome:
    """Parse ``delegate_task``'s JSON envelope into a :class:`RuntimeOutcome`.

    Single-goal delegation → first result entry. Maps the entry ``status``
    (ok|error|timeout|interrupted) to the runtime outcome; unknown/missing
    shapes fail closed rather than reporting a false success.
    """
    try:
        data = json.loads(raw)
    except (ValueError, TypeError):
        return RuntimeOutcome(ok=False, error_kind="error", error_note="unparseable delegate result")
    results = data.get("results") if isinstance(data, dict) else None
    if not results:
        note = data.get("error") if isinstance(data, dict) else None
        return RuntimeOutcome(ok=False, error_kind="error", error_note=note or "no delegate results")
    entry: dict[str, Any] = results[0] or {}
    status = str(entry.get("status") or "").lower()
    text = entry.get("summary") or entry.get("output") or ""
    if status == "ok":
        return RuntimeOutcome(ok=True, text=text)
    error_kind = "timeout" if status == "timeout" else "crashed"
    return RuntimeOutcome(
        ok=False, text=text, error_kind=error_kind,
        error_note=entry.get("error") or f"delegate status={status or 'unknown'}",
    )


def make_delegate_runner(parent_agent: Any, *, delegate_fn: Optional[DelegateFn] = None) -> DelegateRunner:
    """Build an in-process ``DelegateRunner`` bound to a parent agent context.

    ``delegate_fn`` defaults to the real ``tools.delegate_tool.delegate_task``
    (imported lazily so this module stays importable without the heavy runtime).
    """
    fn = delegate_fn
    if fn is None:
        from tools.delegate_tool import delegate_task as fn  # lazy: heavy import

    def _runner(req: InProcessRequest) -> RuntimeOutcome:
        raw = fn(
            goal=req.goal,
            context=req.context,
            toolsets=req.toolsets,
            max_iterations=req.max_iterations,
            role=req.role,
            parent_agent=parent_agent,
        )
        return parse_delegate_result(raw)

    return _runner


def make_adapter_resolver(
    parent_agent: Any,
    *,
    profiles: Optional[ModelProfiles] = None,
    delegate_fn: Optional[DelegateFn] = None,
    openclaw_runner: Optional[OpenClawRunner] = None,
    gateway_available: bool = False,
) -> Callable[[SubagentSpec], WorkerAdapter]:
    """Resolve each spec to its concrete adapter.

    Uses ``task_router.resolve_runtime`` to choose in-process vs OpenClaw worker.
    Falls back to in-process when an OpenClaw runner/Gateway isn't available
    (graceful degradation — isolation-required steps are future Recovery work).
    """
    delegate_runner = make_delegate_runner(parent_agent, delegate_fn=delegate_fn)
    inproc = InProcessAdapter(delegate_runner, profiles=profiles)
    openclaw = (
        OpenClawWorkerAdapter(openclaw_runner, profiles=profiles)
        if openclaw_runner is not None
        else None
    )

    def _resolve(spec: SubagentSpec) -> WorkerAdapter:
        runtime = task_router.resolve_runtime(
            spec,
            risk="low",
            is_synthesis=False,
            gateway_available=gateway_available and openclaw is not None,
        )
        if runtime == "openclaw_worker" and openclaw is not None:
            return openclaw
        return inproc

    return _resolve
