"""SKILL.md store — lean port of OpenOPC's ``layer5_memory/skill_library.py``.

Manages skills stored as ``<skill-name>/SKILL.md`` directories (the
nanobot-compatible format shared by OpenOPC, AgentHub skill-templates, and
agentskills.io). Two collections are loaded together:

- vendored workflows — the plugin's ``assets/workflows/`` (AgentHub's
  standardized process templates, read-only), and
- learned playbooks  — ``<data_dir>/skills/`` (written by the evolution
  module when a recurring pattern is promoted).
"""
from __future__ import annotations

import re
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

_WORKFLOWS_DIR = Path(__file__).resolve().parent.parent / "assets" / "workflows"


@dataclass
class Skill:
    name: str
    description: str = ""
    content: str = ""
    source_path: str = ""
    level: str = "workflow"  # "workflow" (vendored) or "playbook" (learned)
    metadata: Dict[str, Any] = field(default_factory=dict)


class SkillStore:
    def __init__(self, data_dir: Path, workflows_dir: Optional[Path] = None) -> None:
        self.playbooks_dir = Path(data_dir) / "skills"
        self.workflows_dir = Path(workflows_dir) if workflows_dir else _WORKFLOWS_DIR
        self._skills: Dict[str, Skill] = {}
        self._loaded = False

    # -- loading -----------------------------------------------------------

    def load_all(self) -> None:
        self._skills.clear()
        self._scan_dir(self.workflows_dir, level="workflow")
        # Playbooks load second: a learned playbook with the same name as a
        # vendored workflow wins (project-over-system semantics from OpenOPC).
        self._scan_dir(self.playbooks_dir, level="playbook")
        self._loaded = True

    def _ensure_loaded(self) -> None:
        if not self._loaded:
            self.load_all()

    def _scan_dir(self, base: Path, level: str) -> None:
        if not base.exists():
            return
        for child in sorted(base.iterdir()):
            if not child.is_dir():
                continue
            skill_md = child / "SKILL.md"
            if not skill_md.exists():
                continue
            skill = self._parse_skill_file(skill_md, level=level)
            if skill:
                self._skills[skill.name] = skill

    @staticmethod
    def _parse_skill_file(path: Path, level: str) -> Optional[Skill]:
        try:
            text = path.read_text(encoding="utf-8")
            frontmatter: Dict[str, Any] = {}
            content = text
            fm_match = re.match(r"^---\s*\n(.*?)\n---\s*\n", text, re.DOTALL)
            if fm_match:
                frontmatter = yaml.safe_load(fm_match.group(1)) or {}
                content = text[fm_match.end():]
            return Skill(
                name=str(frontmatter.get("name", path.parent.name)),
                description=str(frontmatter.get("description", "")),
                content=content.strip(),
                source_path=str(path),
                level=level,
                metadata=frontmatter.get("metadata", {}) or {},
            )
        except Exception:
            return None

    # -- accessors ----------------------------------------------------------

    def get(self, name: str) -> Optional[Skill]:
        self._ensure_loaded()
        return self._skills.get(name)

    def list_skills(self, level: str = "") -> List[Skill]:
        self._ensure_loaded()
        skills = list(self._skills.values())
        if level:
            skills = [s for s in skills if s.level == level]
        return skills

    def find(self, query_tokens: set) -> List[Skill]:
        """Skills whose name/description overlap the query tokens."""
        from . import roster

        self._ensure_loaded()
        matches: List[tuple] = []
        for skill in self._skills.values():
            haystack = roster.tokens(f"{skill.name}\n{skill.description}")
            overlap = len(query_tokens & haystack)
            if overlap:
                matches.append((overlap, skill))
        matches.sort(key=lambda item: (-item[0], item[1].name))
        return [skill for _, skill in matches]

    # -- persistence (playbook promotion) ------------------------------------

    def save_playbook(self, skill: Skill) -> Path:
        target_dir = self.playbooks_dir / skill.name
        target_dir.mkdir(parents=True, exist_ok=True)
        path = target_dir / "SKILL.md"
        fm: Dict[str, Any] = {"name": skill.name, "description": skill.description}
        if skill.metadata:
            fm["metadata"] = skill.metadata
        text = f"---\n{yaml.dump(fm, default_flow_style=False, allow_unicode=True)}---\n\n{skill.content}\n"
        path.write_text(text, encoding="utf-8")
        skill.source_path = str(path)
        skill.level = "playbook"
        self._skills[skill.name] = skill
        return path

    def delete_skill(self, name: str) -> bool:
        self._ensure_loaded()
        skill = self._skills.get(name)
        if not skill or not skill.source_path or skill.level != "playbook":
            return False
        path = Path(skill.source_path)
        if path.exists():
            shutil.rmtree(path.parent, ignore_errors=True)
        self._skills.pop(name, None)
        return True
