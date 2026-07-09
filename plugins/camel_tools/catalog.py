"""Declarative catalog of CAMEL toolkits exposed through Hermes.

Each :class:`ToolkitSpec` says *how* to construct a CAMEL toolkit and *which*
of its tools to surface, plus the Hermes toolset it lands in and any
credential requirements. The list is pure data and imports nothing from
``camel`` at module load — ``ToolkitSpec.build()`` performs the (heavy) CAMEL
import lazily, so this module is safe to import even when ``camel-ai`` is not
installed.

Grouping into per-domain toolsets (``camel_search``, ``camel_math`` …) rather
than one giant ``camel`` toolset keeps them all *non-core*, so Hermes' Tool
Search bridge (``tools/tool_search.py``) auto-defers them: the model discovers
them on demand via ``tool_search`` / ``tool_describe`` / ``tool_call`` instead
of paying their full JSON schema on every API call.

M0/M1 scope: model-agnostic toolkits only (no ``camel.models.BaseModelBackend``
dependency, no API keys for the default methods). Multimodal/browser toolkits
(which need a model backend) and credentialed toolkits are added in later
milestones.
"""

from __future__ import annotations

import importlib
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)

# LAZY_DEPS feature key (see tools/lazy_deps.py) that installs camel-ai.
CAMEL_FEATURE = "camel.tools"


@dataclass(frozen=True)
class ToolkitSpec:
    """How to construct and expose one CAMEL toolkit."""

    cls: str
    """Toolkit class name in ``camel.toolkits`` (e.g. ``"SearchToolkit"``)."""

    toolset: str
    """Hermes toolset the tools land in (kept non-core so they defer)."""

    module: str = "camel.toolkits"
    kwargs: Dict[str, Any] = field(default_factory=dict)
    """Constructor kwargs passed to the toolkit."""

    only: Optional[List[str]] = None
    """If set, only expose these CAMEL function names."""

    requires_env: Optional[List[str]] = None
    """Env vars whose absence should gate the tools (availability check)."""

    emoji: str = "🐫"
    name_prefix: str = ""

    needs_model: bool = False
    """If True, inject a Hermes-backed ``model=`` (host LLM) at build time.

    Multimodal/browser toolkits take a ``camel.models.BaseModelBackend`` and
    call it internally; we route that back to the user's active model via
    :func:`plugins.camel_tools.hermes_camel_backend.make_hermes_camel_backend`.
    """

    model_task: str = "vision"
    """Auxiliary-task bucket for the injected backend's ``call_llm`` routing."""

    def build(self) -> Any:
        """Import and instantiate the CAMEL toolkit. Raises if camel is absent."""
        module = importlib.import_module(self.module)
        toolkit_cls = getattr(module, self.cls)
        kwargs = dict(self.kwargs)
        if self.needs_model and "model" not in kwargs:
            from plugins.camel_tools.hermes_camel_backend import (
                make_hermes_camel_backend,
            )

            kwargs["model"] = make_hermes_camel_backend(task=self.model_task)
        return toolkit_cls(**kwargs)

    def check_fn(self) -> Optional[Callable[[], bool]]:
        """Return an availability check gating on required env vars, or None."""
        if not self.requires_env:
            return None
        import os

        required = tuple(self.requires_env)

        def _available() -> bool:
            return all(os.environ.get(name) for name in required)

        return _available


# M0/M1 — model-agnostic toolkits. Ordered so the M0 proof tool
# (SearchToolkit.search_duckduckgo) comes first.
TOOLKIT_SPECS: List[ToolkitSpec] = [
    ToolkitSpec(
        cls="SearchToolkit",
        toolset="camel_search",
        # No-key engines first; keyed engines (google/bocha) gate themselves
        # inside CAMEL and are added with requires_env in M1.
        only=["search_duckduckgo", "search_wiki", "search_baidu"],
        emoji="🔎",
    ),
    # Keyed search engines — same SearchToolkit class, gated on their API keys
    # so they only surface when configured (key names per owl .env_template).
    ToolkitSpec(
        cls="SearchToolkit",
        toolset="camel_search",
        only=["search_google"],
        requires_env=["GOOGLE_API_KEY", "SEARCH_ENGINE_ID"],
        emoji="🔎",
    ),
    ToolkitSpec(
        cls="SearchToolkit",
        toolset="camel_search",
        only=["search_bocha"],
        requires_env=["BOCHA_API_KEY"],
        emoji="🔎",
    ),
    # ── Academic / research ────────────────────────────────────────────────
    ToolkitSpec(cls="ArxivToolkit", toolset="camel_academic", emoji="📄"),
    ToolkitSpec(cls="SemanticScholarToolkit", toolset="camel_academic", emoji="🎓"),
    ToolkitSpec(cls="GoogleScholarToolkit", toolset="camel_academic", emoji="🎓"),
    # ── Data / documents ───────────────────────────────────────────────────
    ToolkitSpec(cls="ExcelToolkit", toolset="camel_data", emoji="📊"),
    ToolkitSpec(cls="NetworkXToolkit", toolset="camel_data", emoji="🕸️"),
    # ── Math ───────────────────────────────────────────────────────────────
    ToolkitSpec(cls="MathToolkit", toolset="camel_math", emoji="🧮"),
    ToolkitSpec(cls="SymPyToolkit", toolset="camel_math", emoji="➗"),
    # ── Weather (keyed) ────────────────────────────────────────────────────
    ToolkitSpec(
        cls="WeatherToolkit",
        toolset="camel_weather",
        requires_env=["OPENWEATHERMAP_API_KEY"],
        emoji="🌦️",
    ),
    # ── Credentialed services (gated on their API keys; env var names follow
    #    CAMEL 0.2.84 / owl conventions) ─────────────────────────────────────
    ToolkitSpec(
        cls="GithubToolkit",
        toolset="camel_dev",
        requires_env=["GITHUB_ACCESS_TOKEN"],
        emoji="🐙",
    ),
    ToolkitSpec(
        cls="NotionToolkit",
        toolset="camel_productivity",
        requires_env=["NOTION_TOKEN"],
        emoji="📝",
    ),
    ToolkitSpec(
        cls="GoogleMapsToolkit",
        toolset="camel_maps",
        requires_env=["GOOGLE_MAPS_API_KEY"],
        emoji="🗺️",
    ),
    ToolkitSpec(
        cls="RedditToolkit",
        toolset="camel_social",
        requires_env=["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET", "REDDIT_USER_AGENT"],
        emoji="👽",
    ),
    # NOTE: DalleToolkit is omitted — Hermes ships native image generation
    # (plugins/image_gen). OpenAPIToolkit is omitted — it needs a per-call
    # OpenAPI spec path in its constructor, so there's no zero-config default.
    # ── Multimodal (need a model backend → routed to the host LLM) ─────────
    ToolkitSpec(
        cls="ImageAnalysisToolkit",
        toolset="camel_vision",
        needs_model=True,
        model_task="vision",
        emoji="🖼️",
    ),
    ToolkitSpec(
        cls="VideoAnalysisToolkit",
        toolset="camel_video",
        needs_model=True,
        model_task="vision",
        emoji="🎬",
    ),
    ToolkitSpec(
        cls="AudioAnalysisToolkit",
        toolset="camel_audio",
        needs_model=True,
        model_task="vision",
        emoji="🎧",
    ),
    # ── Browser automation (Playwright; also drives sub-models) ────────────
    ToolkitSpec(
        cls="BrowserToolkit",
        toolset="camel_browser",
        needs_model=True,
        model_task="vision",
        emoji="🌐",
    ),
    # NOTE: CAMEL's CodeExecutionToolkit is intentionally NOT exposed — Hermes
    # already ships native sandboxed code execution (tools/code_execution_tool.py
    # + the terminal/environments backends). Reuse owl for what Hermes lacks;
    # don't duplicate what it already does better.
    #
    # NOTE: owl's DocumentProcessingToolkit (word/excel/pdf/ppt → text) is NOT
    # vendored here — it pulls a heavy tail (chunkr_ai, crawl4ai, xmltodict,
    # global nest_asyncio.apply()). Document→text parsing is handled instead by
    # the /mnt/user-data upload auto-conversion path (M4).
]
