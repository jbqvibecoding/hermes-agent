"""Unit tests for the CAMEL→Hermes tool adapter (plugins/camel_tools/adapter.py).

These prove the integration paradigm WITHOUT requiring the heavy ``camel-ai``
dependency: the adapter is duck-typed, so a lightweight stub mimicking CAMEL's
``FunctionTool`` surface exercises the full conversion + registration path.

A separate camel-gated integration test at the bottom actually builds a real
CAMEL toolkit; it is skipped when ``camel`` is not importable (e.g. local dev)
and runs in CI where the dependency is present.
"""

from __future__ import annotations

import json
from typing import Any, Callable, Dict, List, Optional

import pytest

from plugins.camel_tools.adapter import (
    hermes_schema_from_camel,
    make_handler,
    register_function_tool,
    register_toolkit,
)


# ---------------------------------------------------------------------------
# Stubs mimicking CAMEL's FunctionTool / BaseToolkit surface
# ---------------------------------------------------------------------------


class FakeFunctionTool:
    """Mimics camel.toolkits.FunctionTool's public surface used by the adapter."""

    def __init__(self, func: Callable[..., Any], schema: Dict[str, Any]):
        self.func = func
        self._schema = schema

    def get_openai_tool_schema(self) -> Dict[str, Any]:
        return self._schema


class FakeToolkit:
    """Mimics camel.toolkits.BaseToolkit.get_tools()."""

    def __init__(self, tools: List[FakeFunctionTool]):
        self._tools = tools

    def get_tools(self) -> List[FakeFunctionTool]:
        return list(self._tools)


class FakeCtx:
    """Records ctx.register_tool(...) calls the way the plugin loader would."""

    def __init__(self) -> None:
        self.registered: List[Dict[str, Any]] = []

    def register_tool(
        self,
        *,
        name,
        toolset,
        schema,
        handler,
        check_fn=None,
        requires_env=None,
        emoji="",
        **_,
    ) -> None:
        self.registered.append({
            "name": name,
            "toolset": toolset,
            "schema": schema,
            "handler": handler,
            "check_fn": check_fn,
            "requires_env": requires_env,
            "emoji": emoji,
        })


def _openai_schema(
    name: str, description: str, properties: dict, required: list
) -> dict:
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": {
                "type": "object",
                "properties": properties,
                "required": required,
            },
        },
    }


def _search_tool() -> FakeFunctionTool:
    def search_duckduckgo(query: str, max_results: int = 5) -> list:
        return [{"title": f"hit for {query}", "n": max_results}]

    schema = _openai_schema(
        "search_duckduckgo",
        "Search DuckDuckGo for a query.",
        {"query": {"type": "string"}, "max_results": {"type": "integer"}},
        ["query"],
    )
    return FakeFunctionTool(search_duckduckgo, schema)


# ---------------------------------------------------------------------------
# Schema conversion
# ---------------------------------------------------------------------------


def test_schema_unwraps_openai_function_envelope():
    schema = hermes_schema_from_camel(_search_tool())
    assert schema["name"] == "search_duckduckgo"
    assert schema["description"] == "Search DuckDuckGo for a query."
    # Flat Hermes shape: parameters is the inner object, no {"type":"function"} wrapper.
    assert schema["parameters"]["properties"]["query"] == {"type": "string"}
    assert "function" not in schema


def test_schema_accepts_attribute_only_functiontool():
    class AttrOnly:
        openai_tool_schema = _openai_schema("m", "d", {}, [])
        func = staticmethod(lambda: "ok")

    schema = hermes_schema_from_camel(AttrOnly())
    assert schema["name"] == "m"


def test_schema_missing_name_raises():
    bad = FakeFunctionTool(lambda: None, {"function": {"description": "no name"}})
    with pytest.raises(ValueError):
        hermes_schema_from_camel(bad)


def test_schema_defaults_parameters_when_absent():
    ft = FakeFunctionTool(lambda: None, {"function": {"name": "noparams"}})
    schema = hermes_schema_from_camel(ft)
    assert schema["parameters"] == {"type": "object", "properties": {}}


# ---------------------------------------------------------------------------
# Handler
# ---------------------------------------------------------------------------


def test_handler_calls_func_and_returns_json_string():
    handler = make_handler(_search_tool())
    out = handler({"query": "hermes", "max_results": 3})
    payload = json.loads(out)
    assert payload["result"] == [{"title": "hit for hermes", "n": 3}]


def test_handler_wraps_dict_result_directly():
    ft = FakeFunctionTool(
        lambda: {"success": True, "n": 1}, _openai_schema("d", "", {}, [])
    )
    payload = json.loads(make_handler(ft)())
    assert payload == {"success": True, "n": 1}


def test_handler_bad_arguments_returns_tool_error():
    handler = make_handler(_search_tool())
    payload = json.loads(handler({"not_a_param": 1}))
    assert "error" in payload
    assert "bad arguments" in payload["error"]


def test_handler_exception_returns_tool_error():
    def boom(**_):
        raise RuntimeError("kaboom")

    ft = FakeFunctionTool(boom, _openai_schema("boom", "", {}, []))
    payload = json.loads(make_handler(ft)({}))
    assert "error" in payload
    assert "kaboom" in payload["error"]


def test_handler_stringifies_non_json_result():
    class Weird:
        def __repr__(self) -> str:
            return "<weird>"

    ft = FakeFunctionTool(lambda: Weird(), _openai_schema("w", "", {}, []))
    payload = json.loads(make_handler(ft)())
    assert payload["result"] == "<weird>"


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------


def test_register_function_tool_registers_into_ctx():
    ctx = FakeCtx()
    name = register_function_tool(
        ctx, _search_tool(), toolset="camel_search", emoji="🔎"
    )
    assert name == "search_duckduckgo"
    assert len(ctx.registered) == 1
    entry = ctx.registered[0]
    assert entry["toolset"] == "camel_search"
    assert entry["emoji"] == "🔎"
    assert entry["schema"]["name"] == "search_duckduckgo"
    # The registered handler is callable and returns the tool's JSON result.
    assert json.loads(entry["handler"]({"query": "x"}))["result"]


def test_register_toolkit_respects_only_allowlist():
    ctx = FakeCtx()
    extra = FakeFunctionTool(lambda: 1, _openai_schema("search_wiki", "", {}, []))
    toolkit = FakeToolkit([_search_tool(), extra])
    names = register_toolkit(
        ctx, toolkit, toolset="camel_search", only=["search_duckduckgo"]
    )
    assert names == ["search_duckduckgo"]
    assert [e["name"] for e in ctx.registered] == ["search_duckduckgo"]


def test_register_toolkit_dedupes_via_seen():
    ctx = FakeCtx()
    seen: set = set()
    tk1 = FakeToolkit([_search_tool()])
    tk2 = FakeToolkit([_search_tool()])  # same tool name again
    register_toolkit(ctx, tk1, toolset="a", seen=seen)
    register_toolkit(ctx, tk2, toolset="b", seen=seen)
    assert [e["name"] for e in ctx.registered] == ["search_duckduckgo"]


def test_register_applies_name_prefix():
    ctx = FakeCtx()
    register_toolkit(
        ctx, FakeToolkit([_search_tool()]), toolset="camel_search", name_prefix="camel_"
    )
    assert ctx.registered[0]["name"] == "camel_search_duckduckgo"
    assert ctx.registered[0]["schema"]["name"] == "camel_search_duckduckgo"


# ---------------------------------------------------------------------------
# camel-gated integration test (skipped without camel-ai installed)
# ---------------------------------------------------------------------------


def test_real_camel_search_toolkit_registers():
    pytest.importorskip("camel", reason="camel-ai not installed")
    from camel.toolkits import SearchToolkit  # type: ignore

    ctx = FakeCtx()
    names = register_toolkit(
        ctx, SearchToolkit(), toolset="camel_search", only=["search_duckduckgo"]
    )
    assert "search_duckduckgo" in names
    entry = next(e for e in ctx.registered if e["name"] == "search_duckduckgo")
    assert entry["schema"]["parameters"]["type"] == "object"
