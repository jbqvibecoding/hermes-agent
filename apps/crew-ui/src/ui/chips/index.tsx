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

import { Check, Clock, CornerDownRight, Globe, KeyRound, ShieldAlert } from "lucide-react";
import { useState } from "react";
import type { ChipKind, StandstillItem, TurnEffect } from "../../domain/types";

interface ReportLine { system?: string; result?: string; count?: string }

function Chip({ label, kind = "", children }: { label?: string; kind?: string; children: React.ReactNode }) {
  return <div className={`crew-chip ${kind}`}>
    {label && <div className="crew-chip-label">{label}</div>}
    {children}
  </div>;
}

/**
 * What the turn actually changed outside the chat, under what the teammate
 * says it did.
 *
 * The report above this is prose the model typed — `crew/report.py` checks its
 * shape and not its truth — so for a turn nobody watched it was the only
 * account of the turn and also the only part that can be wrong about it. These
 * lines come from `crew/effects.py`, which derives them from the tool record.
 * They are deliberately rendered *beside* the claim rather than replacing it:
 * reconciling the two is the operator's job and the point of the panel.
 *
 * Fetched lazily on expand. Most turns change nothing, and a request per
 * report on every thread load would be a lot of traffic for a mostly empty
 * list.
 */
function WhatChanged({ turnId, handlers }: { turnId: string; handlers: ChipHandlers }) {
  const [open, setOpen] = useState(false);
  const [effects, setEffects] = useState<TurnEffect[] | null>(null);
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState("");

  async function expand() {
    setOpen((was) => !was);
    if (effects !== null) return;
    try {
      setEffects(await handlers.loadEffects(turnId));
    } catch {
      // The list failing to load must not be mistaken for a turn that changed
      // nothing — that is the same silence the feature exists to remove.
      setProblem("Could not load what changed.");
    }
  }

  async function undo(effect: TurnEffect) {
    setBusy(effect.id);
    try {
      await handlers.undoEffect(effect.id);
      setEffects(await handlers.loadEffects(turnId));
    } catch {
      setProblem("Could not undo that.");
    } finally {
      setBusy("");
    }
  }

  if (!turnId) return null;
  return <div className="crew-changed">
    <button type="button" className="crew-changed-toggle" onClick={() => void expand()}>
      What changed
    </button>
    {open && <div className="crew-changed-list">
      {problem && <div className="crew-changed-problem">{problem}</div>}
      {effects?.length === 0 && !problem && <div className="crew-changed-empty">
        Nothing outside this conversation.
      </div>}
      {(effects ?? []).map((effect) => <div
        className={`crew-changed-line${effect.undone_at ? " is-undone" : ""}`}
        key={effect.id || effect.text}
      >
        <span className="crew-changed-kind">{effect.kind}</span>
        <span className="crew-changed-text">{effect.text}</span>
        {effect.undoable && <button
          type="button" className="crew-changed-undo"
          disabled={busy === effect.id}
          onClick={() => void undo(effect)}
        >{busy === effect.id ? "Undoing…" : "Undo"}</button>}
        {effect.undone_at ? <span className="crew-changed-undone">undone</span> : null}
      </div>)}
    </div>}
  </div>;
}

/** "3d" / "4h" / "just now" — an age a person reads, from whole hours. */
function age(hours: number): string {
  if (!Number.isFinite(hours) || hours < 1) return "just now";
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * What the teammate raised unprompted, as the structure it actually found.
 *
 * Until `crew/proactive/digest.py` existed this was forty words of model prose
 * posted as plain text — everything the picker knew about *which* approval and
 * *how long* was thrown away, and when the small model was unavailable nothing
 * was posted at all. So this chip is the message and the teammate's sentence
 * (a separate text part, rendered above by `Conversation`) is its voice.
 *
 * Following openduet's `offers.ts` — "nothing happens here" — the card never
 * acts on its own. Resume is the only button, it appears only on a suspended
 * routine, and it is the operator who presses it.
 */
function StandstillChip({ payload, handlers }: {
  payload: {
    items?: StandstillItem[];
    could_not?: { source: string; why: string }[];
    spoke?: boolean;
  };
  handlers: ChipHandlers;
}) {
  const [busy, setBusy] = useState("");
  const [problem, setProblem] = useState("");
  const [resumed, setResumed] = useState<string[]>([]);

  const items = payload.items ?? [];
  const couldNot = payload.could_not ?? [];

  async function resume(item: StandstillItem) {
    if (!item.ref) return;
    setBusy(item.subject);
    setProblem("");
    try {
      await handlers.onResumeRoutine(item.ref.id);
      setResumed((was) => [...was, item.subject]);
    } catch (reason) {
      // 409 means the route refused for a real reason — a one-shot whose time
      // has passed cannot be resumed — and saying so beats a button that looks
      // like it worked.
      setProblem(reason instanceof Error ? reason.message : "Could not resume that.");
    } finally {
      setBusy("");
    }
  }

  return <Chip kind="standstill" label="Still waiting">
    {items.map((item) => <div className="crew-stuck-line" key={item.subject}>
      <span className="crew-stuck-age">{age(item.stuck_for_hours)}</span>
      <span className="crew-stuck-summary">{item.summary}</span>
      {item.kind === "routine_suspended" && item.ref && (
        resumed.includes(item.subject)
          ? <span className="crew-stuck-done">resumed</span>
          : <button
              type="button" className="crew-stuck-action"
              disabled={busy === item.subject}
              onClick={() => void resume(item)}
            >{busy === item.subject ? "Resuming…" : "Resume"}</button>
      )}
      {/* Approvals and routines are both listed in the details panel, so this
          opens something that exists. A task has no per-item view to open, so
          it gets no link rather than one that goes nowhere. */}
      {item.ref && item.ref.kind !== "task" && item.kind !== "routine_suspended" && (
        <button
          type="button" className="crew-stuck-open"
          onClick={handlers.onOpenDetails}
        >Open</button>
      )}
    </div>)}

    {problem && <div className="crew-stuck-gap">{problem}</div>}

    {couldNot.map((entry) => <div className="crew-stuck-gap" key={entry.source}>
      Could not check {entry.source} — {entry.why}
    </div>)}

    {payload.spoke === false && <div className="crew-stuck-quiet">
      I could not write this up, so here it is as I found it.
    </div>}
  </Chip>;
}

function ReportChip({ payload, turnId, handlers }: {
  payload: { lines?: ReportLine[]; closing?: string };
  turnId?: string;
  handlers: ChipHandlers;
}) {
  return <Chip kind="report">
    {(payload.lines ?? []).map((line, index) => <div className="crew-report-line" key={index}>
      <span className="crew-report-check"><Check size={13} /></span>
      <span className="crew-report-system">{line.system}</span>
      <span className="crew-report-arrow">→</span>
      <span>{line.result}{line.count && <span className="crew-report-count"> · {line.count}</span>}</span>
    </div>)}
    {payload.closing && <div className="crew-report-closing">{payload.closing}</div>}
    {turnId && <WhatChanged turnId={turnId} handlers={handlers} />}
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
/** Where the page actually is, above everything the teammate said about it.
 *
 * The rest of this card is the teammate's account of itself: it names a site
 * and gives a reason, and both are strings a model chose. This line is the
 * only thing on the card the teammate did not write — the server read it off
 * the page over CDP just before posting the row. It goes first because the
 * operator's whole job at this moment is to compare the two.
 *
 * A missing origin is stated, not skipped. "We could not confirm where this
 * page is" is worth more to somebody about to type a password than a tidy card.
 */
function PageItIsOn({ origin, warning }: { origin?: string | null; warning?: string | null }) {
  if (!origin) {
    return <div className="crew-login-origin crew-login-origin-unknown">
      <ShieldAlert size={13} /> Could not confirm which page this is
    </div>;
  }
  return <div className={`crew-login-origin${warning ? " crew-login-origin-odd" : ""}`}>
    <div className="crew-login-origin-row">
      {warning ? <ShieldAlert size={13} /> : <Globe size={13} />}
      <code>{origin}</code>
    </div>
    {warning && <div className="crew-login-origin-warning">{warning}</div>}
  </div>;
}

function LoginChip({ payload, onOpenScreen, onSubmitSecret }: {
  payload: {
    site?: string; why?: string; field?: string; ref?: string; filled?: boolean;
    origin?: string | null; origin_warning?: string | null;
  };
  onOpenScreen(): void;
  onSubmitSecret(ref: string, value: string): Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [local, setState] = useState<"" | "sending" | "sent" | "failed">("");
  // `filled` comes from the server, `local` from this browser. Either settles
  // the card: the browser that typed the password knows first, and every other
  // open client — a phone, another tab, a colleague — learns from the row.
  // Without the server half they keep showing a live password box for a
  // request that was answered minutes ago.
  const state = payload.filled ? "sent" : local;

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
      <PageItIsOn origin={payload.origin} warning={payload.origin_warning} />
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
    <PageItIsOn origin={payload.origin} warning={payload.origin_warning} />
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
  /** What the record says this turn changed. See `WhatChanged`. */
  loadEffects(turnId: string): Promise<TurnEffect[]>;
  /** Put one of those changes back. Only ever called for `undoable` rows. */
  undoEffect(effectId: string): Promise<void>;
  /**
   * Resume a routine this teammate suspended. The teammate is the selected
   * agent: a standstill chip only ever lands in that teammate's own DM thread
   * (`crew/proactive/service.py` posts to `dm:<bot_id>`), so there is no
   * ambiguity to pass through.
   */
  onResumeRoutine(routineId: string): Promise<void>;
  /** Show the details panel, where approvals and routines are listed. */
  onOpenDetails(): void;
  onOpenScreen(): void;
  onSubmitSecret(ref: string, value: string): Promise<void>;
  screenshotUrl(agentId: string, filename: string): string;
}

export function ChipView({ kind, payload, turnId, handlers }: {
  kind: ChipKind;
  payload: unknown;
  turnId?: string;
  handlers: ChipHandlers;
}) {
  // Payloads come from the model by way of `crew/tools.py`, which validates
  // shape but not every field, so each chip reads defensively rather than
  // letting one missing key blank the thread.
  const data = (payload ?? {}) as Record<string, never>;
  switch (kind) {
    case "report": return <ReportChip payload={data} turnId={turnId} handlers={handlers} />;
    case "standstill": return <StandstillChip payload={data} handlers={handlers} />;
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
