"""Hermes Crew — the GrokBot-shaped product surface on top of Hermes primitives.

A *teammate* is a Hermes profile. Everything that makes a teammate itself —
``SOUL.md``, ``memories/MEMORY.md``, ``skills/``, ``config.yaml`` (model,
toolsets, terminal backend), ``.env``, ``state.db`` — already lives in
``~/.hermes/profiles/<id>/`` and is owned by ``hermes_cli.profiles``. This
package adds only what a profile has no concept of:

* a roster with an emoji, a one-line job, and a sidebar section;
* threads (one DM per teammate, plus group threads) rendered as chips;
* the approval ledger behind draft-and-hold;
* the orchestration that turns all of that into ``AIAgent`` turns.

Those live in ``<root>/crew.db``, shared across profiles the same way the
kanban board is (see :mod:`crew.db`) — a roster that forked per profile
would not be a roster.
"""
