/**
 * The cases are opendots' reasons for writing `PageAutosave` the way it is
 * (MIT, Copyright (c) Atai Barkai), written out as tests because the file was
 * lifted and a lifted state machine with no tests is a liability.
 *
 * Every one of these is a race that only bites on a slow network and looks
 * like data loss when it does. That is why they are worth the fake clock: each
 * failure mode here ends with somebody's paragraph gone and no error anywhere.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Page, PatchPageInput } from "../domain/types";
import { PageAutosave, type SavePage } from "./pageAutosave";

const page = (over: Partial<Page> = {}): Page => ({
  id: "pg_1",
  space_id: "q3",
  parent_id: null,
  title: "Launch plan",
  content: "Ship on the 14th.",
  revision: 1,
  created_at: 0,
  updated_at: 0,
  created_by: "",
  ...over,
});

/** A `save` that records what it was asked and resolves when the test says. */
function deferredSaver() {
  const calls: Array<{ id: string; patch: PatchPageInput }> = [];
  const gates: Array<{
    resolve: (page: Page) => void;
    reject: (reason: unknown) => void;
  }> = [];
  const save: SavePage = (id, patch) => {
    calls.push({ id, patch });
    return new Promise<Page>((resolve, reject) => gates.push({ resolve, reject }));
  };
  return { save, calls, gates };
}

/** A `save` that simply echoes the patch back with the revision bumped. */
const echoSaver = (): { save: SavePage; calls: PatchPageInput[] } => {
  const calls: PatchPageInput[] = [];
  return {
    calls,
    save: async (_id, patch) => {
      calls.push(patch);
      return page({
        title: patch.title ?? "Launch plan",
        content: patch.content ?? "",
        revision: patch.expected_revision + 1,
      });
    },
  };
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("PageAutosave", () => {
  it("debounces a burst of keystrokes into one save", async () => {
    const { save, calls } = echoSaver();
    const autosave = new PageAutosave(save);
    autosave.receive(page());

    for (const text of ["S", "Sh", "Shi", "Ship", "Ship."]) autosave.edit({ content: text });
    expect(calls).toHaveLength(0);
    expect(autosave.getSnapshot().status).toBe("dirty");

    await vi.advanceTimersByTimeAsync(800);
    expect(calls).toHaveLength(1);
    expect(calls[0].content).toBe("Ship.");
    expect(autosave.getSnapshot().status).toBe("saved");
  });

  it("sends the revision it read, and the next save sends the new one", async () => {
    const { save, calls } = echoSaver();
    const autosave = new PageAutosave(save);
    autosave.receive(page({ revision: 7 }));

    autosave.edit({ content: "first" });
    await vi.advanceTimersByTimeAsync(800);
    autosave.edit({ content: "second" });
    await vi.advanceTimersByTimeAsync(800);

    expect(calls.map((c) => c.expected_revision)).toEqual([7, 8]);
  });

  it("refuses to keep retrying after a conflict, which is what protects the other writer", async () => {
    // The failure this prevents: a save that keeps retrying on a timer
    // eventually wins the race, and the other person's paragraph is gone with
    // no error anywhere.
    const { save, calls, gates } = deferredSaver();
    const autosave = new PageAutosave(save);
    autosave.receive(page());

    autosave.edit({ content: "mine" });
    await vi.advanceTimersByTimeAsync(800);
    expect(calls).toHaveLength(1);

    gates[0].reject(Object.assign(new Error("stale"), { kind: "conflict" }));
    await vi.advanceTimersByTimeAsync(0);

    expect(autosave.getSnapshot().status).toBe("conflict");
    expect(autosave.getSnapshot().draft?.content).toBe("mine");

    // Typing does not restart it, and neither does time.
    autosave.edit({ content: "mine, edited" });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(calls).toHaveLength(1);
    expect(autosave.getSnapshot().status).toBe("conflict");
    expect(autosave.getSnapshot().draft?.content).toBe("mine, edited");
  });

  it("treats a bare 409 status as a conflict too", async () => {
    const { save, gates } = deferredSaver();
    const autosave = new PageAutosave(save);
    autosave.receive(page());
    autosave.edit({ content: "mine" });
    await vi.advanceTimersByTimeAsync(800);

    gates[0].reject(Object.assign(new Error("stale"), { status: 409 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(autosave.getSnapshot().status).toBe("conflict");
  });

  it("stops after an error until the operator asks again", async () => {
    const { save, calls, gates } = deferredSaver();
    const autosave = new PageAutosave(save);
    autosave.receive(page());

    autosave.edit({ content: "mine" });
    await vi.advanceTimersByTimeAsync(800);
    gates[0].reject(new Error("the network went away"));
    await vi.advanceTimersByTimeAsync(0);

    expect(autosave.getSnapshot().status).toBe("error");
    expect(autosave.getSnapshot().error).toContain("network");

    await vi.advanceTimersByTimeAsync(30_000);
    expect(calls).toHaveLength(1);

    // …and `flush(true)` — the retry button — is the way out.
    const retry = autosave.flush(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toHaveLength(2);
    gates[1].resolve(page({ content: "mine", revision: 2 }));
    await expect(retry).resolves.toBe(true);
    expect(autosave.getSnapshot().status).toBe("saved");
  });

  it("abandons a reply for a page the operator has already left", async () => {
    // Without the generation counter this is the one that silently corrupts:
    // the first page's response lands and becomes the state of the page now on
    // screen, revision and all.
    const { save, gates } = deferredSaver();
    const autosave = new PageAutosave(save);
    autosave.receive(page({ id: "pg_1", content: "first" }));
    autosave.edit({ content: "first, edited" });
    await vi.advanceTimersByTimeAsync(800);

    autosave.receive(page({ id: "pg_2", title: "Retro", content: "second", revision: 3 }));
    gates[0].resolve(page({ id: "pg_1", content: "first, edited", revision: 2 }));
    await vi.advanceTimersByTimeAsync(0);

    const state = autosave.getSnapshot();
    expect(state.page?.id).toBe("pg_2");
    expect(state.draft?.content).toBe("second");
    expect(state.status).toBe("saved");
  });

  it("never has two saves in flight", async () => {
    const { save, calls, gates } = deferredSaver();
    const autosave = new PageAutosave(save);
    autosave.receive(page());

    autosave.edit({ content: "one" });
    await vi.advanceTimersByTimeAsync(800);
    expect(calls).toHaveLength(1);

    // More typing while the first save is still open.
    autosave.edit({ content: "two" });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(calls).toHaveLength(1);

    gates[0].resolve(page({ content: "one", revision: 2 }));
    await vi.advanceTimersByTimeAsync(800);
    expect(calls).toHaveLength(2);
    // …and the second save carries the revision the first one produced.
    expect(calls[1].patch.expected_revision).toBe(2);
    expect(calls[1].patch.content).toBe("two");
  });

  it("gives up on a hung save after ten seconds and keeps the draft", async () => {
    const { save, gates } = deferredSaver();
    const autosave = new PageAutosave(save);
    autosave.receive(page());

    autosave.edit({ content: "mine" });
    await vi.advanceTimersByTimeAsync(800);
    expect(autosave.getSnapshot().status).toBe("saving");

    await vi.advanceTimersByTimeAsync(10_000);
    expect(autosave.getSnapshot().status).toBe("error");
    expect(autosave.getSnapshot().error).toContain("timed out");
    expect(autosave.getSnapshot().draft?.content).toBe("mine");
    expect(gates).toHaveLength(1);
  });

  it("takes a newer revision quietly when the draft is clean", async () => {
    const { save } = echoSaver();
    const autosave = new PageAutosave(save);
    autosave.receive(page({ revision: 1 }));

    autosave.receive(page({ revision: 2, content: "the operator's edit" }));
    const state = autosave.getSnapshot();
    expect(state.status).toBe("saved");
    expect(state.draft?.content).toBe("the operator's edit");
  });

  it("calls a newer revision a conflict when the draft is dirty, and keeps the draft", async () => {
    const { save } = echoSaver();
    const autosave = new PageAutosave(save);
    autosave.receive(page({ revision: 1 }));
    autosave.edit({ content: "mine, unsaved" });

    autosave.receive(page({ revision: 2, content: "somebody else's" }));
    expect(autosave.getSnapshot().status).toBe("conflict");
    expect(autosave.getSnapshot().draft?.content).toBe("mine, unsaved");

    // `useLatest` is the explicit way out, and the only thing that discards.
    autosave.useLatest();
    const state = autosave.getSnapshot();
    expect(state.status).toBe("saved");
    expect(state.draft?.content).toBe("somebody else's");
    expect(state.page?.revision).toBe(2);
  });

  it("ignores a revision it has already seen", () => {
    const { save } = echoSaver();
    const autosave = new PageAutosave(save);
    autosave.receive(page({ revision: 5, content: "current" }));
    autosave.receive(page({ revision: 5, content: "a replayed frame" }));
    autosave.receive(page({ revision: 4, content: "an out-of-order frame" }));
    expect(autosave.getSnapshot().draft?.content).toBe("current");
  });

  it("refuses an over-long document in the editor rather than as a 400", async () => {
    const { save, calls } = echoSaver();
    const autosave = new PageAutosave(save);
    autosave.receive(page());

    autosave.edit({ content: "x".repeat(100_001) });
    await vi.advanceTimersByTimeAsync(800);
    expect(calls).toHaveLength(0);
    expect(autosave.getSnapshot().status).toBe("error");
    expect(autosave.getSnapshot().error).toContain("still here");
    expect(autosave.getSnapshot().draft?.content).toHaveLength(100_001);

    autosave.edit({ title: "   " });
    await vi.advanceTimersByTimeAsync(800);
    expect(calls).toHaveLength(0);
  });

  it("reports dirty for anything a reload would lose", async () => {
    const { save, gates } = deferredSaver();
    const autosave = new PageAutosave(save);
    autosave.receive(page());
    expect(autosave.dirty).toBe(false);

    autosave.edit({ content: "mine" });
    expect(autosave.dirty).toBe(true);

    // A save in flight is still unsaved.
    await vi.advanceTimersByTimeAsync(800);
    expect(autosave.getSnapshot().status).toBe("saving");
    expect(autosave.dirty).toBe(true);

    gates[0].resolve(page({ content: "mine", revision: 2 }));
    await vi.advanceTimersByTimeAsync(0);
    expect(autosave.dirty).toBe(false);
  });

  it("stops everything on dispose", async () => {
    const { save, calls } = deferredSaver();
    const autosave = new PageAutosave(save);
    autosave.receive(page());
    autosave.edit({ content: "mine" });

    autosave.dispose();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(calls).toHaveLength(0);
  });

  it("tells subscribers about every state change", async () => {
    const { save } = echoSaver();
    const autosave = new PageAutosave(save);
    const seen: string[] = [];
    const unsubscribe = autosave.subscribe(() => seen.push(autosave.getSnapshot().status));

    autosave.receive(page());
    autosave.edit({ content: "mine" });
    await vi.advanceTimersByTimeAsync(800);

    expect(seen).toContain("dirty");
    expect(seen).toContain("saving");
    expect(seen.at(-1)).toBe("saved");

    unsubscribe();
    autosave.edit({ content: "more" });
    const count = seen.length;
    await vi.advanceTimersByTimeAsync(800);
    expect(seen).toHaveLength(count);
  });
});
