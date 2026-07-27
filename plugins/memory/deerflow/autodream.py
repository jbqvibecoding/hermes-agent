"""Transactional background memory consolidation ("auto-dream").

Ported from OpenHarness ``services/autodream/`` (``lock.py`` + ``backup.py`` +
the eligibility gating in ``service.py``), adapted to this plugin's JSON fact
store instead of OpenHarness' markdown "memdir".

Why: our provider extracts facts *inline* (during a session) and prunes stale
ones, but never does an out-of-band pass over the whole store. Over time the
store accumulates near-duplicates and contradictions. This adds a periodic
"dream": a separate, transactional consolidation that merges duplicates,
resolves contradictions, and drops superseded facts.

Transactional means it is safe to run unattended:

* **lock** — a PID-stamped lock file prevents two consolidations racing; a
  stale lock (holder dead, or older than ``HOLDER_STALE_SECONDS``) is taken
  over. The lock's mtime doubles as "last consolidated at".
* **backup** — the memory dir is copied to a timestamped backup first.
* **rollback** — any failure (or ``preview=True``) restores the backup and
  resets the lock mtime to its pre-acquire value, so the next run is not
  wrongly considered "already consolidated".
* **guardrails** — the model's proposed drops/merges are applied only to
  known fact ids, never to protected categories, and are capped per cycle.
"""

from __future__ import annotations

import filecmp
import json
import logging
import os
import shutil
import time
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Optional

from plugins.memory.deerflow.extractor import (
    DEFAULT_PROTECTED_CATEGORIES,
    _extract_json_array,  # noqa: F401 — re-exported for symmetry/tests
)
from plugins.memory.deerflow.storage import make_fact

logger = logging.getLogger(__name__)

LOCK_FILE = ".consolidate-lock"
HOLDER_STALE_SECONDS = 60 * 60

DEFAULT_MIN_HOURS = 12.0
DEFAULT_MIN_NEW_FACTS = 5
DEFAULT_MAX_REMOVALS = 20

_CONSOLIDATION_SYSTEM = (
    "You are consolidating a long-term memory store. You are given numbered "
    "facts. Identify (a) near-duplicates that should be merged into one, and "
    "(b) facts that are obsolete or contradicted by a newer fact and should be "
    "dropped. Be conservative: when unsure, keep the fact.\n"
    'Return ONLY JSON: {"drop": ["<id>", ...], "merge": [{"ids": ["<id>", '
    '"<id>"], "content": "merged fact", "category": "preference", '
    '"confidence": 0.9}]}\n'
    'Return {"drop": [], "merge": []} if nothing needs consolidating.'
)


# ---------------------------------------------------------------------------
# atomic write (OpenHarness utils.fs.atomic_write_text equivalent)
# ---------------------------------------------------------------------------


def atomic_write_text(path: Path, text: str) -> None:
    tmp = path.with_suffix(f".{uuid.uuid4().hex}.tmp")
    tmp.write_text(text, encoding="utf-8")
    tmp.replace(path)


# ---------------------------------------------------------------------------
# lock (ported from autodream/lock.py)
# ---------------------------------------------------------------------------


def _lock_path(memory_dir: str | Path) -> Path:
    return Path(memory_dir) / LOCK_FILE


def read_last_consolidated_at(memory_dir: str | Path) -> float:
    """Lock mtime doubles as the last successful consolidation timestamp."""
    try:
        return _lock_path(memory_dir).stat().st_mtime
    except OSError:
        return 0.0


def _holder_pid(path: Path) -> Optional[int]:
    try:
        pid = int(path.read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        return None
    return pid if pid > 0 else None


def _is_process_running(pid: int) -> bool:
    if pid == os.getpid():
        return True
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def try_acquire_consolidation_lock(memory_dir: str | Path) -> Optional[float]:
    """Acquire the lock and return the prior mtime, or None if actively held."""
    path = _lock_path(memory_dir)
    prior_mtime: Optional[float] = None
    try:
        prior_mtime = path.stat().st_mtime
        holder = _holder_pid(path)
    except OSError:
        holder = None

    if prior_mtime is not None and time.time() - prior_mtime < HOLDER_STALE_SECONDS:
        if holder is not None and _is_process_running(holder):
            return None

    path.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_text(path, f"{os.getpid()}\n")
    try:
        if _holder_pid(path) != os.getpid():
            return None
    except OSError:
        return None
    return prior_mtime or 0.0


def rollback_consolidation_lock(memory_dir: str | Path, prior_mtime: float) -> None:
    """Restore the lock mtime to its pre-acquire value after a failed dream."""
    path = _lock_path(memory_dir)
    try:
        if prior_mtime <= 0:
            path.unlink(missing_ok=True)
            return
        atomic_write_text(path, "")
        os.utime(path, (prior_mtime, prior_mtime))
    except OSError:
        # Best effort: a failed rollback only delays the next auto trigger.
        return


def record_consolidation(memory_dir: str | Path) -> None:
    """Stamp a successful consolidation time and release the mutex.

    Divergence from upstream OpenHarness (``services/autodream/lock.py``): there
    the stamp keeps the holder PID because the "dream" runs in a short-lived
    subprocess that exits immediately afterwards, so the PID goes dead and the
    next run can take the lock over. Here consolidation runs *in-process*, so
    keeping our own live PID in the file would make the next pass block on our
    own lock for up to ``HOLDER_STALE_SECONDS``. Writing an empty payload keeps
    the file's mtime as "last consolidated at" (what the time gate reads) while
    clearing the holder, exactly like ``rollback_consolidation_lock`` does.
    """
    path = _lock_path(memory_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    atomic_write_text(path, "")


# ---------------------------------------------------------------------------
# backup / diff (ported from autodream/backup.py)
# ---------------------------------------------------------------------------


def default_backup_root(memory_dir: str | Path) -> Path:
    return Path(memory_dir).expanduser().resolve().parent / "memory-backups"


def create_memory_backup(
    memory_dir: str | Path, *, backup_root: str | Path | None = None
) -> Path:
    """Create a timestamped copy of *memory_dir*; return the backup path."""
    memory_dir = Path(memory_dir).expanduser().resolve()
    root = (
        Path(backup_root).expanduser().resolve()
        if backup_root is not None
        else default_backup_root(memory_dir)
    )
    root.mkdir(parents=True, exist_ok=True)
    timestamp = time.strftime("memory-%Y%m%d-%H%M%S")
    backup = root / timestamp
    suffix = 1
    while backup.exists():
        suffix += 1
        backup = root / f"{timestamp}-{suffix}"
    if memory_dir.exists():
        shutil.copytree(memory_dir, backup, ignore=shutil.ignore_patterns(LOCK_FILE))
    else:
        backup.mkdir(parents=True)
    return backup


def restore_memory_backup(backup_dir: str | Path, memory_dir: str | Path) -> None:
    """Restore *memory_dir* from a backup directory (preserving the lock)."""
    backup_dir = Path(backup_dir).expanduser().resolve()
    memory_dir = Path(memory_dir).expanduser().resolve()
    if not backup_dir.is_dir():
        raise FileNotFoundError(f"Backup not found: {backup_dir}")
    # Keep the live lock file across the restore so the caller can still roll
    # its mtime back deliberately.
    lock = _lock_path(memory_dir)
    lock_payload = lock.read_text(encoding="utf-8") if lock.exists() else None
    lock_times = (lock.stat().st_atime, lock.stat().st_mtime) if lock.exists() else None

    tmp = memory_dir.with_name(f".{memory_dir.name}.restore-tmp")
    if tmp.exists():
        shutil.rmtree(tmp)
    shutil.copytree(backup_dir, tmp)
    if memory_dir.exists():
        shutil.rmtree(memory_dir)
    tmp.rename(memory_dir)

    if lock_payload is not None:
        atomic_write_text(_lock_path(memory_dir), lock_payload)
        if lock_times is not None:
            try:
                os.utime(_lock_path(memory_dir), lock_times)
            except OSError:
                pass


def latest_memory_backup(memory_dir: str | Path) -> Optional[Path]:
    root = default_backup_root(memory_dir)
    if not root.exists():
        return None
    backups = [p for p in root.iterdir() if p.is_dir() and p.name.startswith("memory-")]
    return max(backups, key=lambda p: p.stat().st_mtime) if backups else None


def diff_memory_dirs(before: str | Path, after: str | Path) -> dict[str, list[str]]:
    """Return added/removed/changed file names between two memory dirs."""
    before, after = Path(before), Path(after)
    bf = {p.name: p for p in before.glob("*.json")} if before.exists() else {}
    af = {p.name: p for p in after.glob("*.json")} if after.exists() else {}
    return {
        "added": sorted(set(af) - set(bf)),
        "removed": sorted(set(bf) - set(af)),
        "changed": sorted(
            n for n in set(bf) & set(af) if not filecmp.cmp(bf[n], af[n], shallow=False)
        ),
    }


def format_memory_diff(diff: dict[str, list[str]]) -> str:
    lines = [
        f"{k}: " + ", ".join(v)
        for k in ("added", "changed", "removed")
        if (v := diff.get(k))
    ]
    return "\n".join(lines) if lines else "no file changes"


# ---------------------------------------------------------------------------
# consolidation
# ---------------------------------------------------------------------------


@dataclass
class ConsolidationResult:
    ran: bool = False
    reason: str = ""
    dropped: int = 0
    merged: int = 0
    before_count: int = 0
    after_count: int = 0
    backup: Optional[str] = None
    rolled_back: bool = False
    diff: dict[str, list[str]] = field(default_factory=dict)


def _parse_plan(text: str) -> dict[str, Any]:
    """Parse the model's consolidation plan; tolerate fences/prose."""
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lstrip().lower().startswith("json"):
            raw = raw.lstrip()[4:]
    start, end = raw.find("{"), raw.rfind("}")
    if start == -1 or end == -1 or end < start:
        return {"drop": [], "merge": []}
    try:
        parsed = json.loads(raw[start : end + 1])
    except json.JSONDecodeError:
        return {"drop": [], "merge": []}
    if not isinstance(parsed, dict):
        return {"drop": [], "merge": []}
    drop = [d for d in parsed.get("drop", []) if isinstance(d, str)]
    merge = [m for m in parsed.get("merge", []) if isinstance(m, dict)]
    return {"drop": drop, "merge": merge}


def apply_consolidation_plan(
    facts: list[dict],
    plan: dict[str, Any],
    *,
    protected_categories: tuple[str, ...] = DEFAULT_PROTECTED_CATEGORIES,
    max_removals: int = DEFAULT_MAX_REMOVALS,
) -> tuple[list[dict], int, int]:
    """Apply a consolidation plan under guardrails.

    Guardrails (unconditional, regardless of what the model returned):
      * only ids that actually exist may be dropped or merged;
      * facts in a protected category are never dropped or merged away;
      * total removals are capped at *max_removals*.

    Returns ``(new_facts, dropped_count, merged_count)``.
    """
    by_id = {f.get("id"): f for f in facts if isinstance(f, dict) and f.get("id")}
    protected = frozenset(protected_categories)

    def _removable(fid: str) -> bool:
        fact = by_id.get(fid)
        return fact is not None and fact.get("category", "") not in protected

    remove: set[str] = set()
    merged_facts: list[dict] = []
    merged_count = 0

    for entry in plan.get("merge", []):
        ids = [i for i in entry.get("ids", []) if isinstance(i, str) and _removable(i)]
        content = entry.get("content")
        if len(ids) < 2 or not isinstance(content, str) or not content.strip():
            continue
        try:
            new_fact = make_fact(
                content,
                str(entry.get("category") or "context"),
                float(entry.get("confidence", 0.7) or 0.7),
                source="consolidated",
            )
        except (ValueError, TypeError):
            continue
        remove.update(ids)
        merged_facts.append(new_fact)
        merged_count += 1

    dropped_ids = {fid for fid in plan.get("drop", []) if _removable(fid)}
    remove.update(dropped_ids)

    if len(remove) > max_removals:
        # Keep the highest-confidence entries when the model over-reaches.
        ranked = sorted(
            (by_id[i] for i in remove if i in by_id),
            key=lambda f: f.get("confidence", 0.0),
        )
        remove = {f["id"] for f in ranked[:max_removals]}
        merged_facts = [m for m in merged_facts]  # merges stay; drops are capped

    kept = [f for f in facts if f.get("id") not in remove]
    dropped_count = len(remove & dropped_ids)
    return kept + merged_facts, dropped_count, merged_count


def _render_facts(facts: list[dict]) -> str:
    return "\n".join(
        f"- [{f.get('id')}] ({f.get('category', 'context')}, "
        f"conf={f.get('confidence', 0):.2f}) {f.get('content', '')}"
        for f in facts
    )


def run_consolidation(
    storage: Any,
    user_id: str,
    *,
    call_llm: Callable[..., Any],
    memory_dir: str | Path | None = None,
    min_hours: float = DEFAULT_MIN_HOURS,
    min_new_facts: int = DEFAULT_MIN_NEW_FACTS,
    max_removals: int = DEFAULT_MAX_REMOVALS,
    force: bool = False,
    preview: bool = False,
) -> ConsolidationResult:
    """Run one transactional consolidation pass for *user_id*.

    Gates on elapsed time + store size unless *force*. Backs up first; on any
    failure — or when *preview* — restores the backup and rolls the lock back.
    """
    mem_dir = (
        Path(memory_dir)
        if memory_dir is not None
        else Path(storage._path(user_id)).parent
    )
    mem_dir.mkdir(parents=True, exist_ok=True)

    # --- eligibility gates (cheap, before taking the lock) -----------------
    if not force:
        last_at = read_last_consolidated_at(mem_dir)
        hours_since = (time.time() - last_at) / 3600
        if hours_since < min_hours:
            return ConsolidationResult(
                reason=f"only {hours_since:.1f}h since last consolidation"
            )

    facts = [f for f in storage.load(user_id).get("facts", []) if isinstance(f, dict)]
    if not force and len(facts) < min_new_facts:
        return ConsolidationResult(
            reason=f"only {len(facts)} fact(s); below min_new_facts"
        )
    if not facts:
        return ConsolidationResult(reason="no facts to consolidate")

    prior_mtime = try_acquire_consolidation_lock(mem_dir)
    if prior_mtime is None:
        return ConsolidationResult(reason="another consolidation holds the lock")

    backup = create_memory_backup(mem_dir)
    result = ConsolidationResult(backup=str(backup), before_count=len(facts))

    try:
        response = call_llm(
            task="compression",
            messages=[
                {"role": "system", "content": _CONSOLIDATION_SYSTEM},
                {"role": "user", "content": _render_facts(facts)},
            ],
        )
        text = (
            response.choices[0].message.content if response and response.choices else ""
        )
        plan = _parse_plan(text)
        new_facts, dropped, merged = apply_consolidation_plan(
            facts, plan, max_removals=max_removals
        )

        data = storage.load(user_id)
        data["facts"] = new_facts
        if not storage.save(data, user_id):
            raise OSError("failed to persist consolidated memory")

        result.ran = True
        result.dropped = dropped
        result.merged = merged
        result.after_count = len(new_facts)
        result.diff = diff_memory_dirs(backup, mem_dir)

        if preview:
            restore_memory_backup(backup, mem_dir)
            rollback_consolidation_lock(mem_dir, prior_mtime)
            result.rolled_back = True
            result.reason = "preview: changes rolled back"
            return result

        record_consolidation(mem_dir)
        result.reason = f"consolidated: -{dropped} dropped, {merged} merged"
        return result
    except Exception as exc:  # noqa: BLE001 — any failure must roll back
        logger.warning("deerflow-memory: consolidation failed, rolling back: %s", exc)
        try:
            restore_memory_backup(backup, mem_dir)
        except Exception:  # noqa: BLE001
            pass
        rollback_consolidation_lock(mem_dir, prior_mtime)
        return ConsolidationResult(
            ran=False,
            reason=f"failed: {type(exc).__name__}: {exc}",
            backup=str(backup),
            rolled_back=True,
            before_count=len(facts),
        )
