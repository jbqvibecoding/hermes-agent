"""Tool result persistence -- preserves large outputs instead of truncating.

Defense against context-window overflow operates at three levels:

1. **Per-tool output cap** (inside each tool): Tools like search_files
   pre-truncate their own output before returning. This is the first line
   of defense and the only one the tool author controls.

2. **Per-result persistence** (maybe_persist_tool_result): After a tool
   returns, if its output exceeds the tool's registered threshold
   (registry.get_max_result_size), the full output is written INTO THE
   SANDBOX temp dir (for example /tmp/hermes-results/{tool_use_id}.txt on
   standard Linux, or $TMPDIR/hermes-results/{tool_use_id}.txt on Termux)
   via env.execute(). The in-context content is replaced with a preview +
   file path reference. The model can read_file to access the full output
   on any backend.

3. **Per-turn aggregate budget** (enforce_turn_budget): After all tool
   results in a single assistant turn are collected, if the total exceeds
   MAX_TURN_BUDGET_CHARS (200K), the largest non-persisted results are
   spilled to disk until the aggregate is under budget. This catches cases
   where many medium-sized results combine to overflow context.
"""

import hashlib
import logging
import os
import re
import shlex
import uuid

from tools.budget_config import (
    DEFAULT_PREVIEW_SIZE_CHARS,
    BudgetConfig,
    DEFAULT_BUDGET,
)

logger = logging.getLogger(__name__)
PERSISTED_OUTPUT_TAG = "<persisted-output>"
PERSISTED_OUTPUT_CLOSING_TAG = "</persisted-output>"
STORAGE_DIR = "/tmp/hermes-results"
HEREDOC_MARKER = "HERMES_PERSIST_EOF"
_BUDGET_TOOL_NAME = "__budget_enforcement__"
_UNSAFE_RESULT_FILENAME_CHARS = re.compile(r"[^A-Za-z0-9_.-]+")
_MAX_RESULT_FILENAME_STEM = 120

# Extra chars granted on top of ``preview_size`` to pay for the notice itself
# (tags, size line, saved path, read_file instruction).  Keeping this explicit
# means ``preview_size`` still means "how much of the output you get to see",
# while the *replacement* has a real ceiling — which is what the aggregate
# turn budget is actually counting.
_NOTICE_ALLOWANCE_CHARS = 400


def _resolve_storage_dir(env) -> str:
    """Return the best temp-backed storage dir for this environment."""
    if env is not None:
        get_temp_dir = getattr(env, "get_temp_dir", None)
        if callable(get_temp_dir):
            try:
                temp_dir = get_temp_dir()
            except Exception as exc:
                logger.debug("Could not resolve env temp dir: %s", exc)
            else:
                if temp_dir:
                    temp_dir = temp_dir.rstrip("/") or "/"
                    return f"{temp_dir}/hermes-results"
    return STORAGE_DIR


def _safe_result_filename(tool_use_id: str) -> str:
    """Return a single safe filename for a tool result id."""
    raw_id = str(tool_use_id or "tool_result")
    safe_stem = _UNSAFE_RESULT_FILENAME_CHARS.sub("_", raw_id).strip("._-")
    changed = safe_stem != raw_id

    if not safe_stem:
        safe_stem = "tool_result"
        changed = True

    if changed or len(safe_stem) > _MAX_RESULT_FILENAME_STEM:
        digest = hashlib.sha256(raw_id.encode("utf-8")).hexdigest()[:12]
        safe_stem = safe_stem[:_MAX_RESULT_FILENAME_STEM].rstrip("._-") or "tool_result"
        safe_stem = f"{safe_stem}_{digest}"

    return f"{safe_stem}.txt"


def generate_preview(content: str, max_chars: int = DEFAULT_PREVIEW_SIZE_CHARS) -> tuple[str, bool]:
    """Truncate at last newline within max_chars. Returns (preview, has_more)."""
    if len(content) <= max_chars:
        return content, False
    truncated = content[:max_chars]
    last_nl = truncated.rfind("\n")
    if last_nl > max_chars // 2:
        truncated = truncated[:last_nl + 1]
    return truncated, True


def _heredoc_marker(content: str) -> str:
    """Return a heredoc delimiter that doesn't collide with content."""
    if HEREDOC_MARKER not in content:
        return HEREDOC_MARKER
    return f"HERMES_PERSIST_{uuid.uuid4().hex[:8]}"


def _write_to_sandbox(content: str, remote_path: str, env) -> bool:
    """Write content into the sandbox via env.execute(). Returns True on success.

    Pushes ``content`` through stdin rather than embedding it in the command
    string. Linux's ``MAX_ARG_STRLEN`` caps any single argv element at 128 KB
    (32 * PAGE_SIZE), so the previous heredoc-in-the-command-string approach
    silently failed with ``OSError: [Errno 7] Argument list too long`` for any
    tool result over ~128 KB — exactly the case persistence exists to handle.
    Routing through stdin removes that ceiling on local + ssh (``_stdin_mode
    == "pipe"``); remote backends with ``_stdin_mode == "heredoc"`` keep their
    existing API-body sized limit, which is orders of magnitude larger than
    the exec-arg ceiling.
    """
    storage_dir = os.path.dirname(remote_path)
    cmd = f"mkdir -p {shlex.quote(storage_dir)} && cat > {shlex.quote(remote_path)}"
    result = env.execute(cmd, timeout=30, stdin_data=content)
    return result.get("returncode", 1) == 0


def _format_size(original_size: int) -> str:
    size_kb = original_size / 1024
    if size_kb >= 1024:
        return f"{size_kb / 1024:.1f} MB"
    return f"{size_kb:.1f} KB"


def _build_persisted_message(
    preview: str,
    has_more: bool,
    original_size: int,
    file_path: str,
    tail: str = "",
) -> str:
    """Build the <persisted-output> replacement block.

    ``tail`` is the optional end-of-output excerpt.  Head-only previews lose
    exactly the part that usually matters most on a long result — a build log's
    failure, a test run's summary line, a command's exit status all live at the
    end.  ``tools/hook_output_spill.py`` already shows head *and* tail for
    hook-injected context; tool results are the far more common case and had
    only the head.
    """
    size_str = _format_size(original_size)

    msg = f"{PERSISTED_OUTPUT_TAG}\n"
    msg += f"This tool result was too large ({original_size:,} characters, {size_str}).\n"
    msg += f"Full output saved to: {file_path}\n"
    msg += "Use the read_file tool with offset and limit to access specific sections of this output.\n\n"
    msg += f"Preview (first {len(preview)} chars):\n"
    msg += preview
    if has_more:
        msg += "\n..."
    if tail:
        msg += f"\n\nLast {len(tail)} chars:\n{tail}"
    msg += f"\n{PERSISTED_OUTPUT_CLOSING_TAG}"
    return msg


def _split_preview_budget(content: str, budget: int) -> tuple[str, bool, str]:
    """Split ``budget`` chars of ``content`` into a head and a tail excerpt.

    Ported from DeepSeek Harness's ``TextRetainer``
    (``packages/util/output-retention``, MIT).  Two properties are worth having:

    * the head and tail come out of **one** budget rather than each getting a
      full one, so the excerpt size is what the caller asked for; and
    * the split point is snapped to a line boundary where one is nearby, so the
      excerpt does not start or end mid-token.

    Returns ``(head, has_more, tail)``.  ``tail`` is empty when the whole
    content fits, or when the budget is too small to spend on both ends.
    """
    if budget <= 0 or not content:
        return "", False, ""
    if len(content) <= budget:
        return content, False, ""

    head_budget = budget // 2
    tail_budget = budget - head_budget

    # Too small to be worth splitting — a two-line excerpt of a huge log tells
    # the reader nothing that the size notice did not already say.
    if tail_budget < 80:
        head, has_more = generate_preview(content, max_chars=budget)
        return head, has_more, ""

    head, _ = generate_preview(content, max_chars=head_budget)

    tail = content[-tail_budget:]
    first_nl = tail.find("\n")
    # Snap to the next line start when that costs less than half the tail, so
    # the excerpt begins at a real line rather than mid-word.
    if 0 <= first_nl < tail_budget // 2:
        tail = tail[first_nl + 1 :]

    return head, True, tail


def build_bounded_replacement(
    content: str,
    original_size: int,
    file_path: str | None,
    budget: int,
) -> str:
    """Compose a replacement for ``content`` that provably fits in ``budget``.

    The discipline this exists for (dsh's ``TextRetainer``): **charge the notice
    to the budget before splitting what is left**, rather than laying a preview
    of ``budget`` chars on top of a notice of unknown size.

    Hermes did the latter, and it had a measurable consequence.
    ``enforce_turn_budget`` re-persists results with ``threshold=0``, so a
    result smaller than the notice overhead came back *larger* than it went in
    — a turn already over budget got pushed further over.  (300 chars in, 386
    chars out, verified before this change.)

    Two guarantees hold on the way out:

    1. the result is at most ``budget`` chars, unless the notice alone is
       longer than the budget — in which case the notice wins, because a
       pointer to the saved file is the one thing that must survive; and
    2. if the composed replacement is not actually smaller than ``content``,
       ``content`` is returned unchanged.  Replacing text with something longer
       is never an improvement, and a caller that asked us to save space should
       not silently be handed more of it.
    """
    def _compose(excerpt_budget: int) -> str:
        head, has_more, tail = _split_preview_budget(content, max(0, excerpt_budget))
        if file_path:
            return _build_persisted_message(
                head, has_more, original_size, file_path, tail=tail
            )
        parts = [
            f"[Truncated: tool response was {original_size:,} chars. "
            f"Full output could not be saved to sandbox.]"
        ]
        if head:
            parts.append(head)
        if tail:
            parts.append("...")
            parts.append(tail)
        return "\n".join(parts)

    # The notice's own length is not a constant: it embeds the excerpt lengths
    # ("Preview (first 1,234 chars)", "Last 567 chars"), so subtracting a fixed
    # estimate up front either wastes budget or overshoots it.  Instead fit by
    # measurement — compose, and if the whole thing is over, give back exactly
    # the overflow and compose again.  Each round strictly shrinks the excerpt,
    # so this converges; three rounds is far more than it needs in practice.
    excerpt_budget = budget - len(_compose(0))
    replacement = _compose(excerpt_budget)
    for _ in range(3):
        overflow = len(replacement) - budget
        if overflow <= 0:
            break
        excerpt_budget -= overflow
        if excerpt_budget <= 0:
            # Nothing left to spend on the output itself: the notice alone is
            # the whole message.  It still carries the saved path, which is the
            # one thing that must survive an absurdly small budget.
            replacement = _compose(0)
            break
        replacement = _compose(excerpt_budget)

    # Guarantee 2. Never hand back something longer than what we replaced.
    if len(replacement) >= len(content):
        return content
    return replacement


def maybe_persist_tool_result(
    content: str,
    tool_name: str,
    tool_use_id: str,
    env=None,
    config: BudgetConfig = DEFAULT_BUDGET,
    threshold: int | float | None = None,
) -> str:
    """Layer 2: persist oversized result into the sandbox, return preview + path.

    Writes via env.execute() so the file is accessible from any backend
    (local, Docker, SSH, Modal, Daytona). Falls back to inline truncation
    if write fails or no env is available.

    Args:
        content: Raw tool result string.
        tool_name: Name of the tool (used for threshold lookup).
        tool_use_id: Unique ID for this tool call (used as filename).
        env: The active BaseEnvironment instance, or None.
        config: BudgetConfig controlling thresholds and preview size.
        threshold: Explicit override; takes precedence over config resolution.

    Returns:
        Original content if small, or <persisted-output> replacement.
    """
    effective_threshold = threshold if threshold is not None else config.resolve_threshold(tool_name)

    if effective_threshold == float("inf"):
        return content

    if len(content) <= effective_threshold:
        return content

    storage_dir = _resolve_storage_dir(env)
    remote_path = f"{storage_dir}/{_safe_result_filename(tool_use_id)}"

    # The replacement's total size — notice included — is what has to fit, so
    # that is what we budget.  See build_bounded_replacement for why laying a
    # preview of preview_size on top of a notice of unknown size was wrong.
    budget = config.preview_size + _NOTICE_ALLOWANCE_CHARS

    if env is not None:
        try:
            if _write_to_sandbox(content, remote_path, env):
                logger.info(
                    "Persisted large tool result: %s (%s, %d chars -> %s)",
                    tool_name, tool_use_id, len(content), remote_path,
                )
                return build_bounded_replacement(
                    content, len(content), remote_path, budget
                )
        except Exception as exc:
            logger.warning("Sandbox write failed for %s: %s", tool_use_id, exc)

    logger.info(
        "Inline-truncating large tool result: %s (%d chars, no sandbox write)",
        tool_name, len(content),
    )
    return build_bounded_replacement(content, len(content), None, budget)


def enforce_turn_budget(
    tool_messages: list[dict],
    env=None,
    config: BudgetConfig = DEFAULT_BUDGET,
) -> list[dict]:
    """Layer 3: enforce aggregate budget across all tool results in a turn.

    If total chars exceed budget, persist the largest non-persisted results
    first (via sandbox write) until under budget. Already-persisted results
    are skipped.

    Mutates the list in-place and returns it.
    """
    candidates = []
    total_size = 0
    for i, msg in enumerate(tool_messages):
        content = msg.get("content", "")
        size = len(content)
        total_size += size
        if PERSISTED_OUTPUT_TAG not in content:
            candidates.append((i, size))

    if total_size <= config.turn_budget:
        return tool_messages

    candidates.sort(key=lambda x: x[1], reverse=True)

    for idx, size in candidates:
        if total_size <= config.turn_budget:
            break
        msg = tool_messages[idx]
        content = msg["content"]
        tool_use_id = msg.get("tool_call_id", f"budget_{idx}")

        replacement = maybe_persist_tool_result(
            content=content,
            tool_name=_BUDGET_TOOL_NAME,
            tool_use_id=tool_use_id,
            env=env,
            config=config,
            threshold=0,
        )
        if replacement != content:
            total_size -= size
            total_size += len(replacement)
            tool_messages[idx]["content"] = replacement
            logger.info(
                "Budget enforcement: persisted tool result %s (%d chars)",
                tool_use_id, size,
            )

    return tool_messages
