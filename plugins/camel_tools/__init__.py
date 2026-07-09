"""camel-tools plugin — bundled, auto-loaded.

Bridges owl's capability set into Hermes by wrapping the CAMEL toolkits
(``camel.toolkits.*``, shipped in the ``camel-ai`` package that owl depends
on) as Hermes tools. Registration is data-driven from
:data:`plugins.camel_tools.catalog.TOOLKIT_SPECS` and mechanical via
:mod:`plugins.camel_tools.adapter`.

The tools land in per-domain **non-core** toolsets (``camel_search``,
``camel_math`` …), so Hermes' Tool Search bridge defers them off the
per-call schema and the model discovers them on demand.

``camel-ai`` is a heavy optional dependency, so this plugin degrades
gracefully: if it isn't importable we register nothing and expose a single
``/camel-tools`` slash command to check status and install on demand (via the
``camel.tools`` lazy-deps feature). We deliberately do NOT auto-install a
large dependency at startup.
"""

from __future__ import annotations

import importlib.util
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def _camel_available() -> bool:
    """True if the ``camel`` package is importable (cheap, no import)."""
    try:
        return importlib.util.find_spec("camel") is not None
    except (ImportError, ValueError):
        return False


def _register_camel_tools(ctx) -> int:
    """Build and register every catalog toolkit. Returns tool count."""
    from plugins.camel_tools.adapter import register_toolkit
    from plugins.camel_tools.catalog import TOOLKIT_SPECS

    seen: set[str] = set()
    total = 0
    for spec in TOOLKIT_SPECS:
        try:
            toolkit = spec.build()
        except Exception as exc:  # noqa: BLE001 — one bad toolkit shouldn't sink the rest
            logger.warning("camel-tools: failed to build %s: %s", spec.cls, exc)
            continue
        registered = register_toolkit(
            ctx,
            toolkit,
            toolset=spec.toolset,
            only=spec.only,
            check_fn=spec.check_fn(),
            requires_env=spec.requires_env,
            emoji=spec.emoji,
            name_prefix=spec.name_prefix,
            seen=seen,
        )
        total += len(registered)
        logger.debug("camel-tools: %s -> %s", spec.cls, registered)
    return total


def _install_camel() -> tuple[bool, str]:
    """Attempt to install camel-ai via the lazy-deps feature."""
    from plugins.camel_tools.catalog import CAMEL_FEATURE

    try:
        from tools.lazy_deps import FeatureUnavailable, ensure
    except Exception as exc:  # noqa: BLE001
        return False, f"lazy-deps unavailable: {exc}"
    try:
        ensure(CAMEL_FEATURE, prompt=False)
    except FeatureUnavailable as exc:
        return False, str(exc)
    except Exception as exc:  # noqa: BLE001
        return False, f"install failed: {type(exc).__name__}: {exc}"
    return True, "camel-ai installed. Restart Hermes to load the camel tools."


_HELP_TEXT = """\
/camel-tools — owl/CAMEL toolkit bridge

Subcommands:
  status              Show whether camel-ai is installed and tools are active
  install             Install the camel-ai dependency (then restart Hermes)
  workspace [session] Show/provision the /mnt/user-data workspace dirs

When camel-ai is installed, its toolkits are exposed as non-core tools
(camel_search, camel_math, …) and surfaced to the model via Tool Search.
"""


def _handle_slash(raw_args: str) -> Optional[str]:
    argv = (raw_args or "").strip().split()
    sub = argv[0].lower() if argv else "status"

    if sub in {"help", "-h", "--help"}:
        return _HELP_TEXT

    if sub == "status":
        if _camel_available():
            return "[camel-tools] camel-ai is installed. CAMEL toolkits are active."
        return (
            "[camel-tools] camel-ai is NOT installed. Run `/camel-tools install` "
            "(or `pip install 'camel-ai[owl]==0.2.84'`), then restart Hermes."
        )

    if sub == "install":
        if _camel_available():
            return "[camel-tools] camel-ai is already installed."
        ok, msg = _install_camel()
        return f"[camel-tools] {msg}"

    if sub == "workspace":
        return _workspace_status(argv[1] if len(argv) > 1 else "default")

    return f"Unknown subcommand: {sub}\n\n{_HELP_TEXT}"


def _workspace_status(session_id: str) -> str:
    """Resolve + provision the /mnt/user-data workspace for a session."""
    from plugins.camel_tools.workspace import ensure_dirs, resolve_workspace

    try:
        from hermes_constants import get_hermes_home

        hermes_home = get_hermes_home()
    except Exception:  # noqa: BLE001
        from pathlib import Path

        hermes_home = str(Path.home() / ".hermes")

    paths = ensure_dirs(resolve_workspace(hermes_home, session_id))
    lines = [
        f"[camel-tools] /mnt/user-data workspace (session {session_id!r}):",
        f"  uploads   → {paths.uploads}",
        f"  workspace → {paths.workspace}",
        f"  outputs   → {paths.outputs}",
    ]
    return "\n".join(lines)


def register(ctx) -> None:
    """Plugin entry point — called once by the plugin loader at startup."""
    ctx.register_command(
        "camel-tools",
        handler=_handle_slash,
        description="Manage the owl/CAMEL toolkit bridge (status, install).",
    )

    if not _camel_available():
        logger.info(
            "camel-tools: camel-ai not installed; CAMEL tools inactive. "
            "Use `/camel-tools install` to enable them."
        )
        return

    try:
        count = _register_camel_tools(ctx)
        logger.info("camel-tools: registered %d CAMEL tool(s).", count)
    except Exception as exc:  # noqa: BLE001 — never let a plugin crash startup
        logger.warning("camel-tools: registration failed: %s", exc)
