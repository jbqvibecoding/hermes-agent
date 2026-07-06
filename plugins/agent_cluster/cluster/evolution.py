"""Self-growth — lean port of OpenOPC's ``EmployeeEvolutionManager``.

Every delegated execution is recorded as a per-agent reflection; when the
same agent accumulates ``promotion_threshold`` reflections in the same
domain, the recurring lessons are distilled into a reusable playbook
SKILL.md (OpenOPC's ``_maybe_promote_reflection_skill`` semantics with the
work-item/organization coupling removed).

Storage layout under the plugin data dir:

- ``evolution/agents.json``      — structured profile per agent slug
  (outcome counters, per-domain counters, per-pattern recurrence counts).
- ``evolution/executions.jsonl`` — append-only audit trail, one line per
  recorded execution (the "every task run becomes a knowledge asset" log).
- ``skills/<name>/SKILL.md``     — promoted playbooks (via SkillStore).
"""
from __future__ import annotations

import json
import re
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from .skill_store import Skill, SkillStore

SCHEMA_VERSION = 1

_OUTCOMES = {"success", "partial_success", "failure"}

# Keyword → domain heuristics (OpenOPC derives domains from work-item tags;
# cluster delegations carry free-text goals, so classify by keyword).
_DOMAIN_KEYWORDS: Dict[str, tuple] = {
    "backend": ("backend", "api", "endpoint", "server", "database", "sql", "schema"),
    "frontend": ("frontend", "ui", "react", "vue", "css", "component", "page"),
    "testing": ("test", "qa", "coverage", "regression", "e2e", "验收", "測試", "测试"),
    "security": ("security", "vulnerability", "cve", "audit", "auth", "安全"),
    "devops": ("deploy", "ci", "cd", "docker", "pipeline", "release", "部署"),
    "docs": ("document", "readme", "docs", "文档", "文件"),
    "design": ("design", "ux", "wireframe", "figma", "設計", "设计"),
    "marketing": ("marketing", "campaign", "seo", "content", "growth", "营销", "行銷"),
    "research": ("research", "investigate", "analyze", "explore", "调研", "研究"),
    "planning": ("plan", "roadmap", "sprint", "milestone", "规划", "規劃"),
}


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def normalize_outcome(outcome: str) -> str:
    value = str(outcome or "").strip().lower().replace("-", "_")
    if value in _OUTCOMES:
        return value
    if value in {"ok", "done", "passed", "pass", "completed"}:
        return "success"
    if value in {"partial", "mixed"}:
        return "partial_success"
    return "failure"


def extract_domains(text: str) -> List[str]:
    lowered = (text or "").lower()
    # Latin keywords match on word boundaries ("ui" must not hit "build");
    # CJK keywords match as substrings (no word boundaries in CJK text).
    words = set(re.findall(r"[a-z0-9]+", lowered))
    found = []
    for domain, keywords in _DOMAIN_KEYWORDS.items():
        for keyword in keywords:
            if re.search(r"[一-鿿]", keyword):
                if keyword in lowered:
                    found.append(domain)
                    break
            elif keyword in words:
                found.append(domain)
                break
    return found or ["general"]


def _normalize_skill_name(value: str) -> str:
    value = value.lower()
    value = re.sub(r"[^a-z0-9一-鿿]+", "-", value)
    return value.strip("-")[:80]


class ClusterEvolution:
    """Records executions and promotes recurring lessons into playbooks."""

    def __init__(
        self,
        data_dir: Path,
        skill_store: Optional[SkillStore] = None,
        promotion_threshold: int = 2,
    ) -> None:
        self.data_dir = Path(data_dir)
        self.evolution_dir = self.data_dir / "evolution"
        self.profile_path = self.evolution_dir / "agents.json"
        self.log_path = self.evolution_dir / "executions.jsonl"
        self.skills = skill_store or SkillStore(self.data_dir)
        self.promotion_threshold = max(1, int(promotion_threshold))
        self._lock = threading.Lock()

    # -- profile io ----------------------------------------------------------

    def load_profile(self) -> Dict[str, Any]:
        if not self.profile_path.exists():
            return {"schema_version": SCHEMA_VERSION, "agents": {}}
        try:
            data = json.loads(self.profile_path.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                data.setdefault("agents", {})
                return data
        except Exception:
            pass
        return {"schema_version": SCHEMA_VERSION, "agents": {}}

    def _save_profile(self, profile: Dict[str, Any]) -> None:
        self.profile_path.parent.mkdir(parents=True, exist_ok=True)
        self.profile_path.write_text(
            json.dumps(profile, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
        )

    def _append_log(self, entry: Dict[str, Any]) -> None:
        self.log_path.parent.mkdir(parents=True, exist_ok=True)
        with self.log_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=False) + "\n")

    # -- recording -----------------------------------------------------------

    def record_execution(
        self,
        slug: str,
        task: str,
        outcome: str,
        result_summary: str = "",
        strengths: Optional[List[str]] = None,
        weaknesses: Optional[List[str]] = None,
        domains: Optional[List[str]] = None,
        kind: str = "delegate",
    ) -> Dict[str, Any]:
        """Record one execution; returns {pattern_key, playbook} outcome info."""
        slug = str(slug or "").strip()
        if not slug:
            return {}
        outcome = normalize_outcome(outcome)
        domains = [d for d in (domains or []) if str(d).strip()] or extract_domains(task)
        pattern_key = f"{slug}::{'+'.join(sorted(domains))}"
        entry = {
            "ts": _utc_now(),
            "slug": slug,
            "kind": kind,
            "task": str(task or "")[:2000],
            "outcome": outcome,
            "summary": str(result_summary or "")[:2000],
            "domains": domains,
            "strengths": [str(s).strip() for s in (strengths or []) if str(s).strip()][:6],
            "weaknesses": [str(w).strip() for w in (weaknesses or []) if str(w).strip()][:6],
        }
        with self._lock:
            self._append_log(entry)
            profile = self.load_profile()
            record = profile["agents"].setdefault(slug, {})
            record["updated_at"] = entry["ts"]
            record["last_outcome"] = outcome
            self._bump(record, outcome)
            domain_records = record.setdefault("domains", {})
            for domain in domains:
                domain_record = domain_records.setdefault(
                    domain, {"successes": 0, "partial_successes": 0, "failures": 0}
                )
                self._bump(domain_record, outcome)
            pattern = record.setdefault("patterns", {}).setdefault(
                pattern_key,
                {
                    "domains": domains,
                    "reflection_count": 0,
                    "lesson_counts": {},
                    "pitfall_counts": {},
                },
            )
            pattern["reflection_count"] = int(pattern.get("reflection_count", 0)) + 1
            pattern["last_summary"] = entry["summary"]
            pattern["last_outcome"] = outcome
            self._count_items(pattern, "lesson_counts", entry["strengths"])
            self._count_items(pattern, "pitfall_counts", entry["weaknesses"])
            playbook_ref = self._maybe_promote_playbook(slug, record, pattern_key, pattern)
            self._save_profile(profile)
        return {
            "slug": slug,
            "pattern_key": pattern_key,
            "outcome": outcome,
            "playbook": playbook_ref,
        }

    @staticmethod
    def _bump(record: Dict[str, Any], outcome: str) -> None:
        key = {
            "success": "successes",
            "partial_success": "partial_successes",
            "failure": "failures",
        }[outcome]
        record[key] = int(record.get(key, 0)) + 1

    @staticmethod
    def _count_items(pattern: Dict[str, Any], bucket: str, items: List[str]) -> None:
        counts = pattern.setdefault(bucket, {})
        for item in items:
            counts[item] = int(counts.get(item, 0)) + 1

    # -- promotion ------------------------------------------------------------

    def _repeated(self, counts: Dict[str, int]) -> List[str]:
        return [item for item, count in counts.items() if int(count) >= 2]

    def _maybe_promote_playbook(
        self,
        slug: str,
        record: Dict[str, Any],
        pattern_key: str,
        pattern: Dict[str, Any],
    ) -> str:
        if pattern.get("playbook_ref"):
            return str(pattern["playbook_ref"])
        if int(pattern.get("reflection_count", 0)) < self.promotion_threshold:
            return ""
        repeated_lessons = self._repeated(pattern.get("lesson_counts", {}))
        repeated_pitfalls = self._repeated(pattern.get("pitfall_counts", {}))
        # Even without repeated free-text lessons, a recurring pattern with a
        # summary is worth a playbook stub (unlike OpenOPC we have no rich
        # work-item checklists to mine, so the recurrence itself is the signal).
        domains = list(pattern.get("domains", [])) or ["general"]
        primary = domains[0]
        skill_name = _normalize_skill_name(f"{slug}-{primary}-playbook")
        lines = [
            f"# {slug} {primary} playbook",
            "",
            f"Learned playbook for agent `{slug}` across domains: {', '.join(domains)}.",
            f"Distilled from {pattern.get('reflection_count', 0)} recorded executions.",
            "",
        ]
        if repeated_lessons:
            lines.append("## What repeatedly worked")
            lines.extend(f"- {item}" for item in repeated_lessons)
            lines.append("")
        if repeated_pitfalls:
            lines.append("## Mistakes to avoid")
            lines.extend(f"- {item}" for item in repeated_pitfalls)
            lines.append("")
        if pattern.get("last_summary"):
            lines.append("## Latest execution summary")
            lines.append(str(pattern["last_summary"]))
            lines.append("")
        lines.append("## Checklist")
        lines.append("- State the objective and completion summary explicitly in the handoff.")
        lines.append("- Reference exact artifact paths or outputs in the result.")
        if primary in {"backend", "frontend", "testing", "devops"}:
            lines.append("- Include validation or test evidence before reporting done.")
        skill = Skill(
            name=skill_name,
            description=(
                f"Auto-promoted playbook for {slug} ({', '.join(domains)}) — "
                f"recurring lessons from {pattern.get('reflection_count', 0)} executions."
            ),
            content="\n".join(lines).strip(),
            metadata={
                "agent": slug,
                "pattern_key": pattern_key,
                "promoted_at": _utc_now(),
            },
        )
        path = self.skills.save_playbook(skill)
        pattern["playbook_ref"] = skill_name
        record.setdefault("playbooks", []).append(
            {"name": skill_name, "path": str(path), "pattern_key": pattern_key}
        )
        return skill_name

    # -- context injection -----------------------------------------------------

    def build_agent_delta_context(self, slug: str, task: str = "", limit: int = 3) -> str:
        """Historical strengths/weaknesses + matching playbooks for a prompt."""
        profile = self.load_profile()
        record = profile.get("agents", {}).get(slug)
        parts: List[str] = []
        if record:
            counters = (
                f"successes={record.get('successes', 0)}, "
                f"partial={record.get('partial_successes', 0)}, "
                f"failures={record.get('failures', 0)}"
            )
            parts.append(f"Track record: {counters} (last: {record.get('last_outcome', 'n/a')}).")
            recent = self.recent_reflections(slug, limit=limit)
            for item in recent:
                note = item.get("summary") or item.get("task", "")
                if note:
                    parts.append(f"- [{item.get('outcome')}] {note[:300]}")
        task_domains = set(extract_domains(task)) if task else set()
        for playbook in (record or {}).get("playbooks", []):
            skill = self.skills.get(str(playbook.get("name", "")))
            if not skill:
                continue
            if task_domains and not (
                task_domains & set(skill.metadata.get("pattern_key", "").split("::")[-1].split("+"))
            ):
                continue
            parts.append(f"\n## Learned playbook: {skill.name}\n{skill.content}")
        if not parts:
            return ""
        return "## Experience from previous executions\n" + "\n".join(parts)

    def recent_reflections(self, slug: str = "", limit: int = 5) -> List[Dict[str, Any]]:
        if not self.log_path.exists():
            return []
        entries: List[Dict[str, Any]] = []
        try:
            for line in self.log_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except Exception:
                    continue
                if slug and entry.get("slug") != slug:
                    continue
                entries.append(entry)
        except Exception:
            return []
        return entries[-limit:]

    def search_knowledge(self, query: str, slug: str = "", limit: int = 8) -> Dict[str, Any]:
        """Search reflections + playbooks/workflows for the knowledge tool."""
        from . import roster

        query_tokens = roster.tokens(query)
        reflections: List[tuple] = []
        for entry in self.recent_reflections(slug=slug, limit=500):
            haystack = roster.tokens(
                f"{entry.get('task','')}\n{entry.get('summary','')}\n{' '.join(entry.get('domains', []))}"
            )
            overlap = len(query_tokens & haystack)
            if overlap:
                reflections.append((overlap, entry))
        reflections.sort(key=lambda item: -item[0])
        skills = self.skills.find(query_tokens)
        return {
            "reflections": [entry for _, entry in reflections[:limit]],
            "skills": [
                {
                    "name": skill.name,
                    "level": skill.level,
                    "description": skill.description,
                    "source_path": skill.source_path,
                }
                for skill in skills[:limit]
            ],
        }
