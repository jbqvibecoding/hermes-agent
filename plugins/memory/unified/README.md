# Unified Memory Provider

One memory mechanism fusing the strengths of six systems, served by the
[`hindsight-unified`](https://github.com/jbqvibecoding/hindsight/tree/claude/hermes-unified-memory-fu39t4/hindsight-unified)
sidecar:

| Contributor | Layer it owns |
|---|---|
| **Hindsight** | Retrieval/storage brain — fact + entity + temporal graph, 4-strategy RRF recall, rerank, mental models, reflect |
| **EverOS** | Markdown-as-truth durable substrate + crash-recovery reconciliation |
| **mempalace** | Verbatim / 100%-recall discipline, AAAK index triage, embedder-identity safety |
| **OpenViking** | Tiered, token-budgeted context assembly + observable retrieval trajectory |
| **MemOS** | MemCube portability (dump/load) for backup & transfer |
| **tencentdb-agent-memory** | L0→L3 pipeline shape + this sidecar/thin-provider pattern + reliability engineering |

## Architecture

```
Hermes agent
  └─ UnifiedMemoryProvider (this plugin: stdlib HTTP client + supervisor,
     circuit breaker, watchdog, bounded background syncs)
       └─ HTTP → hindsight-unified sidecar (python -m hindsight_unified.server)
            ├─ L0 verbatim markdown substrate  (always on, truth)
            ├─ L1 Hindsight MemoryEngine       (semantic index, optional)
            ├─ L2 consolidation + reconciliation
            └─ L3 reflect (persona synthesis)
```

Markdown is the source of truth; the semantic index is a rebuildable
derivative. If the Hindsight brain is unavailable (missing deps / DB), the
sidecar reports `degraded` and keeps working on verbatim keyword recall.

## Setup

```bash
# Option A: install the sidecar package into the Hermes environment
pip install -e /path/to/hindsight/hindsight-unified          # zero deps
pip install -e "/path/to/hindsight/hindsight-unified[all]"   # + all six engines

# Option B: point the provider at a checkout
export UNIFIED_MEMORY_SIDECAR_CMD="python -m hindsight_unified.server"
```

Activate in Hermes config:

```yaml
memory:
  provider: unified
```

## Environment variables

| Var | Default | Meaning |
|---|---|---|
| `UNIFIED_MEMORY_GATEWAY_HOST` | `127.0.0.1` | Sidecar host |
| `UNIFIED_MEMORY_GATEWAY_PORT` | `8766` | Sidecar port |
| `UNIFIED_MEMORY_SIDECAR_CMD` | auto-discover | Launch command |
| `UNIFIED_MEMORY_HOME` | `$HERMES_HOME/unified` | Data root (md substrate) |
| `UNIFIED_MEMORY_ENABLE_HINDSIGHT` etc. | `true` | Per-engine enable flags (sidecar side) |

## Tools exposed to the model

- `unified_memory_search` — fused fact recall (semantic+keyword+graph+temporal)
- `unified_conversation_search` — verbatim past dialogue (exact words)
- `unified_memory_reflect` — synthesized reasoning over all memories
