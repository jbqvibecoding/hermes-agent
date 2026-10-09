"""Hermes Crew — the crew's own control plane is not a file a teammate reads.

Ported from LifeOS' sidecar policy (MIT, Copyright (c) 2025-2026 Daniel
Miessler, ``LIFEOS/HERMES/Policy.ts``), including the glob lessons it paid for
in production. What it protects is not what we protect, so the rule list is
ours; the *shape* and the traps are theirs.

**Why this is not already handled.** ``agent/file_safety.py`` says so itself,
repeatedly: "This is NOT a security boundary — the terminal tool can still
bypass." It is defence-in-depth for the *file tools*, and `terminal` /
`execute_code` do not consult it. Its read guard does block ``.env`` and
``auth.json``. Checked against this crew's own state, it does not block:

===========================  ====================================================
``crew-vault.key``           the key that decrypts **every** credential the
                             vault holds
``crew.db``                  the ``grants`` table, and the vault ciphertexts the
                             key above opens
``config.yaml`` (read)       ``approvals.deny`` and ``plugins.enabled`` — writes
                             are blocked by core, reads are not
``plugins/`` / ``cron/``     this guard's own code, and unattended job
                             definitions
``~/.ssh`` / ``~/.aws`` …    OS credential material
===========================  ====================================================

The first two are the serious ones and they are specific to us. The vault's
whole claim is that *a teammate is never handed the credential* — the operator
types into a masked box, or the vault fills the page over CDP, and the
characters never enter the model's context. A teammate that can call
``read_file`` on the key and ``crew.db`` defeats that in two calls, and
``read_file`` is **allow** in the risk table, because it "stays inside this
teammate's own computer".

**Deny, never ask.** This floor returns ``deny`` and sits above the taint floor,
because credential material is not a thing to put an Approve button under.
LifeOS' refusal message is the right register: never readable from here — not
with authorization, not rephrased, not via the shell.

**Paths are computed, not pattern-matched against ``~/.hermes``.** The rules are
built from :func:`crew.db.crew_home` at call time, so they are right under a
profile, under ``HERMES_CREW_HOME``, and in the test suite — where a hardcoded
``**/.hermes/**`` glob would either miss or match everything.

**Three glob traps, all of them theirs and all of them expensive:**

1. ``*.env*`` as a *command* glob also matches ``os.environ`` and
   ``process.env``. Six of their guard's first eleven blocks were ordinary code
   touching no file, and it killed their mail-monitor cron outright. A glob that
   fires on normal work teaches everyone to route around the guard, so the env
   command rules here are path-anchored.
2. The same mistake inverted is worse. Their ``*.claude*`` denied every command
   naming the LifeOS tree — which was every skill CLI, since all of them live
   there — so the guard denied the mount its only way to do useful work while
   looking like ordinary hardening. Nothing here denies a whole tree a teammate
   works in.
3. A rule must match the directory itself as well as its contents, and must
   survive symlinks, case (macOS opens ``.ENV`` as ``.env``) and ``..``.
"""

from __future__ import annotations

import fnmatch
import logging
import os
from pathlib import Path
from typing import Any, Iterable, Optional

log = logging.getLogger(__name__)

#: Tools whose arguments carry a path worth inspecting, and which keys hold it.
PATH_ARGS: dict[str, tuple[str, ...]] = {
    "read_file": ("path", "file_path", "filename"),
    "read_file_raw": ("path", "file_path", "filename"),
    "write_file": ("path", "file_path", "filename"),
    "patch": ("path", "file_path", "filename"),
    "edit_file": ("path", "file_path", "filename"),
    "remove_file": ("path", "file_path", "filename"),
    "grep": ("path", "dir", "directory"),
    "search_files": ("path", "dir", "directory"),
    "list_files": ("path", "dir", "directory"),
    "glob": ("path", "dir", "directory"),
}

#: Tools whose whole payload is a command or a program body.
#:
#: ``execute_code`` matters as much as ``terminal``: two lines of Python read
#: any file the process can reach, and a guard that watches only the shell has
#: a documented hole.
COMMAND_ARGS: dict[str, tuple[str, ...]] = {
    "terminal": ("command", "cmd", "script"),
    "read_terminal": ("command", "cmd"),
    "execute_code": ("code", "source", "script", "program"),
    "bash": ("command", "cmd", "script"),
    "shell": ("command", "cmd", "script"),
}

#: Credential material by name, anywhere on disk. Blocking a read here costs a
#: teammate nothing it legitimately needs: the vault fills a password into a
#: page without the teammate seeing it, and a tool that needs a token reads it
#: in its own process and returns a result.
_CREDENTIAL_RULES: tuple[tuple[str, str], ...] = (
    ("**/.ssh/**", "SSH private key material"),
    ("**/.aws/**", "cloud provider credentials"),
    ("**/.kube/**", "cluster credentials"),
    ("**/.gnupg/**", "GPG key material"),
    ("**/.docker/config.json", "registry credentials"),
    ("**/.netrc", "machine credential file"),
    ("**/id_rsa*", "SSH private key"),
    ("**/id_ed25519*", "SSH private key"),
    ("**/*.pem", "private key or certificate"),
    ("**/*.p12", "key bundle"),
    ("**/*.keystore", "key bundle"),
    ("**/.credentials.json", "credential store"),
    # A sibling agent's token store. Ours is already covered by the core read
    # guard; a neighbour's is not, and is just as good to an attacker.
    ("**/.codex/**", "another agent's credential store"),
    ("**/.claude/.credentials.json", "another agent's credential store"),
)

_SHELL_DENY_GLOBS: tuple[str, ...] = (
    # Path-anchored, deliberately. See trap 1 in the module docstring: the
    # obvious `*.env*` matches `os.environ` and `process.env`.
    "*/.env*",
    "* .env*",
    '*".env*',
    "*'.env*",
    "*/.ssh*",
    "* .ssh*",
    "*/.aws*",
    "*/.kube*",
    "*/.gnupg*",
    "*.netrc*",
    "*/.codex*",
    "*keychain*",
    "*security find-generic-password*",
    "*security find-internet-password*",
)


def _crew_control_plane() -> tuple[tuple[str, str], ...]:
    """The crew's own state, resolved against this install.

    Computed rather than globbed so it is correct under a profile, under
    ``HERMES_CREW_HOME``, and in the test suite.
    """
    try:
        from crew import db as crew_db

        home = str(crew_db.crew_home()).rstrip("/")
        db = str(crew_db.crew_db_path())
    except Exception:
        log.debug("crew: could not resolve the crew home for the sensitive guard", exc_info=True)
        return ()
    return (
        (f"{home}/crew-vault.key",
         "the vault key — it decrypts every credential saved for this crew"),
        # -wal and -shm carry committed pages, so the base name is not enough.
        (f"{db}*", "crew.db — the grant table and the vault's ciphertexts"),
        (f"{home}/config.yaml",
         "the config that holds this crew's permission rules and which plugins load"),
        (f"{home}/plugins/**", "this guard's own code"),
        (f"{home}/cron/**", "the definitions of jobs that run with nobody watching"),
        (f"{home}/bin/**", "the runtime's own binaries"),
    )


def _rules() -> tuple[tuple[str, str], ...]:
    return _crew_control_plane() + _CREDENTIAL_RULES


def _spellings(raw: Any) -> list[str]:
    """Every spelling of a path a rule should be tested against.

    Absolute form plus the symlink-resolved form when they differ, both
    lowercased. Each of the three — a symlink, a case variant, a ``..`` — walks
    straight past a naive matcher on its own.
    """
    try:
        expanded = os.path.expanduser(os.path.expandvars(str(raw))).strip()
        if not expanded:
            return []
        absolute = os.path.abspath(expanded)
        out = [absolute]
        try:
            # strict=False so a path that does not exist yet still normalises —
            # a write to a not-yet-created file is exactly the case that matters.
            resolved = str(Path(absolute).resolve(strict=False))
            if resolved != absolute:
                out.append(resolved)
        except Exception:
            pass
        return [p.lower() for p in out]
    except Exception:
        return []


def _matches(spellings: Iterable[str], pattern: str) -> bool:
    """fnmatch a pattern against every spelling.

    Python's ``fnmatch`` lets ``*`` span ``/``, so ``**/.env`` already matches
    ``/a/b/.env``. Two cases still need help: a tree rule (``**/.ssh/**``) has
    to fire on the directory itself, and a name rule has to fire on a bare
    relative path (``read_file(".env")``).
    """
    pat = pattern.lower()
    forms = [pat]
    if pat.endswith("/**"):
        forms.append(pat[:-3])
    bare = pat[3:] if pat.startswith("**/") else None
    for candidate in spellings:
        if any(fnmatch.fnmatch(candidate, form) for form in forms):
            return True
        if bare and fnmatch.fnmatch(os.path.basename(candidate), bare):
            return True
    return False


def check_path(raw_path: Any) -> Optional[str]:
    """Why this path is refused, or None."""
    spellings = _spellings(raw_path)
    if not spellings:
        return None
    for pattern, reason in _rules():
        if _matches(spellings, pattern):
            return reason
    return None


def _path_tokens(command: str) -> list[str]:
    """Anything path-shaped in a command or a program body.

    Quoted paths inside source count, because ``execute_code`` bodies come
    through here too: ``open('~/.aws/credentials')`` is a credential read.
    """
    scratch = command
    for ch in "|;&,()[]{}":
        scratch = scratch.replace(ch, " ")
    tokens = []
    for raw in scratch.split():
        token = raw.strip("\"'`<>=")
        if token and (token.startswith(("~", "/", "./", "../")) or "/" in token):
            tokens.append(token)
    return tokens


def check_command(command: Any) -> Optional[str]:
    """Why this command is refused, or None."""
    text = str(command or "")
    if not text:
        return None
    lowered = text.lower()
    for glob in _SHELL_DENY_GLOBS:
        if fnmatch.fnmatch(lowered, glob):
            return f"the command matches a credential rule ({glob})"
    # A command can also name a protected path without matching a command glob
    # — `sqlite3 ~/.hermes/crew.db "UPDATE grants ..."` is the case that matters.
    for token in _path_tokens(text):
        reason = check_path(token)
        if reason:
            return reason
    return None


def evaluate(tool: str, args: Any) -> Optional[tuple[str, str]]:
    """``(what, why)`` when this call must be refused, else None."""
    if not isinstance(args, dict):
        return None
    for key in PATH_ARGS.get(tool, ()):
        value = args.get(key)
        if isinstance(value, str) and value:
            reason = check_path(value)
            if reason:
                return (value, reason)
    for key in COMMAND_ARGS.get(tool, ()):
        value = args.get(key)
        if isinstance(value, str) and value:
            reason = check_command(value)
            if reason:
                return (value, reason)
    return None
