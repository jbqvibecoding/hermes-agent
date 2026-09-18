/**
 * Derived from errand/src/ui/components/DetailPanel.tsx (Apache-2.0, Runta).
 *
 * The approval card here is the clean half of the trade. Errand shipped this
 * component — title, description, a `scope[]` checklist, a note box, Deny /
 * Allow once — against a client whose `listApprovalRequests()` returns `[]` and
 * whose `respondToApproval()` throws `contract_pending`. Our draft-and-hold
 * ledger is exactly the backend it was waiting for, so the card is wired up as
 * written.
 *
 * Added: a routines section. A crew routine is a Hermes cron job inside the
 * teammate's own profile, which is what makes "always on" true — it fires
 * whether or not this panel is open. Seeing and cancelling them belongs next to
 * the computer that runs them.
 *
 * The preview stays `viewOnly`. Watching a teammate work and taking the wheel
 * are different intentions, and a live desktop you can type into by accident,
 * inside a panel you opened to glance at, is a way to break somebody's work.
 */

import { Check, ChevronsRight, Loader2, Maximize2, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ApprovalRequest, CloudComputer, CloudComputerSession, Routine } from "../domain/types";
import { VncDesktop, VncSurface } from "./VncDesktop";

export function DetailPanel({
  open, width, onResize, agentName, computer, approvals, routines,
  onApproval, onComputerAction, onDeleteRoutine, onClose,
}: {
  open: boolean;
  width: number;
  onResize(width: number): void;
  agentName: string;
  computer?: CloudComputer;
  approvals: ApprovalRequest[];
  routines: Routine[];
  onApproval(id: string, decision: "allow" | "deny", note?: string): Promise<void>;
  onComputerAction(action: "open" | "takeover"): Promise<CloudComputerSession>;
  onDeleteRoutine(routineId: string): Promise<void>;
  onClose(): void;
}) {
  const [note, setNote] = useState("");
  const [computerBusy, setComputerBusy] = useState(false);
  const [previewSessions, setPreviewSessions] = useState<ReadonlyMap<string, CloudComputerSession>>(() => new Map());
  const [previewLoadingId, setPreviewLoadingId] = useState("");
  const [previewFailures, setPreviewFailures] = useState<ReadonlySet<string>>(() => new Set());
  const [computerSession, setComputerSession] = useState<CloudComputerSession>();
  const [computerModalOpen, setComputerModalOpen] = useState(false);
  const [computerFailure, setComputerFailure] = useState<string>();
  const pending = approvals.filter((approval) => approval.status === "pending");
  const activePreviewSession = previewSessions.get(computer?.id ?? "");
  const activePreviewFailed = previewFailures.has(computer?.id ?? "");
  const computerActionRef = useRef(onComputerAction);
  useEffect(() => { computerActionRef.current = onComputerAction; }, [onComputerAction]);

  useEffect(() => {
    const computerId = computer?.id;
    if (!open || computerModalOpen || computer?.status !== "online" || !computerId) return;
    if (activePreviewSession || activePreviewFailed) return;
    let alive = true;
    setPreviewLoadingId(computerId);
    // Remembering the failure is what stops this effect from re-firing forever
    // against a container whose screen is not coming back on its own.
    void computerActionRef.current("open").then((session) => {
      if (!alive) return;
      setPreviewSessions((current) => new Map(current).set(computerId, session));
      setPreviewLoadingId("");
    }).catch(() => {
      if (!alive) return;
      setPreviewFailures((current) => new Set(current).add(computerId));
      setPreviewLoadingId("");
    });
    return () => { alive = false; };
  }, [computer?.id, computer?.status, computerModalOpen, open, activePreviewFailed, activePreviewSession]);

  async function launchComputer(action: "open" | "takeover") {
    setComputerModalOpen(true);
    setComputerSession(undefined);
    setComputerFailure(undefined);
    setComputerBusy(true);
    const computerId = computer?.id;
    // Opening it by hand is the operator asking again, so clear the remembered
    // failure and let the preview have another go afterwards.
    if (computerId && previewFailures.has(computerId)) {
      setPreviewFailures((current) => { const next = new Set(current); next.delete(computerId); return next; });
      setPreviewSessions((current) => { const next = new Map(current); next.delete(computerId); return next; });
    }
    try { setComputerSession(await onComputerAction(action)); }
    catch (reason) {
      setComputerFailure(reason instanceof Error ? reason.message : "Could not reach that computer.");
    }
    finally { setComputerBusy(false); }
  }

  function closeComputer() {
    setComputerModalOpen(false);
    setComputerSession(undefined);
    setComputerFailure(undefined);
  }

  const maximumWidth = () => window.innerWidth <= 1030
    ? Math.min(730, window.innerWidth - 40)
    : Math.min(730, window.innerWidth - (window.innerWidth <= 1180 ? 252 + 420 : 272 + 460));

  useEffect(() => {
    const clamp = () => {
      const maximum = Math.max(280, maximumWidth());
      if (width > maximum) onResize(maximum);
    };
    clamp();
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, [onResize, width]);

  const resize = (clientX: number) =>
    onResize(Math.max(280, Math.min(maximumWidth(), window.innerWidth - clientX)));

  return <aside className={`detail-panel ${open ? "is-open" : "is-closing"}`} style={{ width }}>
    <div
      className="detail-resize-handle"
      role="separator"
      aria-label="Resize the details panel"
      aria-orientation="vertical"
      aria-valuemin={280}
      aria-valuemax={Math.max(280, maximumWidth())}
      aria-valuenow={width}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") { event.preventDefault(); onResize(Math.min(maximumWidth(), width + 16)); }
        else if (event.key === "ArrowRight") { event.preventDefault(); onResize(Math.max(280, width - 16)); }
      }}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); resize(event.clientX); }}
      onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) resize(event.clientX); }}
    />
    <header><button className="icon-button" aria-label="Close the details panel" onClick={onClose}><ChevronsRight size={18} /></button></header>

    {pending.map((approval) => <section className="approval-card" key={approval.id}>
      <div className="eyebrow warning"><ShieldAlert size={14} /> Waiting for you</div>
      <h3>{approval.title}</h3>
      {approval.description && <p>{approval.description}</p>}
      {approval.scope.length > 0 && <div className="scope">
        <span>This allows:</span>
        {approval.scope.map((item) => <div key={item}><Check size={13} />{item}</div>)}
      </div>}
      <textarea
        aria-label="Note for this decision"
        placeholder="Add a note (optional)"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="approval-actions">
        <button className="secondary-button danger-text" onClick={() => void onApproval(approval.id, "deny", note)}>Discard</button>
        <button className="primary-button" onClick={() => void onApproval(approval.id, "allow", note)}>Approve</button>
      </div>
    </section>)}

    <section className="screen-section">
      <button
        className="screen-trigger"
        disabled={computerBusy || computer?.status !== "online"}
        aria-label={`Open ${agentName}'s screen`}
        onClick={() => void launchComputer("open")}
      >
        <span className="computer-preview">
          {[...previewSessions].map(([computerId, session]) => <span
            className={`computer-preview-stream ${computerId === computer?.id ? "is-active" : ""}`}
            key={computerId}
          >
            <VncSurface
              session={session}
              viewOnly
              compact
              onDisconnect={() => setPreviewFailures((current) => new Set(current).add(computerId))}
            />
          </span>)}
          {!previewSessions.has(computer?.id ?? "") && (
            previewLoadingId === computer?.id
              ? <span className="computer-preview-loading" role="status" aria-label={`Loading ${agentName}'s screen`}>
                  <Loader2 size={18} className="spin" />
                </span>
              : previewFailures.has(computer?.id ?? "")
                ? <span className="computer-preview-loading" role="status">Screen unavailable</span>
                : <span className="computer-screen-off" aria-hidden="true" />)}
          <span className="screen-hover-action"><Maximize2 size={14} /> Open</span>
        </span>
      </button>
      <div className="screen-caption">
        <span>{agentName}'s screen</span>
        <span className={`screen-state ${computer?.status ?? "offline"}`}>
          {computer?.status === "online" ? "Running"
            : computer?.status === "starting" ? "Starting…"
            : "Off"}
        </span>
      </div>
      {/* Errand never starts a machine from this panel; ours has to, because
          `getComputer` is polled every two seconds and must stay a pure read. */}
      {computer && computer.status !== "online" && <button
        className="secondary-button"
        disabled={computerBusy}
        onClick={() => void launchComputer("takeover")}
      >Start this computer</button>}
      {computer?.error && <p className="screen-error">{computer.error}</p>}
    </section>

    {routines.length > 0 && <section className="routines-section">
      <div className="eyebrow">Routines</div>
      {routines.map((routine) => <div className="routine-row" key={routine.id}>
        <div>
          <strong>{routine.name}</strong>
          <span>{routine.schedule}</span>
        </div>
        <button
          className="icon-button"
          aria-label={`Cancel the routine ${routine.name}`}
          onClick={() => void onDeleteRoutine(routine.id)}
        ><Trash2 size={14} /></button>
      </div>)}
    </section>}

    {computerModalOpen && <VncDesktop
      session={computerSession}
      failure={computerFailure}
      title={`${agentName}'s computer`}
      onClose={closeComputer}
      onReconnect={() => void launchComputer("takeover")}
    />}
  </aside>;
}
