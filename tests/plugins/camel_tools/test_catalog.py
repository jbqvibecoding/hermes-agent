"""Tests for the CAMEL toolkit catalog (plugins/camel_tools/catalog.py).

These validate the declarative spec list and its env-gating logic without
importing ``camel`` — ``ToolkitSpec.build()`` is the only camel-touching path
and is exercised by the camel-gated integration test in test_adapter.py.
"""

from __future__ import annotations

import pytest

from plugins.camel_tools.catalog import CAMEL_FEATURE, TOOLKIT_SPECS, ToolkitSpec


def test_specs_are_well_formed():
    assert TOOLKIT_SPECS, "catalog must not be empty"
    for spec in TOOLKIT_SPECS:
        assert spec.cls, "every spec needs a toolkit class name"
        assert spec.toolset.startswith("camel_"), (
            f"{spec.cls} toolset {spec.toolset!r} must be a non-core camel_* "
            "toolset so the Tool Search bridge defers it"
        )
        assert spec.module == "camel.toolkits"


def test_toolsets_are_non_core():
    # Non-core toolsets are what make the tools deferrable behind tool_search.
    # A bare "camel" or any core toolset name would defeat that; assert none.
    core_like = {"camel", "search", "web", "file", "terminal", "code_execution"}
    for spec in TOOLKIT_SPECS:
        assert spec.toolset not in core_like


def test_code_execution_is_not_exposed():
    # Hermes has native sandboxed code execution; we must not duplicate it.
    assert not any("CodeExecution" in s.cls for s in TOOLKIT_SPECS)


def test_dalle_and_openapi_are_not_exposed():
    # DalleToolkit duplicates Hermes' native image_gen; OpenAPIToolkit needs a
    # per-call spec path with no zero-config default. Both are intentionally out.
    names = {s.cls for s in TOOLKIT_SPECS}
    assert "DalleToolkit" not in names
    assert "OpenAPIToolkit" not in names


def test_credentialed_toolkits_are_env_gated():
    """Every credentialed service spec must carry a requires_env gate."""
    by_cls = {s.cls: s for s in TOOLKIT_SPECS}
    for cls in ("GithubToolkit", "NotionToolkit", "GoogleMapsToolkit", "RedditToolkit"):
        assert cls in by_cls, f"{cls} missing from catalog"
        spec = by_cls[cls]
        assert spec.requires_env, f"{cls} must be env-gated"
        assert spec.check_fn() is not None


def test_check_fn_none_when_no_required_env():
    spec = ToolkitSpec(cls="MathToolkit", toolset="camel_math")
    assert spec.check_fn() is None


def test_check_fn_gates_on_env(monkeypatch):
    spec = ToolkitSpec(
        cls="WeatherToolkit",
        toolset="camel_weather",
        requires_env=["OPENWEATHERMAP_API_KEY"],
    )
    check = spec.check_fn()
    assert check is not None

    monkeypatch.delenv("OPENWEATHERMAP_API_KEY", raising=False)
    assert check() is False

    monkeypatch.setenv("OPENWEATHERMAP_API_KEY", "abc123")
    assert check() is True


def test_check_fn_requires_all_env_vars(monkeypatch):
    spec = ToolkitSpec(
        cls="SearchToolkit",
        toolset="camel_search",
        only=["search_google"],
        requires_env=["GOOGLE_API_KEY", "SEARCH_ENGINE_ID"],
    )
    check = spec.check_fn()
    monkeypatch.setenv("GOOGLE_API_KEY", "k")
    monkeypatch.delenv("SEARCH_ENGINE_ID", raising=False)
    assert check() is False  # partial config is not available
    monkeypatch.setenv("SEARCH_ENGINE_ID", "id")
    assert check() is True


def test_camel_feature_key_matches_lazy_deps():
    from tools.lazy_deps import LAZY_DEPS

    assert CAMEL_FEATURE in LAZY_DEPS
    assert LAZY_DEPS[CAMEL_FEATURE] == ("camel-ai[owl]==0.2.84",)


def test_build_raises_without_camel_when_absent():
    # When camel is not installed, build() should raise (import error), which
    # the plugin's register() catches and logs. When camel IS installed this
    # would succeed, so only assert the failure path in the absent case.
    pytest.importorskip  # noqa: B018 — keep import symmetry with other tests
    import importlib.util

    if importlib.util.find_spec("camel") is not None:
        pytest.skip("camel installed; build() success path covered elsewhere")
    spec = ToolkitSpec(cls="MathToolkit", toolset="camel_math")
    with pytest.raises(ModuleNotFoundError):
        spec.build()
