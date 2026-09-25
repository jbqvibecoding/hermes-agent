"""Deciding whether a path a browser asked for is one we may serve.

Two routes hand files out of a teammate's workspace — screenshots and
artifacts — and both guard **a directory the teammate itself writes to**. That
is the whole difficulty. A filename allowlist looks like a boundary and is not
one, because the teammate does not have to smuggle a path through the check: it
can satisfy the check exactly and make the file a **symlink**. ``Path.is_file``
follows links, so the route's own existence test agrees, and the response
serves whatever the link points at.

That was a live hole in the screenshot route until this module existed, and the
artifacts route had it right, so the fix is not new thinking — it is putting
the one correct judgement somewhere both routes have to go through. Two routes
over the same directory with two different opinions is an accident waiting to
pick the weaker one.

**On TOCTOU.** OpenMuse walks each path segment with ``openat`` and
``O_NOFOLLOW``, and its reasoning is right: ``resolve()`` is check-then-use, so
a link swapped between our check and the open still wins. ``O_NOFOLLOW`` is
POSIX-only, and this repository's CI runs on Windows as well, so a guard that
must hold everywhere cannot *rest* on it. So both are used, for what each is
worth: :func:`resolve_within` for a decision any platform can make, and
:func:`open_no_follow` so the actual read refuses a link by construction where
the flag exists. The residual on Windows is real and is named here rather than
papered over.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

#: Set on platforms whose ``open`` can refuse a symlink outright. Absent on
#: Windows, where the containment check below is the whole answer.
O_NOFOLLOW = getattr(os, "O_NOFOLLOW", 0)


def resolve_within(root: Path, relative: str) -> Optional[Path]:
    """The file ``relative`` names inside ``root``, or ``None``.

    Three conditions, and none of them is redundant:

    * the joined path, once resolved, is still inside the resolved root —
      this is what catches a symlink planted anywhere along the way, and it is
      the only one of the three that a caller cannot get right by inspecting
      the string it was given;
    * no component is itself a link, checked before resolving, so a link to a
      file that *is* inside the workspace is refused too. A teammate that can
      make ``1.png`` point at ``../../crew.db`` can also make it point at
      another workspace file, and "served the wrong file" is still wrong;
    * it is a regular file. A fifo or a device node inside the workspace would
      otherwise hang the response.
    """
    try:
        candidate = root / relative
        # Walk down from the root rather than checking the leaf alone: a link
        # in a *parent* directory redirects everything under it, and the leaf
        # looks innocent from where it lands.
        probe = root
        for part in Path(relative).parts:
            probe = probe / part
            if probe.is_symlink():
                return None
        resolved = candidate.resolve()
        if not resolved.is_relative_to(root.resolve()):
            return None
    except (OSError, ValueError):
        # A path too long, a loop of links, a name the filesystem refuses.
        # Every one of them is a reason not to serve the file.
        return None
    return resolved if resolved.is_file() else None


def open_no_follow(path: Path) -> int:
    """Open for reading, refusing a symlink where the platform can.

    Returns a file descriptor the caller owns. Raises ``OSError`` — including
    ``ELOOP`` when the flag is present and the path turned out to be a link
    after all, which is the TOCTOU window closing rather than being checked.
    """
    return os.open(os.fspath(path), os.O_RDONLY | O_NOFOLLOW)
