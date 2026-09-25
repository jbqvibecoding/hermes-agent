/**
 * Derived from errand/src/domain/CloudAgentsClient.ts (Apache-2.0, Runta).
 *
 * The interface the workspace talks to, so the same React tree runs against a
 * real backend, a fake one in tests, and (later) something remote. Kept as
 * Errand's method names because `useCrewController` calls them by name.
 *
 * Two differences from Errand's:
 *
 *  - `setAgentUnread` is gone. We do not track unread, and Errand's own client
 *    implements it as "re-read the agent and return it", which is a method that
 *    exists to satisfy a type rather than to do anything.
 *  - `sendMessage` takes the thread id the caller is looking at. Errand derives
 *    one conversation per agent; we have rooms.
 */

import type {
  Agent,
  ApprovalRequest,
  CloudComputer,
  CloudComputerSession,
  Conversation,
  ConversationEvent,
  CreateAgentInput,
  Message,
  ModelProviderCatalog,
  Artifact,
  AuditPage,
  AuditQuery,
  Grant,
  RespondApprovalInput,
  Routine,
  SetGrantInput,
  Task,
  Section,
  SendMessageInput,
  Subscription,
  UpdateAgentInput,
} from "./types";

export interface ConversationSnapshot {
  conversation: Conversation;
  messages: Message[];
  activities: import("./types").ActivityEvent[];
}

export interface CloudAgentsClient {
  listModelProviders(signal?: AbortSignal): Promise<ModelProviderCatalog>;
  listAgents(signal?: AbortSignal): Promise<Agent[]>;
  getAgent(agentId: string, signal?: AbortSignal): Promise<Agent>;
  createAgent(input: CreateAgentInput, signal?: AbortSignal): Promise<Agent>;
  updateAgent(agentId: string, input: UpdateAgentInput, signal?: AbortSignal): Promise<Agent>;
  deleteAgent(agentId: string, signal?: AbortSignal): Promise<void>;
  duplicateAgent(agentId: string, signal?: AbortSignal): Promise<Agent>;
  listConversations(agentId: string, signal?: AbortSignal): Promise<Conversation[]>;
  getConversation(conversationId: string, signal?: AbortSignal): Promise<ConversationSnapshot>;
  sendMessage(input: SendMessageInput): Promise<Message>;
  subscribeToConversationEvents(
    conversationId: string,
    listener: (event: ConversationEvent) => void,
  ): Subscription;
  listApprovalRequests(agentId?: string, signal?: AbortSignal): Promise<ApprovalRequest[]>;
  respondToApproval(input: RespondApprovalInput, signal?: AbortSignal): Promise<ApprovalRequest>;
  getComputer(agentId: string, signal?: AbortSignal): Promise<CloudComputer>;
  openComputer(agentId: string, signal?: AbortSignal): Promise<CloudComputerSession>;
  takeOverComputer(agentId: string, signal?: AbortSignal): Promise<CloudComputerSession>;
  reconnect(signal?: AbortSignal): Promise<void>;

  /** Crew-only, because Errand has no org chart, no rooms and no routines. */
  listSections(signal?: AbortSignal): Promise<Section[]>;
  saveSections(sections: Section[], signal?: AbortSignal): Promise<Section[]>;
  listRoutines(agentId: string, signal?: AbortSignal): Promise<Routine[]>;

  /**
   * What this teammate may reach, and what it has done. Errand has neither
   * concept — it assumes an agent may do whatever its tools allow.
   */
  listGrants(agentId: string, signal?: AbortSignal): Promise<Grant[]>;
  setGrant(input: SetGrantInput, signal?: AbortSignal): Promise<Grant>;
  clearGrant(agentId: string, tool: string, signal?: AbortSignal): Promise<Grant>;
  listAuditEvents(query?: AuditQuery, signal?: AbortSignal): Promise<AuditPage>;

  /** What the teammate is working through, with its plan and its sources. */
  listTasks(agentId: string, signal?: AbortSignal): Promise<Task[]>;

  /** What the teammate actually produced, and where to fetch one from. */
  listArtifacts(agentId: string, signal?: AbortSignal): Promise<Artifact[]>;
  artifactUrl(artifact: Artifact): string;
  deleteRoutine(agentId: string, routineId: string, signal?: AbortSignal): Promise<void>;

  /**
   * Hand one field to the teammate's page, typed by the operator. Ours, not
   * Errand's: it has no equivalent because it has no screen to type into.
   *
   * The value is a parameter and nothing more — the implementation must not
   * cache it, retry with it, or return it. What is stored anywhere is the
   * field's label.
   */
  submitSecret(
    agentId: string, ref: string, value: string, signal?: AbortSignal,
  ): Promise<{ filled: boolean }>;
  screenshotUrl(agentId: string, filename: string): string;
}
