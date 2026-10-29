// @vitest-environment node
/**
 * The portable half really is portable.
 *
 * `@hermes/crew-ui` is about to be imported by a React Native app, where there
 * is no `window`, no `document` and no DOM at all. The claim this file defends
 * is that `client/`, `domain/` and `state/` can be imported and *used* in that
 * environment — and it defends it by actually being in that environment:
 * `@vitest-environment node` means no jsdom, so a stray `document.` reference
 * throws here exactly as it would on a phone.
 *
 * A lint rule banning `document` would be the cheap version of this and would
 * not catch the two real cases below: a DOM reference reached through
 * `globalThis`, and a default value that only blows up once a timer fires.
 */

import { describe, expect, it, vi } from "vitest";

describe("the shared modules under React Native's conditions", () => {
  it("has no DOM to fall back on, which is the point of this file", () => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");
  });

  it("imports the domain, client and state subpaths without touching the DOM", async () => {
    // The subpaths, not the barrel: `src/index.ts` pulls in every `<div>`
    // component and must never be reachable from React Native.
    const domain = await import("../domain/index");
    const state = await import("./index");
    const { HermesCrewClient, defaultEventsUrl } = await import("../client/HermesCrewClient");

    expect(typeof domain.splitMentions).toBe("function");
    expect(typeof state.PageAutosave).toBe("function");
    expect(typeof HermesCrewClient).toBe("function");
    expect(typeof defaultEventsUrl).toBe("function");
  });

  it("builds a websocket url with no `location` to read it from", async () => {
    const { defaultEventsUrl } = await import("../client/HermesCrewClient");
    // `globalThis.location` is undefined here. Without the fallback this throws
    // `Invalid URL`, at construction time, on every phone.
    expect(defaultEventsUrl("/api/plugins/hermes-crew")).toBe(
      "ws://127.0.0.1/api/plugins/hermes-crew/v1/events",
    );
  });

  it("makes a real request through an injected fetch, with the token header", async () => {
    const { HermesCrewClient } = await import("../client/HermesCrewClient");
    const seen: { url: string; headers: Record<string, string> }[] = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      seen.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
      return new Response(JSON.stringify({ agents: [] }), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    });

    const client = new HermesCrewClient({
      baseUrl: "http://10.0.0.5:8787/api/plugins/hermes-crew",
      fetchImpl,
      // Exactly how the phone will authenticate: the seam that already exists
      // because the desktop app uses it.
      headers: () => ({ Authorization: "Bearer test-token" }),
    });

    await client.listAgents();
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(seen[0].url).toContain("10.0.0.5:8787");
    expect(seen[0].headers.Authorization).toBe("Bearer test-token");
  });

  it("runs the Spaces autosave logic, which is the part worth not rewriting", async () => {
    const { PageAutosave } = await import("./pageAutosave");
    const saved: { id: string; content?: string; expected: number }[] = [];
    const autosave = new PageAutosave(async (id, patch) => {
      saved.push({ id, content: patch.content, expected: patch.expected_revision });
      return {
        id, space_id: "s1", title: patch.title ?? "Q3",
        content: patch.content ?? "", parent_id: null,
        revision: patch.expected_revision + 1,
      } as never;
    });

    autosave.receive({
      id: "p1", space_id: "s1", title: "Q3", content: "draft",
      parent_id: null, revision: 1,
    } as never);
    autosave.edit({ content: "draft two" });
    await autosave.flush();

    // The load-bearing part on a phone as much as a desktop: the save carries
    // the revision it was based on, which is what makes the 409 path possible.
    expect(saved.at(-1)?.content).toBe("draft two");
    expect(saved.at(-1)?.expected).toBe(1);
    autosave.dispose();
  });
});

describe("the platform bridge fallback", () => {
  it("degrades to always-active rather than dying on `document`", async () => {
    const { detectPlatform, alwaysActivePlatform } = await import("./platform");
    // The net described in platform.ts: an RN caller that forgets to pass a
    // bridge must get interval-only refresh, not a crash thirty seconds in.
    expect(detectPlatform()).toBe(alwaysActivePlatform);
    expect(detectPlatform().isActive()).toBe(true);
    expect(detectPlatform().isOnline()).toBe(true);
    expect(() => detectPlatform().subscribe(() => undefined)()).not.toThrow();
  });

  it("still refuses to pretend `webPlatform` works here", async () => {
    const { webPlatform } = await import("./platform");
    // Importing it is safe — the DOM is only touched when called — and calling
    // it is not. That asymmetry is what lets one module serve both platforms.
    expect(() => webPlatform.isActive()).toThrow();
  });
});
