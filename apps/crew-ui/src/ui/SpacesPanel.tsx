/**
 * Spaces — the shared documents, from the operator's side.
 *
 * Every other surface in this workspace is a conversation. This one is a
 * document that sits still while two people write in it, and almost all of the
 * care here is about the moment they both do.
 *
 * Three decisions worth knowing before changing anything:
 *
 * **A conflict is never resolved for you.** When the server refuses a save,
 * the banner offers exactly two things: copy your draft, or load the latest.
 * Nothing merges, nothing retries, and the draft stays in the box. The
 * alternative — a retry on a timer — eventually wins the race and deletes
 * whatever the other writer did, with no error anywhere. `PageAutosave` holds
 * that line; this component's job is to make the two choices obvious.
 *
 * **The editor is Markdown source with a preview, not a rich-text surface.**
 * A page is written by a model at least as often as by a person, and models
 * write Markdown. A WYSIWYG layer would mean a parse/serialise round trip on
 * every open, which is a way to quietly reformat somebody's document — the
 * upstream this was ported from carries a whole module (`inspectMarkdown`)
 * whose only job is detecting when its own editor would do that. Source mode
 * has nothing to detect.
 *
 * **The preview renders with `skipHtml`.** A page is model-writable and the
 * dashboard is an authenticated origin. Same reasoning as `FilesPanel`'s
 * refusal to preview artifacts, and the same answer.
 */

import {
  AlertTriangle, Check, ChevronRight, Eye, FileText, Loader2, Plus, RefreshCw,
  Search, Trash2, Users,
} from "lucide-react";
import {
  Suspense, lazy, useCallback, useEffect, useMemo, useState,
  useSyncExternalStore,
} from "react";
import type { CloudAgentsClient } from "../domain/CloudAgentsClient";
import type { Agent, PageSummary, Space } from "../domain/types";
import { PageAutosave, type SaveState } from "../state/pageAutosave";

const Streamdown = lazy(async () => ({ default: (await import("streamdown")).Streamdown }));

export interface SpacesPanelProps {
  client: CloudAgentsClient;
  /** The roster, for the invite row. */
  agents: Agent[];
}

interface TreeNode {
  page: PageSummary;
  children: TreeNode[];
}

/**
 * The flat list as a tree.
 *
 * A page whose parent is missing from this list — filtered out by a search, or
 * deleted between two requests — is shown at the top level rather than
 * dropped. A document that exists and is not on screen is the worst outcome
 * available here.
 */
function toTree(pages: PageSummary[]): TreeNode[] {
  const nodes = new Map<string, TreeNode>(
    pages.map((page) => [page.id, { page, children: [] }]),
  );
  const roots: TreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.page.parent_id ? nodes.get(node.page.parent_id) : undefined;
    if (parent && parent !== node) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

const STATUS_LABEL: Record<SaveState["status"], string> = {
  saved: "Saved",
  dirty: "Unsaved changes",
  saving: "Saving…",
  error: "Not saved",
  conflict: "Changed elsewhere",
};

function SaveBadge({ state }: { state: SaveState }) {
  const Icon =
    state.status === "saving" ? Loader2
    : state.status === "saved" ? Check
    : AlertTriangle;
  return (
    <span className={`space-save space-save-${state.status}`}>
      <Icon size={13} className={state.status === "saving" ? "space-spin" : undefined} />
      {STATUS_LABEL[state.status]}
    </span>
  );
}

export function SpacesPanel({ client, agents }: SpacesPanelProps) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spaceId, setSpaceId] = useState("");
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [pageId, setPageId] = useState("");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState(false);
  const [problem, setProblem] = useState("");
  const [copied, setCopied] = useState(false);

  const autosave = useMemo(
    () => new PageAutosave((id, patch, signal) => client.patchPage(spaceId, id, patch, signal)),
    [client, spaceId],
  );
  useEffect(() => () => autosave.dispose(), [autosave]);

  const state = useSyncExternalStore(autosave.subscribe, autosave.getSnapshot);
  const space = spaces.find((s) => s.id === spaceId);

  const refreshSpaces = useCallback(async () => {
    try {
      const listed = await client.listSpaces();
      setSpaces(listed);
      setSpaceId((current) => (listed.some((s) => s.id === current) ? current : listed[0]?.id ?? ""));
    } catch (reason) {
      setProblem(reason instanceof Error ? reason.message : "Could not load Spaces.");
    }
  }, [client]);

  const refreshPages = useCallback(async () => {
    if (!spaceId) return setPages([]);
    try {
      setPages(await client.listPages(spaceId, query));
    } catch (reason) {
      setProblem(reason instanceof Error ? reason.message : "Could not load this Space.");
    }
  }, [client, spaceId, query]);

  useEffect(() => void refreshSpaces(), [refreshSpaces]);

  // Debounced so a search is one request per pause, not one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => void refreshPages(), query ? 200 : 0);
    return () => clearTimeout(timer);
  }, [refreshPages, query]);

  // Opening a page replaces the editor's contents, so it has to go through
  // `receive`, which is what cancels any save still in flight for the last one.
  useEffect(() => {
    if (!spaceId || !pageId) return;
    let live = true;
    client
      .getPage(spaceId, pageId)
      .then((page) => { if (live) autosave.receive(page); })
      .catch((reason) => {
        if (live) setProblem(reason instanceof Error ? reason.message : "Could not open that page.");
      });
    return () => { live = false; };
  }, [autosave, client, pageId, spaceId]);

  // The browser's own guard. `dirty` covers a save in flight as well as an
  // untouched timer, so this fires for everything a reload would lose.
  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => {
      if (autosave.dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [autosave]);

  const createPage = async () => {
    if (!spaceId) return;
    try {
      const page = await client.createPage(spaceId, { title: "Untitled", content: "" });
      await refreshPages();
      setPageId(page.id);
    } catch (reason) {
      setProblem(reason instanceof Error ? reason.message : "Could not create the page.");
    }
  };

  const createSpace = async () => {
    const name = window.prompt("Name this Space")?.trim();
    if (!name) return;
    try {
      const created = await client.createSpace(name);
      await refreshSpaces();
      setSpaceId(created.id);
      setPageId("");
    } catch (reason) {
      setProblem(reason instanceof Error ? reason.message : "Could not create the Space.");
    }
  };

  const removePage = async (target: PageSummary) => {
    if (!window.confirm(`Delete “${target.title}”? Its sub-pages move up a level.`)) return;
    await client.deletePage(spaceId, target.id);
    if (target.id === pageId) setPageId("");
    await refreshPages();
  };

  const toggleMember = async (agentId: string, member: boolean) => {
    await client.setSpaceMember(spaceId, agentId, member);
    await refreshSpaces();
  };

  const copyDraft = async () => {
    const draft = state.draft;
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(`# ${draft.title}\n\n${draft.content}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setProblem("Could not reach the clipboard. Select the text and copy it.");
    }
  };

  const tree = useMemo(() => toTree(pages), [pages]);

  return (
    <div className="spaces-panel">
      <aside className="spaces-library">
        <header className="spaces-library-head">
          <select
            className="spaces-picker"
            value={spaceId}
            onChange={(event) => { setSpaceId(event.target.value); setPageId(""); }}
            aria-label="Space"
          >
            {spaces.length === 0 && <option value="">No Spaces yet</option>}
            {spaces.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <button type="button" className="spaces-icon-button" onClick={() => void createSpace()}
                  title="New Space" aria-label="New Space">
            <Plus size={15} />
          </button>
        </header>

        <div className="spaces-search">
          <Search size={14} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search this Space"
            aria-label="Search this Space"
          />
        </div>

        <nav className="spaces-tree" aria-label="Pages">
          {tree.length === 0 && (
            <p className="spaces-empty">
              {query ? "Nothing matches." : "No pages yet."}
            </p>
          )}
          {tree.map((node) => (
            <TreeRow
              key={node.page.id} node={node} depth={0} activeId={pageId}
              onOpen={setPageId} onDelete={removePage}
            />
          ))}
        </nav>

        <button type="button" className="spaces-new-page" onClick={() => void createPage()}
                disabled={!spaceId}>
          <Plus size={14} /> New page
        </button>

        {space && (
          <section className="spaces-members">
            <h4><Users size={13} /> Who can read this</h4>
            {agents.length === 0 && <p className="spaces-empty">No teammates yet.</p>}
            {agents.map((agent) => {
              const member = space.bot_ids.includes(agent.id);
              return (
                <label key={agent.id} className="spaces-member">
                  <input
                    type="checkbox" checked={member}
                    onChange={() => void toggleMember(agent.id, !member)}
                  />
                  <span>{agent.avatar} {agent.name}</span>
                </label>
              );
            })}
            <p className="spaces-note">
              A teammate you remove stops being able to read this on its very next
              tool call, not its next turn.
            </p>
          </section>
        )}
      </aside>

      <section className="spaces-editor">
        {problem && (
          <p className="spaces-problem" role="status">
            {problem}
            <button type="button" onClick={() => setProblem("")}>Dismiss</button>
          </p>
        )}

        {!state.page && (
          <div className="spaces-placeholder">
            <FileText size={28} />
            <p>Pick a page, or start one.</p>
          </div>
        )}

        {state.page && state.draft && (
          <>
            <header className="spaces-editor-head">
              <input
                className="spaces-title"
                value={state.draft.title}
                onChange={(event) => autosave.edit({ title: event.target.value })}
                aria-label="Page title"
              />
              <div className="spaces-editor-actions">
                <SaveBadge state={state} />
                <button
                  type="button" className="spaces-icon-button"
                  aria-pressed={preview} title={preview ? "Edit" : "Preview"}
                  onClick={() => setPreview((on) => !on)}
                >
                  <Eye size={15} />
                </button>
              </div>
            </header>

            {state.status === "conflict" && (
              <div className="spaces-conflict" role="alert">
                <AlertTriangle size={16} />
                <div>
                  <strong>{state.error}</strong>
                  <p>
                    Nothing has been overwritten and nothing will be saved until you
                    choose.
                  </p>
                </div>
                <div className="spaces-conflict-actions">
                  <button type="button" onClick={() => void copyDraft()}>
                    {copied ? "Copied" : "Copy my draft"}
                  </button>
                  <button type="button" className="primary" onClick={() => autosave.useLatest()}>
                    Load the latest
                  </button>
                </div>
              </div>
            )}

            {state.status === "error" && (
              <div className="spaces-conflict spaces-conflict-error" role="alert">
                <AlertTriangle size={16} />
                <div><strong>{state.error}</strong></div>
                <div className="spaces-conflict-actions">
                  <button type="button" className="primary" onClick={() => void autosave.flush(true)}>
                    <RefreshCw size={13} /> Try again
                  </button>
                </div>
              </div>
            )}

            {preview ? (
              <div className="spaces-preview">
                <Suspense fallback={<p className="spaces-empty">Rendering…</p>}>
                  <Streamdown mode="static" controls={false} linkSafety={{ enabled: true }} skipHtml>
                    {state.draft.content}
                  </Streamdown>
                </Suspense>
              </div>
            ) : (
              <textarea
                className="spaces-body"
                value={state.draft.content}
                spellCheck
                onChange={(event) => autosave.edit({ content: event.target.value })}
                aria-label="Page content"
                placeholder="Markdown."
              />
            )}

            <footer className="spaces-editor-foot">
              <span>Revision {state.page.revision}</span>
              {state.page.created_by && <span>Started by {state.page.created_by}</span>}
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

function TreeRow({
  node, depth, activeId, onOpen, onDelete,
}: {
  node: TreeNode;
  depth: number;
  activeId: string;
  onOpen: (id: string) => void;
  onDelete: (page: PageSummary) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  return (
    <div className="spaces-tree-node">
      <div
        className={`spaces-tree-row${node.page.id === activeId ? " is-active" : ""}`}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <button
          type="button"
          className={`spaces-twisty${hasChildren ? "" : " is-leaf"}`}
          onClick={() => setOpen((on) => !on)}
          aria-label={open ? "Collapse" : "Expand"}
          aria-expanded={hasChildren ? open : undefined}
          disabled={!hasChildren}
        >
          <ChevronRight size={13} className={open ? "spaces-twisty-open" : undefined} />
        </button>
        <button type="button" className="spaces-tree-title" onClick={() => onOpen(node.page.id)}>
          {node.page.title}
        </button>
        <button
          type="button" className="spaces-icon-button spaces-row-delete"
          onClick={() => onDelete(node.page)}
          title={`Delete ${node.page.title}`} aria-label={`Delete ${node.page.title}`}
        >
          <Trash2 size={13} />
        </button>
      </div>
      {open && node.children.map((child) => (
        <TreeRow
          key={child.page.id} node={child} depth={depth + 1} activeId={activeId}
          onOpen={onOpen} onDelete={onDelete}
        />
      ))}
    </div>
  );
}
