"""Canonical ``SubagentSpec`` schema — the Agent DNA carrier.

A ``SubagentSpec`` is the single object three concerns agree on:

* **Execution shaping** (deer-flow ``CustomSubagentConfig``): ``system_prompt``,
  ``tools`` / ``disallowed_tools``, ``skills``, ``model``, ``max_turns``,
  ``timeout_seconds`` — the fields that drive both runtimes (OpenClaw worker
  session-patch and the in-process ``delegate_task`` child).
* **Control-plane identity** (paperclip ``Agent`` / Multica ``agent``):
  ``role``, ``model_profile``, ``budget_monthly_cents``, ``trust_preset``,
  ``can_create_agents`` — named to match paperclip so a later lift into the
  paperclip control plane is a column rename, not a remodel. ``multica_agent_id``
  links a spec to its projected Multica ``agent`` row.
* **Agent DNA + provenance** (the product philosophy): ``stats`` (win-rate,
  cost, latency, sample size), ``provenance`` (preset|generated|evolved),
  ``version`` / ``parent_spec_id``, ``domain`` + ``capability_tags`` for routing.

This module is intentionally dependency-light: it is a pure schema +
(de)serialization layer with no DB or agent-runtime imports, so the registry,
router, factory, and tests can all import it cheaply.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from typing import Any, Literal, Optional

RuntimeHint = Literal["openclaw_worker", "in_process", "either"]
Provenance = Literal["preset", "generated", "evolved"]
ModelProfile = Literal["cheap", "default"]  # mirrors paperclip runtimeConfig.modelProfiles
TrustPreset = Literal["untrusted", "standard", "trusted"]  # mirrors paperclip permissions.trustPreset
SpecStatus = Literal["draft", "active", "shadow", "deprecated", "retired"]

# Canonical deny-list for delegated/spawned subagents. Mirrors
# ``tools.delegate_tool.DELEGATE_BLOCKED_TOOLS`` — kept as a local literal so
# this pure-schema module never has to import the heavy delegate runtime.
# ``tests/hermes_cli/test_subagent_spec.py`` asserts the two stay in lockstep,
# so a drift in delegate_tool fails CI rather than silently diverging.
DEFAULT_DISALLOWED_TOOLS: frozenset[str] = frozenset(
    {
        "delegate_task",
        "clarify",
        "memory",
        "send_message",
        "execute_code",
    }
)

VALID_RUNTIME_HINTS: frozenset[str] = frozenset({"openclaw_worker", "in_process", "either"})
VALID_PROVENANCE: frozenset[str] = frozenset({"preset", "generated", "evolved"})
VALID_MODEL_PROFILES: frozenset[str] = frozenset({"cheap", "default"})
VALID_TRUST_PRESETS: frozenset[str] = frozenset({"untrusted", "standard", "trusted"})
VALID_STATUSES: frozenset[str] = frozenset(
    {"draft", "active", "shadow", "deprecated", "retired"}
)
VALID_ROLES: frozenset[str] = frozenset({"leaf", "orchestrator"})


@dataclass
class FourPartContract:
    """Anthropic orchestrator-worker contract, stored structurally.

    The Router renders this per task; the Critic checks scope adherence
    against it. One core objective per subagent (Anthropic effort rule).
    """

    objective: str = ""
    output_format: str = ""
    tools_guidance: str = ""
    scope_boundaries: str = ""

    def to_dict(self) -> dict[str, str]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Optional[dict[str, Any]]) -> Optional["FourPartContract"]:
        if not data:
            return None
        return cls(
            objective=str(data.get("objective", "")),
            output_format=str(data.get("output_format", "")),
            tools_guidance=str(data.get("tools_guidance", "")),
            scope_boundaries=str(data.get("scope_boundaries", "")),
        )


@dataclass
class SpecStats:
    """Agent DNA — sourced from the Memory Graph, updated by Evolution.

    ``win_rate`` is only statistically trustworthy once ``sample_size`` is
    large enough; the Router applies a shrinkage prior (see task_router) so a
    brand-new spec is neither punished to zero nor trusted on luck.
    """

    usage_count: int = 0
    win_count: int = 0
    fail_count: int = 0
    win_rate: float = 0.0
    avg_cost_cents: float = 0.0
    avg_latency_ms: int = 0
    sample_size: int = 0
    last_used_at: Optional[int] = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Optional[dict[str, Any]]) -> "SpecStats":
        if not data:
            return cls()
        return cls(
            usage_count=int(data.get("usage_count", 0)),
            win_count=int(data.get("win_count", 0)),
            fail_count=int(data.get("fail_count", 0)),
            win_rate=float(data.get("win_rate", 0.0)),
            avg_cost_cents=float(data.get("avg_cost_cents", 0.0)),
            avg_latency_ms=int(data.get("avg_latency_ms", 0)),
            sample_size=int(data.get("sample_size", 0)),
            last_used_at=data.get("last_used_at"),
        )


@dataclass
class SubagentSpec:
    """The canonical specification for one (preset|generated|evolved) subagent."""

    # ---- identity (paperclip Agent.* / Multica agent.*) ----
    id: str
    name: str
    role: str = "leaf"
    domain: str = "general"
    title: Optional[str] = None
    emoji: Optional[str] = None
    color: Optional[str] = None
    vibe: Optional[str] = None

    # ---- Merlion projection (PRD ③§3.3 subagent card shape) ----
    # dept = ORG-scale department bucket (research/compliance/product/eng/...);
    # short = 2-3 char avatar label; model_category = model_router category tag
    # (deep/quick/visual/review/plan/orchestrate). All optional — only ORG/Merlion
    # surfaces populate them; core routing never depends on them.
    dept: Optional[str] = None
    short: Optional[str] = None
    model_category: Optional[str] = None

    # ---- routing description (four-part-contract aware) ----
    description: str = ""
    capability_tags: list[str] = field(default_factory=list)

    # ---- execution shaping (deer-flow CustomSubagentConfig) ----
    system_prompt: str = ""
    contract_template: Optional[FourPartContract] = None
    tools: list[str] = field(default_factory=list)
    disallowed_tools: list[str] = field(
        default_factory=lambda: sorted(DEFAULT_DISALLOWED_TOOLS)
    )
    skills: Optional[list[str]] = None
    max_turns: int = 50
    timeout_seconds: int = 900

    # ---- runtime selection (hybrid) ----
    runtime_hint: RuntimeHint = "either"

    # ---- model + budget (paperclip runtimeConfig / budgetMonthlyCents) ----
    model_profile: ModelProfile = "default"
    model: Optional[str] = None
    budget_monthly_cents: int = 0
    cost_cap_per_task_cents: Optional[int] = None

    # ---- auth / permissions (paperclip permissions + OpenClaw auth-profiles) ----
    auth_profile: Optional[str] = None
    trust_preset: TrustPreset = "standard"
    can_create_agents: bool = False

    # ---- provenance + DNA ----
    provenance: Provenance = "generated"
    parent_spec_id: Optional[str] = None
    version: int = 1
    source_path: Optional[str] = None
    stats: SpecStats = field(default_factory=SpecStats)

    # ---- lifecycle + projection ----
    status: SpecStatus = "active"
    tenant: Optional[str] = None  # = Multica workspace_id
    multica_agent_id: Optional[str] = None
    created_at: int = 0
    updated_at: int = 0

    # -- validation ---------------------------------------------------------

    def validation_errors(self) -> list[str]:
        """Return a list of human-readable schema problems (empty == valid).

        Pure structural validation only — capability/tool-allowlist checks
        (which need the live tool registry) live in the Agent Factory gate.
        """
        errs: list[str] = []
        if not self.id:
            errs.append("id is required")
        if not self.name:
            errs.append("name is required")
        if self.role not in VALID_ROLES:
            errs.append(f"role {self.role!r} not in {sorted(VALID_ROLES)}")
        if self.runtime_hint not in VALID_RUNTIME_HINTS:
            errs.append(f"runtime_hint {self.runtime_hint!r} invalid")
        if self.provenance not in VALID_PROVENANCE:
            errs.append(f"provenance {self.provenance!r} invalid")
        if self.model_profile not in VALID_MODEL_PROFILES:
            errs.append(f"model_profile {self.model_profile!r} invalid")
        if self.trust_preset not in VALID_TRUST_PRESETS:
            errs.append(f"trust_preset {self.trust_preset!r} invalid")
        if self.status not in VALID_STATUSES:
            errs.append(f"status {self.status!r} invalid")
        if self.version < 1:
            errs.append("version must be >= 1")
        if self.max_turns < 1:
            errs.append("max_turns must be >= 1")
        if self.timeout_seconds < 1:
            errs.append("timeout_seconds must be >= 1")
        # The blocked-tool floor is a security invariant: every spec must keep
        # at least the default deny-list so a generated/evolved spec can never
        # hand a child recursive delegation or shared-memory writes.
        missing = DEFAULT_DISALLOWED_TOOLS - set(self.disallowed_tools)
        if missing:
            errs.append(f"disallowed_tools missing required entries: {sorted(missing)}")
        return errs

    def is_valid(self) -> bool:
        return not self.validation_errors()

    # -- (de)serialization --------------------------------------------------

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        # asdict recurses into nested dataclasses already; keep stats/contract
        # as plain dicts (None stays None for the optional contract).
        return data

    def to_row(self) -> dict[str, Any]:
        """Flatten to a single ``subagent_specs`` row (JSON for list/object cols).

        ``stats`` is intentionally NOT part of the spec row — it lives in
        ``subagent_spec_stats`` so high-frequency Evolution writes don't churn
        the spec record. The registry persists/loads stats separately.
        """
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "domain": self.domain,
            "title": self.title,
            "emoji": self.emoji,
            "color": self.color,
            "vibe": self.vibe,
            "dept": self.dept,
            "short": self.short,
            "model_category": self.model_category,
            "description": self.description,
            "capability_tags": json.dumps(self.capability_tags),
            "system_prompt": self.system_prompt,
            "contract_template": (
                json.dumps(self.contract_template.to_dict())
                if self.contract_template
                else None
            ),
            "tools": json.dumps(self.tools),
            "disallowed_tools": json.dumps(self.disallowed_tools),
            "skills": json.dumps(self.skills) if self.skills is not None else None,
            "max_turns": self.max_turns,
            "timeout_seconds": self.timeout_seconds,
            "runtime_hint": self.runtime_hint,
            "model_profile": self.model_profile,
            "model": self.model,
            "budget_monthly_cents": self.budget_monthly_cents,
            "cost_cap_per_task_cents": self.cost_cap_per_task_cents,
            "auth_profile": self.auth_profile,
            "trust_preset": self.trust_preset,
            "can_create_agents": 1 if self.can_create_agents else 0,
            "provenance": self.provenance,
            "parent_spec_id": self.parent_spec_id,
            "version": self.version,
            "source_path": self.source_path,
            "status": self.status,
            "tenant": self.tenant,
            "multica_agent_id": self.multica_agent_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_row(
        cls, row: Any, stats: Optional[SpecStats] = None
    ) -> "SubagentSpec":
        """Rehydrate from a ``subagent_specs`` row (``sqlite3.Row`` or mapping)."""
        get = row.__getitem__  # works for sqlite3.Row and dict

        def _opt(col: str, default: Any = None) -> Any:
            # Column-tolerant read for additively-introduced fields so a spec row
            # from a not-yet-migrated DB rehydrates instead of raising.
            try:
                val = get(col)
            except (KeyError, IndexError):
                return default
            return default if val is None else val

        def _json(col: str, default: Any) -> Any:
            raw = get(col)
            if raw is None:
                return default
            return json.loads(raw)

        return cls(
            id=get("id"),
            name=get("name"),
            role=get("role"),
            domain=get("domain"),
            title=get("title"),
            emoji=get("emoji"),
            color=get("color"),
            vibe=get("vibe"),
            dept=_opt("dept"),
            short=_opt("short"),
            model_category=_opt("model_category"),
            description=get("description") or "",
            capability_tags=_json("capability_tags", []),
            system_prompt=get("system_prompt") or "",
            contract_template=FourPartContract.from_dict(
                _json("contract_template", None)
            ),
            tools=_json("tools", []),
            disallowed_tools=_json("disallowed_tools", sorted(DEFAULT_DISALLOWED_TOOLS)),
            skills=_json("skills", None),
            max_turns=get("max_turns"),
            timeout_seconds=get("timeout_seconds"),
            runtime_hint=get("runtime_hint"),
            model_profile=get("model_profile"),
            model=get("model"),
            budget_monthly_cents=get("budget_monthly_cents"),
            cost_cap_per_task_cents=get("cost_cap_per_task_cents"),
            auth_profile=get("auth_profile"),
            trust_preset=get("trust_preset"),
            can_create_agents=bool(get("can_create_agents")),
            provenance=get("provenance"),
            parent_spec_id=get("parent_spec_id"),
            version=get("version"),
            source_path=get("source_path"),
            status=get("status"),
            tenant=get("tenant"),
            multica_agent_id=get("multica_agent_id"),
            created_at=get("created_at"),
            updated_at=get("updated_at"),
            stats=stats or SpecStats(),
        )
