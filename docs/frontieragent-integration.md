# FrontierAgent → Hermes: findings & integration

Source: [ApodexAI/FrontierAgent](https://github.com/ApodexAI/FrontierAgent) at
`7d38394`. Apache-2.0, 152,250 lines of Python.

## Why this round is different from the last five

owl/camel, OpenHarness, camel, wanman, deepseek-harness and OpenBot were all
TypeScript. Only designs crossed over; every line had to be rewritten.

FrontierAgent is Python, on the same stack Hermes uses — pydantic, openai,
anthropic, httpx. So for the first time the arithmetic, the regexes and the
control-flow shapes could be lifted rather than reimagined. Apache-2.0 means
this round also needs a `NOTICE` entry, unlike the MIT sources before it.

## The premise corrections

Three of the README's headline features are already in Hermes, two of them in a
better form. Verified by reading the implementations, not the docs.

| Claim | What Hermes already has |
|---|---|
| "Asynchronous intervention" — type while the agent runs, injected at the next safe boundary | Hermes has **three** modes, not one: `display.busy_input_mode` ∈ `interrupt` / `queue` / `steer` (`hermes_cli/config.py`), two queues (`cli.py` `_pending_input`, `_interrupt_queue`), and `/steer` on its own channel drained *before* `api_messages` is built (`conversation_loop.py`) |
| Compaction must look at the request about to be sent, not the one already sent | `conversation_loop.py` computes `request_pressure_tokens` with `estimate_request_tokens_rough(...)` and tests `should_compress` **before every API call**. FrontierAgent checks at turn end; Hermes' checkpoint is strictly later and closer to the wall |
| Browser automation | FrontierAgent has none at all — `browserbase`, `playwright`, `browser_use` are zero-hit across the repo. No overlap with this session's B-series |

Also already covered: delegation depth (`delegate_tool.MAX_DEPTH`), recovering a
tool call the model wrote as text (`agent_runtime_helpers.py`), `/revert`
(Hermes uses a git shadow repo; FrontierAgent keeps an in-process content map
that explicitly gives up on anything `bash` wrote), and read-before-edit
(`tools/file_state.py` handles cross-subagent coordination, paginated reads and
per-path locks; their `fsguard.py` is 62 lines of mtime comparison).

## What was actually missing: landing the plane

`agent/iteration_budget.py` is 63 lines — `consume()`, `refund()`, `used`,
`remaining`. When it runs out the loop breaks, and whatever the model was
mid-way through is the result.

FrontierAgent measured the same failure. Their note on `WallClockGuard`
(`bus.py`) records that a hard cancellation left the run with no stop reason,
skipped the finalizer, and discarded the whole thing as an empty report —
**52.8% of subagents on one benchmark**.

In Hermes this lands directly on D1: `exit_reason="max_iterations"` plus an
empty summary produces `status="failed"`, and a subagent that worked for fifty
iterations returns nothing. D1 made the parent able to say *how* the child died;
this round is about it not dying empty-handed.

### The correction that shaped the implementation

The obvious port — inject a "wrap up" notice eight turns from the end — is
something **Hermes tried and removed**. From `agent/agent_init.py`:

> `# No intermediate pressure warnings — they caused models to "give up"`
> `# prematurely on complex tasks (#7915).`

The same comment describes what Hermes wanted instead: *"the LLM is only
notified when it actually exhausts the iteration budget … we inject ONE message,
allow one final API call"*. `AGENTS.md` sketches the same one-turn grace call
into its loop, and `tests/run_agent/test_run_agent.py::TestBudgetPressure`
exists for it.

**None of it was implemented.** Nothing in the repository ever set
`_budget_grace_call` or `_budget_exhausted_injected` to `True`, so the
`or agent._budget_grace_call` in the loop condition could never fire. Three
places documented a mechanism that did not exist.

So the shape shipped here is Hermes' own, not FrontierAgent's:

- **Default: the grace call.** At exhaustion, one notice and one more request.
  It fires when the run is over either way, so it cannot cause an early
  give-up — which is precisely what #7915 was about.
- **Opt-in: the early reserve.** `agent.finalization_reserve_turns`, default
  `0`. Operators who would rather trade some depth for a reliably-written answer
  can turn it on; the config comment cites #7915 so the trade is explicit.
- **The force is mechanical, not rhetorical.** The final request goes out with
  `tool_choice="none"`. A model that cannot call a tool writes prose. The notice
  is advice; this is what produces the outcome.

### Three Hermes-specific problems a straight port would have hit

**Injection channel.** FrontierAgent appends a bare `user` message mid-loop.
Hermes cannot: that breaks role alternation, which is why `/steer` appends to
the end of the last *tool result* instead. Budget notices reuse that channel.

**But not the steer marker.** `STEER_CHANNEL_NOTE` tells the model that text
inside the steer marker is the user speaking "with the same authority as their
original request". A budget notice is the runtime describing itself. Reusing the
marker would credit the user with words they never wrote — the mirror image of
D1's rule about not crediting a subagent with the system's sentence. Runtime
notices get their own marker and their own system-prompt note.

**`tool_choice="none"` is a no-op on Anthropic, deliberately.** Hermes'
`anthropic_adapter.py` maps `"none"` to *dropping the tools array*, and a
request whose history contains `tool_use` blocks with no `tools` is rejected.
The grace call always has such history. Burning the one recovery call on a 400
is worse than letting the notice stand alone, so that path emits the notice
only. This is the one behaviour in the change set that **could not be verified
here** — it needs live Anthropic credentials.

## Shipped

### F1 — budget grace call (`agent/finalization_reserve.py`)

Pure policy module: given the counters, what should this iteration do. Wired at
the exhaustion branch of `conversation_loop`, which now injects the notice, arms
`_budget_grace_call`, and asks for `tool_choice="none"` on the extra request.
Parent (`agent.max_turns`) and subagents (`delegation.max_iterations`) run the
same loop, so one change covers both.

Notices are stripped before summarisation (`context_compressor`), because a
later turn reading "you are entering the finalization reserve" as an
established fact about work it is just beginning would wind down for no reason.
FrontierAgent needed the same filter and keeps a prefix table for it; a bounded
marker makes it one regex.

### F1e — rescue (`tools/subagent_rescue.py`)

When a subagent ends abnormally *and* wrote nothing, one tool-free LLM call
recovers an answer from its own transcript. Falls back to the partial output,
then to a mechanical account assembled from the tool trace. Which rung produced
the text is recorded as `rescue_mode` on the result — the same reason
`settlement` is kept out of `summary`.

Fires only when the alternative is an empty result, so a delegation that worked
pays nothing. The transcript is flattened into one user message, which
sidesteps the protocol damage (assistant turns whose tool results were dropped)
that makes a damaged history unsendable. The instruction explicitly forbids
inventing results, because a model asked to produce an answer from a failed run
will otherwise oblige.

### F2 — reasoning runaway (`agent/reasoning_runaway.py`)

Hermes detected one shape of this: `<think>` tags left in the content. The shape
it could not see is the one that matters most — SGLang, vLLM and most
aggregating gateways strip the reasoning channel, so `content` is `None` with no
tags, the reply falls through to the truncation path, and four continuation
retries each reproduce the runaway. Four paid calls for an empty result.

Three tiers, most reliable first: think tags; `reasoning_content` /
`reasoning_details` present with no visible text (**data Hermes' transports were
already capturing and nothing had used to answer this question**); and, as a
fallback, `finish_reason="length"` with a completion too large to be a plain
empty reply.

On a hit, one resample at half the observed completion size, with a reminder
that never enters the durable transcript. Halving is what changes the outcome —
more room is more room to think in. Floored at 1024 because below that a
capped-empty completion is no longer distinguishable from an ordinary empty
reply, so shrinking further would trade a diagnosable failure for a silent one.

The retry runs on the **inner** attempt loop, not the outer one. The outer
restart rebuilds `api_messages` (discarding the reminder before it is sent) and
the continuation path there *boosts* `_ephemeral_max_output_tokens`, undoing the
reduced cap that is the actual fix.

### F3 — prose repetition (`agent/text_repetition.py`)

`tool_guardrails.py` catches repeated tool calls. Nothing caught an agent that
stops calling tools and just restates its plan every turn. Word-bigram shingles
compared by Jaccard, deliberately not character trigrams (every trigram crossing
an edit boundary changes, so they over-react to small rewording).

Advisory only, by design and by FrontierAgent's own discipline: a false positive
is cheap as a nudge and expensive as a halt, and a legitimately repetitive turn
is a real thing an agent does. The module exposes no stop mechanism at all.

Localised hints for Chinese, Japanese and Korean. The script checks run kana and
Hangul **before** Han — Japanese prose is full of kanji, so a Han-first check
labels every Japanese turn Chinese. A test asserts it.

### F4 — DNS rebinding (`tools/url_safety.py`)

This module's own Limitations section said the hole could not be closed at
pre-flight level and needed connection-level validation. This is that
validation: `resolve_safe_addresses()` returns the addresses it vetted and
`pin_to_address()` rewrites the request to dial one of them, so no second
resolution can substitute a private address.

The hostname is preserved twice — in the `Host` header for virtual-host routing,
and in the `sni_hostname` extension, which drives TLS SNI *and* the certificate
hostname check. Getting that second one wrong is the only way this function can
quietly make things less safe, so it is asserted first in the tests.

⚠️ **Scope, stated honestly.** Wired into the gateway image-cache fetch, and it
pins the **first hop only** — redirects are still resolved by httpx, and the
existing `_ssrf_redirect_guard` re-validates each hop but cannot pin them.
Hermes' main web extraction runs through third-party SDKs (Firecrawl, Tavily)
where the connection is made inside the vendor's process: **pinning cannot reach
those at all.** `is_safe_url()` keeps its old signature and its old behaviour, so
every caller that does not opt in is exactly where it was.

### F5 — budget consistency (`agent/budget_consistency.py`)

Warns at startup when `max_tokens` is at or above the context window, or eats
more than half of it. The first case is invisible today because
`_compute_threshold_tokens` falls back to the raw window when
`context_length - max_tokens <= 0` — correct for the compressor, and it means
the misconfiguration surfaces only as provider rejections. Warnings only; a
deploy running today with an odd combination keeps running.

## Not adopted, with the reason

| Item | Why not |
|---|---|
| `stuck_target_guard.py` (498 lines) | Quarantines repeatedly-failing fetch hosts, but the predicate is their web tools' error-string vocabulary (`[NOT RENDERED]`, `[ACCESS BLOCKED]`…). Hermes' web output has a different shape; porting means rewriting the predicate |
| `duplicate_query_rollback.py` (312 lines) | Same — bound to their search tool's semantics |
| `apodex/changes.py`, `apodex/fsguard.py` | Hermes' `checkpoint_manager.py` (git shadow repo) and `file_state.py` are both stronger |
| `apodex/diff_preview.py` | The design is right — compute the diff from disk so the human sees facts, not the model's claim about them. But Hermes' approval layer covers shell and `execute_code` only; file writes have no gate to attach it to. Building that gate is a larger change |
| Task board | Hermes has `kanban_db.py`. Theirs also does not survive a resume: `session_history.py` deliberately strips `add_task`/`update_task` from replay, and the checkpoint does not contain the board |
| `AgentBus` (1,884 lines) | Its self-described "Core API" — `submit()` / `collect()` / `abort()` — has **zero production callers**; only tests exercise it. `SharedArtifactPool`, `AgentComm` and the `EventStore` (44 lines, every method returns `None`/`[]`) are dead. The reusable part is `fan_in.py`'s stop-reason classification, which is the same discipline as D1's `derive_stop_reason` |
| "Installs only what a task needs" | There is no installer. ~35 environment variables are redirected (`PIP_TARGET`, `PYTHONPATH`, `GOPATH`, …) and the prompt tells the model to run `pip install` itself. `pip` sits at *audit* severity in their bash policy, with no index pinning, hash checking or allowlist |
| `benchmarks/` (39.5k lines), `apodex/` TUI (26.5k lines) | Their evaluation suite and their own terminal product |

## Claims that do not survive reading the code

Recorded because they were checked, and because two of them are the mirror image
of decisions this session already made:

- **The approval gate fails open on exception.** `core/loop_types.py`'s
  `notify_tool_call` swallows observer exceptions and continues with
  `skip_with_result` still `None` — a `TypeError` in the renderer means the tool
  **executes unapproved**. `critical = True` means "awaited inline", not "errors
  are fatal". B1's takeover gate fails closed.
- **Agent Team subagents have no gate at all.** Their observer stack omits
  `TerminalObserver` entirely, and `create_subagent` / `assign_task` are
  classified `RISK_SAFE` (read-only). Dispatching a subagent that will write
  files is auto-approved as read-only, and that subagent's writes and shell
  commands never see a prompt. The README's "mutating operations require
  approval" is materially false in that mode.
- **The trace is weaker than B4's audit log in four ways**: no redaction (`args`
  and `result` are written verbatim), no rotation, written **after** the action
  (there is no `on_tool_call` hook, so a tool that hung or crashed leaves no
  record it was ever attempted), and approval decisions are not recorded at all
  — the log cannot distinguish "the human said yes" from "auto-approve was on"
  from "the gate crashed and it ran anyway". A complete redaction stack exists in
  `deploy/huggingface/security.py` (413 lines) and is simply not wired in.
- **The depth limit and the token budget are both inert in production.**
  `bus.py` hardcodes `dispatch_depth = 1` while the only `SpawnGuard` is built
  with `max_depth=2`, so `1 >= 2` never fires; recursion is prevented by
  tool-pool configuration instead. Every `pre_check` call site passes
  `estimated_tokens=0`, and the budget check is gated on `> 0`.
- **The README invents a task-board state.** It lists `blocked`; the actual
  vocabulary is `open` / `in_progress` / `resolved` / `cancelled`. It appears to
  have merged the agent-team board with `apodex/todo.py`'s separate one.
- **No `ask_user`-style tool exists** (`ask_user|ask_human|request_user_input|
  human_input|prompt_user` is zero-hit), and nothing lets a person supply a value
  the model never sees. Nothing to take for B2 or B5.
- **No Landlock, no seccomp, no direct namespace syscalls.** The sandbox is the
  `bwrap` binary. The only `seccomp` reference in the repo *relaxes* the profile
  (`seccomp=unconfined` in `compose.yaml`).

## Testing, and what is not verified

161 new tests, all passing. `tests/agent/` holds at its baseline 149 failures
and `tests/tools/` at its baseline set — both compared against `b6a8866` with a
`git worktree`, failure sets diffed rather than counts matched.

⚠️ **Not verified against live providers.** Two things need a real endpoint:

1. **The Anthropic branch of the grace call.** Whether a request carrying
   `tool_use` blocks in history with no `tools` array is actually rejected is the
   premise for making `tool_choice="none"` a no-op there. The conservative
   behaviour is what shipped — the notice goes out either way — but the premise
   itself is untested here.
2. **The reasoning-runaway tiers against a real gateway.** The classification is
   fully unit-tested, but no request in this environment has ever come back from
   an SGLang or vLLM endpoint with a stripped reasoning channel, so the shape of
   the response those actually return is taken from FrontierAgent's code rather
   than observed.

`pin_to_address` is the piece most worth exercising against a real host: a
mistake in the SNI half would leave certificate verification silently checking
the wrong name, and no unit test can prove the TLS stack honours the extension
the way the docstring says it does.
