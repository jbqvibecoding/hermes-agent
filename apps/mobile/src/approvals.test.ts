/**
 * The one claim about mobile approvals that code can check, plus the grouping.
 *
 * Finding 1 of this round was that the desktop has two decision paths and only
 * one carries the content hash. The whole point of routing the phone through
 * the stronger one is undone by a single forgotten argument, and nothing about
 * the screen would look wrong if it were — the decision would simply be
 * recorded against a card that may have changed. So it is asserted.
 */

import { describe, expect, it, vi } from "vitest";
import { CrewError, type Agent, type ApprovalRequest } from "@hermes/crew-ui/domain";
import { decide, pendingByAgent } from "./approvals";

const approval = (over: Partial<ApprovalRequest> = {}): ApprovalRequest => ({
  id: "7",
  agentId: "scout",
  conversationId: "dm:scout",
  title: "Send the invoice",
  description: "to dana@henley.example",
  scope: ["send_email"],
  status: "pending",
  createdAt: "2026-10-29T08:00:00.000Z",
  contentHash: "abc123",
  ...over,
});

const agent = (id: string, name: string): Agent => ({
  id, name, role: "Teammate", goal: name, status: "idle", avatar: "🤖",
  lastActiveAt: "2026-10-29T08:00:00.000Z", unreadCount: 0, computerId: `crew-${id}`,
});

describe("decide", () => {
  it("always sends the content hash with the decision", async () => {
    // **Finding 1.** Omitting this records consent to whatever the card says
    // now, rather than to what the operator read.
    const respond = vi.fn(async () => undefined);
    const result = await decide(respond, approval(), "allow", "  use finance  ");

    expect(result).toEqual({ ok: true });
    expect(respond).toHaveBeenCalledWith("7", "allow", "use finance", "abc123");
  });

  it("sends no note rather than an empty one", async () => {
    const respond = vi.fn(async () => undefined);
    await decide(respond, approval(), "deny", "   ");
    expect(respond).toHaveBeenCalledWith("7", "deny", undefined, "abc123");
  });

  it("passes the hash through even when the server would tolerate its absence", async () => {
    // The route's docstring says clients without a rendered card may omit it.
    // A phone has one, so it never takes that allowance.
    const respond = vi.fn<
      (id: string, d: "allow" | "deny", note?: string, hash?: string) => Promise<void>
    >(async () => undefined);
    await decide(respond, approval({ contentHash: undefined }), "allow");
    expect(respond).toHaveBeenCalledWith("7", "allow", undefined, undefined);

    respond.mockClear();
    await decide(respond, approval({ contentHash: "deadbeef" }), "allow");
    expect(respond.mock.calls[0]?.[3]).toBe("deadbeef");
  });

  it("reports a refused decision as stale, in the server's own words", async () => {
    // Both "the card changed" and "already decided" arrive as 409. Showing the
    // server's sentence tells them apart for the person; the code treats them
    // the same because the action — re-read the list — is the same.
    for (const message of [
      "This request changed since you opened it. Read the latest version before deciding.",
      "That was already decided.",
    ]) {
      const respond = vi.fn(async () => { throw new CrewError("conflict", message); });
      expect(await decide(respond, approval(), "allow")).toEqual({
        ok: false, stale: true, message,
      });
    }
  });

  it("does not call an ordinary failure stale", async () => {
    // A dropped connection is not consent to anything and must not send the
    // operator off to re-read a card that never changed.
    const respond = vi.fn(async () => { throw new CrewError("network", "offline"); });
    expect(await decide(respond, approval(), "allow")).toEqual({
      ok: false, stale: false, message: "offline",
    });
  });
});

describe("pendingByAgent", () => {
  it("groups pending holds by teammate, oldest first", () => {
    const groups = pendingByAgent(
      [
        approval({ id: "2", createdAt: "2026-10-29T09:00:00.000Z" }),
        approval({ id: "1", createdAt: "2026-10-29T08:00:00.000Z" }),
        approval({ id: "3", agentId: "scribe" }),
      ],
      [agent("scout", "Scout"), agent("scribe", "Scribe")],
    );

    expect(groups.map((g) => g.agentName)).toEqual(["Scout", "Scribe"]);
    // Oldest first: these expire, so the one closest to expiring is the one
    // worth a decision now.
    expect(groups[0]?.items.map((i) => i.id)).toEqual(["1", "2"]);
  });

  it("leaves out anything already decided or expired", () => {
    const groups = pendingByAgent(
      [
        approval({ id: "a", status: "allowed" }),
        approval({ id: "b", status: "denied" }),
        // Nobody decided in time. A button here would record consent the
        // teammate has already stopped waiting for.
        approval({ id: "c", status: "pending", expired: true }),
      ],
      [agent("scout", "Scout")],
    );
    expect(groups).toEqual([]);
  });

  it("still shows holds belonging to a teammate that is gone", () => {
    const groups = pendingByAgent([approval({ agentId: "ghost" })], []);
    expect(groups).toHaveLength(1);
    // The id rather than a blank heading — the hold still needs clearing.
    expect(groups[0]?.agentName).toBe("ghost");
  });
});
