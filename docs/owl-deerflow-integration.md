# owl + DeerFlow → Hermes integration

This documents the integration that brings **owl's tool capabilities** and
**DeerFlow's AI-workspace patterns** into Hermes, for the cloud Hermes AI
workspace product. It is delivered entirely inside `hermes-agent` as two
bundled plugins, using Hermes' own edge-extension seams — no core files are
special-cased.

## Guiding facts (from studying the three repos)

- **owl has almost no toolkit code of its own** — the toolkits (Search, Browser,
  code exec, `*AnalysisToolkit`, Arxiv, Excel, …) live in the `camel-ai`
  package (`camel.toolkits.*`) that owl depends on. So "reuse owl" = reuse the
  CAMEL toolkits.
- **Hermes already has** skills, sub-agents (`delegate`), sandbox
  (`environments/`), long-term memory (`MemoryProvider`), and context
  compression. DeerFlow's value is a set of refined *designs*, not net-new
  subsystems — so we adopt the designs and avoid duplicating subsystems.
- **Hermes is a narrow-waist core**: capability arrives at the edges (plugins,
  skills, MCP, `MemoryProvider`, environments) and large tool catalogs defer
  behind the **Tool Search bridge**.

## What shipped

### `plugins/camel_tools/` — owl/CAMEL tool bridge
- `adapter.py` converts a CAMEL `FunctionTool` → Hermes `(name, schema,
  handler)` (duck-typed; unit-testable without `camel-ai`).
- `catalog.py` declares which toolkits to expose and in which non-core
  toolset (so they defer behind Tool Search).
- `hermes_camel_backend.py` routes model-dependent toolkits' LLM calls back to
  the host model (`call_llm`) — multimodal + browser work with no extra keys.
- `workspace.py` implements DeerFlow's `/mnt/user-data/{uploads,workspace,
  outputs}` contract (+ Docker volume-spec generation).
- `skill_archive.py` ports DeerFlow's hardened `.skill` archive extraction
  (traversal / symlink / executable-magic / zip-bomb defences).
- `camel-ai` is an on-demand dependency (`/camel-tools install`); the plugin
  degrades gracefully when it's absent.

### `plugins/memory/deerflow/` — DeerFlow-style memory
A `MemoryProvider` implementation (fact schema + host-LLM extraction +
age-based staleness pruning with an unconditional guardrail). Activate with
`memory.provider: deerflow`.

See each plugin's `README.md` for usage and configuration.

## Mapping owl/DeerFlow features → Hermes seams

| Source feature | Hermes seam used |
|---|---|
| owl online search / file / academic / math tools | `ctx.register_tool` (non-core toolset) → Tool Search bridge |
| owl multimodal + browser | same, + `HermesCamelBackend` → host `call_llm` |
| DeerFlow `/mnt/user-data` workspace | `workspace.py` contract + Docker `volumes=` |
| DeerFlow `.skill` install hardening | `skill_archive.py` + `/camel-tools install-skill` |
| DeerFlow long-term memory | `MemoryProvider` plugin (`plugins/memory/deerflow/`) |
| DeerFlow sub-agents / context engineering | Hermes native `delegate` + `context_compressor` (reused as-is) |

## Deliberate omissions (reuse what Hermes lacks, don't duplicate)

- CAMEL `CodeExecutionToolkit` → Hermes native sandboxed code execution.
- CAMEL `DalleToolkit` → Hermes native `image_gen`.
- owl `DocumentProcessingToolkit` → heavy dep tail; document→text via uploads.

## Follow-ons (require live infra to verify)

- Wiring the `/mnt/user-data` volume specs into a live Docker environment +
  uploads auto-conversion (needs a Docker sandbox).
- Enriching `tools/delegate_tool.py` results with DeerFlow's additive subagent
  status contract (`subagent_status`/`stop_reason`/`result_brief`) — needs live
  subagent runs to verify.
