# Hermes Crew

Always-on AI teammates, each with its own computer, in an iMessage-shaped
workspace. It is the Grok Bot product shape built on Hermes primitives rather
than beside them.

**A teammate is a Hermes profile.** Not a row in a table that happens to have a
prompt — an actual `~/.hermes/profiles/<id>/` with its own `SOUL.md`,
`memories/MEMORY.md`, skills, model, `.env`, session history and cron jobs. Hire
one and you get a profile; talk to it from the CLI and it is the same teammate.
That is the whole design: the crew adds a product surface, not a second agent.

```
hermes dashboard        # open the Crew tab
```

## What a teammate does

| | |
|---|---|
| **Reports, doesn't narrate** | Finished work comes back as `✓ system → result · count` lines with one closing sentence that surfaces only what needs you. |
| **Stops at the door** | Anything leaving the workspace — sending, publishing, paying, booking — is prepared in full and then *held*. You Approve or Discard; a bare 👍 in the thread releases the newest hold. Deciding twice is a 409, not a second email. |
| **Remembers out loud** | "From now on, quiet accounts wait for my read" writes a rule into that teammate's `MEMORY.md` and posts the diff as a chip. It is in the system prompt from the next turn on. |
| **Schedules itself** | "Post a digest every morning" registers a Hermes cron job in that teammate's profile, shows the schedule in plain English, and fires whether or not the dashboard is open. |
| **Hands work over, and comes back** | `message_bot` drops a scoped task into a colleague's thread and wakes them — and when they answer, the teammate you were talking to is asked again with that answer and tells you what it means, in its own thread and its own words. Peer-to-peer is off until you allowlist a direction; the chief is the default hub. One dispatch plus one reply is the whole budget. |
| **Says when it has gone quiet** | A turn that runs with no output and no tool calls for ten minutes posts one line saying so. It is never stopped for you — a run waiting on a slow API is still working, and the point is that you get to decide. |
| **Asks for the keyboard, never the password** | At a login wall it calls `ask_for_login`. You open its screen, sign in once in *its* browser, and the session persists in its profile. |
| **Writes documents with you, not at you** | A Space is a shared document workspace you invite a teammate into. Every edit carries the revision it was based on, so you and it can both be writing and the loser is told to re-read rather than silently overwriting you. A page it reads arrives quoted: anyone with access can write anything into one. |

## Its computer

Each teammate gets one container, keyed `crew-<id>`, started lazily and reused
across restarts:

```bash
docker build -t hermes/crew-computer docker/crew-computer
```

Inside: a persistent `/workspace`, a bash shell, a **headed** Chromium under
Xvfb, and that same screen served over noVNC. Hermes's existing terminal, file
and browser tools drive it unchanged — the crew only points them at the right
container (`crew/computer.py`). Ports are published to `127.0.0.1` with
Docker-assigned host ports. **Do not port-forward them.**

Without Docker everything else still works; teammates are told plainly that
they have no shell or browser rather than being left to discover it mid-task.

## Configuration

All optional, under `crew:` in `config.yaml`:

```yaml
crew:
  chief: chief                          # who closes group threads and hubs handoffs
  a2a_allow: "researcher>market-watch"  # extra directed handoff edges
  computers: true                       # false disables containers entirely
  computer_image: hermes/crew-computer:latest
```

The roster lives in `<root>/crew.db`, shared across profiles the same way the
kanban board is — a roster that forked per teammate would not be a roster.

### Waking a teammate on an outside event

A teammate is a profile, and Hermes already has a hardened generic webhook
adapter, so this needs no crew-specific wiring — which is exactly why nobody
finds it. A route configured under a teammate's own profile runs as that
teammate, and anything it files lands in that teammate's thread
(`crew/orchestrator.py::resolve_turn` falls back to the active profile, and
that fallback is what a routine and a Telegram message already rely on).

```yaml
# ~/.hermes/profiles/scout/config.yaml
platforms:
  webhook:
    extra:
      routes:
        - path: /gh
          events: [pull_request]
          secret: ${GITHUB_WEBHOOK_SECRET}   # required; HMAC is not optional
          prompt: |
            A pull request was {payload[action]}: {payload[pull_request][title]}
            Review it and report what needs a person.
```

What you get from the host, rather than from us: per-route HMAC with replay
protection, rate limiting, and an idempotency cache so a webhook retry does not
run the teammate twice. See `gateway/platforms/webhook.py`.

Use `deliver_only: true` for a pure notification — it skips the model entirely,
which is the right setting for "tell Scout this happened" as opposed to "have
Scout deal with this".

## Security

- Credentials live in the teammate's browser profile, inside its container.
  The gateway never sees a password and neither does your config.
- Outward actions are held, not sent, until you approve them.
- Teammate-to-teammate messaging is off until you allowlist a direction.
- Screens bind to loopback only.
- Inbound content a teammate reads is untrusted input. Give teammates their own
  accounts rather than yours.

## Layout

```
plugins/hermes-crew/
├── plugin.yaml          # the `crew` toolset
├── crew/
│   ├── db.py            # crew.db — the roster, threads, chips, approvals (and the bus)
│   ├── prompts.py       # the behavioural contract, ported verbatim
│   ├── orchestrator.py  # a thread message → a Hermes AIAgent turn
│   ├── tools.py         # the tools a plain agent has no concept of
│   ├── pages.py         # Spaces: shared documents, and the revision token
│   ├── roster.py        # teammate ⇄ profile
│   ├── computer.py      # the container, its screen, its browser
│   ├── routines.py      # crew routines ⇄ Hermes cron
│   ├── approvals.py     # the draft-and-hold ledger
│   ├── sections.py      # the sidebar org chart
│   ├── report.py        # the report grammar
│   ├── schedule.py      # cron → English
│   └── a2a.py           # the handoff allowlist
├── teammates/           # the shipped crew's SOUL.md files
└── dashboard/           # the /crew tab (manifest + FastAPI routes + IIFE bundle)
```

Tests: `pytest tests/plugins/test_crew_logic.py tests/plugins/test_crew_flow.py`
— no model, no container, no network.

## Provenance

The product logic is ported, not reinvented. The prompt blocks, tool schemas,
report validation, handoff rules and approval semantics come from
[OpenGrokBot](https://github.com/wolfqing/OpenGrokBot) (MIT); the sidebar
sections and the cron humaniser come from the Grok Bot 0.18 reconstruction.
Those strings *are* the product — they are copied across rather than
paraphrased, and the modules that hold them say so.
