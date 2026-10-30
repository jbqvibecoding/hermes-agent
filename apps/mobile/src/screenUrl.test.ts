import { describe, expect, it } from "vitest";

import { eventsUrlFor, socketUrlFor } from "./connection";
import { readScreenState, screenMessage, screenPageUrl } from "./screenUrl";

const paired = { baseUrl: "http://10.0.0.5:8787/api/plugins/hermes-crew", token: "t0k3n" };

describe("the credential every socket needs", () => {
  it("rides in the query string, because an upgrade cannot carry a header", () => {
    /**
     * The regression this exists for: both of this app's sockets were built
     * with a bare URL and an `Authorization` header, and `new WebSocket(url)`
     * sends no headers at all. The dashboard's gate answers `no_credential`
     * and closes — in loopback mode and gated mode alike — so the events
     * stream has never run against a real server. Found while building the
     * screen socket, which needed the same plumbing.
     */
    expect(eventsUrlFor(paired.baseUrl, { kind: "token", value: paired.token }))
      .toBe("ws://10.0.0.5:8787/api/plugins/hermes-crew/v1/events?token=t0k3n");
  });

  it("turns https into wss, not ws", () => {
    // Anything else is refused outright on an install behind TLS, and the
    // failure looks like "the app cannot connect" rather than like a scheme.
    expect(eventsUrlFor("https://crew.example.com/api/plugins/hermes-crew", {
      kind: "ticket", value: "abc",
    })).toBe("wss://crew.example.com/api/plugins/hermes-crew/v1/events?ticket=abc");
  });

  it("escapes the credential rather than pasting it in", () => {
    const url = socketUrlFor("http://h/api", "/v1/events", { kind: "token", value: "a b&c=d" });

    expect(url).toContain("token=a%20b%26c%3Dd");
    expect(url).not.toContain("&c=d");
  });

  it("keeps a query the path already had", () => {
    expect(socketUrlFor("http://h/api", "/v1/x?a=1", { kind: "token", value: "t" }))
      .toBe("ws://h/api/v1/x?a=1&token=t");
  });
});

describe("the screen page's address", () => {
  it("is an http page, not a socket", () => {
    /**
     * The WebView loads a page the dashboard serves; that page opens the
     * socket itself. Pointing the WebView straight at a `ws://` URL would
     * load nothing at all, and the mistake is easy to make because every
     * other URL in this file is a socket.
     */
    const url = screenPageUrl(paired, "scout");

    expect(url).toBe(
      "http://10.0.0.5:8787/api/plugins/hermes-crew/v1/bots/scout/screen/page?kind=token&auth=t0k3n",
    );
  });

  it("escapes a teammate id rather than trusting it in a path", () => {
    expect(screenPageUrl(paired, "../admin")).toContain("/bots/..%2Fadmin/screen/page");
  });
});

describe("what the page tells the app", () => {
  it("reads the four states it reports", () => {
    expect(readScreenState('{"state":"live"}')).toEqual({ state: "live" });
    expect(readScreenState('{"state":"blank"}')).toEqual({ state: "blank" });
    expect(readScreenState('{"state":"connecting"}')).toEqual({ state: "connecting" });
    expect(readScreenState('{"state":"closed","code":4409,"reason":"x"}'))
      .toEqual({ state: "closed", code: 4409, reason: "x" });
  });

  it("drops anything it does not recognise instead of guessing", () => {
    /**
     * A WebView relays whatever the page posts, and the page is not the only
     * thing that can post. An unrecognised message must leave the UI in its
     * last honest state rather than moving it to a wrong one.
     */
    for (const junk of ["", "not json", "{}", '{"state":"melted"}', '"live"', "null"]) {
      expect(readScreenState(junk)).toBeNull();
    }
    expect(readScreenState(undefined)).toBeNull();
    expect(readScreenState({ state: "live" })).toBeNull();
  });

  it("fills in a missing code rather than rendering undefined", () => {
    expect(readScreenState('{"state":"closed"}')).toEqual({
      state: "closed", code: 0, reason: "",
    });
  });
});

describe("what the person is told", () => {
  it("says nothing at all once the screen is live", () => {
    // The screen is the message. A banner over a working view is clutter.
    expect(screenMessage({ state: "live" })).toBeNull();
  });

  it("separates the close reasons that need different actions", () => {
    const stale = screenMessage({ state: "closed", code: 4404, reason: "" });
    const noScreen = screenMessage({ state: "closed", code: 4409, reason: "" });
    const unauthorised = screenMessage({ state: "closed", code: 4401, reason: "" });

    // Three different things to do about it: re-list, wait, re-pair. One
    // "could not connect" for all three sends somebody looking in the wrong
    // place — which is the whole reason the proxy spends distinct codes.
    expect(new Set([stale, noScreen, unauthorised]).size).toBe(3);
    expect(noScreen).toMatch(/no screen/i);
    expect(unauthorised).toMatch(/pair/i);
  });

  it("distinguishes connected-but-black from not connected", () => {
    /**
     * x11vnc serves a display Chromium has not painted to yet, so "black" is
     * this image's most likely failure and is not a network problem. Telling
     * somebody to check their connection would send them after the wrong
     * thing entirely.
     */
    const blank = screenMessage({ state: "blank" });

    // It should say the connection *worked* and point at the drawing, not
    // send somebody to check their network.
    expect(blank).toMatch(/connected/i);
    expect(blank).toMatch(/drawn|drawing/i);
    expect(blank).not.toBe(screenMessage({ state: "closed", code: 4502, reason: "" }));
  });
});
