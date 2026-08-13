"""Landlock filesystem confinement for locally-spawned processes.

Ported from DeepSeek Harness (``dsh``, MIT) — ``native/landlock-run``, a 298-line
C launcher that restricts itself and then ``execvp``s. Rewritten here in
``ctypes`` so Hermes needs no compiled artefact: the three syscalls are invoked
directly, and the restriction is applied in the forked child (via
``subprocess``'s ``preexec_fn``) immediately before the exec.

════════════════════════════════════════════════════════════════════════════
VERIFICATION STATUS — READ THIS BEFORE RELYING ON THIS MODULE
════════════════════════════════════════════════════════════════════════════
The machine this was written on does **not** support Landlock::

    uname -r                                  6.18.5-fc-v20
    landlock_create_ruleset(NULL, 0, VERSION) -1, errno 38 (ENOSYS)

So the following are covered by tests and were exercised:

  * the ABI negotiation table and its mask reduction per version;
  * the struct packing and syscall argument construction;
  * the file-versus-directory permission downgrade;
  * fail-closed behaviour — that an unavailable kernel yields a refusal and
    never an unrestricted process.

And the following is **NOT** verified, because it cannot be on this kernel:

  * that an enforced ruleset actually denies a real file access.

That last point is the one that matters most for a sandbox, and no amount of
passing tests here substitutes for running the probe on a kernel with Landlock
built in. Treat this module as unproven against a live LSM until someone has
done that.

**Not wired into the local execution backend, deliberately.** This ships as a
library plus :func:`probe`, not as a live rung in ``tools/environments/local.py``.
The module is fail-closed by design, so a mistake in it does not leak an
unconfined process — it stops the process from starting at all, which on the
terminal path would mean every command failing. Turning that on from a machine
where the enforcement half cannot be exercised is not a trade worth making.
The intended next step is to run :func:`probe` on a Landlock-capable kernel,
confirm it reports ``enforcing``, and only then wire it in behind config.
════════════════════════════════════════════════════════════════════════════

What Landlock does and does not cover
-------------------------------------
**Filesystem only.** No network isolation, no seccomp syscall filtering, no PID
namespace, no memory or CPU limits. It does not replace the Docker backend; it
is a cheap, unprivileged rung for hosts where a heavier backend is unavailable.
Saying otherwise to a user would misrepresent what they are protected from.

Design points worth keeping (all from the C original)
-----------------------------------------------------
* **ABI negotiation, not version sniffing.** Ask the kernel which ABI it
  implements and reduce the access mask to what that ABI knows. An older kernel
  runs with a smaller mask and is reported as ``partial`` rather than refused.
* **Fail closed.** If ``landlock_restrict_self`` does not succeed, the caller
  must not proceed. There is no unrestricted fallback path anywhere in here.
* **A functional probe, not a feature check.** :func:`probe` builds a real
  ruleset and actually enforces it in a throwaway child, because "the syscall
  exists" is not the same claim as "the restriction takes effect". That
  distinction is general and applies to any sandbox backend.
* **Single files need a reduced mask.** Directory-only access bits on a
  non-directory make the kernel return ``EINVAL``, so a file grant is narrowed
  to the file-compatible subset first.
"""

from __future__ import annotations

import ctypes
import logging
import os
import stat
import struct
from dataclasses import dataclass
from typing import Callable, Dict, Iterable, List, Optional, Sequence, Tuple

logger = logging.getLogger(__name__)

# Syscall numbers. Landlock was added in the architecture-neutral range, so
# these hold on x86_64, aarch64, riscv64 and the other asm-generic ports.
NR_LANDLOCK_CREATE_RULESET = 444
NR_LANDLOCK_ADD_RULE = 445
NR_LANDLOCK_RESTRICT_SELF = 446

LANDLOCK_CREATE_RULESET_VERSION = 1 << 0
LANDLOCK_RULE_PATH_BENEATH = 1

PR_SET_NO_NEW_PRIVS = 38

O_PATH = 0o010000000
O_CLOEXEC = 0o02000000

# Access bits, in the order the ABI introduced them.
ACCESS_FS_EXECUTE = 1 << 0
ACCESS_FS_WRITE_FILE = 1 << 1
ACCESS_FS_READ_FILE = 1 << 2
ACCESS_FS_READ_DIR = 1 << 3
ACCESS_FS_REMOVE_DIR = 1 << 4
ACCESS_FS_REMOVE_FILE = 1 << 5
ACCESS_FS_MAKE_CHAR = 1 << 6
ACCESS_FS_MAKE_DIR = 1 << 7
ACCESS_FS_MAKE_REG = 1 << 8
ACCESS_FS_MAKE_SOCK = 1 << 9
ACCESS_FS_MAKE_FIFO = 1 << 10
ACCESS_FS_MAKE_BLOCK = 1 << 11
ACCESS_FS_MAKE_SYM = 1 << 12
ACCESS_FS_REFER = 1 << 13  # ABI 2
ACCESS_FS_TRUNCATE = 1 << 14  # ABI 3
ACCESS_FS_IOCTL_DEV = 1 << 15  # ABI 5

# The ABI Hermes targets. Newer kernels are clamped to this so a kernel that
# grows a bit we have never heard of does not silently change our behaviour.
TARGET_ABI = 5

# ABI -> the filesystem access mask that ABI understands.  Handing a kernel a
# bit it does not know makes landlock_create_ruleset fail with EINVAL, so the
# mask must shrink to match, not merely be tried and retried.
#
# ABI 4 added network rules; its *filesystem* mask is identical to ABI 3, which
# is why it maps to the same value rather than being absent.
_ABI_FS_MASKS: Dict[int, int] = {
    1: (1 << 13) - 1,  # EXECUTE..MAKE_SYM
    2: (1 << 14) - 1,  # + REFER
    3: (1 << 15) - 1,  # + TRUNCATE
    4: (1 << 15) - 1,  # network only; no new fs bits
    5: (1 << 16) - 1,  # + IOCTL_DEV
}

# Bits that mean something on a regular file. Everything else describes an
# operation on a directory's contents, and the kernel rejects those with EINVAL
# when the rule's fd is not a directory.
_FILE_COMPATIBLE = (
    ACCESS_FS_EXECUTE
    | ACCESS_FS_WRITE_FILE
    | ACCESS_FS_READ_FILE
    | ACCESS_FS_TRUNCATE
    | ACCESS_FS_IOCTL_DEV
)

# Read-only and read-write grants, expressed once so the two callers cannot
# drift apart.
READ_ACCESS = ACCESS_FS_EXECUTE | ACCESS_FS_READ_FILE | ACCESS_FS_READ_DIR
WRITE_ACCESS = (
    ACCESS_FS_WRITE_FILE
    | ACCESS_FS_REMOVE_DIR
    | ACCESS_FS_REMOVE_FILE
    | ACCESS_FS_MAKE_CHAR
    | ACCESS_FS_MAKE_DIR
    | ACCESS_FS_MAKE_REG
    | ACCESS_FS_MAKE_SOCK
    | ACCESS_FS_MAKE_FIFO
    | ACCESS_FS_MAKE_BLOCK
    | ACCESS_FS_MAKE_SYM
    | ACCESS_FS_REFER
    | ACCESS_FS_TRUNCATE
    | ACCESS_FS_IOCTL_DEV
)


class LandlockUnavailable(RuntimeError):
    """Landlock cannot be used here.

    Raised instead of returning something unrestricted. A caller that asked for
    confinement and cannot have it must find out, not proceed unconfined.
    """


class LandlockError(RuntimeError):
    """A Landlock syscall failed for a reason other than "not supported"."""


@dataclass(frozen=True)
class LandlockSupport:
    """What this kernel offers."""

    available: bool
    abi: int = 0
    fs_mask: int = 0
    reason: str = ""

    @property
    def partial(self) -> bool:
        """True when the kernel is older than the ABI we target.

        Still worth using — a smaller mask confines less but confines — so this
        is reported rather than treated as unavailable.
        """
        return self.available and self.abi < TARGET_ABI


def _libc() -> ctypes.CDLL:
    lib = ctypes.CDLL("libc.so.6", use_errno=True)
    # ctypes defaults to c_int; syscall(2) returns long. The values we read back
    # (an ABI number, a ruleset fd) are small, but declaring it correctly costs
    # nothing and avoids a truncation bug on a future return value that is not.
    lib.syscall.restype = ctypes.c_long
    return lib


def fs_mask_for_abi(abi: int) -> int:
    """Reduce the target access mask to what ``abi`` understands.

    An unknown-but-newer ABI is clamped to :data:`TARGET_ABI`'s mask rather than
    optimistically assuming new bits exist; an ABI below 1 has no mask at all.
    """
    if abi < 1:
        return 0
    if abi >= TARGET_ABI:
        return _ABI_FS_MASKS[TARGET_ABI]
    return _ABI_FS_MASKS.get(abi, _ABI_FS_MASKS[1])


def detect_support(libc: Optional[ctypes.CDLL] = None) -> LandlockSupport:
    """Ask the kernel for its Landlock ABI version.

    This is the cheap check. It answers "does the syscall exist", which is
    necessary but *not* sufficient — see :func:`probe` for the real one.
    """
    if os.name != "posix" or not hasattr(os, "fork"):
        return LandlockSupport(False, reason="Landlock is Linux-only")
    try:
        lib = libc or _libc()
    except OSError as exc:
        return LandlockSupport(False, reason=f"libc unavailable: {exc}")

    ctypes.set_errno(0)
    abi = lib.syscall(
        ctypes.c_long(NR_LANDLOCK_CREATE_RULESET),
        None,
        ctypes.c_size_t(0),
        ctypes.c_uint32(LANDLOCK_CREATE_RULESET_VERSION),
    )
    if abi < 0:
        err = ctypes.get_errno()
        if err in (errno_ENOSYS(), errno_EOPNOTSUPP()):
            return LandlockSupport(
                False, reason="kernel does not implement Landlock (ENOSYS/EOPNOTSUPP)"
            )
        return LandlockSupport(
            False, reason=f"landlock_create_ruleset failed: errno {err}"
        )

    return LandlockSupport(True, abi=abi, fs_mask=fs_mask_for_abi(abi))


def errno_ENOSYS() -> int:
    import errno as _errno

    return _errno.ENOSYS


def errno_EOPNOTSUPP() -> int:
    import errno as _errno

    return _errno.EOPNOTSUPP


def _ruleset_attr(fs_mask: int, abi: int) -> bytes:
    """Pack ``struct landlock_ruleset_attr``.

    ABI 4 grew the struct with ``handled_access_net``; passing the larger size
    to an older kernel is rejected, so the size is chosen by ABI rather than
    fixed.
    """
    if abi >= 4:
        return struct.pack("=QQ", fs_mask, 0)
    return struct.pack("=Q", fs_mask)


def _path_beneath_attr(allowed_access: int, parent_fd: int) -> bytes:
    """Pack ``struct landlock_path_beneath_attr``.

    Packed, not aligned: the kernel's definition carries
    ``__attribute__((packed))``, so this is 12 bytes, not 16. Getting this wrong
    produces an EINVAL that looks like a permissions problem.
    """
    return struct.pack("=Qi", allowed_access, parent_fd)


def access_for_path(path: str, requested: int) -> int:
    """Narrow ``requested`` to what the kernel will accept for ``path``.

    A grant on a regular file must not carry directory-only bits — the kernel
    answers EINVAL, and the whole ruleset creation fails, which (being fail
    closed) means nothing runs. Opening with ``O_PATH`` avoids needing read
    permission just to classify the target.
    """
    fd = os.open(path, O_PATH | O_CLOEXEC)
    try:
        st = os.fstat(fd)
    finally:
        os.close(fd)
    if stat.S_ISDIR(st.st_mode):
        return requested
    return requested & _FILE_COMPATIBLE


@dataclass(frozen=True)
class Rule:
    """One path grant."""

    path: str
    access: int


def build_rules(
    read_paths: Sequence[str] = (),
    write_paths: Sequence[str] = (),
    *,
    fs_mask: int,
) -> List[Rule]:
    """Turn read/write path lists into masked rules.

    Every rule is intersected with ``fs_mask`` so a grant can never name a bit
    the running kernel's ABI does not implement. Paths that do not exist are
    skipped: naming a path that is not there is not a reason to refuse to
    confine everything else.
    """
    rules: List[Rule] = []
    for path in read_paths:
        rules.append(Rule(path, READ_ACCESS & fs_mask))
    for path in write_paths:
        rules.append(Rule(path, (READ_ACCESS | WRITE_ACCESS) & fs_mask))
    return [rule for rule in rules if rule.access and os.path.exists(rule.path)]


def restrict_self(
    rules: Iterable[Rule],
    *,
    support: Optional[LandlockSupport] = None,
    libc: Optional[ctypes.CDLL] = None,
) -> None:
    """Apply a Landlock ruleset to the calling process (and its descendants).

    Raises on any failure and never returns having applied nothing — the
    caller's contract is "after this returns, you are confined". The ruleset is
    inherited across ``execve``, which is what makes applying it in a
    ``preexec_fn`` work.

    Must be called in a process the caller is willing to confine permanently:
    Landlock restrictions cannot be removed.
    """
    lib = libc or _libc()
    info = support or detect_support(lib)
    if not info.available:
        raise LandlockUnavailable(info.reason or "Landlock unavailable")

    attr = _ruleset_attr(info.fs_mask, info.abi)
    ctypes.set_errno(0)
    ruleset_fd = lib.syscall(
        ctypes.c_long(NR_LANDLOCK_CREATE_RULESET),
        ctypes.c_char_p(attr),
        ctypes.c_size_t(len(attr)),
        ctypes.c_uint32(0),
    )
    if ruleset_fd < 0:
        raise LandlockError(
            f"landlock_create_ruleset failed: errno {ctypes.get_errno()}"
        )

    try:
        for rule in rules:
            try:
                access = access_for_path(rule.path, rule.access)
            except OSError as exc:
                # A path that vanished between build_rules and here. Skip it
                # rather than abandoning the whole ruleset — dropping a grant
                # only ever makes the sandbox tighter.
                logger.debug("landlock: skipping %s: %s", rule.path, exc)
                continue
            if not access:
                continue
            fd = os.open(rule.path, O_PATH | O_CLOEXEC)
            try:
                rule_attr = _path_beneath_attr(access, fd)
                ctypes.set_errno(0)
                rc = lib.syscall(
                    ctypes.c_long(NR_LANDLOCK_ADD_RULE),
                    ctypes.c_int(ruleset_fd),
                    ctypes.c_uint32(LANDLOCK_RULE_PATH_BENEATH),
                    ctypes.c_char_p(rule_attr),
                    ctypes.c_uint32(0),
                )
                if rc < 0:
                    raise LandlockError(
                        f"landlock_add_rule({rule.path}) failed: "
                        f"errno {ctypes.get_errno()}"
                    )
            finally:
                os.close(fd)

        # Required: without no_new_privs an unprivileged process cannot
        # restrict itself, and the restrict call below returns EPERM.
        lib.prctl(
            ctypes.c_int(PR_SET_NO_NEW_PRIVS),
            ctypes.c_ulong(1),
            ctypes.c_ulong(0),
            ctypes.c_ulong(0),
            ctypes.c_ulong(0),
        )

        ctypes.set_errno(0)
        rc = lib.syscall(
            ctypes.c_long(NR_LANDLOCK_RESTRICT_SELF),
            ctypes.c_int(ruleset_fd),
            ctypes.c_uint32(0),
        )
        if rc < 0:
            raise LandlockError(
                f"landlock_restrict_self failed: errno {ctypes.get_errno()}"
            )
    finally:
        os.close(ruleset_fd)


def make_preexec(
    read_paths: Sequence[str] = (),
    write_paths: Sequence[str] = (),
    *,
    support: Optional[LandlockSupport] = None,
) -> Callable[[], None]:
    """Return a ``preexec_fn`` that confines the child before it execs.

    Fail closed: if the restriction cannot be applied, the returned callable
    raises, ``subprocess`` propagates that as a failure to start, and **no
    unconfined process runs**. That is the whole point — a sandbox that
    silently degrades to no sandbox is worse than no sandbox, because the
    caller believes it worked.

    The ruleset is applied after ``fork`` and before ``exec``, and Landlock
    rulesets are inherited across ``execve``, so it covers the command and
    everything it spawns.
    """
    info = support or detect_support()
    if not info.available:
        raise LandlockUnavailable(info.reason or "Landlock unavailable")
    rules = build_rules(read_paths, write_paths, fs_mask=info.fs_mask)

    def _preexec() -> None:
        restrict_self(rules, support=info)

    return _preexec


def probe(timeout: float = 10.0) -> Tuple[bool, str]:
    """Actually enforce a ruleset in a throwaway child and see if it holds.

    A feature check answers "is the syscall present". This answers "does the
    restriction take effect", which is the question that matters: an LSM can be
    compiled in but not enabled in the running configuration, in which case the
    syscalls succeed and confine nothing.

    Returns ``(works, detail)``. Never raises — a probe that explodes is a probe
    that has told you the feature does not work.
    """
    info = detect_support()
    if not info.available:
        return False, info.reason or "Landlock unavailable"

    if not hasattr(os, "fork"):
        return False, "fork unavailable; cannot probe safely"

    read_fd, write_fd = os.pipe()
    pid = os.fork()
    if pid == 0:  # child — confined, then reports, then exits
        os.close(read_fd)
        code = b"unknown"
        try:
            # Grant nothing at all, then try to read a path that certainly
            # exists. If the restriction is real this must fail.
            restrict_self([], support=info)
            try:
                fd = os.open("/etc/hostname", os.O_RDONLY)
                os.close(fd)
                code = b"not-enforced"
            except OSError:
                code = b"enforced"
        except LandlockUnavailable:
            code = b"unavailable"
        except Exception:  # noqa: BLE001
            code = b"error"
        try:
            os.write(write_fd, code)
            os.close(write_fd)
        except OSError:
            pass
        os._exit(0)

    os.close(write_fd)
    try:
        payload = os.read(read_fd, 32)
    except OSError as exc:
        payload = b""
        logger.debug("landlock probe read failed: %s", exc)
    finally:
        os.close(read_fd)
        try:
            os.waitpid(pid, 0)
        except OSError:
            pass

    result = payload.decode("ascii", "replace").strip()
    if result == "enforced":
        detail = f"Landlock ABI {info.abi} enforcing"
        if info.partial:
            detail += (
                f" (partial: kernel ABI {info.abi} < target {TARGET_ABI}; "
                "some access bits unavailable)"
            )
        return True, detail
    if result == "not-enforced":
        return False, "syscalls succeeded but the ruleset was not enforced"
    if result == "unavailable":
        return False, "Landlock unavailable in the probe child"
    return False, f"probe inconclusive ({result or 'no response'})"


__all__ = [
    "ACCESS_FS_IOCTL_DEV",
    "ACCESS_FS_REFER",
    "ACCESS_FS_TRUNCATE",
    "READ_ACCESS",
    "TARGET_ABI",
    "WRITE_ACCESS",
    "LandlockError",
    "LandlockSupport",
    "LandlockUnavailable",
    "Rule",
    "access_for_path",
    "build_rules",
    "detect_support",
    "fs_mask_for_abi",
    "make_preexec",
    "probe",
    "restrict_self",
]
