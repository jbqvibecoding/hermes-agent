/**
 * Just enough markdown for a teammate's message on a phone.
 *
 * The web renders these with `streamdown`, which is DOM-bound. Rather than take
 * a third-party React Native renderer — a dependency whose maintenance we do
 * not control, for a subset we can cover here — this is a tokeniser for the
 * constructs that actually change whether a message is readable: fenced code,
 * bullet lists, bold, inline code.
 *
 * **The rule that matters is what happens to everything else: it survives as
 * its own literal text.** A renderer that silently eats a table is worse than
 * one that shows the pipes, because the second is ugly and the first is a lie
 * about what the teammate said. So there is no "unknown" token and nothing is
 * ever dropped — unrecognised lines are paragraphs containing exactly their
 * own characters.
 *
 * No React Native import on purpose: this file is where the bugs will be, and
 * keeping it pure means they can be found on a laptop. `Markdown.tsx` is the
 * thin part.
 */

/** A run of text inside a block. `code` is inline backticks, not a fence. */
export interface Span {
  text: string;
  bold?: boolean;
  code?: boolean;
}

export type Block =
  /** Ordinary prose, or any line we do not recognise. */
  | { kind: "paragraph"; spans: Span[] }
  /** A fenced block. `text` is verbatim — never re-wrapped, never span-parsed. */
  | { kind: "code"; text: string; lang: string }
  | { kind: "bullet"; spans: Span[] };

const FENCE = /^\s*```(.*)$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;

/**
 * Inline bold and code, left to right, one pass.
 *
 * **Whichever marker opens first wins, and they do not nest.** So
 * ``**a `b` c**`` is one bold run whose backticks stay literal, while
 * ``` `**x**` ``` is one code run whose asterisks stay literal. There is no
 * precedence rule between the two — a position is either a backtick or an
 * asterisk — and the order of the two checks below is therefore not load
 * bearing. (Said precisely because the comment here used to claim backticks
 * won over asterisks, which is only ever true when the backtick happens to be
 * first; a mutation that swapped the checks changed no behaviour and passed
 * every test, which is how the wrong claim was found.)
 *
 * Nesting properly is where a hand-rolled parser turns into a liability, and
 * nobody reading a phone notices.
 *
 * An unterminated marker is text. `**oops` is two asterisks and a word, which
 * is what the teammate typed.
 */
export function parseSpans(line: string): Span[] {
  const spans: Span[] = [];
  let rest = line;
  let plain = "";

  const flush = () => {
    if (plain) {
      spans.push({ text: plain });
      plain = "";
    }
  };

  while (rest.length > 0) {
    // Inline code first: backticks win over asterisks, so `**` inside a code
    // span stays literal, which is how every markdown renderer behaves.
    if (rest.startsWith("`")) {
      const end = rest.indexOf("`", 1);
      if (end > 0) {
        flush();
        spans.push({ text: rest.slice(1, end), code: true });
        rest = rest.slice(end + 1);
        continue;
      }
    }
    if (rest.startsWith("**")) {
      const end = rest.indexOf("**", 2);
      if (end > 1) {
        flush();
        spans.push({ text: rest.slice(2, end), bold: true });
        rest = rest.slice(end + 2);
        continue;
      }
    }
    plain += rest[0];
    rest = rest.slice(1);
  }

  flush();
  return spans.length > 0 ? spans : [{ text: "" }];
}

/**
 * A message into blocks.
 *
 * Blank lines separate paragraphs; consecutive prose lines join with a space,
 * because a hard-wrapped paragraph from a model should reflow on a narrow
 * screen rather than break where the model's column did.
 */
export function parseMarkdown(source: string): Block[] {
  const lines = (source ?? "").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ kind: "paragraph", spans: parseSpans(paragraph.join(" ")) });
      paragraph = [];
    }
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    const fence = FENCE.exec(line);

    if (fence) {
      flushParagraph();
      const lang = (fence[1] ?? "").trim();
      const body: string[] = [];
      let closed = false;
      i += 1;
      for (; i < lines.length; i += 1) {
        if (FENCE.test(lines[i] ?? "")) {
          closed = true;
          break;
        }
        body.push(lines[i] ?? "");
      }
      // An unclosed fence is still a code block to the end of the message.
      // Streaming output is unclosed for as long as it is still arriving, and
      // falling back to prose would reflow the code mid-stream and then snap it
      // back when the closing fence lands.
      void closed;
      blocks.push({ kind: "code", text: body.join("\n"), lang });
      continue;
    }

    const bullet = BULLET.exec(line);
    if (bullet) {
      flushParagraph();
      blocks.push({ kind: "bullet", spans: parseSpans(bullet[1] ?? "") });
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}
