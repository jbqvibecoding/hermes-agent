/**
 * The phone-only save decisions.
 *
 * `PageAutosave` itself is tested in crew-ui. What is tested here is the part
 * that only exists because this is a phone: what to do when the operating
 * system is about to take the app away mid-edit.
 */

import { describe, expect, it } from "vitest";
import type { SaveStatus } from "@hermes/crew-ui/state";
import { shouldFlushOnBackground, statusLabel } from "./draft";

describe("shouldFlushOnBackground", () => {
  it("saves unsent work rather than losing it to a suspend", () => {
    // The hazard the whole hook exists for: debounced save, app killed, text
    // gone. A tab on the web stays alive; an app does not.
    expect(shouldFlushOnBackground("dirty")).toBe(true);
  });

  it("retries after a failure, because the alternative is losing the work", () => {
    expect(shouldFlushOnBackground("error")).toBe(true);
  });

  it("does not re-send a draft the server already refused", () => {
    // **The case that matters.** A conflict means somebody else moved the page
    // on. Re-sending unattended turns a conflict the operator has not seen into
    // a silent attempt to overwrite them — which is the exact thing the
    // revision check exists to prevent. It waits for a person.
    expect(shouldFlushOnBackground("conflict")).toBe(false);
  });

  it("does not race a save that is already in flight", () => {
    expect(shouldFlushOnBackground("saving")).toBe(false);
  });

  it("does nothing when there is nothing to send", () => {
    expect(shouldFlushOnBackground("saved")).toBe(false);
  });

  it("has an answer for every status the autosave can be in", () => {
    // An invariant rather than a snapshot: if SaveStatus gains a member, this
    // fails until somebody decides what backgrounding means for it, which is a
    // decision and not a default.
    const all: SaveStatus[] = ["saved", "dirty", "saving", "error", "conflict"];
    for (const status of all) {
      expect(typeof shouldFlushOnBackground(status)).toBe("boolean");
    }
  });
});

describe("statusLabel", () => {
  it("keeps 'could not save' and 'somebody changed it' apart", () => {
    // They need different things from the reader — retry versus go and read
    // theirs — so collapsing them into one phrase would be the lie.
    const failed = statusLabel({ status: "error" });
    const clashed = statusLabel({ status: "conflict" });
    expect(failed).not.toBe(clashed);
    expect(clashed.toLowerCase()).toContain("changed");
  });

  it("prefers the server's own reason for a failure", () => {
    expect(statusLabel({ status: "error", error: "Saving timed out." }))
      .toBe("Saving timed out.");
    // …and still says something when there is no reason to pass on.
    expect(statusLabel({ status: "error" })).toBe("Could not save");
  });

  it("never renders an empty line under the editor", () => {
    const all: SaveStatus[] = ["saved", "dirty", "saving", "error", "conflict"];
    for (const status of all) {
      expect(statusLabel({ status }).trim().length).toBeGreaterThan(0);
    }
  });
});
