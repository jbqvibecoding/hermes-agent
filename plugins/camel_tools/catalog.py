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

    def build(self) -> Any:
        """Import and instantiate the CAMEL toolkit. Raises if camel is absent."""
        module = importlib.import_module(self.module)
        toolkit_cls = getattr(module, self.cls)
        return toolkit_cls(**self.kwargs)

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
    ToolkitSpec(
        cls="MathToolkit",
        toolset="camel_math",
        emoji="🧮",
    ),
]
