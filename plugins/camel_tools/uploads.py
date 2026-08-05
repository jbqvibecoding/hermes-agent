"""Convert ``/mnt/user-data/uploads`` documents to Markdown.

Ported from CAMEL-AI's ``camel/loaders/markitdown.py`` (``MarkItDownLoader``):

    Copyright 2023-2026 @ CAMEL-AI.org. All Rights Reserved.
    Licensed under the Apache License, Version 2.0.
    http://www.apache.org/licenses/LICENSE-2.0

Why this exists: Hermes' ``read_file`` refuses binary extensions
(``tools/binary_extensions.py``), so a PDF, Word, Excel or PowerPoint file
dropped into a workspace is currently unreadable by the agent. The
``/mnt/user-data`` contract in :mod:`plugins.camel_tools.workspace` reserved a
place for uploads but never had a conversion step behind it. This is that step.

Modifications from upstream:

* **Depends on ``markitdown`` directly, not on ``camel-ai``.** Upstream's class
  is a thin wrapper; taking the wrapper rather than the dependency edge means
  document conversion works on installs that never enable the CAMEL bridge, and
  a document converter does not drag in CAMEL's whole dependency tree.
  (Upstream has since deprecated ``MarkItDownToolkit`` in favor of
  ``FileToolkit.read_file``, which is registered by the catalog for in-agent
  use; this module is the out-of-band batch path.)
* Failures are collected per file instead of raising, because a single
  unreadable upload must not sink a whole batch.
* Output is written into ``/mnt/user-data/workspace`` and results are returned
  as paths, keeping large converted text out of the model's context.
* Parallel conversion uses a bounded pool (upstream leaves it unbounded).
"""

from __future__ import annotations

import logging
import os
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# LAZY_DEPS feature key (see tools/lazy_deps.py) installing the converter.
MARKITDOWN_FEATURE = "doc.markitdown"

MAX_WORKERS = 4

# Upstream's MarkItDownLoader.SUPPORTED_FORMATS.
SUPPORTED_FORMATS: tuple[str, ...] = (
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".ppt",
    ".pptx",
    ".epub",
    ".html",
    ".htm",
    ".jpg",
    ".jpeg",
    ".png",
    ".mp3",
    ".wav",
    ".csv",
    ".json",
    ".xml",
    ".zip",
    ".txt",
    ".md",
)


class ConversionUnavailable(RuntimeError):
    """Raised when the ``markitdown`` dependency is not installed."""


def is_supported(file_path: str | Path) -> bool:
    """Return whether *file_path*'s extension can be converted."""
    return os.path.splitext(str(file_path))[1].lower() in SUPPORTED_FORMATS


def _converter() -> Any:
    try:
        from markitdown import MarkItDown
    except ImportError as exc:  # pragma: no cover - exercised via monkeypatch
        raise ConversionUnavailable(
            "markitdown is not installed. Run `/camel-tools install-converter` "
            "to enable document conversion."
        ) from exc
    return MarkItDown()


def convert_file(file_path: str | Path, *, converter: Any = None) -> str:
    """Convert one document to Markdown text.

    Raises:
        FileNotFoundError: the path does not exist.
        ValueError: the extension is not supported.
        ConversionUnavailable: ``markitdown`` is not installed.
    """
    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"File not found: {path}")
    if not is_supported(path):
        raise ValueError(
            f"Unsupported file format: {path.name} "
            f"(supported: {', '.join(SUPPORTED_FORMATS)})"
        )
    conv = converter if converter is not None else _converter()
    return conv.convert(str(path)).text_content


@dataclass
class ConversionResult:
    """Outcome of one batch conversion pass."""

    converted: Dict[str, str] = field(default_factory=dict)
    """Source path → written Markdown path."""

    skipped: List[str] = field(default_factory=list)
    """Paths whose extension is not convertible."""

    failed: Dict[str, str] = field(default_factory=dict)
    """Source path → error message."""

    def summary(self) -> str:
        parts = [f"{len(self.converted)} converted"]
        if self.skipped:
            parts.append(f"{len(self.skipped)} skipped")
        if self.failed:
            parts.append(f"{len(self.failed)} failed")
        return ", ".join(parts)


def iter_uploads(uploads_dir: str | Path) -> List[Path]:
    """List convertible files directly under *uploads_dir* (sorted, recursive)."""
    root = Path(uploads_dir)
    if not root.is_dir():
        return []
    return sorted(p for p in root.rglob("*") if p.is_file())


def convert_uploads(
    uploads_dir: str | Path,
    output_dir: str | Path,
    *,
    parallel: bool = True,
    overwrite: bool = False,
    converter: Any = None,
) -> ConversionResult:
    """Convert every supported file under *uploads_dir* into *output_dir*.

    Each ``report.pdf`` becomes ``report.pdf.md`` — the original extension is
    kept in the name so two uploads that differ only by type cannot collide.
    """
    out_root = Path(output_dir)
    result = ConversionResult()
    sources = iter_uploads(uploads_dir)
    if not sources:
        return result

    todo: List[Path] = []
    for src in sources:
        if not is_supported(src):
            result.skipped.append(str(src))
            continue
        todo.append(src)
    if not todo:
        return result

    out_root.mkdir(parents=True, exist_ok=True)
    conv = converter
    if conv is None:
        # Resolve once: constructing MarkItDown per file is wasteful, and if the
        # dependency is missing we want one clear failure, not one per file.
        conv = _converter()

    def _one(src: Path) -> None:
        target = out_root / f"{src.name}.md"
        if target.exists() and not overwrite:
            result.failed[str(src)] = f"{target.name} already exists (use overwrite)"
            return
        try:
            text = convert_file(src, converter=conv)
        except Exception as exc:  # noqa: BLE001 — one bad upload must not sink the batch
            result.failed[str(src)] = f"{type(exc).__name__}: {exc}"
            return
        target.write_text(text or "", encoding="utf-8")
        result.converted[str(src)] = str(target)

    if parallel and len(todo) > 1:
        with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
            list(pool.map(_one, todo))
    else:
        for src in todo:
            _one(src)
    return result


def convert_session_uploads(
    session_id: str = "default",
    *,
    hermes_home: Optional[str] = None,
    overwrite: bool = False,
    converter: Any = None,
) -> ConversionResult:
    """Convert a session's ``/mnt/user-data/uploads`` into its ``workspace``."""
    from plugins.camel_tools.workspace import ensure_dirs, resolve_workspace

    if hermes_home is None:
        try:
            from hermes_constants import get_hermes_home

            hermes_home = get_hermes_home()
        except Exception:  # noqa: BLE001
            hermes_home = str(Path.home() / ".hermes")

    paths = ensure_dirs(resolve_workspace(hermes_home, session_id))
    return convert_uploads(
        paths.uploads, paths.workspace, overwrite=overwrite, converter=converter
    )
