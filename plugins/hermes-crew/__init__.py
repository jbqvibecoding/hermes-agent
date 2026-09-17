"""Hermes Crew — always-on AI teammates, each a profile with its own computer.

Registers the ``crew`` toolset: the six tools that turn a Hermes agent into a
GrokBot-shaped teammate (report grammar, draft-and-hold approvals, visible
memory, routines, allowlisted handoffs, takeover login). Everything else a
teammate needs — shell, files, browser, memory, skills, MCP — is already a
Hermes tool; see ``crew/tools.py`` for why there are only six.

The dashboard half of the plugin lives in ``dashboard/`` and is discovered
separately by the web server (``manifest.json`` + ``plugin_api.py``).

**Import bootstrap.** This plugin's two entry points are loaded in different
ways by Hermes: ``__init__.py`` becomes the package
``hermes_plugins.hermes_crew`` (so relative imports would work), while
``dashboard/plugin_api.py`` is exec'd as a *flat* module with no package
context (so they would not). Putting the plugin root on ``sys.path`` lets both
— and the test suite — spell it the same way: ``from crew import ...``.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

_PLUGIN_ROOT = str(Path(__file__).resolve().parent)
if _PLUGIN_ROOT not in sys.path:
    sys.path.insert(0, _PLUGIN_ROOT)

log = logging.getLogger(__name__)


def register(ctx) -> None:
    """Register the ``crew`` toolset. Called once by the plugin loader."""
    from crew.tools import CREW_TOOLS, crew_tools_available

    for name, schema, handler, emoji in CREW_TOOLS:
        ctx.register_tool(
            name=name,
            toolset="crew",
            schema=schema,
            handler=handler,
            check_fn=crew_tools_available,
            emoji=emoji,
        )

    log.debug("crew: registered %d tools", len(CREW_TOOLS))
