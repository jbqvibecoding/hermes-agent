"""Type a person-supplied secret into a browser field, and nowhere else.

This is the ``filler`` that ``tools/browser_secret.py`` takes as a parameter.
It is a separate module for a reason: ``browser_secret`` must stay free of any
browser import so it has no way to stash the value on the way to a page it also
owns. All the browser knowledge lives here, and it is deliberately thin.

Why this does not call ``browser_type``
---------------------------------------
``browser_type`` is the model-facing tool, and its result goes into the
transcript. It scrubs the typed text with
``agent.display.redact_browser_typed_text_for_display``, but that helper is
*redact-if-it-looks-like-a-secret*::

    redacted = redact_sensitive_text(needle, force=True)
    if redacted == needle:
        return value      # nothing secret-looking: returned verbatim

A password a person chose usually matches no API-key or JWT pattern, so it would
come back **verbatim** in the ``"typed"`` field → tool result → transcript →
session database. Redaction is a filter over something you already decided to
keep; the stronger property is never putting it there. So this module drives the
backend directly and constructs nothing that contains the value.

Why this bypasses the takeover gate, deliberately
-------------------------------------------------
``browser_control``'s gate refuses *agent* actions while a person is driving,
and it fails closed. Filling a secret is a **person's** action — they typed it —
so routing it through the agent gate would let the feature refuse its own user.

The two flows are alternatives, not stages:

* **takeover** — the person drives, logs in themselves, hands back;
* **scoped secret** — the agent keeps driving, the person passes one value in.

⚠️ Known weakness on the agent-browser path
--------------------------------------------
``_run_browser_command`` assembles an argv list and hands it to
``subprocess.Popen`` (``tools/browser_tool.py`` ~:2380-2464), so on that backend
**the secret is a command-line argument** — readable in ``ps`` and
``/proc/<pid>/cmdline`` by any process running as the same user, for the
duration of the call. This is a property of the ``agent-browser`` CLI's
interface, not something Hermes can fix from this side.

The Camofox backend sends it in an HTTP request body and does not have this
problem. **Prefer Camofox when the secret matters.** This is stated again in
the user documentation rather than left in a source comment.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


class SecretFillUnavailable(RuntimeError):
    """No browser backend is in a state to accept the value."""


def _fill_via_camofox(task_id: str, ref: str, value: str) -> None:
    """POST the value straight to Camofox.

    Note the ref normalisation: Camofox wants it **without** the ``@``, which is
    the opposite of the agent-browser path below. Getting these backwards is a
    silent mis-target, so both are asserted in the tests.
    """
    from tools.browser_camofox import _get_session, _post

    session = _get_session(task_id)
    tab_id = session.get("tab_id")
    if not tab_id:
        raise SecretFillUnavailable(
            "no Camofox tab is open — navigate somewhere before asking for a secret"
        )
    _post(
        f"/tabs/{tab_id}/type",
        {"userId": session["user_id"], "ref": str(ref).lstrip("@"), "text": value},
    )


def _fill_via_agent_browser(task_id: str, ref: str, value: str) -> None:
    """Drive the agent-browser CLI's ``fill`` verb.

    See the module docstring: on this backend the value is visible in the
    process's argv for the duration of the call.
    """
    from tools.browser_tool import _last_session_key, _run_browser_command

    normalised = str(ref)
    if not normalised.startswith("@"):
        normalised = f"@{normalised}"

    result = _run_browser_command(
        _last_session_key(task_id or "default"), "fill", [normalised, value]
    )
    if not isinstance(result, dict) or not result.get("success"):
        # Deliberately does NOT include result["error"] — on a failed fill the
        # backend's stderr can echo what it was given, and that string is also
        # logged at WARNING by _run_browser_command. Carrying it further would
        # be a second copy of the value in a second place.
        raise SecretFillUnavailable("the browser backend rejected the fill")


def fill_secret(task_id: str, ref: str, value: str) -> None:
    """Type ``value`` into ``ref``. Returns nothing; raises on failure.

    Returning nothing is part of the contract: there is no result object for a
    caller to accidentally log. ``browser_secret.supply_secret`` converts any
    exception raised here into a message carrying only the exception *type*.
    """
    if _camofox_active():
        _fill_via_camofox(task_id, ref, value)
    else:
        _fill_via_agent_browser(task_id, ref, value)


def _camofox_active() -> bool:
    try:
        from tools.browser_tool import _is_camofox_mode

        return bool(_is_camofox_mode())
    except Exception:  # noqa: BLE001
        logger.debug("could not determine browser backend; assuming agent-browser")
        return False


def backend_name() -> str:
    """Which backend a fill would use — for warning the person before they type."""
    return "camofox" if _camofox_active() else "agent-browser"


def secret_exposure_warning() -> str:
    """A one-line caution to show the person, or "" when there is nothing to say.

    Only the agent-browser path has the argv problem, so only that path warns.
    Warning on every backend would train people to ignore it.
    """
    if _camofox_active():
        return ""
    return (
        "Note: on the agent-browser backend the value is passed to the browser "
        "process as a command-line argument, so it is briefly visible to other "
        "processes running as you. Camofox does not have this weakness."
    )


__all__ = [
    "SecretFillUnavailable",
    "backend_name",
    "fill_secret",
    "secret_exposure_warning",
]
