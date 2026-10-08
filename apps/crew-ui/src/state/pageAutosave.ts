/**
 * Lifted from opendots `src/client/editor/autosave.ts`
 * (MIT, Copyright (c) Atai Barkai), adapted to this repo's wire names and
 * error type. The state machine is theirs and is the reason this was lifted
 * rather than written: six separate things have to be true at once for "both
 * of you can be typing" to be safe, and the obvious implementation gets about
 * three of them.
 *
 *  1. **An 800ms debounce**, so a paragraph is one save and not forty.
 *  2. **A generation counter.** Changing page invalidates every save already
 *     in flight. Without it, a response for the previous page arrives and
 *     overwrites the one you are now looking at.
 *  3. **One pending promise.** Two saves interleaving means the second can
 *     carry the first's revision and lose a paragraph.
 *  4. **A 10s race timeout** that aborts the request, so a hung connection
 *     does not leave the editor saying "saving" forever.
 *  5. **Every PATCH carries `expected_revision`**, which is what makes the
 *     server able to refuse rather than overwrite.
 *  6. **`error` and `conflict` stop the automatic retry.** This is the one
 *     people leave out and it is the most important: a conflict that keeps
 *     retrying on a timer eventually wins the race and silently destroys
 *     whatever the other writer did. Only an explicit action — `flush(true)`
 *     or `useLatest()` — resumes.
 *
 * The draft is never discarded on failure. Every error string here says where
 * the draft is, because the question a person asks when a save fails is not
 * "why" but "did I just lose my work".
 */

import type { Page, PageDraft, PatchPageInput } from "../domain/types";

export type SaveStatus = "saved" | "dirty" | "saving" | "error" | "conflict";

export interface SaveState {
  /** The page as last confirmed by the server. The revision to save against. */
  page?: Page;
  /** What is in the editor. */
  draft?: PageDraft;
  /** The newest revision the server has told us about, saved or not. */
  remote?: Page;
  status: SaveStatus;
  error?: string;
}

export type SavePage = (
  id: string,
  patch: PatchPageInput,
  signal: AbortSignal,
) => Promise<Page>;

/** Mirrors the server's own limits (`crew.pages.MAX_TITLE` / `MAX_CONTENT`). */
export const MAX_TITLE = 160;
export const MAX_CONTENT = 100_000;

const SAVE_DEBOUNCE_MS = 800;
const SAVE_TIMEOUT_MS = 10_000;

const CONFLICT_MESSAGE =
  "This page changed elsewhere. Your draft is safe — copy it before loading the latest version.";

const fields = (page: Page): PageDraft => ({
  title: page.title,
  content: page.content,
  parent_id: page.parent_id,
});

const equal = (a: PageDraft, b: PageDraft) =>
  a.title === b.title && a.content === b.content && a.parent_id === b.parent_id;

const isConflict = (error: unknown) =>
  !!error &&
  typeof error === "object" &&
  (("kind" in error && (error as { kind?: string }).kind === "conflict") ||
    ("status" in error && (error as { status?: number }).status === 409));

export class PageAutosave {
  private state: SaveState = { status: "saved" };
  private listeners = new Set<() => void>();
  private timer?: ReturnType<typeof setTimeout>;
  private controller?: AbortController;
  private pending?: Promise<boolean>;
  private generation = 0;

  constructor(private save: SavePage) {}

  /** For `useSyncExternalStore`. */
  getSnapshot = () => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private publish(patch: Partial<SaveState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }

  private get changed() {
    return !!(
      this.state.page &&
      this.state.draft &&
      !equal(fields(this.state.page), this.state.draft)
    );
  }

  /** Whether there is anything a reload would lose. */
  get dirty() {
    return !!this.pending || this.changed || this.state.status === "error" ||
      this.state.status === "conflict";
  }

  /**
   * A page arrived from the server — opened, or pushed while open.
   *
   * The three branches are the whole subtlety. A *different* page resets
   * everything. A newer revision of the *same* page while the draft is clean
   * is just the latest version. A newer revision while the draft is dirty is a
   * conflict, and the draft stays exactly where it is.
   */
  receive(page: Page) {
    if (this.state.page?.id !== page.id) {
      this.generation++;
      clearTimeout(this.timer);
      this.controller?.abort();
      this.pending = undefined;
      this.publish({
        page, draft: fields(page), remote: page, status: "saved", error: undefined,
      });
      return;
    }
    if (page.revision <= (this.state.remote?.revision ?? 0)) return;
    if (this.pending) {
      // A save is in flight; let it finish and compare revisions itself.
      this.publish({ remote: page });
      return;
    }
    if (this.dirty) {
      clearTimeout(this.timer);
      this.publish({ remote: page, status: "conflict", error: CONFLICT_MESSAGE });
      return;
    }
    this.publish({
      page, remote: page, draft: fields(page), status: "saved", error: undefined,
    });
  }

  /** A keystroke. */
  edit(patch: Partial<PageDraft>) {
    if (!this.state.draft) return;
    this.publish({ draft: { ...this.state.draft, ...patch } });
    // Typing does not clear a conflict or an error. Only an explicit action
    // does, because the alternative is a timer eventually overwriting somebody.
    if (this.state.status === "error" || this.state.status === "conflict") return;
    this.publish({
      status: this.pending ? "saving" : this.changed ? "dirty" : "saved",
      error: undefined,
    });
    this.schedule();
  }

  private schedule() {
    clearTimeout(this.timer);
    if (
      this.changed &&
      !this.pending &&
      this.state.status !== "error" &&
      this.state.status !== "conflict"
    ) {
      this.timer = setTimeout(() => void this.flush(), SAVE_DEBOUNCE_MS);
    }
  }

  /**
   * Save now. `retry` is the operator asking again after an error — it is the
   * only way out of the `error` state, which is what keeps a failed save from
   * looping.
   */
  async flush(retry = false): Promise<boolean> {
    clearTimeout(this.timer);
    if (this.pending) {
      await this.pending;
      return this.changed ? this.flush(retry) : this.state.status === "saved";
    }
    if (!this.state.page || !this.state.draft) return false;
    if (this.state.status === "conflict" || (this.state.status === "error" && !retry)) {
      return false;
    }
    if (!this.changed && this.state.status !== "error") {
      this.publish({ status: "saved", error: undefined });
      return true;
    }

    const page = this.state.page;
    const draft = { ...this.state.draft };
    const generation = this.generation;

    // Checked here as well as on the server so an over-long document fails in
    // the editor, where the text still is, rather than as a 400.
    if (
      !draft.title.trim() ||
      draft.title.length > MAX_TITLE ||
      draft.content.length > MAX_CONTENT
    ) {
      this.publish({
        status: "error",
        error:
          `Use a title up to ${MAX_TITLE} characters and a document up to ` +
          `${MAX_CONTENT.toLocaleString("en-US")} characters. Your draft is still here.`,
      });
      return false;
    }

    this.controller = new AbortController();
    const controller = this.controller;
    this.publish({ status: "saving", error: undefined });

    const pending = (async () => {
      let deadline: ReturnType<typeof setTimeout> | undefined;
      try {
        const result = await Promise.race([
          this.save(
            page.id,
            {
              title: draft.title,
              content: draft.content,
              parent_id: draft.parent_id,
              move: true,
              expected_revision: page.revision,
            },
            controller.signal,
          ),
          new Promise<never>((_, reject) => {
            deadline = setTimeout(() => {
              controller.abort();
              reject(new Error("Saving timed out. Your draft is safe; retry when connected."));
            }, SAVE_TIMEOUT_MS);
          }),
        ]);
        if (generation !== this.generation) return false;

        // If the editor moved on while this was in flight, keep the newer draft
        // rather than snapping the cursor back to what was saved.
        const unchanged = equal(this.state.draft!, draft);
        const remote =
          this.state.remote && this.state.remote.revision > result.revision
            ? this.state.remote
            : result;
        this.publish({
          page: result,
          remote,
          draft: unchanged ? fields(result) : this.state.draft,
        });
        this.publish({
          status:
            remote.revision > result.revision ? "conflict" : this.changed ? "dirty" : "saved",
          error:
            remote.revision > result.revision
              ? "A newer revision exists. Your draft is preserved."
              : undefined,
        });
        return this.state.status !== "conflict";
      } catch (error) {
        if (generation !== this.generation) return false;
        this.publish({
          status: isConflict(error) ? "conflict" : "error",
          error: isConflict(error)
            ? CONFLICT_MESSAGE
            : error instanceof Error
              ? error.message
              : "Could not save. Your draft is safe.",
        });
        return false;
      } finally {
        clearTimeout(deadline);
        if (generation === this.generation) {
          this.pending = undefined;
          this.publish({});
          this.schedule();
        }
      }
    })();

    this.pending = pending;
    const success = await pending;
    if (success && generation === this.generation && this.changed) return this.flush(retry);
    return success;
  }

  /**
   * Take the server's version and drop the draft. The explicit way out of a
   * conflict, and the only thing in here that discards work — so it is never
   * called on a timer.
   */
  useLatest() {
    const page = this.state.remote;
    if (!page) return;
    this.generation++;
    clearTimeout(this.timer);
    this.controller?.abort();
    this.pending = undefined;
    this.publish({
      page, draft: fields(page), remote: page, status: "saved", error: undefined,
    });
  }

  dispose() {
    this.generation++;
    clearTimeout(this.timer);
    this.controller?.abort();
    this.pending = undefined;
    this.listeners.clear();
  }
}
