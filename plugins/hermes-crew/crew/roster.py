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

from crew import approvals as crew_approvals
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


#: Errand's four agent states. ``waiting_for_approval`` is the one that earns
#: its keep: it is the only state that needs a *person*, and before this the
#: sidebar rendered it identically to "idle" — a teammate stopped at the door
#: with a drafted email looked exactly like a teammate with nothing to do.
AGENT_STATUSES = ("working", "idle", "waiting_for_approval", "offline")


def teammate_status(conn: sqlite3.Connection, bot_id: str, *, working: bool = False) -> str:
    """Resolve a teammate's state for the roster.

    ``waiting_for_approval`` outranks ``working``: a teammate can have a held
    action *and* a running follow-up turn, and the held action is the one the
    operator has to do something about.
    """
    thread_id = crew_db.dm_thread_id(bot_id)
    if crew_approvals.latest_pending_approval(conn, thread_id) is not None:
        return "waiting_for_approval"
    if working:
        return "working"
    return "idle" if profile_dir(bot_id).is_dir() else "offline"


def teammate_view(conn: sqlite3.Connection, bot: dict, *, working: bool = False) -> dict:
    """Shape one roster row the way the sidebar wants it."""
    thread_id = crew_db.dm_thread_id(bot["id"])
    return {
        "id": bot["id"],
        "name": bot["name"],
        "role": bot["role"],
        "emoji": bot["emoji"],
        "section_id": bot["section_id"],
        "thread_id": thread_id,
        "created_at": bot["created_at"],
        "status": teammate_status(conn, bot["id"], working=working),
        "exists": profile_dir(bot["id"]).is_dir(),
        "last_message": crew_db.last_message(conn, thread_id),
    }


def list_teammates(conn: sqlite3.Connection) -> list[dict]:
    """The roster, with each teammate's live state.

    "Who is working right now" lives in the orchestrator's in-process registry,
    not the database — it is a transient, and a crashed process must not leave
    a teammate looking busy forever.
    """
    from crew.orchestrator import working_bot_ids

    busy = working_bot_ids()
    return [
        teammate_view(conn, bot, working=bot["id"] in busy)
        for bot in crew_db.list_bots(conn)
    ]


def list_conversations(conn: sqlite3.Connection) -> list[dict]:
    """Every thread the sidebar shows: one DM per teammate, then group threads.

    ``subtitle`` differs by kind on purpose — a DM's subtitle is the teammate's
    job (what it is *for*), a group's is who is in it (what it can *reach*).
    """
    bots = {b["id"]: b for b in crew_db.list_bots(conn)}
    conversations: list[dict] = []

    for bot in bots.values():
        thread_id = crew_db.dm_thread_id(bot["id"])
        thread = crew_db.get_thread(conn, thread_id)
        conversations.append(
            {
                "id": thread_id,
                "kind": "dm",
                "title": bot["name"],
                "emoji": bot["emoji"],
                "subtitle": bot["role"],
                "members": [bot["id"]],
                "created_at": (thread or {}).get("created_at") or bot["created_at"],
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
                "created_at": row["created_at"],
                "last_message": crew_db.last_message(conn, row["id"]),
            }
        )

    return conversations


def conversations_for(conn: sqlite3.Connection, bot_id: str) -> list[dict]:
    """This teammate's threads: its DM first, then any room it sits in.

    The DM has to come first — the ported controller opens ``conversations[0]``
    when a teammate is selected (``useCrewController``'s snapshot effect), and
    clicking a name in the sidebar means "talk to them", not "join whichever
    room they happen to be in".
    """
    dm_id = crew_db.dm_thread_id(bot_id)
    return [
        view
        for view in list_conversations(conn)
        if view["id"] == dm_id or bot_id in (view.get("members") or [])
    ]


# ---------------------------------------------------------------------------
# Model providers
# ---------------------------------------------------------------------------


def model_providers() -> list[dict]:
    """The providers a new teammate can be pointed at.

    ``explicit_only`` is the important flag: it keeps ambient, auto-discovered
    credentials out of the list, so the hire dialog can only offer a provider
    the operator has actually configured. Offering one they have not would
    produce a teammate that fails on its first turn.

    Network probing is off — this is a dialog open, not a model refresh, and a
    slow local endpoint must not hold up hiring.
    """
    from hermes_cli.inventory import build_models_payload, load_picker_context

    payload = build_models_payload(
        load_picker_context(),
        explicit_only=True,
        probe_custom_providers=False,
    )
    return [row for row in (payload.get("providers") or []) if isinstance(row, dict)]


# ---------------------------------------------------------------------------
# Hiring
# ---------------------------------------------------------------------------


class HireError(ValueError):
    """A hire that cannot proceed, with a message meant for the operator."""


def apply_model_provider(bot_id: str, provider_id: str) -> None:
    """Point one teammate at a specific provider from the catalog.

    Written into *that teammate's* ``config.yaml`` under a HERMES_HOME
    override, which is what lets one crew run on several providers at once —
    ``orchestrator._resolve_model_and_runtime`` re-reads both keys inside the
    same override at the start of every turn.

    Only providers :func:`model_providers` offered can arrive here, and it only
    offers ones the operator has explicitly configured, so this cannot point a
    teammate at an endpoint it has no credentials for.
    """
    provider = (provider_id or "").strip()
    if not provider:
        return
    from hermes_constants import reset_hermes_home_override, set_hermes_home_override

    token = set_hermes_home_override(str(profile_dir(bot_id)))
    try:
        from hermes_cli.config import load_config, save_config

        cfg = load_config()
        model_cfg = cfg.get("model")
        if not isinstance(model_cfg, dict):
            # A bare string means "just the model id". Keep it as the default
            # rather than dropping the operator's choice on the floor.
            model_cfg = {"default": model_cfg} if isinstance(model_cfg, str) else {}
        model_cfg["provider"] = provider
        cfg["model"] = model_cfg
        save_config(cfg)
    finally:
        reset_hermes_home_override(token)


def hire(
    conn: sqlite3.Connection,
    *,
    name: str,
    role: str = "",
    emoji: str = "🤖",
    clone_from: Optional[str] = "default",
    with_computer: bool = True,
    group_id: Optional[str] = None,
    soul: Optional[str] = None,
    model_provider: str = "",
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

    write_soul(bot_id, (soul or "").strip() or soul_from_job(display_name, role))
    if model_provider:
        try:
            apply_model_provider(bot_id, model_provider)
        except Exception:
            log.exception("crew: could not set the provider for %s", bot_id)
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


def duplicate(conn: sqlite3.Connection, bot_id: str) -> dict:
    """Hire a second teammate cloned from an existing one.

    Because a teammate *is* a profile, this is genuinely a copy: cloning from
    ``bot_id`` brings its model, provider keys and config across, and its
    ``SOUL.md`` is carried over verbatim. What deliberately does **not** come
    with it is the original's ``MEMORY.md`` and thread history — those are the
    record of work *that* teammate did, and inheriting somebody else's memories
    of conversations they were not in is a bug, not a feature.

    Errand leaves this unimplemented (``contract_pending``). It costs us almost
    nothing because ``create_profile`` already clones.
    """
    from hermes_cli.profiles import profile_exists

    source = crew_db.get_bot(conn, bot_id)
    if source is None:
        raise HireError(f"There is no teammate called {bot_id}.")

    base = source["name"]
    for suffix in range(2, 100):
        candidate = f"{base} {suffix}"
        candidate_id = slugify_bot_id(candidate)
        if crew_db.get_bot(conn, candidate_id) is None and not profile_exists(candidate_id):
            # "You are Atlas" on a teammate the roster calls "Atlas 2" would
            # have it introduce itself as its original. The name is the one
            # thing about the soul that must not be inherited verbatim.
            soul = read_soul(bot_id)
            if soul and base:
                soul = re.sub(rf"\b{re.escape(base)}\b", candidate, soul)
            return hire(
                conn,
                name=candidate,
                role=source["role"],
                emoji=source["emoji"],
                clone_from=bot_id,
                soul=soul or None,
            )
    raise HireError(f"There are already too many copies of {base}.")


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
