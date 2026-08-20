"""Shared vocabulary for browser commands, used by the gates in front of them.

Hermes drives a browser through **three independent paths** and they do not
share a dispatcher:

* the ``agent-browser`` CLI — ``tools/browser_tool.py::_run_browser_command``;
* Camofox — ``tools/browser_camofox.py::_post``, reached by 17 short-circuits
  in ``browser_tool.py`` that return *before* ``_run_browser_command``;
* raw CDP — ``tools/browser_cdp_tool.py::browser_cdp``.

Any guard that covers only one of them is decoration: the other two remain open.
So the classification lives here, once, and every gate imports it rather than
each path growing its own idea of what counts as "acting".

The vocabulary is the CLI verb (``click``, ``fill``, ``open``, …) because that
is the one name all three paths can be expressed in. Camofox and CDP callers
translate their own operation into a verb before asking.

Ported from CopilotKit's OpenBot (MIT) — the *idea* that the gate needs a
resolved notion of intent rather than a free-form label comes from
``server/src/computer/gateway.ts``, whose comment is worth keeping in mind:

    A gateway that decides on a label supplied by the model is theatre.

Here that means: the verb is supplied by the *call site*, never by the model.
"""

from __future__ import annotations

from typing import FrozenSet

# Commands that only observe. Safe to run while a human is driving, and they
# never invalidate an element reference.
READ_COMMANDS: FrozenSet[str] = frozenset({
    "snapshot",
    "console",
    "errors",
    "screenshot",
    "read",
    "get_images",
    "vision",
})

# Commands that change the page, the session, or the machine's state.
ACTING_COMMANDS: FrozenSet[str] = frozenset({
    "click",
    "fill",
    "type",
    "press",
    "key",
    "scroll",
    "open",
    "navigate",
    "back",
    "forward",
    "reload",
    "eval",
    "close",
    "select",
    "upload",
})

# Commands that hand the caller a *new* view of the page, so any element
# reference from before is superseded.
VIEW_ISSUING_COMMANDS: FrozenSet[str] = frozenset({"snapshot"})

# Commands that move the page somewhere else, so every existing element
# reference is void whether or not a new snapshot has been taken yet.
NAVIGATING_COMMANDS: FrozenSet[str] = frozenset({
    "open",
    "navigate",
    "back",
    "forward",
    "reload",
})

# Commands that name an element from a snapshot. Only these can be stale.
REF_CONSUMING_COMMANDS: FrozenSet[str] = frozenset({
    "click",
    "fill",
    "type",
    "select",
    "upload",
})


def normalize(command: str) -> str:
    """Lower-case and strip a command verb.

    Callers pass literals, but a stray ``"Click"`` or ``" click "`` from a
    config file or a translation layer should not silently fall through the
    classification into "unknown", which is treated as acting.
    """
    return str(command or "").strip().lower()


def is_read(command: str) -> bool:
    """True for a command that only observes."""
    return normalize(command) in READ_COMMANDS


def is_acting(command: str) -> bool:
    """True for a command that changes something.

    **Unknown commands count as acting.** A verb nobody has classified is more
    likely a new way to change the page than a new way to look at it, and the
    cost of the two mistakes is not symmetric: wrongly treating a read as an
    action costs a refusal the caller can retry, while wrongly treating an
    action as a read lets it past the gate.
    """
    return not is_read(command)


def issues_new_view(command: str) -> bool:
    """True when the command hands back a fresh view of the page."""
    return normalize(command) in VIEW_ISSUING_COMMANDS


def navigates(command: str) -> bool:
    """True when the command moves the page, voiding existing references."""
    return normalize(command) in NAVIGATING_COMMANDS


def consumes_ref(command: str) -> bool:
    """True when the command names an element from a snapshot."""
    return normalize(command) in REF_CONSUMING_COMMANDS


__all__ = [
    "ACTING_COMMANDS",
    "NAVIGATING_COMMANDS",
    "READ_COMMANDS",
    "REF_CONSUMING_COMMANDS",
    "VIEW_ISSUING_COMMANDS",
    "consumes_ref",
    "is_acting",
    "is_read",
    "issues_new_view",
    "navigates",
    "normalize",
]
