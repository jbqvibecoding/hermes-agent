# CAMEL-AI → Hermes: findings & integration

We studied **CAMEL-AI** (`camel-ai/camel`) for things that could enhance the
owl/DeerFlow integration already in `plugins/camel_tools/`.

**Headline:** this repo is not a new source — it *is* the upstream of that
integration. Our earlier conclusion "reusing owl means reusing CAMEL toolkits"
is literally true: every `camel.toolkits.*` class the plugin wraps ships from
here. So the work was to take the dependency seriously — upgrade it, wrap the
parts of it we had been missing, and pull two self-contained pieces out of the
non-toolkit subsystems.

Verified state before the work (read-only checks, not assumptions):

- `plugins/camel_tools/workspace.py`'s `resolve_workspace` / `docker_volume_specs`
  had **no callers** outside their own tests — the `/mnt/user-data` contract was
  defined but never used.
- `catalog.py` claimed document parsing was "handled by the `/mnt/user-data`
  upload auto-conversion path (M4)". **That path did not exist.**
- `tools/binary_extensions.py` makes `read_file` refuse binary extensions, so
  uploaded PDF/Word/Excel/PowerPoint files were unreadable by the agent.
- The catalog wrapped 15 toolkit specs out of ~70 exports.

## Version facts

Established by downloading the `camel-ai==0.2.84` wheel we were pinned to and
diffing it file-by-file against upstream, rather than guessing:

- `camel/toolkits/base.py` is **byte-identical** across the range, and
  `FunctionTool`'s public surface (`.func`, `get_openai_tool_schema()`, name,
  description) is unchanged — the duck-typed adapter could not break on upgrade.
- Of our 15 wrapped toolkits only 4 changed: `SearchToolkit` (+3 key-gated
  engines), `ArxivToolkit` (optional `filenames`), `GithubToolkit` (**bug fix**:
  `github_get_all_file_paths` was dropping `repo_name` when recursing into
  subdirectories), and `MathToolkit` (**behavior change**: `math_divide` returns
  the string `"Error: Cannot divide by zero."` instead of raising).
- Almost everything we were not wrapping (`FileToolkit`, `DataCommonsToolkit`,
  `PPTXToolkit`, `TerminalToolkit`, `HybridBrowserToolkit`, …) **already existed
  in 0.2.84**. That was our gap, not a version gap.

Pinned to **0.2.90**, the latest stable at time of writing. Upstream `main` is
`0.2.91a5`, an alpha — deliberately not pinned.

## Shipped

### `plugins/camel_tools/adapter.py` — async invocation fix
The adapter resolved `FunctionTool.func` and called it synchronously. For a
toolkit method declared `async def` that returns an **unawaited coroutine
object**, which was then serialized into the tool result — a silent wrong
answer, not an error. None of the 15 wrapped toolkits are async, so it had not
fired, but any of the browser/MCP toolkits would have triggered it.

The adapter now prefers calling the `FunctionTool` itself (which also gives
CAMEL's Pydantic argument coercion for free) and resolves any awaitable result
on a persistent background loop before returning.

### `plugins/camel_tools/schema_guard.py` — schema hardening
Ports CAMEL's `_add_additional_properties_false` walk so every nested object in
a tool's parameter schema gets `additionalProperties: false`. Without it, a
schema accepts undeclared keys, so anything validating a tool call against it
(permission gate, approval hook, policy adjudicator) can be walked past by
attaching extra fields.

Only that half of upstream's `sanitize_and_enforce_required` is ported. The
rest — stripping `default`, forcing every property into `required` as nullable —
exists for OpenAI *strict mode*, not safety, and would push models to pass
explicit nulls where CAMEL expects the argument omitted.

### Catalog expansion
`DataCommonsToolkit` is now wired. It was named in the original owl toolkit
list and was the only entry never connected and never documented as a
deliberate skip (`CodeExecution` / `Dalle` / `OpenAPI` all have recorded
reasons). Also added, all env-gated: `FileToolkit`, `PPTXToolkit`,
`PubMedToolkit`, `SearxNGToolkit`, `WolframAlphaToolkit`, `AskNewsToolkit`,
`GoogleCalendarToolkit`, `GmailToolkit`, `SlackToolkit`,
`VideoDownloaderToolkit`.

`ToolkitSpec` gained two small fields for constructors that need runtime
values: `env_kwargs` (SearxNG takes a required self-hosted host) and
`workspace_kwarg` (file-writing toolkits point at `/mnt/user-data/workspace`).

### `plugins/camel_tools/uploads.py` — uploads → Markdown
Ports `MarkItDownLoader`. Of every loader in `camel/loaders/`, it is the only
one that is local, needs no API key, emits Markdown directly, and covers PDF +
Word + Excel + PowerPoint in one call — the cloud readers (Chunkr, MinerU,
Firecrawl, Crawl4AI, Jina, Apify) all need network and secrets, and `base_io.py`
emits plain text with no xlsx/pptx support at all.

It depends on **`markitdown` directly, not via `camel-ai`**, so document
conversion works on installs that never enable the CAMEL bridge and a converter
does not drag in CAMEL's dependency tree. Exposed as the `convert_uploads` tool
and `/camel-tools convert`; it returns written paths rather than document text,
so a large document does not land in the model's context wholesale.

This is also the first thing that actually *uses* the `/mnt/user-data` contract.

## Deliberately not done

| Item | Why |
|---|---|
| `camel/societies/workforce/` (12,550 lines) | Conflicts head-on with `tools/delegate_tool.py`, and is deeply coupled to `ChatAgent`. |
| All 6 `camel/runtimes/` backends | Hermes has 6 sandbox backends. `camel/runtimes/api.py` also binds tool execution to `0.0.0.0:8000` with **no authentication** — a cautionary example, not an asset. |
| `LLMGuardRuntime` | Needs a live `ChatAgent` + `ModelFactory`. More importantly it ships `IgnoreRiskToolkit`, letting the *audited agent itself* call `ignore_risk()` to skip its next check — a self-granted bypass, contrary to how our permission gate and declarative hooks work. |
| `check_command_safety` / `DANGEROUS_COMMANDS` | Recommended during research; rejected after checking. `tools/approval.py` already carries 12 HARDLINE + 47 DANGEROUS patterns and blocks **any** `bash -c` outright, which is stricter than CAMEL's "extract the payload and re-check it". Porting would be a downgrade. |
| `ScoreBasedContextCreator` | Read in full: the current version no longer enforces `token_limit` and never reads `score`. There is no budgeting algorithm left to port. |
| `VectorDBMemory` / `LongtermAgentMemory` / `AutoRetriever` | Default to `OpenAIEmbedding` (network + key) plus Qdrant. Too much for the gap. |
| `AgentToolkit` | Only works when running real CAMEL `ChatAgent`s; not portable. |
| `HybridBrowserToolkit` | Requires a Node.js + npm Playwright runtime beside Python — a real deployment cost, not a `pip install`. |
| `HeadlessBrowserSearchToolkit` | Hand-written JS scraping Google/Bing/Brave SERP DOM; breaks whenever those pages change. |
| `MarkItDownToolkit` | Deprecated upstream in favor of `FileToolkit.read_file`. |
| `TodoToolkit` / `SkillToolkit` / `PlanningWorktreeToolkit` | Hermes already ships kanban, a skills system, and worktrees. |
| `TwelveLabsToolkit` | Overlaps `VideoAnalysisToolkit`; paid API. |
| `camel/interpreters/`, `verifiers/`, `environments/`, `datagen/`, `benchmarks/` | Covered by existing Hermes capability, or RL/data-generation work unrelated to an AI workspace. |

## Deferred (researched, not built)

- **Workspace directory fence.** The one place CAMEL genuinely fills a Hermes
  gap: nothing in the repo does `commonpath`-style containment of `cd`/`pushd`.
  `camel/toolkits/terminal_toolkit/utils.py` resolves the target (quoted or not,
  with `expanduser`/`expandvars`/`normpath`) and verifies it stays under the
  working directory, conservatively refusing `cd -`, `cd $(...)`, and multiple
  chained `cd`s. Pure stdlib, ~120 lines of relevant logic.
- **Memory injection budget.** `prefetch` currently takes the top 15 facts by
  confidence with no token budget and no relevance ranking. CAMEL contributes
  only an idea here (the exponential recency decay in `ChatHistoryBlock.retrieve`,
  ~15 lines); the actual work would reuse **Hermes'** own BM25
  (`tools/tool_search.py`) and token estimator (`agent/context_compressor.py`),
  so it is mostly new code rather than reuse.

## Licensing

CAMEL is Apache-2.0; Hermes is MIT. Earlier ports (OpenHarness) were MIT→MIT,
where a docstring credit sufficed. Apache-2.0 §4 requires retaining the notice
and stating changes, so each derived file carries an attribution header
describing its modifications, and `NOTICE` at the repo root lists them.
