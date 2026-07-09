"""deerflow memory provider plugin (kind: exclusive).

Registers DeerFlow-style cross-session memory as a Hermes MemoryProvider.
Activated when ``memory.provider: deerflow`` (config) or
``HERMES_MEMORY_PROVIDER=deerflow`` (env).
"""

from __future__ import annotations

from plugins.memory.deerflow.provider import DeerflowMemoryProvider


def register(ctx) -> None:
    ctx.register_memory_provider(DeerflowMemoryProvider())
