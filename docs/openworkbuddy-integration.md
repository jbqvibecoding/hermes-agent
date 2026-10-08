# OpenWorkBuddy → Hermes: findings, and why no code came across

Source: [jbqvibecoding/openworkbuddy](https://github.com/jbqvibecoding/openworkbuddy)
at `f2596bb`. JavaScript, 112 files / 72,987 lines, flat layout at the repo root,
plus 18 Python files (4,429 lines) almost entirely under `skills/docx/scripts/`.

**This round changed no code.** It is a research round only. The gaps it found
are recorded below as candidates, not as work done.

---

## The licence comes first, because it decides what this round could be

OpenWorkBuddy is under the **PolyForm Noncommercial License 1.0.0**
(`LICENSE:1-11`) — source-available, non-commercial use only. Its
`COMMERCIAL-LICENSE.md` names, among the uses that require a separately
purchased commercial licence:

> - building a SaaS or a product on it and offering that service to others
> - bundling it into software or hardware you sell

Hermes is **MIT**, and the product being built on Hermes is a commercial cloud
AI workspace. That is the first of those two bullets.

So: **none of its code can enter this repository.** Not a function, not a
distinctive comment, not a data structure's particular shape. This is not
caution for its own sake — mixing PolyForm-licensed code into an MIT product
puts the obligation on whoever ships that product.

What is permitted, and what this round did:

| Done | Not done |
|---|---|
| Read the source — its own licence grants reading freely | Copy any of its code |
| Learn the problem definitions and the techniques | Reproduce its particular expression of them |
| Record what Hermes should do independently | Add a `NOTICE` entry |

**No `NOTICE` entry, deliberately.** For the Apache-2.0 and MIT sources in
earlier rounds a NOTICE entry was *required* by their licences. Here a NOTICE
entry would assert that this repository contains PolyForm-licensed material —
which is the exact thing being avoided. Attribution of an *idea* is what this
document is for.

The practical impact is smaller than it sounds: the repository is JavaScript, so
line-by-line porting into Python was never available anyway. Earlier rounds
(OpenBot, deepseek-harness, wanman, FrontierAgent's TypeScript siblings) carried
designs rather than code for that reason. The difference here is that the
constraint is legal rather than linguistic, so it was applied more strictly —
problem definitions only, no reproduction of how they expressed them.

---

## What it is

A local-first office agent: Electron desktop app plus a self-hosted server. The
headline is "deliver files, not chat logs" — real `.pptx` / `.docx` / `.xlsx` /
HTML on disk. 30 built-in "experts" and 9 teams, skills as single Markdown
files, MCP connectors, Feishu / QQ / WeCom / WeChat bridges, scheduled tasks,
and a bundled Chromium for rendering pages the fetch path cannot read.

Largest modules: `server.js` (4,693), `tools.js` (3,571), `agent.js` (2,543),
`im.js` (1,444), `cli.js` (1,049).

---

## Finding 1 — the flagship feature is real, and considerably weaker than advertised

The README's central claim, repeated in the Chinese feature list:

> Files, not chat logs. … **If the model claims it wrote a file that isn't on
> disk, the run is stopped and redone.**

**What is real.** `agent.js:1943-1960` is a genuine gate. It fires on the turn
where the model returns *zero tool calls* — i.e. the turn where it is claiming to
be finished. `missingDeliverables` (`agent.js:254-276`) performs a real
`fs.statSync`: a path that does not resolve is recorded `missing`, a zero-byte
file is recorded `empty`, and a specific, actionable correction is pushed back as
a new turn. Treating a 0-byte file as a non-delivery is a thoughtful addition and
the rationale is written down at `agent.js:249-253`.

**What is not.**

| The claim | The code |
|---|---|
| "the run is **stopped**" | Nothing is stopped. The retry cap is 2 (`agent.js:1946`, and `honestyRetries` is declared at `:1725` *outside* the auto-continue loop, so it is 2 for the whole call). Once exhausted, control falls through to `break` at `:2001` and the run returns **as a normal success** — no error, no flag, no marker on the fabricated claim |
| verifies "deliverables" | `stat` + size > 0 only. **No format validation.** A text file renamed `deck.pptx` passes |
| — | No notion of "written during this run". Pure `stat`, no mtime baseline. Worse: relative filenames resolve through a **basename index of the entire workspace** (`agent.js:220-243`, capped at 3,000 entries), so a same-named file left by any earlier conversation in any subdirectory satisfies this run's claim |
| — | **The expectation comes from the model.** There is no up-front declaration and no inference from the request; filenames are regex-scraped from the assistant's own final message (`agent.js:257-261`), gated by a claim regex (`agent.js:212`) that is **Chinese-only** apart from `✅`. "Generated report.pptx" matches nothing and the check silently no-ops. The model effectively sets its own exam |
| — | **Absent on the Claude Code / Codex engine path** (`runViaEngine`, `agent.js:1404-1500`) — the engine the README recommends in the next breath |

The sharpest detail: **it already has the ability to validate format and does not
use it.** `preview.js` (384 lines) is a dependency-free, hand-rolled zip reader
that genuinely distinguishes a real OOXML package from a renamed text file (it
throws when it cannot find the central directory), and it is **already imported
into `tools.js`**. Wiring it into the gate would be a few lines. It is not wired.

**The conclusion worth keeping is the problem definition, not the
implementation.** "An agent that narrates a deliverable it never produced" is a
real failure mode, and worth a first-class name — their evaluation methodology
makes `missing_artifact` a distinct deterministic failure code, ranked *above*
`wrong_output` (`docs/评测方法论.md:32`). Not delivering and delivering wrong are
two different diagnoses.

---

## Finding 2 — where Hermes is already ahead

Recorded because each of these was checked, and several double as evidence for
design choices made earlier in this series.

| Their capability | Hermes |
|---|---|
| `selfCheck` syntax-checks a file after writing it (`tools.js:2033-2142`): `.json` via parse, `.js` via `node --check`, `.py` via `ast.parse`, `.sh` via `bash -n`, `.md` fence parity, `.html` audit | Hermes' `write_file` already does this **and filters better**: it surfaces only errors *this write introduced*, suppressing pre-existing ones (`tools/file_tools.py:2029`). They reduce the same noise with a `{note, bad}` split, motivated by real telemetry — 38 of 41 `write_file` "failures" had in fact written the file. Splitting on *new vs. pre-existing* is the sharper cut |
| `doctor.js` — 438 lines | `hermes_cli/doctor.py` — 2,412 lines |
| Binary AI judge rather than 1–5 rubric scores, to avoid scale drift, length bias (~17pp) and non-reproducibility | `judge_goal` already returns a discrete verdict (`done` / `continue` / `wait` / `skipped`), never a score |
| URL gate | Theirs (`security.js:370-387`) is **hostname-suffix matching with no SSRF defence at all** — no IP literals, no RFC1918/loopback/link-local blocking, no DNS check, no redirect re-validation. Both lists ship empty, and `tools.js:2626` follows redirects, so even a configured allowlist is one 302 from being bypassed. Cloud metadata endpoints and the product's own loopback admin API are reachable. Hermes has `tools/url_safety.py` plus the F4 address pinning |
| MCP governance | Theirs: **MCP tool calls bypass every gate.** `agent.js:808-809` dispatches straight to the manager with no permission check and no audit entry, which makes the file blacklist defeatable by any installed connector. Hermes routes through the approval layer and toolsets |
| Tracing / audit | Theirs is **always on, never redacted, and written inside the user's workspace** (`trace.js:41-55`, called unconditionally at `:351`/`:417`/`:445`) — full system prompts, tool arguments and shell command lines in plaintext. The "off by default" privacy note at `:24-26` applies only to the Langfuse path. Permission decisions land in a *separate* ledger with no correlation key, so a trace and its approval cannot be joined. Hermes' B4 audit log redacts, writes the decision **before** the action, and records the decision itself |
| Plugin install | Theirs is "paste a GitHub URL" (`plugins.js:355-411`) → unsigned, unpinned shallow clone of a mutable branch, no permission surface, and `server.js:3086` **auto-spawns the plugin's MCP server immediately**, inheriting the full parent environment including every API key (`mcp.js:37`). Hermes has no install-from-URL path |
| Read-before-edit / cross-agent file coordination | `tools/file_state.py` — paginated-read tracking, per-path locks, sibling-subagent staleness. No counterpart there |

Their manifest and containment engineering is genuinely careful in places —
closed schemas, realpath containment in `plugins.js:50-67`, validate-in-temp-then-copy
ordering, and `mcp.js:153-160` uses `redirect: "manual"` specifically so auth
headers cannot be replayed cross-origin. That makes the gaps above stand out
more rather than less.

---

## Finding 3 — four real gaps in Hermes

**None of these were implemented this round.** They are recorded so the next
round starts from a decision rather than a rediscovery.

### Gap A — nothing stops the agent writing its own inferences into memory as fact

Their `memory.js:52-70` carries a guard I have not seen elsewhere, and the
12-line comment above it narrates the incident that produced it: the image tool
was watermarking output; the agent *inferred* that this had been fixed, wrote
that inference into memory as a fact, and then grew steadily more confident about
something that was never true.

The guard refuses a memory entry when it matches **both** a capability-subject
pattern **and** a "now solved / now supported /已修复" pattern — a conjunction,
specifically so an ordinary fact like "the expense system moved to Feishu" is not
caught. And it applies **only when the entry's source is the agent**: a human
saying "that's fixed now" is credible in a way the agent's own inference is not.

**Hermes side, verified.** The write guard is `_scan_memory_content`
(`tools/memory_tool.py:78-80`), which delegates to `tools/threat_patterns.py`.
That library covers prompt injection, promptware and exfiltration — thoroughly,
with scope tiers (`all` / `context` / `strict`). It has **no self-assertion
class**. And Hermes memories are injected into *every* system prompt, so one
wrong entry is broadcast on every API call until someone removes it.

### Gap B — the credential check on memory writes has holes Hermes can already close

Hermes' `strict`-scope rule `hardcoded_secret` (`tools/threat_patterns.py:134`)
requires a **label** (`api_key` / `token` / `secret` / `password`), then `=` or
`:`, then a **quote**, then 20+ characters. So it misses:

- bare vendor-shaped keys — `sk-…`, `ghp_…`, `AKIA…`, `xox[baprs]-…`
- unquoted values (`api_key: sk-abc…`)
- Chinese phrasing ("密码是 …")

Hermes **already has** exactly those vendor shapes, in `agent/redact.py:72-105`,
and already uses them elsewhere. They are simply not reachable from the memory
write path.

**Gaps A and B share one function.** `_scan_memory_content` already has three
call sites — `add` (`:343`), `replace` (`:398`) and `batch` (`:519`) — so
extending that one function covers every write path. This is the cheapest real
improvement found in this round.

### Gap C — the goal loop decides "done" from what the model said

`judge_goal(goal, last_response, ...)` (`hermes_cli/goals.py:836-844`) takes
text. And `GoalContract`'s own docstring says what its five fields are
(`hermes_cli/goals.py:294-303`):

> Each field is **free-form prose** … The contract is woven into both the
> continuation prompt … and the judge prompt (so "done" is decided against
> evidence, not vibes).

The `verification` field is a *description of how one would verify*, pasted into
the judge prompt. **Nothing executes it.** The contract makes the prompt better;
the verdict is still a model reading another model's prose.

This is the fourth appearance of one idea in this series, and the previous three
were all acted on:

- **OpenBot (B series)** — *"A gateway that decides on a label supplied by the
  model is theatre."* Gate on runtime-resolved fact, not the model's label.
- **deepseek-harness (D1)** — `stop_reason` is **derived by the runtime** from
  what actually happened, never self-reported by the subagent.
- **FrontierAgent (F1)** — the landing is **mechanical, not rhetorical**: the
  final request carries `tool_choice="none"`, so a model with no tools available
  writes prose.

`judge_goal` is the last place on that line still running purely on
self-report.

**The design is already settled for whenever this is built:**

- Give the judge **objective facts** — which files this task actually wrote,
  from the existing `file_state.note_write` ledger (`tools/file_state.py:114`).
  Deliberately *not* their approach of regex-scraping filenames out of the
  model's own message and then searching the whole workspace for a matching
  basename.
- **Machine evidence may refute, never establish.** It can turn a `done` into a
  `continue` — the response claims a file, this task never wrote it, it is not
  on disk — but it must never be able to mark a goal complete. The asymmetry is
  the point: a file existing is not the same as a goal being met.
- Attachment points: `hermes_cli/goals.py:1444` (session goal loop) and `:1698`
  (kanban worker loop), before the judge call.
- Keep the module's existing fail-open discipline — its docstring is explicit
  that "a broken judge must not wedge progress". A broken evidence check must
  likewise degrade to the text-only judge, never block.

### Gap D — near-duplicate memories (lowest priority)

Hermes rejects **exact** duplicates only (`tools/memory_tool.py:359-361`). Their
approach surfaces near-duplicates and **never auto-replaces**, and the reasoning
is worth recording: in real data, "the user changed their mind" and "two related
but distinct facts" landed in the same similarity band, so a lexical score cannot
decide between them — hand the comparison to the model and let it choose whether
to forget the old entry.

Doing this in Hermes needs a similarity or embedding path, which makes it more
expensive than A and B for less benefit. Lowest priority of the four.

---

## Not adopted, with the reason

| Item | Why not |
|---|---|
| Office document generation (`pptxgenjs` / `docx` / `exceljs`) and the OOXML validators under `skills/docx/scripts/office/validators/` | The validation is serious — real XSD checks against the Office Open XML schemas, plus semantic checks for master-theme uniqueness, slide-layout IDs and notes-slide references. But **Hermes has no Office generation at all**, so there is nothing to validate. Adopting it means first building a whole document-generation layer: a new feature, not an enhancement of an existing one |
| 30 "experts" + 9 teams | Verified to be **prompt-swapping**. `agent.js:1112-1120` shows a delegated expert inheriting the same model, the same wall-clock deadline, the same token ledger, the same permission tier, the same working directory and the same tool list minus the two delegate tools. Teams add string-concatenated sequential relay. Hermes' role toolsets plus delegation give subagents genuinely separate budgets |
| `lanes.js` | Not parallelism, priority or isolation — a label for "where the work is happening and which kind it is" (`lanes.js:11-13`). Its stated red lines (`:19-24`) are that omitting the field must not change a single byte of behaviour and that the server records only what it was told, never inferring. Scheduling and bounding live elsewhere |
| `org.js` | Multi-tenancy (tenants, plan tiers, invite codes, departments), not agent organisation. Its departments carry no membership or permission semantics |
| `evolve.js` self-improvement | Human-gated rule mining into ≤12 short Markdown rules appended to the system prompt. The gating is thoughtful (evidence thresholds, an actionability classifier that refuses to paper over config/code problems with a prompt rule, mandatory human approval, post-hoc effectiveness scoring). But the learned state is **global — not tenant- or user-scoped** (`evolve.js:34` reads every session file; `:315-328` injects into everyone's prompt), and its sibling `save_skill` (`tools.js:3371-3381`) lets the agent write arbitrary Markdown into a future prompt with a name regex as the only check. The guarded path and the unguarded path lead to the same place |
| `config-lint.js` | Spelling, type and enum checks only. It has **zero configuration-consistency checking** — the four interacting context/token fields can be set to mutually impossible values with no complaint. Hermes added that class of check in F5 (`agent/budget_consistency.py`) |
| Electron desktop shell, web workbench | Not Hermes' surface (CLI + gateway) |

---

## What this round produced

This document, and nothing else. No source file was modified, no `NOTICE` entry
was added, and no test was changed — by design, and for the licensing reason at
the top.

The four gaps above are the carry-forward. A and B are one small change to one
function with three existing call sites; C has its design decided and its
attachment points identified; D is real but the least worth its cost.
