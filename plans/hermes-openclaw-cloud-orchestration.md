# Hermes Orchestrator + OpenClaw Worker Fleet — Cloud Multi-Agent Product Design

> Status: research / architecture proposal
> Scope: design only — no product code lands with this document. Implementation is a phased follow-up (see "Build plan").

## 1. Goal

Build a **cloud-hosted general AI agent product** with three properties:

1. Every user gets their own **persistent cloud sandbox** — informally, "a cloud computer" — that hibernates when idle and wakes on demand.
2. **Hermes** runs in the cloud and is the user-facing surface (chat / messaging / API).
3. An **orchestration layer** decomposes complex requests and dispatches subtasks to **multiple cloud OpenClaw worker agents** that collaborate to finish the work.

This document is the result of a deep read of both repositories and recommends concrete roles, the interop wire, the per-user sandbox mechanism, and a phased build plan. The guiding principle is **reuse existing primitives** in both projects instead of building new orchestration infrastructure.

### Confirmed decisions

| Decision | Choice |
| --- | --- |
| Per-user sandbox | **Serverless hibernate** via Daytona / Modal (scale-to-zero on idle) |
| Interop wire | **OpenClaw Gateway WebSocket JSON-RPC** (token auth) |
| Orchestration substrate | **Hermes Kanban** durable board + custom `spawn_fn` |
| Worker runtime | **OpenClaw**, one Gateway instance per user, behind a replaceable client interface |

---

## 2. Why each system plays its role (evidence)

### OpenClaw = worker / computer-use runtime

- **Headless / programmatic invocation.** `openclaw agent --message … --session-key … --json` (`src/cli/program/register.agent-turn.ts`, `src/commands/agent-via-gateway.ts`) returns a structured `{runId, status, result.text}`. The richer path is driving the Gateway directly over WebSocket JSON-RPC (`packages/gateway-protocol/src/index.ts`, `src/gateway/server-methods/sessions.ts`): `sessions.create`, `sessions.send`, `sessions.read`, `chat.abort`.
- **No public HTTP control plane.** The only HTTP surface is a loopback MCP server (`src/gateway/mcp-http.ts`, bound to `127.0.0.1` with bearer auth). Remote control must therefore be **WebSocket or CLI-exec**, not REST.
- **Strong sandboxing.** `src/agents/sandbox/{config,docker-backend,ssh-backend}.ts` — Docker default (`network:none`, `capDrop:ALL`, per-session scope), plus SSH and OpenShell backends.
- **Instance-per-tenant data model.** Global `state/openclaw.sqlite` + per-agent `agents/<id>/agent/openclaw-agent.sqlite`; session keys `agent:<id>:<key>`. State is file-based SQLite → no built-in clustering, so each user needs their own Gateway instance.
- **Ships as a long-lived service.** `Dockerfile`, `fly.toml` (`gateway --port 3000 --bind lan`, persistent `/data`, `auto_start_machines`), `render.yaml` (`/health`).
- **Upstream explicitly refuses orchestration.** `VISION.md` → "What We Will Not Merge" lists *agent-hierarchy frameworks* and *heavy orchestration layers*. Orchestration must live in our layer; OpenClaw stays a worker.

### Hermes = orchestrator + user-facing control plane

- **User ingress already exists.** Messaging gateway (`gateway/run.py`, `gateway/platforms/*`) plus an OpenAI-compatible API server (`gateway/platforms/api_server.py`, gated by `API_SERVER_HOST` / `API_SERVER_KEY`).
- **Kanban durable multi-agent queue** (`hermes_cli/kanban_db.py`). The dispatcher claims tasks with compare-and-swap + TTL + heartbeat, enforces board/tenant isolation, and spawns workers through a **pluggable `spawn_fn`** — `dispatch_once(..., spawn_fn=…)`. The default `_default_spawn` runs `hermes -p <profile> chat …`; workers close tasks by calling `kanban_complete` (`tools/kanban_tools.py`).
- **`delegate_task`** (`tools/delegate_tool.py`): in-process, **synchronous** ThreadPool subagents with leaf/orchestrator roles and depth/concurrency caps. Good for fast in-context decomposition, not durable cross-machine fan-out.
- **Hermes is an MCP client** (`tools/mcp_tool.py`: stdio / SSE / HTTP) and can register external tool servers as native tools.
- **Per-user isolation via profiles** (`HERMES_HOME` override in `hermes_cli/main.py::_apply_profile_override`, `hermes_constants.py`). Persistent per-user cloud sandboxes via **Daytona** (`tools/environments/daytona.py`, named `hermes-{task_id}`, hibernate/resume) and **Modal snapshots** (`tools/environments/modal.py`).

---

## 3. Architecture

```
                 ┌─────────────────────────────────────────────┐
   users ───────▶│  HERMES (cloud, user-facing control plane)   │
 (chat / API)    │  - gateway + api_server ingress              │
                 │  - per-user profile (HERMES_HOME=/user/<id>) │
                 │  - ORCHESTRATION LAYER:                       │
                 │      Kanban board (durable task queue)        │
                 │      custom spawn_fn ──► OpenClaw worker      │
                 └───────────────┬─────────────────────────────┘
                                 │  (per task, over WS)
              ┌──────────────────┼───────────────────┐
              ▼                  ▼                   ▼
   ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
   │ OpenClaw worker│  │ OpenClaw worker│  │ OpenClaw worker│   one Gateway
   │ (Gateway WS)   │  │ (Gateway WS)   │  │ (Gateway WS)   │   instance per
   │  + Docker/SSH  │  │  + Docker/SSH  │  │  + Docker/SSH  │   user sandbox
   │   sandbox      │  │   sandbox      │  │   sandbox      │
   └────────────────┘  └────────────────┘  └────────────────┘
        user A's          user A's parallel    user B's
       "cloud computer"   subtask worker      "cloud computer"
```

Three layers, each mapping onto existing code:

1. **User-facing + orchestration = Hermes.** One Hermes deployment, multi-tenant via profiles (`HERMES_HOME` per user). The Kanban board is the durable orchestration substrate: a user request becomes a parent task; an orchestrator-role agent decomposes it into child tasks (`kanban_create`); the dispatcher fans them out.

2. **Dispatch seam = Kanban custom `spawn_fn`.** Replace `_default_spawn` with `openclaw_spawn(task, workspace, board)` that opens a session on the user's OpenClaw Gateway and runs the subtask. This is the single cleanest integration point — durable, fault-tolerant (claim/TTL/heartbeat), already wired for parallelism and per-tenant isolation.

3. **Workers = OpenClaw, one Gateway instance per user**, each attached to that user's persistent sandbox. OpenClaw performs the actual computer-use (bash, files, browser) inside its own Docker/SSH sandbox.

### Interop wire: OpenClaw Gateway WebSocket JSON-RPC

- Build a thin `OpenClawWorkerClient` in Hermes (Python WS client): `connect → sessions.create → sessions.send(message, expect-final) → await final event → return result text`.
- Authenticate with the Gateway token (`OPENCLAW_GATEWAY_TOKEN`, as set by `fly.toml` / `render.yaml`); one token per user instance.
- The worker result is written back to the board via `kanban_complete`, called by the spawn wrapper after the WS turn returns — so OpenClaw itself needs no Kanban awareness.
- **Why not MCP:** OpenClaw's `mcp serve` is a *conversation bridge* (`conversations_list` / `messages_send` / `events_wait`), awkward for "run task → get result", and its HTTP MCP is loopback-only.
- **Why not CLI-exec:** viable as a fallback (`openclaw agent --json` over SSH into the user box) but heavier per call and loses streaming. Keep it as the degraded path behind the same client interface.

### Per-user "cloud computer" — serverless hibernate (Daytona / Modal)

One persistent environment per user that hibernates when idle. `tools/environments/daytona.py` already resumes a named sandbox `hermes-{user}` and `.start()`s it from hibernation; Modal snapshots (`tools/environments/modal.py`) are the equivalent fallback. This is cheapest at idle and needs no new orchestration infra. Run the per-user OpenClaw Gateway *inside* this sandbox (or point OpenClaw's SSH sandbox backend at it).

Machine-per-user (Fly Machines / K8s pod, mirroring OpenClaw's shipped `fly.toml`) is the documented fallback if a tenant outgrows serverless density — not the default.

### Per-user identity mapping (1:1 across the stack)

```
user_id
  → Hermes profile          HERMES_HOME=/data/users/<id>
  → OpenClaw agent          agent:<id>:<session>
  → OpenClaw Gateway        instance + OPENCLAW_GATEWAY_TOKEN
  → persistent sandbox      hermes-{id}  (Daytona/Modal, hibernating)
```

Credentials / model-auth are scoped per layer: Hermes `.env` + `auth.json` per profile; OpenClaw `agents/<id>/agent/auth-profiles.json`.

---

## 4. Build plan (phased)

**Phase 0 — Design doc (this).** Architecture, interop decision, sandbox decision, identity mapping.

**Phase 1 — POC: single user, single worker, synchronous.**
- `OpenClawWorkerClient` (Python WS client to OpenClaw Gateway): `run_turn(session_key, message) -> result_text`. Validate against a locally-run `openclaw gateway` (token auth) using `sessions.create` / `sessions.send`.
- Expose it inside Hermes as a tool (`openclaw_run`) so a Hermes agent can hand a subtask to one OpenClaw worker and get the result. Reuse the tool registry pattern (`tools/registry.py`, `tools/mcp_tool.py`) — register as a native tool, no core edits.
- Proof: a Hermes turn that delegates "build/run X" to OpenClaw and surfaces the worker's output.

**Phase 2 — Durable orchestration via Kanban + custom `spawn_fn`.**
- Implement `openclaw_spawn(task, workspace, board)`: resolve the user's OpenClaw Gateway endpoint + token, run the subtask through `OpenClawWorkerClient`, then `kanban_complete(task.id, summary=…)`. Wire it via `dispatch_once(..., spawn_fn=openclaw_spawn)`.
- An orchestrator-role Hermes agent decomposes a user request into child Kanban tasks (`kanban_create`) → the dispatcher fans out to N OpenClaw workers in parallel (board/tenant isolation, claim/TTL/heartbeat give fault tolerance).
- Proof: one parent task → multiple parallel OpenClaw workers → aggregated result back to the user.

**Phase 3 — Per-user persistent sandbox + provisioning.**
- Provisioner that, on first user activity, creates: Hermes profile, OpenClaw agent config + Gateway instance/token, and the persistent sandbox (Daytona/Modal), then hibernates on idle and resumes on next task.
- Lifecycle: idle hibernation, wake-on-dispatch, GC of dead sandboxes (mirror Kanban's heartbeat/TTL semantics for sandboxes).

**Phase 4 — Multi-tenant hardening.**
- Per-user auth/credential isolation and billing hooks (model usage is already tracked per Hermes session and per OpenClaw run).
- Network/security posture: keep OpenClaw sandbox `network:none` by default with scoped egress; never expose an OpenClaw Gateway publicly — use private networking / mTLS / a tunnel between Hermes and each worker Gateway.
- Observability: reuse the Hermes `observability` plugin + Kanban run logs; OpenClaw keeps a per-agent transcript DB.

---

## 5. Critical files to reuse (not reinvent)

**Hermes**
- `hermes_cli/kanban_db.py` — `dispatch_once(spawn_fn=…)`, claim/TTL/heartbeat (orchestration substrate).
- `tools/kanban_tools.py` — `kanban_create` / `kanban_complete` / `kanban_block` (worker result contract).
- `tools/mcp_tool.py`, `tools/registry.py` — register `openclaw_run` as a native tool with no core edits.
- `gateway/platforms/api_server.py`, `gateway/run.py` — user ingress.
- `hermes_constants.py`, `hermes_cli/main.py::_apply_profile_override`, `hermes_cli/profiles.py` — per-user isolation.
- `tools/environments/daytona.py`, `tools/environments/modal.py` — persistent per-user sandbox.

**OpenClaw**
- `packages/gateway-protocol/src/index.ts`, `src/gateway/server-methods/sessions.ts` — WS method contracts to drive.
- `src/commands/agent-via-gateway.ts`, `src/cli/program/register.agent-turn.ts` — CLI fallback semantics + `--json`.
- `src/agents/sandbox/{config,docker-backend,ssh-backend}.ts` — worker sandbox.
- `fly.toml`, `render.yaml`, `Dockerfile` — per-user Gateway instance deploy template.

---

## 6. Risks and constraints

- **No shared OpenClaw Gateway clustering** (file-based SQLite) → run instance-per-user; provisioning cost/density is the main scaling question.
- **OpenClaw Gateway has no public REST** → interop is WS (recommended) or CLI-exec; both require private networking to each user box.
- **`delegate_task` is synchronous / in-process** → use Kanban (not delegate) for cross-machine durable fan-out; reserve delegate for in-Hermes decomposition.
- **OpenClaw upstream will not host orchestration** → keep all manager/planner logic in Hermes; treat OpenClaw as a replaceable worker behind the `OpenClawWorkerClient` interface so the worker runtime can be swapped without touching the orchestration layer.

---

## 7. Verification (per phase)

- **Phase 1:** run `openclaw gateway` locally with a token; from a Python REPL call `OpenClawWorkerClient.run_turn(...)` and assert a real `result.text` round-trips. Then drive the `openclaw_run` tool end-to-end from `hermes`.
- **Phase 2:** seed a parent Kanban task, run the dispatcher with `spawn_fn=openclaw_spawn`, and assert N child tasks reach `done` via `kanban_complete` and the orchestrator aggregates them. Inspect with `hermes kanban list/show`.
- **Phase 3:** provision a user, hibernate the sandbox, dispatch a task, and confirm wake-from-idle plus persistent workspace state across two sessions.
- **Tests:** Hermes via `scripts/run_tests.sh tests/...`; OpenClaw via `pnpm test <filter>` (or `node scripts/run-vitest.mjs` in a linked checkout). Gate live WS interop behind an opt-in env flag.
