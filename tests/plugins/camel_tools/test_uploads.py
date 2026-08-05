"""Tests for the /mnt/user-data upload → Markdown conversion (C3).

The ``markitdown`` dependency is stubbed via an injected converter, so these
run without it installed; a dependency-gated test at the bottom exercises the
real library when it is present.
"""

from __future__ import annotations

import json

import pytest

from plugins.camel_tools.uploads import (
    SUPPORTED_FORMATS,
    ConversionResult,
    ConversionUnavailable,
    convert_file,
    convert_session_uploads,
    convert_uploads,
    is_supported,
    iter_uploads,
)


class FakeConverter:
    """Mimics markitdown.MarkItDown: .convert(path).text_content."""

    def __init__(self, *, fail_on: str = "", text: str = "# Converted\n"):
        self.fail_on = fail_on
        self.text = text
        self.calls: list[str] = []

    def convert(self, path: str):
        self.calls.append(path)
        if self.fail_on and self.fail_on in path:
            raise RuntimeError("corrupt document")

        class _Result:
            text_content = self.text

        return _Result()


def _upload(tmp_path, name: str, body: bytes = b"x"):
    uploads = tmp_path / "uploads"
    uploads.mkdir(exist_ok=True)
    target = uploads / name
    target.write_bytes(body)
    return target


# ---------------------------------------------------------------------------
# Format support
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("ext", [".pdf", ".docx", ".xlsx", ".pptx", ".csv", ".md"])
def test_office_and_text_formats_are_supported(ext):
    assert is_supported(f"report{ext}")


def test_extension_check_is_case_insensitive():
    assert is_supported("REPORT.PDF")


def test_unknown_formats_are_not_supported():
    assert not is_supported("binary.exe")
    assert not is_supported("noext")


def test_the_four_office_formats_the_gap_was_about_are_covered():
    for ext in (".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"):
        assert ext in SUPPORTED_FORMATS


# ---------------------------------------------------------------------------
# Single-file conversion
# ---------------------------------------------------------------------------


def test_convert_file_returns_markdown(tmp_path):
    src = _upload(tmp_path, "a.pdf")
    assert convert_file(src, converter=FakeConverter()) == "# Converted\n"


def test_convert_file_missing_path_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        convert_file(tmp_path / "nope.pdf", converter=FakeConverter())


def test_convert_file_unsupported_format_raises(tmp_path):
    src = _upload(tmp_path, "a.exe")
    with pytest.raises(ValueError):
        convert_file(src, converter=FakeConverter())


def test_missing_markitdown_raises_conversion_unavailable(tmp_path, monkeypatch):
    import builtins

    real_import = builtins.__import__

    def _no_markitdown(name, *args, **kwargs):
        if name == "markitdown":
            raise ImportError("No module named 'markitdown'")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", _no_markitdown)
    src = _upload(tmp_path, "a.pdf")
    with pytest.raises(ConversionUnavailable):
        convert_file(src)


# ---------------------------------------------------------------------------
# Batch conversion
# ---------------------------------------------------------------------------


def test_converts_uploads_into_workspace(tmp_path):
    _upload(tmp_path, "report.pdf")
    _upload(tmp_path, "sheet.xlsx")
    out = tmp_path / "workspace"

    result = convert_uploads(tmp_path / "uploads", out, converter=FakeConverter())

    assert len(result.converted) == 2
    assert (out / "report.pdf.md").read_text() == "# Converted\n"
    assert (out / "sheet.xlsx.md").exists()


def test_original_extension_is_kept_so_names_cannot_collide(tmp_path):
    _upload(tmp_path, "data.csv")
    _upload(tmp_path, "data.xlsx")
    out = tmp_path / "workspace"

    convert_uploads(tmp_path / "uploads", out, converter=FakeConverter())

    assert (out / "data.csv.md").exists()
    assert (out / "data.xlsx.md").exists()


def test_unsupported_files_are_skipped_not_failed(tmp_path):
    _upload(tmp_path, "keep.pdf")
    _upload(tmp_path, "binary.exe")

    result = convert_uploads(
        tmp_path / "uploads", tmp_path / "workspace", converter=FakeConverter()
    )

    assert len(result.converted) == 1
    assert result.skipped and result.skipped[0].endswith("binary.exe")
    assert not result.failed


def test_one_bad_document_does_not_sink_the_batch(tmp_path):
    _upload(tmp_path, "good.pdf")
    _upload(tmp_path, "bad.pdf")

    result = convert_uploads(
        tmp_path / "uploads",
        tmp_path / "workspace",
        converter=FakeConverter(fail_on="bad.pdf"),
    )

    assert len(result.converted) == 1
    assert any("bad.pdf" in path for path in result.failed)
    assert "corrupt document" in "".join(result.failed.values())


def test_existing_output_is_not_clobbered_by_default(tmp_path):
    _upload(tmp_path, "report.pdf")
    out = tmp_path / "workspace"
    out.mkdir()
    (out / "report.pdf.md").write_text("hand-edited")

    result = convert_uploads(tmp_path / "uploads", out, converter=FakeConverter())

    assert (out / "report.pdf.md").read_text() == "hand-edited"
    assert result.failed


def test_overwrite_replaces_existing_output(tmp_path):
    _upload(tmp_path, "report.pdf")
    out = tmp_path / "workspace"
    out.mkdir()
    (out / "report.pdf.md").write_text("stale")

    convert_uploads(
        tmp_path / "uploads", out, overwrite=True, converter=FakeConverter()
    )

    assert (out / "report.pdf.md").read_text() == "# Converted\n"


def test_nested_uploads_are_found(tmp_path):
    nested = tmp_path / "uploads" / "sub"
    nested.mkdir(parents=True)
    (nested / "deep.pdf").write_bytes(b"x")

    result = convert_uploads(
        tmp_path / "uploads", tmp_path / "workspace", converter=FakeConverter()
    )

    assert len(result.converted) == 1


def test_empty_or_missing_uploads_dir_is_a_noop(tmp_path):
    assert iter_uploads(tmp_path / "nope") == []
    result = convert_uploads(
        tmp_path / "nope", tmp_path / "workspace", converter=FakeConverter()
    )
    assert result.converted == {} and result.failed == {}
    # No output directory is created for an empty batch.
    assert not (tmp_path / "workspace").exists()


def test_parallel_and_serial_agree(tmp_path):
    for i in range(5):
        _upload(tmp_path, f"f{i}.pdf")

    par = convert_uploads(
        tmp_path / "uploads",
        tmp_path / "p",
        parallel=True,
        converter=FakeConverter(),
    )
    ser = convert_uploads(
        tmp_path / "uploads",
        tmp_path / "s",
        parallel=False,
        converter=FakeConverter(),
    )
    assert len(par.converted) == len(ser.converted) == 5


def test_summary_reports_all_three_buckets():
    result = ConversionResult(
        converted={"a": "a.md"}, skipped=["b"], failed={"c": "boom"}
    )
    summary = result.summary()
    assert "1 converted" in summary and "1 skipped" in summary and "1 failed" in summary


# ---------------------------------------------------------------------------
# Workspace wiring + tool handler
# ---------------------------------------------------------------------------


def test_session_conversion_uses_the_user_data_contract(tmp_path):
    from plugins.camel_tools.workspace import ensure_dirs, resolve_workspace

    paths = ensure_dirs(resolve_workspace(tmp_path, "sess-1"))
    (paths.uploads / "brief.docx").write_bytes(b"x")

    result = convert_session_uploads(
        "sess-1", hermes_home=str(tmp_path), converter=FakeConverter()
    )

    assert len(result.converted) == 1
    assert (paths.workspace / "brief.docx.md").exists()


def test_tool_handler_returns_paths_not_document_text(tmp_path, monkeypatch):
    """Converted text can be huge; the tool must return paths so the model
    reads them on demand instead of swallowing the whole document."""
    from plugins.camel_tools import _convert_uploads_tool
    from plugins.camel_tools.workspace import ensure_dirs, resolve_workspace

    paths = ensure_dirs(resolve_workspace(tmp_path, "default"))
    (paths.uploads / "big.pdf").write_bytes(b"x")

    monkeypatch.setattr(
        "plugins.camel_tools.uploads._converter",
        lambda: FakeConverter(text="a very long document " * 500),
    )
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setattr("hermes_constants.get_hermes_home", lambda: str(tmp_path))

    payload = json.loads(_convert_uploads_tool({}))

    assert payload["summary"].startswith("1 converted")
    assert list(payload["converted"].values())[0].endswith("big.pdf.md")
    assert "a very long document" not in json.dumps(payload)


def test_tool_handler_reports_missing_dependency(monkeypatch):
    from plugins.camel_tools import _convert_uploads_tool

    def _unavailable(*_a, **_kw):
        raise ConversionUnavailable("markitdown is not installed.")

    monkeypatch.setattr(
        "plugins.camel_tools.uploads.convert_session_uploads", _unavailable
    )
    payload = json.loads(_convert_uploads_tool({}))
    assert "markitdown is not installed" in payload["error"]


def test_lazy_dep_key_is_registered():
    from tools.lazy_deps import LAZY_DEPS

    from plugins.camel_tools.uploads import MARKITDOWN_FEATURE

    assert MARKITDOWN_FEATURE in LAZY_DEPS
    (spec,) = LAZY_DEPS[MARKITDOWN_FEATURE]
    assert spec.startswith("markitdown")


def test_converter_does_not_require_camel():
    """The whole point of depending on markitdown directly: conversion works
    on installs that never enable the CAMEL bridge."""
    import plugins.camel_tools.uploads as uploads_mod

    source = (
        __import__("pathlib").Path(uploads_mod.__file__).read_text(encoding="utf-8")
    )
    assert "import camel" not in source
    assert "from camel" not in source


# ---------------------------------------------------------------------------
# markitdown-gated: exercise the real library when installed
# ---------------------------------------------------------------------------


def test_real_markitdown_converts_a_csv(tmp_path):
    pytest.importorskip("markitdown", reason="markitdown not installed")
    src = _upload(tmp_path, "table.csv", b"name,qty\nwidget,3\n")
    text = convert_file(src)
    assert "widget" in text
