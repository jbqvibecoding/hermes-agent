#!/usr/bin/env python3
"""Deep research tool — delegates to the AgentHarness multi-agent pipeline.

Runs the ``deep_research`` workflow from a local AgentHarness checkout
(https://github.com/jbqvibecoding/AgentHarness) as a subprocess:

    uv run python -m workflows.deep_research.run --question ... --out ...

The pipeline decomposes the question into sub-questions, fans out parallel
researcher sub-agents that gather cited evidence, fact-checks claims
against their sources, audits contradictions and coverage gaps (with a
bounded re-research loop), then drafts, reviews, and globally verifies a
cited markdown report.

Configuration
-------------
* ``AGENT_HARNESS_DIR`` — path to the AgentHarness checkout
  (default: ``~/AgentHarness``).
* The harness carries its own ``.env`` (``OPENAI_*`` for the pipeline's
  models, ``SERPER_API_KEY`` for search, ``JINA_API_KEY`` for fetch) —
  no Hermes-side keys are required.

The tool registers only when the checkout, its ``.env``, and ``uv`` are
all present (see :func:`check_deep_research_requirements`).

Long-running: a standard run takes several minutes to ~1 hour. The
handler is fully async (``asyncio.create_subprocess_exec``) so the
gateway event loop is never blocked, and the subprocess is hard-killed
at the ``max_minutes`` deadline — partial results are still read from
``result.json`` when possible.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
import uuid
from pathlib import Path
from typing import Any, Dict

from tools.registry import registry, tool_error

logger = logging.getLogger(__name__)

DEFAULT_MAX_MINUTES = 30
COUNCIL_DEFAULT_MAX_MINUTES = 60  # council = one full research per member
MIN_MINUTES = 5
MAX_MINUTES = 120
_REPORT_INLINE_MAX_CHARS = 40_000
_LOG_TAIL_LINES = 200


def _harness_dir() -> Path:
    return Path(
        os.environ.get("AGENT_HARNESS_DIR", "~/AgentHarness"),
    ).expanduser()


def check_deep_research_requirements() -> bool:
    """Register only with a runnable AgentHarness checkout present."""
    harness = _harness_dir()
    return (
        (harness / "workflows" / "deep_research" / "run.py").is_file()
        and (harness / ".env").is_file()
        and shutil.which("uv") is not None
    )


def _child_env() -> Dict[str, str]:
    """Copy of os.environ safe for ``uv run`` in the harness checkout.

    Hermes' own venv markers would otherwise leak into the child and
    make uv resolve against the wrong interpreter/site-packages.
    """
    env = dict(os.environ)
    for var in ("VIRTUAL_ENV", "PYTHONPATH", "PYTHONHOME"):
        env.pop(var, None)
    env["PYTHONUNBUFFERED"] = "1"
    return env


async def _run_pipeline(
    question: str, depth: str, max_minutes: int,
    pipeline: str = "deep_research",
) -> Dict[str, Any]:
    """Shared subprocess driver for all AgentHarness research pipelines
    (also used by tools/model_council_tool.py)."""
    harness = _harness_dir()
    out_dir = harness / "runs" / "hermes" / uuid.uuid4().hex[:8]
    cmd = [
        "uv", "run", "python", "-m", "workflows.deep_research.run",
        "--pipeline", pipeline,
        "--question", question,
        "--depth", depth,
        "--out", str(out_dir),
    ]
    logger.info(
        "%s: starting pipeline (depth=%s, deadline=%dmin, out=%s)",
        pipeline, depth, max_minutes, out_dir,
    )
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        cwd=str(harness),
        env=_child_env(),
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )

    deadline = asyncio.get_running_loop().time() + max_minutes * 60
    log_tail: list[str] = []
    timed_out = False
    assert proc.stdout is not None
    while True:
        remaining = deadline - asyncio.get_running_loop().time()
        if remaining <= 0:
            timed_out = True
            break
        try:
            line = await asyncio.wait_for(
                proc.stdout.readline(), timeout=min(remaining, 30.0),
            )
        except asyncio.TimeoutError:
            continue  # no output this window; loop re-checks the deadline
        if not line:
            break  # EOF — process exiting
        decoded = line.decode("utf-8", errors="replace").rstrip()
        if decoded:
            log_tail.append(decoded)
            del log_tail[:-_LOG_TAIL_LINES]
            if decoded.startswith("PHASE "):
                logger.info("deep_research progress: %s", decoded[6:])

    if timed_out:
        logger.warning("deep_research: deadline reached — terminating")
        proc.terminate()
        try:
            await asyncio.wait_for(proc.wait(), timeout=10)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
    else:
        await proc.wait()

    result_path = out_dir / "result.json"
    result: Dict[str, Any] = {}
    if result_path.is_file():
        try:
            result = json.loads(result_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            logger.warning("deep_research: unreadable result.json: %s", exc)

    if timed_out:
        return {
            "status": "timeout",
            "error": (
                f"pipeline exceeded max_minutes={max_minutes} and was "
                f"killed"
            ),
            "out_dir": str(out_dir),
            "partial_result": result,
            "log_tail": log_tail[-40:],
        }
    if not result:
        return {
            "status": "error",
            "error": (
                f"pipeline exited (code {proc.returncode}) without "
                f"writing result.json"
            ),
            "out_dir": str(out_dir),
            "log_tail": log_tail[-40:],
        }
    if result.get("status") != "ok":
        return {
            "status": result.get("status", "error"),
            "error": result.get("error", "pipeline reported failure"),
            "out_dir": str(out_dir),
            "pipeline_errors": result.get("errors", [])[:10],
            "log_tail": log_tail[-40:],
        }

    report_path = result.get("report_path", "")
    report = ""
    try:
        report = Path(report_path).read_text(encoding="utf-8")
    except OSError as exc:
        logger.warning("deep_research: unreadable report: %s", exc)
    truncated = len(report) > _REPORT_INLINE_MAX_CHARS
    if truncated:
        report = (
            report[:_REPORT_INLINE_MAX_CHARS]
            + f"\n\n…[truncated — full report at {report_path}]"
        )
    out: Dict[str, Any] = {
        "status": "ok",
        "report": report,
        "report_truncated": truncated,
        "report_path": report_path,
        "verification_summary": result.get("summary", ""),
        "stats": {
            "sub_questions": result.get("sub_question_count", 0),
            "evidence_cards": result.get("evidence_count", 0),
            "research_iterations": result.get("iterations", 0),
            "contradiction_clusters": result.get("contradiction_clusters", 0),
            "loci": result.get("loci_count", 0),
            "vault_sources": result.get("vault_source_count", 0),
        },
        "pipeline_errors": result.get("errors", [])[:10],
    }
    for key in ("vault_dir", "patch_log_path", "polish_log_path"):
        if result.get(key):
            out[key] = result[key]
    if pipeline != "deep_research":
        out.update(_council_extras(result))
    return out


def _council_extras(result: Dict[str, Any]) -> Dict[str, Any]:
    """Council-pipeline additions: the three comparison tables (from
    council.json), member paper/answer paths, and the HTML artifact."""
    extras: Dict[str, Any] = {
        "members": result.get("members", []),
        "member_papers": result.get("member_papers", {}),
        "council_html_path": result.get("council_html_path", ""),
        "council_json_path": result.get("council_json_path", ""),
    }
    try:
        council = json.loads(
            Path(result.get("council_json_path", "")).read_text(
                encoding="utf-8",
            ),
        )
        extras["council"] = {
            "agreements": council.get("agreements", []),
            "disagreements": council.get("disagreements", []),
            "unique": council.get("unique", []),
        }
        extras["synthesis"] = council.get("synthesis", "")
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("council.json unreadable: %s", exc)
    return extras


async def _handle_deep_research(args: Dict[str, Any], **kwargs: Any) -> str:
    question = str(args.get("question", "")).strip()
    if not question:
        return tool_error("deep_research requires a non-empty 'question'")
    depth = str(args.get("depth", "standard")).lower()
    if depth not in {"quick", "standard", "deep"}:
        depth = "standard"
    mode = str(args.get("mode", "solo")).lower()
    council = mode == "council"
    default_minutes = COUNCIL_DEFAULT_MAX_MINUTES if council else DEFAULT_MAX_MINUTES
    try:
        max_minutes = int(args.get("max_minutes", default_minutes))
    except (TypeError, ValueError):
        max_minutes = default_minutes
    max_minutes = max(MIN_MINUTES, min(MAX_MINUTES, max_minutes))

    try:
        result = await _run_pipeline(
            question, depth, max_minutes,
            pipeline="deep_council_research" if council else "deep_research",
        )
    except FileNotFoundError as exc:  # uv missing despite check_fn
        return tool_error(f"deep_research launch failed: {exc}")
    return json.dumps(result, ensure_ascii=False)


DEEP_RESEARCH_SCHEMA = {
    "name": "deep_research",
    "description": (
        "Run a multi-agent deep research pipeline on a complex question "
        "and get back a cited markdown research report. The question is "
        "decomposed into sub-questions; parallel researcher agents gather "
        "evidence; fact-checkers re-fetch every cited source; a conflict "
        "auditor hunts contradictions and coverage gaps (re-researching "
        "when needed); a writer drafts; a critic reviews; and a global "
        "verifier performs the final audit. Sources are stored in a "
        "searchable evidence vault, contested claims are mapped into a "
        "contradiction graph with prioritized loci for deeper "
        "investigation, four adversarial critics review the draft, and "
        "revisions are applied as surgical patches. Use for substantive "
        "research questions that deserve verified, sourced answers — not "
        "for quick lookups (use web_search for those). mode='council' runs "
        "the FULL pipeline once per configured council member model "
        "(COUNCIL_MODEL_* in the harness .env) and returns per-model "
        "research papers plus Where-Models-Agree/Disagree/Unique-"
        "Discoveries comparison tables — cost and duration scale with "
        "member count. LONG-RUNNING: takes several minutes up to ~1 "
        "hour. Call this tool BY ITSELF — never alongside other tool "
        "calls in the same turn."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "question": {
                "type": "string",
                "description": (
                    "The research question, phrased self-contained (the "
                    "pipeline sees only this text, not the conversation)."
                ),
            },
            "depth": {
                "type": "string",
                "enum": ["quick", "standard", "deep"],
                "description": (
                    "Research depth: quick (~3 sub-questions, 1 pass), "
                    "standard (default), deep (more sub-questions, "
                    "iterations, and a live spot-check in verification)."
                ),
                "default": "standard",
            },
            "mode": {
                "type": "string",
                "enum": ["solo", "council"],
                "description": (
                    "solo (default): one research run on the default "
                    "model. council: full research once per configured "
                    "council member model, plus agree/disagree/unique "
                    "comparison tables and per-model papers (costs ~N× "
                    "solo; requires COUNCIL_MODEL_* in the harness .env)."
                ),
                "default": "solo",
            },
            "max_minutes": {
                "type": "integer",
                "description": (
                    f"Wall-clock budget in minutes (clamped to "
                    f"{MIN_MINUTES}-{MAX_MINUTES}; default "
                    f"{DEFAULT_MAX_MINUTES}, or "
                    f"{COUNCIL_DEFAULT_MAX_MINUTES} in council mode). The "
                    f"pipeline is killed at the deadline and partial "
                    f"results returned."
                ),
            },
        },
        "required": ["question"],
    },
}


registry.register(
    name="deep_research",
    toolset="deep_research",
    schema=DEEP_RESEARCH_SCHEMA,
    handler=_handle_deep_research,
    check_fn=check_deep_research_requirements,
    requires_env=[],
    is_async=True,
    emoji="🔬",
    max_result_size_chars=120_000,
)
