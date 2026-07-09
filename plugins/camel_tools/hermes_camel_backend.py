"""Host-model backend shim for CAMEL toolkits that need an LLM.

Several CAMEL toolkits — ``ImageAnalysisToolkit``, ``VideoAnalysisToolkit``,
``AudioAnalysisToolkit``, ``BrowserToolkit`` and owl's own
``DocumentProcessingToolkit`` — take a ``camel.models.BaseModelBackend`` in
their constructor and call ``model.run(messages)`` internally, reading the
result as an OpenAI ``ChatCompletion`` (``.choices[0].message.content``).

Rather than making the user configure a second set of provider keys for
CAMEL, this shim routes those model calls back through Hermes' own
centralized LLM entry point, :func:`agent.auxiliary_client.call_llm`, which
already resolves the user's active provider/model/auth and returns an
OpenAI-shaped response object. So the multimodal toolkits "just work" against
whatever model the user configured, with no extra credentials.

``camel-ai`` is an optional dependency, so this module never imports it at
top level. The concrete ``BaseModelBackend`` subclass is built lazily inside
:func:`make_hermes_camel_backend`; the actual request logic lives in the
camel-free :func:`run_via_call_llm`, which is what the unit tests exercise.
"""

from __future__ import annotations

import logging
from typing import Any, List, Optional

logger = logging.getLogger(__name__)

# Default auxiliary-task routing for CAMEL model calls. "vision" is the right
# bucket for the multimodal analysis toolkits (image/video/audio frames) and
# is a sane default for browser page reasoning too.
DEFAULT_CAMEL_TASK = "vision"


def run_via_call_llm(
    messages: List[dict],
    *,
    task: str = DEFAULT_CAMEL_TASK,
    tools: Optional[list] = None,
    temperature: Optional[float] = None,
    timeout: Optional[float] = None,
) -> Any:
    """Route a CAMEL model call through Hermes' host LLM.

    Returns the OpenAI-shaped response object from
    :func:`agent.auxiliary_client.call_llm` (``.choices[0].message.content``),
    which is exactly what CAMEL's toolkits expect back from ``model.run()``.

    Kept import-light and camel-free so it is unit-testable by monkeypatching
    ``call_llm``.
    """
    from agent.auxiliary_client import call_llm

    kwargs: dict = {"task": task, "messages": list(messages)}
    if tools:
        kwargs["tools"] = tools
    if temperature is not None:
        kwargs["temperature"] = temperature
    if timeout is not None:
        kwargs["timeout"] = timeout
    return call_llm(**kwargs)


def make_hermes_camel_backend(
    *,
    task: str = DEFAULT_CAMEL_TASK,
    model_type: str = "gpt-4o",
    temperature: Optional[float] = None,
    timeout: Optional[float] = None,
) -> Any:
    """Build a ``BaseModelBackend`` whose ``run()`` delegates to the host LLM.

    Imports ``camel`` lazily and defines the subclass at call time so this
    module stays importable without ``camel-ai``. Raises ``ImportError`` (via
    the camel import) when camel is not installed — callers in the plugin
    catch and degrade.
    """
    from camel.models import BaseModelBackend  # lazy: requires camel-ai

    class _HermesCamelBackend(BaseModelBackend):
        """Adapts Hermes' ``call_llm`` to CAMEL's model-backend contract."""

        def __init__(self) -> None:
            # model_config_dict={} — we don't forward CAMEL's sampling config;
            # the host resolves model params. Pass the declared model_type so
            # CAMEL's token-limit/counter lookups have something to key on.
            super().__init__(model_type=model_type, model_config_dict={})
            self._task = task
            self._temperature = temperature
            self._timeout = timeout
            self._token_counter_cache: Any = None

        @property
        def token_counter(self) -> Any:
            # Lazily provide a counter; CAMEL requires the property but the
            # analysis toolkits rarely invoke it. Fall back defensively.
            if self._token_counter_cache is None:
                try:
                    from camel.types import ModelType
                    from camel.utils import OpenAITokenCounter

                    self._token_counter_cache = OpenAITokenCounter(
                        ModelType.GPT_4O_MINI
                    )
                except Exception:  # noqa: BLE001
                    from camel.utils import OpenAITokenCounter

                    self._token_counter_cache = OpenAITokenCounter("gpt-4o-mini")
            return self._token_counter_cache

        def run(self, messages: List[dict], *args: Any, **kwargs: Any) -> Any:
            # CAMEL versions differ in the run() signature (some pass
            # response_format / tools). Accept and forward tools when present.
            tools = kwargs.get("tools")
            if tools is None and len(args) >= 2:
                tools = args[1]
            return run_via_call_llm(
                messages,
                task=self._task,
                tools=tools,
                temperature=self._temperature,
                timeout=self._timeout,
            )

        async def arun(self, messages: List[dict], *args: Any, **kwargs: Any) -> Any:
            # Async callers get a thread-offloaded sync call (call_llm is sync).
            import asyncio

            return await asyncio.to_thread(self.run, messages, *args, **kwargs)

        def check_model_config(self) -> None:
            # No CAMEL-side sampling config to validate; host owns model params.
            return None

    return _HermesCamelBackend()
