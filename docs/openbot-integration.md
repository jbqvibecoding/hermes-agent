# OpenBot → Hermes: findings & integration

We studied **OpenBot** (CopilotKit's agent platform — "AI coworkers you can hand
real work to, and actually trust with the access"). MIT-licensed TypeScript/Bun
monorepo; a docstring citing the source is sufficient attribution, as with the
DeepSeek Harness round.

## The premise correction that shaped this round

The brief was "give Hermes agent a cloud computer". **Hermes already has one**,
and reading the code before building was what stopped this from becoming a
rewrite of things that already work:

| Capability | Hermes, before this round |
|---|---|
| Persistent remote machine | `tools/environments/daytona.py:89-117` — resumes the *same* sandbox across sessions; `cleanup()` stops rather than deletes |
| Cloud snapshot persistence | `tools/environments/modal.py:451-467` — `snapshot_filesystem()` into `~/.hermes/modal_snapshots.json` |
| Execution backends | six: local / ssh / docker / singularity / modal / daytona |
| Browser | 8,141 lines across six modules, twelve model-facing tools |
| Page representation | **already OpenBot's signature approach** — `browser_tool.py:11`: "uses agent-browser's accessibility tree (ariaSnapshot) for text-based page representation", with `@e1`-style element refs |
| Watching it live | Camofox headed mode exposes VNC, and `browser_camofox.py:533-538` pushes the URL into the navigate result telling the agent to share it |
| Desktop control | `tools/computer_use/` — three OSes, accessibility trees, set-of-marks |

What OpenBot actually adds is not the computer. It is the **collaboration and
accountability layer around it** — and their README names the distinction
precisely: between "an agent that can use your tools" and "an agent you can let
near them". That layer is what this round ported. All four gaps were confirmed
with zero grep hits on the Hermes side before any code was written.

## The insight worth the whole round

`server/src/computer/gateway.ts:16-18`:

> *A gateway that decides on a label supplied by the model is theatre: "never
> click Submit" is evaded by sending `{ref:"e13", name:"Continue"}`.*

Their gateway resolves the ref against the **server's own snapshot** before
deciding, so the decision is made on what the element *is*, not on what the
model says it is. The same reasoning drove the shape of everything below: a
guard is only worth having where it cannot be walked around.

## The architectural fact that dictated the design

Hermes drives a browser three ways, and **they share no dispatcher**:

| Path | Entry point | Note |
|---|---|---|
| agent-browser | `browser_tool.py:2257` `_run_browser_command` | the default |
| Camofox | `browser_camofox.py` | `browser_tool.py` short-circuits to it in **17 places**, *before* `_run_browser_command` |
| raw CDP | `browser_cdp_tool.py:394` `browser_cdp` | passthrough escape hatch |

A guard on one of the three is precisely the theatre the quote above describes:
the operator believes the agent has been stopped, and it has not. Every guard in
this round is wired into **all three**, and each has a coverage test whose job is
to fail when a fourth path appears or one of the three loses its hook.

This also settled plugin-vs-core. `gateway/builtin_hooks/` ("always registered")
is gateway-only, and a `pre_tool_call` plugin that ships disabled cannot enforce
anything. A takeover gate that is off by default is a contradiction — the person
is already holding the wheel. `AGENTS.md` forbids *plugins* from touching core;
this is a core capability, so the three call sites are core edits, while the
decision logic stays in pure, browser-free modules.

## Shipped

### B1 — human takeover (`tools/browser_control.py`)

An agent that hits a login wall or a 2FA prompt can now ask for a person, who
takes the wheel, does the part only they can do, and hands it back.

Two properties are load-bearing, both from OpenBot's `control.ts`:

- **The agent can only raise a flag.** `request_help()` never grants control;
  becoming the driver requires `take()` from a human-facing surface. An agent
  that could give itself a human could give itself the wheel back.
- **While a person drives, agent actions are refused, not queued.** A queued
  click lands the moment you let go, possibly on a page you navigated somewhere
  else entirely.

**Deliberate divergence:** OpenBot refuses *every* bot action during a takeover.
Hermes allows **reads** (snapshot, console, screenshot), because after you finish
logging in the agent has to look at the page to discover what happened. Blocking
reads leaves it guessing. Reads cannot disturb the person driving; actions can.

The gate **fails closed** — if the control state cannot be read, the action is
refused. This is a real boundary, unlike B3 below.

### B2 — scoped secret entry (`tools/browser_secret.py`)

The agent names a field and a label; a person types the value; it goes into that
field; the agent is told `{"supplied": true, "characters": 12}`. The password
never enters the agent's context, the transcript, the logs, or the audit record.

The character count is the only thing about the value that escapes, matching
OpenBot — it distinguishes "they filled it in" from "they cancelled", and reveals
a field that silently truncated.

Two subtleties found while writing the tests, both now fixed and asserted:

- `raise ... from None` is **not sufficient** to drop a leaky exception. It sets
  `__suppress_context__`, which stops the traceback being *printed*, but
  `__context__` still holds the original exception and its message — where a
  structured logger walking the chain would find the value.
- Clearing `__context__` inside the `except` block does not work either: the
  interpreter re-attaches the active exception at `raise` time. The failure is
  therefore recorded in the handler and raised *outside* it.

The tests assert the value is **absent** — from the return, from module state,
from the exception chain — rather than asserting it comes back redacted.
Redaction is a filter over something you already have; not having it is stronger.

### B3 — snapshot staleness (`tools/browser_view_state.py`)

Element refs are positional: `@e7` means "the seventh interactive element", not
"the Accept button". A model that snapshots, then navigates or waits while the
page re-renders, then clicks `@e7`, clicks whatever is now seventh. Nothing
rejected that before.

Snapshots and navigations now advance a generation counter, and
`browser_click`/`browser_type` accept the `snapshot_id` they were planned
against. A mismatch is refused with a distinct stale-view error.

The parameter is **optional**, matching OpenBot's `snapshotId?`: every existing
call site and every model that has not learned it behaves exactly as before. The
tool descriptions teach the model to echo it back.

Unlike B1, this guard **fails open** — it prevents a model acting on a mistaken
belief, it is not a security boundary, and a fault in its bookkeeping should not
block a browser action that would otherwise work. The asymmetry is deliberate and
documented in both modules.

Actions do **not** advance the counter: filling three fields and then submitting
from one snapshot is a normal flow, not a staleness bug.

### B4 — durable audit log (`hermes_cli/audit_log.py`, `tools/tool_audit.py`)

Hermes had three partial substitutes and no audit trail: the SQLite transcript
(what was asked and returned, but not what was decided, and subject to
compaction), the NDJSON observability plugin (right shape, opt-in, drops keys,
truncates at 2,000 chars), and rotating prose logs.

`hermes_cli/dashboard_auth/audit.py` already had the right bones — JSONL, event
enum, redacted-field frozenset, write lock, never raises — but covered auth only.
Per `AGENTS.md`'s extend-don't-duplicate rule, the mechanism was **extracted**
into `hermes_cli/audit_log.py` and both now use it. The auth module's
early-startup constraint is preserved: the shared core imports only the standard
library, and a test asserts it.

Added on top: recursive redaction (tool arguments are nested by nature),
OpenBot's **pre-authorisation ordering** via `audited_action()` — the decision is
written before the action runs, and an allowed action that then fails gets its
own record, so "allowed" can never be read as "happened".

Wired to the B1/B2 handover and secret events unconditionally — those are rare,
security-relevant, and have no other record anywhere. Per-tool-call auditing
rides the universal `post_tool_call` emitter but is **off by default**
(`audit.tool_calls: true`): it writes a line per call forever with no rotation,
and turning that on unasked is a disk-usage decision made on someone's behalf.

## Not adopted, with the reason

Several headline README features do not survive reading the code, and are not
credited here:

| Item | What the code actually shows |
|---|---|
| `egress.ts` "network egress control" | **Not egress control.** 88 lines, no allowlist or denylist anywhere, just an optional upstream Chromium proxy. With none configured the default is **direct, unrestricted** (`egress.ts:44`). Its own comment calls that "the wrong [default] for a deployment that cares" |
| SPIFFE/SPIRE workload identity | **Decorative.** Issuance works end to end; the SVID's only consumer is the `/health` JSON body (`agent-computer/src/index.ts:598-602`). No mTLS, no SVID verification, no authorization decision reads a SPIFFE ID. `insecure_bootstrap = true`, the join token is a public literal, and `start.sh` does not start SPIRE at all |
| Per-Bot container orchestration | Hermes' `tools/environments/docker.py` is **harder** — cap-drop ALL, no-new-privileges, pids-limit, tmpfs, cgroup probing, orphan reaping. OpenBot has no CPU limit, no disk limit, memory unlimited by default, and **no idle reaping** (containers are `unless-stopped` forever) |
| Credential encryption | There is none. `--password-store=basic`, which their own comment calls "obfuscation at rest, not protection" |
| Per-Bot authentication | **One shared `COMPUTER_TOKEN` for every Bot.** Any caller can set `x-openbot-bot-id` to another Bot and get that Bot's logins |
| "The gateway is the only way in" | True of the server path only. `agent-computer:4100` is a token-authenticated but ungoverned, unaudited back door; the README asks users not to use it to bypass the gateway |
| Downloads, multi-tab, retries | Not implemented — omissions, not stubs |
| The platform itself | `server/src/config.ts:264` **refuses to boot** without four CopilotKit Intelligence values plus a license token. `copilot.ts:22-27`: "There is no SSE branch. Intelligence is a requirement of the product, not a tier." Adopting the platform is not possible; only the designs transfer — which also satisfies Hermes' rule against third-party product integrations in-tree |

## Testing, and what is not verified

242 new tests. The pure modules and all three gate paths are covered, including
coverage guards designed to fail if a browser path loses its hook.

⚠️ **Not verified end to end against a live browser.** The `agent-browser` npm
CLI is not installed in the development environment used for this work, and the
Docker daemon is unavailable. Every gate is exercised with the
network/subprocess boundary stubbed, which tests the gate but not Chromium's
behaviour behind it.

This is why the load-bearing logic was deliberately built as pure, browser-free
modules — the same reason OpenBot keeps `control.ts` free of Playwright imports.
What remains unproven is the last inch: that a refused Camofox click really does
fail to reach a real browser, and that a filled secret really does land in the
right field on a real page. Anyone running this with a browser configured should
exercise those paths before relying on them.
