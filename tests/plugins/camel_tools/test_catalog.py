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
    """The lazy-deps spec and the pyproject `camel` extra must stay in lockstep.

    Asserting they equal each other (rather than a hardcoded version) keeps the
    real invariant — both comments say "bump in lockstep" — without this test
    needing an edit on every version bump.
    """
    from pathlib import Path

    from tools.lazy_deps import LAZY_DEPS

    assert CAMEL_FEATURE in LAZY_DEPS
    (spec,) = LAZY_DEPS[CAMEL_FEATURE]
    assert spec.startswith("camel-ai[owl]==")

    pyproject = (Path(__file__).resolve().parents[3] / "pyproject.toml").read_text(
        encoding="utf-8"
    )
    assert f'camel = ["{spec}"]' in pyproject, (
        f"pyproject.toml `camel` extra is out of lockstep with LAZY_DEPS ({spec})"
    )


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


# ---------------------------------------------------------------------------
# C2: catalog expansion (checked against camel-ai 0.2.90)
# ---------------------------------------------------------------------------


def test_datacommons_is_exposed_and_key_gated():
    """DataCommons was named in the original owl toolkit list but was the one
    entry never wired up and never documented as a deliberate skip."""
    spec = next(s for s in TOOLKIT_SPECS if s.cls == "DataCommonsToolkit")
    assert spec.requires_env == ["DATACOMMONS_API_KEY"]


@pytest.mark.parametrize(
    "cls_name",
    [
        "FileToolkit",
        "PPTXToolkit",
        "PubMedToolkit",
        "SearxNGToolkit",
        "WolframAlphaToolkit",
        "AskNewsToolkit",
        "GoogleCalendarToolkit",
        "GmailToolkit",
        "SlackToolkit",
        "VideoDownloaderToolkit",
    ],
)
def test_expanded_toolkits_present(cls_name):
    assert any(s.cls == cls_name for s in TOOLKIT_SPECS)


@pytest.mark.parametrize(
    "cls_name",
    [
        # Needs a live camel ChatAgent; Hermes owns delegation.
        "AgentToolkit",
        # Needs a Node.js + npm Playwright runtime beside Python.
        "HybridBrowserToolkit",
        # Scrapes SERP DOM with hand-written JS; breaks on any page change.
        "HeadlessBrowserSearchToolkit",
        # Deprecated upstream in favour of FileToolkit.
        "MarkItDownToolkit",
        # Hermes ships better equivalents.
        "TodoToolkit",
        "SkillToolkit",
        "PlanningWorktreeToolkit",
        # Overlaps VideoAnalysisToolkit and is a paid API.
        "TwelveLabsToolkit",
    ],
)
def test_deliberately_excluded_toolkits_stay_out(cls_name):
    assert not any(s.cls == cls_name for s in TOOLKIT_SPECS)


def test_credentialed_specs_all_declare_requires_env():
    """Every spec whose service needs a secret must gate on it, so an
    unconfigured install never advertises a tool that cannot work."""
    keyed = {
        "DataCommonsToolkit",
        "SearxNGToolkit",
        "WolframAlphaToolkit",
        "AskNewsToolkit",
        "GoogleCalendarToolkit",
        "GmailToolkit",
        "SlackToolkit",
    }
    for spec in TOOLKIT_SPECS:
        if spec.cls in keyed:
            assert spec.requires_env, f"{spec.cls} must declare requires_env"


def test_env_kwargs_fill_from_environment(monkeypatch):
    spec = next(s for s in TOOLKIT_SPECS if s.cls == "SearxNGToolkit")
    assert spec.env_kwargs == {"searxng_host": "SEARXNG_HOST"}
    monkeypatch.setenv("SEARXNG_HOST", "https://searx.internal")
    captured = {}

    class FakeModule:
        class SearxNGToolkit:
            def __init__(self, **kwargs):
                captured.update(kwargs)

    monkeypatch.setattr(
        "importlib.import_module", lambda name: FakeModule, raising=True
    )
    spec.build()
    assert captured["searxng_host"] == "https://searx.internal"


def test_env_kwargs_omitted_when_unset(monkeypatch):
    spec = ToolkitSpec(
        cls="X", toolset="camel_x", env_kwargs={"host": "SOME_UNSET_VAR_XYZ"}
    )
    monkeypatch.delenv("SOME_UNSET_VAR_XYZ", raising=False)
    captured = {}

    class FakeModule:
        class X:
            def __init__(self, **kwargs):
                captured.update(kwargs)

    monkeypatch.setattr(
        "importlib.import_module", lambda name: FakeModule, raising=True
    )
    spec.build()
    assert "host" not in captured


def test_workspace_kwarg_points_at_the_user_data_workspace(monkeypatch, tmp_path):
    monkeypatch.setenv("HOME", str(tmp_path))
    spec = next(s for s in TOOLKIT_SPECS if s.cls == "FileToolkit")
    assert spec.workspace_kwarg == "working_directory"
    captured = {}

    class FakeModule:
        class FileToolkit:
            def __init__(self, **kwargs):
                captured.update(kwargs)

    monkeypatch.setattr(
        "importlib.import_module", lambda name: FakeModule, raising=True
    )
    spec.build()
    assert captured["working_directory"].endswith("/workspace")
