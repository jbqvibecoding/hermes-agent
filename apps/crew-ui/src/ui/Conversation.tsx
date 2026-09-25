/**
 * Derived from errand/src/ui/components/Conversation.tsx (Apache-2.0, Runta).
 *
 * Kept: `WorkingActivity` (the expandable "Working for 2m 14s" strip that is
 * the whole point of A1), streaming markdown, the scroll-lock state machine,
 * the IME-safe Enter handler, and the settle animation.
 *
 * Changed:
 *  - A fourth part type, `chip`, renders through `ChipView`.
 *  - `window.runtaCrew.openExternal` → `window.open`, so links work in a tab
 *    and in Electron without a preload bridge.
 *  - Attachments removed. The backend has no attachment store; a paperclip
 *    that drops files is worse than no paperclip.
 */

import { ArrowDown, ChevronRight, Cloud, FileText, Globe2, Monitor, Terminal } from "lucide-react";
import {
  lazy, Suspense, useEffect, useLayoutEffect, useRef, useState,
  type FormEvent, type MouseEvent,
} from "react";
import { splitMentions } from "../domain/mentions";
import type { ActivityEvent, Agent, Conversation as Thread, Message } from "../domain/types";
import { AgentAvatar } from "./AgentAvatar";
import { ChipView, type ChipHandlers } from "./chips";

const Streamdown = lazy(async () => ({ default: (await import("streamdown")).Streamdown }));

const activityIcon = {
  browser: Globe2, terminal: Terminal, file: FileText, handoff: Cloud, status: Cloud,
} as const;

function textOf(message: Message) {
  return message.parts.filter((part) => part.type === "text").map((part) => part.text).join("");
}

const elapsedLabel = (milliseconds: number) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
};

function SubmitArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>;
}
function StopIcon() {
  return <svg className="stop-icon" aria-hidden="true" viewBox="0 0 24 24"><rect x="7.5" y="7.5" width="9" height="9" rx="1.5" fill="currentColor" /></svg>;
}

function openExternalLink(event: MouseEvent<HTMLDivElement>) {
  if (!(event.target instanceof Element)) return;
  const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
  if (!anchor || !event.currentTarget.contains(anchor)) return;
  try {
    const url = new URL(anchor.href);
    // A `file:` or `javascript:` href in model output must not navigate the
    // app out from under the operator.
    if (url.protocol !== "http:" && url.protocol !== "https:") return;
    event.preventDefault();
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  } catch { /* Malformed output is ignored rather than followed. */ }
}

function WorkingActivity({ agent, label, activities, startedAt }: {
  agent?: Pick<Agent, "id" | "name">;
  label: string;
  activities: ActivityEvent[];
  startedAt: string;
}) {
  const [now, setNow] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  return <details className="agent-working-details" open={open}>
    <summary
      role="status"
      aria-label={`${agent?.name ?? "This teammate"} is working: ${label}`}
      onClick={(event) => { event.preventDefault(); setOpen((value) => !value); }}
    >
      <span className="agent-working-progress">Working for {elapsedLabel(now - Date.parse(startedAt))}</span>
      <ChevronRight className="agent-working-chevron" size={15} />
    </summary>
    {activities.length > 0 && <div className="agent-working-tools">
      {activities.map((activity) => {
        const Icon = activityIcon[activity.kind] ?? Cloud;
        return <details className={`agent-tool-detail ${activity.status}`} key={activity.id}>
          <summary><Icon size={14} /><span>{activity.title}</span><ChevronRight size={13} /></summary>
          <div>{activity.output ?? (activity.status === "running" ? "Waiting for result…" : "No output")}</div>
        </details>;
      })}
    </div>}
  </details>;
}

export function MessageView({
  message, agent, senderName, activities, chips, entering = false, room = [],
}: {
  message: Message;
  agent?: Pick<Agent, "id" | "name">;
  senderName?: string;
  activities: ActivityEvent[];
  chips: ChipHandlers;
  entering?: boolean;
  /** Who is in this thread, for turning `message.mentions` back into names. */
  room?: Agent[];
}) {
  const text = textOf(message);
  const rootRef = useRef<HTMLDivElement>(null);
  const previousStreaming = useRef(Boolean(message.streaming));
  const conversationActivities = activities.filter((a) => a.conversationId === message.conversationId);
  const activeActivity = [...conversationActivities].reverse().find((a) => a.status === "running")
    ?? conversationActivities.at(-1);
  const agentWorking = message.role === "agent" && Boolean(message.streaming);
  const workingLabel = text.trim() || activeActivity?.title || "Working";
  const chipParts = message.parts.filter((part) => part.type === "chip");

  useLayoutEffect(() => {
    const root = rootRef.current;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (root && message.role === "agent" && previousStreaming.current && !message.streaming && !reducedMotion) {
      const body = root.querySelector<HTMLElement>(".message-body");
      if (body && typeof body.animate === "function") {
        body.animate(
          [{ opacity: 0, transform: "translate3d(-6px,4px,0)" }, { opacity: 1, transform: "translate3d(0,0,0)" }],
          { duration: 260, easing: "cubic-bezier(.2,.82,.3,1)" },
        );
      }
    }
    previousStreaming.current = Boolean(message.streaming);
  }, [entering, message.role, message.streaming]);

  return <div className={`message ${message.role} ${entering ? "message-entering" : ""}`} ref={rootRef}>
    {message.interrupted && <div className="agent-interrupted">Interrupted</div>}
    {senderName && message.role === "agent" && <div className="message-sender">{senderName}</div>}
    {!agentWorking && (text || (message.streaming && !chipParts.length)) && <div
      className="message-body"
      onClick={message.role === "agent" ? openExternalLink : undefined}
    >
      {message.role === "agent"
        ? <Suspense fallback={<span className="agent-markdown-fallback">{text}</span>}>
            <Streamdown
              className="agent-markdown"
              mode={message.streaming ? "streaming" : "static"}
              parseIncompleteMarkdown={message.streaming}
              animated={message.streaming}
              controls={{ code: { copy: true, download: false }, table: false, image: false }}
              tableMaxHeight="none"
              linkSafety={{ enabled: false }}
              skipHtml
            >{text}</Streamdown>
          </Suspense>
        : splitMentions(text, message.mentions, room).map((span, index) => span.agentId
            ? <mark key={index} className="mention" title={`Asked ${
                room.find((a) => a.id === span.agentId)?.name ?? span.agentId
              } directly`}>{span.text}</mark>
            : <span key={index}>{span.text}</span>)}
    </div>}
    {agentWorking && <WorkingActivity
      agent={agent} label={workingLabel} activities={conversationActivities} startedAt={message.createdAt} />}
    {chipParts.map((part, index) => <ChipView
      key={`${message.id}:${index}`} kind={part.kind} payload={part.payload} handlers={chips} />)}
  </div>;
}

export function Conversation({
  agent, thread, agentsById, messages, activities, chips,
  loading = false, focusRequest = 0, draft: draftRequest, onSend, onToggleDetails,
}: {
  agent?: Agent;
  thread?: Thread;
  agentsById: Map<string, Agent>;
  messages: Message[];
  activities: ActivityEvent[];
  chips: ChipHandlers;
  loading?: boolean;
  focusRequest?: number;
  /**
   * Text to put in the composer, with a counter so the same suggestion can be
   * offered twice. Not `onSend`: a suggested routine carries a guessed time of
   * day, and that guess is what somebody wants to change before it becomes a
   * standing instruction.
   */
  draft?: { text: string; nonce: number };
  onSend(text: string): Promise<void>;
  onToggleDetails(): void;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const pinnedToBottomRef = useRef(true);
  const programmaticScrollRef = useRef(false);
  const suppressScrollbarUntilRef = useRef(0);
  const lastScrollTopRef = useRef(0);
  const programmaticScrollTimer = useRef<number | undefined>(undefined);
  const scrollHideTimer = useRef<number | undefined>(undefined);
  const knownMessageIds = useRef(new Set<string>());
  const knownThreadId = useRef(thread?.id ?? "");
  const wasLoading = useRef(loading);
  const [enteringMessageIds, setEnteringMessageIds] = useState<ReadonlySet<string>>(() => new Set());

  const title = thread?.title || agent?.name || "Crew";
  const isRoom = thread?.kind === "group";
  // Only for turning ids the server sent back into names to show. Membership
  // is not re-derived here: who was addressed already arrived resolved.
  const roomMembers = (thread?.members ?? [])
    .map((id) => agentsById.get(id))
    .filter((a): a is Agent => Boolean(a));
  const threadKey = thread?.id ?? agent?.id ?? "";

  useLayoutEffect(() => {
    const reset = knownThreadId.current !== threadKey || wasLoading.current;
    knownThreadId.current = threadKey;
    wasLoading.current = loading;
    if (loading || reset) {
      knownMessageIds.current = new Set(messages.map((message) => message.id));
      setEnteringMessageIds(new Set());
      return;
    }
    const added = messages.filter((m) => !knownMessageIds.current.has(m.id)).map((m) => m.id);
    for (const id of added) knownMessageIds.current.add(id);
    setEnteringMessageIds(new Set(added));
  }, [threadKey, loading, messages]);

  function scrollToBottom(behavior: ScrollBehavior) {
    const element = scrollRef.current;
    if (!element || typeof element.scrollTo !== "function") return;
    pinnedToBottomRef.current = true;
    programmaticScrollRef.current = true;
    setShowScrollToBottom(false);
    if (programmaticScrollTimer.current) window.clearTimeout(programmaticScrollTimer.current);
    suppressScrollbarUntilRef.current = Math.max(
      suppressScrollbarUntilRef.current, Date.now() + (behavior === "smooth" ? 650 : 150));
    element.scrollTo({ top: element.scrollHeight, behavior });
    programmaticScrollTimer.current = window.setTimeout(() => {
      programmaticScrollTimer.current = undefined;
      programmaticScrollRef.current = false;
    }, behavior === "smooth" ? 400 : 0);
  }

  useEffect(() => {
    pinnedToBottomRef.current = true;
    programmaticScrollRef.current = false;
    lastScrollTopRef.current = 0;
    setShowScrollToBottom(false);
    requestAnimationFrame(() => scrollToBottom("auto"));
  }, [threadKey]);
  useEffect(() => { if (pinnedToBottomRef.current) scrollToBottom("smooth"); }, [messages]);
  useEffect(() => {
    const element = scrollRef.current;
    const content = contentRef.current;
    if (!element || !content || typeof ResizeObserver === "undefined") return;
    // A streaming reply grows the content box without any scroll event, so the
    // observer is what keeps the view pinned while tokens land.
    const observer = new ResizeObserver(() => { if (pinnedToBottomRef.current) scrollToBottom("auto"); });
    observer.observe(content);
    return () => observer.disconnect();
  }, [threadKey, loading]);
  useEffect(() => () => {
    if (scrollHideTimer.current) window.clearTimeout(scrollHideTimer.current);
    if (programmaticScrollTimer.current) window.clearTimeout(programmaticScrollTimer.current);
  }, []);
  useEffect(() => { if (focusRequest > 0) composerRef.current?.focus(); }, [threadKey, focusRequest]);
  useEffect(() => {
    if (!draftRequest?.nonce) return;
    setDraft(draftRequest.text);
    const composer = composerRef.current;
    composer?.focus();
    // Caret at the end: the suggestion is a starting point to edit, and
    // landing with everything selected means the first keystroke destroys it.
    composer?.setSelectionRange(draftRequest.text.length, draftRequest.text.length);
    // Keyed on the nonce alone, so offering the same suggestion twice works.
  }, [draftRequest?.nonce]);   // eslint-disable-line react-hooks/exhaustive-deps

  function revealScrollbarBriefly() {
    if (programmaticScrollRef.current || Date.now() < suppressScrollbarUntilRef.current) return;
    setScrollbarVisible(true);
    if (scrollHideTimer.current) window.clearTimeout(scrollHideTimer.current);
    scrollHideTimer.current = window.setTimeout(() => {
      scrollHideTimer.current = undefined;
      setScrollbarVisible(false);
    }, 700);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sendingRef.current) return;
    sendingRef.current = true;
    setDraft("");
    setSending(true);
    try { await onSend(text); }
    finally { sendingRef.current = false; setSending(false); }
  }

  return <main className="conversation">
    <header className={`conversation-header ${isScrolled ? "scrolled" : ""}`}>
      <h1>{thread?.emoji && <span className="conversation-emoji">{thread.emoji}</span>}{title}</h1>
      {thread?.subtitle && <p className="conversation-subtitle">{thread.subtitle}</p>}
      <div className="header-actions">
        {!isRoom && <button className="computer-trigger" aria-label="Open this teammate's computer" onClick={onToggleDetails}>
          <Monitor size={18} />
        </button>}
      </div>
    </header>
    <div className="conversation-scroll-shell">{loading
      ? <div className="conversation-skeleton" role="status" aria-label="Loading this thread">
          <div className="skeleton-message skeleton-agent"><span className="skeleton-line skeleton-line-wide" /><span className="skeleton-line" /></div>
          <div className="skeleton-message skeleton-user"><span className="skeleton-bubble" /></div>
          <div className="skeleton-message skeleton-agent"><span className="skeleton-line skeleton-line-short" /></div>
        </div>
      : <>
        <div
          className={`message-scroll ${scrollbarVisible ? "scrollbar-visible" : ""}`}
          ref={scrollRef}
          onWheelCapture={(event) => { if (event.deltaY < 0) programmaticScrollRef.current = false; }}
          onScroll={(event) => {
            const element = event.currentTarget;
            const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
            const atBottom = distanceFromBottom <= 24;
            const scrollingUp = element.scrollTop < lastScrollTopRef.current - 1;
            lastScrollTopRef.current = element.scrollTop;
            setIsScrolled(element.scrollTop > 0);
            if (scrollingUp && distanceFromBottom > 72) {
              programmaticScrollRef.current = false;
              pinnedToBottomRef.current = false;
              setShowScrollToBottom(true);
            } else if (!programmaticScrollRef.current && atBottom) {
              pinnedToBottomRef.current = true;
              setShowScrollToBottom(false);
            } else if (!programmaticScrollRef.current && distanceFromBottom > 72) {
              pinnedToBottomRef.current = false;
              setShowScrollToBottom(true);
            }
            revealScrollbarBriefly();
          }}
          onPointerMove={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (bounds.right - event.clientX <= 14) setScrollbarVisible(true);
            else if (!scrollHideTimer.current) setScrollbarVisible(false);
          }}
          onPointerLeave={() => setScrollbarVisible(false)}
        >
          <div className="message-content" ref={contentRef}>
            {messages.length === 0 && agent && <div className="conversation-intro">
              <AgentAvatar agent={agent} size={54} /><h2>{agent.name}</h2><p>{agent.role}</p>
            </div>}
            {messages.map((message) => <MessageView
              key={message.id}
              message={message}
              agent={agent}
              // Only a room needs an attribution line; in a DM there is only
              // ever one voice on that side.
              senderName={isRoom ? agentsById.get(message.sender ?? "")?.name : undefined}
              room={roomMembers}
              activities={activities}
              chips={chips}
              entering={enteringMessageIds.has(message.id) || message.id.startsWith("optimistic-user:")}
            />)}
          </div>
        </div>
        {showScrollToBottom && <button
          type="button" className="scroll-to-bottom" aria-label="Scroll to the latest message"
          onClick={() => scrollToBottom("smooth")}
        ><ArrowDown size={20} /></button>}
      </>}
    </div>
    <form className="composer" onSubmit={submit}>
      <textarea
        ref={composerRef}
        aria-label={`Message ${title}`}
        placeholder={isRoom ? `Ask the room…` : `Message ${title}…`}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          // `isComposing` and keyCode 229 are both needed: Enter mid-IME
          // composition is picking a candidate, not sending, and browsers
          // disagree about which one they report.
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <div className="composer-bottom">
        <button
          className="submit-button"
          data-state={sending ? "stopping" : "send"}
          aria-label={sending ? "Sending" : "Send message"}
          disabled={!draft.trim() || sending}
        >{sending ? <StopIcon /> : <SubmitArrowIcon />}</button>
      </div>
    </form>
  </main>;
}
