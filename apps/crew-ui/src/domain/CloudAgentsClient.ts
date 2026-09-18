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
  RespondApprovalInput,
  Routine,
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
  deleteRoutine(agentId: string, routineId: string, signal?: AbortSignal): Promise<void>;
  screenshotUrl(agentId: string, filename: string): string;
}
