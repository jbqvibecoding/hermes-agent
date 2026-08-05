# wanman → Hermes: findings & integration

We studied **wanman** (an "Agent Matrix framework": a supervised network of
Claude Code / Codex CLI subprocesses coordinated through a JSON-RPC supervisor)
for ideas that could enhance Hermes' multi-agent story.

**Structural difference from the previous four studies.** owl/camel, DeerFlow
and OpenHarness were all Python, so we ported files. wanman is TypeScript
(~42k lines across `cli`/`core`/`runtime`/`host-sdk`/`finops`), so nothing is
directly portable. What transfers is protocols, algorithms and domain
knowledge, reimplemented in Python — and that is what this round did.

**Headline:** the overlap with Hermes is much larger than the README suggests,
and several of the most attractive-looking pieces turn out not to be wired up
at all. Three genuinely new things survived the audit and shipped.

## Verified before building

| wanman claim | Hermes reality | Verdict |
|---|---|---|
| Multi-agent coordination | `gateway/kanban_watchers.py` multi-agent dispatcher + kanban worktree workspaces | Large overlap |
| Per-agent git worktree | Kanban already gives tasks `scratch`/`dir`/`worktree` workspaces | Hermes ahead (see below) |
| Per-agent `$HOME` | No equivalent — but it isn't isolation (see below) | Not adopted |
| Drives external CLI agents | `agent/codex_runtime.py` already drives Codex CLI; plus `acp_adapter/` | Overlap |
| Crash recovery for stuck tasks | wanman has **none**; Hermes has claim TTL + PID liveness + `last_heartbeat_at` + `release_stale_claims` | **Hermes ahead** |
| Structured agent stop reason | wanman has none either (`errored = exitCode !== 0`, raw `stop_reason` logged only) | Nothing to borrow |
| FinOps credential inventory | `agent/credential_sources.py` is about Hermes' *own* auth pool, not inventorying third-party keys — different purpose | Not overlapping |

## Shipped

### `hermes_cli/board_health.py` — board-level health classification (W1)
Kanban reported per-task outcomes but could not answer "is the board as a whole
progressing?". Ports wanman's five-state classifier
(`productive` / `idle` / `blocked` / `backlog_stuck` / `error` plus free-text
reasons), which is valuable precisely because it separates three kinds of
stall: nothing to do, work queued that nothing is picking up, and everything
waiting on a dependency. Plus `RunGate`, the auto-exit policy (N consecutive
error ticks aborts; N consecutive all-done ticks finishes).

Adaptation: upstream's `backlog_stuck` test is "an idle agent with unread
messages"; Hermes has no inter-agent message bus, so the equivalent signal is
"runnable work exists with no live claim" — which also catches an expired claim
from a dead worker. Upstream counts created artifacts as progress; Hermes has
no equivalent input, so that term was dropped rather than faked.

Wired through the existing `_fire_kanban_lifecycle_hook` seam as a new
`kanban_board_tick` hook event, so observers get the board-level picture the
per-task hooks could never provide.

> Note for anyone reading upstream: the repo contains **two** classifiers.
> `loop-classifier.ts`'s `classifyLoop` is imported but never called (only
> `countTransitions` is used) and writes to a `.legacy` file. The live one is
> `loop-observability.ts:182-213`. This port follows the live one.

### `hermes_cli/task_scope.py` — task path-scope conflict detection (W2)
Ports `scopesOverlap`'s four cases (exact path intersection, patterns against
paths both ways, pattern-against-pattern prefix containment). Kanban tasks can
now declare `scope_paths` / `scope_patterns`, and creation is **refused** when
the scope overlaps a task already in flight.

Complementary to what Hermes already had: worktrees prevent interference while
work runs; scopes prevent the collision from being scheduled at all, so two
agents don't edit the same file in separate worktrees and discover it at merge
time. Undeclared scope never conflicts, so every existing caller is unaffected.

### `plugins/observability/ndjson` — local NDJSON event sink (W3)
Hermes' observer-hook contract was already good, but both shipped sinks
(`langfuse`, `nemo_relay`) push to external services. This adds the cheapest
possible local sink: append-only NDJSON, one self-contained object per line
(so a crash-truncated file still parses), best-effort writes that can never
break a run, and a heartbeat file with pid and last-tick so a monitor can tell
"wedged" from "finished". Opt-in via `observability.ndjson.path` or
`HERMES_NDJSON_PATH`; with neither set it registers nothing.

### `agent/skill_snapshot.py` — immutable skill-activation snapshots (W5)
Hermes skills declare `version:` in frontmatter, but nothing recorded which
versions a run actually loaded — so a run that behaved oddly cannot be
reconstructed once skills are edited, installed, or rewritten by the curator.
This captures `{skill → (version, content_sha256)}` with a deterministic
snapshot id, plus the per-entry policy that makes snapshots useful rather than
merely archival: `track_active` (follow what's installed) vs `pin` (freeze).
`diff_snapshot` reports drift and flags pinned-skill changes specially.

The id deliberately ignores install path, so the same skill in a dev checkout
and a container hashes identically.

Deliberately **not** ported: upstream's `draft→candidate→canary→active→
deprecated→archived` promotion lifecycle and A/B evaluation tables, which serve
their hosted skill-evolution product.

## Not adopted, and why

| Item | Reason |
|---|---|
| `WorktreeManager`, `MergeQueue`, `SafetyGate` | **Dead code** — well-designed, tested, and never instantiated outside their own tests. The real system runs the whole matrix against **one shared worktree**, and tells agents where the code is via prompt text. With dev workers scaled to 3, three concurrent subprocesses are instructed to `git checkout -b` in the same directory. Hermes' kanban worktrees are stronger. |
| Per-agent `$HOME` | `agent-home-manager.ts` **symlinks** `.ssh`, `.aws`, `.gitconfig`, `.git-credentials`, `.docker`, `.kube` back to the real home. An agent writing through those paths writes your real credentials. What it actually isolates is the per-agent skills directory. A genuine OS-level path exists (`WANMAN_AGENT_USER` + `runuser` + `chown`) but only under root in their hosted sandbox. |
| JSON-RPC protocol, `host-sdk` | Plain HTTP+JSON-RPC with no schema validation, no capability handshake, params-only types (results are `unknown`). `host-sdk` is a 4-method strategy object, not a plugin system. Both thinner than what Hermes has. |
| Role system (CEO/dev/devops/…) | A hardcoded array of one-line prompts plus ~250 lines of switch-case markdown generation. Roles parameterize lifecycle and model tier only — not tools, permissions, or routing. Prompt engineering, not architecture. |
| `ws` dependency | Declared in `package.json`; nothing in the repo imports it. There is no WebSocket and no push streaming — observability is file snapshots throughout (`wanman watch` reads once; it is not `tail -f`). |
| At-most-once message delivery | `Relay.recv()` marks messages delivered in the same call that fetches them, before the agent has processed anything. A crash in between silently drops them. An anti-pattern, not an asset. |
| Startup task recovery | wanman never sweeps claimed tasks at boot, so a SIGKILL leaves tasks stuck against a dead agent forever. Hermes already has claim TTL, PID liveness, heartbeat staleness, and `release_stale_claims`. |
| Steer = kill-and-respawn | A sound choice for subprocess agents, but Hermes' subagents are in-process Python; killing and restarting doesn't map. |
| `--dangerously-skip-permissions` | Every agent is launched with it, leaving role boundaries to prompt convention. Not copied — Hermes has the permission gate (O1) and declarative hooks (O5). |
| FinOps (deferred, not rejected) | Cost/revenue/usage three-table model, ROI formulas (`roi = null` when cost is 0), OpenAI `/organization/costs` and Stripe `/balance_transactions` endpoint knowledge, a 16-provider usage-capability matrix, and a genuinely well-designed value-blind credential scanner (`secretIncluded` typed as literal `false`; `.env` not scanned unless opted in; separate sanitize-for-publish pass). This is business-finance scope rather than agent-framework scope, so it was deferred by decision, not dismissed. |

## A general caution about this repo

Three separate cases turned up of nicely-built, tested classes that were never
wired into the runtime, plus one phantom dependency and a README whose
isolation claims the code does not support. Treat documentation here as a
statement of intent and trace anything load-bearing to its call sites.

## Licensing

wanman is Apache-2.0; Hermes is MIT. As with the CAMEL port, each derived file
carries an attribution header describing its modifications, and `NOTICE` lists
them.
