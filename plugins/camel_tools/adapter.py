"""Adapter: CAMEL ``FunctionTool`` → Hermes tool registration.

owl's "crown-jewel" toolkits live in the ``camel-ai`` package
(``camel.toolkits.*``), not in owl itself. Each toolkit exposes its
capabilities as a list of :class:`camel.toolkits.FunctionTool` objects via
``toolkit.get_tools()``. A ``FunctionTool`` already carries an OpenAI-format
JSON schema (CAMEL derives it from the wrapped method's type hints +
docstring) and a reference to the underlying callable.

This module turns any such ``FunctionTool`` into the ``(name, schema,
handler)`` triple Hermes' :func:`tools.registry.registry.register` expects,
so the *implementation* is reused verbatim and only the thin schema/handler
envelope is re-expressed in Hermes terms.

The functions here are **duck-typed** — they never ``import camel`` — so they
can be unit-tested with a lightweight stub that mimics the ``FunctionTool``
surface (``get_openai_tool_schema()`` / ``openai_tool_schema`` and ``func``).
That keeps the adapter testable in environments where the heavy ``camel-ai``
dependency is not installed.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Callable, Iterable, List, Optional, Set

from tools.registry import tool_error, tool_result

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Schema extraction
# ---------------------------------------------------------------------------


def _raw_openai_schema(function_tool: Any) -> dict:
    """Return the CAMEL FunctionTool's OpenAI schema dict.

    CAMEL exposes ``get_openai_tool_schema()`` (a method) and, on most
    versions, an ``openai_tool_schema`` attribute holding the same dict. We
    try the method first, then the attribute, so minor API drift between
    ``camel-ai`` releases doesn't break us.
    """
    getter = getattr(function_tool, "get_openai_tool_schema", None)
    if callable(getter):
        schema = getter()
        if schema:
            return schema
    schema = getattr(function_tool, "openai_tool_schema", None)
    if schema:
        return schema
    raise ValueError("FunctionTool exposes no OpenAI tool schema")


def hermes_schema_from_camel(function_tool: Any) -> dict:
    """Convert a CAMEL FunctionTool schema to Hermes' flat schema shape.

    CAMEL/OpenAI wrap the function under ``{"type": "function", "function":
    {...}}``. Hermes tool schemas are the flat inner object
    ``{"name", "description", "parameters"}`` (see e.g.
    ``plugins/spotify/tools.py``). We unwrap and normalise defensively.
    """
    raw = _raw_openai_schema(function_tool)
    fn = raw.get("function", raw) if isinstance(raw, dict) else {}
    name = fn.get("name")
    if not name:
        raise ValueError("CAMEL tool schema is missing a function name")
    parameters = fn.get("parameters")
    if not isinstance(parameters, dict):
        parameters = {"type": "object", "properties": {}}
    return {
        "name": str(name),
        "description": str(fn.get("description") or ""),
        "parameters": parameters,
    }


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------


def _json_safe(value: Any) -> Any:
    """Return *value* if JSON-serialisable, else its ``str()`` form."""
    try:
        json.dumps(value, ensure_ascii=False)
        return value
    except (TypeError, ValueError):
        return str(value)


def _resolve_callable(function_tool: Any) -> Callable[..., Any]:
    func = getattr(function_tool, "func", None) or getattr(function_tool, "_func", None)
    if not callable(func):
        raise ValueError("CAMEL FunctionTool has no callable .func")
    return func


def make_handler(
    function_tool: Any, *, name: Optional[str] = None
) -> Callable[..., str]:
    """Build a Hermes tool handler wrapping a CAMEL FunctionTool.

    Hermes handlers take ``(args: dict, **kwargs)`` and MUST return a JSON
    string. We call the underlying CAMEL method with ``**args`` and normalise
    the (arbitrary Python) return value into a JSON result envelope, funnelling
    any exception through :func:`tools.registry.tool_error`.
    """
    func = _resolve_callable(function_tool)
    tool_name = name or hermes_schema_from_camel(function_tool)["name"]

    def handler(args: Optional[dict] = None, **_kwargs: Any) -> str:
        call_args = args or {}
        # SSRF guard: validate any http(s) URL argument before the CAMEL tool
        # fetches it (blocks cloud-metadata / localhost / private-range hosts).
        try:
            from plugins.camel_tools.network_guard import NetworkGuardError, guard_args

            guard_args(call_args)
        except NetworkGuardError as exc:
            return tool_error(f"camel tool {tool_name!r} blocked unsafe URL: {exc}")
        except Exception:  # noqa: BLE001 — guard must never break a legit call
            pass
        try:
            result = func(**call_args)
        except TypeError as exc:
            return tool_error(
                f"camel tool {tool_name!r} called with bad arguments: {exc}"
            )
        except Exception as exc:  # noqa: BLE001 — surface any toolkit failure as a tool error
            return tool_error(
                f"camel tool {tool_name!r} failed: {type(exc).__name__}: {exc}"
            )
        if isinstance(result, dict):
            return tool_result(result)
        if isinstance(result, tuple):
            result = list(result)
        return tool_result({"result": _json_safe(result)})

    handler.__name__ = f"camel_{tool_name}"
    handler.__qualname__ = handler.__name__
    return handler


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


def register_function_tool(
    ctx: Any,
    function_tool: Any,
    *,
    toolset: str = "camel",
    check_fn: Optional[Callable[[], bool]] = None,
    requires_env: Optional[List[str]] = None,
    emoji: str = "",
    name_prefix: str = "",
    seen: Optional[Set[str]] = None,
) -> Optional[str]:
    """Register a single CAMEL FunctionTool via ``ctx.register_tool``.

    Returns the registered tool name, or ``None`` if it was skipped (bad
    schema or a duplicate name already claimed in *seen*).
    """
    try:
        schema = hermes_schema_from_camel(function_tool)
    except Exception as exc:  # noqa: BLE001
        logger.warning("camel-tools: skipping tool with unreadable schema: %s", exc)
        return None

    name = f"{name_prefix}{schema['name']}" if name_prefix else schema["name"]
    if seen is not None:
        if name in seen:
            logger.warning("camel-tools: duplicate tool name %r skipped", name)
            return None
        seen.add(name)

    schema = dict(schema, name=name)
    ctx.register_tool(
        name=name,
        toolset=toolset,
        schema=schema,
        handler=make_handler(function_tool, name=name),
        check_fn=check_fn,
        requires_env=requires_env,
        emoji=emoji,
    )
    return name


def register_toolkit(
    ctx: Any,
    toolkit: Any,
    *,
    toolset: str = "camel",
    only: Optional[Iterable[str]] = None,
    check_fn: Optional[Callable[[], bool]] = None,
    requires_env: Optional[List[str]] = None,
    emoji: str = "",
    name_prefix: str = "",
    seen: Optional[Set[str]] = None,
) -> List[str]:
    """Register all (or an allowlisted subset of) a CAMEL toolkit's tools.

    *only*, when given, restricts registration to CAMEL function names in the
    set (matched against the *unprefixed* CAMEL name).
    """
    only_set = set(only) if only is not None else None
    registered: List[str] = []
    for function_tool in toolkit.get_tools():
        if only_set is not None:
            try:
                camel_name = hermes_schema_from_camel(function_tool)["name"]
            except Exception:  # noqa: BLE001
                continue
            if camel_name not in only_set:
                continue
        name = register_function_tool(
            ctx,
            function_tool,
            toolset=toolset,
            check_fn=check_fn,
            requires_env=requires_env,
            emoji=emoji,
            name_prefix=name_prefix,
            seen=seen,
        )
        if name:
            registered.append(name)
    return registered
