/**
 * The whole Crew surface, in one component both shells mount.
 *
 * Stands in for errand's `App.tsx`, which is not portable: it owns device-flow
 * OAuth against Runta's cloud, an Electron dock badge, and an auto-updater.
 * What is worth keeping from it is the shape — roster, thread, details — and
 * one behaviour: when a teammate needs a decision, open the panel that holds
 * the decision (`App.tsx:124`). Everything else here is ours.
 *
 * State lives in `useCrewController`; this file is layout, dialogs and
 * keyboard. Anything that looks like conversation logic belongs there instead.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CloudAgentsClient } from "../domain/CloudAgentsClient";
import type { Agent, Artifact, AuditEvent, Grant, Routine, Section } from "../domain/types";
import { useCrewController, type CrewControllerOptions } from "../state/useCrewController";
import { AgentList, type AgentAction } from "./AgentList";
import { CommandPalette } from "./CommandPalette";
import { Conversation } from "./Conversation";
import { DetailPanel } from "./DetailPanel";
import { HireDialog, type HireDraft } from "./HireDialog";
import type { ChipHandlers } from "./chips";

const DETAIL_WIDTH_KEY = "hermes-crew:detail-width";

function storedDetailWidth(): number {
  try {
    const raw = window.localStorage?.getItem(DETAIL_WIDTH_KEY);
    const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
    return Number.isFinite(parsed) ? Math.max(280, parsed) : 360;
  } catch { return 360; }
}

export function CrewWorkspace({ client, notify }: {
  client: CloudAgentsClient;
  notify?: CrewControllerOptions["notify"];
}) {
  const crew = useCrewController(client, { notify });
  const [search, setSearch] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [grantsBusy, setGrantsBusy] = useState(false);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditView, setAuditView] = useState<{ id: string; types: string[] }>({ id: "all", types: [] });
  const [auditBefore, setAuditBefore] = useState<number | null>(null);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailWidth, setDetailWidth] = useState(storedDetailWidth);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dialog, setDialog] = useState<{ editing?: Agent } | undefined>();
  const [dialogBusy, setDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string>();
  const [focusRequest, setFocusRequest] = useState(0);

  const { agents, conversations, selectedAgent, selectedAgentId, selectedThreadId } = crew;
  const rooms = useMemo(() => conversations.filter((c) => c.kind === "group"), [conversations]);
  const agentsById = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  const thread = useMemo(
    () => conversations.find((c) => c.id === selectedThreadId),
    [conversations, selectedThreadId],
  );
  const pendingApprovalCount = crew.approvals.filter((a) => a.status === "pending").length;

  useEffect(() => {
    try { window.localStorage?.setItem(DETAIL_WIDTH_KEY, String(detailWidth)); } catch { /* private mode */ }
  }, [detailWidth]);

  // The org chart is small, changes rarely, and is shared by every teammate —
  // so it loads once rather than riding each agent's snapshot.
  const refreshSections = useCallback(() => {
    void client.listSections().then(setSections).catch(() => setSections([]));
  }, [client]);
  useEffect(refreshSections, [refreshSections, agents.length]);

  useEffect(() => {
    if (!selectedAgentId) { setRoutines([]); return; }
    let alive = true;
    void client.listRoutines(selectedAgentId)
      .then((next) => { if (alive) setRoutines(next); })
      .catch(() => { if (alive) setRoutines([]); });
    return () => { alive = false; };
  }, [client, selectedAgentId]);

  // Permissions and history follow the same shape as routines: fetched per
  // teammate, straight from the client. They are not in the controller because
  // nothing streams them — they change when somebody changes them, and the
  // panel that shows them is the thing that changes them.
  useEffect(() => {
    if (!selectedAgentId) { setGrants([]); return; }
    let alive = true;
    void client.listGrants(selectedAgentId)
      .then((next) => { if (alive) setGrants(next); })
      .catch(() => { if (alive) setGrants([]); });
    return () => { alive = false; };
  }, [client, selectedAgentId]);

  const refreshArtifacts = useCallback(() => {
    if (!selectedAgentId) { setArtifacts([]); return; }
    void client.listArtifacts(selectedAgentId)
      .then(setArtifacts)
      .catch(() => setArtifacts([]));
  }, [client, selectedAgentId]);
  useEffect(refreshArtifacts, [refreshArtifacts]);

  // A file written during a turn should appear without the operator reloading,
  // so re-list when the teammate stops working. Re-listing rather than
  // appending the event's row: the server reconciles the list against the disk,
  // and trusting an append would leave rows here for files that were
  // overwritten or have since gone.
  const agentStatus = selectedAgent?.status;
  useEffect(() => {
    if (agentStatus === "working") return;
    refreshArtifacts();
  }, [agentStatus, refreshArtifacts]);

  const loadAudit = useCallback((types: string[], beforeId?: number) => {
    if (!selectedAgentId) { setAudit([]); setAuditBefore(null); return; }
    setAuditLoading(true);
    void client.listAuditEvents({
      agentId: selectedAgentId, eventTypes: types, beforeId, limit: 50,
    })
      // Append when paging, replace when the question changed. Getting this
      // backwards silently mixes two different filters into one list.
      .then((page) => {
        setAudit((current) => (beforeId ? [...current, ...page.events] : page.events));
        setAuditBefore(page.nextBeforeId);
      })
      .catch(() => { if (!beforeId) { setAudit([]); setAuditBefore(null); } })
      .finally(() => setAuditLoading(false));
  }, [client, selectedAgentId]);

  useEffect(() => { loadAudit(auditView.types); }, [loadAudit, auditView]);

  // Open the panel when somebody is waiting on a person. Not on every status
  // change — a teammate that merely started working has not asked for anything.
  useEffect(() => {
    if (pendingApprovalCount > 0) setDetailOpen(true);
  }, [pendingApprovalCount]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const toggleSection = (sectionId: string, collapsed: boolean) => {
    const next = sections.map((section) =>
      section.id === sectionId ? { ...section, collapsed } : section);
    setSections(next);
    // The server answers with what it *stored*, which may differ: normalising
    // can drop a teammate two sections both claimed.
    void client.saveSections(next).then(setSections).catch(refreshSections);
  };

  const onAction = (agent: Agent, action: AgentAction) => {
    if (action === "edit") { setDialogError(undefined); setDialog({ editing: agent }); return; }
    if (action === "duplicate") { void crew.duplicateAgent(agent.id).catch(() => undefined); return; }
    if (window.confirm(`Remove ${agent.name} from the crew? Their profile, memory and skills stay on disk.`)) {
      void crew.deleteAgent(agent.id).catch(() => undefined);
    }
  };

  const submitDialog = async (draft: HireDraft) => {
    setDialogBusy(true);
    setDialogError(undefined);
    try {
      if (dialog?.editing) {
        await crew.updateAgent(dialog.editing.id, { role: draft.role, emoji: draft.emoji });
      } else {
        await crew.createAgent({
          name: draft.name,
          role: draft.role,
          emoji: draft.emoji,
          modelProviderId: draft.modelProviderId || undefined,
        });
      }
      setDialog(undefined);
      refreshSections();
    } catch (reason) {
      setDialogError(reason instanceof Error ? reason.message : "That did not work.");
    } finally {
      setDialogBusy(false);
    }
  };

  const chips: ChipHandlers = useMemo(() => ({
    onDecide: (approvalId, decision) => {
      void crew.respondToApproval(approvalId, decision).catch(() => undefined);
    },
    // A login request is the one chip that is an instruction to the operator,
    // so its button does the thing rather than pointing at where the thing is.
    onOpenScreen: () => { setDetailOpen(true); void crew.openComputer("takeover").catch(() => undefined); },
    screenshotUrl: (agentId, filename) => client.screenshotUrl(agentId, filename),
  }), [client, crew]);

  if (crew.loading) {
    return <div className="crew-workspace is-loading" role="status">Loading your crew…</div>;
  }

  if (!agents.length) {
    return <div className="crew-workspace is-empty">
      <div className="crew-empty-card">
        <h2>No teammates yet</h2>
        <p>
          A teammate is a Hermes profile with a thread, a memory and a computer of its own.
          Give one a name and a one-line job to start.
        </p>
        <button className="primary-button" onClick={() => { setDialogError(undefined); setDialog({}); }}>
          Hire your first teammate
        </button>
      </div>
      {dialog && <HireDialog
        providers={crew.modelProviders}
        busy={dialogBusy}
        error={dialogError}
        onSubmit={submitDialog}
        onClose={() => setDialog(undefined)}
      />}
    </div>;
  }

  return <div className="crew-workspace">
    <AgentList
      agents={agents}
      sections={sections}
      rooms={rooms}
      selectedAgentId={selectedAgentId}
      selectedThreadId={selectedThreadId}
      search={search}
      onSearch={setSearch}
      onSelectAgent={(id) => { crew.setSelectedAgentId(id); setFocusRequest((n) => n + 1); }}
      onSelectThread={(id) => { crew.setSelectedThreadId(id); setFocusRequest((n) => n + 1); }}
      onAction={onAction}
      onCreate={() => { setDialogError(undefined); setDialog({}); }}
      onToggleSection={toggleSection}
    />

    <Conversation
      agent={selectedAgent}
      thread={thread}
      agentsById={agentsById}
      messages={crew.messages}
      activities={crew.activities}
      chips={chips}
      loading={crew.conversationLoading}
      focusRequest={focusRequest}
      onSend={(text) => crew.sendMessage(text).catch(() => undefined)}
      onToggleDetails={() => setDetailOpen((open) => !open)}
    />

    {detailOpen && selectedAgent && <DetailPanel
      open={detailOpen}
      width={detailWidth}
      onResize={setDetailWidth}
      agentName={selectedAgent.name}
      computer={crew.computer}
      approvals={crew.approvals}
      routines={routines}
      grants={grants}
      grantsBusy={grantsBusy}
      audit={audit}
      auditLoading={auditLoading}
      auditView={auditView.id}
      auditHasMore={auditBefore !== null}
      artifacts={artifacts}
      artifactUrl={(artifact) => client.artifactUrl(artifact)}
      onApproval={(id, decision, note, contentHash) => crew.respondToApproval(id, decision, note, contentHash)}
      onComputerAction={(action) => crew.openComputer(action)}
      onDeleteRoutine={async (routineId) => {
        await client.deleteRoutine(selectedAgent.id, routineId);
        setRoutines((current) => current.filter((routine) => routine.id !== routineId));
      }}
      onSetGrant={async (tool, mode) => {
        setGrantsBusy(true);
        try {
          const next = await client.setGrant({ agentId: selectedAgent.id, tool, mode });
          // Merge rather than refetch: the row carries its own new mode and
          // source, and a full reload would scroll a long table back to the top
          // under somebody who is working through it.
          setGrants((current) => current.map((g) => (g.tool === tool ? { ...g, ...next } : g)));
        } finally { setGrantsBusy(false); }
      }}
      onClearGrant={async (tool) => {
        setGrantsBusy(true);
        try {
          const next = await client.clearGrant(selectedAgent.id, tool);
          setGrants((current) => current.map((g) => (g.tool === tool ? { ...g, ...next } : g)));
        } finally { setGrantsBusy(false); }
      }}
      onChangeAuditView={(id, types) => setAuditView({ id, types })}
      onLoadMoreAudit={() => { if (auditBefore !== null) loadAudit(auditView.types, auditBefore); }}
      onClose={() => setDetailOpen(false)}
    />}

    <CommandPalette
      open={paletteOpen}
      agents={agents}
      rooms={rooms}
      onClose={() => setPaletteOpen(false)}
      onSelectAgent={crew.setSelectedAgentId}
      onSelectThread={crew.setSelectedThreadId}
      onCreateAgent={() => { setDialogError(undefined); setDialog({}); }}
      onComputer={() => setDetailOpen(true)}
    />

    {dialog && <HireDialog
      editing={dialog.editing}
      providers={crew.modelProviders}
      busy={dialogBusy}
      error={dialogError}
      onSubmit={submitDialog}
      onClose={() => setDialog(undefined)}
    />}

    {crew.error && <div className="crew-toast" role="alert">
      <span>{crew.error}</span>
      <button className="icon-button" aria-label="Dismiss" onClick={crew.dismissError}>×</button>
    </div>}
  </div>;
}
