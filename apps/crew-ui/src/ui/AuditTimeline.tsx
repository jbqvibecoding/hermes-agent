/**
 * The ledger — what this teammate did, and what it was stopped from doing.
 *
 * Deliberately not the activity strip. That is a live view of a turn, keyed on
 * the tool call so start and finish collapse into one line, and it scrolls away
 * with the thread. This is the record somebody reads afterwards, when the
 * question is "what has this thing been doing while I was not watching".
 *
 * The filter offers *questions*, not event types. "Was anything stopped?" spans
 * `tool.refused`, `tool.held` and `approval.expired`; a dropdown of raw type
 * names would let somebody pick one, see two entries, and conclude they had the
 * whole answer. The server takes several types precisely so this can ask the
 * real question in one query.
 *
 * Arguments appear as a digest and a one-line subject, never as values — see
 * `crew/audit.py` for why. Two calls with the same digest were the same call;
 * that is all anybody needs from here, and it is all that can safely be stored.
 */

import { AlertTriangle, CheckCircle2, Clock, Hand, ShieldX, Settings2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { AuditEvent } from "../domain/types";

const VIEWS = [
  { id: "all", label: "Everything", types: [] as string[] },
  {
    id: "stopped",
    label: "Stopped",
    types: ["tool.refused", "tool.held", "approval.expired", "crew.bot_declined"],
  },
  { id: "failed", label: "Went wrong", types: ["tool.failed"] },
  { id: "decisions", label: "Your decisions", types: ["approval.decided", "grant.changed"] },
];

const ICONS: Record<string, typeof CheckCircle2> = {
  "tool.allowed": CheckCircle2,
  "tool.refused": ShieldX,
  "tool.held": Hand,
  "tool.failed": AlertTriangle,
  "approval.decided": CheckCircle2,
  "approval.expired": Clock,
  "grant.changed": Settings2,
  "crew.policy_loaded": Settings2,
  "crew.bot_declined": Hand,
};

/** Plain English for the event types. The raw names are for the API, not people. */
const LABELS: Record<string, string> = {
  "tool.allowed": "ran",
  "tool.refused": "refused",
  "tool.held": "held for you",
  "tool.failed": "failed",
  "approval.decided": "you decided",
  "approval.expired": "lapsed",
  "grant.changed": "you changed a permission",
  "crew.policy_loaded": "rules in force",
  "crew.bot_declined": "declined it itself",
};

function when(createdAt: number): string {
  const date = new Date(createdAt);
  return `${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })} ${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
}

export function AuditTimeline({ events, loading, viewId, onChangeView, onLoadMore, hasMore }: {
  events: AuditEvent[];
  loading: boolean;
  viewId: string;
  onChangeView(viewId: string, types: string[]): void;
  onLoadMore(): void;
  hasMore: boolean;
}) {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set());
  const rows = useMemo(() => events.slice().sort((a, b) => b.id - a.id), [events]);

  return <section className="audit-timeline">
    <div className="audit-views" role="tablist" aria-label="What to show">
      {VIEWS.map((view) => <button
        key={view.id}
        role="tab"
        type="button"
        aria-selected={viewId === view.id}
        className={`audit-view ${viewId === view.id ? "is-current" : ""}`}
        onClick={() => onChangeView(view.id, view.types)}
      >{view.label}</button>)}
    </div>

    {rows.length === 0 && !loading && <p className="audit-empty">Nothing recorded yet.</p>}

    <ol className="audit-rows">
      {rows.map((event) => {
        const Icon = ICONS[event.event_type] ?? CheckCircle2;
        const open = expanded.has(event.id);
        const stopped = event.event_type === "tool.refused" || event.event_type === "tool.held";
        return <li
          key={event.id}
          className={`audit-row ${stopped ? "is-stopped" : ""} ${event.event_type === "tool.failed" ? "is-failed" : ""}`}
        >
          <button
            type="button"
            className="audit-head"
            aria-expanded={open}
            onClick={() => setExpanded((current) => {
              const next = new Set(current);
              if (!next.delete(event.id)) next.add(event.id);
              return next;
            })}
          >
            <Icon size={14} />
            <span className="audit-subject">{event.subject || event.tool || event.event_type}</span>
            <span className="audit-kind">{LABELS[event.event_type] ?? event.event_type}</span>
            <time className="audit-when" dateTime={new Date(event.created_at).toISOString()}>
              {when(event.created_at)}
            </time>
          </button>
          {open && <dl className="audit-detail">
            {event.tool && <><dt>Tool</dt><dd><code>{event.tool}</code></dd></>}
            {event.detail && <><dt>Why</dt><dd>{event.detail}</dd></>}
            {event.actor !== "_system" && <><dt>Who</dt><dd>{event.actor === "_operator" ? "you" : event.actor}</dd></>}
            {event.duration_ms !== null && <><dt>Took</dt><dd>{event.duration_ms} ms</dd></>}
            {/* Not the arguments — a fingerprint of them. Two rows with the
                same digest were the same call. */}
            {event.args_digest && <><dt>Arguments</dt><dd><code>{event.args_digest}</code></dd></>}
          </dl>}
        </li>;
      })}
    </ol>

    {hasMore && <button
      type="button"
      className="secondary-button"
      disabled={loading}
      onClick={onLoadMore}
    >{loading ? "Loading…" : "Show older"}</button>}
  </section>;
}
