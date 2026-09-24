"""Tidying a teammate's standing rules before the store stops accepting them.

**The problem is not that memory rots. It is that it stops.** Hermes's
``MemoryStore`` is a bounded list — 2200 characters by default. At the ceiling
``add`` does not evict anything and does not fail quietly into a bigger file:
it **refuses the write** and hands the model an error telling it to consolidate
right now, in this turn, by hand. After three such failures in one turn the
store gives up entirely with "The fact can be saved in a later turn", and
nothing anywhere guarantees that turn ever comes.

So a teammate that has been working for a few months arrives at a state where
it silently cannot learn anything new, and the only symptom is a tool error
nobody reads. That is what this fixes: the housekeeping the store asks the
model to do mid-task, done in the background before the wall is reached.

Three decisions, each with a reason worth keeping:

**Only merges are applied.** The model sorts entries into overlapping, stale
and contradictory; only the first is acted on. These are rules a person wrote
about how they want to be worked with, and deleting one because a model
thought it looked old is a change nobody can detect — the rule is gone, the
behaviour shifts, and there is nothing to notice. Stale and contradictory
become a question in the thread instead.

**Merging goes through ``apply_batch``.** It is atomic and it validates the
whole batch against the final character budget in one pass, so a gardener
cannot overrun the limit it exists to defend. Applying the operations one at a
time would let a half-finished merge sit on disk.

**It triggers on pressure, not on a clock.** A teammate with five rules has
nothing to gain and would still pay for a model call. Three conditions,
all required: near the ceiling, enough entries to have redundancy, and not
done recently.

Shape follows ``agent/curator.py``, the host's own background maintenance
pass: a snapshot before touching anything, a cooldown, and archive-rather-than-
delete as the most destructive thing available.
"""

from __future__ import annotations

import json
import logging
import shutil
import time
from typing import Any, Optional

log = logging.getLogger(__name__)

#: Start tidying at this fraction of the character limit. Not at 100%: by then
#: `add` is already refusing writes, which is the failure being prevented.
PRESSURE = 0.75

#: Below this there is nothing to merge — a handful of rules are all distinct.
#: rowboat's threshold for its own curation pass.
MIN_ENTRIES = 8

#: Curator's cooldown. Memory changes slowly and a person who just answered a
#: question about their rules should not be asked again tomorrow.
COOLDOWN_MS = 7 * 24 * 3600 * 1000

_TIMEOUT_S = 60.0
_MAX_TOKENS = 1200

_SYSTEM = (
    "You are tidying a list of standing rules somebody wrote for an assistant. "
    "The list is near its size limit, and once it is full no new rule can be "
    "saved at all.\n\n"
    "Sort the numbered entries into three groups and return JSON only:\n"
    '{"overlapping": [{"indexes": [i, j], "merged": "one sentence covering both"}], '
    '"stale": [{"index": i, "why": "..."}], '
    '"conflicting": [{"indexes": [i, j], "why": "..."}]}\n\n'
    "Rules:\n"
    "- overlapping = the entries say the SAME thing. The merged text must keep "
    "every instruction in both and must be shorter than the two together. If "
    "they merely relate, they are not overlapping.\n"
    "- stale = looks superseded or time-bound and past.\n"
    "- conflicting = they contradict; following one means disobeying the other.\n"
    "- An entry appears in at most one group. Leave anything you are unsure "
    "about out of all three — saying nothing is always acceptable.\n"
    "- Return only the JSON object."
)


def settings() -> dict:
    """The ``crew.gardener`` block, with defaults."""
    defaults = {"enabled": True, "pressure": PRESSURE, "min_entries": MIN_ENTRIES}
    try:
        from hermes_cli.config import cfg_get, load_config_readonly

        configured = cfg_get(load_config_readonly(), "crew", "gardener", default={}) or {}
    except Exception:
        log.debug("crew: could not read the gardener settings; using defaults", exc_info=True)
        configured = {}
    if isinstance(configured, dict):
        defaults.update({k: v for k, v in configured.items() if k in defaults})
    return defaults


def due(conn, *, now_ms: int) -> list[dict]:
    """Teammates past their cooldown. Pressure is checked per teammate later.

    Two stages because pressure costs a profile scope and a file read, and the
    cooldown is a column. Filtering on the cheap condition first keeps the
    common tick — where nobody is due — down to one indexed query.
    """
    rows = conn.execute(
        "SELECT * FROM bots WHERE gardened_at <= ? ORDER BY gardened_at",
        (now_ms - COOLDOWN_MS,),
    ).fetchall()
    return [dict(row) for row in rows]


def _mark_gardened(conn, bot_id: str, *, now_ms: int) -> None:
    conn.execute("UPDATE bots SET gardened_at = ? WHERE id = ?", (now_ms, bot_id))
    conn.commit()


def under_pressure(store, config: dict) -> bool:
    """Whether this store is close enough to the ceiling to be worth tidying."""
    used, limit = store.usage("memory")
    if limit <= 0:
        return False
    entries = store.entries("memory")
    return (
        len(entries) >= int(config["min_entries"])
        and used >= float(config["pressure"]) * limit
    )


def plan(entries: list[str]) -> dict:
    """Ask the model how these entries relate. ``{}`` when it cannot say.

    Same shape as ``crew/policy.py::_ask_model``: the host's auxiliary client,
    under whatever profile scope the caller has already entered, with its own
    task name so an operator can point ``auxiliary.crew_gardener.model`` at a
    cheap model without touching anything else.
    """
    numbered = "\n".join(f"{index}. {text}" for index, text in enumerate(entries))
    try:
        from agent.auxiliary_client import get_auxiliary_extra_body, get_text_auxiliary_client

        client, model = get_text_auxiliary_client("crew_gardener")
        if client is None or not model:
            return {}
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": numbered},
            ],
            temperature=0,
            max_tokens=_MAX_TOKENS,
            timeout=_TIMEOUT_S,
            extra_body=get_auxiliary_extra_body() or None,
        )
    except Exception:
        log.debug("crew: the gardener could not reach a model", exc_info=True)
        return {}

    if not response.choices:
        return {}
    return _parse(response.choices[0].message.content or "")


def _parse(raw: str) -> dict:
    """The model's answer, or ``{}``.

    Tolerant of a fenced block because models produce them whatever the
    instruction says, and intolerant of everything else: a plan that cannot be
    read must not be half-applied.
    """
    text = str(raw or "").strip()
    if text.startswith("```"):
        text = text.split("```")[1] if "```" in text[3:] else text[3:]
        text = text.split("\n", 1)[-1] if text.lstrip().startswith("json") else text
    try:
        parsed = json.loads(text)
    except (ValueError, TypeError):
        log.debug("crew: the gardener's plan was not JSON")
        return {}
    return parsed if isinstance(parsed, dict) else {}


def merge_operations(entries: list[str], plan_dict: dict) -> list[dict]:
    """The batch that applies only the merges, or ``[]``.

    Every group is validated against the entries we actually read rather than
    trusted: an index out of range, a merged text that is not shorter than what
    it replaces, or an entry claimed by two different merges would each turn a
    tidy-up into data loss. Anything that does not check out is dropped, and
    the rest still applies — one bad group should not cost the whole pass.

    The operations are expressed as ``remove`` of each original plus one
    ``add``, because that is the vocabulary ``apply_batch`` validates against
    the final budget as a unit.
    """
    groups = plan_dict.get("overlapping")
    if not isinstance(groups, list):
        return []

    operations: list[dict] = []
    claimed: set[int] = set()
    for group in groups:
        if not isinstance(group, dict):
            continue
        indexes = group.get("indexes")
        merged = str(group.get("merged") or "").strip()
        if not isinstance(indexes, list) or len(indexes) < 2 or not merged:
            continue

        picked: list[int] = []
        for raw in indexes:
            if not isinstance(raw, int) or not (0 <= raw < len(entries)) or raw in claimed:
                picked = []
                break
            picked.append(raw)
        if len(picked) < 2 or len(set(picked)) != len(picked):
            continue

        originals = [entries[index] for index in picked]
        # A "merge" that is longer than its parts has not merged anything, and
        # applying it would move the store *towards* the ceiling this pass
        # exists to back away from.
        if len(merged) >= sum(len(text) for text in originals):
            continue

        claimed.update(picked)
        operations.extend({"action": "remove", "old_text": text} for text in originals)
        operations.append({"action": "add", "content": merged})
    return operations


def questions(entries: list[str], plan_dict: dict) -> list[dict]:
    """What to ask the operator about, rather than act on.

    Stale and conflicting entries are never touched. A rule removed because a
    model believed it looked old is an undetectable change: the rule is gone,
    the behaviour moves, and nothing in the thread says why.
    """
    found: list[dict] = []
    for item in plan_dict.get("stale") or []:
        if not isinstance(item, dict):
            continue
        index = item.get("index")
        if isinstance(index, int) and 0 <= index < len(entries):
            found.append({
                "kind": "stale", "why": str(item.get("why") or "")[:200],
                "entries": [entries[index]],
            })
    for item in plan_dict.get("conflicting") or []:
        if not isinstance(item, dict):
            continue
        indexes = item.get("indexes")
        if not isinstance(indexes, list):
            continue
        picked = [i for i in indexes if isinstance(i, int) and 0 <= i < len(entries)]
        if len(picked) >= 2:
            found.append({
                "kind": "conflicting", "why": str(item.get("why") or "")[:200],
                "entries": [entries[i] for i in picked],
            })
    return found


def snapshot(store) -> Optional[str]:
    """Copy MEMORY.md aside before touching it. Path, or ``None``.

    ``agent/curator_backup.py``'s reason, applied here: the pass is automatic
    and the thing it edits is something a person wrote. A merge that loses a
    clause is recoverable from this and not from anywhere else.
    """
    try:
        from tools.memory_tool import get_memory_dir

        source = get_memory_dir() / "MEMORY.md"
        if not source.is_file():
            return None
        target = source.with_suffix(f".md.bak.{int(time.time())}")
        shutil.copy2(source, target)
        return str(target)
    except Exception:
        log.debug("crew: could not snapshot memory before gardening", exc_info=True)
        return None


def run_once(conn, bot_id: str, *, now_ms: int) -> dict:
    """One teammate's pass, inside their profile. Returns what happened.

    The caller owns the profile scope: entering it is what makes
    ``load_on_disk_store()`` resolve to *this* teammate's ``memories/``, and
    doing it here would mean entering it twice on the sweep path.
    """
    from tools.memory_tool import load_on_disk_store

    config = settings()
    store = load_on_disk_store()
    store.load_from_disk()
    if not under_pressure(store, config):
        return {"skipped": "not under pressure"}

    entries = store.entries("memory")
    plan_dict = plan(entries)
    if not plan_dict:
        return {"skipped": "no plan"}

    operations = merge_operations(entries, plan_dict)
    asked = questions(entries, plan_dict)

    merged = 0
    backup = None
    if operations:
        backup = snapshot(store)
        result = store.apply_batch("memory", operations)
        if isinstance(result, dict) and result.get("success"):
            merged = sum(1 for op in operations if op["action"] == "add")
        else:
            # The batch is atomic, so a rejection means nothing was written —
            # most likely the merged text still did not fit. Report it and
            # leave the entries alone.
            log.info("crew: %s's memory merge was rejected: %s", bot_id, result)
            return {"skipped": "batch rejected", "backup": backup}

    _post(conn, bot_id, merged=merged, questions=asked, backup=backup)
    return {"merged": merged, "questions": len(asked), "backup": backup}


def _post(conn, bot_id: str, *, merged: int, questions: list[dict], backup: Optional[str]) -> None:
    """Say what was done and ask what could not be decided.

    Both go in the thread as ``memory_updated`` chips — the kind
    ``save_memory_rule`` already uses, so a rule changing is one kind of event
    however it changed. The questions carry ``proposal: true`` and the entries
    verbatim: an operator cannot answer "which of these stands" without seeing
    both of them as written.
    """
    from crew import db as crew_db

    thread_id = crew_db.ensure_dm_thread(conn, bot_id)
    if merged:
        crew_db.insert_message(
            conn, thread_id=thread_id, sender=bot_id, kind="memory_updated",
            payload={
                "tidied": merged,
                "backup": backup or "",
                "note": (
                    f"My standing rules were close to the size limit, so I merged "
                    f"{merged} pair(s) that said the same thing. Nothing was removed."
                ),
            },
        )
    for item in questions:
        crew_db.insert_message(
            conn, thread_id=thread_id, sender=bot_id, kind="memory_updated",
            payload={
                "proposal": True, "kind": item["kind"],
                "entries": item["entries"], "why": item["why"],
                "note": (
                    "These two rules disagree — which one stands?"
                    if item["kind"] == "conflicting"
                    else "This rule looks out of date. Keep it?"
                ),
            },
        )


def tick(conn, *, now_ms: Optional[int] = None) -> int:
    """One sweep across teammates due for tidying. Returns how many ran."""
    from crew import db as crew_db

    if not settings()["enabled"]:
        return 0

    stamp = crew_db.now_ms() if now_ms is None else now_ms
    ran = 0
    for bot in due(conn, now_ms=stamp):
        bot_id = str(bot.get("id") or "")
        try:
            from crew import orchestrator

            with orchestrator.profile_scope(bot_id):
                outcome = run_once(conn, bot_id, now_ms=stamp)
            if "skipped" not in outcome:
                ran += 1
        except Exception:
            log.warning("crew: gardening %s's memory failed", bot_id, exc_info=True)
        finally:
            # Stamped whatever happened, including "not under pressure". The
            # cooldown is what keeps a teammate with nine tidy rules from being
            # re-examined on every tick for the rest of its life.
            try:
                _mark_gardened(conn, bot_id, now_ms=stamp)
            except Exception:
                log.warning("crew: could not record the gardening run for %s", bot_id, exc_info=True)
    return ran


def describe(outcome: Any) -> str:
    """One line for a log or a test failure message."""
    if not isinstance(outcome, dict):
        return "nothing"
    if "skipped" in outcome:
        return f"skipped ({outcome['skipped']})"
    return f"merged {outcome.get('merged', 0)}, asked {outcome.get('questions', 0)}"
