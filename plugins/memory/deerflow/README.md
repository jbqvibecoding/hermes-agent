# deerflow-memory

DeerFlow-style **cross-session memory** implemented against Hermes'
`MemoryProvider` ABC (`agent/memory_provider.py`). It plugs into the existing
memory manager alongside honcho/mem0/etc. and reuses your **active Hermes model**
for fact extraction — no separate provider credentials.

## Enable

Select it as the active memory provider (only one external provider runs):

```yaml
# config.yaml
memory:
  provider: deerflow
```

…or `HERMES_MEMORY_PROVIDER=deerflow`. Storage lives under
`$HERMES_HOME/deerflow-memory/users/<user_id>/memory.json`.

## What it does

- **Schema** (DeerFlow's): `user`/`history` context summaries + a `facts` list of
  `{id, content, category, confidence, createdAt, source}`.
- **Capture**: buffers each turn; on context compression / session end it asks
  the host LLM to extract durable facts (preferences, tech stack, recurring
  context), de-duped against what's already stored.
- **Recall**: injects the top-15 facts as a `<memory>` block before each turn.
- **Staleness**: facts older than `staleness_age_days` (180) become pruning
  candidates; the removal set is unconditionally intersected with genuine stale
  candidates so protected categories (`correction`) and non-aged facts can never
  be pruned.
