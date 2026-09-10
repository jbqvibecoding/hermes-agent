"""Do the three token budgets a run is configured with fit together?

Ported from ApodexAI's FrontierAgent (Apache-2.0) —
``frontier_agent/core/runtime/loop/budget_consistency.py``. Their framing is
the part worth keeping:

    A violation is not visibly a misconfiguration. It surfaces as a provider
    rejection mid-run, or as a [guard] that cannot reliably pre-empt the
    provider's output cap. Both read as a runtime fault.

What this checks in Hermes
--------------------------
Hermes derives its compaction trigger rather than taking it as a knob, and
``ContextCompressor._compute_threshold_tokens`` already subtracts ``max_tokens``
from the window to get the usable input budget. So the arithmetic is right —
what is missing is anyone saying so when the *inputs* to that arithmetic are
impossible.

Specifically, ``_compute_threshold_tokens`` contains::

    effective_window = context_length - (max_tokens or 0)
    if effective_window <= 0:
        effective_window = context_length

That fallback keeps the compressor working, which is correct for the
compressor — but it means a ``max_tokens`` at or above the whole context window
produces no error anywhere. Every request then reserves more output room than
the window holds, and the provider rejects them all. The user sees API errors,
not a configuration problem.

Warnings only, never an exception
---------------------------------
A deploy running today with an unusual combination must keep running. Returning
the strings (rather than only logging them) is deliberate: a caller — or a test
— can assert on them instead of scraping the log.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

__all__ = ["check_token_budget"]


def check_token_budget(
    *,
    context_length: int,
    max_tokens: int | None,
    threshold_tokens: int | None = None,
    label: str = "model",
) -> list[str]:
    """Return warnings for token budgets that cannot all hold at once.

    ``context_length``  — the window the endpoint actually serves.
    ``max_tokens``      — output reservation per request; ``None`` means the
                          provider default, which we cannot reason about, so
                          nothing is checked.
    ``threshold_tokens``— the compaction trigger, when known. Used only for the
                          informational margin line.

    Anything unset or non-positive is skipped: a missing bound is a deliberate
    configuration, not an inconsistency.
    """
    problems: list[str] = []

    try:
        window = int(context_length or 0)
    except (TypeError, ValueError):
        return problems
    if window <= 0 or max_tokens is None:
        return problems
    try:
        output = int(max_tokens)
    except (TypeError, ValueError):
        return problems
    if output <= 0:
        return problems

    if output >= window:
        # The reservation alone fills the window. ContextCompressor falls back
        # to the raw window so it keeps working, which hides this completely —
        # but every request still asks the provider for more output room than
        # the window holds.
        problems.append(
            f"{label}: max_tokens ({output:,}) is not below the context window "
            f"({window:,}); every request reserves more output room than the "
            f"window holds and the provider will reject it. Lower "
            f"model.max_tokens, or raise model.context_length if the window is "
            f"really larger than Hermes detected."
        )
    elif output * 2 >= window:
        # Not fatal, but the usable input budget is now the smaller half, and
        # the compaction threshold is computed from that — so the session
        # compacts far sooner than the window size suggests it should.
        problems.append(
            f"{label}: max_tokens ({output:,}) reserves more than half of the "
            f"{window:,}-token window, leaving {window - output:,} tokens for "
            f"input. Compaction is computed from the input budget, so the "
            f"session will compact much sooner than the window size suggests."
        )

    if threshold_tokens:
        try:
            trigger = int(threshold_tokens)
        except (TypeError, ValueError):
            trigger = 0
        margin = window - trigger
        if trigger > 0 and margin > 0:
            # INFORMATIONAL, deliberately not a threshold: whether a turn
            # actually crosses this is dynamic (the reply plus its tool results
            # plus whatever reasoning was replayed into history), and no static
            # rule separates a safe configuration from an unsafe one. It is
            # logged because reconstructing it by hand is what the diagnosis
            # costs otherwise.
            logger.info(
                "%s: compaction trigger %s leaves %s tokens before the %s "
                "window; one full-length reply (max_tokens %s) is %.0f%% of "
                "that margin",
                label,
                f"{trigger:,}",
                f"{margin:,}",
                f"{window:,}",
                f"{output:,}",
                100.0 * output / margin,
            )

    for problem in problems:
        logger.warning("%s", problem)
    return problems
