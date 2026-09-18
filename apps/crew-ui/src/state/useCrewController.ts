/**
 * Derived from errand/src/state/useCrewController.ts (Apache-2.0, Runta).
 *
 * This is the piece worth vendoring rather than rewriting. It is a conversation
 * state machine that has already been through the problems that only show up in
 * production: a 60s per-agent snapshot cache, optimistic send with tombstones so
 * a deleted agent cannot come back, and ordering guards so a slow fetch for the
 * agent you just left cannot overwrite the one you are looking at.
 *
 * Four marked changes, each labelled `CREW:` in the body:
 *
 *  1. **Thread ids come from the caller.** Errand derives `conversation-<agentId>`
 *     because it has one conversation per agent. We have rooms.
 *  2. **`approval.updated` upserts.** Errand maps over the approvals it already
 *     has, so a newly held action does not reach the panel until the snapshot
 *     revalidates — up to a minute of a teammate waiting at the door with
 *     nothing on screen. Draft-and-hold is our product; a minute is too long.
 *  3. **Notifications are injected.** Errand calls into its Electron preload.
 *     We take a callback, so the same hook runs in a browser tab.
 *  4. **`agent.status` is handled.** Errand polls its roster every 30s; our
 *     backend pushes, so the sidebar flips the moment a turn starts.
 *
 * Attachments are not here. The backend has no attachment store yet, and a
 * paperclip that silently drops files is worse than no paperclip.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CloudAgentsClient } from "../domain/CloudAgentsClient";
import {
  CrewError,
  type ActivityEvent,
  type Agent,
  type AgentStatus,
  type ApprovalRequest,
  type CloudComputer,
  type ConnectionState,
  type Conversation,
  type ConversationEvent,
  type CreateAgentInput,
  type Message,
  type ModelProviderOption,
  type UpdateAgentInput,
} from "../domain/types";

function agentMessagePreview(message?: Message): string {
  if (!message || message.role !== "agent") return "";
  return message.parts.filter((part) => part.type === "text").map((part) => part.text).join("").trim();
}

function latestCompletedAgentPreview(messages: Message[]): string {
  return agentMessagePreview(
    [...messages].reverse().find((message) => message.role === "agent" && !message.streaming),
  );
}

function messageText(message: Message): string {
  return message.parts.filter((part) => part.type === "text").map((part) => part.text).join("");
}

interface AgentSnapshot {
  messages: Message[];
  activities: ActivityEvent[];
  approvals: ApprovalRequest[];
  conversations: Conversation[];
  computer?: CloudComputer;
  cachedAt: number;
}

const SNAPSHOT_TTL_MS = 60_000;
const AGENT_FALLBACK_REFRESH_MS = 30_000;
const OPTIMISTIC_USER_PREFIX = "optimistic-user:";
const OPTIMISTIC_AGENT_PREFIX = "optimistic-agent:";

export interface CrewControllerOptions {
  enabled?: boolean;
  /** CREW(3): told when a teammate finishes or needs a decision. */
  notify?(notification: { title: string; body: string }): void;
}

export function useCrewController(client: CloudAgentsClient, options: CrewControllerOptions = {}) {
  const { enabled = true, notify } = options;
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  // CREW(1): the thread the operator is looking at. Empty means "the selected
  // teammate's DM", which the snapshot effect resolves once it has the list.
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [computer, setComputer] = useState<CloudComputer>();
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [modelProviders, setModelProviders] = useState<ModelProviderOption[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string>();
  const [loadedAgentIds, setLoadedAgentIds] = useState<ReadonlySet<string>>(() => new Set());
  const [liveAgentId, setLiveAgentId] = useState("");
  const [revalidateVersion, setRevalidateVersion] = useState(0);

  const snapshots = useRef(new Map<string, AgentSnapshot>());
  const selectedAgentIdRef = useRef(selectedAgentId);
  const deletingAgentIds = useRef(new Set<string>());
  const visualMessageIds = useRef(new Map<string, string>());
  const notifyRef = useRef(notify);

  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId),
    [agents, selectedAgentId],
  );
  const conversationId = selectedThreadId || (selectedAgentId ? `dm:${selectedAgentId}` : "");
  const conversationLoading = Boolean(selectedAgentId && !loadedAgentIds.has(selectedAgentId));

  useEffect(() => { selectedAgentIdRef.current = selectedAgentId; }, [selectedAgentId]);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  const refreshAgents = useCallback(async (preserveSelection = false) => {
    const fetched = await client.listAgents();
    for (const agentId of deletingAgentIds.current) {
      if (!fetched.some((agent) => agent.id === agentId)) deletingAgentIds.current.delete(agentId);
    }
    const next = fetched.filter((agent) => !deletingAgentIds.current.has(agent.id));
    const selectedId = selectedAgentIdRef.current;
    const selected = next.find((agent) => agent.id === selectedId);
    const snapshot = snapshots.current.get(selectedId);
    if (selected?.lastMessagePreview && snapshot && !snapshot.messages.some((m) => m.streaming)) {
      const cachedPreview = latestCompletedAgentPreview(snapshot.messages);
      if (cachedPreview !== selected.lastMessagePreview) {
        snapshots.current.set(selectedId, { ...snapshot, cachedAt: 0 });
        setRevalidateVersion((value) => value + 1);
      }
    }
    const selectedIsStreaming = Boolean(snapshot?.messages.some((message) => message.streaming));
    setAgents((current) => next.map((agent) => {
      const existing = current.find((item) => item.id === agent.id);
      const localPreview = latestCompletedAgentPreview(snapshots.current.get(agent.id)?.messages ?? []);
      const preserveLocalPreview = Boolean(localPreview) || (agent.id === selectedId && selectedIsStreaming);
      return {
        ...agent,
        lastMessagePreview: preserveLocalPreview
          ? localPreview || existing?.lastMessagePreview
          : agent.lastMessagePreview ?? existing?.lastMessagePreview,
      };
    }));
    setSelectedAgentId((current) =>
      current && next.some((agent) => agent.id === current)
        ? current
        : preserveSelection ? current : next[0]?.id || "");
    return next;
  }, [client]);

  const refreshModelProviders = useCallback(async () => {
    const catalog = await client.listModelProviders();
    setModelProviders(catalog.providers);
    return catalog.providers;
  }, [client]);

  useEffect(() => {
    if (!enabled) {
      setAgents([]); setModelProviders([]); setSelectedAgentId(""); setSelectedThreadId("");
      setMessages([]); setActivities([]); setApprovals([]); setComputer(undefined);
      setConnection("disconnected"); setLoading(false); setError(undefined);
      return;
    }
    let alive = true;
    setLoading(true);
    void Promise.all([refreshAgents(), refreshModelProviders()])
      .then(() => { if (alive) { setConnection("connected"); setLoading(false); } })
      .catch((reason: unknown) => {
        if (!alive) return;
        setConnection("error");
        setError(reason instanceof Error ? reason.message : "Could not load the crew");
        setLoading(false);
      });
    return () => { alive = false; };
  }, [enabled, refreshAgents, refreshModelProviders]);

  // The roster arrives over the event stream, so this is a safety net rather
  // than the mechanism — it catches a socket that died quietly and a tab that
  // was asleep while the crew worked.
  useEffect(() => {
    if (!enabled) return;
    const refreshWhenActive = () => {
      if (document.visibilityState === "hidden" || !navigator.onLine) return;
      void refreshAgents().catch(() => undefined);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshWhenActive();
    };
    const timer = window.setInterval(refreshWhenActive, AGENT_FALLBACK_REFRESH_MS);
    window.addEventListener("focus", refreshWhenActive);
    window.addEventListener("online", refreshWhenActive);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshWhenActive);
      window.removeEventListener("online", refreshWhenActive);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, refreshAgents]);

  // Switching teammates resets the thread to their DM. Picking a room is an
  // explicit act; inheriting the last one would put the operator in a
  // conversation they did not open.
  useEffect(() => { setSelectedThreadId(""); }, [selectedAgentId]);

  useEffect(() => {
    if (!enabled) return;
    const cached = snapshots.current.get(selectedAgentId);
    if (cached) {
      setMessages(cached.messages); setActivities(cached.activities);
      setApprovals(cached.approvals); setComputer(cached.computer);
      setConversations(cached.conversations);
    } else {
      setMessages([]); setActivities([]); setApprovals([]); setComputer(undefined); setConversations([]);
    }
    setLiveAgentId("");
    if (!selectedAgentId) return;

    const cacheAge = cached ? Date.now() - cached.cachedAt : Number.POSITIVE_INFINITY;
    if (cached && cacheAge < SNAPSHOT_TTL_MS && !selectedThreadId) {
      if (cached.messages.some((message) => message.streaming)) setLiveAgentId(selectedAgentId);
      const timer = window.setTimeout(() => setRevalidateVersion((v) => v + 1), SNAPSHOT_TTL_MS - cacheAge);
      return () => window.clearTimeout(timer);
    }

    const controller = new AbortController();
    let alive = true;
    Promise.all([
      client.listConversations(selectedAgentId, controller.signal),
      client.listApprovalRequests(selectedAgentId, controller.signal),
      client.getComputer(selectedAgentId, controller.signal),
    ]).then(async ([nextConversations, nextApprovals, nextComputer]) => {
      const target = selectedThreadId
        ? nextConversations.find((item) => item.id === selectedThreadId) ?? nextConversations[0]
        : nextConversations[0];
      const data = target ? await client.getConversation(target.id, controller.signal) : undefined;
      if (!alive || deletingAgentIds.current.has(selectedAgentId)) return;

      const snapshotMessages = snapshots.current.get(selectedAgentId)?.messages ?? [];
      const hydratedMessages = (data?.messages ?? []).map((message) => {
        const visualId = visualMessageIds.current.get(message.id);
        return visualId ? { ...message, id: visualId } : message;
      });
      const optimisticMessages = snapshotMessages.filter(
        (message) => message.id.startsWith(OPTIMISTIC_USER_PREFIX) || message.id.startsWith(OPTIMISTIC_AGENT_PREFIX),
      );
      const nextMessages = [
        ...hydratedMessages,
        ...optimisticMessages.filter((m) => !hydratedMessages.some((item) => item.id === m.id)),
      ];
      const preview = latestCompletedAgentPreview(nextMessages);
      const nextActivities = data?.activities ?? [];
      snapshots.current.set(selectedAgentId, {
        messages: nextMessages, activities: nextActivities, approvals: nextApprovals,
        conversations: nextConversations, computer: nextComputer, cachedAt: Date.now(),
      });
      setLoadedAgentIds((current) => new Set(current).add(selectedAgentId));
      setMessages(nextMessages); setActivities(nextActivities); setApprovals(nextApprovals);
      setComputer(nextComputer); setConversations(nextConversations);
      setLiveAgentId(selectedAgentId);
      if (preview) {
        setAgents((current) => current.map((agent) =>
          agent.id === selectedAgentId ? { ...agent, lastMessagePreview: preview } : agent));
      }
    }).catch((reason: unknown) => {
      if (!alive || deletingAgentIds.current.has(selectedAgentId)) return;
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      snapshots.current.set(selectedAgentId, {
        messages: [], activities: [], approvals: [], conversations: [], cachedAt: Date.now(),
      });
      setLoadedAgentIds((current) => new Set(current).add(selectedAgentId));
      setMessages([]);
      setError(reason instanceof Error ? reason.message : "Could not load this teammate");
    });
    return () => { alive = false; controller.abort(); };
  }, [client, enabled, revalidateVersion, selectedAgentId, selectedThreadId]);

  // A container takes a few seconds to publish its screen, and there is no
  // event for "docker finished starting". Polling stops the moment it is up.
  useEffect(() => {
    if (!enabled || !selectedAgentId || computer?.status === "online") return;
    let active = true;
    const refreshComputer = async () => {
      try {
        const nextComputer = await client.getComputer(selectedAgentId);
        if (!active || selectedAgentIdRef.current !== selectedAgentId) return;
        setComputer(nextComputer);
        const snapshot = snapshots.current.get(selectedAgentId);
        if (snapshot) snapshots.current.set(selectedAgentId, { ...snapshot, computer: nextComputer });
      } catch { /* Availability shows through the connection state, not an alert. */ }
    };
    const timer = window.setInterval(() => { void refreshComputer(); }, 2_000);
    void refreshComputer();
    return () => { active = false; window.clearInterval(timer); };
  }, [client, computer?.status, enabled, selectedAgentId]);

  useEffect(() => {
    if (!enabled || !conversationId || liveAgentId !== selectedAgentId) return;
    let active = true;
    const targetAgentId = selectedAgentId;
    const patchSnapshot = (patch: Partial<AgentSnapshot>) => {
      const snapshot = snapshots.current.get(targetAgentId);
      snapshots.current.set(targetAgentId, {
        messages: snapshot?.messages ?? [], activities: snapshot?.activities ?? [],
        approvals: snapshot?.approvals ?? [], conversations: snapshot?.conversations ?? [],
        computer: snapshot?.computer, cachedAt: Date.now(), ...patch,
      });
    };
    const updateMessages = (updater: (current: Message[]) => Message[]) =>
      setMessages((current) => { const next = updater(current); patchSnapshot({ messages: next }); return next; });

    const subscription = client.subscribeToConversationEvents(conversationId, (event: ConversationEvent) => {
      if (!active) return;

      if (event.type === "message.created") {
        updateMessages((current) => {
          let nextMessage = event.message;
          const knownVisualId = visualMessageIds.current.get(event.message.id);
          if (knownVisualId) nextMessage = { ...event.message, id: knownVisualId };
          if (event.message.role === "user" && !knownVisualId) {
            const claimed = new Set(visualMessageIds.current.values());
            const optimistic = current.find((message) =>
              message.id.startsWith(OPTIMISTIC_USER_PREFIX) && !claimed.has(message.id)
              && messageText(message) === messageText(event.message));
            if (optimistic) {
              visualMessageIds.current.set(event.message.id, optimistic.id);
              nextMessage = { ...event.message, id: optimistic.id };
            }
          }
          if (event.message.role === "agent" && !knownVisualId) {
            const claimed = new Set(visualMessageIds.current.values());
            const optimistic = current.find((message) =>
              message.id.startsWith(OPTIMISTIC_AGENT_PREFIX) && !claimed.has(message.id));
            if (optimistic) {
              visualMessageIds.current.set(event.message.id, optimistic.id);
              nextMessage = { ...event.message, id: optimistic.id };
            }
          }
          const existing = current.find((message) => message.id === nextMessage.id);
          return existing
            ? current.map((message) => message.id === nextMessage.id ? nextMessage : message)
            : [...current, nextMessage];
        });
      }

      if (event.type === "message.delta") {
        updateMessages((current) => {
          let visualId = visualMessageIds.current.get(event.messageId);
          if (!visualId) {
            const claimed = new Set(visualMessageIds.current.values());
            const optimistic = current.find((message) =>
              message.id.startsWith(OPTIMISTIC_AGENT_PREFIX) && !claimed.has(message.id));
            if (optimistic) { visualId = optimistic.id; visualMessageIds.current.set(event.messageId, visualId); }
          }
          visualId ??= event.messageId;
          if (!current.some((message) => message.id === visualId)) {
            return [...current, {
              id: visualId, conversationId, role: "agent",
              parts: [{ type: "text", text: event.delta }],
              createdAt: new Date().toISOString(), streaming: true,
            }];
          }
          return current.map((message) => message.id === visualId
            ? {
                ...message,
                parts: message.parts.map((part, index) =>
                  index === 0 && part.type === "text" ? { ...part, text: part.text + event.delta } : part),
              }
            : message);
        });
      }

      if (event.type === "message.completed") {
        const visualId = visualMessageIds.current.get(event.messageId) ?? event.messageId;
        if (event.notify === false) {
          // The turn stopped to run a tool. The bubble blanks but keeps
          // streaming — the teammate has not finished, it went to work.
          updateMessages((current) => current.flatMap((message) => {
            if (message.id !== visualId) return [message];
            if (!message.id.startsWith(OPTIMISTIC_AGENT_PREFIX)) return [];
            return [{
              ...message,
              parts: message.parts.map((part) => part.type === "text" ? { ...part, text: "" } : part),
              streaming: true,
            }];
          }));
        } else {
          updateMessages((current) => {
            const completed = current
              .filter((message) => message.id === visualId || message.role !== "agent" || !message.streaming)
              .map((message) => message.id === visualId ? { ...message, streaming: false } : message);
            const completedPreview = latestCompletedAgentPreview(completed);
            if (completedPreview) {
              setAgents((list) => list.map((agent) =>
                agent.id === targetAgentId ? { ...agent, lastMessagePreview: completedPreview } : agent));
            }
            return completed;
          });
          notifyRef.current?.({
            title: `${selectedAgent?.name ?? "Your teammate"} finished`,
            body: "There is something new to read.",
          });
        }
      }

      // An empty final response: the teammate filed a chip and had nothing left
      // to say. Drop the reserved bubble rather than leave a blank one.
      if (event.type === "message.dropped") {
        const visualId = visualMessageIds.current.get(event.messageId) ?? event.messageId;
        updateMessages((current) => current.filter((message) => message.id !== visualId));
      }

      if (event.type === "message.updated") {
        updateMessages((current) => {
          const visualId = visualMessageIds.current.get(event.message.id);
          const nextMessage = visualId ? { ...event.message, id: visualId } : event.message;
          const existing = current.find((message) => message.id === nextMessage.id);
          const settled = event.message.role === "agent" && !event.message.streaming
            ? current.filter((m) => m.id === nextMessage.id || m.role !== "agent" || !m.streaming)
            : current;
          return existing
            ? settled.map((message) => message.id === nextMessage.id ? nextMessage : message)
            : [...settled, nextMessage];
        });
        if (event.message.role === "agent" && !event.message.streaming) {
          setAgents((current) => current.map((agent) => agent.id === targetAgentId
            ? { ...agent, lastMessagePreview: agentMessagePreview(event.message) || undefined }
            : agent));
        }
      }

      // CREW(2): upsert, not map. A newly held action has to reach the panel
      // now — that is the one state where somebody is waiting on a person.
      if (event.type === "approval.updated") {
        setApprovals((current) => {
          const next = current.some((approval) => approval.id === event.approval.id)
            ? current.map((approval) => approval.id === event.approval.id ? event.approval : approval)
            : [event.approval, ...current];
          patchSnapshot({ approvals: next });
          return next;
        });
        if (event.approval.status === "pending") {
          notifyRef.current?.({
            title: `${selectedAgent?.name ?? "Your teammate"} needs you`,
            body: event.approval.title,
          });
        }
      }

      if (event.type === "activity.updated") {
        setActivities((current) => {
          const next = current.some((activity) => activity.id === event.activity.id)
            ? current.map((activity) => activity.id === event.activity.id ? event.activity : activity)
            : [...current, event.activity];
          patchSnapshot({ activities: next });
          return next;
        });
      }

      // CREW(4): the sidebar flips as turns start and stop, with no poll.
      if (event.type === "agent.status") {
        setAgents((current) => current.map((agent) =>
          agent.id === event.agentId ? { ...agent, status: event.status as AgentStatus } : agent));
      }

      if (event.type === "connection.changed") setConnection(event.state);
    });

    return () => { active = false; subscription.unsubscribe(); };
  }, [client, conversationId, enabled, liveAgentId, selectedAgent?.name, selectedAgentId]);

  return {
    agents, conversations, modelProviders, selectedAgent, selectedAgentId, setSelectedAgentId,
    selectedThreadId: conversationId, setSelectedThreadId,
    messages, activities, approvals, computer, connection, loading, conversationLoading, error,
    refreshAgents, refreshModelProviders,
    dismissError: () => setError(undefined),

    createAgent: async (input: CreateAgentInput) => {
      const agent = await client.createAgent(input);
      await refreshAgents(true);
      setSelectedAgentId(agent.id);
      return agent;
    },
    updateAgent: async (agentId: string, input: UpdateAgentInput) => {
      await client.updateAgent(agentId, input);
      await refreshAgents(true);
    },
    duplicateAgent: async (agentId: string) => {
      const agent = await client.duplicateAgent(agentId);
      await refreshAgents(true);
      setSelectedAgentId(agent.id);
    },
    deleteAgent: async (agentId: string) => {
      const removedAgent = agents.find((agent) => agent.id === agentId);
      const previousSelectedAgentId = selectedAgentId;
      if (!removedAgent || deletingAgentIds.current.has(agentId)) return;
      const removedIndex = agents.findIndex((agent) => agent.id === agentId);
      const nextAgents = agents.filter((agent) => agent.id !== agentId);
      const nextSelectedAgentId = previousSelectedAgentId === agentId
        ? nextAgents[Math.min(Math.max(removedIndex, 0), Math.max(nextAgents.length - 1, 0))]?.id ?? ""
        : previousSelectedAgentId;
      // The tombstone is what stops a refresh that was already in flight from
      // putting the row back a beat after it disappeared.
      deletingAgentIds.current.add(agentId);
      setAgents(nextAgents); setSelectedAgentId(nextSelectedAgentId);
      try {
        try { await client.deleteAgent(agentId); }
        catch (reason) { if (!(reason instanceof CrewError && reason.code === "not_found")) throw reason; }
        snapshots.current.delete(agentId);
        setLoadedAgentIds((current) => { const next = new Set(current); next.delete(agentId); return next; });
        await refreshAgents();
      } catch (reason) {
        deletingAgentIds.current.delete(agentId);
        setAgents((current) => {
          if (current.some((agent) => agent.id === agentId)) return current;
          const next = [...current];
          next.splice(Math.min(removedIndex, next.length), 0, removedAgent);
          return next;
        });
        setSelectedAgentId((current) => current || (previousSelectedAgentId === agentId ? agentId : current));
        setError(reason instanceof Error ? reason.message : "Could not remove this teammate");
        throw reason;
      }
    },

    sendMessage: async (text: string) => {
      if (!conversationId || !selectedAgentId) return;
      const targetAgentId = selectedAgentId;
      const targetConversationId = conversationId;
      const nonce = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const optimisticUserId = `${OPTIMISTIC_USER_PREFIX}${nonce}`;
      const optimisticAgentId = `${OPTIMISTIC_AGENT_PREFIX}${nonce}`;
      const createdAt = new Date().toISOString();
      const optimisticUser: Message = {
        id: optimisticUserId, conversationId: targetConversationId, role: "user",
        parts: [{ type: "text", text }], createdAt,
      };
      const optimisticAgent: Message = {
        id: optimisticAgentId, conversationId: targetConversationId, role: "agent",
        parts: [{ type: "text", text: "" }], createdAt, streaming: true,
      };
      const snapshot = snapshots.current.get(targetAgentId) ?? {
        messages: [], activities: [], approvals: [], conversations: [], cachedAt: Date.now(),
      };
      const existingWorking = [...snapshot.messages].reverse()
        .find((message) => message.role === "agent" && message.streaming);
      const interruptedMessages = existingWorking
        ? snapshot.messages.map((message) => message.id === existingWorking.id
            ? { ...message, streaming: false, interrupted: true } : message)
        : snapshot.messages;
      const optimisticMessages = [...interruptedMessages, optimisticUser, optimisticAgent];
      if (selectedAgentIdRef.current === targetAgentId) setActivities([]);
      snapshots.current.set(targetAgentId, { ...snapshot, messages: optimisticMessages, activities: [], cachedAt: Date.now() });
      if (selectedAgentIdRef.current === targetAgentId) { setMessages(optimisticMessages); setLiveAgentId(targetAgentId); }
      try {
        const message = await client.sendMessage({ conversationId: targetConversationId, text });
        visualMessageIds.current.set(message.id, optimisticUserId);
        // The whole id convention pays off in these three lines: the server's
        // `{turn}:user` tells us which `{turn}:agent` the reply will be, so the
        // empty bubble already on screen is the one that fills in.
        const turnId = message.id.match(/^(.+):user(?:$|:)/)?.[1];
        if (turnId) {
          visualMessageIds.current.set(`${turnId}:user`, optimisticUserId);
          visualMessageIds.current.set(`${turnId}:agent`, existingWorking?.id ?? optimisticAgentId);
        }
        const latest = snapshots.current.get(targetAgentId) ?? snapshot;
        const visualMessage = { ...message, id: optimisticUserId };
        const reconciled = latest.messages
          .map((item) => item.id === optimisticUserId ? visualMessage : item)
          .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
        snapshots.current.set(targetAgentId, { ...latest, messages: reconciled, cachedAt: Date.now() });
        if (selectedAgentIdRef.current === targetAgentId) setMessages(reconciled);
      } catch (reason) {
        const latest = snapshots.current.get(targetAgentId) ?? snapshot;
        const withoutEmptyAgent = latest.messages.filter((message) => message.id !== optimisticAgentId);
        const retained = withoutEmptyAgent.some((message) => message.id === optimisticUserId)
          ? withoutEmptyAgent : [...withoutEmptyAgent, optimisticUser];
        snapshots.current.set(targetAgentId, { ...latest, messages: retained, cachedAt: Date.now() });
        if (selectedAgentIdRef.current === targetAgentId) setMessages(retained);
        if (!existingWorking) setError(reason instanceof Error ? reason.message : "Could not send that");
        throw reason;
      }
    },

    respondToApproval: async (requestId: string, decision: "allow" | "deny", note?: string) => {
      const targetAgentId = selectedAgentId;
      const next = await client.respondToApproval({ requestId, decision, note });
      const snapshot = snapshots.current.get(targetAgentId);
      const nextApprovals = (snapshot?.approvals ?? []).map((item) => item.id === next.id ? next : item);
      if (snapshot) snapshots.current.set(targetAgentId, { ...snapshot, approvals: nextApprovals, cachedAt: Date.now() });
      if (selectedAgentIdRef.current === targetAgentId) setApprovals(nextApprovals);
    },

    openComputer: async (action: "open" | "takeover") => {
      if (!selectedAgentId) throw new Error("No teammate is selected");
      try {
        return await (action === "open"
          ? client.openComputer(selectedAgentId)
          : client.takeOverComputer(selectedAgentId));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Could not open that computer");
        throw reason;
      }
    },

    reconnect: async () => {
      setConnection("connecting");
      try {
        await client.reconnect();
        await refreshAgents();
        setConnection("connected");
      } catch (reason) {
        setConnection("error");
        setError(reason instanceof Error ? reason.message : "Reconnect failed");
      }
    },
  };
}
