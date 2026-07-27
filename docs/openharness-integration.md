# OpenHarness → Hermes: findings & integration

We studied **OpenHarness** (HKUDS — a Python Claude-Code-family agent + the
`ohmo` personal agent + a repo **autopilot**) for things that could enhance or
combine with our owl/DeerFlow integration and Hermes itself.

**Honest headline:** OpenHarness is architecturally simpler than Hermes; most
subsystems (engine loop, tool framework, Tool Search, skills format, single-
backend Docker sandbox, channels, cron, plugin loader, config/prompt assembly,
cost tracking) are **equal-or-weaker** than what Hermes + our integration
already have. A small number of self-contained pieces are genuinely additive.

## Shipped (self-contained, fully verified)

### `plugins/tool_permissions/` — per-tool permission gate
Ported `permissions/checker.py` + `modes.py`. Fills a real Hermes capability
gap (no native per-tool approval), wired through the `pre_tool_call` hook.
Opt-in via `permissions.mode`; an un-overridable credential-path deny-list is
active in every enforcing mode (prompt-injection defense). See its README.

### `plugins/camel_tools/network_guard.py` — SSRF firewall
Ported `utils/network_guard.py`. Validates every http(s) URL arg of a CAMEL
tool before it fetches (blocks cloud-metadata / localhost / private ranges).
Wired into the camel adapter; toggle via `HERMES_CAMEL_SSRF_GUARD`.

### `plugins/memory/deerflow/autodream.py` — transactional memory consolidation
Ported `services/autodream/{lock,backup}.py`. Adds the out-of-band pass our
`deerflow-memory` lacked: merge near-duplicates, drop superseded facts, under a
PID-stamped lock + timestamped backup, with automatic rollback on failure or in
`preview` mode. Driven via `DeerflowMemoryProvider.consolidate(force=, preview=)`
(e.g. from a Hermes cron routine). Gated by `min_hours` / `min_new_facts`;
removals are capped and never touch protected categories (`correction`).

**Divergence from upstream:** upstream's dreamer is a separate subprocess, so it
stamps the lock with its (soon-dead) PID. Ours runs in-process, so a successful
pass writes an *empty* payload — the file's mtime still records "last
consolidated at", but the mutex is released rather than blocking our own next
pass for an hour.

### `plugins/declarative_hooks/` — config-declared hooks with LLM adjudication
Ported `hooks/{schemas,executor}.py`. Complements `tool_permissions` (hard
rules) with *soft* policy an operator writes in plain language:

```yaml
declarative_hooks:
  pre_tool_call:
    - type: prompt          # command | prompt | http | agent
      matcher: "terminal"   # fnmatch on tool_name / prompt / event
      priority: 10          # higher runs first
      prompt: |
        Reject this call if it would delete production data.
        Event payload: $ARGUMENTS
```

A blocking verdict on `pre_tool_call` becomes `{"action": "block", "message":
reason}` — Hermes' documented directive contract; on other events it is
advisory (those call sites have no veto). OpenHarness event names
(`pre_tool_use`, `session_start`, …) are accepted as aliases.

**Divergence from upstream:** upstream is async + pydantic + its own API client.
Ours is synchronous (Hermes hook callbacks are), uses dataclasses (the minimal
test env has no pydantic), and routes `prompt`/`agent` hooks through
`agent.auxiliary_client.call_llm` — so a hook needs no credentials of its own.

Both plugins are bundled but **not enabled by default** — `hermes plugins enable
declarative-hooks`, and with no `declarative_hooks:` config the plugin registers
nothing at all.

## Strategic follow-ons (high value; need a decision / live infra)

These are the two things Hermes genuinely lacks equal-or-better. Neither is
implemented — both need your call.

### 1. Subscription token bridge — run on Claude Code / Codex subscriptions, no API key
OpenHarness `auth/external.py` + the `claude_oauth` header block in
`api/client.py` + `api/codex_client.py` read the CLIs' stored OAuth tokens
(`~/.claude/.credentials.json`, `~/.codex/auth.json`; macOS Keychain), refresh
them automatically, and call the provider APIs **directly** while impersonating
the official client (spoofed `user-agent: claude-cli/…`, `x-app: cli`, betas,
billing-attribution). No CLI binary needs to be installed in the container.

- **Value:** ideal for a cloud product — users bring their subscription, not an
  API key; no CLI install. Would plug into Hermes' anthropic/codex transports.
- **Blocker (needs your decision):** it impersonates official clients (spoofed
  UA/betas) — a **ToS gray area**. And it can only be verified with real
  credentials + network. This is a product/legal call, so it is **not** built.

### 2. Repo autopilot — autonomous issue → PR → CI-repair → merge
OpenHarness `autopilot/service.py` (+ `types.py`) is a full state machine:
`queued → preparing → running → verifying → pr_open → waiting_ci → repairing →
completed → merged`. It scans GitHub issues/PRs, scores + picks a task, creates
a git worktree, runs the agent (`full_auto`) in it, runs configured
verification commands, opens/updates a PR via `gh`, polls CI, feeds failures
back for up to N repair attempts, and auto-merges when eligible — posting
progress comments throughout. A static React dashboard renders a kanban from a
`snapshot.json`.

- **Value:** this is exactly the "give it an issue, get a verified self-healing
  PR" engine a cloud AI-workspace wants. It depends only on the agent runtime +
  git/`gh` + a worktree manager — all of which Hermes has. Best delivered as a
  Hermes plugin/standalone service (swap OpenHarness' `build_runtime` for
  Hermes' agent entrypoint), scheduled via Hermes cron routines.
- **Why not yet:** it is a large new subsystem that drives real git/`gh`/CI and
  cannot be verified in this environment. Warrants its own milestone with your
  steer on scope (which sources, verification policy, auto-merge gating).

## Skipped (Hermes equal-or-better)

Engine/parallel-exec/cost-tracking, the tool framework + Tool Search, skills
format + installer (our hardened `.skill` installer is ahead), the single Docker
sandbox backend, the swarm coordination model, channels (Hermes has more), the
plugin loader/installer, config, prompt assembly, and all TUI sugar (themes/
vim/voice/keybindings).
