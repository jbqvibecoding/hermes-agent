"""Merlion complexity classifier — tier (simple/complex/very_complex) + scale.

1:1 with Merlion PRD ③§2: a fast heuristic path (the Home-side ``isComplexTask``
+ ``LAUNCH_VENTURE`` regexes) plus an optional LLM main path. When both run and
disagree, take the higher tier (conservative upgrade), per the PRD.

Pure + deterministic (the LLM is injected; absent → heuristic only), so the
classifier is unit-testable on its own. Complements ``task_router.classify``
(depth/breadth/risk) — this module owns the product-facing tier/scale taxonomy.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Callable, Literal, Optional

Tier = Literal["simple", "complex", "very_complex"]
Scale = Literal["small", "org"]

DeptId = Literal["research", "compliance", "product", "eng", "infra", "finance"]
DEFAULT_DEPARTMENTS: list[str] = ["research", "compliance", "product", "eng", "infra", "finance"]

# PRD §2.2(A): COMPLEX markers → very_complex/org.
_COMPLEX = re.compile(
    r"super-?app|fintech|cross-border|payments?|lending|wallet|remittance|kyc|aml|"
    r"marketplace|ecosystem|end-to-end|multi-(market|region|country)|platform|"
    r"operating system|build (and|&) (launch|operate|run)|launch (and|&) (operate|run|scale)|"
    r"跨境|端到端|多市场|多个市场|多部门|多个部门|生态|超级app|超级应用|平台|金融科技|支付|借贷",
    re.IGNORECASE,
)
# PRD §2.2(A): LAUNCH_VENTURE — build/launch verb + (0–40 chars) + venture noun.
_LAUNCH_VENTURE = re.compile(
    r"(launch|build|stand up|spin up|创建|搭建|启动|做一个|开发)"
    r".{0,40}?"
    r"(app|application|product|platform|company|venture|business|bank|startup|service|"
    r"系统|平台|产品|公司|业务|应用)",
    re.IGNORECASE | re.DOTALL,
)
# Long-and-multi-segment (>140 chars with a connective) also reads complex.
_MULTISEG = re.compile(r"\band\b|，|、|;|；|then|next|after", re.IGNORECASE)

# Department keyword hints (for suggested_departments).
_DEPT_HINTS: dict[str, tuple[str, ...]] = {
    "research": ("research", "market", "competitor", "discovery", "研究", "市场"),
    "compliance": ("kyc", "aml", "compliance", "license", "regulat", "fraud", "privacy", "合规", "风控"),
    "product": ("product", "ux", "design", "localization", "content", "产品", "设计"),
    "eng": ("engineering", "api", "backend", "mobile", "platform", "payments engineer", "工程", "开发"),
    "infra": ("devops", "cloud", "security", "sre", "observability", "infra", "运维", "安全"),
    "finance": ("finance", "treasury", "growth", "gtm", "modeling", "财务", "增长"),
}


@dataclass
class Classification:
    tier: Tier
    scale: Scale
    confidence: float = 0.6
    rationale: str = ""
    suggested_departments: list[str] = field(default_factory=list)
    needs_upload_context: bool = False


def is_complex_task(q: str) -> bool:
    """Home-side coarse判: very_complex iff any COMPLEX/LAUNCH/long-multiseg hit."""
    if not q:
        return False
    if _COMPLEX.search(q) or _LAUNCH_VENTURE.search(q):
        return True
    return len(q) > 140 and bool(_MULTISEG.search(q))


def suggest_departments(q: str) -> list[str]:
    """Departments whose keywords the brief hits, in canonical order; default all 6."""
    hits = [d for d in DEFAULT_DEPARTMENTS if any(k in q.lower() for k in _DEPT_HINTS[d])]
    return hits or list(DEFAULT_DEPARTMENTS)


# An injected LLM classifier returns a (possibly partial) Classification or None.
LlmClassifier = Callable[[str], Optional[Classification]]

_TIER_RANK = {"simple": 0, "complex": 1, "very_complex": 2}


def _higher(a: Tier, b: Tier) -> Tier:
    return a if _TIER_RANK[a] >= _TIER_RANK[b] else b


def _heuristic(brief: str, *, upload: bool, has_mode: bool) -> Classification:
    # PRD: attachment forces complex; Orchestra mode never yields 'simple'.
    if is_complex_task(brief) or upload:
        return Classification(
            tier="very_complex", scale="org", confidence=0.7,
            rationale="matched venture/complex markers or has upload",
            suggested_departments=suggest_departments(brief),
            needs_upload_context=upload,
        )
    if has_mode or len(brief) > 64:
        return Classification(
            tier="complex", scale="small", confidence=0.6,
            rationale="focused multi-specialist task (no venture markers)",
        )
    return Classification(
        tier="simple", scale="small", confidence=0.6,
        rationale="single direct/lightweight task",
    )


def classify(
    brief: str,
    *,
    upload: bool = False,
    scale_hint: Optional[Scale] = None,
    has_mode: bool = True,
    llm: Optional[LlmClassifier] = None,
) -> Classification:
    """Classify a brief into tier+scale.

    ``scale_hint`` (Home passed ``scale=`` explicitly) wins on scale. When an LLM
    classifier is injected and disagrees with the heuristic, the *higher* tier is
    taken (conservative upgrade); scale derives from the final tier unless pinned.
    """
    result = _heuristic(brief, upload=upload, has_mode=has_mode)

    if llm is not None:
        llm_res = llm(brief)
        if llm_res is not None:
            tier = _higher(result.tier, llm_res.tier)
            upgraded = tier != result.tier or tier != llm_res.tier
            result = Classification(
                tier=tier,
                scale=result.scale,
                confidence=max(result.confidence, llm_res.confidence) if not upgraded else min(result.confidence, llm_res.confidence),
                rationale=llm_res.rationale or result.rationale,
                suggested_departments=llm_res.suggested_departments or result.suggested_departments,
                needs_upload_context=result.needs_upload_context or llm_res.needs_upload_context,
            )

    # Scale: explicit hint wins; else org iff very_complex.
    if scale_hint is not None:
        result.scale = scale_hint
    else:
        result.scale = "org" if result.tier == "very_complex" else "small"

    if result.tier == "very_complex" and not result.suggested_departments:
        result.suggested_departments = suggest_departments(brief)
    return result
