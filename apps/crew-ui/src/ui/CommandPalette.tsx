/**
 * Derived from errand/src/ui/components/CommandPalette.tsx (Apache-2.0, Runta).
 * Wording and the command set changed; the mechanics are its.
 *
 * Rooms are in the list alongside teammates, because ⌘K is the one place where
 * "where do I want to be" does not care which of the two it is.
 */

import { Bot, Monitor, Plus, Search, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Agent, Conversation } from "../domain/types";

type PaletteCommand = {
  id: string;
  label: string;
  detail: string;
  icon: typeof Search;
  run(): void;
};

export function CommandPalette({
  open, agents, rooms, onClose, onSelectAgent, onSelectThread, onCreateAgent, onComputer,
}: {
  open: boolean;
  agents: Agent[];
  rooms: Conversation[];
  onClose(): void;
  onSelectAgent(id: string): void;
  onSelectThread(id: string): void;
  onCreateAgent(): void;
  onComputer(): void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) { setQuery(""); window.setTimeout(() => inputRef.current?.focus(), 0); }
  }, [open]);

  const commands = useMemo<PaletteCommand[]>(() => [
    { id: "create", label: "Hire a teammate", detail: "Add someone to the crew", icon: Plus, run: onCreateAgent },
    { id: "computer", label: "Open their computer", detail: "The current teammate's screen", icon: Monitor, run: onComputer },
    ...agents.map((agent) => ({
      id: `agent-${agent.id}`,
      label: agent.name,
      detail: `${agent.role} · ${agent.status.replaceAll("_", " ")}`,
      icon: Bot,
      run: () => onSelectAgent(agent.id),
    })),
    ...rooms.map((room) => ({
      id: `room-${room.id}`,
      label: room.title,
      detail: room.subtitle || "Room",
      icon: Users,
      run: () => onSelectThread(room.id),
    })),
  ], [agents, rooms, onComputer, onCreateAgent, onSelectAgent, onSelectThread]);

  const results = commands.filter((command) =>
    `${command.label} ${command.detail}`.toLowerCase().includes(query.toLowerCase()));
  if (!open) return null;
  const choose = (command: PaletteCommand) => { command.run(); onClose(); };

  return <div
    className="palette-backdrop"
    role="presentation"
    onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
  >
    <section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
      <label>
        <Search size={17} />
        <input
          ref={inputRef}
          aria-label="Search the crew and commands"
          placeholder="Search your crew…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onClose();
            if (event.key === "Enter" && results[0]) choose(results[0]);
          }}
        />
        <kbd>esc</kbd>
      </label>
      <div className="palette-results">{results.length
        ? results.map((command, index) => {
            const Icon = command.icon;
            return <button key={command.id} className={index === 0 ? "active" : ""} onClick={() => choose(command)}>
              <span><Icon size={16} /></span>
              <div><strong>{command.label}</strong><small>{command.detail}</small></div>
              {index === 0 && <kbd>↵</kbd>}
            </button>;
          })
        : <p>Nothing matches that</p>}
      </div>
      <footer><span>Crew</span><span><kbd>⌘</kbd><kbd>K</kbd> to open</span></footer>
    </section>
  </div>;
}
