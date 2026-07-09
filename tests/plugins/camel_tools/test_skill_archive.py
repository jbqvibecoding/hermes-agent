"""Security tests for the hardened .skill archive extractor (skill_archive.py).

Crafts malicious and well-formed archives to prove each protection ported from
DeerFlow actually fires.
"""

from __future__ import annotations

import stat
import zipfile

import pytest

from plugins.camel_tools.skill_archive import (
    DEFAULT_MAX_TOTAL_SIZE,
    SkillAlreadyExistsError,
    SkillArchiveError,
    install_skill_archive,
    is_executable_binary_prefix,
    is_symlink_member,
    is_unsafe_zip_member,
    safe_extract_skill_archive,
)


def _zi(name: str) -> zipfile.ZipInfo:
    return zipfile.ZipInfo(filename=name)


# ---------------------------------------------------------------------------
# member classification
# ---------------------------------------------------------------------------


def test_unsafe_members_detected():
    assert is_unsafe_zip_member(_zi("../evil.txt"))
    assert is_unsafe_zip_member(_zi("/abs/evil.txt"))
    assert is_unsafe_zip_member(_zi("a/../../b"))
    assert is_unsafe_zip_member(_zi("C:\\Windows\\x"))
    assert not is_unsafe_zip_member(_zi("skill/SKILL.md"))


def test_symlink_member_detected():
    info = _zi("link")
    info.external_attr = (stat.S_IFLNK | 0o777) << 16
    assert is_symlink_member(info)
    assert not is_symlink_member(_zi("regular.txt"))


def test_executable_magic_detected():
    assert is_executable_binary_prefix(b"\x7fELF....")
    assert is_executable_binary_prefix(b"MZ......")
    assert is_executable_binary_prefix(b"\xcf\xfa\xed\xfe...")
    assert not is_executable_binary_prefix(b"# just markdown\n")


# ---------------------------------------------------------------------------
# safe_extract_skill_archive
# ---------------------------------------------------------------------------


def test_extract_rejects_traversal(tmp_path):
    archive = tmp_path / "evil.zip"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.writestr("../escape.txt", "pwned")
    dest = tmp_path / "out"
    dest.mkdir()
    with zipfile.ZipFile(archive) as zf:
        with pytest.raises(SkillArchiveError, match="unsafe member"):
            safe_extract_skill_archive(zf, dest)


def test_extract_rejects_executable(tmp_path):
    archive = tmp_path / "elf.zip"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.writestr("skill/mal", b"\x7fELF\x02\x01\x01" + b"\x00" * 40)
    dest = tmp_path / "out"
    dest.mkdir()
    with zipfile.ZipFile(archive) as zf:
        with pytest.raises(SkillArchiveError, match="executable binary"):
            safe_extract_skill_archive(zf, dest)


def test_extract_enforces_size_cap(tmp_path):
    archive = tmp_path / "big.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("skill/big.txt", b"A" * (2 * 1024 * 1024))
    dest = tmp_path / "out"
    dest.mkdir()
    with zipfile.ZipFile(archive) as zf:
        with pytest.raises(SkillArchiveError, match="too large"):
            safe_extract_skill_archive(zf, dest, max_total_size=1024)


def test_extract_skips_symlinks(tmp_path):
    archive = tmp_path / "link.zip"
    with zipfile.ZipFile(archive, "w") as zf:
        link = zipfile.ZipInfo("skill/link")
        link.external_attr = (stat.S_IFLNK | 0o777) << 16
        zf.writestr(link, "/etc/passwd")
        zf.writestr("skill/SKILL.md", "name: x")
    dest = tmp_path / "out"
    dest.mkdir()
    with zipfile.ZipFile(archive) as zf:
        safe_extract_skill_archive(zf, dest)
    assert not (dest / "skill" / "link").exists()
    assert (dest / "skill" / "SKILL.md").exists()


def test_extract_happy_path(tmp_path):
    archive = tmp_path / "ok.zip"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.writestr("skill/SKILL.md", "name: demo\ndescription: d")
        zf.writestr("skill/scripts/run.py", "print('hi')")
    dest = tmp_path / "out"
    dest.mkdir()
    with zipfile.ZipFile(archive) as zf:
        safe_extract_skill_archive(zf, dest)
    assert (dest / "skill" / "SKILL.md").read_text().startswith("name: demo")
    assert (dest / "skill" / "scripts" / "run.py").exists()


# ---------------------------------------------------------------------------
# install_skill_archive (high-level)
# ---------------------------------------------------------------------------


def _make_skill(archive, name="demo"):
    with zipfile.ZipFile(archive, "w") as zf:
        zf.writestr(f"{name}/SKILL.md", f"name: {name}\ndescription: d")
        zf.writestr(f"{name}/references/a.md", "ref")


def test_install_places_skill(tmp_path):
    archive = tmp_path / "demo.skill"
    _make_skill(archive)
    skills_dir = tmp_path / "skills"
    installed = install_skill_archive(archive, skills_dir)
    assert installed == skills_dir / "demo"
    assert (installed / "SKILL.md").is_file()
    assert (installed / "references" / "a.md").is_file()


def test_install_rejects_missing_skill_md(tmp_path):
    archive = tmp_path / "bad.skill"
    with zipfile.ZipFile(archive, "w") as zf:
        zf.writestr("demo/notes.txt", "no skill md here")
    with pytest.raises(SkillArchiveError, match="no top-level SKILL.md"):
        install_skill_archive(archive, tmp_path / "skills")


def test_install_duplicate_raises_without_overwrite(tmp_path):
    archive = tmp_path / "demo.skill"
    _make_skill(archive)
    skills_dir = tmp_path / "skills"
    install_skill_archive(archive, skills_dir)
    _make_skill(archive)  # rebuild (move consumed the first)
    with pytest.raises(SkillAlreadyExistsError):
        install_skill_archive(archive, skills_dir)


def test_install_overwrite_replaces(tmp_path):
    archive = tmp_path / "demo.skill"
    _make_skill(archive)
    skills_dir = tmp_path / "skills"
    install_skill_archive(archive, skills_dir)
    _make_skill(archive)
    installed = install_skill_archive(archive, skills_dir, overwrite=True)
    assert (installed / "SKILL.md").is_file()


def test_install_rejects_non_zip(tmp_path):
    archive = tmp_path / "fake.skill"
    archive.write_text("not a zip")
    with pytest.raises(SkillArchiveError, match="valid .skill"):
        install_skill_archive(archive, tmp_path / "skills")


def test_default_size_cap_is_512mb():
    assert DEFAULT_MAX_TOTAL_SIZE == 512 * 1024 * 1024
