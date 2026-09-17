"""The teammate ⇄ profile bridge.

**A teammate is a Hermes profile.** ``bots.id`` in ``crew.db`` *is* the profile
id, so ``~/.hermes/profiles/researcher/`` is everything the Scout is: its
``SOUL.md``, its ``memories/MEMORY.md``, its skills, its model, its ``.env``,
its session history, its cron jobs. Hiring a teammate is
``profiles.create_profile``; firing one is ``profiles.delete_profile``.

This module owns only the thin layer a profile has no concept of — display
name, emoji, one-line job — and the config a teammate needs to behave like one:
the ``crew`` toolset enabled, and a Docker terminal backend pointed at the
crew-computer image so it has a computer of its own.

Nothing here reaches into a profile's internals directly; every write goes
through ``hermes_cli.profiles`` / ``hermes_cli.config`` under a HERMES_HOME
override, so a teammate is indistinguishable from a profile made by hand with
``hermes -p researcher setup``.
"""

from __future__ import annotations

import logging
import re
import sqlite3
from pathlib import Path
from typing import Optional

from crew import db as crew_db

log = logging.getLogger(__name__)

# The seed crew, ported from OpenGrokBot's `gateway/src/seed.ts`. Shipped as
# real SOUL.md files under `teammates/` so an operator can read and edit them
# like any other profile identity rather than hunting for a string in Python.
SEED_TEAMMATES: tuple[tuple[str, str, str], ...] = (
    ("chief", "🎖️", "Keeps the board: who owns what, by when, and what needs you today"),
    ("researcher", "🔎", "Turns a one-line question into a decision-ready brief with sources"),
    ("inbox-keeper", "📥", "Triages what you forward, drafts replies — drafts only, never sends"),
    ("market-watch", "📈", "Watches your list, digests and threshold alerts — read-only, never trades"),
)

_TEAMMATES_DIR = Path(__file__).resolve().parent.parent / "teammates"


def slugify_bot_id(name: str) -> str:
    """Turn a typed display name into a profile id.

    Lowercase, non-alphanumerics collapsed to single hyphens, trimmed. The
    result still has to clear ``profiles.validate_profile_name`` (which rejects
    reserved names like ``hermes`` and ``default``) — this only gets the shape
    right, it does not decide legality.
    """
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower())
    return slug.strip("-")


def soul_from_job(name: str, role: str) -> str:
    """The minimum viable soul for a new teammate.

    Ported from OpenGrokBot's ``bots.ts``. Deliberately short: the product's
    claim is that a teammate accumulates its character through use — via
    ``MEMORY.md`` rules and learned skills — not through a setup form. Giving
    it a stance to start from is enough.
    """
    opening = role.strip() or "Your operator will tell you what matters as you go."
    return f"""# {name}

You are {name}. {opening}

**Temperament**: straight-talking, allergic to filler. You would rather ask one sharp question than guess twice.

**Voice**: short sentences, numbers over adjectives. You say what you did, what you found, and what needs your operator.

**Pride**: your operator never has to ask you for a status update.

**You are not**: a yes-machine. When something does not line up, you say so instead of smoothing it over.
"""


def profile_dir(bot_id: str) -> Path:
    from hermes_cli.profiles import get_profile_dir

    return get_profile_dir(bot_id)


def soul_path(bot_id: str) -> Path:
    return profile_dir(bot_id) / "SOUL.md"


def read_soul(bot_id: str) -> str:
    """Return the teammate's SOUL.md, or ``""`` when it has none.

    A missing soul is survivable — Hermes falls back to its default identity —
    so this never raises. A teammate with no soul is a bland teammate, not a
    broken one.
    """
    try:
        return soul_path(bot_id).read_text(encoding="utf-8")
    except OSError:
        return ""


def write_soul(bot_id: str, text: str) -> None:
    path = soul_path(bot_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def display_name_from_soul(soul: str, fallback: str) -> str:
    """Pull the display name out of the first ``# Heading`` of a SOUL.md."""
    match = re.search(r"^#\s+(.+)$", soul, re.MULTILINE)
    return match.group(1).strip() if match else fallback


# ---------------------------------------------------------------------------
# Profile config
# ---------------------------------------------------------------------------


def configure_profile_for_crew(bot_id: str, *, with_computer: bool = True) -> None:
    """Enable the ``crew`` toolset (and optionally the computer) on a profile.

    Runs under a HERMES_HOME override so ``load_config``/``save_config`` resolve
    to *this teammate's* ``config.yaml``. The override is a contextvar, which
    both of those read at call time — see ``hermes_constants.get_hermes_home``.

    The computer settings are why a teammate's shell and browser tools land in
    its own container without any crew-specific tool code: Hermes's Docker
    terminal backend already does ``docker run -d`` + ``docker exec`` with
    per-``task_id`` reuse, and ``docker_extra_args`` publishes the noVNC and
    CDP ports on loopback for the panel and the browser tools to attach to.
    See ``crew/computer.py`` for how those ports are discovered.
    """
    from hermes_constants import reset_hermes_home_override, set_hermes_home_override

    token = set_hermes_home_override(str(profile_dir(bot_id)))
    try:
        from hermes_cli.config import load_config, save_config

        cfg = load_config()
        toolsets = list(cfg.get("toolsets") or [])
        for name in ("crew", "hermes-cli"):
            if name not in toolsets:
                toolsets.append(name)
        cfg["toolsets"] = toolsets

        if with_computer:
            from crew.computer import apply_computer_config

            apply_computer_config(cfg, bot_id)

        save_config(cfg)
    finally:
        reset_hermes_home_override(token)


# ---------------------------------------------------------------------------
# Roster reads
# ---------------------------------------------------------------------------


def teammate_view(conn: sqlite3.Connection, bot: dict) -> dict:
    """Shape one roster row the way the sidebar wants it."""
    return {
        "id": bot["id"],
        "name": bot["name"],
        "role": bot["role"],
        "emoji": bot["emoji"],
        "section_id": bot["section_id"],
        "thread_id": crew_db.dm_thread_id(bot["id"]),
        "exists": profile_dir(bot["id"]).is_dir(),
        "last_message": crew_db.last_message(conn, crew_db.dm_thread_id(bot["id"])),
    }


def list_teammates(conn: sqlite3.Connection) -> list[dict]:
    return [teammate_view(conn, bot) for bot in crew_db.list_bots(conn)]


def list_conversations(conn: sqlite3.Connection) -> list[dict]:
    """Every thread the sidebar shows: one DM per teammate, then group threads.

    ``subtitle`` differs by kind on purpose — a DM's subtitle is the teammate's
    job (what it is *for*), a group's is who is in it (what it can *reach*).
    """
    bots = {b["id"]: b for b in crew_db.list_bots(conn)}
    conversations: list[dict] = []

    for bot in bots.values():
        thread_id = crew_db.dm_thread_id(bot["id"])
        conversations.append(
            {
                "id": thread_id,
                "kind": "dm",
                "title": bot["name"],
                "emoji": bot["emoji"],
                "subtitle": bot["role"],
                "members": [bot["id"]],
                "last_message": crew_db.last_message(conn, thread_id),
            }
        )

    rows = conn.execute(
        "SELECT * FROM threads WHERE kind = 'group' ORDER BY title COLLATE NOCASE"
    ).fetchall()
    for row in rows:
        members = crew_db.thread_members(conn, row["id"])
        conversations.append(
            {
                "id": row["id"],
                "kind": "group",
                "title": row["title"],
                "emoji": "👥",
                "subtitle": ", ".join(bots[m]["name"] if m in bots else m for m in members),
                "members": members,
                "last_message": crew_db.last_message(conn, row["id"]),
            }
        )

    return conversations


# ---------------------------------------------------------------------------
# Hiring
# ---------------------------------------------------------------------------


class HireError(ValueError):
    """A hire that cannot proceed, with a message meant for the operator."""


def hire(
    conn: sqlite3.Connection,
    *,
    name: str,
    role: str = "",
    emoji: str = "🤖",
    clone_from: Optional[str] = "default",
    with_computer: bool = True,
    group_id: Optional[str] = None,
) -> dict:
    """Hire a teammate: a name and one line of job description, nothing more.

    Creating the profile is the expensive, failure-prone half (it seeds skills
    and may write a shell alias), so it happens *first*: if it fails, the
    roster is untouched and the operator can retry the same name. Only once
    the profile exists do we write the soul, flip the config, and insert the
    roster row.

    ``clone_from="default"`` copies the operator's model and provider keys so a
    new teammate can work immediately instead of landing on a profile with no
    credentials.
    """
    from hermes_cli.profiles import (
        normalize_profile_name,
        profile_exists,
        validate_profile_name,
    )

    display_name = name.strip()
    if not display_name:
        raise HireError("A teammate needs a name.")

    bot_id = slugify_bot_id(display_name)
    if not bot_id:
        raise HireError("That name has no letters or digits to build an id from.")

    try:
        bot_id = normalize_profile_name(bot_id)
        validate_profile_name(bot_id)
    except ValueError as exc:
        raise HireError(str(exc)) from exc

    if crew_db.get_bot(conn, bot_id) is not None:
        raise HireError(f"A teammate called {bot_id} already exists.")
    if profile_exists(bot_id):
        raise HireError(
            f"A profile called {bot_id} already exists. "
            f"Pick another name, or add it to the crew instead of hiring a new one."
        )

    from hermes_cli.profiles import create_profile

    try:
        create_profile(bot_id, clone_from=clone_from, clone_config=bool(clone_from))
    except Exception as exc:  # noqa: BLE001 — surfaced to the operator verbatim
        raise HireError(f"Could not create the profile for {bot_id}: {exc}") from exc

    write_soul(bot_id, soul_from_job(display_name, role))
    try:
        configure_profile_for_crew(bot_id, with_computer=with_computer)
    except Exception:
        # A teammate with a profile but no crew config is recoverable (the
        # operator can re-run setup); one that vanished from the roster because
        # a config write failed is not. Keep the hire, log the miss.
        log.exception("crew: could not configure profile %s for crew", bot_id)

    crew_db.upsert_bot(conn, bot_id=bot_id, name=display_name, role=role.strip(), emoji=emoji)
    crew_db.ensure_dm_thread(conn, bot_id)

    if group_id:
        thread = crew_db.get_thread(conn, group_id)
        if thread:
            members = [*crew_db.thread_members(conn, group_id), bot_id]
            crew_db.ensure_group_thread(conn, group_id, thread["title"], members)

    return teammate_view(conn, crew_db.get_bot(conn, bot_id))  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# Seeding
# ---------------------------------------------------------------------------


def seed_from_disk(conn: sqlite3.Connection, *, create_profiles: bool = False) -> list[str]:
    """Register the shipped seed teammates that already have a profile.

    Runs on every boot and is idempotent. ``create_profiles=False`` by default
    because creating four profiles unasked on first launch would seed four sets
    of skills and write four shell aliases for someone who may only want one
    teammate — the ``/crew`` onboarding asks first, then calls this with
    ``create_profiles=True``.
    """
    from hermes_cli.profiles import profile_exists

    seeded: list[str] = []
    for bot_id, emoji, role in SEED_TEAMMATES:
        soul_file = _TEAMMATES_DIR / bot_id / "SOUL.md"
        if not soul_file.is_file():
            continue

        if not profile_exists(bot_id):
            if not create_profiles:
                continue
            try:
                from hermes_cli.profiles import create_profile

                create_profile(bot_id, clone_from="default", clone_config=True)
            except Exception:
                log.exception("crew: could not seed profile %s", bot_id)
                continue
            write_soul(bot_id, soul_file.read_text(encoding="utf-8"))
            try:
                configure_profile_for_crew(bot_id)
            except Exception:
                log.exception("crew: could not configure seeded profile %s", bot_id)

        soul = read_soul(bot_id) or soul_file.read_text(encoding="utf-8")
        crew_db.upsert_bot(
            conn,
            bot_id=bot_id,
            name=display_name_from_soul(soul, bot_id),
            role=role,
            emoji=emoji,
        )
        crew_db.ensure_dm_thread(conn, bot_id)
        seeded.append(bot_id)

    return seeded


def chief_id() -> str:
    """The teammate that closes group threads and hubs every handoff."""
    from hermes_cli.config import cfg_get, load_config_readonly

    configured = cfg_get(load_config_readonly(), "crew", "chief", default="") or ""
    return str(configured).strip() or "chief"
