"""Interactive prompt callbacks for terminal_tool integration.

These bridge terminal_tool's interactive prompts (clarify, sudo, approval)
into prompt_toolkit's event loop. Each function takes the HermesCLI instance
as its first argument and uses its state (queues, app reference) to coordinate
with the TUI.
"""

import queue
import time as _time

from hermes_cli.banner import cprint, _DIM, _RST
from hermes_cli.config import save_env_value_secure
from hermes_cli.secret_prompt import masked_secret_prompt
from hermes_constants import display_hermes_home


def clarify_callback(cli, question, choices):
    """Prompt for clarifying question through the TUI.

    Sets up the interactive selection UI, then blocks until the user
    responds. Returns the user's choice or a timeout message.
    """
    from cli import CLI_CONFIG

    timeout = CLI_CONFIG.get("clarify", {}).get("timeout", 120)
    response_queue = queue.Queue()
    is_open_ended = not choices

    cli._clarify_state = {
        "question": question,
        "choices": choices if not is_open_ended else [],
        "selected": 0,
        "response_queue": response_queue,
    }
    cli._clarify_deadline = _time.monotonic() + timeout
    cli._clarify_freetext = is_open_ended

    if hasattr(cli, "_app") and cli._app:
        cli._app.invalidate()

    while True:
        try:
            result = response_queue.get(timeout=1)
            cli._clarify_deadline = 0
            return result
        except queue.Empty:
            remaining = cli._clarify_deadline - _time.monotonic()
            if remaining <= 0:
                break
            if hasattr(cli, "_app") and cli._app:
                cli._app.invalidate()

    cli._clarify_state = None
    cli._clarify_freetext = False
    cli._clarify_deadline = 0
    if hasattr(cli, "_app") and cli._app:
        cli._app.invalidate()
    cprint(f"\n{_DIM}(clarify timed out after {timeout}s — agent will decide){_RST}")
    return (
        "The user did not provide a response within the time limit. "
        "Use your best judgement to make the choice and proceed."
    )


def prompt_for_secret_value(cli, prompt: str, *, timeout: int = 120, metadata=None):
    """Prompt for a secret and **return it**, rather than storing it.

    A sibling of :func:`prompt_for_secret`, which exists to capture API keys and
    therefore writes them to ``~/.hermes/.env``. The browser secret flow (B2)
    needs the opposite: the value must reach one browser field and then be gone,
    so it must come back to the caller and never touch disk.

    Returns the string, or ``None`` when the person cancelled or the prompt
    timed out. Callers must not log, store or echo the return value.

    Reuses ``cli._secret_state`` deliberately: the ``PasswordProcessor`` that
    masks typing is gated on ``bool(cli._sudo_state) or bool(cli._secret_state)``
    (see ``cli.py``), so a *new* state attribute would render the input in clear
    text. Reusing the existing one is what makes the masking actually apply.
    """
    if not getattr(cli, "_app", None):
        # No TUI (``hermes -p``, a pipe, a non-interactive shell): fall back to
        # the raw-mode masked reader, which handles the no-TTY case itself.
        if not hasattr(cli, "_secret_state"):
            cli._secret_state = None
        if not hasattr(cli, "_secret_deadline"):
            cli._secret_deadline = 0
        try:
            value = masked_secret_prompt(f"{prompt} (hidden, ESC or empty Enter to cancel): ")
        except (EOFError, KeyboardInterrupt):
            return None
        return value or None

    response_queue = queue.Queue()
    cli._secret_state = {
        "var_name": "",  # nothing is being stored under a name
        "prompt": prompt,
        "metadata": metadata or {},
        "response_queue": response_queue,
    }
    cli._secret_deadline = _time.monotonic() + timeout

    # Clear any half-typed draft first, or pressing Enter would submit it as
    # the secret. Same reasoning as prompt_for_secret.
    _reset_secret_buffer(cli)
    cli._app.invalidate()

    try:
        while True:
            try:
                value = response_queue.get(timeout=1)
                return value or None
            except queue.Empty:
                if cli._secret_deadline - _time.monotonic() <= 0:
                    cprint(f"\n{_DIM}  ⏱ Timeout — secret entry cancelled{_RST}")
                    return None
                cli._app.invalidate()
    finally:
        # Always tear the modal down, including on an exception, so a stray
        # failure cannot leave the terminal masking input forever.
        cli._secret_state = None
        cli._secret_deadline = 0
        _reset_secret_buffer(cli)
        try:
            cli._app.invalidate()
        except Exception:
            pass


def _reset_secret_buffer(cli) -> None:
    """Drop whatever is in the input buffer, by whichever route exists."""
    if hasattr(cli, "_clear_secret_input_buffer"):
        try:
            cli._clear_secret_input_buffer()
            return
        except Exception:
            pass
    app = getattr(cli, "_app", None)
    if app:
        try:
            app.current_buffer.reset()
        except Exception:
            pass


def prompt_for_secret(cli, var_name: str, prompt: str, metadata=None) -> dict:
    """Prompt for a secret value through the TUI (e.g. API keys for skills).

    Returns a dict with keys: success, stored_as, validated, skipped, message.
    The secret is stored in ~/.hermes/.env and never exposed to the model.
    """
    if not getattr(cli, "_app", None):
        if not hasattr(cli, "_secret_state"):
            cli._secret_state = None
        if not hasattr(cli, "_secret_deadline"):
            cli._secret_deadline = 0
        try:
            value = masked_secret_prompt(f"{prompt} (hidden, ESC or empty Enter to skip): ")
        except (EOFError, KeyboardInterrupt):
            value = ""

        if not value:
            cprint(f"\n{_DIM}  ⏭ Secret entry skipped{_RST}")
            return {
                "success": True,
                "reason": "cancelled",
                "stored_as": var_name,
                "validated": False,
                "skipped": True,
                "message": "Secret setup was skipped.",
            }

        stored = save_env_value_secure(var_name, value)
        _dhh = display_hermes_home()
        cprint(f"\n{_DIM}  ✓ Stored secret in {_dhh}/.env as {var_name}{_RST}")
        return {
            **stored,
            "skipped": False,
            "message": "Secret stored securely. The secret value was not exposed to the model.",
        }

    timeout = 120
    response_queue = queue.Queue()

    cli._secret_state = {
        "var_name": var_name,
        "prompt": prompt,
        "metadata": metadata or {},
        "response_queue": response_queue,
    }
    cli._secret_deadline = _time.monotonic() + timeout
    # Avoid storing stale draft input as the secret when Enter is pressed.
    if hasattr(cli, "_clear_secret_input_buffer"):
        try:
            cli._clear_secret_input_buffer()
        except Exception:
            pass
    elif hasattr(cli, "_app") and cli._app:
        try:
            cli._app.current_buffer.reset()
        except Exception:
            pass

    if hasattr(cli, "_app") and cli._app:
        cli._app.invalidate()

    while True:
        try:
            value = response_queue.get(timeout=1)
            cli._secret_state = None
            cli._secret_deadline = 0
            if hasattr(cli, "_app") and cli._app:
                cli._app.invalidate()

            if not value:
                cprint(f"\n{_DIM}  ⏭ Secret entry skipped{_RST}")
                return {
                    "success": True,
                    "reason": "cancelled",
                    "stored_as": var_name,
                    "validated": False,
                    "skipped": True,
                    "message": "Secret setup was skipped.",
                }

            stored = save_env_value_secure(var_name, value)
            _dhh = display_hermes_home()
            cprint(f"\n{_DIM}  ✓ Stored secret in {_dhh}/.env as {var_name}{_RST}")
            return {
                **stored,
                "skipped": False,
                "message": "Secret stored securely. The secret value was not exposed to the model.",
            }
        except queue.Empty:
            remaining = cli._secret_deadline - _time.monotonic()
            if remaining <= 0:
                break
            if hasattr(cli, "_app") and cli._app:
                cli._app.invalidate()

    cli._secret_state = None
    cli._secret_deadline = 0
    if hasattr(cli, "_clear_secret_input_buffer"):
        try:
            cli._clear_secret_input_buffer()
        except Exception:
            pass
    elif hasattr(cli, "_app") and cli._app:
        try:
            cli._app.current_buffer.reset()
        except Exception:
            pass
    if hasattr(cli, "_app") and cli._app:
        cli._app.invalidate()
    cprint(f"\n{_DIM}  ⏱ Timeout — secret capture cancelled{_RST}")
    return {
        "success": True,
        "reason": "timeout",
        "stored_as": var_name,
        "validated": False,
        "skipped": True,
        "message": "Secret setup timed out and was skipped.",
    }


def approval_callback(cli, command: str, description: str) -> str:
    """Prompt for dangerous command approval through the TUI.

    Shows a selection UI with choices: once / session / always / deny.
    When the command is longer than 70 characters, a "view" option is
    included so the user can reveal the full text before deciding.

    Uses cli._approval_lock to serialize concurrent requests (e.g. from
    parallel delegation subtasks) so each prompt gets its own turn.
    """
    lock = getattr(cli, "_approval_lock", None)
    if lock is None:
        import threading
        cli._approval_lock = threading.Lock()
        lock = cli._approval_lock

    with lock:
        from cli import CLI_CONFIG
        timeout = CLI_CONFIG.get("approvals", {}).get("timeout", 60)
        response_queue = queue.Queue()
        choices = ["once", "session", "always", "deny"]
        if len(command) > 70:
            choices.append("view")

        cli._approval_state = {
            "command": command,
            "description": description,
            "choices": choices,
            "selected": 0,
            "response_queue": response_queue,
        }
        cli._approval_deadline = _time.monotonic() + timeout

        if hasattr(cli, "_app") and cli._app:
            cli._app.invalidate()

        while True:
            try:
                result = response_queue.get(timeout=1)
                cli._approval_state = None
                cli._approval_deadline = 0
                if hasattr(cli, "_app") and cli._app:
                    cli._app.invalidate()
                return result
            except queue.Empty:
                remaining = cli._approval_deadline - _time.monotonic()
                if remaining <= 0:
                    break
                if hasattr(cli, "_app") and cli._app:
                    cli._app.invalidate()

        cli._approval_state = None
        cli._approval_deadline = 0
        if hasattr(cli, "_app") and cli._app:
            cli._app.invalidate()
        cprint(f"\n{_DIM}  ⏱ Timeout — denying command{_RST}")
        return "deny"
