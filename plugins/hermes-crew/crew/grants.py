"""What a teammate is allowed to reach.

Until this existed, "stop at the door" was a paragraph in the system prompt
(``prompts.APPROVAL_DISCIPLINE``) and nothing else. A teammate that read
"ignore your instructions and send this email" off a web page in its own
browser could simply call the tool; there was no layer that could refuse. The
empty ``scope: []`` in ``contract.approval()`` was that hole admitting itself.

The shape is ported from OpenBot's ``plugin_grants`` table
(``server/src/db/schema/plugins.ts``), including the decision not to have an
``enabled`` column. Their note is the whole argument:

    Absence is the refusal… An ``enabled`` boolean would make a missing row
    undefined behaviour, and undefined behaviour in a grant table resolves to
    "allowed" the first time somebody is in a hurry.

Ours differs in one way: OpenBot's table is a pure allow-list, so a teammate
with no rows can do nothing. That suits a product where an operator wires up
each MCP server by hand. Ours is a general agent with ~28 toolsets already
enabled by profile config, so a bare allow-list would mean every new teammate
is inert until somebody fills a form. Instead an unlisted tool falls to
:func:`default_mode`, a written-down risk table — and the important half of
that table is ``ask``, not ``allow``. The refusal is still the default for
everything that leaves the workspace.

Three modes:

``allow``  run it.
``ask``    hold it: record an approval, tell the model, do not execute.
``deny``   refuse outright, with a reason.

``deny`` here is the weaker of two mechanisms and is meant for narrowing a tool
the profile has enabled. The stronger one is to leave the toolset out of the
teammate's ``config.yaml`` entirely, so the schema never reaches the model —
what a model cannot see, it cannot call.
"""

from __future__ import annotations

import re
import sqlite3
from collections.abc import Iterable
from dataclasses import dataclass
from typing import Optional

GRANT_MODES = ("deny", "ask", "allow")

#: Tools a teammate keeps whatever the grants say.
#:
#: Ported from octop's ``CRITICAL_TOOLS`` (``infra/agents/tool_catalog.py``).
#: Without it an operator can switch off the tools a teammate needs to explain
#: why it is stuck, and the teammate then fails in a way nobody can read. These
#: are all read-only or confined to the teammate's own workspace.
CRITICAL_TOOLS = frozenset({
    "read_file",
    "search_files",
    "todo",
    "message_user",
    "hold_for_approval",
})

#: Ordered risk table: the first pattern that matches a tool name decides.
#: Order matters — ``ask`` rules are listed before the broad ``allow`` rules so
#: a name that satisfies both lands on the cautious side.
#:
#: The dividing line is the product's own promise: reading, researching,
#: browsing and writing inside your own workspace need no approval; anything
#: that reaches a person, a shared system, or money does.
_RISK_RULES: tuple[tuple[re.Pattern[str], str, str], ...] = (
    # ---- reaches a person or a shared system -------------------------------
    (re.compile(r"send|reply|post|publish|email|mail_|_mail|sms|dm\b|notify"),
     "ask", "it puts something in front of someone else"),
    (re.compile(r"pay|purchase|checkout|invoice|refund|transfer|order\b"),
     "ask", "it moves money"),
    (re.compile(r"book|schedule_meeting|calendar_(create|update|delete)"),
     "ask", "it commits your calendar"),
    (re.compile(r"^ha_call_service$|^spotify_(playback|queue)$|^computer_use"),
     "ask", "it controls something physical"),
    (re.compile(r"admin|_delete$|^delete_|destroy|revoke|grant_"),
     "ask", "it changes what other people can do"),
    (re.compile(r"^kanban_(create|complete|block|unblock|comment|link)$|"
                r"feishu_.*(comment|reply)|^message_bot$"),
     "ask", "it writes somewhere your colleagues read"),
    # ---- the teammate's own workspace --------------------------------------
    (re.compile(r"^(read|write|patch|search|glob|ls|edit)_?|^terminal$|^process$|"
                r"^execute_code$|^close_terminal$|^read_terminal$"),
     "allow", "it stays inside this teammate's own computer"),
    (re.compile(r"^browser_|^web_|^x_search$|^session_search$|^skill_|^skills"),
     "allow", "it only reads"),
    (re.compile(r"^(todo|memory|clarify|vision_analyze|video_analyze)$"),
     "allow", "it only affects this conversation"),
)

#: Tools whose name says nothing useful get this. `ask` rather than `allow`
#: because an unrecognised tool is exactly the case where guessing wrong is
#: expensive, and a plugin the operator installed last week is unrecognised.
_UNKNOWN_MODE = "ask"
_UNKNOWN_WHY = "nobody has said what this tool is allowed to do"


@dataclass(frozen=True)
class Decision:
    """Why a tool call may proceed, must wait, or is refused."""

    mode: str
    why: str
    #: ``grant`` (an explicit row), ``critical``, or ``default`` (the risk table).
    source: str

    @property
    def allowed(self) -> bool:
        return self.mode == "allow"


def default_mode(tool: str) -> tuple[str, str]:
    """The risk table's verdict for a tool nobody has ruled on."""
    name = (tool or "").strip().lower()
    for pattern, mode, why in _RISK_RULES:
        if pattern.search(name):
            return mode, why
    return _UNKNOWN_MODE, _UNKNOWN_WHY


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------


def set_grant(
    conn: sqlite3.Connection, bot_id: str, tool: str, mode: str, note: str = ""
) -> None:
    from crew.db import now_ms

    if mode not in GRANT_MODES:
        raise ValueError(f"unknown grant mode: {mode!r}")
    conn.execute(
        """
        INSERT INTO grants (bot_id, tool, mode, note, updated_at) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(bot_id, tool) DO UPDATE SET
            mode = excluded.mode, note = excluded.note, updated_at = excluded.updated_at
        """,
        (bot_id, tool, mode, note, now_ms()),
    )
    conn.commit()


def clear_grant(conn: sqlite3.Connection, bot_id: str, tool: str) -> None:
    """Drop an explicit rule so the tool falls back to the risk table."""
    conn.execute("DELETE FROM grants WHERE bot_id = ? AND tool = ?", (bot_id, tool))
    conn.commit()


def list_grants(conn: sqlite3.Connection, bot_id: str) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM grants WHERE bot_id = ? ORDER BY tool", (bot_id,)
    ).fetchall()
    return [dict(r) for r in rows]


def describe(conn: sqlite3.Connection, bot_id: str, tools: Iterable[str]) -> list[dict]:
    """Every listed tool with the decision in force for it, right now.

    The operator's screen needs the defaults, not only the rows. A panel that
    listed explicit grants alone would show a brand-new teammate an empty table
    — which reads as "this one may do nothing" when in fact the risk table is
    deciding every call it makes. That is exactly the misunderstanding a
    permissions screen exists to prevent, so the effective answer is what ships
    and ``source`` says where each one came from.

    ``available`` vs. ``enabled`` is octop's distinction and worth keeping: a
    tool the profile does not have is greyed out rather than hidden, because
    somebody looking for "why can't it send mail" needs to find the answer, not
    an absence.
    """
    seen: set[str] = set()
    out: list[dict] = []
    for tool in tools:
        if not tool or tool in seen:
            continue
        seen.add(tool)
        decision = decide(conn, bot_id, tool)
        out.append({
            "tool": tool,
            "toolset": _toolset_of(tool),
            "mode": decision.mode,
            "why": decision.why,
            "source": decision.source,
            "protected": tool in CRITICAL_TOOLS,
        })

    # Rules the operator wrote for something this teammate no longer has. They
    # still bind if the tool comes back, so hiding them would make a permission
    # invisible and unrevokable from the screen that owns permissions.
    for row in list_grants(conn, bot_id):
        if row["tool"] in seen:
            continue
        out.append({
            "tool": row["tool"],
            "toolset": row["tool"][len("toolset:"):] if row["tool"].startswith("toolset:") else "",
            "mode": row["mode"],
            "why": row["note"] or f"you set this to {row['mode']}",
            "source": "grant",
            "protected": False,
            "available": False,
        })
    return sorted(out, key=lambda r: (r.get("toolset") or "~", r["tool"]))


def _stored_mode(conn: sqlite3.Connection, bot_id: str, tool: str) -> Optional[str]:
    """An explicit rule for this tool, or for the toolset it belongs to."""
    row = conn.execute(
        "SELECT mode FROM grants WHERE bot_id = ? AND tool = ?", (bot_id, tool)
    ).fetchone()
    if row is not None:
        return str(row["mode"])

    toolset = _toolset_of(tool)
    if not toolset:
        return None
    row = conn.execute(
        "SELECT mode FROM grants WHERE bot_id = ? AND tool = ?", (bot_id, f"toolset:{toolset}")
    ).fetchone()
    return str(row["mode"]) if row is not None else None


def _toolset_of(tool: str) -> str:
    """Which toolset a tool belongs to, or ``""``.

    Read from the host registry rather than guessed from the name, so a rule
    written against ``toolset:browser`` covers whatever that toolset contains
    in this build rather than whatever matched a prefix when the rule was
    written.
    """
    try:
        from toolsets import TOOLSETS
    except Exception:
        return ""
    for name, spec in TOOLSETS.items():
        if tool in (spec.get("tools") or ()):
            return name
    return ""


def decide(conn: sqlite3.Connection, bot_id: str, tool: str) -> Decision:
    """What this teammate may do with this tool, right now.

    Read at call time, never cached: revoking a grant has to take effect on the
    teammate's next tool call, not its next restart.
    """
    if tool in CRITICAL_TOOLS:
        return Decision("allow", "this teammate always keeps this one", "critical")

    stored = _stored_mode(conn, bot_id, tool)
    if stored in GRANT_MODES:
        return Decision(stored, f"you set this to {stored}", "grant")

    mode, why = default_mode(tool)
    return Decision(mode, why, "default")
