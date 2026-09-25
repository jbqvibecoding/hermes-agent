/**
 * Marking the names in a message that were actually addresses.
 *
 * The backend resolves mentions once, when the message is written, and stores
 * the answer (`crew/mentions.py`). This does **not** redo that work: the
 * regex below only finds *where* in the string a name was typed, and whether
 * that span is an address is decided by looking it up in the `mentions` list
 * the server already resolved.
 *
 * That split is the point. A client that decided for itself would be a second
 * parser, and the day the two disagree — one folds a hyphen, the other does
 * not — a message is highlighted for a teammate who was never asked, or the
 * one who was asked is not highlighted at all. Either way the highlight stops
 * meaning anything, which is worse than not having it.
 */

import type { Agent } from "./types";

/** Matches `mentions.py::_MENTION` — the same lookbehind keeps emails out. */
const MENTION = /(?<![\w.-])@([\w一-鿿][\w一-鿿-]{0,63})/g;

/** Matches `mentions.py::_key`: case and separators folded. */
function fold(value: string): string {
  return value.replace(/[\s_-]+/g, "").trim().toLowerCase();
}

export interface MentionSpan {
  text: string;
  /** The teammate this span addresses, or `undefined` for ordinary text. */
  agentId?: string;
}

/**
 * Split a message into runs of plain text and runs that are addresses.
 *
 * `addressed` is the server's answer. An `@name` that is not in it — a typo, a
 * teammate who is not in this room, a name in a code block the server stripped
 * — comes back as plain text, because it did not address anybody and marking
 * it would say that it did.
 */
export function splitMentions(
  text: string, addressed: string[] | undefined, agents: Agent[],
): MentionSpan[] {
  if (!addressed?.length || !text) return [{ text }];

  const byKey = new Map<string, string>();
  // Ids before names, for the reason the server does the same: one teammate's
  // display name must not take a key that is somebody else's id.
  for (const id of addressed) if (!byKey.has(fold(id))) byKey.set(fold(id), id);
  for (const agent of agents) {
    if (!addressed.includes(agent.id)) continue;
    if (!byKey.has(fold(agent.name))) byKey.set(fold(agent.name), agent.id);
  }

  const spans: MentionSpan[] = [];
  let cursor = 0;
  for (const match of text.matchAll(MENTION)) {
    const agentId = byKey.get(fold(match[1]));
    if (!agentId || match.index === undefined) continue;
    if (match.index > cursor) spans.push({ text: text.slice(cursor, match.index) });
    spans.push({ text: match[0], agentId });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) spans.push({ text: text.slice(cursor) });
  return spans.length ? spans : [{ text }];
}
