"""One unprompted message, start to finish.

Ported in shape from octop's ``infra/proactive/service.py`` (MIT — see
``NOTICE.md``), including the decision its docstring leads with: **this does
not run the agent.** No ReAct loop, no tools, no turn. It is a procedure —
read, pick, ask a small model for one sentence, post it — and that is what
makes an unprompted message affordable enough to happen at all. Waking a full
agent loop to produce forty words would cost more than the work it is asking
about.

The step order is octop's too, and the last two steps are the load-bearing
ones: **the message is posted, and only then is the dedup record written.**
Recording first is the obvious way round and it is wrong — a push that fails
after the record lands means that item is never raised again, silently and
permanently. Every failure path below returns without recording, for the same
reason.

What is ours: the material comes from crew.db rather than an episodic memory
store (see :mod:`crew.proactive.picker`), the persona is the teammate's own
``SOUL.md`` through :func:`crew.roster.read_soul`, and the message lands in the
crew thread rather than being pushed to a chat platform. That last one is a
deliberate limit, not an unfinished edge: a note waiting in the thread cannot
wake anybody at 2am, which is what makes leaving this on by default reasonable.
"""

from __future__ import annotations

import logging
from datetime import datetime, time
from typing import Any, Optional

from crew.proactive import picker as crew_picker
from crew.proactive.scheduler import compute_next_trigger, parse_hhmm

log = logging.getLogger(__name__)

#: Long enough to name two or three things and say why they matter; short
#: enough that nobody resents finding it. octop caps at 200 characters and is
#: right to — an unprompted message that needs scrolling has misjudged its
#: welcome.
MAX_CHARS = 400

_TIMEOUT_S = 30.0
_MAX_TOKENS = 300

_DEFAULTS = {
    "enabled": True,
    "min_interval_hours": 4,
    "max_interval_hours": 12,
    "active_start": "09:00",
    "active_end": "21:00",
}

_SYSTEM = (
    "You are a teammate writing a short, unprompted note to the person you work for. "
    "You have not been asked anything — you noticed something and are bringing it up.\n\n"
    "Rules:\n"
    "- Under 80 words. One short paragraph, no lists, no headings, no greeting.\n"
    "- Say what is actually stuck and what you need from them. Be specific.\n"
    "- Do not invent anything not in the notes below. Do not apologise repeatedly.\n"
    "- If nothing needs them, say so in one line rather than padding it out.\n"
    "- Write as yourself, in the voice described below, in the operator's language."
)


def settings() -> dict:
    """The ``crew.proactive`` block, with defaults filled in."""
    try:
        from hermes_cli.config import cfg_get, load_config_readonly

        configured = cfg_get(load_config_readonly(), "crew", "proactive", default={}) or {}
    except Exception:
        log.debug("crew: could not read the proactive settings; using defaults", exc_info=True)
        configured = {}
    merged = dict(_DEFAULTS)
    if isinstance(configured, dict):
        merged.update({k: v for k, v in configured.items() if k in _DEFAULTS})
    return merged


def due(conn, *, now_ms: int) -> list[dict]:
    """Teammates allowed to speak now.

    ``next_speak_at = 0`` means "never scheduled", which is what every existing
    row reads as after the migration. Those are picked up on the first tick and
    given a real time by :func:`reschedule` — so switching this on does not
    make everybody speak at once, it makes everybody get a time.
    """
    rows = conn.execute(
        "SELECT * FROM bots WHERE proactive = 1 AND next_speak_at <= ? ORDER BY next_speak_at",
        (now_ms,),
    ).fetchall()
    return [dict(row) for row in rows]


def reschedule(conn, bot_id: str, *, now: Optional[datetime] = None) -> int:
    """Set when this teammate may next speak, and return it.

    Called after a run whether or not anything was said. A teammate with
    nothing to report still has to be given a next time — otherwise it is due
    forever and every tick pays for the query that finds it.
    """
    config = settings()
    moment = now or datetime.now().astimezone()
    nxt = compute_next_trigger(
        now=moment,
        active_start=parse_hhmm(str(config["active_start"]), time(9, 0)),
        active_end=parse_hhmm(str(config["active_end"]), time(21, 0)),
        min_interval_hours=float(config["min_interval_hours"]),
        max_interval_hours=float(config["max_interval_hours"]),
    )
    stamp = int(nxt.timestamp() * 1000)
    conn.execute("UPDATE bots SET next_speak_at = ? WHERE id = ?", (stamp, bot_id))
    conn.commit()
    return stamp


def run_once(conn, bot: dict, *, now_ms: Optional[int] = None) -> Optional[dict]:
    """Say something if there is something to say. Returns the message, or None.

    Every early return leaves the dedup records untouched, so nothing is
    consumed by a run that produced no message.
    """
    from crew import db as crew_db

    bot_id = str(bot.get("id") or "")
    stamp = crew_db.now_ms() if now_ms is None else now_ms

    candidates = crew_picker.candidates_for(conn, bot_id, now_ms=stamp)
    if not candidates:
        return None

    chosen = crew_picker.pick(
        candidates,
        raised=crew_picker.already_raised(conn, bot_id, now_ms=stamp),
        now_ms=stamp,
    )
    if not chosen.candidates:
        return None

    text = compose(bot, chosen.candidates)
    if not text:
        # No auxiliary model, or it failed. Nothing is posted and nothing is
        # recorded, so this item comes round again next time. A templated
        # fallback would always work, but it would be a notification — and a
        # notification is the thing this feature exists instead of.
        return None

    message = crew_db.insert_message(
        conn,
        thread_id=crew_db.ensure_dm_thread(conn, bot_id),
        sender=bot_id,
        kind="text",
        content=text,
    )
    # Only now. See the module docstring: the other order loses the item for
    # good the first time a write fails.
    crew_picker.record_raised(
        conn, bot_id, [c.subject for c in chosen.candidates], now_ms=stamp,
    )
    log.info(
        "crew: %s raised %d thing(s) unprompted (window %dd)",
        bot_id, len(chosen.candidates), chosen.window_days,
    )
    return message


def compose(bot: dict, candidates: tuple) -> str:
    """One completion, in the teammate's own voice. ``""`` if it cannot be had.

    Same shape as ``crew/policy.py::_ask_model``: the host's auxiliary client
    resolves the active profile's own provider, and a crew run is already
    inside that profile's ``HERMES_HOME``, so this inherits whatever the
    teammate is configured with. ``crew_proactive`` is its own task name, so an
    operator can point just this at a cheap model with
    ``auxiliary.crew_proactive.model`` without touching anything else.
    """
    from crew import roster

    bot_id = str(bot.get("id") or "")
    try:
        soul = (roster.read_soul(bot_id) or "").strip()
    except Exception:
        log.debug("crew: could not read %s's soul", bot_id, exc_info=True)
        soul = ""

    notes = "\n".join(f"- {c.summary}" for c in candidates)
    persona = f"\n\nWho you are:\n{soul[:2000]}" if soul else ""

    try:
        from agent.auxiliary_client import get_auxiliary_extra_body, get_text_auxiliary_client

        client, model = get_text_auxiliary_client("crew_proactive")
        if client is None or not model:
            return ""
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM + persona},
                {"role": "user", "content": f"What you noticed:\n{notes}"},
            ],
            max_tokens=_MAX_TOKENS,
            timeout=_TIMEOUT_S,
            extra_body=get_auxiliary_extra_body() or None,
        )
    except Exception:
        log.debug("crew: could not compose a proactive note for %s", bot_id, exc_info=True)
        return ""

    if not response.choices:
        return ""
    return _trim(response.choices[0].message.content or "")


def _trim(text: Any) -> str:
    """Bound the length without cutting a word in half."""
    cleaned = str(text or "").strip()
    if len(cleaned) <= MAX_CHARS:
        return cleaned
    clipped = cleaned[:MAX_CHARS]
    cut = clipped.rfind(" ")
    return (clipped[:cut] if cut > MAX_CHARS // 2 else clipped).rstrip() + "…"


def tick(conn, *, now_ms: Optional[int] = None) -> int:
    """One sweep. Returns how many teammates said something.

    Rescheduling happens in ``finally`` so a teammate whose run raised cannot
    stay due and be retried on the very next tick — which, at the worker's few
    seconds, would be a teammate talking continuously because of one bad row.
    """
    from crew import db as crew_db

    if not settings()["enabled"]:
        return 0

    stamp = crew_db.now_ms() if now_ms is None else now_ms
    spoke = 0
    for bot in due(conn, now_ms=stamp):
        bot_id = str(bot.get("id") or "")
        try:
            if run_once(conn, bot, now_ms=stamp) is not None:
                spoke += 1
        except Exception:
            log.warning("crew: %s's proactive run failed", bot_id, exc_info=True)
        finally:
            try:
                reschedule(conn, bot_id)
            except Exception:
                log.warning("crew: could not reschedule %s", bot_id, exc_info=True)
    return spoke
