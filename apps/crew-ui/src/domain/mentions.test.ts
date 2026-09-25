/**
 * The client marks addresses; it does not decide them.
 *
 * The server resolves mentions once at write time and sends the answer. What
 * is pinned here is that this code takes that answer as given — a name it
 * would have matched but the server did not send comes back as ordinary text.
 * Anything else makes this a second parser, and two parsers that disagree
 * highlight a name for a teammate who was never asked.
 */

import { describe, expect, it } from "vitest";
import { splitMentions } from "./mentions";
import type { Agent } from "./types";

const agent = (id: string, name: string) => ({ id, name } as Agent);
const ROOM = [agent("ada", "Ada Chen"), agent("scout", "Scout")];

const marked = (spans: ReturnType<typeof splitMentions>) =>
  spans.filter((s) => s.agentId).map((s) => [s.text, s.agentId]);

describe("splitMentions", () => {
  it("marks the name that was addressed", () => {
    const spans = splitMentions("@scout can you look?", ["scout"], ROOM);
    expect(marked(spans)).toEqual([["@scout", "scout"]]);
    expect(spans.map((s) => s.text).join("")).toBe("@scout can you look?");
  });

  it("keeps the message reassemblable", () => {
    const text = "hey @scout and @ada — both of you";
    const spans = splitMentions(text, ["scout", "ada"], ROOM);
    expect(spans.map((s) => s.text).join("")).toBe(text);
    expect(marked(spans)).toEqual([["@scout", "scout"], ["@ada", "ada"]]);
  });

  it("matches a display name the way the server folded it", () => {
    expect(marked(splitMentions("@Ada-Chen hi", ["ada"], ROOM))).toEqual([["@Ada-Chen", "ada"]]);
    expect(marked(splitMentions("@ADA hi", ["ada"], ROOM))).toEqual([["@ADA", "ada"]]);
  });

  it("leaves a name the server did not resolve as plain text", () => {
    // The server stripped this one — it was inside a code fence — so the
    // message addressed nobody and nothing here should say otherwise.
    const spans = splitMentions("```\n@scout\n```", undefined, ROOM);
    expect(marked(spans)).toEqual([]);
  });

  it("marks only the teammates the server named", () => {
    // `@ada` resolves locally but was not in the server's list: it was typed
    // inside backticks, or it is a stale client. Trusting the local match is
    // exactly the drift this split exists to prevent.
    const spans = splitMentions("@scout and `@ada`", ["scout"], ROOM);
    expect(marked(spans)).toEqual([["@scout", "scout"]]);
  });

  it("does not mark an email address", () => {
    expect(marked(splitMentions("mail sam@example.com", ["scout"], ROOM))).toEqual([]);
  });

  it("returns the whole message unmarked when nothing was addressed", () => {
    expect(splitMentions("where are we?", [], ROOM)).toEqual([{ text: "where are we?" }]);
  });

  it("survives an empty message", () => {
    expect(splitMentions("", ["scout"], ROOM)).toEqual([{ text: "" }]);
  });
});
