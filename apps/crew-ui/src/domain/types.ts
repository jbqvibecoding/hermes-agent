/**
 * Derived from errand/src/domain/types.ts (Apache-2.0, Runta). See NOTICE.md.
 *
 * Three additions, each because the crew has something Runta's product does not:
 *
 *  - `ChipPart`. A report, a held approval, a memory rule, a routine, a handoff
 *    and a login request are structured objects, not prose. Errand's
 *    `MessagePart` union cannot hold them; flattening them into text would
 *    throw away exactly what makes them worth showing.
 *  - Group threads. Errand assumes one conversation per agent. A crew thread is
 *    a `dm:` or a `group:`, so `Conversation` carries `kind` and `members` and
 *    `agentId` is empty for a room.
 *  - Sections. The sidebar is an org chart, not a flat list.
 *
 * Everything else is Errand's, spelled the same way on purpose: the vendored
 * components and the `useCrewController` state machine read these fields by
 * name, and the Python in `plugins/hermes-crew/crew/contract.py` writes them.
 */

export type AgentStatus = "working" | "idle" | "waiting_for_approval" | "offline";
export type ConnectionState = "connected" | "connecting" | "disconnected" | "error";
export type MessageRole = "user" | "agent" | "system";

export interface Agent {
  id: string;
  name: string;
  role: string;
  goal: string;
  status: AgentStatus;
  /**
   * A short label for the work in flight — "routine: Morning digest", "in
   * Launch room", "replying" — and empty whenever nothing is running.
   *
   * Errand's agents do one thing, so `status` is the whole answer there. Ours
   * can be mid-routine, mid-room or mid-reply, and a person deciding whether
   * to interrupt wants to know which. Kept out of `status` because that is a
   * closed union a colour maps to, which is what makes it useful.
   */
  workingOn?: string;
  /** The teammate's emoji. Errand generates an avatar; we let people pick one. */
  avatar: string;
  lastActiveAt: string;
  unreadCount: number;
  computerId: string;
  sectionId?: string;
  lastMessagePreview?: string;
  /**
   * Whether this teammate may start a conversation rather than only answer
   * one. On by default: a teammate that only ever replies is a command line
   * with a face. The switch exists because "this one is too chatty" should
   * cost one click, not the whole idea.
   */
  proactive?: boolean;
}

/** The nine chip kinds `crew/db.py::MESSAGE_KINDS` knows how to store. */
export type ChipKind =
  | "report"
  | "screenshot"
  | "approval_request"
  | "approval_resolved"
  | "memory_updated"
  | "routine_created"
  | "bot_ref"
  | "login_request";

export interface TextPart { type: "text"; text: string }
export interface ActivityPart { type: "activity"; activityId: string }
export interface ChipPart { type: "chip"; kind: ChipKind; payload: unknown }
export type MessagePart = TextPart | ActivityPart | ChipPart;

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  parts: MessagePart[];
  createdAt: string;
  streaming?: boolean;
  interrupted?: boolean;
  /** Which teammate said it. Empty for the operator; a room needs this to attribute. */
  sender?: string;
  /**
   * Which teammates this was addressed to, resolved by the server when the
   * message was written and never derived again. Empty means it went to the
   * whole room — which is not the same as addressing nobody, and is why this
   * is a list rather than a flag.
   */
  mentions?: string[];
}

export interface Conversation {
  id: string;
  agentId: string;
  kind: "dm" | "group";
  title: string;
  subtitle?: string;
  emoji?: string;
  members?: string[];
  updatedAt: string;
  lastMessagePreview?: string | null;
}

export type ActivityStatus = "running" | "completed" | "failed";
export type ActivityKind = "browser" | "terminal" | "file" | "handoff" | "status";

export interface ActivityEvent {
  id: string;
  conversationId: string;
  turnId?: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  output?: string | null;
  status: ActivityStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface ApprovalRequest {
  id: string;
  agentId: string;
  conversationId: string;
  title: string;
  description: string;
  scope: string[];
  status: "pending" | "allowed" | "denied";
  createdAt: string;
  resolvedAt?: string | null;
  responseNote?: string;

  /**
   * Ours, not Errand's. Everything below exists because a held action is now
   * a real tool call the guard stopped, rather than a sentence the model chose
   * to volunteer.
   *
   * `contentHash` is the fingerprint of the card as rendered. It goes back with
   * the decision, and a mismatch is refused — approving something other than
   * what you read is the one failure the hold exists to prevent, and between
   * render and click the card can be rewritten underneath you.
   *
   * `ref` is four characters somebody can type into the thread instead of
   * opening this panel; `source` says which piece of work is asking, which is
   * what stops an operator hunting through threads to find out what they are
   * being asked about.
   */
  ref?: string;
  source?: string;
  tool?: string;
  contentHash?: string;
  expiresAt?: string | null;
  /** Nobody decided in time. Distinct from a refusal, and the teammate says so. */
  expired?: boolean;

  /**
   * What became of it, unflattened. `status` above is Errand's three-value
   * union, and everything from `executing` onward collapses into `allowed`
   * there — so it cannot tell "it went out" from "we let it out and the
   * process died before anyone saw the end". That difference is the one a
   * person has to act on, so it rides alongside.
   *
   * `outcome_unknown` is not a failure. `failed` claims nothing happened and
   * retrying is safe; this claims nobody knows, and somebody must go and look.
   */
  outcome?:
    | "pending" | "approved" | "executing" | "succeeded"
    | "failed" | "outcome_unknown" | "discarded" | "expired";
}

/**
 * What one teammate may do with one tool, and where that answer came from.
 *
 * `source` matters as much as `mode`. "Ask" because the operator said so and
 * "ask" because nothing recognised the tool are the same restriction and
 * completely different facts, and a panel that showed only the mode would let
 * somebody believe they had configured something they had not.
 */
export interface Grant {
  tool: string;
  toolset: string;
  mode: "deny" | "ask" | "allow";
  why: string;
  source: "grant" | "critical" | "default";
  /** The teammate keeps this one whatever the configuration says. */
  protected: boolean;
  /** False for a rule left behind for a tool this teammate no longer has. */
  available?: boolean;
}

/** One line of the ledger. Append-only; arguments are a digest, never values. */
export interface AuditEvent {
  id: number;
  bot_id: string;
  actor: string;
  thread_id: string;
  turn_id: string;
  tool_call_id: string;
  event_type:
    | "tool.allowed" | "tool.refused" | "tool.held" | "tool.failed"
    | "approval.decided" | "approval.expired"
    | "grant.changed" | "crew.policy_loaded" | "crew.bot_declined";
  tool: string;
  args_digest: string;
  subject: string;
  detail: string;
  status: string;
  duration_ms: number | null;
  created_at: number;
}

/**
 * A file a teammate produced. `downloadPath` rather than a URL: the client
 * knows its own base — it already builds the screenshot URL the same way — and
 * a server-built absolute URL is wrong the moment the dashboard is reached
 * through a tunnel or a different host than it thinks it has.
 */
export interface Artifact {
  id: string;
  agentId: string;
  conversationId: string;
  path: string;
  name: string;
  kind: "slides" | "document" | "sheet" | "image" | "data" | "text" | "code" | "archive" | "file";
  size: number;
  updatedAt: string;
  downloadPath: string;
}

/**
 * A step in what a teammate means to do.
 *
 * `waiting` is not `pending`: the step is blocked on somebody else, which is a
 * different fact and the one an operator can act on. It is deliberately not
 * the task's own status union — a step can be waiting while the task runs, and
 * merging the two would force one of them to lie.
 */
export interface TaskStep {
  id: string;
  title: string;
  status: "pending" | "running" | "succeeded" | "failed" | "waiting";
  detail?: string;
}

/**
 * Something the teammate read. Not what it did — the audit trail answers that.
 * This answers "why does it say that", which is a different question and the
 * one people actually ask.
 */
export interface Evidence {
  kind: "mail" | "file" | "web" | "user";
  title: string;
  excerpt: string;
  url?: string;
}

/** Work that outlives the process that started it. */
export interface Task {
  id: string;
  agentId: string;
  conversationId: string;
  kind: string;
  title: string;
  status:
    | "queued" | "running" | "waiting_approval" | "waiting_input"
    | "scheduled" | "paused" | "succeeded" | "failed" | "cancelled";
  plan: TaskStep[];
  evidence: Evidence[];
  attempts: number;
  error: string;
  createdAt: string;
  updatedAt: string;
}

export interface CloudComputer {
  id: string;
  agentId: string;
  runtimeName: string;
  status: "online" | "starting" | "offline";
  capabilities: Array<"open" | "takeover">;
  error?: string;
}

export interface CloudComputerSession { url: string; protocols: string[]; mode: "remote" }

export interface ModelProviderOption {
  id: string;
  name: string;
  protocol: string;
  defaultModel?: string | null;
  baseUrl?: string;
}
export interface ModelProviderCatalog { organizationId: string; providers: ModelProviderOption[] }

/** A routine is a Hermes cron job in the teammate's own profile. */
export interface Routine { id: string; name: string; schedule: string; description?: string }

/** The sidebar org chart. `__agents__` is the bucket nothing can be filed out of. */
export interface Section { id: string; name: string; bot_ids: string[]; collapsed?: boolean }

export interface CreateAgentInput {
  name: string;
  role?: string;
  emoji?: string;
  modelProviderId?: string;
  systemPrompt?: string;
  groupId?: string;
  withComputer?: boolean;
}
export interface UpdateAgentInput {
  name?: string; role?: string; goal?: string; emoji?: string; sectionId?: string;
  proactive?: boolean;
}
export interface SendMessageInput { conversationId: string; text: string; signal?: AbortSignal }
export interface RespondApprovalInput {
  requestId: string;
  decision: "allow" | "deny";
  note?: string;
  /** The hash of the card that was actually on screen. A stale one is refused. */
  contentHash?: string;
}
export interface SetGrantInput { agentId: string; tool: string; mode: "deny" | "ask" | "allow"; note?: string }
export interface AuditQuery {
  agentId?: string;
  /** Several at once on purpose: "was anything stopped?" spans three of them. */
  eventTypes?: string[];
  beforeId?: number;
  limit?: number;
}
export interface AuditPage { events: AuditEvent[]; nextBeforeId: number | null }

export type ConversationEvent =
  | { type: "message.created"; threadId: string; message: Message }
  | { type: "message.updated"; threadId: string; message: Message }
  | { type: "message.delta"; threadId: string; messageId: string; delta: string }
  | { type: "message.completed"; threadId: string; messageId: string; notify?: boolean }
  | { type: "message.dropped"; threadId: string; messageId: string }
  | { type: "activity.updated"; threadId: string; activity: ActivityEvent }
  | { type: "approval.updated"; threadId: string; approval: ApprovalRequest }
  | { type: "artifact.created"; agentId: string; threadId: string; artifact: Artifact }
  | { type: "agent.status"; agentId: string; status: AgentStatus }
  | { type: "connection.changed"; state: ConnectionState };

export interface Subscription { unsubscribe(): void }

export class CrewError extends Error {
  constructor(
    public readonly code: "network" | "unauthorized" | "not_found" | "conflict" | "unknown",
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "CrewError";
  }
}
