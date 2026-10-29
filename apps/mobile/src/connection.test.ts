/**
 * The connect screen's logic, which is the only part of milestone one that can
 * be checked without a device.
 *
 * It is also the part most worth checking. Every branch here is a different
 * thing the operator has to go and fix, and the failure mode this file guards
 * is the one that makes self-hosted software feel broken: collapsing five
 * distinct problems into "could not connect".
 */

import { describe, expect, it, vi } from "vitest";
import { checkReachable, eventsUrlFor, normalizeBaseUrl } from "./connection";

const ok = (body: unknown = { agents: [] }) =>
  new Response(JSON.stringify(body), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
const status = (code: number) => new Response("", { status: code });

describe("normalizeBaseUrl", () => {
  it("accepts what a person actually types", () => {
    // What is printed in the terminal, which is what they will type.
    expect(normalizeBaseUrl("10.0.0.5:8787")).toBe(
      "http://10.0.0.5:8787/api/plugins/hermes-crew",
    );
  });

  it("accepts a full URL, a trailing slash, and the plugin path already on it", () => {
    const want = "http://10.0.0.5:8787/api/plugins/hermes-crew";
    expect(normalizeBaseUrl("http://10.0.0.5:8787")).toBe(want);
    expect(normalizeBaseUrl("http://10.0.0.5:8787/")).toBe(want);
    expect(normalizeBaseUrl("10.0.0.5:8787/api/plugins/hermes-crew")).toBe(want);
    // Idempotent, because people paste what they already have.
    expect(normalizeBaseUrl(want)).toBe(want);
  });

  it("keeps https rather than downgrading it", () => {
    expect(normalizeBaseUrl("https://crew.example.com")).toBe(
      "https://crew.example.com/api/plugins/hermes-crew",
    );
  });

  it("refuses what is not an address", () => {
    for (const typed of ["", "   ", "http://", "not a host at all"]) {
      expect(normalizeBaseUrl(typed)).toBeNull();
    }
  });
});

describe("eventsUrlFor", () => {
  it("maps http to ws and https to wss", () => {
    expect(eventsUrlFor("http://10.0.0.5:8787/api/plugins/hermes-crew"))
      .toBe("ws://10.0.0.5:8787/api/plugins/hermes-crew/v1/events");
    // The one that matters: `ws` against a TLS origin is refused outright, so
    // a half-done substitution here breaks every hosted install.
    expect(eventsUrlFor("https://crew.example.com/api/plugins/hermes-crew"))
      .toBe("wss://crew.example.com/api/plugins/hermes-crew/v1/events");
  });
});

describe("checkReachable names the thing to fix", () => {
  it("passes, and reports the normalized base url to store", async () => {
    const result = await checkReachable("10.0.0.5:8787", "tok", async () => ok());
    expect(result).toEqual({
      ok: true, baseUrl: "http://10.0.0.5:8787/api/plugins/hermes-crew",
    });
  });

  it("sends the token the same way the rest of the session will", async () => {
    // A check that passes while the real calls 401 would be worse than none,
    // so it uses the same header on the same endpoint.
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toContain("/v1/agents");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
      return ok();
    });
    await checkReachable("10.0.0.5:8787", "tok", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("calls a bad address a bad address, without asking the network", async () => {
    const fetchImpl = vi.fn();
    const result = await checkReachable("", "tok", fetchImpl);
    expect(result).toMatchObject({ ok: false, kind: "no-host" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("points at the loopback bind when nothing answers", async () => {
    const result = await checkReachable("10.0.0.5:8787", "tok", async () => {
      throw new TypeError("Network request failed");
    });
    expect(result).toMatchObject({ ok: false, kind: "unreachable" });
    // The actual cause nine times out of ten, and unguessable otherwise.
    expect((result as { detail: string }).detail).toContain("--host 0.0.0.0");
  });

  it("separates a refused token from an unreachable host", async () => {
    for (const code of [401, 403]) {
      const result = await checkReachable("10.0.0.5:8787", "bad", async () => status(code));
      expect(result).toMatchObject({ ok: false, kind: "unauthorized" });
      expect((result as { detail: string }).detail).toContain("HERMES_DASHBOARD_SESSION_TOKEN");
    }
  });

  it("separates a server that is not Crew from one that is unwell", async () => {
    expect(await checkReachable("h:1", "t", async () => status(404)))
      .toMatchObject({ ok: false, kind: "no-crew" });
    expect(await checkReachable("h:1", "t", async () => status(502)))
      .toMatchObject({ ok: false, kind: "server-error" });
  });

  it("refuses a 200 that is not the Crew plugin", async () => {
    // A proxy login page, or another app on that port. Reporting "connected"
    // here strands the operator on an empty roster with no reason given, which
    // is the exact failure this whole module exists to prevent.
    expect(await checkReachable("h:1", "t", async () => ok({ hello: "world" })))
      .toMatchObject({ ok: false, kind: "no-crew" });
    expect(await checkReachable("h:1", "t", async () =>
      new Response("<html>login</html>", { status: 200 })))
      .toMatchObject({ ok: false, kind: "no-crew" });
  });

  it("gives up rather than hanging forever", async () => {
    const result = await checkReachable(
      "10.0.0.5:8787", "tok",
      (_url, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
      10,
    );
    expect(result).toMatchObject({ ok: false, kind: "unreachable" });
  });
});
