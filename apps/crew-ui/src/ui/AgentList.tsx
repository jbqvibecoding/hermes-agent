/**
 * Derived from errand/src/ui/components/AgentList.tsx (Apache-2.0, Runta).
 *
 * Changed:
 *  - Teammates are grouped by the org chart (`/sections`), not listed flat.
 *    Errand has no such concept; ours is ported from grok-bot's sidebar and is
 *    the reason a crew of twelve is still readable.
 *  - Rooms get their own group at the bottom. Errand has one conversation per
 *    agent and no rooms at all.
 *  - `status` is shown, because `waiting_for_approval` is the whole point of
 *    having four states — a teammate stopped at the door must not look like a
 *    teammate with nothing to do.
 *  - Runta's account footer (sign-in, Discord, logout) is gone. This runs
 *    inside Hermes, which is already signed in.
 */

import { MoreHorizontal, Pencil, Plus, Search, Trash2, Copy, ChevronRight } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import type { Agent, Conversation, Section } from "../domain/types";
import { AgentAvatar } from "./AgentAvatar";

const Streamdown = lazy(async () => ({ default: (await import("streamdown")).Streamdown }));

export type AgentAction = "edit" | "duplicate" | "delete";

const STATUS_LABEL: Record<Agent["status"], string> = {
  working: "Working",
  idle: "Idle",
  waiting_for_approval: "Needs you",
  offline: "No profile",
};

export function AgentList({
  agents, sections, rooms, selectedAgentId, selectedThreadId, search,
  onSearch, onSelectAgent, onSelectThread, onAction, onCreate, onToggleSection,
}: {
  agents: Agent[];
  sections: Section[];
  rooms: Conversation[];
  selectedAgentId: string;
  selectedThreadId: string;
  search: string;
  onSearch(value: string): void;
  onSelectAgent(id: string): void;
  onSelectThread(id: string): void;
  onAction(agent: Agent, action: AgentAction): void;
  onCreate(): void;
  onToggleSection(sectionId: string, collapsed: boolean): void;
}) {
  const [menuAgentId, setMenuAgentId] = useState<string>();
  useEffect(() => {
    if (!menuAgentId) return;
    const close = () => setMenuAgentId(undefined);
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [menuAgentId]);

  const act = (agent: Agent, action: AgentAction) => { setMenuAgentId(undefined); onAction(agent, action); };
  const query = search.trim().toLowerCase();
  const matches = (agent: Agent) =>
    !query || `${agent.name} ${agent.role}`.toLowerCase().includes(query);

  const byId = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);
  // A section names ids; the roster is the source of truth for who exists, so a
  // teammate deleted while the layout was cached simply does not appear.
  const grouped = sections
    .map((section) => ({
      section,
      members: section.bot_ids.map((id) => byId.get(id)).filter((a): a is Agent => Boolean(a) && matches(a!)),
    }))
    .filter((group) => group.members.length > 0);
  // Searching collapses the org chart: when you are hunting for a name, the
  // structure is in the way.
  const showSections = !query && grouped.length > 1;

  const row = (agent: Agent) => <div
    key={agent.id}
    className={`agent-row ${selectedAgentId === agent.id && !selectedThreadId.startsWith("group:") ? "selected" : ""} ${agent.status === "working" ? "is-working" : ""}`}
  >
    <button className="agent-select" onClick={() => onSelectAgent(agent.id)}>
      <AgentAvatar agent={agent} />
      <span className="agent-copy">
        <strong>
          <span>{agent.name}</span>
          <span className={`agent-status ${agent.status}`} title={STATUS_LABEL[agent.status]} aria-label={STATUS_LABEL[agent.status]} />
        </strong>
        {/* What it is doing now displaces what it last said. The preview is
            the better line when a teammate is idle and the worse one while it
            is mid-routine, because "is this thing moving" is the question
            somebody is actually asking of a row with a live badge on it. */}
        {agent.workingOn
          ? <span className="agent-preview agent-working-on">{agent.workingOn}</span>
          : agent.lastMessagePreview && <span className="agent-preview agent-preview-entering">
            <Suspense fallback={agent.lastMessagePreview}>
              <Streamdown className="agent-preview-markdown" mode="static" controls={false} linkSafety={{ enabled: true }} skipHtml>
                {agent.lastMessagePreview}
              </Streamdown>
            </Suspense>
          </span>}
      </span>
    </button>
    <button
      className="agent-more"
      aria-label={`More actions for ${agent.name}`}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={() => setMenuAgentId((current) => current === agent.id ? undefined : agent.id)}
    ><MoreHorizontal size={15} /></button>
    {menuAgentId === agent.id && <div className="agent-menu" role="menu" onPointerDown={(event) => event.stopPropagation()}>
      <button role="menuitem" onClick={() => act(agent, "edit")}><Pencil size={13} /> Edit</button>
      <button role="menuitem" onClick={() => act(agent, "duplicate")}><Copy size={13} /> Duplicate</button>
      <div />
      <button role="menuitem" className="danger-text" onClick={() => act(agent, "delete")}><Trash2 size={13} /> Remove from crew</button>
    </div>}
  </div>;

  return <aside className="agent-sidebar">
    <div className="sidebar-titlebar">
      <span className="sidebar-title">Crew</span>
      <button className="brand-add" aria-label="Hire a teammate" onClick={onCreate}><Plus size={18} /></button>
    </div>
    <label className="search">
      <Search size={15} />
      <input aria-label="Search the crew" placeholder="Search your crew" value={search} onChange={(event) => onSearch(event.target.value)} />
    </label>
    <div className="agent-list">
      {agents.length === 0 && <div className="agent-list-empty">No teammates yet</div>}
      {agents.length > 0 && grouped.length === 0 && <div className="agent-list-empty">No teammates found</div>}

      {showSections
        ? grouped.map(({ section, members }) => <section className="agent-section" key={section.id}>
            <button
              className={`agent-section-header ${section.collapsed ? "is-collapsed" : ""}`}
              aria-expanded={!section.collapsed}
              onClick={() => onToggleSection(section.id, !section.collapsed)}
            >
              <ChevronRight size={13} className="agent-section-chevron" />
              <span>{section.name}</span>
              <small>{members.length}</small>
            </button>
            {!section.collapsed && members.map(row)}
          </section>)
        : grouped.flatMap((group) => group.members).map(row)}

      {rooms.length > 0 && <section className="agent-section" key="__rooms__">
        <div className="agent-section-header is-static"><span>Rooms</span><small>{rooms.length}</small></div>
        {rooms.map((room) => <div key={room.id} className={`agent-row ${selectedThreadId === room.id ? "selected" : ""}`}>
          <button className="agent-select" onClick={() => onSelectThread(room.id)}>
            <span className="agent-avatar" role="img" aria-label={`${room.title} room`}>{room.emoji || "👥"}</span>
            <span className="agent-copy">
              <strong><span>{room.title}</span></strong>
              <span className="agent-preview">{room.lastMessagePreview || room.subtitle}</span>
            </span>
          </button>
        </div>)}
      </section>}
    </div>
  </aside>;
}
