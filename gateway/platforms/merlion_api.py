"""Merlion orchestration API platform — Hermes-direct ``/v1/orchestrate/*``.

A thin aiohttp surface that wires the orchestration core (``tools.orchestrate``)
into HTTP + SSE: classify a brief, plan + start a run (materialized as kanban
tasks), drive it to completion with real in-process workers, and stream Merlion
events. Mirrors the run+SSE+auth pattern of ``api_server.py``.

The per-spec adapter resolver is the one live seam: by default it lazily builds
a delegate-backed resolver (real execution); tests inject a stub via
``set_executor_resolver`` so the HTTP/SSE/plan/store wiring is exercised without
a live LLM.
"""

from __future__ import annotations

import asyncio
import hmac
import json
import logging
import os
import time
import uuid
from typing import Any, Callable, Optional

try:
    from aiohttp import web

    AIOHTTP_AVAILABLE = True
except ImportError:  # pragma: no cover - exercised only where aiohttp is absent
    AIOHTTP_AVAILABLE = False
    web = None  # type: ignore

from gateway.config import Platform, PlatformConfig
from gateway.platforms.base import BasePlatformAdapter, SendResult
from hermes_cli.subagent_spec import SubagentSpec
from tools import merlion_classify, orchestrate, tournament
from tools.agent_factory import TAU_HIT

logger = logging.getLogger(__name__)

DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8645
_MAX_CONCURRENT_RUNS = 64
_TICK_SLEEP_SECONDS = 0.05  # brief yield between dispatch ticks

AdapterResolver = Callable[[SubagentSpec], Any]


def check_merlion_requirements() -> bool:
    return AIOHTTP_AVAILABLE


def _error(message: str, status: int) -> Any:
    return web.json_response({"error": {"message": message}}, status=status)


class MerlionApiAdapter(BasePlatformAdapter):
    """aiohttp host for the Merlion orchestration API."""

    def __init__(self, config: PlatformConfig):
        super().__init__(config, Platform.MERLION_API)
        extra = config.extra or {}
        self._host: str = extra.get("host", os.getenv("MERLION_API_HOST", DEFAULT_HOST))
        self._port: int = int(extra.get("port", os.getenv("MERLION_API_PORT", DEFAULT_PORT)))
        self._api_key: str = extra.get("key", os.getenv("MERLION_API_KEY", ""))
        db = extra.get("db_path", os.getenv("MERLION_API_DB", ""))
        self._db_path = db or None
        self._app: Optional[Any] = None
        self._runner: Optional[Any] = None
        self._site: Optional[Any] = None
        # run_id -> event queue (None sentinel closes the stream)
        self._run_streams: dict[str, "asyncio.Queue[Optional[dict]]"] = {}
        self._injected_resolver: Optional[AdapterResolver] = None
        # Optional (run_id, title) -> projector factory. Default builds one from
        # MULTICA_* env; tests inject a fake. None disables board projection.
        self._projector_factory: Optional[Callable[[str, str], Any]] = None
        self._agent_to_spec: dict = {}
        # tournament_id -> {model -> winning OrchestrationPlan} (ok candidates only),
        # so a later /select can execute the plan the operator picked.
        self._tournaments: dict[str, dict[str, Any]] = {}
        # Injected LLM plan client for tournaments; None → built lazily (needs key).
        self._tournament_llm: Optional[tournament.LlmPlanClient] = None

    # -- executor seam ------------------------------------------------------

    def set_executor_resolver(self, resolver: AdapterResolver) -> None:
        """Inject the per-spec adapter resolver (tests / explicit wiring)."""
        self._injected_resolver = resolver

    def set_tournament_llm(self, llm: Optional[tournament.LlmPlanClient]) -> None:
        """Inject the tournament LLM plan client (tests / explicit wiring)."""
        self._tournament_llm = llm

    def set_multica_projector_factory(self, factory: Optional[Callable[[str, str], Any]]) -> None:
        """Inject a ``(run_id, title) -> projector`` factory (tests / wiring)."""
        self._projector_factory = factory

    def set_multica_agent_spec_map(self, mapping: dict) -> None:
        """Inject the ``agent_id -> spec_id`` map used to interpret reassigns."""
        self._agent_to_spec = dict(mapping)

    def _build_control(self, projector: Optional[Any], plan: Any) -> Optional[Callable[[], Any]]:
        """Build a reverse-control source polling the board, or None if no projector.

        Reuses the projector's client + issue mapping (populated once cards are
        created) so the poller and projector speak to the same Multica/run.
        """
        if projector is None or not getattr(projector, "_issue_by_subtask", None):
            return None
        try:
            from tools.multica_poller import MulticaPoller
            from tools.multica_reconciler import reconcile

            poller = MulticaPoller(
                projector._client,
                parent_issue_id=projector._parent_id,
                issue_by_subtask=dict(projector._issue_by_subtask),
            )
            plan_specs = {s.subtask.id: s.subtask.spec_id for s in plan.steps}
            approval = {s.subtask.id for s in plan.steps if s.needs_approval}
            agent_to_spec = dict(self._agent_to_spec)
            return lambda: reconcile(
                poller.poll(), plan_specs=plan_specs,
                approval_subtasks=approval, agent_to_spec=agent_to_spec,
            )
        except Exception:
            logger.exception("[merlion_api] failed to build reverse-control source")
            return None

    def _build_projector(self, run_id: str, title: str) -> Optional[Any]:
        """Resolve a board projector: injected factory, else MULTICA_* env, else None."""
        if self._projector_factory is not None:
            return self._projector_factory(run_id, title)
        try:
            from tools.multica_client import HttpxMulticaTransport, MulticaClient, MulticaConfig
            from tools.multica_projector import MulticaProjector

            cfg = MulticaConfig.from_env()
            if cfg is None:
                return None
            client = MulticaClient(HttpxMulticaTransport(cfg))
            return MulticaProjector(client, run_id=run_id, title=title)
        except Exception:  # projection is additive; never block a run on setup
            logger.exception("[merlion_api] failed to build Multica projector")
            return None

    def _get_resolver(self) -> AdapterResolver:
        if self._injected_resolver is not None:
            return self._injected_resolver
        # Production: lazily build a delegate-backed resolver with a root lead
        # agent as the delegation parent. Imported lazily (heavy runtime).
        from run_agent import AIAgent
        from tools.orchestrate_exec import make_adapter_resolver

        lead = AIAgent()
        return make_adapter_resolver(lead)

    # -- auth ---------------------------------------------------------------

    def _check_auth(self, request: Any) -> Optional[Any]:
        if not self._api_key:
            return None
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:].strip()
            if hmac.compare_digest(token, self._api_key):
                return None
        return _error("Invalid API key", 401)

    # -- lifecycle ----------------------------------------------------------

    def build_app(self) -> Any:
        """Construct the aiohttp Application with routes (no network binding).

        Used by :meth:`connect` and by tests (via aiohttp's TestServer) so the
        HTTP surface is exercisable without opening a port.
        """
        app = web.Application()
        app.router.add_get("/health", self._handle_health)
        app.router.add_post("/v1/orchestrate/classify", self._handle_classify)
        app.router.add_post("/v1/orchestrate/subagents/generate", self._handle_generate)
        app.router.add_post("/v1/orchestrate", self._handle_orchestrate)
        app.router.add_get("/v1/orchestrate/{run_id}", self._handle_snapshot)
        app.router.add_get("/v1/orchestrate/{run_id}/stream", self._handle_stream)
        app.router.add_post("/v1/tournament", self._handle_tournament)
        app.router.add_post("/v1/tournament/{tid}/select", self._handle_tournament_select)
        return app

    async def connect(self) -> bool:
        if not AIOHTTP_AVAILABLE:
            logger.warning("[merlion_api] aiohttp not installed")
            return False
        self._app = self.build_app()
        self._runner = web.AppRunner(self._app)
        await self._runner.setup()
        self._site = web.TCPSite(self._runner, self._host, self._port)
        await self._site.start()
        self._mark_connected()
        logger.info("[merlion_api] listening on http://%s:%d", self._host, self._port)
        return True

    async def disconnect(self) -> None:
        self._mark_disconnected()
        if self._site:
            await self._site.stop()
        if self._runner:
            await self._runner.cleanup()
        self._app = None

    async def send(self, chat_id: str, content: str, reply_to=None, metadata=None) -> SendResult:
        # API platform: results flow over the HTTP/SSE response, not this path.
        return SendResult(success=True)

    async def get_chat_info(self, chat_id: str) -> dict:
        return {"name": chat_id, "type": "api"}

    # -- handlers -----------------------------------------------------------

    async def _handle_health(self, request: Any) -> Any:
        return web.json_response({"status": "ok"})

    async def _handle_classify(self, request: Any) -> Any:
        auth = self._check_auth(request)
        if auth:
            return auth
        body = await self._json(request)
        if body is None:
            return _error("Invalid JSON", 400)
        brief = (body.get("brief") or body.get("prompt") or "").strip()
        if not brief:
            return _error("Missing 'brief'", 400)
        cls = orchestrate.classify_brief(
            brief,
            upload=bool(body.get("upload", False)),
            scale_hint=body.get("scale"),
            has_mode=bool(body.get("has_mode", True)),
        )
        return web.json_response(_classification_dict(cls))

    async def _handle_generate(self, request: Any) -> Any:
        auth = self._check_auth(request)
        if auth:
            return auth
        body = await self._json(request)
        if body is None:
            return _error("Invalid JSON", 400)
        brief = (body.get("requirement") or body.get("brief") or "").strip()
        domain = (body.get("domain") or "general").strip()
        if not brief:
            return _error("Missing 'requirement'", 400)
        conn = orchestrate.open_conn(self._db_path)
        try:
            spec, match = orchestrate.select_spec(
                conn, domain, brief, tenant=body.get("tenant")
            )
        finally:
            conn.close()
        if spec is not None and match >= TAU_HIT:
            return web.json_response({"matched": True, "subagent": _spec_dict(spec), "score": match})
        return web.json_response(
            {
                "matched": False,
                "needs_generation": True,
                "domain": domain,
                "best_score": match,
                "candidate": _spec_dict(spec) if spec else None,
            }
        )

    async def _handle_orchestrate(self, request: Any) -> Any:
        auth = self._check_auth(request)
        if auth:
            return auth
        if len(self._run_streams) >= _MAX_CONCURRENT_RUNS:
            return _error("Too many concurrent runs", 429)
        body = await self._json(request)
        if body is None:
            return _error("Invalid JSON", 400)
        brief = (body.get("brief") or body.get("prompt") or "").strip()
        if not brief:
            return _error("Missing 'brief'", 400)
        tenant = body.get("tenant")

        # Plan + persist synchronously (own connection on the event-loop thread).
        conn = orchestrate.open_conn(self._db_path)
        try:
            cls = orchestrate.classify_brief(
                brief,
                upload=bool(body.get("upload", False)),
                scale_hint=body.get("scale"),
                has_mode=bool(body.get("has_mode", True)),
            )
            plan = orchestrate.build_plan(conn, brief, cls, tenant=tenant)
            orchestrate.start_run(conn, plan, tenant=tenant)
        finally:
            conn.close()

        queue: "asyncio.Queue[Optional[dict]]" = asyncio.Queue()
        self._run_streams[plan.run_id] = queue
        loop = asyncio.get_running_loop()
        loop.run_in_executor(None, self._drive_blocking, plan.run_id, loop, queue, plan)

        return web.json_response(plan.preview(), status=202)

    async def _handle_tournament(self, request: Any) -> Any:
        """Run a multi-LLM plan tournament: score candidates, recommend — no exec.

        Returns the scored candidates (best-first) plus the recommended model and a
        ``tournamentId`` to /select. The deterministic baseline is always entered,
        so this works with no models / no LLM key.
        """
        auth = self._check_auth(request)
        if auth:
            return auth
        body = await self._json(request)
        if body is None:
            return _error("Invalid JSON", 400)
        brief = (body.get("brief") or body.get("prompt") or "").strip()
        if not brief:
            return _error("Missing 'brief'", 400)
        models = body.get("models") or []
        if not isinstance(models, list):
            return _error("'models' must be a list", 400)
        tenant = body.get("tenant")

        conn = orchestrate.open_conn(self._db_path)
        try:
            result = tournament.run_tournament(
                conn, brief, [str(m) for m in models],
                llm=self._tournament_llm, tenant=tenant,
            )
        finally:
            conn.close()

        tid = f"trn_{uuid.uuid4().hex}"
        self._tournaments[tid] = {
            c.model: c.plan for c in result.candidates if c.ok and c.plan is not None
        }
        return web.json_response(
            {
                "tournamentId": tid,
                "event": "tournament.candidates",
                "candidates": [_candidate_dict(c) for c in result.candidates],
                "recommendedModel": result.recommended_model,
            }
        )

    async def _handle_tournament_select(self, request: Any) -> Any:
        """Execute the operator-picked plan, backing subagents with chosen models.

        Auto-distributes ``exec_models`` across the winning plan's department steps
        (round-robin; same-dept steps share a model) and drives the run through the
        unchanged loop with a ``spec.model``-assigning resolver.
        """
        auth = self._check_auth(request)
        if auth:
            return auth
        if len(self._run_streams) >= _MAX_CONCURRENT_RUNS:
            return _error("Too many concurrent runs", 429)
        tid = request.match_info["tid"]
        body = await self._json(request)
        if body is None:
            return _error("Invalid JSON", 400)
        plans = self._tournaments.get(tid)
        if not plans:
            return _error("Tournament not found", 404)
        chosen = body.get("chosen_model") or body.get("model")
        plan = plans.get(chosen) if chosen else None
        if plan is None:
            return _error("chosen_model not in tournament", 404)
        exec_models = body.get("exec_models") or []
        if not isinstance(exec_models, list):
            return _error("'exec_models' must be a list", 400)
        tenant = body.get("tenant")
        spec_model = tournament.assign_exec_models(plan, [str(m) for m in exec_models])

        conn = orchestrate.open_conn(self._db_path)
        try:
            orchestrate.start_run(conn, plan, tenant=tenant)
        finally:
            conn.close()

        resolver = tournament.make_model_assigning_resolver(self._get_resolver(), spec_model)
        prelude = [
            {
                "event": "tournament.selected", "run_id": plan.run_id, "model": chosen,
                "exec_models": list(exec_models), "assignment": spec_model,
            }
        ]
        queue: "asyncio.Queue[Optional[dict]]" = asyncio.Queue()
        self._run_streams[plan.run_id] = queue
        loop = asyncio.get_running_loop()
        loop.run_in_executor(
            None, self._drive_blocking, plan.run_id, loop, queue, plan, resolver, prelude
        )
        return web.json_response({**plan.preview(), "tournamentId": tid, "model": chosen}, status=202)

    async def _handle_snapshot(self, request: Any) -> Any:
        auth = self._check_auth(request)
        if auth:
            return auth
        run_id = request.match_info["run_id"]
        conn = orchestrate.open_conn(self._db_path)
        try:
            snap = orchestrate.run_snapshot(conn, run_id)
        finally:
            conn.close()
        if snap is None:
            return _error("Run not found", 404)
        return web.json_response(snap)

    async def _handle_stream(self, request: Any) -> Any:
        auth = self._check_auth(request)
        if auth:
            return auth
        run_id = request.match_info["run_id"]
        queue = self._run_streams.get(run_id)
        response = web.StreamResponse(
            status=200,
            headers={
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )
        await response.prepare(request)

        if queue is None:
            # Late subscriber: replay a synthetic snapshot, then close.
            conn = orchestrate.open_conn(self._db_path)
            try:
                snap = orchestrate.run_snapshot(conn, run_id)
            finally:
                conn.close()
            if snap is None:
                await self._sse(response, {"event": "error", "message": "run not found"})
            else:
                await self._sse(response, {"event": "snapshot", **snap})
            return response

        while True:
            event = await queue.get()
            if event is None:
                break
            await self._sse(response, event)
        return response

    # -- helpers ------------------------------------------------------------

    async def _json(self, request: Any) -> Optional[dict]:
        try:
            return await request.json()
        except Exception:
            return None

    async def _sse(self, response: Any, event: dict) -> None:
        name = event.get("event", "message")
        payload = f"event: {name}\ndata: {json.dumps(event)}\n\n"
        await response.write(payload.encode())

    def _drive_blocking(
        self, run_id: str, loop: Any, queue: Any, plan: Any,
        resolver: Optional[AdapterResolver] = None, prelude: Optional[list[dict]] = None,
    ) -> None:
        """Drive a run to completion in an executor thread (own sqlite conn).

        ``resolver`` overrides the default per-spec resolver (tournament /select
        passes a model-assigning one); ``prelude`` frames are emitted before the
        plan's initial events (e.g. ``tournament.selected``).
        """

        # Optional board projection: mirror events as Multica cards. Best-effort;
        # the projector swallows its own errors so it never breaks the run.
        projector = self._build_projector(run_id, getattr(plan, "brief", run_id))

        def push(ev: dict) -> None:
            loop.call_soon_threadsafe(queue.put_nowait, ev)
            if projector is not None:
                projector.handle(ev)

        conn = orchestrate.open_conn(self._db_path)
        try:
            for ev in prelude or []:
                push(ev)
            for ev in orchestrate.initial_events(plan):
                push(ev)
            resolver = resolver or self._get_resolver()
            # Reverse control: once the cards exist (mapping populated by the
            # initial_events above), poll the board for operator actions.
            control = self._build_control(projector, plan)
            for _ in range(10_000):  # generous tick ceiling; loop exits on complete
                _events, complete = orchestrate.advance_run(
                    conn, run_id, resolve_adapter=resolver, emit=push, control=control
                )
                if complete:
                    break
                time.sleep(_TICK_SLEEP_SECONDS)
        except Exception as exc:  # surface, don't swallow — the stream is the UX
            logger.exception("[merlion_api] run %s failed", run_id)
            push({"event": "error", "run_id": run_id, "message": str(exc)})
        finally:
            conn.close()
            loop.call_soon_threadsafe(queue.put_nowait, None)
            loop.call_soon_threadsafe(self._run_streams.pop, run_id, None)


def _candidate_dict(c: tournament.Candidate) -> dict:
    d: dict[str, Any] = {
        "model": c.model, "ok": c.ok, "latencyMs": c.latency_ms, "overall": c.overall,
    }
    if c.ok and c.plan is not None:
        d["plan"] = c.plan.preview()
    if c.score is not None:
        d["score"] = {
            "feasibility": c.score.feasibility, "impact": c.score.impact,
            "risk": c.score.risk, "cost": c.score.cost,
        }
    if not c.ok:
        d["error"] = c.error
    return d


def _classification_dict(cls: merlion_classify.Classification) -> dict:
    return {
        "tier": cls.tier,
        "scale": cls.scale,
        "confidence": cls.confidence,
        "rationale": cls.rationale,
        "suggested_departments": cls.suggested_departments,
        "needs_upload_context": cls.needs_upload_context,
    }


def _spec_dict(spec: SubagentSpec) -> dict:
    return {
        "id": spec.id,
        "name": spec.name,
        "role": spec.role,
        "domain": spec.domain,
        "dept": spec.dept,
        "short": spec.short,
        "color": spec.color,
        "model_category": spec.model_category,
        "description": spec.description,
    }
