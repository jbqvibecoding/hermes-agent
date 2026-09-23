/**
 * `CloudAgentsClient` against the Hermes Crew plugin's `/v1` routes.
 *
 * Short on purpose. Runta's equivalent is 476 lines, most of it reconstructing
 * `message.delta` and `activity.updated` from a run-event stream that was never
 * meant for a chat UI. Our backend emits those frames directly
 * (`plugins/hermes-crew/crew/contract.py`), so this forwards and gets out of
 * the way — which is the whole return on having written the contract first.
 */

import type { CloudAgentsClient, ConversationSnapshot } from "../domain/CloudAgentsClient";
import {
  CrewError,
  type Agent,
  type ApprovalRequest,
  type Artifact,
  type AuditPage,
  type AuditQuery,
  type Grant,
  type CloudComputer,
  type CloudComputerSession,
  type Conversation,
  type ConversationEvent,
  type CreateAgentInput,
  type Message,
  type ModelProviderCatalog,
  type RespondApprovalInput,
  type SetGrantInput,
  type Routine,
  type Section,
  type SendMessageInput,
  type Subscription,
  type UpdateAgentInput,
} from "../domain/types";

export interface HermesCrewClientOptions {
  /** Where the plugin is mounted, e.g. `/api/plugins/hermes-crew`. No trailing slash. */
  baseUrl: string;
  /**
   * How to reach the socket. A plain string for the desktop app, which has a
   * long-lived token; a resolver for the dashboard, whose `buildWsUrl` mints a
   * **single-use** ticket in gated OAuth mode — cache that URL and the first
   * reconnect is a 401. It is therefore re-resolved on every connect, not once.
   */
  eventsUrl?: string | (() => Promise<string>);
  /**
   * The `fetch` to use. The dashboard must pass `SDK.authedFetch`: its own SDK
   * contract says plugins may not hand-read the session token, and it is what
   * keeps loopback, gated-OAuth and server-internal modes all working.
   */
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
  /** Extra headers per request — the desktop app's session token rides here. */
  headers?: () => Record<string, string>;
}

const RECONNECT_MIN_MS = 500;
const RECONNECT_MAX_MS = 15_000;

function errorFor(status: number, detail: string): CrewError {
  if (status === 401 || status === 403) return new CrewError("unauthorized", detail);
  if (status === 404) return new CrewError("not_found", detail);
  if (status === 409) return new CrewError("conflict", detail);
  // 502/503/504 are a gateway that has not come up yet, not a broken request.
  return new CrewError("unknown", detail, status >= 500);
}

export function defaultEventsUrl(baseUrl: string): string {
  const absolute = new URL(baseUrl, globalThis.location?.href ?? "http://127.0.0.1");
  absolute.protocol = absolute.protocol === "https:" ? "wss:" : "ws:";
  absolute.pathname = `${absolute.pathname.replace(/\/+$/, "")}/v1/events`;
  return absolute.toString();
}

export class HermesCrewClient implements CloudAgentsClient {
  private readonly baseUrl: string;
  private readonly resolveEventsUrl: () => Promise<string>;
  private readonly fetchImpl: (url: string, init?: RequestInit) => Promise<Response>;
  private readonly headers: () => Record<string, string>;

  /**
   * One socket for the whole crew, shared by every subscriber.
   *
   * The backend tails the database globally rather than per thread, so opening
   * a socket per conversation would mean N copies of every frame. Subscribers
   * filter by thread id on arrival.
   */
  private socket?: WebSocket;
  private listeners = new Set<(event: ConversationEvent) => void>();
  private reconnectDelay = RECONNECT_MIN_MS;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private opening = false;
  private closed = false;

  constructor(options: HermesCrewClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    const events = options.eventsUrl ?? defaultEventsUrl(this.baseUrl);
    this.resolveEventsUrl = typeof events === "function" ? events : async () => events;
    this.fetchImpl = options.fetchImpl ?? ((url, init) => fetch(url, init));
    this.headers = options.headers ?? (() => ({}));
  }

  private async request<T>(
    path: string,
    init: RequestInit & { signal?: AbortSignal } = {},
  ): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...this.headers(),
          ...(init.headers ?? {}),
        },
      });
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") throw reason;
      throw new CrewError("network", "Could not reach the crew backend.", true);
    }
    if (!response.ok) {
      // FastAPI puts the sentence worth showing in `detail`; falling back to the
      // status code alone would put "409" in front of somebody.
      const detail = await response
        .json()
        .then((body: { detail?: string }) => body?.detail)
        .catch(() => undefined);
      throw errorFor(response.status, detail ?? `Crew request failed (${response.status})`);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  listModelProviders(signal?: AbortSignal) {
    return this.request<ModelProviderCatalog>("/v1/model-providers", { signal });
  }

  listAgents(signal?: AbortSignal) {
    return this.request<Agent[]>("/v1/agents", { signal });
  }

  getAgent(agentId: string, signal?: AbortSignal) {
    return this.request<Agent>(`/v1/agents/${encodeURIComponent(agentId)}`, { signal });
  }

  createAgent(input: CreateAgentInput, signal?: AbortSignal) {
    return this.request<Agent>("/v1/agents", {
      method: "POST",
      body: JSON.stringify(input),
      signal,
    });
  }

  updateAgent(agentId: string, input: UpdateAgentInput, signal?: AbortSignal) {
    return this.request<Agent>(`/v1/agents/${encodeURIComponent(agentId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
      signal,
    });
  }

  async deleteAgent(agentId: string, signal?: AbortSignal) {
    await this.request<void>(`/v1/agents/${encodeURIComponent(agentId)}`, {
      method: "DELETE",
      signal,
    });
  }

  duplicateAgent(agentId: string, signal?: AbortSignal) {
    return this.request<Agent>(`/v1/agents/${encodeURIComponent(agentId)}/duplicate`, {
      method: "POST",
      signal,
    });
  }

  listConversations(agentId: string, signal?: AbortSignal) {
    const query = agentId ? `?agentId=${encodeURIComponent(agentId)}` : "";
    return this.request<Conversation[]>(`/v1/conversations${query}`, { signal });
  }

  getConversation(conversationId: string, signal?: AbortSignal) {
    return this.request<ConversationSnapshot>(
      `/v1/conversations/${encodeURIComponent(conversationId)}`,
      { signal },
    );
  }

  sendMessage(input: SendMessageInput) {
    return this.request<Message>(
      `/v1/conversations/${encodeURIComponent(input.conversationId)}/messages`,
      { method: "POST", body: JSON.stringify({ text: input.text }), signal: input.signal },
    );
  }

  listApprovalRequests(agentId?: string, signal?: AbortSignal) {
    const query = agentId ? `?agentId=${encodeURIComponent(agentId)}` : "";
    return this.request<ApprovalRequest[]>(`/v1/approvals${query}`, { signal });
  }

  respondToApproval(input: RespondApprovalInput, signal?: AbortSignal) {
    return this.request<ApprovalRequest>(
      `/v1/approvals/${encodeURIComponent(input.requestId)}/respond`,
      {
        method: "POST",
        body: JSON.stringify({
          decision: input.decision,
          note: input.note ?? "",
          // The hash of the card the operator actually read. The server
          // refuses a decision made against a stale one rather than
          // recording consent to something else.
          contentHash: input.contentHash ?? "",
        }),
        signal,
      },
    );
  }

  getComputer(agentId: string, signal?: AbortSignal) {
    return this.request<CloudComputer>(`/v1/agents/${encodeURIComponent(agentId)}/computer`, {
      signal,
    });
  }

  openComputer(agentId: string, signal?: AbortSignal) {
    return this.request<CloudComputerSession>(
      `/v1/agents/${encodeURIComponent(agentId)}/computer/open`,
      { method: "POST", signal },
    );
  }

  takeOverComputer(agentId: string, signal?: AbortSignal) {
    return this.request<CloudComputerSession>(
      `/v1/agents/${encodeURIComponent(agentId)}/computer/takeover`,
      { method: "POST", signal },
    );
  }

  async reconnect(signal?: AbortSignal) {
    this.closeSocket();
    this.reconnectDelay = RECONNECT_MIN_MS;
    if (this.listeners.size) this.openSocket();
    await this.listAgents(signal);
  }

  listSections(signal?: AbortSignal) {
    return this.request<{ sections: Section[] }>("/sections", { signal }).then((r) => r.sections);
  }

  saveSections(sections: Section[], signal?: AbortSignal) {
    return this.request<{ sections: Section[] }>("/sections", {
      method: "PUT",
      body: JSON.stringify(sections),
      signal,
    }).then((r) => r.sections);
  }

  listRoutines(agentId: string, signal?: AbortSignal) {
    return this.request<{ routines: Routine[] }>(
      `/bots/${encodeURIComponent(agentId)}/routines`,
      { signal },
    ).then((r) => r.routines);
  }

  async deleteRoutine(agentId: string, routineId: string, signal?: AbortSignal) {
    await this.request<void>(
      `/bots/${encodeURIComponent(agentId)}/routines/${encodeURIComponent(routineId)}`,
      { method: "DELETE", signal },
    );
  }

  listGrants(agentId: string, signal?: AbortSignal) {
    return this.request<{ grants: Grant[] }>(
      `/bots/${encodeURIComponent(agentId)}/grants`,
      { signal },
    ).then((r) => r.grants);
  }

  setGrant(input: SetGrantInput, signal?: AbortSignal) {
    return this.request<Grant>(
      `/bots/${encodeURIComponent(input.agentId)}/grants/${encodeURIComponent(input.tool)}`,
      { method: "PUT", body: JSON.stringify({ mode: input.mode, note: input.note ?? "" }), signal },
    );
  }

  clearGrant(agentId: string, tool: string, signal?: AbortSignal) {
    return this.request<Grant>(
      `/bots/${encodeURIComponent(agentId)}/grants/${encodeURIComponent(tool)}`,
      { method: "DELETE", signal },
    );
  }

  listAuditEvents(query: AuditQuery = {}, signal?: AbortSignal) {
    const params = new URLSearchParams();
    if (query.agentId) params.set("bot_id", query.agentId);
    // Comma-separated rather than repeated: "was anything stopped?" spans
    // three event types, and a single-value filter would answer a third of
    // the question while looking like it answered all of it.
    if (query.eventTypes?.length) params.set("event_type", query.eventTypes.join(","));
    if (query.beforeId) params.set("before_id", String(query.beforeId));
    if (query.limit) params.set("limit", String(query.limit));
    const suffix = params.toString();
    return this.request<AuditPage>(`/audit${suffix ? `?${suffix}` : ""}`, { signal });
  }

  listArtifacts(agentId: string, signal?: AbortSignal) {
    return this.request<{ files: Artifact[] }>(
      `/bots/${encodeURIComponent(agentId)}/files`,
      { signal },
    ).then((r) => r.files);
  }

  artifactUrl(artifact: Artifact) {
    // The server hands back a path, not a URL, so the base stays this client's
    // business — same as screenshotUrl. Each segment is encoded separately so a
    // file named in Chinese, or with a space, survives the round trip while the
    // slashes stay slashes.
    const encoded = artifact.downloadPath.split("/").map(encodeURIComponent).join("/");
    return `${this.baseUrl}${encoded}`;
  }

  screenshotUrl(agentId: string, filename: string) {
    return `${this.baseUrl}/screenshots/${encodeURIComponent(agentId)}/${encodeURIComponent(filename)}`;
  }

  subscribeToConversationEvents(
    conversationId: string,
    listener: (event: ConversationEvent) => void,
  ): Subscription {
    // Frames for other threads still reach the listener when they are not
    // thread-scoped at all — `agent.status` and `connection.changed` are about
    // the crew, and dropping them would freeze the sidebar.
    const scoped = (event: ConversationEvent) => {
      if ("threadId" in event && event.threadId && event.threadId !== conversationId) return;
      listener(event);
    };
    this.listeners.add(scoped);
    this.closed = false;
    this.openSocket();
    return {
      unsubscribe: () => {
        this.listeners.delete(scoped);
        if (!this.listeners.size) {
          this.closed = true;
          this.closeSocket();
        }
      },
    };
  }

  private emit(event: ConversationEvent) {
    for (const listener of [...this.listeners]) listener(event);
  }

  private openSocket() {
    if (this.socket || this.opening || this.closed) return;
    // Resolving the URL is a round trip in gated mode, so the flag is what
    // stops a burst of subscribes from opening three sockets while it is out.
    this.opening = true;
    void this.resolveEventsUrl()
      .then((url) => { this.opening = false; this.attach(url); })
      .catch(() => { this.opening = false; this.scheduleReconnect(); });
  }

  private attach(url: string) {
    if (this.socket || this.closed) return;
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      this.reconnectDelay = RECONNECT_MIN_MS;
      this.emit({ type: "connection.changed", state: "connected" });
    };
    socket.onmessage = (frame) => {
      try {
        this.emit(JSON.parse(String(frame.data)) as ConversationEvent);
      } catch {
        /* A frame we cannot parse is a frame we cannot act on. Keep the socket. */
      }
    };
    socket.onclose = () => {
      this.socket = undefined;
      if (this.closed) return;
      this.emit({ type: "connection.changed", state: "connecting" });
      this.scheduleReconnect();
    };
    socket.onerror = () => socket.close();
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.closed) return;
    // Backing off matters here: the dashboard is often opened before the
    // gateway finishes booting, and a tight retry loop against a dead port
    // would be the first thing a new user's log shows them.
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX_MS);
      this.openSocket();
    }, this.reconnectDelay);
  }

  private closeSocket() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.opening = false;
    const socket = this.socket;
    this.socket = undefined;
    if (socket) {
      socket.onclose = null;
      socket.onerror = null;
      socket.close();
    }
  }
}
