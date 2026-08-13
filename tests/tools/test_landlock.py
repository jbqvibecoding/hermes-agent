"""D4: Landlock filesystem confinement.

**Scope warning.** The kernel this suite runs on does not implement Landlock
(``landlock_create_ruleset`` returns ENOSYS), so nothing here proves that an
enforced ruleset denies a real file access. What is covered: the ABI
negotiation table, struct packing, syscall argument construction, the
file-versus-directory downgrade, and — the property that matters most when the
feature is missing — that every path fails closed rather than yielding an
unconfined process.

``test_probe_reports_honestly_on_this_kernel`` is the one test that adapts to
the host: on a Landlock-capable kernel it asserts real enforcement, and it is
the test to watch when this is finally run somewhere that has the LSM.
"""

from __future__ import annotations

import os
import struct
import subprocess
import sys

import pytest

from tools.sandbox import landlock
from tools.sandbox.landlock import (
    ACCESS_FS_IOCTL_DEV,
    ACCESS_FS_REFER,
    ACCESS_FS_TRUNCATE,
    READ_ACCESS,
    TARGET_ABI,
    WRITE_ACCESS,
    LandlockSupport,
    LandlockUnavailable,
    Rule,
    access_for_path,
    build_rules,
    detect_support,
    fs_mask_for_abi,
    make_preexec,
    probe,
)

FULL_MASK = fs_mask_for_abi(TARGET_ABI)


# ---------------------------------------------------------------------------
# ABI negotiation
# ---------------------------------------------------------------------------


def test_abi_one_has_thirteen_access_bits():
    assert fs_mask_for_abi(1) == (1 << 13) - 1


def test_abi_two_adds_refer():
    assert not (fs_mask_for_abi(1) & ACCESS_FS_REFER)
    assert fs_mask_for_abi(2) & ACCESS_FS_REFER


def test_abi_three_adds_truncate():
    assert not (fs_mask_for_abi(2) & ACCESS_FS_TRUNCATE)
    assert fs_mask_for_abi(3) & ACCESS_FS_TRUNCATE


def test_abi_four_adds_no_filesystem_bits():
    """ABI 4 added network rules; its filesystem mask is ABI 3's."""
    assert fs_mask_for_abi(4) == fs_mask_for_abi(3)


def test_abi_five_adds_ioctl_dev():
    assert not (fs_mask_for_abi(4) & ACCESS_FS_IOCTL_DEV)
    assert fs_mask_for_abi(5) & ACCESS_FS_IOCTL_DEV


def test_masks_grow_monotonically():
    masks = [fs_mask_for_abi(a) for a in range(1, 6)]
    assert masks == sorted(masks)


def test_a_newer_kernel_is_clamped_to_the_target_abi():
    """A kernel that grew a bit we have never heard of must not change what we
    ask for behind our backs."""
    assert fs_mask_for_abi(99) == fs_mask_for_abi(TARGET_ABI)


@pytest.mark.parametrize("abi", [0, -1])
def test_a_nonsense_abi_grants_nothing(abi):
    assert fs_mask_for_abi(abi) == 0


def test_partial_is_reported_for_an_older_kernel():
    assert LandlockSupport(True, abi=1, fs_mask=fs_mask_for_abi(1)).partial
    assert not LandlockSupport(True, abi=TARGET_ABI, fs_mask=FULL_MASK).partial


def test_an_unavailable_kernel_is_not_partial():
    assert not LandlockSupport(False, reason="nope").partial


# ---------------------------------------------------------------------------
# Struct packing
# ---------------------------------------------------------------------------


def test_ruleset_attr_is_eight_bytes_before_abi_four():
    assert len(landlock._ruleset_attr(FULL_MASK, 3)) == 8


def test_ruleset_attr_grows_at_abi_four():
    """ABI 4 added handled_access_net; sending the larger struct to an older
    kernel is rejected, so the size has to follow the ABI."""
    packed = landlock._ruleset_attr(FULL_MASK, 4)
    assert len(packed) == 16
    assert struct.unpack("=QQ", packed) == (FULL_MASK, 0)


def test_path_beneath_attr_is_packed_not_aligned():
    """The kernel's struct carries __attribute__((packed)) — 12 bytes, not 16.
    Getting this wrong yields an EINVAL that reads like a permissions bug."""
    packed = landlock._path_beneath_attr(READ_ACCESS, 7)
    assert len(packed) == 12
    assert struct.unpack("=Qi", packed) == (READ_ACCESS, 7)


# ---------------------------------------------------------------------------
# File-versus-directory downgrade
# ---------------------------------------------------------------------------


def test_a_directory_keeps_the_full_mask(tmp_path):
    assert access_for_path(str(tmp_path), FULL_MASK) == FULL_MASK


def test_a_regular_file_loses_the_directory_only_bits(tmp_path):
    """Directory-only bits on a non-directory make the kernel return EINVAL,
    which — being fail closed — means nothing runs at all."""
    target = tmp_path / "f.txt"
    target.write_text("x")
    reduced = access_for_path(str(target), FULL_MASK)
    assert reduced < FULL_MASK
    assert not (reduced & landlock.ACCESS_FS_MAKE_DIR)
    assert not (reduced & landlock.ACCESS_FS_READ_DIR)
    assert reduced & landlock.ACCESS_FS_READ_FILE


def test_the_downgrade_never_adds_a_bit(tmp_path):
    target = tmp_path / "f.txt"
    target.write_text("x")
    requested = landlock.ACCESS_FS_READ_FILE
    assert access_for_path(str(target), requested) == requested


def test_classifying_a_path_needs_no_read_permission(tmp_path):
    """O_PATH is used precisely so an unreadable file can still be classified."""
    target = tmp_path / "locked"
    target.write_text("x")
    os.chmod(target, 0o000)
    try:
        assert access_for_path(str(target), FULL_MASK)
    finally:
        os.chmod(target, 0o644)


def test_a_missing_path_raises():
    with pytest.raises(OSError):
        access_for_path("/definitely/not/here", FULL_MASK)


# ---------------------------------------------------------------------------
# Rule building
# ---------------------------------------------------------------------------


def test_read_paths_get_read_access_only(tmp_path):
    (rule,) = build_rules([str(tmp_path)], [], fs_mask=FULL_MASK)
    assert rule.access == READ_ACCESS
    assert not (rule.access & landlock.ACCESS_FS_WRITE_FILE)


def test_write_paths_get_read_and_write(tmp_path):
    (rule,) = build_rules([], [str(tmp_path)], fs_mask=FULL_MASK)
    assert rule.access & landlock.ACCESS_FS_WRITE_FILE
    assert rule.access & landlock.ACCESS_FS_READ_FILE


def test_rules_never_name_a_bit_the_kernel_abi_lacks(tmp_path):
    abi1 = fs_mask_for_abi(1)
    for rule in build_rules([str(tmp_path)], [str(tmp_path)], fs_mask=abi1):
        assert rule.access & ~abi1 == 0


def test_nonexistent_paths_are_skipped_not_fatal(tmp_path):
    rules = build_rules([str(tmp_path), "/nope/nope"], [], fs_mask=FULL_MASK)
    assert [r.path for r in rules] == [str(tmp_path)]


def test_an_empty_mask_yields_no_rules(tmp_path):
    assert build_rules([str(tmp_path)], [str(tmp_path)], fs_mask=0) == []


def test_no_paths_yields_no_rules():
    assert build_rules([], [], fs_mask=FULL_MASK) == []


# ---------------------------------------------------------------------------
# Fail closed — the property that matters when the feature is missing
# ---------------------------------------------------------------------------


def test_make_preexec_refuses_when_landlock_is_unavailable():
    """It must raise, not return a no-op callable. A sandbox that silently
    degrades to no sandbox is worse than none, because the caller believes it."""
    unavailable = LandlockSupport(False, reason="test: no landlock")
    with pytest.raises(LandlockUnavailable):
        make_preexec(["/tmp"], support=unavailable)


def test_restrict_self_refuses_when_landlock_is_unavailable():
    with pytest.raises(LandlockUnavailable):
        landlock.restrict_self([], support=LandlockSupport(False, reason="no"))


def test_there_is_no_unrestricted_fallback_in_the_module():
    """Guards the invariant at the source level: any future edit that adds a
    'just run it unconfined' path should trip this."""
    source = os.path.join(os.path.dirname(landlock.__file__), "landlock.py")
    with open(source, "r", encoding="utf-8") as handle:
        text = handle.read()
    # make_preexec/restrict_self must raise on unavailability, never return.
    assert "raise LandlockUnavailable" in text
    assert text.count("raise LandlockUnavailable") >= 2


def test_a_failing_preexec_prevents_the_process_from_running(tmp_path):
    """End-to-end proof of fail-closed: subprocess propagates a preexec failure
    as a start failure, so no unconfined command executes."""
    marker = tmp_path / "ran"

    def _boom():
        raise LandlockUnavailable("simulated missing kernel support")

    with pytest.raises(Exception):
        subprocess.run(
            [sys.executable, "-c", f"open({str(marker)!r}, 'w').write('x')"],
            preexec_fn=_boom,
            capture_output=True,
            timeout=30,
        )
    assert not marker.exists()


# ---------------------------------------------------------------------------
# Detection and probing
# ---------------------------------------------------------------------------


def test_detect_support_never_raises():
    info = detect_support()
    assert isinstance(info, LandlockSupport)
    assert isinstance(info.available, bool)


def test_detect_support_explains_itself_when_unavailable():
    info = detect_support()
    if not info.available:
        assert info.reason


def test_detection_and_mask_agree():
    info = detect_support()
    if info.available:
        assert info.fs_mask == fs_mask_for_abi(info.abi)


def test_probe_never_raises():
    works, detail = probe()
    assert isinstance(works, bool)
    assert detail


def test_probe_reports_honestly_on_this_kernel():
    """The load-bearing test when this finally runs on a Landlock kernel.

    Where the LSM is absent, the probe must say so — a probe that reported
    success on a kernel that cannot enforce would be the worst possible bug.
    Where it is present, the probe must show a ruleset granting nothing
    actually denying a read.
    """
    info = detect_support()
    works, detail = probe()
    if info.available:
        assert works, (
            f"kernel reports Landlock ABI {info.abi} but it did not enforce: {detail}"
        )
        assert "enforcing" in detail
    else:
        assert not works
        assert detail


def test_probe_and_detect_do_not_disagree_about_availability():
    info = detect_support()
    works, _detail = probe()
    if works:
        assert info.available
