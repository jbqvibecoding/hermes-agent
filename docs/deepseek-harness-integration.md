# DeepSeek Harness → Hermes: findings & integration

We studied **DeepSeek Harness** (`dsh`) — DeepSeek AI's open-source agent
harness, a TypeScript pnpm monorepo of 54 package groups built on Cordis, whose
slogan is "everything is a plugin". MIT-licensed, so a docstring citing the
source is sufficient attribution; no `NOTICE` entry is required (unlike the
Apache-2.0 camel and wanman rounds).

**This is the most architecturally similar repository of the five we have
studied.** Same problem domain, same narrow-waist-plus-plugins philosophy. That
similarity cuts both ways: the overlap is large, so the work was mostly in
telling "genuinely missing" apart from "we already have this, and ours is
better". Two of the five milestones changed shape once the Hermes side was read
properly, and one planned item was dropped outright. Those corrections are
recorded below rather than quietly smoothed over.

Like the wanman round, `dsh` is TypeScript: nothing was copied. What transfers
is contracts, algorithms, and OS-level technique, reimplemented in Python.

## Verified before building

| `dsh` capability | Hermes reality (read, not assumed) | Verdict |
|---|---|---|
| `SubagentStopReason` / structured termination | `tools/delegate_tool.py` had `status` + `exit_reason` with overlapping ad-hoc vocabularies, and dropped partial output on timeout | **Real gap → D1** |
| `spill/` — oversized content to disk | `tools/tool_result_storage.py` already does this generally, in 3 layers, with an aggregate turn budget `dsh` has no equivalent of | **Premise wrong; a narrower real defect → D3** |
| `token-meter` hybrid anchoring | `context_compressor` tracks provider usage but re-estimates the whole history each time | **Real gap → D5** |
| `hooks/hook-protocol` codec/merge/matcher | `plugins/declarative_hooks/` is Hermes' own four-type model; it cannot read native `hooks.json` | **Complementary → D2** |
| `native/landlock-run` | No `landlock` or `seccomp` anywhere in the repo | **Real gap → D4 (unverified, see below)** |
| `guard/repeat-tool-reminder` | `agent/tool_guardrails.py` is more complete; `dsh`'s README admits its own block-escalation is unimplemented | **Hermes ahead — not adopted** |
| `compaction-tool-result-pruner` | `context_compressor._summarize_tool_result` produces per-tool semantic summaries, live at two call sites | **Hermes ahead — dropped, see below** |
| `guard/timeout-policy` | ~80 lines of cooperative cancellation; `asyncio.timeout()` covers it | Not adopted |
| `sandbox-windows-acl` | 2530 lines of Windows-only koffi FFI | Not adopted |
| `tool-subagent-report` | 172 lines, one free-text parameter, no schema or size cap, and the child decides whether to call it at all | Not the contract; see D1 |
| `packages/context/*` provider abstraction | **It does not exist** — the directory layout is misleading | Nothing to adopt |
| `python/` SDK | 2629 lines of which 1001 are tests; a JSON-RPC client for driving `dsh` as a subprocess, and it would add a Node runtime dependency | Not adopted |

## Two corrections to our own plan

Both were found by reading Hermes source after the plan was approved. Recording
them because the plan as written would have produced worse code.

### D3 was premised on a gap that does not exist

The plan said Hermes' spill mechanism "only covers two special cases" and
needed generalising to tool results. That is wrong. `tools/tool_result_storage.py`
already applies `maybe_persist_tool_result` to **every** tool result centrally in
the executor, with per-tool thresholds, plus `enforce_turn_budget` for the
aggregate — a layer `dsh` does not have at all. Two of the three "refinements"
we planned to import were also already present: `read_file` is pinned to
`float("inf")` in `PINNED_THRESHOLDS` specifically to prevent persist→read→persist
loops, and a failed sandbox write already degrades to truncation rather than
turning a good call into an error.

What survived was narrower and real — see D3 below.

### The middle-out pruner was dropped

The plan included porting `compaction-tool-result-pruner` (head 4096 + marker +
tail 1024, model-free). Hermes' `_summarize_tool_result` already does model-free
tool-result reduction during compaction and does it *better*: it emits
`[read_file] read config.py from line 1 (1,200 chars)` rather than a blind chop
through the middle of the text. Adding `dsh`'s version would have been a
downgrade. Same call as rejecting camel's `check_command_safety` last round.

## Shipped

### D1 — subagent structured termination contract

`tools/subagent_termination.py` (pure, dependency-free) + wiring in
`tools/delegate_tool.py`.

- `stop_reason` is **derived by the runtime** from the child's terminal result
  and the exception that ended it. A child writing "task complete" in its final
  message does not thereby get `completed`.
- Success is a **one-member whitelist**. Unknown values — a future enum member,
  a typo, an injected string — are failures by construction.
- Output selection takes no `stop_reason` argument at all. Making it depend on
  the stop reason is how partial work gets silently discarded.
- **Partial output now survives.** The timeout and crash paths previously
  returned `summary: None`, throwing away everything the child had streamed.
  They now carry it, flagged `partial_output: true`.
- **The system's words are kept out of the child's.** `summary` is the child's
  text; `settlement` and `system_notes` are the runtime's. The stale-file
  warning used to be concatenated onto `summary`, making the two
  indistinguishable.

Hermes' enum carries two members `dsh` has no concept of — `max_iterations` and
`timeout` — because Hermes has both budgets and squashing them into `error`
would discard a distinction callers already get. The safety property is
unaffected.

### D2 — Claude Code / Codex native `hooks.json`

`plugins/declarative_hooks/native.py`, registered as a **second source** beside
the existing four-type model, not a replacement. `command` hooks only, matching
`dsh`.

Ported behaviours, each of which is the kind of thing you only get right by
reading a real implementation:

- exit code 2 blocks with **stderr** as the reason; a clean exit whose stdout is
  not JSON is *not* an error; any other non-zero exit is a failed hook that must
  **not** become a block;
- two decision channels kept separate then folded — legacy top-level `decision`
  (only `approve`/`block`) versus `hookSpecificOutput.permissionDecision` (only
  `allow`/`deny`/`ask`, gated on `hookEventName` matching the firing event). On
  mismatch the event-scoped fields are dropped **but the discriminator is kept
  for audit**, because "your hook answered for PostToolUse" is exactly what the
  confused operator needs to see;
- merge is `deny > ask > allow > none`, joining only the **winning level's**
  reasons, with `continue: false` first-wins;
- matcher duality: Claude Code reads a pure `[A-Za-z0-9_|]+` pattern as literal
  pipe-alternation (so `Write|Edit` does **not** match `WriteFile`), everything
  else as unanchored regex; Codex is always regex. An invalid regex raises at
  **config parse time**, not silently at match time.

**Two limits stated in the code, not glossed:** `allow` cannot mean
"pre-authorised" here — Hermes has no way for a hook to waive a downstream gate,
so it degrades to "no objection", while `deny` and `ask` map exactly. And only
`pre_tool_call` can act on a decision at all, because it is the one Hermes hook
whose return value is read.

### D3 — bounded, tail-preserving tool-result replacement

Not the generalisation the plan described (see above), but a defect found while
checking that premise, and **reproduced before fixing**:

```
maybe_persist_tool_result("x"*300, threshold=0)  →  386 chars   # grew 29%
enforce_turn_budget(2 × 300 chars, budget=100)   →  772 chars   # grew
```

`_build_persisted_message` laid a preview of up to `preview_size` on top of a
notice of unknown size. `enforce_turn_budget` re-persists with `threshold=0`
precisely because a turn is already over budget — so it was pushing an
over-budget turn further over.

Fixed with `dsh`'s `TextRetainer` discipline: **charge the notice to the budget
before splitting what is left**, fit by measurement rather than by a fixed
estimate, and never return something longer than what was replaced. The excerpt
is now head **and** tail out of one budget, so a build log's failing last line
survives — `tools/hook_output_spill.py` already did head/tail for hook context;
tool results, the far more common case, had only the head.

One existing test changed meaning and was rewritten with its reasoning:
`threshold=0` still writes the file, but no longer inflates content too small to
benefit.

### D5 — token metering hybrid anchor

`agent/token_meter.py` (pure) + `note_pending_usage_anchor` /
`anchored_request_tokens` on `ContextCompressor`, read in the pre-API pressure
check.

Anchor to the provider's reported prompt size for the request it covered, spend
the `chars/4` heuristic only on what has been appended since. The anchor is
refused when the envelope (system prompt + tools + model) changed or history got
shorter, and both conditions are re-checked on every read — so a missed reset
degrades to the plain heuristic rather than to a wrong number.

Two Hermes-specific additions to `dsh`'s design:

- **cached input is added back.** Several providers report `prompt_tokens` net
  of cache reads; that is not the number that has to fit in the window. Hermes
  uses prompt caching, so anchoring naively would have made every cached turn
  look like a sudden collapse in context size and suppressed compaction exactly
  when it was needed.
- **the result can only ever rise.** Anchoring may pull a compaction forward,
  never postpone one. Over-estimating costs an early compaction; under-estimating
  costs the turn.

### D4 — Landlock filesystem confinement ⚠️ enforcement unverified

`tools/sandbox/landlock.py` — the three syscalls via `ctypes`, no compiled
artefact. Ports `dsh`'s four design points: ABI negotiation with mask reduction
(old kernels run `partial` rather than being refused), fail-closed
(`restrict_self` not succeeding means nothing runs), a **functional** probe that
builds and enforces a real ruleset rather than checking a version, and the
`O_PATH` + `fstat` downgrade for single-file grants.

**This is the one item that could not be fully verified.** The machine it was
written on does not support Landlock:

```
uname -r                                   6.18.5-fc-v20
landlock_create_ruleset(NULL, 0, VERSION)  -1, errno 38 (ENOSYS)
```

Tested and exercised: the ABI table, struct packing (including that
`landlock_path_beneath_attr` is packed — 12 bytes, not 16), syscall argument
construction, the file/directory downgrade, and fail-closed behaviour end to end.
**Not verified: that an enforced ruleset denies a real file access.** That is the
property that matters most for a sandbox, and passing tests here do not
substitute for it. `test_probe_reports_honestly_on_this_kernel` adapts to the
host and is the test to watch when this is run somewhere with the LSM.

For the same reason it is **deliberately not wired into
`tools/environments/local.py`**. The module is fail-closed, so a mistake in it
would not leak an unconfined process — it would stop processes from starting,
which on the terminal path means every command failing. Enabling that from a
machine where the enforcement half cannot be exercised is not a trade worth
making. The next step is to run `probe()` on a Landlock-capable kernel, confirm
it reports `enforcing`, and only then wire it in behind config.

**Scope, stated plainly for users:** Landlock is **filesystem only**. No network
isolation, no seccomp, no PID namespace, no resource limits. It does not replace
the Docker backend; it is a cheap unprivileged rung for hosts without one.

## Not adopted, and why

| Item | Reason |
|---|---|
| `guard/repeat-tool-reminder` | `agent/tool_guardrails.py` is more complete (signatures, decisions, synthetic results, recovery hints); `dsh`'s is ~15 lines of exact matching whose README admits block-escalation is unimplemented |
| `compaction-tool-result-pruner` | `_summarize_tool_result` already does model-free reduction, semantically rather than by chopping the middle out |
| `guard/timeout-policy` | `asyncio.timeout()` covers it |
| `sandbox-windows-acl` | Windows-only FFI; its one transferable idea is honestly self-reporting as `partial`, which D4 does |
| `tool-subagent-report` itself | One free-text parameter, no schema, no cap, and optional for the child. The real contract is in `types.ts` + `lifecycle.ts` |
| `packages/context/*` provider abstraction | Does not exist |
| `python/` SDK | Mostly tests; drives `dsh` as a subprocess and would add a Node dependency |
| `--dangerously-skip-permissions` posture | Carried over from earlier rounds: we do not adopt it |
| bwrap / Seatbelt profile construction, `/compact` wrapper | Direct translation, nothing new |

## Testing

New: 55 + 19 (D1), 21 (D3), 24 + 16 (D5), 114 (D2), 35 (D4).

`tests/tools/test_delegate_termination_wiring.py` drives `_run_single_child`
directly with a fake child rather than going through `delegate_task`, so the
contract stays covered in environments where the `run_agent` import chain is
unavailable, and a failure points at the delegation result path rather than at
agent construction.
