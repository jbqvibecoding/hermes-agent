"""Hardened ``.skill`` archive extraction (ported from DeerFlow).

DeerFlow / the agentskills.io standard distribute skills as ``.skill`` ZIP
archives. Extracting an untrusted archive is a classic attack surface (path
traversal, symlink escape, zip bombs, dropped executables), so this module
ports DeerFlow's security-critical extraction hardening
(``deerflow/skills/installer.py``) as a standalone, dependency-light utility:

* reject absolute paths and ``..`` traversal members;
* skip symlink entries instead of materialising them;
* reject executable binaries (ELF / PE / Mach-O) by magic bytes;
* enforce a hard uncompressed-size cap (zip-bomb defence);
* verify each resolved member path stays inside the destination.

:func:`install_skill_archive` is the high-level entry point: it extracts a
``.skill`` into a temp dir, locates the skill root, requires a top-level
``SKILL.md``, and atomically moves it into the Hermes skills directory.

This is the pure, deterministic layer — it does no LLM/static content
scanning (DeerFlow's separate ``skillscan`` subsystem). It is fully
unit-testable with crafted archives.
"""

from __future__ import annotations

import logging
import posixpath
import shutil
import stat
import tempfile
import zipfile
from pathlib import Path, PurePosixPath, PureWindowsPath

logger = logging.getLogger(__name__)

SKILL_MD = "SKILL.md"
DEFAULT_MAX_TOTAL_SIZE = 512 * 1024 * 1024  # 512 MB uncompressed cap

# Full magics per variant — a shorter shared prefix would also match
# non-executable data files. (Ported verbatim from DeerFlow.)
_EXECUTABLE_MAGIC_PREFIXES = (
    b"\x7fELF",  # ELF
    b"MZ",  # PE/DOS
    b"\xfe\xed\xfa\xce",  # Mach-O 32-bit big-endian
    b"\xfe\xed\xfa\xcf",  # Mach-O 64-bit big-endian
    b"\xce\xfa\xed\xfe",  # Mach-O 32-bit little-endian
    b"\xcf\xfa\xed\xfe",  # Mach-O 64-bit little-endian
    b"\xca\xfe\xba\xbe",  # Mach-O fat binary big-endian
    b"\xbe\xba\xfe\xca",  # Mach-O fat binary little-endian
    b"\xca\xfe\xba\xbf",  # Mach-O fat64 binary big-endian
    b"\xbf\xba\xfe\xca",  # Mach-O fat64 binary little-endian
)


class SkillArchiveError(ValueError):
    """Raised when a ``.skill`` archive is unsafe or malformed."""


class SkillAlreadyExistsError(SkillArchiveError):
    """Raised when a skill with the same name is already installed."""


def is_unsafe_zip_member(info: zipfile.ZipInfo) -> bool:
    """True if the member path is absolute or attempts directory traversal."""
    name = info.filename
    if not name:
        return False
    normalized = name.replace("\\", "/")
    if normalized.startswith("/"):
        return True
    path = PurePosixPath(normalized)
    if path.is_absolute():
        return True
    if PureWindowsPath(name).is_absolute():
        return True
    return ".." in path.parts


def is_symlink_member(info: zipfile.ZipInfo) -> bool:
    """Detect symlinks from the external attributes stored in the ZipInfo."""
    mode = info.external_attr >> 16
    return stat.S_ISLNK(mode)


def is_executable_binary_prefix(prefix: bytes) -> bool:
    """Detect ELF, PE, and Mach-O executables by magic bytes."""
    return prefix.startswith(_EXECUTABLE_MAGIC_PREFIXES)


def should_ignore_archive_entry(path: Path) -> bool:
    """True for macOS metadata dirs and dotfiles."""
    return path.name.startswith(".") or path.name == "__MACOSX"


def resolve_skill_dir_from_archive(temp_path: Path) -> Path:
    """Locate the skill root from extracted contents (filters __MACOSX/dotfiles)."""
    items = [p for p in temp_path.iterdir() if not should_ignore_archive_entry(p)]
    if not items:
        raise SkillArchiveError("Skill archive is empty")
    if len(items) == 1 and items[0].is_dir():
        return items[0]
    return temp_path


def safe_extract_skill_archive(
    zip_ref: zipfile.ZipFile,
    dest_path: Path,
    max_total_size: int = DEFAULT_MAX_TOTAL_SIZE,
) -> None:
    """Safely extract a skill archive with security protections.

    Raises :class:`SkillArchiveError` on unsafe members, executable binaries,
    or size-limit violations.
    """
    dest_root = dest_path.resolve()
    total_written = 0

    for info in zip_ref.infolist():
        if is_unsafe_zip_member(info):
            raise SkillArchiveError(
                f"Archive contains unsafe member path: {info.filename!r}"
            )

        if is_symlink_member(info):
            logger.warning("Skipping symlink entry in skill archive: %s", info.filename)
            continue

        normalized_name = posixpath.normpath(info.filename.replace("\\", "/"))
        member_path = dest_root.joinpath(*PurePosixPath(normalized_name).parts)
        if not member_path.resolve().is_relative_to(dest_root):
            raise SkillArchiveError(f"Zip entry escapes destination: {info.filename!r}")
        member_path.parent.mkdir(parents=True, exist_ok=True)

        if info.is_dir():
            member_path.mkdir(parents=True, exist_ok=True)
            continue

        with zip_ref.open(info) as src, member_path.open("wb") as dst:
            first_chunk = True
            while chunk := src.read(65536):
                if first_chunk and is_executable_binary_prefix(chunk):
                    raise SkillArchiveError(
                        f"Archive contains executable binary member: {info.filename!r}"
                    )
                first_chunk = False
                total_written += len(chunk)
                if total_written > max_total_size:
                    raise SkillArchiveError(
                        "Skill archive is too large or appears highly compressed."
                    )
                dst.write(chunk)


def install_skill_archive(
    archive_path: str | Path,
    skills_dir: str | Path,
    *,
    overwrite: bool = False,
    max_total_size: int = DEFAULT_MAX_TOTAL_SIZE,
) -> Path:
    """Install a ``.skill`` archive into *skills_dir* with hardened extraction.

    Returns the installed skill directory. Raises :class:`SkillArchiveError`
    (or :class:`SkillAlreadyExistsError`) on any problem. The archive must
    contain a skill root with a top-level ``SKILL.md``.
    """
    archive_path = Path(archive_path)
    skills_root = Path(skills_dir)
    if not archive_path.is_file():
        raise SkillArchiveError(f"Archive not found: {archive_path}")

    skills_root.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="hermes-skill-") as tmp:
        staging = Path(tmp)
        try:
            with zipfile.ZipFile(archive_path) as zf:
                safe_extract_skill_archive(zf, staging, max_total_size=max_total_size)
        except zipfile.BadZipFile as exc:
            raise SkillArchiveError(f"Not a valid .skill (zip) archive: {exc}") from exc

        skill_root = resolve_skill_dir_from_archive(staging)
        if not (skill_root / SKILL_MD).is_file():
            raise SkillArchiveError(f"Archive has no top-level {SKILL_MD}")

        skill_name = skill_root.name if skill_root != staging else archive_path.stem
        target = skills_root / skill_name

        if target.exists():
            if not overwrite:
                raise SkillAlreadyExistsError(f"Skill {skill_name!r} already exists")
            shutil.rmtree(target)

        shutil.move(str(skill_root), str(target))
        return target
