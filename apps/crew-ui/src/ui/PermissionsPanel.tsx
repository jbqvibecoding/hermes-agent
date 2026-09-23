/**
 * What this teammate may reach — the operator's side of `crew/grants.py`.
 *
 * Errand has no equivalent, because it assumes an agent may do whatever its
 * tools allow. Once a teammate is always on, has its own computer, and can send
 * mail on your behalf, that assumption is the product's largest unstated risk.
 *
 * Three decisions here are worth stating, because each has an obvious
 * alternative that is worse:
 *
 * **The defaults are shown, not just the rules.** A brand-new teammate has no
 * rows at all. A panel listing only explicit grants would show an empty table,
 * which reads as "this one may do nothing" when in fact the risk table is
 * deciding every call it makes — exactly the misunderstanding a permissions
 * screen exists to prevent.
 *
 * **`source` is on screen next to `mode`.** "Ask, because you said so" and
 * "ask, because nothing recognised this tool" are the same restriction and
 * completely different facts. Collapsing them lets somebody believe they
 * configured something they never did.
 *
 * **Protected tools are shown greyed rather than hidden.** Somebody looking for
 * why a setting will not stick needs to find the answer, not an absence.
 */

import { Ban, HelpCircle, Lock, RotateCcw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import type { Grant } from "../domain/types";

const MODES = [
  { mode: "deny" as const, label: "Never", icon: Ban },
  { mode: "ask" as const, label: "Ask me", icon: HelpCircle },
  { mode: "allow" as const, label: "Allow", icon: ShieldCheck },
];

export function PermissionsPanel({ agentName, grants, busy, onSetGrant, onClearGrant }: {
  agentName: string;
  grants: Grant[];
  busy: boolean;
  onSetGrant(tool: string, mode: "deny" | "ask" | "allow"): Promise<void>;
  onClearGrant(tool: string): Promise<void>;
}) {
  const [filter, setFilter] = useState("");
  const [onlyChanged, setOnlyChanged] = useState(false);

  const groups = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    const matching = grants.filter((grant) => {
      if (onlyChanged && grant.source !== "grant") return false;
      if (!needle) return true;
      return grant.tool.toLowerCase().includes(needle) || grant.toolset.toLowerCase().includes(needle);
    });
    const byToolset = new Map<string, Grant[]>();
    for (const grant of matching) {
      const key = grant.toolset || "other";
      byToolset.set(key, [...(byToolset.get(key) ?? []), grant]);
    }
    return [...byToolset.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [grants, filter, onlyChanged]);

  const asking = grants.filter((grant) => grant.mode === "ask").length;

  return <section className="permissions-panel">
    <div className="eyebrow"><Lock size={14} /> What {agentName} can do</div>
    <p className="permissions-summary">
      {grants.length} tools · {asking} need your say-so
    </p>

    <div className="permissions-filters">
      <input
        type="search"
        aria-label="Filter tools"
        placeholder="Filter tools…"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={onlyChanged}
          onChange={(event) => setOnlyChanged(event.target.checked)}
        />
        Only what I changed
      </label>
    </div>

    {groups.length === 0 && <p className="permissions-empty">Nothing matches.</p>}

    {groups.map(([toolset, rows]) => <div className="permissions-group" key={toolset}>
      <h4>{toolset}</h4>
      {rows.map((grant) => <div
        className={`permissions-row ${grant.protected ? "is-protected" : ""} ${grant.available === false ? "is-unavailable" : ""}`}
        key={grant.tool}
      >
        <div className="permissions-tool">
          <code>{grant.tool}</code>
          <span className="permissions-why">{grant.why}</span>
        </div>
        <div className="permissions-modes" role="group" aria-label={`What ${agentName} may do with ${grant.tool}`}>
          {MODES.map(({ mode, label, icon: Icon }) => <button
            key={mode}
            type="button"
            className={`permissions-mode ${grant.mode === mode ? "is-current" : ""}`}
            aria-pressed={grant.mode === mode}
            disabled={busy || grant.protected}
            title={grant.protected ? "This teammate always keeps this one" : label}
            onClick={() => void onSetGrant(grant.tool, mode)}
          >
            <Icon size={13} /> {label}
          </button>)}
          {/* Only offered where there is something to undo. A reset button next
              to a default reads as if the default were itself a choice. */}
          {grant.source === "grant" && !grant.protected && <button
            type="button"
            className="permissions-reset"
            aria-label={`Reset ${grant.tool} to the default`}
            disabled={busy}
            onClick={() => void onClearGrant(grant.tool)}
          ><RotateCcw size={13} /></button>}
        </div>
      </div>)}
    </div>)}
  </section>;
}
