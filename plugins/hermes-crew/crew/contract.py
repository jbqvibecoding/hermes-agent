"""The wire contract: crew rows → Errand's domain model.

Everything the browser and the desktop app see goes through here. The shapes
are Errand's (`errand/src/domain/types.ts`), because we vendor its React
components and its `useCrewController` state machine — feeding them anything
else would mean rewriting both.

Three deliberate differences from Errand's model, each because our product has
something Runta's does not:

* **`ChipPart`.** Errand's `MessagePart` is text | activity | attachment, which
  cannot hold a report, a held approval, a memory diff, a routine, a handoff, or
  a login request. Rather than flatten those into prose we add a fourth part
  type. `Conversation.tsx` already dispatches on `part.type`, so this is one new
  case in the renderer, not a fork of it.
* **Group threads.** Errand assumes one conversation per agent. A crew thread is
  a `dm:` or a `group:`, and `Conversation.agentId` is empty for a group.
* **Timestamps.** We store epoch milliseconds; Errand's components call
  `Date.parse()` on them (`WorkingActivity` computes elapsed time that way), so
  everything crossing this boundary is ISO-8601.

The message id convention is the load-bearing part. `useCrewController`
reconciles optimistic bubbles against server messages by parsing exactly
`{turn}:user`, `{turn}:agent` and `{turn}:agent:{source}` — see its
`message.created` handler. Our orchestrator mints those ids, so that whole
state machine works unmodified. Break the convention and messages silently
duplicate instead of merging.
"""

from __future__ import annotations

from typing import Optional

from crew import db as crew_db
from crew.db import iso

#: Chip kinds that become a `ChipPart` rather than a plain text part.
_CHIP_KINDS = frozenset(crew_db.MESSAGE_KINDS) - {"text"}

#: Our approval states → Errand's. ``expired`` maps to ``denied`` because
#: Errand's union has three members and nothing left the workspace — but the
#: two are not the same thing, and the card says which in its description, so
#: the teammate reports "nobody decided" rather than "you refused".
_APPROVAL_STATUS = {
    "pending": "pending",
    "approved": "allowed",
    "discarded": "denied",
    "expired": "denied",
}


# ---------------------------------------------------------------------------
# Agents
# ---------------------------------------------------------------------------


def agent(view: dict) -> dict:
    """A roster row as Errand's `Agent`.

    `goal` carries the one-line job as well as `role` because Errand's
    `CommandPalette` shows `role` and its dialogs show `goal`; ours is the same
    sentence either way. `computerId` is the container's task id, which is what
    `getComputer` keys on.
    """
    from crew import computer as crew_computer

    last = view.get("last_message")
    return {
        "id": view["id"],
        "name": view["name"],
        "role": view.get("role") or "",
        "goal": view.get("role") or "",
        "status": view.get("status") or "idle",
        "avatar": view.get("emoji") or "🤖",
        "lastActiveAt": iso((last or {}).get("created_at") or view.get("created_at")),
        "unreadCount": 0,
        "computerId": crew_computer.task_id_for(view["id"]),
        "sectionId": view.get("section_id") or "",
        "lastMessagePreview": preview_text(last) if last else None,
    }


def preview_text(message: Optional[dict]) -> Optional[str]:
    """One line for the sidebar — the *completion state*, not the raw text.

    Ported from OpenGrokBot's `Sidebar.preview()`: a glance down the roster
    should read like a walk past everyone's desk, which means showing what each
    teammate finished rather than the last thing it happened to type.
    """
    if not message:
        return None
    payload = message.get("payload") or {}
    kind = message.get("kind")

    if kind == "report":
        if payload.get("closing"):
            return payload["closing"]
        lines = payload.get("lines") or []
        if lines:
            return f"✓ {lines[0]['system']} → {lines[0]['result']}"
        return "Report filed."
    if kind == "approval_request":
        return f"⏸ Needs you: {payload.get('action') or 'an action'}"
    if kind == "approval_resolved":
        mark = "✓" if payload.get("status") == "approved" else "✕"
        return f"{mark} {payload.get('action') or 'decided'}"
    if kind == "memory_updated":
        return f"🧠 {payload.get('rule') or 'Memory updated'}"
    if kind == "routine_created":
        return f"🕐 {payload.get('name') or 'Routine created'}"
    if kind == "bot_ref":
        return f"↪ from @{payload.get('from_name') or 'a teammate'}"
    if kind == "login_request":
        return f"🔑 Sign in to {payload.get('site') or 'a site'}"
    if kind == "screenshot":
        caption = payload.get("caption")
        return f"📷 {caption}" if caption else "📷 Screenshot"
    return (message.get("content") or "").strip() or None


# ---------------------------------------------------------------------------
# Conversations and messages
# ---------------------------------------------------------------------------


def conversation(view: dict) -> dict:
    """A crew thread as Errand's `Conversation`, plus the fields a room needs.

    `agentId` is empty for a group thread: Errand assumes one conversation per
    agent and has no notion of a room. Rather than pretend a group belongs to
    somebody, the extra `kind` / `members` / `emoji` / `subtitle` ride alongside
    for our own sidebar; Errand's components read only the four they know.

    `updatedAt` falls back to when the thread was *created*, never to now — a
    conversation whose timestamp moved on every poll would sort to the top of
    the sidebar forever without anyone having said anything.
    """
    last = view.get("last_message")
    members = list(view.get("members") or [])
    is_dm = (view.get("kind") or "dm") == "dm"
    return {
        "id": view["id"],
        "agentId": members[0] if (is_dm and members) else "",
        "kind": view.get("kind") or "dm",
        "title": view.get("title") or "",
        "subtitle": view.get("subtitle") or "",
        "emoji": view.get("emoji") or "",
        "members": members,
        "updatedAt": iso((last or {}).get("created_at") or view.get("created_at")),
        "lastMessagePreview": preview_text(last),
    }


def message(row: dict) -> dict:
    """A crew row as an Errand `Message`.

    One row is one message with one part — a report chip is a message whose only
    part is a `ChipPart`. Grouping several rows into one multi-part message
    would read better on paper but would break the tail: the client upserts by
    id, and a chip arriving after its message was already delivered would have
    nowhere to go.
    """
    sender = row.get("sender") or ""
    kind = row.get("kind") or "text"

    # Kind is checked before sender, not after: the decision echo is written
    # with ``sender="user"`` (the operator did decide it), but it is not the
    # operator *typing*, and a `user` role here would make the client try to
    # reconcile it against an optimistic bubble that never existed.
    if kind == "approval_resolved":
        role = "system"
    elif sender == "user":
        role = "user"
    else:
        role = "agent"

    if kind in _CHIP_KINDS:
        parts: list[dict] = [{"type": "chip", "kind": kind, "payload": row.get("payload")}]
    else:
        parts = [{"type": "text", "text": row.get("content") or ""}]

    return {
        "id": row.get("ext_id") or f"row:{row['id']}",
        "rowId": row["id"],
        "conversationId": row["thread_id"],
        "role": role,
        "parts": parts,
        "createdAt": iso(row.get("created_at")),
        "streaming": bool(row.get("streaming")),
        "sender": sender,
    }


# ---------------------------------------------------------------------------
# Approvals
# ---------------------------------------------------------------------------


def approval(row: dict) -> dict:
    """A held action as Errand's `ApprovalRequest`.

    This is the one place where we are filling in a contract Errand shipped a UI
    for and never implemented (`RuntaCloudAgentsClient.listApprovalRequests`
    returns `[]`). Its `DetailPanel` renders `scope[]` as a checklist of what the
    action touches.

    `scope[]` shipped empty here, which was the honest thing to do while nothing
    could fill it: the model volunteered a sentence and there were no real
    arguments to show. Now `crew.hooks` holds the call itself, so the checklist
    carries the recipients, the subject, the amount — the operator is deciding
    about *this* send rather than about the idea of sending mail. That is the
    whole difference between a consent record and a habit of clicking Approve.

    `contentHash` and `ref` are ours rather than Errand's. The client sends the
    hash back with its decision so a card rewritten between render and click is
    refused (:func:`crew.approvals.resolve_approval`), and `ref` is the four
    characters somebody types into the thread instead of opening the panel.
    """
    scope = row.get("scope")
    return {
        "id": str(row["id"]),
        "ref": row.get("ref") or "",
        "agentId": row["bot_id"],
        "conversationId": row["thread_id"],
        "title": row["action"],
        "description": row.get("detail") or "",
        "scope": list(scope) if isinstance(scope, list) else [],
        "source": row.get("source") or row["bot_id"],
        "tool": row.get("tool") or "",
        "contentHash": row.get("content_hash") or "",
        "status": _APPROVAL_STATUS.get(row.get("status") or "pending", "pending"),
        "expired": (row.get("status") or "") == "expired",
        "createdAt": iso(row.get("created_at")),
        "expiresAt": iso(row["expires_at"]) if row.get("expires_at") else None,
        "resolvedAt": iso(row["resolved_at"]) if row.get("resolved_at") else None,
    }


# ---------------------------------------------------------------------------
# Deliverables
# ---------------------------------------------------------------------------


def artifact(row: dict) -> dict:
    """One file a teammate produced, as the file panel renders it.

    ``downloadPath`` rather than a full URL: the client knows its own base (it
    already builds the screenshot URL the same way), and a server-built absolute
    URL would be wrong the moment the dashboard is reached through a tunnel or a
    different host than it thinks it has.
    """
    return {
        "id": str(row.get("id") or row["rel_path"]),
        "agentId": row.get("bot_id") or "",
        "conversationId": row.get("thread_id") or "",
        "path": row["rel_path"],
        "name": row["rel_path"].split("/")[-1],
        "kind": row.get("kind") or "file",
        "size": int(row.get("size") or 0),
        "updatedAt": iso(row.get("mtime")),
        "downloadPath": f"/bots/{row.get('bot_id', '')}/files/{row['rel_path']}",
    }


def artifact_created(row: dict) -> dict:
    return {
        "type": "artifact.created",
        "agentId": row.get("bot_id") or "",
        "threadId": row.get("thread_id") or "",
        "artifact": artifact(row),
    }


def approval_decision(decision: str) -> str:
    """Errand's `allow`/`deny` → our `approve`/`discard`."""
    if decision == "allow":
        return "approve"
    if decision == "deny":
        return "discard"
    raise ValueError("decision must be 'allow' or 'deny'")


# ---------------------------------------------------------------------------
# Model providers
# ---------------------------------------------------------------------------

#: Hermes's api_mode names → the protocol strings Errand's `providerIcon`
#: matches on. The same wire protocols under different spellings, so this is a
#: translation rather than a guess; anything unlisted falls through to the
#: generic "compatible" icon, which is the honest answer for a custom endpoint.
_PROTOCOLS = {
    "anthropic": "anthropic_messages",
    "openai": "openai_chat",
    "openai-codex": "openai_responses",
    "moonshot": "openai_chat",
}


def model_provider(row: dict) -> dict:
    """One row of Hermes's provider inventory as a `ModelProviderOption`."""
    models = [m for m in (row.get("models") or []) if isinstance(m, str)]
    slug = str(row.get("slug") or "")
    return {
        "id": slug,
        "name": str(row.get("name") or slug),
        "protocol": _PROTOCOLS.get(slug, ""),
        "defaultModel": models[0] if models else None,
        "baseUrl": str(row.get("api_url") or ""),
    }


def model_provider_catalog(rows: list[dict]) -> dict:
    """`ModelProviderCatalog`. There is no organization — this is one machine.

    The field stays in the shape because `useCrewController` stores it and the
    settings dialog renders it; an empty string is what "no tenant" looks like.
    """
    return {"organizationId": "", "providers": [model_provider(row) for row in rows]}


# ---------------------------------------------------------------------------
# Events
# ---------------------------------------------------------------------------


def message_created(row: dict) -> dict:
    return {"type": "message.created", "threadId": row["thread_id"], "message": message(row)}


def message_updated(row: dict) -> dict:
    return {"type": "message.updated", "threadId": row["thread_id"], "message": message(row)}


def activity(event: dict) -> dict:
    """One tool call as Errand's `ActivityEvent`, minus the tail cursor.

    `crew.activity` already emits this shape; the only thing to remove is the
    `seq` it carries so the event tail can advance without a second query.
    """
    return {key: value for key, value in event.items() if key != "seq"}


def activity_updated(event: dict) -> dict:
    return {
        "type": "activity.updated",
        "threadId": event["conversationId"],
        "activity": activity(event),
    }


def approval_updated(row: dict) -> dict:
    """A held action's state, pending or decided.

    Note for the port: Errand's `useCrewController` handles this event with a
    `map` over the approvals it already has, so a *newly created* approval does
    not appear in its detail panel until the 60s snapshot revalidates. We emit
    the pending one anyway — the fix is a one-line upsert in the vendored
    controller (Phase B), and the chip in the thread carries the approval
    regardless, which is our primary surface for it.
    """
    return {
        "type": "approval.updated",
        "threadId": row["thread_id"],
        "approval": approval(row),
    }


def status_changed(bot_id: str, state: str) -> dict:
    """Not one of Errand's seven — the roster needs it and Errand polls instead.

    Polling a roster every 30s to find out somebody started working is the kind
    of thing a local backend has no excuse for.
    """
    return {"type": "agent.status", "agentId": bot_id, "status": state}
