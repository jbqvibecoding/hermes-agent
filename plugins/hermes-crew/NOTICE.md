# Third-party code in `hermes-crew`

Hermes Agent is MIT. Everything credited here is MIT or Apache-2.0, so it can
live in this tree; the table says which file came from where and what changed,
so the next person can tell a deliberate divergence from a transcription error
when the upstream moves on.

Nothing here is a verbatim copy — these are Python rewrites of TypeScript, or
of Python with a different database under it. What was actually taken is the
*design*: the vocabulary, the invariants, and in several cases a specific
decision whose alternative looks more obvious and is worse. Those are called
out below, because they are the parts worth not re-deciding.

| Here | From | Licence | What was taken |
|---|---|---|---|
| `crew/approvals.py` | `opengrokbot/src/approvals.ts` | MIT | draft-and-hold; the SQL idempotency guard |
| `crew/approvals.py` | `openmuse/apps/server/src/actions.ts` | MIT | the content hash, the idempotency key, the expiry |
| `crew/approvals.py` | `octop/infra/gateway/hitl/store.py` | MIT | the short typeable `ref` |
| `crew/grants.py` | `openbot/server/src/db/schema/plugins.ts` | MIT | the grant table's shape, and its refusal to have an `enabled` column |
| `crew/grants.py` | `octop/.../tool_catalog.py` | MIT | `CRITICAL_TOOLS`; `available` ≠ `enabled` |
| `crew/policy.py` | `rowboat/runtime/assembly/permission-metadata.ts`, `core/src/security/auto-permission-classifier.ts` | Apache-2.0 | the three-stage ladder, and its fail-safe direction |
| `crew/audit.py` | `openbot/server/src/audit.ts` | MIT | the event vocabulary; allowed / refused / failed as three types; `policy_loaded` |
| `crew/audit.py` | `octop/infra/db/repos/audit.py` | MIT | the reserved actor sentinels |
| `crew/activity.py` | `errand/src/domain/types.ts`, `src/clients/http/RuntaCloudAgentsClient.ts` | Apache-2.0 | `ActivityEvent` and its five kinds |
| `crew/contract.py` | `errand/src/domain/CloudAgentsClient.ts` | Apache-2.0 | the whole `/v1` domain model |
| `crew/db.py`, `crew/sections.py` | `grok-bot/shared/sidebar-sections.ts` | MIT | the org chart and its `__agents__` sentinel |

## The decisions worth not re-deciding

**No `enabled` column in `grants`** (OpenBot). A row *is* the permission and a
missing row *is* the refusal. Its own comment puts it best: an `enabled`
boolean makes a missing row undefined behaviour, and undefined behaviour in a
grant table resolves to "allowed" the first time somebody is in a hurry.

**Allowed is not the same as happened** (OpenBot). A permitted action that then
fails gets its own row. A ledger that cannot tell "we let it" from "it worked"
misleads exactly when somebody is reading it to find out what went wrong.

**The rules in force are written down at boot** (OpenBot). Grants live in
SQLite but the risk table lives in the build, so an upgrade can change what
"default" means without a row changing. Without `policy_loaded`, last month's
refusals cannot be interpreted at all.

**The classifier fails safe, always** (rowboat). Any failure — no model, a
timeout, an unparseable answer — resolves to "ask". Failing open turns one
outage into an unguarded teammate; failing closed costs one card nobody needed.

**Refuse a decision made against a stale card** (OpenMuse). Approving something
other than what you read is the single failure the hold exists to prevent, and
between render and click the card can be rewritten underneath the operator.

## Where we diverged, and why

**The risk table.** OpenBot's grants are a pure allow-list: no row, no tool.
That works for a product where a plugin declares the handful of things it does.
A Hermes profile arrives with ~28 toolsets already enabled, so a bare allow-list
would make every newly hired teammate inert until somebody clicked through a
hundred tools. `crew/grants.py::default_mode` is a written-down risk table
instead, and the rules are grounded in the real tool names in `toolsets.py`
rather than invented categories.

**`block`, not the host's `approve`.** Hermes's `pre_tool_call` can return
`{"action": "approve"}`, which escalates to the synchronous human gate in
`tools/approval.py`. That is right for a dangerous `rm` with somebody at the
keyboard. A crew approval may sit until tomorrow morning, and blocking a thread
that long would pin a model context, burn the prompt cache, and lose the work to
any restart — so the guard blocks the call and ends the turn, and the decision
starts a fresh one.

**The ledger stores a digest, never the arguments.** OpenBot redacts 28 key
names on the way past, and its own comment says the quiet part: relying on
redaction means the secret was already placed in the payload and caught in
transit. A teammate's tool calls carry tokens and passwords, and a table the
dashboard can read is the wrong place for them to be at all.

## Not taken

**openworkbuddy** is PolyForm Noncommercial 1.0.0, which its own FAQ says binds
forks and derivative works, and which conflicts with this repo's MIT. Nothing
from it is vendored and no file here is derived from it. Where it shaped a
design decision the code says so in prose and nothing was copied.

**`octop/experts/library/office-automation/skills/{docx,xlsx,pptx,pdf}/`**
carries an Anthropic proprietary licence and is *not* covered by octop's MIT.
Not one word is taken; document generation uses upstream `python-pptx`,
`python-docx` and `openpyxl` directly.

**CopilotKit Intelligence**, which OpenBot and OpenMuse both depend on for
conversation persistence — OpenBot's schema has no messages table at all. We
have `crew.db`, which is the opposite architecture.
