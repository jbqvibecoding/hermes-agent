"""Credentials a teammate can use without a person at the keyboard.

``crew/secrets.py`` already gets a password into a page without the teammate
seeing it: the teammate names the field it is stuck on, the operator types into
a masked box, and the characters go straight into the page over CDP. That is
the right answer when somebody is there. Its limit is the whole reason this
module exists — a teammate that hits a login wall at 03:00, or inside a
routine, simply stops.

So: the operator saves the credential once, bound to the site it belongs to,
and the next time a teammate is stuck on that field the same ``ask_for_login``
answers itself. **No new tool.** The teammate's side of the conversation does
not change at all, which is deliberate: openinstinct ships two tools for this
(``list_vault`` to enumerate and ``fill_from_vault`` to use), and a model that
can enumerate saved credentials is a model that can be asked what its operator
has accounts with. Here nothing lists them and there is no handle to pass.

Ported in shape from openinstinct's ``db/services/vault.ts`` (MIT), and two of
its decisions are the ones worth having:

**The ciphertext is bound to who and what it is for.** AES-256-GCM's additional
authenticated data is ``<bot_id>\\0vault\\0<item_id>``, so a row moved between
teammates or between items fails to decrypt rather than decrypting into the
wrong hands. "Encrypt the column" leaves that open; this closes it for the cost
of one string.

**Metadata and ciphertext live in different tables.** Listing what is saved —
for the dashboard, never for the model — touches only ``vault_items``, and what
it shows is deliberately lossy: ``zendesk.com · j…@example.com``. Enough for a
person to recognise the entry, not enough to be worth stealing.

**What this is not.** One key decrypts every entry, and it sits on the same
disk as the database. This defends the database — a copied ``crew.db``, a
backup, a stray upload — and it does not defend against someone who already
runs code as this user. openinstinct's README invites a stronger reading than
its code supports (there is no key derivation there and no rotation); ours says
it here instead. See also ``docs/`` note in ``ask_for_login``: once the value is
in the page, a teammate that can run page script can read it back out. The
honest claim is *the teammate is not handed the credential*, not *the teammate
cannot obtain it*.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import sqlite3
import uuid
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlsplit

log = logging.getLogger(__name__)

#: Self-describing and versioned, like openinstinct's. Nothing reads the
#: version yet except to refuse anything else, which is the point: the day the
#: construction changes, old rows are still identifiable rather than garbage.
ENVELOPE_VERSION = "v1"

#: AES-256-GCM. 12 bytes is the nonce size the construction is specified for.
_KEY_BYTES = 32
_IV_BYTES = 12

KEY_FILENAME = "crew-vault.key"

#: Kinds we will fill. A one-time code is deliberately absent: it is fresh by
#: definition, so a saved one is either expired or somebody has misunderstood
#: what they saved.
KINDS = ("password", "username")


class VaultError(RuntimeError):
    """The vault refused. The message is safe to show an operator."""


# ---------------------------------------------------------------------------
# The key
# ---------------------------------------------------------------------------


def key_path() -> Path:
    from crew import db as crew_db

    return crew_db.crew_home() / KEY_FILENAME


def _key() -> bytes:
    """The vault key, created on first use.

    Never in ``crew.db``: a key in the database it protects is an ornament.
    Written with ``O_EXCL`` so two processes starting together cannot both
    believe they made it, and refused outright if its mode has widened —
    a group-readable vault key is not a vault, and silently carrying on would
    make this module a claim rather than a control.
    """
    path = key_path()
    try:
        stat = path.stat()
    except FileNotFoundError:
        return _create_key(path)

    if stat.st_mode & 0o077:
        raise VaultError(
            f"{path} is readable by somebody other than you ({oct(stat.st_mode & 0o777)}). "
            f"Run `chmod 600 {path}` — until then nothing will be filled from the vault."
        )
    key = path.read_bytes()
    if len(key) != _KEY_BYTES:
        raise VaultError(
            f"{path} is not a {_KEY_BYTES}-byte key. Move it aside and anything saved "
            f"before now will have to be saved again."
        )
    return key


def _create_key(path: Path) -> bytes:
    key = os.urandom(_KEY_BYTES)
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        # Somebody else won the race; theirs is as good as ours.
        return _key()
    try:
        os.write(fd, key)
    finally:
        os.close(fd)
    log.info("crew: created a vault key at %s", path)
    return key


# ---------------------------------------------------------------------------
# The envelope
# ---------------------------------------------------------------------------


def _aad(bot_id: str, item_id: str) -> bytes:
    """What this ciphertext is allowed to be.

    openinstinct's is ``<workspaceId>\\0vault\\0<id>``; ours names the teammate
    instead of the workspace because that is our isolation boundary. The NUL
    separators are not decoration: without them ``("ab", "c")`` and
    ``("a", "bc")`` would produce the same bytes.
    """
    return f"{bot_id}\0vault\0{item_id}".encode("utf-8")


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def seal(bot_id: str, item_id: str, secret: str) -> str:
    """``v1.<iv>.<tag>.<ciphertext>``, base64url, dot-joined."""
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    iv = os.urandom(_IV_BYTES)
    sealed = AESGCM(_key()).encrypt(iv, secret.encode("utf-8"), _aad(bot_id, item_id))
    # AESGCM appends the 16-byte tag; split it out so the envelope says where
    # everything is rather than relying on the reader knowing.
    body, tag = sealed[:-16], sealed[-16:]
    return ".".join([ENVELOPE_VERSION, _b64(iv), _b64(tag), _b64(body)])


def unseal(bot_id: str, item_id: str, envelope: str) -> str:
    """The secret back, or :class:`VaultError`.

    Every failure is the same error on purpose — a wrong key, a tampered row
    and a row belonging to another teammate are not worth telling apart for
    whoever is trying them.
    """
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM

    parts = (envelope or "").split(".")
    if len(parts) != 4 or parts[0] != ENVELOPE_VERSION:
        raise VaultError("This saved credential is not in a format this version understands.")
    try:
        iv, tag, body = _unb64(parts[1]), _unb64(parts[2]), _unb64(parts[3])
        plain = AESGCM(_key()).decrypt(iv, body + tag, _aad(bot_id, item_id))
    except VaultError:
        raise
    except Exception:
        # Never log the exception: a cryptography error can quote what it was
        # given, and what it was given is the ciphertext.
        raise VaultError("This saved credential could not be read back.") from None
    return plain.decode("utf-8")


# ---------------------------------------------------------------------------
# Origins
# ---------------------------------------------------------------------------


def normalise_origin(url: str) -> Optional[str]:
    """``https://host[:port]`` for a page we are willing to type a password into.

    A credential is bound to one of these at save time and filled only where
    the *live page* reports the same one, so this has to be a canonical form
    rather than whatever somebody pasted.

    Non-secure origins are refused by the same rule browsers use for their own
    credential handling: ``https`` anywhere, or ``http`` on loopback. A
    password typed into a plain ``http`` page on a network is readable by the
    network, and a vault that fills it there is worse than no vault, because
    nobody is watching it happen.
    """
    try:
        parts = urlsplit((url or "").strip())
    except ValueError:
        return None
    scheme, host = parts.scheme.lower(), (parts.hostname or "").lower()
    if not scheme or not host:
        return None
    if parts.username or parts.password:
        return None
    loopback = host in ("localhost", "127.0.0.1", "::1", "[::1]")
    if scheme != "https" and not (scheme == "http" and loopback):
        return None
    port = parts.port
    default = 443 if scheme == "https" else 80
    hostpart = f"[{host}]" if ":" in host else host
    return f"{scheme}://{hostpart}" + (f":{port}" if port and port != default else "")


def account_hint(origin: str, account: str) -> str:
    """What a person sees in a list of saved credentials.

    Lossy on purpose, after openinstinct's ``vaultAccountHint``: enough to
    recognise the entry, not enough to be worth having. ``j…@example.com``
    keeps the domain, which is what tells two accounts apart, and drops the
    local part, which is the half that is sometimes a secret.
    """
    host = (urlsplit(origin).hostname or origin or "").lower()
    name = (account or "").strip()
    if "@" in name:
        local, _, domain = name.partition("@")
        name = f"{local[:1]}…@{domain}" if local else f"…@{domain}"
    elif len(name) > 3:
        name = f"{name[:2]}…"
    return f"{host} · {name}" if name else host


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------


def save(
    conn: sqlite3.Connection,
    *,
    bot_id: str,
    origin: str,
    kind: str,
    secret: str,
    account: str = "",
    label: str = "",
) -> dict:
    """Store one credential for one teammate at one origin.

    Replaces any earlier entry for the same ``(bot_id, origin, kind)``: two
    passwords for one site is a way to fill the wrong one, and the operator
    saving it again is saying which is current.
    """
    from crew import db as crew_db

    if kind not in KINDS:
        raise VaultError(f"{kind!r} is not something the vault fills ({', '.join(KINDS)}).")
    if not secret:
        raise VaultError("Nothing to save.")
    canonical = normalise_origin(origin)
    if canonical is None:
        raise VaultError(
            f"{origin!r} is not an origin a credential can be bound to. It needs to be "
            f"https, or http on this machine."
        )

    item_id = uuid.uuid4().hex
    envelope = seal(bot_id, item_id, secret)
    now = crew_db.now_ms()
    with conn:
        conn.execute(
            "DELETE FROM vault_secrets WHERE item_id IN "
            "(SELECT id FROM vault_items WHERE bot_id=? AND origin=? AND kind=?)",
            (bot_id, canonical, kind),
        )
        conn.execute(
            "DELETE FROM vault_items WHERE bot_id=? AND origin=? AND kind=?",
            (bot_id, canonical, kind),
        )
        conn.execute(
            "INSERT INTO vault_items (id, bot_id, kind, label, account_hint, origin, created_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (item_id, bot_id, kind, (label or "").strip(),
             account_hint(canonical, account), canonical, now),
        )
        conn.execute(
            "INSERT INTO vault_secrets (item_id, bot_id, ciphertext) VALUES (?,?,?)",
            (item_id, bot_id, envelope),
        )
    log.info("crew: saved a %s for %s at %s", kind, bot_id, canonical)
    return {
        "id": item_id, "bot_id": bot_id, "kind": kind, "label": (label or "").strip(),
        "account_hint": account_hint(canonical, account), "origin": canonical,
        "created_at": now,
    }


def find(conn: sqlite3.Connection, *, bot_id: str, origin: str, kind: str) -> Optional[dict]:
    """The entry for this teammate at this origin, or ``None``.

    The origin is normalised on both sides, so a saved ``https://x.com/login``
    matches a live ``https://x.com`` — and a live ``https://evil.x.com`` does
    not.
    """
    canonical = normalise_origin(origin)
    if canonical is None:
        return None
    row = conn.execute(
        "SELECT * FROM vault_items WHERE bot_id=? AND origin=? AND kind=? LIMIT 1",
        (bot_id, canonical, kind),
    ).fetchone()
    return dict(row) if row else None


def secret_for(conn: sqlite3.Connection, *, bot_id: str, item_id: str) -> str:
    """The credential itself. Every caller of this is a filling path."""
    row = conn.execute(
        "SELECT ciphertext FROM vault_secrets WHERE item_id=? AND bot_id=?",
        (item_id, bot_id),
    ).fetchone()
    if row is None:
        raise VaultError("That saved credential is gone.")
    return unseal(bot_id, item_id, row["ciphertext"])


def forget(conn: sqlite3.Connection, *, bot_id: str, item_id: str) -> bool:
    with conn:
        conn.execute("DELETE FROM vault_secrets WHERE item_id=? AND bot_id=?", (item_id, bot_id))
        cursor = conn.execute(
            "DELETE FROM vault_items WHERE id=? AND bot_id=?", (item_id, bot_id)
        )
    return cursor.rowcount > 0


def list_items(conn: sqlite3.Connection, bot_id: str = "") -> list[dict]:
    """What is saved, for a person. **Never given to a model** — see the module
    docstring for why there is no tool that reaches this."""
    if bot_id:
        rows = conn.execute(
            "SELECT * FROM vault_items WHERE bot_id=? ORDER BY origin, kind", (bot_id,)
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM vault_items ORDER BY bot_id, origin, kind"
        ).fetchall()
    return [dict(row) for row in rows]


def describe(conn: sqlite3.Connection, bot_id: str = "") -> str:
    """One line per entry, for the audit ledger and operator-facing messages."""
    return json.dumps(
        [{k: item[k] for k in ("origin", "kind", "account_hint")} for item in
         list_items(conn, bot_id)],
        ensure_ascii=False,
    )
