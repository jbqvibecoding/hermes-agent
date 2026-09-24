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
| `crew/artifacts.py` | `octop/infra/agents/middleware/thread_artifacts.py` | MIT | the path keys, the "looks like a file" predicate, args-before-result |

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

**A tool result is read for paths only when the arguments gave none** (octop).
A result is text the tool wrote and may mention a file it never touched; an
argument is what the call was actually about.

## Where we diverged, and why

**Artifacts come from the workspace, not from an allow-list of tools.** octop
records files from `write_file`, `edit_file`, `send_file` and
`desktop_screenshot`. That is right for an agent that writes files by calling a
file tool. Ours does not: asked for a deck, a teammate writes `make_deck.py` and
runs it, and the `.pptx` appears as a side effect of a `terminal` call whose
result says nothing about it. A tool-name allow-list would miss the exact case
the operator cares about, so `crew/artifacts.py` scans the workspace and treats
the filesystem as the truth. The tool-name list is kept for the case where one
of those tools *is* used, because then its arguments are the better answer.


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

## `crew/proactive/` — from octop `src/octop/infra/proactive/` (MIT)

`scheduler.py` ports `compute_next_trigger` almost verbatim; it was already a
pure function upstream, with no `self` and no I/O. `picker.py` keeps the
scoring structure — `intensity x weight x recency`, dedup, a top-K cut, and
widening the window rather than falling silent. `service.py` keeps the
procedure and its step order.

**The scoring axes are not octop's, and the substitution is the point.** Its
weights are emotional — 1.5 for sad, angry or anxious, 1.2 for tired — because
it is a companion product scoring episodes from a memory store. Copying that
table into a work tool would have meant first building a sentiment classifier
over work threads: inventing an input to fit an algorithm. What a teammate
actually owes somebody an unprompted word about is unfinished business, and
crew.db already records all of it — an approval released and never seen
through, one that expired undecided, a routine suspended after repeated
failure. So `intensity` becomes how long a thing has been stuck, and dedup by
person becomes dedup by subject.

**Two departures that are improvements rather than adaptations.** octop holds
each agent's next time in an `asyncio.Task` that sleeps for hours, and a
restart re-rolls every one of them — a gateway that restarts often can starve a
teammate indefinitely, with silence as the only symptom. Ours is a column read
by a loop that already runs, so the wait survives the restart. And its
`is_in_active_hours` reads `start <= t < end`, which makes a window that wraps
past midnight silently empty; ours reads a wrapping window as wrapping.

Its `_MIN_SLEEP_SECONDS` anti-spin guard is kept, as a floor on how soon
anything may be scheduled. The autouse fixture its own test suite needs — the
one that no-ops `ensure_scheduled`/`start_all` so a multi-hour `asyncio.sleep`
does not hang pytest in teardown — is not ported, because with the schedule in
a column there is nothing that sleeps.

## Not taken

**openworkbuddy** is PolyForm Noncommercial 1.0.0, which its own FAQ says binds
forks and derivative works, and which conflicts with this repo's MIT. Nothing
from it is vendored and no file here is derived from it. Where it shaped a
design decision the code says so in prose and nothing was copied.
`crew/verify.py` is the clearest case: the observations behind it — that a
zero-byte file is a failed delivery, that announcing the check and running it
are both necessary, that the whole thing must lean toward letting work through
— came from reading about its incidents, and every line of the file is written
from scratch against our own workspace and turn loop.

**`octop/experts/library/office-automation/skills/{docx,xlsx,pptx,pdf}/`**
carries an Anthropic proprietary licence and is *not* covered by octop's MIT.
Not one word is taken; document generation uses upstream `python-pptx`,
`python-docx` and `openpyxl` directly.

**CopilotKit Intelligence**, which OpenBot and OpenMuse both depend on for
conversation persistence — OpenBot's schema has no messages table at all. We
have `crew.db`, which is the opposite architecture.
