"""Recover an answer from a subagent that ended without writing one.

Ported from ApodexAI's FrontierAgent (Apache-2.0) —
``workflows/agent_team/subagent_runtime.py::force_final_answer`` and
``frontier_agent/components/finalization/recovery.py``.

Where this sits
---------------
F1 (``agent/finalization_reserve.py``) is prevention: hold back an iteration so
the child can write its own conclusion. This is the paramedic that arrives when
prevention did not work — the child was interrupted, crashed, refused, or hit a
wall the grace call could not reach.

``delegate_tool`` already knows how the run ended (D1's ``stop_reason``) and
already keeps whatever text the child produced (``partial_output``). What it
could not do was turn a transcript full of real work into a sentence, so a child
that gathered plenty and never summarised it came back as
``status="failed"`` with nothing.

Three rungs, cheapest last
--------------------------
1. **model** — one tool-free LLM call over the child's own transcript.
2. **partial** — the text the child had already produced (D1's partial output).
3. **minimal** — a mechanical account of what the child *did*, built from the
   tool trace. No LLM, cannot fail, and still beats a blank.

Which rung produced the text is recorded on the result. FrontierAgent stamps
``metadata["final_answer_rescue_mode"]`` for the same reason, and it is the same
discipline D1 already follows in keeping the child's words apart from the
system's: text the model wrote under rescue and a sentence Hermes assembled are
not the same kind of thing, and a reader has to be able to tell.

Cost
----
Only reached when the selected output is empty *and* the run did not complete
normally, so a healthy delegation pays nothing. At most one rescue per
delegation — no recursion, no retry.
"""

from __future__ import annotations

import logging
from typing import Any, Callable, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

__all__ = [
    "MODE_MINIMAL",
    "MODE_MODEL",
    "MODE_NONE",
    "MODE_PARTIAL",
    "build_recovery_messages",
    "minimal_best_effort",
    "rescue",
]

MODE_MODEL = "model"
MODE_PARTIAL = "partial"
MODE_MINIMAL = "minimal"
MODE_NONE = "none"

# The transcript is replayed as one flattened user message rather than as its
# original roles: the original shape contains assistant turns with tool_calls
# whose tool results may have been dropped, and a provider will reject that.
# Flattening sidesteps the whole class of protocol damage — which is the point
# of FrontierAgent's "protocol-clean finalization request from a damaged
# history".
_MAX_TRANSCRIPT_CHARS = 60_000
_MAX_ITEM_CHARS = 4_000
_TRUNCATION_MARKER = "\n[... earlier context omitted ...]\n"

_RECOVERY_INSTRUCTION = (
    "The run above ended before a final answer was written. Read the work that "
    "was actually done and state the outcome now, in plain text.\n\n"
    "Report only what the transcript supports. Do not invent results, do not "
    "claim anything was verified unless the transcript shows it, and do not "
    "propose next steps as though they were done. If the work is incomplete, "
    "say what was established and what was not."
)


def _text_of(content: Any) -> str:
    """Flatten a message's content to text, dropping non-text blocks."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(str(block.get("text") or ""))
        return "\n".join(parts)
    return ""


def _clip(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    head = limit // 2
    tail = limit - head - len(_TRUNCATION_MARKER)
    if tail <= 0:
        return text[:limit]
    return text[:head] + _TRUNCATION_MARKER + text[-tail:]


def build_recovery_messages(
    messages: Any,
    *,
    goal: str = "",
    max_chars: int = _MAX_TRANSCRIPT_CHARS,
) -> List[Dict[str, str]]:
    """Render the child's transcript into one protocol-clean request.

    Budget notices injected by F1 are stripped: they are Hermes describing the
    run's remaining budget, and replaying them here would have them compete with
    the recovery instruction — the exact reason FrontierAgent keeps a list of
    its own framework nudges to filter out.
    """
    try:
        from agent.prompt_builder import strip_budget_notices
    except Exception:  # noqa: BLE001

        def strip_budget_notices(text: str) -> str:  # type: ignore[misc]
            return text

    lines: List[str] = []
    if isinstance(messages, list):
        for msg in messages:
            if not isinstance(msg, dict):
                continue
            role = msg.get("role")
            if role == "system":
                continue  # the child's system prompt is not evidence of work
            body = strip_budget_notices(_text_of(msg.get("content")))
            if role == "assistant":
                calls = msg.get("tool_calls") or []
                names = [
                    (c.get("function") or {}).get("name", "?")
                    for c in calls
                    if isinstance(c, dict)
                ]
                if names:
                    body = (body + "\n" if body else "") + (
                        "[called: " + ", ".join(names) + "]"
                    )
                label = "AGENT"
            elif role == "tool":
                label = "TOOL RESULT"
            elif role == "user":
                label = "TASK"
            else:
                label = str(role or "?").upper()
            if not body.strip():
                continue
            lines.append(f"[{label}] {_clip(body, _MAX_ITEM_CHARS)}")

    transcript = _clip("\n\n".join(lines), max_chars)

    header = "Here is the record of a task run.\n\n"
    if goal:
        header += f"The task was:\n{_clip(str(goal), _MAX_ITEM_CHARS)}\n\n"

    return [
        {
            "role": "user",
            "content": f"{header}{transcript}\n\n---\n\n{_RECOVERY_INSTRUCTION}",
        }
    ]


def minimal_best_effort(messages: Any, *, goal: str = "") -> str:
    """Assemble a factual account of the run without an LLM.

    The last rung. It states only what is mechanically knowable — which tools
    ran, and the last thing the child said — and it labels itself as assembled
    by Hermes, because it is not the child's report and must not read like one.
    """
    tools_used: List[str] = []
    last_text = ""
    if isinstance(messages, list):
        for msg in messages:
            if not isinstance(msg, dict):
                continue
            if msg.get("role") == "assistant":
                text = _text_of(msg.get("content")).strip()
                if text:
                    last_text = text
                for call in msg.get("tool_calls") or []:
                    if isinstance(call, dict):
                        name = (call.get("function") or {}).get("name")
                        if name and name not in tools_used:
                            tools_used.append(name)

    parts = ["The subagent stopped before writing a conclusion."]
    if goal:
        parts.append(f"Its task was: {_clip(str(goal), 400)}")
    if tools_used:
        shown = ", ".join(tools_used[:12])
        more = f" (+{len(tools_used) - 12} more)" if len(tools_used) > 12 else ""
        parts.append(f"It used: {shown}{more}.")
    else:
        parts.append("It ran no tools.")
    if last_text:
        parts.append(f"The last thing it said was: {_clip(last_text, 800)}")
    parts.append(
        "This account was assembled by Hermes from the run record, not written "
        "by the subagent."
    )
    return " ".join(parts)


def rescue(
    messages: Any,
    *,
    goal: str = "",
    partial: str = "",
    caller: Optional[Callable[[List[Dict[str, str]]], str]] = None,
) -> Tuple[str, str]:
    """Return ``(text, mode)`` — the best answer available, and where it came from.

    ``caller`` runs the tool-free LLM call and returns its text. Injected rather
    than imported so this module stays testable without a network, and so a
    caller that cannot afford the call can pass ``None`` and still get the two
    free rungs.

    Never raises. A rescue that fails must not turn a merely-empty delegation
    into a broken one — D1 already established that delegation never throws to
    the parent.
    """
    if caller is not None:
        try:
            text = caller(build_recovery_messages(messages, goal=goal))
            if isinstance(text, str) and text.strip():
                return text.strip(), MODE_MODEL
            logger.debug("subagent rescue: model returned nothing")
        except Exception as exc:  # noqa: BLE001 — fall through to a free rung
            logger.debug("subagent rescue call failed: %s", type(exc).__name__)

    if isinstance(partial, str) and partial.strip():
        return partial.strip(), MODE_PARTIAL

    text = minimal_best_effort(messages, goal=goal)
    return (text, MODE_MINIMAL) if text.strip() else ("", MODE_NONE)
