/**
 * The two decisions the Spaces editor makes that are worth testing.
 *
 * Everything else about saving is `PageAutosave` in `@hermes/crew-ui/state`,
 * which is already shared and already tested. What is *new* on a phone is a
 * hazard the web does not have, and it is the worse one: the operating system
 * can suspend or kill the app the moment the operator switches away. The
 * autosave is debounced on a timer, so on the web a tab stays alive and the
 * pending save fires; here it simply never runs, and what was typed is gone.
 *
 * So the editor flushes when the app leaves the foreground — but not from every
 * state, which is what `shouldFlushOnBackground` decides.
 *
 * No React Native import, so both live where they can be checked on a laptop.
 */

import type { SaveState, SaveStatus } from "@hermes/crew-ui/state";

/**
 * Should a save be forced because the app is going away?
 *
 * - `dirty` — yes. This is the whole reason the hook exists.
 * - `error` — yes. The last attempt failed for a reason that may have passed
 *   (a dropped connection on the way into a lift), and the alternative is
 *   losing the work outright.
 * - `saving` — no. One is already in flight and `PageAutosave` holds a single
 *   pending write; a second would race its own result.
 * - `saved` — no. Nothing to send.
 * - **`conflict` — no, and this is the case that matters.** The server has
 *   already refused this draft because somebody else moved the page on. Re-sending
 *   it unattended would turn a conflict the operator has not seen yet into a
 *   silent attempt to overwrite the other person — exactly what the revision
 *   check exists to prevent. It waits for them to choose.
 */
export function shouldFlushOnBackground(status: SaveStatus): boolean {
  return status === "dirty" || status === "error";
}

/**
 * One honest line under the editor.
 *
 * A phone has no room for a toolbar, so this is the entire save indicator, and
 * `error` and `conflict` must not collapse into one phrase: "could not save"
 * means try again, "somebody else changed this" means read theirs first. The
 * actions a reader takes from them are different, so the words are.
 */
export function statusLabel(state: Pick<SaveState, "status" | "error">): string {
  switch (state.status) {
    case "saved":
      return "Saved";
    case "dirty":
      return "Unsaved";
    case "saving":
      return "Saving…";
    case "conflict":
      return "Somebody else changed this page";
    case "error":
      return state.error || "Could not save";
  }
}
