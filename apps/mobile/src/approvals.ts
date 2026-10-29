/**
 * Answering a held action from a phone, which is the reason this app exists.
 *
 * The decision path is here rather than in the screen because one claim about
 * it is worth a test: **the content hash always goes back with the decision.**
 *
 * That hash is, in the type's own words, "the fingerprint of the card as
 * rendered… a mismatch is refused — approving something other than what you
 * read is the one failure the hold exists to prevent". The desktop has two ways
 * to decide and only one sends it: `DetailPanel`'s card does,
 * `ApprovalChip.onDecide(id, decision)` does not. A phone is the *weaker*
 * context — away from the desk, less around you, more likely to be a glance —
 * so it takes the stronger path, and the in-thread chip only navigates here.
 *
 * Two decisions, not three. The desk offers Discard and Approve plus an
 * optional note, and nothing in this product has ever had an "always allow".
 * Inventing one for the phone would make the weaker context the more
 * permissive one, which is the opposite of the argument above.
 */

import type { ApprovalRequest, Agent } from "@hermes/crew-ui/domain";
import { CrewError } from "@hermes/crew-ui/domain";

export interface PendingGroup {
  agentId: string;
  agentName: string;
  items: ApprovalRequest[];
}

/**
 * Pending holds, by teammate, oldest first.
 *
 * Oldest first on purpose: these expire, and the one closest to expiring is
 * the one worth a decision now. A newest-first list buries it.
 */
export function pendingByAgent(
  approvals: readonly ApprovalRequest[],
  agents: readonly Agent[],
): PendingGroup[] {
  const names = new Map(agents.map((agent) => [agent.id, agent.name]));
  const groups = new Map<string, ApprovalRequest[]>();

  for (const approval of approvals) {
    // `expired` is not `pending` even when status says so — nobody decided in
    // time, and offering a button would record consent the teammate already
    // stopped waiting for.
    if (approval.status !== "pending" || approval.expired) continue;
    const list = groups.get(approval.agentId);
    if (list) list.push(approval);
    else groups.set(approval.agentId, [approval]);
  }

  return [...groups.entries()]
    .map(([agentId, items]) => ({
      agentId,
      // A teammate deleted since the hold was taken still has holds to clear,
      // so the id is a readable fallback rather than a blank heading.
      agentName: names.get(agentId) ?? agentId,
      items: [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }))
    .sort((a, b) => a.agentName.localeCompare(b.agentName));
}

export type DecisionOutcome =
  | { ok: true }
  /**
   * The server would not record this decision. `stale` carries the server's own
   * sentence rather than one of ours.
   *
   * Both "the card changed since you read it" and "that was already decided"
   * come back as 409 → `CrewError("conflict")`, distinguishable only by the
   * message. The message is shown verbatim and the list is re-read either way,
   * because the required action is identical — which is better than matching
   * the server's prose to tell them apart and breaking when it is reworded.
   */
  | { ok: false; stale: boolean; message: string };

type Responder = (
  requestId: string,
  decision: "allow" | "deny",
  note?: string,
  contentHash?: string,
) => Promise<unknown>;

export async function decide(
  respond: Responder,
  approval: ApprovalRequest,
  decision: "allow" | "deny",
  note?: string,
): Promise<DecisionOutcome> {
  const trimmed = (note ?? "").trim();
  try {
    await respond(
      approval.id,
      decision,
      trimmed || undefined,
      // The whole point. Never omitted, even though the server tolerates
      // clients that have no rendered card to stake.
      approval.contentHash,
    );
    return { ok: true };
  } catch (reason) {
    if (reason instanceof CrewError && reason.code === "conflict") {
      return { ok: false, stale: true, message: reason.message };
    }
    return {
      ok: false,
      stale: false,
      message: reason instanceof Error ? reason.message : "That did not go through.",
    };
  }
}
