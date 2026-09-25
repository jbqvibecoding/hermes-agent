/**
 * The nine chip kinds, carried over from the zero-build IIFE this package
 * replaces (`plugins/hermes-crew/dashboard/dist/index.js`), which in turn
 * ported them from OpenGrokBot's web client.
 *
 * A chip exists because some of what a teammate produces is *structured* and
 * loses its meaning as prose. "Salesforce → list pulled · 52 accounts" scans in
 * a second; the same sentence buried in a paragraph does not. Errand has no
 * equivalent — its `MessagePart` union is text, activity or attachment — which
 * is why `ChipPart` is our one addition to its domain model.
 */

import { Check, Clock, CornerDownRight, KeyRound, ShieldAlert } from "lucide-react";
import { useState } from "react";
import type { ChipKind } from "../../domain/types";

interface ReportLine { system?: string; result?: string; count?: string }

function Chip({ label, kind = "", children }: { label?: string; kind?: string; children: React.ReactNode }) {
  return <div className={`crew-chip ${kind}`}>
    {label && <div className="crew-chip-label">{label}</div>}
    {children}
  </div>;
}

function ReportChip({ payload }: { payload: { lines?: ReportLine[]; closing?: string } }) {
  return <Chip kind="report">
    {(payload.lines ?? []).map((line, index) => <div className="crew-report-line" key={index}>
      <span className="crew-report-check"><Check size={13} /></span>
      <span className="crew-report-system">{line.system}</span>
      <span className="crew-report-arrow">→</span>
      <span>{line.result}{line.count && <span className="crew-report-count"> · {line.count}</span>}</span>
    </div>)}
    {payload.closing && <div className="crew-report-closing">{payload.closing}</div>}
  </Chip>;
}

function ApprovalChip({ payload, onDecide }: {
  payload: { approval_id?: number; action?: string; detail?: string; status?: string };
  onDecide(approvalId: string, decision: "allow" | "deny"): void;
}) {
  const resolved = payload.status === "approved" || payload.status === "discarded";
  return <div className={`crew-chip approval ${resolved ? "resolved" : ""}`}>
    <div className="crew-chip-label"><ShieldAlert size={13} /> {resolved ? "Decided" : "Needs you"}</div>
    <div className="crew-approval-action">{payload.action}</div>
    {payload.detail && <div className="crew-approval-detail">{payload.detail}</div>}
    {resolved
      ? <div className="crew-approval-outcome">{payload.status === "approved" ? "Approved" : "Discarded"}</div>
      : <div className="crew-approval-buttons">
          <button className="crew-btn danger" onClick={() => onDecide(String(payload.approval_id), "deny")}>Discard</button>
          <button className="crew-btn primary" onClick={() => onDecide(String(payload.approval_id), "allow")}>Approve</button>
        </div>}
  </div>;
}

function ResolvedChip({ payload }: { payload: { action?: string; status?: string } }) {
  return <Chip label="You decided">
    <div className="crew-approval-action">{payload.action}</div>
    <div className="crew-approval-outcome">{payload.status === "approved" ? "Approved" : "Discarded"}</div>
  </Chip>;
}

/**
 * Three things arrive on this chip kind, and they are one kind on purpose: a
 * standing rule changing is one sort of event however it changed.
 *
 *  - a rule the teammate was told to remember (`rule` + `diff`),
 *  - the gardener reporting what it merged (`tidied`),
 *  - the gardener asking about something it would not touch (`proposal`).
 *
 * The question carries the entries verbatim because nobody can answer "which
 * of these stands" without reading both as written. And it is a question
 * rather than a change: a rule deleted because a model thought it looked old
 * is an undetectable edit — the rule is gone, the behaviour moves, and
 * nothing says why.
 */
function MemoryChip({ payload }: {
  payload: {
    rule?: string; diff?: string;
    tidied?: number; note?: string;
    proposal?: boolean; kind?: string; entries?: string[]; why?: string;
  };
}) {
  if (payload.proposal) {
    return <Chip label={payload.kind === "conflicting" ? "Rules disagree" : "Rule may be stale"}>
      <div className="crew-memory-note">{payload.note}</div>
      <ul className="crew-memory-entries">
        {(payload.entries || []).map((entry, index) => <li key={index}>{entry}</li>)}
      </ul>
      {payload.why && <div className="crew-memory-why">{payload.why}</div>}
    </Chip>;
  }

  if (payload.tidied) {
    return <Chip label="Memory tidied">
      <div className="crew-memory-note">{payload.note}</div>
    </Chip>;
  }

  return <Chip label="Memory updated">
    <div className="crew-memory-rule">{payload.rule}</div>
    {payload.diff && <pre className="crew-memory-diff">{payload.diff}</pre>}
  </Chip>;
}

function RoutineChip({ payload }: { payload: { name?: string; human?: string; cron?: string } }) {
  return <Chip label="Routine created">
    <div className="crew-routine-name"><Clock size={13} /> {payload.name}</div>
    <div className="crew-routine-when">{payload.human || payload.cron}</div>
  </Chip>;
}

function BotRefChip({ payload }: { payload: { from?: string; from_name?: string; content?: string } }) {
  return <Chip label={`Handed over by @${payload.from_name || payload.from || "a teammate"}`}>
    <div className="crew-botref-body"><CornerDownRight size={13} /> {payload.content}</div>
  </Chip>;
}

/**
 * Two shapes, and the difference is how much of the operator's attention the
 * teammate is asking for.
 *
 * With a `field`, it is stuck on one input: a masked box here, and the
 * characters go straight into the page. The value is submitted and forgotten —
 * it is never part of this component's state beyond the keystroke, never sent
 * anywhere but the one endpoint, and the teammate never sees it.
 *
 * Without one, it needs the whole machine, and the operator takes the wheel as
 * before. Keeping both is the point: one field is the common case, and a
 * consent flow with three steps is not.
 */
function LoginChip({ payload, onOpenScreen, onSubmitSecret }: {
  payload: { site?: string; why?: string; field?: string; ref?: string };
  onOpenScreen(): void;
  onSubmitSecret(ref: string, value: string): Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<"" | "sending" | "sent" | "failed">("");

  if (payload.field && payload.ref) {
    const ref = payload.ref;
    const send = async () => {
      if (!value) return;
      setState("sending");
      try {
        await onSubmitSecret(ref, value);
        // Cleared on the way out, not kept for a retry. A retry would need the
        // value to sit in memory after it has been used, which is the one
        // thing this whole path exists to avoid.
        setValue("");
        setState("sent");
      } catch {
        setValue("");
        setState("failed");
      }
    };
    return <Chip label="Needs one thing from you">
      <div className="crew-login-site">
        <KeyRound size={13} /> The {payload.field} for {payload.site || "a site"}
      </div>
      {payload.why && <div className="crew-login-why">{payload.why}</div>}
      {state === "sent"
        ? <div className="crew-login-why">Typed into the page. {payload.site} should move on now.</div>
        : <form className="crew-secret-row" onSubmit={(event) => { event.preventDefault(); void send(); }}>
            <input
              type="password"
              autoComplete="off"
              placeholder={payload.field}
              value={value}
              onChange={(event) => setValue(event.target.value)}
            />
            <button className="crew-btn" type="submit" disabled={!value || state === "sending"}>
              {state === "sending" ? "Typing…" : "Type it in"}
            </button>
          </form>}
      {state === "failed" && <div className="crew-login-why">
        That did not reach the screen — nothing was typed. Try taking the wheel instead.
      </div>}
    </Chip>;
  }

  return <Chip label="Needs you at the keyboard">
    <div className="crew-login-site"><KeyRound size={13} /> Sign in to {payload.site || "a site"}</div>
    {payload.why && <div className="crew-login-why">{payload.why}</div>}
    {/* The point of the whole container: the operator takes the wheel, signs in
        once, and the session persists in /workspace/.browser across restarts. */}
    <button className="crew-btn" onClick={onOpenScreen}>Take the wheel</button>
  </Chip>;
}

function ScreenshotChip({ payload, screenshotUrl }: {
  payload: { url?: string; file?: string; bot_id?: string; caption?: string };
  screenshotUrl(agentId: string, filename: string): string;
}) {
  const source = payload.url
    ?? (payload.bot_id && payload.file ? screenshotUrl(payload.bot_id, payload.file) : undefined);
  if (!source) return null;
  return <figure className="crew-shot">
    <img src={source} alt={payload.caption || "the teammate's screen"} loading="lazy" />
    {payload.caption && <figcaption>{payload.caption}</figcaption>}
  </figure>;
}

export interface ChipHandlers {
  onDecide(approvalId: string, decision: "allow" | "deny"): void;
  onOpenScreen(): void;
  onSubmitSecret(ref: string, value: string): Promise<void>;
  screenshotUrl(agentId: string, filename: string): string;
}

export function ChipView({ kind, payload, handlers }: {
  kind: ChipKind;
  payload: unknown;
  handlers: ChipHandlers;
}) {
  // Payloads come from the model by way of `crew/tools.py`, which validates
  // shape but not every field, so each chip reads defensively rather than
  // letting one missing key blank the thread.
  const data = (payload ?? {}) as Record<string, never>;
  switch (kind) {
    case "report": return <ReportChip payload={data} />;
    case "approval_request": return <ApprovalChip payload={data} onDecide={handlers.onDecide} />;
    case "approval_resolved": return <ResolvedChip payload={data} />;
    case "memory_updated": return <MemoryChip payload={data} />;
    case "routine_created": return <RoutineChip payload={data} />;
    case "bot_ref": return <BotRefChip payload={data} />;
    case "login_request": return <LoginChip payload={data} onOpenScreen={handlers.onOpenScreen} onSubmitSecret={handlers.onSubmitSecret} />;
    case "screenshot": return <ScreenshotChip payload={data} screenshotUrl={handlers.screenshotUrl} />;
    default: return null;
  }
}
