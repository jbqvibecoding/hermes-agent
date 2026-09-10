#!/usr/bin/env python3
"""Model Council tool — one question, several models, one combined answer.

Lightweight multi-model querying (no web research): the same question is
answered independently by every council member model configured in the
AgentHarness checkout (``COUNCIL_MODEL_*`` slots in its ``.env``), then a
synthesizer reviews the outputs, resolves conflicts where possible, and
returns one combined answer together with three comparison tables —
Where Models Agree, Where Models Disagree, and Unique Discoveries (as
structured JSON, markdown inside the report, and a self-contained HTML
page on disk).

Use it when accuracy and perspective matter: investment questions,
complex decisions, creative brainstorming, or cross-validating an answer
you need to be confident about. For verified web research use the
``deep_research`` tool (optionally ``mode='council'``) instead.

Runs ``python -m workflows.deep_research.run --pipeline model_council``
in the AgentHarness checkout via the shared subprocess driver in
``tools/deep_research_tool.py`` (same ``AGENT_HARNESS_DIR`` discovery and
registration requirements).
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict

from tools.deep_research_tool import (
    _run_pipeline,
    check_deep_research_requirements,
)
from tools.registry import registry, tool_error

logger = logging.getLogger(__name__)

DEFAULT_MAX_MINUTES = 10
MIN_MINUTES = 3
MAX_MINUTES = 30


def check_model_council_requirements() -> bool:
    """Same footprint as deep_research: a runnable AgentHarness checkout.

    Member-slot configuration is validated by the pipeline itself, which
    returns a clear setup-guidance error when fewer than 2 members are
    configured.
    """
    return check_deep_research_requirements()


async def _handle_model_council(args: Dict[str, Any], **kwargs: Any) -> str:
    question = str(args.get("question", "")).strip()
    if not question:
        return tool_error("model_council requires a non-empty 'question'")
    try:
        max_minutes = int(args.get("max_minutes", DEFAULT_MAX_MINUTES))
    except (TypeError, ValueError):
        max_minutes = DEFAULT_MAX_MINUTES
    max_minutes = max(MIN_MINUTES, min(MAX_MINUTES, max_minutes))

    try:
        result = await _run_pipeline(
            question, "quick", max_minutes, pipeline="model_council",
            peer_review=bool(args.get("peer_review", False)),
        )
    except FileNotFoundError as exc:
        return tool_error(f"model_council launch failed: {exc}")

    if result.get("status") == "ok":
        # The combined answer IS the deliverable — name it accordingly.
        result["answer"] = result.pop("report", "")
        result.pop("verification_summary", None)
        result.pop("stats", None)
        # No web research happens here, so a citation audit would have
        # nothing to audit against; drop it rather than report an empty one.
        result.pop("citation_audit", None)
        result.pop("citation_audit_path", None)
    return json.dumps(result, ensure_ascii=False)


MODEL_COUNCIL_SCHEMA = {
    "name": "model_council",
    "description": (
        "Ask the same question to several different LLMs at once (the "
        "configured council members, e.g. GPT / Claude / Gemini class "
        "models) and get ONE synthesized answer plus three comparison "
        "tables: Where Models Agree (finding × models × evidence), Where "
        "Models Disagree (topic × per-model positions × why they differ), "
        "and Unique Discoveries (model × finding × why it matters). "
        "Direct model answers only — no web research (use deep_research "
        "for that). Good for cross-validation, weighing options, and "
        "brainstorming where model blind spots are costly. Takes a few "
        "minutes; call this tool BY ITSELF, not alongside other tool "
        "calls in the same turn."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "question": {
                "type": "string",
                "description": (
                    "The question, phrased self-contained (members see "
                    "only this text, not the conversation)."
                ),
            },
            "peer_review": {
                "type": "boolean",
                "description": (
                    "Add an anonymized peer-review round: each member "
                    "ranks the other members' answers blind (authorship "
                    "hidden, self-votes excluded), adding a Peer Review "
                    "Ranking table and letting the synthesis lean on the "
                    "council's own verdict. Costs one extra call per "
                    "member. Use when accuracy matters more than speed. "
                    "Default false."
                ),
                "default": False,
            },
            "max_minutes": {
                "type": "integer",
                "description": (
                    f"Wall-clock budget in minutes (clamped to "
                    f"{MIN_MINUTES}-{MAX_MINUTES}, default "
                    f"{DEFAULT_MAX_MINUTES})."
                ),
                "default": DEFAULT_MAX_MINUTES,
            },
        },
        "required": ["question"],
    },
}


registry.register(
    name="model_council",
    toolset="model_council",
    schema=MODEL_COUNCIL_SCHEMA,
    handler=_handle_model_council,
    check_fn=check_model_council_requirements,
    requires_env=[],
    is_async=True,
    emoji="🏛️",
    max_result_size_chars=120_000,
)
