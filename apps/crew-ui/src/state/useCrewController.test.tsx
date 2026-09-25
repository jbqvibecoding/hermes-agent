/**
 * Derived from errand/src/state/useCrewController.test.tsx (Apache-2.0, Runta).
 *
 * The fixtures follow our interface (thread ids are real, `setAgentUnread` is
 * gone, notifications are injected), but the cases are Errand's and they are
 * the reason the hook was worth vendoring: each one is a race that only shows
 * up under a slow network and looks like data loss when it bites.
 *
 * Three cases at the end are ours, covering the three places we changed it.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CloudAgentsClient } from "../domain/CloudAgentsClient";
import type { Agent, ApprovalRequest, ConversationEvent, Message } from "../domain/types";
import { useCrewController } from "./useCrewController";

const ISO = new Date(0).toISOString();

const agent = (id: string, name: string): Agent => ({
  id, name, role: "Teammate", goal: name, status: "idle", avatar: "🤖",
  lastActiveAt: ISO, unreadCount: 0, computerId: `crew-${id}`,
});

const conversation = (agentId: string) => ({
  id: `dm:${agentId}`, agentId, kind: "dm" as const, title: agentId, updatedAt: ISO,
});

const snapshot = (id: string, messages: Message[] = []) => ({
  conversation: { ...conversation(id.replace(/^dm:/, "")), id },
  messages,
  activities: [],
});

function stubClient(overrides: Partial<CloudAgentsClient> = {}): CloudAgentsClient {
  return {
    listModelProviders: async () => ({ organizationId: "", providers: [] }),
    listAgents: async () => [],
    getAgent: async (id) => agent(id, id),
    createAgent: async () => agent("new", "New"),
    updateAgent: async (id) => agent(id, id),
    deleteAgent: async () => undefined,
    duplicateAgent: async (id) => agent(`${id}-2`, id),
    listConversations: async (id) => [conversation(id)],
    getConversation: async (id) => snapshot(id),
    sendMessage: async (input) => ({
      id: "turn_x:user", conversationId: input.conversationId, role: "user",
      parts: [{ type: "text", text: input.text }], createdAt: ISO,
    }),
    subscribeToConversationEvents: () => ({ unsubscribe: () => undefined }),
    listApprovalRequests: async () => [],
    respondToApproval: async () => { throw new Error("unused"); },
    getComputer: async (id) => ({
      id: `crew-${id}`, agentId: id, runtimeName: `crew-${id}`, status: "online", capabilities: ["open"],
    }),
    openComputer: async () => ({ url: "ws://127.0.0.1:6080/websockify", protocols: [], mode: "remote" }),
    takeOverComputer: async () => ({ url: "ws://127.0.0.1:6080/websockify", protocols: [], mode: "remote" }),
    reconnect: async () => undefined,
    listSections: async () => [],
    saveSections: async (sections) => sections,
    listRoutines: async () => [],
    listTasks: async () => [],
    listArtifacts: async () => [],
    artifactUrl: (artifact) => `/files/${artifact.path}`,
    listGrants: async () => [],
    setGrant: async ({ tool }) => ({ tool, toolset: "", mode: "ask" as const, why: "", source: "grant" as const, protected: false }),
    clearGrant: async (_agentId, tool) => ({ tool, toolset: "", mode: "ask" as const, why: "", source: "default" as const, protected: false }),
    listAuditEvents: async () => ({ events: [], nextBeforeId: null }),
    deleteRoutine: async () => undefined,
    // Returns `filled: false`: the stub types no secret into any page, and a
    // default that claimed success would let a test assert the operator was
    // signed in when nothing happened.
    submitSecret: async () => ({ filled: false }),
    screenshotUrl: (a, f) => `/screenshots/${a}/${f}`,
    ...overrides,
  };
}

describe("useCrewController", () => {
  it("refreshes the model-provider catalog on demand", async () => {
    let providers: Awaited<ReturnType<CloudAgentsClient["listModelProviders"]>>["providers"] = [];
    const listModelProviders = vi.fn(async () => ({ organizationId: "", providers }));
    const client = stubClient({ listModelProviders });
    const { result } = renderHook(() => useCrewController(client));
    await waitFor(() => expect(result.current.loading).toBe(false));
    providers = [{ id: "anthropic", name: "Anthropic", protocol: "anthropic_messages" }];
    await act(async () => { await result.current.refreshModelProviders(); });
    expect(result.current.modelProviders).toEqual(providers);
    expect(listModelProviders).toHaveBeenCalledTimes(2);
  });

  it("does not touch the backend until it is enabled", async () => {
    const listAgents = vi.fn();
    const listModelProviders = vi.fn();
    const client = stubClient({ listAgents, listModelProviders });
    const { result } = renderHook(() => useCrewController(client, { enabled: false }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listAgents).not.toHaveBeenCalled();
    expect(listModelProviders).not.toHaveBeenCalled();
    expect(result.current.connection).toBe("disconnected");
  });

  it("never lets the previous teammate overwrite a newly selected thread", async () => {
    let resolveScout!: (value: ReturnType<typeof snapshot>) => void;
    const scoutThread = new Promise<ReturnType<typeof snapshot>>((resolve) => { resolveScout = resolve; });
    const listeners = new Map<string, (event: ConversationEvent) => void>();
    const client = stubClient({
      listAgents: async () => [agent("scout", "Scout"), agent("sorter", "Sorter")],
      getConversation: async (id) => id === "dm:scout"
        ? scoutThread
        : snapshot(id, [{ id: "s1", conversationId: id, role: "agent", parts: [{ type: "text", text: "Sorter" }], createdAt: ISO }]),
      subscribeToConversationEvents: (id, listener) => {
        listeners.set(id, listener);
        return { unsubscribe: () => undefined };
      },
    });
    const { result } = renderHook(() => useCrewController(client));
    await waitFor(() => expect(result.current.selectedAgentId).toBe("scout"));
    act(() => result.current.setSelectedAgentId("sorter"));
    await waitFor(() => expect(result.current.selectedAgentId).toBe("sorter"));

    // Scout's fetch and Scout's socket both land *after* the operator moved on.
    act(() => listeners.get("dm:scout")?.({
      type: "message.created",
      threadId: "dm:scout",
      message: { id: "late", conversationId: "dm:scout", role: "agent", parts: [{ type: "text", text: "Scout, late" }], createdAt: ISO },
    }));
    act(() => resolveScout(snapshot("dm:scout", [
      { id: "late-fetch", conversationId: "dm:scout", role: "agent", parts: [{ type: "text", text: "Scout, fetched" }], createdAt: ISO },
    ])));
    await act(async () => { await Promise.resolve(); });

    expect(result.current.messages.map((m) => m.id)).not.toContain("late");
    expect(result.current.messages.map((m) => m.id)).not.toContain("late-fetch");
  });

  it("restores a fresh snapshot without fetching the thread again", async () => {
    const getConversation = vi.fn(async (id: string) => snapshot(id, [
      { id: `${id}-m`, conversationId: id, role: "agent" as const, parts: [{ type: "text" as const, text: id }], createdAt: ISO },
    ]));
    const client = stubClient({
      listAgents: async () => [agent("scout", "Scout"), agent("sorter", "Sorter")],
      getConversation,
    });
    const { result } = renderHook(() => useCrewController(client));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    act(() => result.current.setSelectedAgentId("sorter"));
    await waitFor(() => expect(result.current.messages[0]?.id).toBe("dm:sorter-m"));
    act(() => result.current.setSelectedAgentId("scout"));
    await waitFor(() => expect(result.current.messages[0]?.id).toBe("dm:scout-m"));
    // Two threads, two fetches. Going back is cache, not network — that is what
    // keeps switching teammates from feeling like a page load.
    expect(getConversation).toHaveBeenCalledTimes(2);
  });

  it("keeps a removed teammate removed while a refresh is already in flight", async () => {
    let roster = [agent("scout", "Scout"), agent("sorter", "Sorter")];
    const client = stubClient({
      listAgents: async () => roster,
      deleteAgent: async (id) => { roster = roster.filter((a) => a.id !== id); },
    });
    const { result } = renderHook(() => useCrewController(client));
    await waitFor(() => expect(result.current.agents).toHaveLength(2));
    await act(async () => { await result.current.deleteAgent("scout"); });
    expect(result.current.agents.map((a) => a.id)).toEqual(["sorter"]);
    expect(result.current.selectedAgentId).toBe("sorter");
  });

  it("puts a teammate back when the removal fails", async () => {
    const client = stubClient({
      listAgents: async () => [agent("scout", "Scout"), agent("sorter", "Sorter")],
      deleteAgent: async () => { throw new Error("busy"); },
    });
    const { result } = renderHook(() => useCrewController(client));
    await waitFor(() => expect(result.current.agents).toHaveLength(2));
    await act(async () => {
      await result.current.deleteAgent("scout").catch(() => undefined);
    });
    expect(result.current.agents.map((a) => a.id)).toEqual(["scout", "sorter"]);
    expect(result.current.error).toBe("busy");
  });

  // -------------------------------------------------------------------------
  // Ours: the three changes to the vendored hook, and the id convention.
  // -------------------------------------------------------------------------

  it("merges the reply into the bubble the send already put on screen", async () => {
    // This is the whole return on the `{turn}:user` / `{turn}:agent` convention:
    // one optimistic pair, reconciled, rather than four bubbles.
    const listeners: Array<(event: ConversationEvent) => void> = [];
    const client = stubClient({
      listAgents: async () => [agent("scout", "Scout")],
      sendMessage: async (input) => ({
        id: "turn_7:user", conversationId: input.conversationId, role: "user",
        parts: [{ type: "text", text: input.text }], createdAt: ISO,
      }),
      subscribeToConversationEvents: (_id, listener) => {
        listeners.push(listener);
        return { unsubscribe: () => undefined };
      },
    });
    const { result } = renderHook(() => useCrewController(client));
    await waitFor(() => expect(result.current.selectedAgentId).toBe("scout"));
    await waitFor(() => expect(listeners).toHaveLength(1));

    await act(async () => { await result.current.sendMessage("pull the list"); });
    expect(result.current.messages).toHaveLength(2);

    act(() => listeners[0]!({
      type: "message.created",
      threadId: "dm:scout",
      message: {
        id: "turn_7:agent", conversationId: "dm:scout", role: "agent",
        parts: [{ type: "text", text: "" }], createdAt: ISO, streaming: true,
      },
    }));
    act(() => listeners[0]!({ type: "message.delta", threadId: "dm:scout", messageId: "turn_7:agent", delta: "52 accounts." }));

    // Still two: the server's reply claimed the optimistic bubble rather than
    // landing beside it.
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1]?.parts).toEqual([{ type: "text", text: "52 accounts." }]);
    expect(result.current.messages[1]?.streaming).toBe(true);

    act(() => listeners[0]!({ type: "message.completed", threadId: "dm:scout", messageId: "turn_7:agent", notify: true }));
    expect(result.current.messages[1]?.streaming).toBe(false);
  });

  it("drops the reserved bubble when the turn ends with nothing to say", async () => {
    const listeners: Array<(event: ConversationEvent) => void> = [];
    const client = stubClient({
      listAgents: async () => [agent("scout", "Scout")],
      // The same turn id the events below carry: `sendMessage` claims
      // `{turn}:agent` for the optimistic bubble, so a fixture that sends one
      // turn and then emits events for another is testing a case that cannot
      // happen.
      sendMessage: async (input) => ({
        id: "turn_9:user", conversationId: input.conversationId, role: "user",
        parts: [{ type: "text", text: input.text }], createdAt: ISO,
      }),
      subscribeToConversationEvents: (_id, listener) => {
        listeners.push(listener);
        return { unsubscribe: () => undefined };
      },
    });
    const { result } = renderHook(() => useCrewController(client));
    await waitFor(() => expect(result.current.selectedAgentId).toBe("scout"));
    await waitFor(() => expect(listeners).toHaveLength(1));
    await act(async () => { await result.current.sendMessage("file a report"); });

    act(() => listeners[0]!({
      type: "message.created",
      threadId: "dm:scout",
      message: { id: "turn_9:agent", conversationId: "dm:scout", role: "agent", parts: [{ type: "text", text: "" }], createdAt: ISO, streaming: true },
    }));
    // A teammate that filed a chip and said nothing else: the row is deleted
    // server-side, so the empty bubble has to go too.
    act(() => listeners[0]!({ type: "message.dropped", threadId: "dm:scout", messageId: "turn_9:agent" }));
    expect(result.current.messages.filter((m) => m.role === "agent")).toHaveLength(0);
  });

  it("shows an approval the moment it is held, not at the next revalidate", async () => {
    const listeners: Array<(event: ConversationEvent) => void> = [];
    const notify = vi.fn();
    const client = stubClient({
      listAgents: async () => [agent("scout", "Scout")],
      subscribeToConversationEvents: (_id, listener) => {
        listeners.push(listener);
        return { unsubscribe: () => undefined };
      },
    });
    const { result } = renderHook(() => useCrewController(client, { notify }));
    await waitFor(() => expect(result.current.selectedAgentId).toBe("scout"));
    await waitFor(() => expect(listeners).toHaveLength(1));
    expect(result.current.approvals).toHaveLength(0);

    const approval: ApprovalRequest = {
      id: "4", agentId: "scout", conversationId: "dm:scout", title: "send the 4 drafts",
      description: "", scope: [], status: "pending", createdAt: ISO,
    };
    act(() => listeners[0]!({ type: "approval.updated", threadId: "dm:scout", approval }));

    // Errand maps over the approvals it already has, so a brand-new one waits
    // up to 60s for the snapshot to expire. Draft-and-hold is our product; the
    // one state that needs a person cannot be the one that lags.
    expect(result.current.approvals).toEqual([approval]);
    expect(notify).toHaveBeenCalledWith({ title: "Scout needs you", body: "send the 4 drafts" });

    act(() => listeners[0]!({
      type: "approval.updated",
      threadId: "dm:scout",
      approval: { ...approval, status: "allowed" },
    }));
    expect(result.current.approvals).toHaveLength(1);
    expect(result.current.approvals[0]?.status).toBe("allowed");
  });

  it("flips a teammate's status from the event stream rather than a poll", async () => {
    const listeners: Array<(event: ConversationEvent) => void> = [];
    const client = stubClient({
      listAgents: async () => [agent("scout", "Scout")],
      subscribeToConversationEvents: (_id, listener) => {
        listeners.push(listener);
        return { unsubscribe: () => undefined };
      },
    });
    const { result } = renderHook(() => useCrewController(client));
    await waitFor(() => expect(result.current.selectedAgentId).toBe("scout"));
    await waitFor(() => expect(listeners).toHaveLength(1));
    expect(result.current.agents[0]?.status).toBe("idle");

    act(() => listeners[0]!({ type: "agent.status", agentId: "scout", status: "waiting_for_approval" }));
    expect(result.current.agents[0]?.status).toBe("waiting_for_approval");
  });

  it("opens a room by thread id, which errand's one-thread-per-agent model cannot", async () => {
    const client = stubClient({
      listAgents: async () => [agent("scout", "Scout")],
      listConversations: async (id) => [
        conversation(id),
        { id: "group:standup", agentId: "", kind: "group" as const, title: "Standup", updatedAt: ISO },
      ],
      getConversation: async (id) => snapshot(id, [
        { id: `${id}-m`, conversationId: id, role: "agent" as const, parts: [{ type: "text" as const, text: id }], createdAt: ISO },
      ]),
    });
    const { result } = renderHook(() => useCrewController(client));
    await waitFor(() => expect(result.current.selectedThreadId).toBe("dm:scout"));

    act(() => result.current.setSelectedThreadId("group:standup"));
    await waitFor(() => expect(result.current.messages[0]?.id).toBe("group:standup-m"));
    expect(result.current.selectedThreadId).toBe("group:standup");
  });
});
