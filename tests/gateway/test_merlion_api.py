from __future__ import annotations

import asyncio

import pytest

pytest.importorskip("aiohttp")
from aiohttp.test_utils import TestClient, TestServer  # noqa: E402

from gateway.config import PlatformConfig  # noqa: E402
from gateway.platforms.merlion_api import MerlionApiAdapter  # noqa: E402
from hermes_cli import spec_registry as reg  # noqa: E402
from hermes_cli.subagent_spec import SubagentSpec  # noqa: E402
from tools import merlion_classify, orchestrate  # noqa: E402
from tools.worker_adapter import OUTCOME_PASS, WorkerResult  # noqa: E402

AUTH = {"Authorization": "Bearer secret"}


class _StubAdapter:
    runtime = "in_process"

    def run(self, spec, task, contract):
        return WorkerResult(outcome=OUTCOME_PASS, summary=f"done {spec.id}")


def _make_adapter(tmp_path):
    cfg = PlatformConfig()
    cfg.extra = {"key": "secret", "db_path": str(tmp_path / "kanban.db")}
    adapter = MerlionApiAdapter(cfg)
    adapter.set_executor_resolver(lambda spec: _StubAdapter())
    # Seed a spec in every default department so plan steps resolve.
    conn = orchestrate.open_conn(tmp_path / "kanban.db")
    try:
        for dept in merlion_classify.DEFAULT_DEPARTMENTS:
            reg.upsert_spec(
                conn,
                SubagentSpec(
                    id=reg.make_spec_id(dept, "lead", 1), name=f"{dept} lead",
                    domain=dept, status="active", provenance="preset",
                ),
            )
    finally:
        conn.close()
    return adapter


async def _client(adapter):
    client = TestClient(TestServer(adapter.build_app()))
    await client.start_server()
    return client


@pytest.mark.asyncio
async def test_health_no_auth(tmp_path):
    client = await _client(_make_adapter(tmp_path))
    try:
        resp = await client.get("/health")
        assert resp.status == 200
        assert (await resp.json())["status"] == "ok"
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_classify_endpoint(tmp_path):
    client = await _client(_make_adapter(tmp_path))
    try:
        resp = await client.post(
            "/v1/orchestrate/classify",
            json={"brief": "Build and launch a fintech banking app"},
            headers=AUTH,
        )
        assert resp.status == 200
        body = await resp.json()
        assert body["tier"] == "very_complex"
        assert body["scale"] == "org"
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_auth_rejected_without_token(tmp_path):
    client = await _client(_make_adapter(tmp_path))
    try:
        resp = await client.post("/v1/orchestrate/classify", json={"brief": "x"})
        assert resp.status == 401
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_orchestrate_returns_plan_preview(tmp_path):
    client = await _client(_make_adapter(tmp_path))
    try:
        resp = await client.post(
            "/v1/orchestrate",
            json={"brief": "Launch a fintech super-app with KYC and payments"},
            headers=AUTH,
        )
        assert resp.status == 202
        body = await resp.json()
        assert body["runId"].startswith("run_")
        assert body["tier"] == "very_complex"
        assert body["departments"]
        assert any(st["is_synthesis"] for st in body["subtasks"])
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_snapshot_reaches_done(tmp_path):
    client = await _client(_make_adapter(tmp_path))
    try:
        resp = await client.post(
            "/v1/orchestrate",
            json={"brief": "Launch a fintech super-app with KYC and payments"},
            headers=AUTH,
        )
        run_id = (await resp.json())["runId"]

        # Background drive (stub workers) completes quickly; poll the snapshot.
        status = None
        for _ in range(40):
            snap_resp = await client.get(f"/v1/orchestrate/{run_id}", headers=AUTH)
            assert snap_resp.status == 200
            snap = await snap_resp.json()
            status = snap["status"]
            if status in {"done", "failed"}:
                break
            await asyncio.sleep(0.05)
        assert status == "done"
        snap = await (await client.get(f"/v1/orchestrate/{run_id}", headers=AUTH)).json()
        assert all(st["status"] in {"done"} for st in snap["subtasks"])
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_snapshot_missing_run_404(tmp_path):
    client = await _client(_make_adapter(tmp_path))
    try:
        resp = await client.get("/v1/orchestrate/run_missing", headers=AUTH)
        assert resp.status == 404
    finally:
        await client.close()


import json  # noqa: E402

_ALPHA = json.dumps(
    {
        "tier": "complex", "scale": "org", "departments": ["eng", "finance"],
        "subtasks": [
            {"id": "st0", "dept": "eng", "goal": "build", "deps": []},
            {"id": "st1", "dept": "finance", "goal": "cost", "deps": ["st0"]},
        ],
    }
)


def _fake_plan_llm():
    def _llm(model, prompt):
        if model == "alpha":
            return _ALPHA
        raise RuntimeError("model unavailable")

    return _llm


@pytest.mark.asyncio
async def test_tournament_scores_and_recommends(tmp_path):
    adapter = _make_adapter(tmp_path)
    adapter.set_tournament_llm(_fake_plan_llm())
    client = await _client(adapter)
    try:
        resp = await client.post(
            "/v1/tournament",
            json={"brief": "Launch a fintech super-app", "models": ["alpha", "bad"]},
            headers=AUTH,
        )
        assert resp.status == 200
        body = await resp.json()
        assert body["tournamentId"].startswith("trn_")
        assert body["recommendedModel"]
        models = [c["model"] for c in body["candidates"]]
        assert "(deterministic-baseline)" in models  # floor always entered
        bad = next(c for c in body["candidates"] if c["model"] == "bad")
        assert bad["ok"] is False  # failed model surfaced, tournament still returns
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_tournament_select_executes_winner(tmp_path):
    adapter = _make_adapter(tmp_path)
    adapter.set_tournament_llm(_fake_plan_llm())
    client = await _client(adapter)
    try:
        r = await client.post(
            "/v1/tournament",
            json={"brief": "Launch a fintech super-app", "models": ["alpha"]},
            headers=AUTH,
        )
        tid = (await r.json())["tournamentId"]
        sel = await client.post(
            f"/v1/tournament/{tid}/select",
            json={"chosen_model": "alpha", "exec_models": ["mX", "mY"]},
            headers=AUTH,
        )
        assert sel.status == 202
        run_id = (await sel.json())["runId"]

        status = None
        for _ in range(40):
            snap = await (await client.get(f"/v1/orchestrate/{run_id}", headers=AUTH)).json()
            status = snap["status"]
            if status in {"done", "failed"}:
                break
            await asyncio.sleep(0.05)
        assert status == "done"
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_tournament_select_unknown_model_404(tmp_path):
    adapter = _make_adapter(tmp_path)
    adapter.set_tournament_llm(_fake_plan_llm())
    client = await _client(adapter)
    try:
        r = await client.post(
            "/v1/tournament", json={"brief": "x", "models": ["alpha"]}, headers=AUTH
        )
        tid = (await r.json())["tournamentId"]
        sel = await client.post(
            f"/v1/tournament/{tid}/select", json={"chosen_model": "ghost"}, headers=AUTH
        )
        assert sel.status == 404
    finally:
        await client.close()


@pytest.mark.asyncio
async def test_generate_retrieve_only(tmp_path):
    client = await _client(_make_adapter(tmp_path))
    try:
        # Unknown domain → no candidate → needs_generation.
        resp = await client.post(
            "/v1/orchestrate/subagents/generate",
            json={"requirement": "exotic task", "domain": "nonexistent"},
            headers=AUTH,
        )
        assert resp.status == 200
        body = await resp.json()
        assert body["matched"] is False
        assert body["needs_generation"] is True
    finally:
        await client.close()
