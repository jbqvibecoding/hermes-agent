"""The draft-and-hold approval ledger — ported from OpenGrokBot's ``approvals.ts``.

A teammate prepares an outward-facing action in full, then stops at the door.
The turn **ends**. The operator's Approve/Discard starts a fresh turn with a
continuation seed. Nothing leaves the workspace in between.

**This is not Hermes's ``tools/approval.py``.** That one gates dangerous shell
commands *inside* a turn: the tool call blocks, the operator answers, the same
turn continues. Both exist and neither replaces the other. The distinction is
the time scale — a dangerous `rm` is answered in seconds by whoever is at the
keyboard, while "send these four drafts" may sit unanswered until tomorrow
morning, and holding a turn open overnight would pin a model context, burn the
prompt cache, and lose the work to any restart.

**Idempotency is a SQL guard, not application logic.** ``UPDATE ... WHERE id=?
AND status='pending'`` means a double-click, a replayed request, or two browser
tabs racing all collapse to one decision: the second one changes zero rows and
the caller returns 409. Checking status first and then updating would leave a
window between the two statements.

Four things here came from reading OpenMuse's ``apps/server/src/actions.ts``
and octop's ``infra/gateway/hitl/store.py``, and each closes a hole this file
had:

* **A content hash of what the operator was shown.** Deciding against a stale
  hash is refused. Approving something other than what you read is the one
  failure the whole mechanism exists to prevent, and without this the hold can
  be rewritten under the operator between render and click.
* **An idempotency key**, so a tool call retried by the model produces one hold
  rather than a pile.
* **An expiry.** An approval nobody answered is not a standing permission.
* **A short ``ref``** — four hex characters, typeable into a chat reply, so a
  decision does not require the panel.
"""

from __future__ import annotations

import hashlib
import json
import re
import secrets
import sqlite3
from typing import Any, Literal, Optional

from crew.db import now_ms

Decision = Literal["approve", "discard"]

#: How long a hold stands before it lapses. Long enough to survive a meeting,
#: short enough that "I approved that this morning" cannot fire tonight.
DEFAULT_TTL_MS = 30 * 60 * 1000

#: Terminal states. ``expired`` is distinct from ``discarded`` because nobody
#: decided — the teammate should say so rather than report a refusal.
#: The life of a held action. Four of these describe a decision, four describe
#: what became of it, and keeping them apart is the point.
#:
#: ``executing`` and ``outcome_unknown`` exist because "we let it through" and
#: "it happened" are different claims, and the gap between them is where a
#: process dies. ``failed`` asserts *nothing happened, retrying is safe*;
#: ``outcome_unknown`` asserts *we cannot know — do not retry, go and look*.
#: Collapsing the two is comfortable right up to the moment it matters, which
#: is a duplicate payment or a second copy of an email to a customer.
#:
#: Ported from OpenMuse's action union, which carries the same distinction for
#: the same reason.
STATUSES = (
    "pending",          # waiting for the operator
    "approved",         # they said yes; nothing has run yet
    "executing",        # released, the tool is running right now
    "succeeded",        # it ran and worked
    "failed",           # it ran and did not work — nothing happened, safe to retry
    "outcome_unknown",  # we released it and never saw the end. A person must check.
    "discarded",        # they said no
    "expired",          # nobody said anything in time
)

#: Once a hold reaches one of these, the decision is spent.
SETTLED = ("succeeded", "failed", "outcome_unknown", "discarded", "expired")


def content_hash(action: str, detail: str, scope: Any = None) -> str:
    """Fingerprint of what the operator is being shown.

    Everything that appears on the card goes in. If any of it changes, the
    decision the operator was about to make is no longer the decision in front
    of them, and :func:`resolve_approval` refuses it.
    """
    payload = json.dumps(
        {"action": action or "", "detail": detail or "", "scope": scope or []},
        sort_keys=True, ensure_ascii=False, default=str,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:16]


def _new_ref(conn: sqlite3.Connection) -> str:
    """A short handle the operator can type. Retried on the unique index."""
    for _ in range(12):
        ref = secrets.token_hex(2)
        row = conn.execute("SELECT 1 FROM approvals WHERE ref = ?", (ref,)).fetchone()
        if row is None:
            return ref
    # 65k refs are in play; fall back to something longer rather than loop.
    return secrets.token_hex(4)


def create_approval(
    conn: sqlite3.Connection,
    *,
    thread_id: str,
    bot_id: str,
    action: str,
    detail: str = "",
    scope: Optional[list[str]] = None,
    tool: str = "",
    tool_call_id: str = "",
    turn_id: str = "",
    source: str = "",
    idem_key: Optional[str] = None,
    ttl_ms: int = DEFAULT_TTL_MS,
) -> dict:
    """Hold an action. Returns the existing hold when ``idem_key`` repeats.

    The model retries. A tool call blocked for approval and then re-attempted
    must not stack up four identical cards in front of the operator, so the
    caller passes a key derived from the call and gets the same row back.
    """
    if idem_key:
        existing = _actionable_by_idem(conn, idem_key)
        if existing is not None:
            return existing

    ts = now_ms()
    cur = conn.execute(
        """
        INSERT INTO approvals (ref, thread_id, bot_id, action, detail, scope, tool,
                               tool_call_id, turn_id, source, content_hash, idem_key,
                               status, created_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
        """,
        (
            _new_ref(conn), thread_id, bot_id, action, detail,
            json.dumps(scope or [], ensure_ascii=False), tool, tool_call_id, turn_id,
            source, content_hash(action, detail, scope), idem_key,
            ts, ts + max(0, ttl_ms),
        ),
    )
    conn.commit()
    return get_approval(conn, int(cur.lastrowid))  # type: ignore[return-value]


def _actionable_by_idem(conn: sqlite3.Connection, idem_key: str) -> Optional[dict]:
    """The hold this key still refers to, if any.

    "Still refers to" is narrower than "exists". A hold that was discarded, that
    lapsed, or that has already released its call is finished business — asking
    again a week later is a new decision for the operator to make, not a replay
    of the old one. Only a hold that is still waiting, or approved and not yet
    spent, answers here.
    """
    return _parse(conn.execute(
        """
        SELECT * FROM approvals
         WHERE idem_key = ?
           AND (status = 'pending' OR (status = 'approved' AND consumed_at IS NULL))
         ORDER BY id DESC LIMIT 1
        """,
        (idem_key,),
    ).fetchone())


def claim_release(conn: sqlite3.Connection, idem_key: str) -> Optional[dict]:
    """Spend an approval on the call it was granted for. One call, once.

    This is what lets the blocked tool call actually happen after the operator
    says yes: the teammate resumes, re-attempts the same call, and the guard
    finds a matching approval and steps aside.

    The CAS is the whole mechanism. ``WHERE ... AND consumed_at IS NULL``
    means two concurrent attempts at the same approved call — a retry racing a
    resumed turn — cannot both get through: the second one changes zero rows
    and is held again. An approval is permission for one action, not a standing
    grant for that shape of action.
    """
    if not idem_key:
        return None
    ts = now_ms()
    cur = conn.execute(
        """
        UPDATE approvals SET consumed_at = ?, status = 'executing'
         WHERE idem_key = ? AND status = 'approved' AND consumed_at IS NULL
        """,
        (ts, idem_key),
    )
    conn.commit()
    if cur.rowcount == 0:
        return None
    return _parse(conn.execute(
        "SELECT * FROM approvals WHERE idem_key = ? AND consumed_at = ? ORDER BY id DESC LIMIT 1",
        (idem_key, ts),
    ).fetchone())


def settle_execution(
    conn: sqlite3.Connection, approval_id: int, *, success: bool, error: str = ""
) -> Optional[dict]:
    """Record what became of a released action. Closes the ``executing`` window.

    Only moves a row that is still ``executing``, so a late or duplicated
    settle cannot overwrite an outcome somebody has already recorded — most
    importantly it cannot turn an ``outcome_unknown`` that a restart wrote back
    into a tidy ``succeeded``.
    """
    cur = conn.execute(
        """
        UPDATE approvals SET status = ?, note = ?, resolved_at = ?
         WHERE id = ? AND status = 'executing'
        """,
        ("succeeded" if success else "failed", error, now_ms(), approval_id),
    )
    conn.commit()
    return get_approval(conn, approval_id) if cur.rowcount else None


def recover_executing(conn: sqlite3.Connection) -> int:
    """Turn every in-flight release into ``outcome_unknown``. Returns how many.

    Run once when the plugin loads. A row still reading ``executing`` means a
    process was told to go ahead, did so, and never came back — the tool call
    was dispatched and nobody saw the answer.

    This is safe to run at startup in a way the *task* engine's recovery
    deliberately is not, and the difference is worth stating: a task can be
    picked up by a peer, so no startup statement can tell a crashed run from a
    healthy one. A released approval has no peer. It was spent in one process on
    one tool call, and if that row is still ``executing`` when the plugin next
    loads, the answer to "did it happen?" is genuinely nobody knows.

    Ported from OpenMuse's ``recoverInterruptedActions``, which is one
    statement at boot for exactly this.
    """
    note = (
        "The process stopped while this was running. It may or may not have "
        "gone through — check before allowing it again."
    )
    cur = conn.execute(
        """
        UPDATE approvals SET status = 'outcome_unknown', resolved_at = ?, note = ?
         WHERE status = 'executing'
        """,
        (now_ms(), note),
    )
    conn.commit()
    return cur.rowcount


def recent_refusal(
    conn: sqlite3.Connection, idem_key: str, within_ms: int = DEFAULT_TTL_MS
) -> Optional[dict]:
    """A recent "no" to this exact call, so a retry is refused rather than re-asked.

    Without this, a model that re-attempts a discarded action gets a second
    identical card. The operator declines again, it tries again, and the panel
    fills with the same question. Refusing the retry outright says the true
    thing — somebody already answered — and keeps the answer in one place.

    Bounded in time on purpose. A refusal is a decision about now, not a
    permanent ban: the same request tomorrow deserves to reach the operator.
    """
    if not idem_key:
        return None
    return _parse(conn.execute(
        """
        SELECT * FROM approvals
         WHERE idem_key = ? AND status IN ('discarded', 'expired') AND resolved_at >= ?
         ORDER BY id DESC LIMIT 1
        """,
        (idem_key, now_ms() - max(0, within_ms)),
    ).fetchone())


def uncertain_outcome(
    conn: sqlite3.Connection, idem_key: str, within_ms: int = DEFAULT_TTL_MS
) -> Optional[dict]:
    """A recent release of this exact call whose outcome nobody knows.

    The teammate must not simply try again. It was allowed once, it went out —
    or it may have — and a second attempt is how one payment becomes two. The
    honest move is to stop and say a person needs to check.

    Bounded by the same window as :func:`recent_refusal`, because "we don't
    know what happened this morning" should not silence the same request next
    month. The row and its audit line outlive the window; what expires is only
    the automatic refusal.
    """
    if not idem_key:
        return None
    return _parse(conn.execute(
        """
        SELECT * FROM approvals
         WHERE idem_key = ? AND status = 'outcome_unknown' AND resolved_at >= ?
         ORDER BY id DESC LIMIT 1
        """,
        (idem_key, now_ms() - max(0, within_ms)),
    ).fetchone())


def attach_approval_message(conn: sqlite3.Connection, approval_id: int, message_id: int) -> None:
    """Record which chip represents this approval.

    The chip cannot carry its own id until after it is inserted, so the caller
    inserts the chip, then backfills the link here. Without it the resolve path
    has no way to flip *that* chip in place and the operator gets a second chip
    instead of an answered first one.
    """
    conn.execute("UPDATE approvals SET message_id = ? WHERE id = ?", (message_id, approval_id))
    conn.commit()


def _parse(row: Optional[sqlite3.Row]) -> Optional[dict]:
    if row is None:
        return None
    approval = dict(row)
    raw = approval.get("scope")
    try:
        approval["scope"] = json.loads(raw) if raw else []
    except (ValueError, TypeError):
        approval["scope"] = []
    return approval


def get_approval(conn: sqlite3.Connection, approval_id: int) -> Optional[dict]:
    return _parse(conn.execute("SELECT * FROM approvals WHERE id = ?", (approval_id,)).fetchone())


def get_by_ref(conn: sqlite3.Connection, ref: str) -> Optional[dict]:
    return _parse(conn.execute("SELECT * FROM approvals WHERE ref = ?", (ref,)).fetchone())


def latest_pending_approval(conn: sqlite3.Connection, thread_id: str) -> Optional[dict]:
    return _parse(conn.execute(
        "SELECT * FROM approvals WHERE thread_id = ? AND status = 'pending' ORDER BY id DESC LIMIT 1",
        (thread_id,),
    ).fetchone())


class StaleApproval(ValueError):
    """The card changed between being shown and being decided."""


def resolve_approval(
    conn: sqlite3.Connection,
    approval_id: int,
    decision: Decision,
    *,
    expect_hash: str = "",
    note: str = "",
) -> Optional[dict]:
    """Settle a pending approval. Returns ``None`` when it was already settled.

    A ``None`` return is the caller's signal to answer 409 and — crucially —
    to **not** fire the continuation turn a second time. That is what stops a
    double-clicked Approve from sending the same email twice.

    ``expect_hash`` is the hash the operator's client rendered. When it no
    longer matches, this raises rather than deciding: the operator would be
    approving something they have not read.
    """
    current = get_approval(conn, approval_id)
    if current is None:
        return None

    if expect_hash and expect_hash != current.get("content_hash"):
        raise StaleApproval(
            "This request changed since you opened it. Read the latest version before deciding."
        )

    if current["status"] == "pending" and _is_expired(current):
        expire_approval(conn, approval_id)
        return None

    status = "approved" if decision == "approve" else "discarded"
    cur = conn.execute(
        "UPDATE approvals SET status = ?, note = ?, resolved_at = ? WHERE id = ? AND status = 'pending'",
        (status, note, now_ms(), approval_id),
    )
    conn.commit()
    if cur.rowcount == 0:
        return None
    return get_approval(conn, approval_id)


def _is_expired(approval: dict) -> bool:
    expires_at = approval.get("expires_at")
    return bool(expires_at) and now_ms() > int(expires_at)


def expire_approval(conn: sqlite3.Connection, approval_id: int) -> Optional[dict]:
    """Lapse one hold. Same SQL guard, so it cannot race a real decision."""
    cur = conn.execute(
        "UPDATE approvals SET status = 'expired', resolved_at = ? WHERE id = ? AND status = 'pending'",
        (now_ms(), approval_id),
    )
    conn.commit()
    return get_approval(conn, approval_id) if cur.rowcount else None


def sweep_expired(conn: sqlite3.Connection) -> list[dict]:
    """Lapse every hold past its deadline. Returns what changed.

    Called from the read paths rather than a timer: an approval only matters
    when somebody looks at it or the teammate asks, and a lazy sweep has no
    process to keep alive.
    """
    rows = conn.execute(
        "SELECT id FROM approvals WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < ?",
        (now_ms(),),
    ).fetchall()
    lapsed = [expire_approval(conn, int(r["id"])) for r in rows]
    return [a for a in lapsed if a]


def list_pending(conn: sqlite3.Connection) -> list[dict]:
    sweep_expired(conn)
    rows = conn.execute(
        "SELECT * FROM approvals WHERE status = 'pending' ORDER BY id DESC"
    ).fetchall()
    return [_parse(r) for r in rows]  # type: ignore[misc]


def list_approvals(
    conn: sqlite3.Connection, bot_id: Optional[str] = None, limit: int = 50
) -> list[dict]:
    """Recent approvals, newest first, optionally for one teammate.

    Decided ones are included rather than filtered to pending: the panel shows
    only what is still open, but a decision the operator made a minute ago
    disappearing from the record entirely is how "did I approve that?" becomes
    unanswerable.
    """
    sweep_expired(conn)
    if bot_id:
        rows = conn.execute(
            "SELECT * FROM approvals WHERE bot_id = ? ORDER BY id DESC LIMIT ?",
            (bot_id, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM approvals ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [_parse(r) for r in rows]  # type: ignore[misc]


# A bare 👍 in the thread releases the newest pending approval, because that is
# what people actually type. Strip the modifiers a keyboard may attach — skin
# tone (U+1F3FB..U+1F3FF), the emoji/text variation selectors, and ZWJ — and
# what must remain is exactly the one code point. "👍 do it" is a message, not
# a decision, so anything left over disqualifies it.
_THUMB_MODIFIERS = re.compile("[\U0001F3FB-\U0001F3FF︎️‍]")


def is_thumbs_up(text: str) -> bool:
    return _THUMB_MODIFIERS.sub("", text or "").strip() == "👍"
