/**
 * The suggestions have to fit the teammate they are shown under.
 *
 * The point of the empty state is discovery: somebody who has never asked for
 * a routine learns that they can. A suggestion aimed at the wrong job teaches
 * the opposite — that these cards are decoration — so the first thing worth
 * pinning is that a role reaches its own examples and that no role falls off
 * the end into nothing.
 */

import { describe, expect, it } from "vitest";
import { routineExamples } from "./routineExamples";

describe("routineExamples", () => {
  it.each([
    ["Customer support lead", /ticket queue/],
    ["Sales ops", /deals/],
    ["Competitive research", /competitors/],
    ["Backend engineer", /builds/],
    ["Content writer", /newsletter/],
    ["Bookkeeping", /invoices/],
  ])("matches %s to its own kind of work", (role, expected) => {
    expect(routineExamples(role).join(" ")).toMatch(expected);
  });

  it("falls back to something true of any job rather than to nothing", () => {
    // An empty list would render the heading with nothing under it, which
    // reads as broken rather than as "no suggestions for this one".
    expect(routineExamples("Chief of staff").length).toBeGreaterThan(0);
    expect(routineExamples("").length).toBeGreaterThan(0);
  });

  it("offers two, not a menu to work through", () => {
    for (const role of ["Support", "", "Sales", "something nobody has"]) {
      expect(routineExamples(role)).toHaveLength(2);
    }
  });

  it("ignores case, because a role is free text somebody typed", () => {
    expect(routineExamples("SUPPORT")).toEqual(routineExamples("support"));
  });

  it("phrases each one as an instruction with a schedule in it", () => {
    // Both halves matter: the teammate turns this into a cron job, and a
    // suggestion with no "when" in it produces a routine the model has to
    // invent a schedule for.
    for (const example of routineExamples("Support")) {
      expect(example).toMatch(/\b(every|each|on the)\b/i);
      expect(example.trim()).toMatch(/[.?]$/);
    }
  });
});
