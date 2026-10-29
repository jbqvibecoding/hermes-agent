/**
 * The tokeniser, which is where a hand-rolled renderer goes wrong.
 *
 * The cases that matter are not "does bold work" but the ones where a renderer
 * is tempted to throw something away: an unclosed fence mid-stream, a construct
 * it does not handle, an unterminated marker. Every one of those has to come
 * out the other side as the characters the teammate typed.
 */

import { describe, expect, it } from "vitest";
import { parseMarkdown, parseSpans } from "./markdown";

describe("blocks", () => {
  it("keeps a fenced block verbatim, with its language", () => {
    const [block] = parseMarkdown("before\n\n```python\ndef f():\n    return 1\n```\n\nafter");
    expect(parseMarkdown("```py\nx\n```")[0]).toMatchObject({ kind: "code", lang: "py" });
    expect(block).toMatchObject({ kind: "paragraph" });

    const blocks = parseMarkdown("```python\ndef f():\n    return 1\n```");
    expect(blocks).toEqual([
      // Indentation preserved exactly — re-wrapping or trimming code is the
      // one thing a code block must never do.
      { kind: "code", lang: "python", text: "def f():\n    return 1" },
    ]);
  });

  it("treats a fence with no language as a fence", () => {
    expect(parseMarkdown("```\nplain\n```")).toEqual([
      { kind: "code", lang: "", text: "plain" },
    ]);
  });

  it("keeps an unclosed fence as code to the end", () => {
    // What a streaming message looks like while it is still arriving. Falling
    // back to prose here would reflow the code and then snap it back when the
    // closing fence lands.
    expect(parseMarkdown("```ts\nconst a = 1;\nconst b = 2;")).toEqual([
      { kind: "code", lang: "ts", text: "const a = 1;\nconst b = 2;" },
    ]);
  });

  it("does not parse spans inside code", () => {
    const [block] = parseMarkdown("```\n**not bold** and `not code`\n```");
    expect(block).toEqual({
      kind: "code", lang: "", text: "**not bold** and `not code`",
    });
  });

  it("reflows a hard-wrapped paragraph but keeps bullets apart", () => {
    expect(parseMarkdown("one\ntwo")).toEqual([
      // The model's column width is not the phone's.
      { kind: "paragraph", spans: [{ text: "one two" }] },
    ]);
    const bullets = parseMarkdown("- first\n- second\n* third\n+ fourth");
    expect(bullets).toHaveLength(4);
    expect(bullets.every((b) => b.kind === "bullet")).toBe(true);
  });

  it("separates paragraphs on a blank line and drops no text", () => {
    const blocks = parseMarkdown("one\n\ntwo");
    expect(blocks).toEqual([
      { kind: "paragraph", spans: [{ text: "one" }] },
      { kind: "paragraph", spans: [{ text: "two" }] },
    ]);
  });

  it("returns nothing for nothing, rather than an empty paragraph", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("\n\n  \n")).toEqual([]);
  });
});

describe("what is not supported survives as literal text", () => {
  it("renders a table as its own characters", () => {
    // **The rule that matters.** We do not render tables this round. Showing
    // the pipes is ugly; silently eating the row is a lie about what the
    // teammate said.
    const blocks = parseMarkdown("| a | b |\n| - | - |\n| 1 | 2 |");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ kind: "paragraph" });
    const text = (blocks[0] as { spans: { text: string }[] }).spans
      .map((s) => s.text).join("");
    expect(text).toContain("| a | b |");
    expect(text).toContain("| 1 | 2 |");
  });

  it("keeps headings, links and quotes as text rather than dropping them", () => {
    for (const source of ["## A heading", "[a link](http://x)", "> quoted"]) {
      const blocks = parseMarkdown(source);
      expect(blocks).toHaveLength(1);
      const text = (blocks[0] as { spans: { text: string }[] }).spans
        .map((s) => s.text).join("");
      expect(text).toBe(source);
    }
  });
});

describe("spans", () => {
  it("reads bold and inline code", () => {
    expect(parseSpans("a **b** c `d` e")).toEqual([
      { text: "a " }, { text: "b", bold: true }, { text: " c " },
      { text: "d", code: true }, { text: " e" },
    ]);
  });

  it("gives the run to whichever marker opens first, both ways round", () => {
    // Both directions, because either one alone passes with the two checks in
    // either order — which is exactly what a mutation proved about the version
    // of this test that only asserted the first line.
    expect(parseSpans("`**x**`")).toEqual([{ text: "**x**", code: true }]);
    expect(parseSpans("**a `b` c**")).toEqual([{ text: "a `b` c", bold: true }]);
  });

  it("leaves an unterminated marker as text", () => {
    expect(parseSpans("**oops")).toEqual([{ text: "**oops" }]);
    expect(parseSpans("a `b")).toEqual([{ text: "a `b" }]);
  });

  it("never returns an empty list, so a renderer has something to map", () => {
    expect(parseSpans("")).toEqual([{ text: "" }]);
  });
});
