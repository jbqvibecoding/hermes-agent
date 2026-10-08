/**
 * The behaviour this panel exists to get right is the moment two people are
 * writing in one document. So these tests are mostly about what the editor
 * does *not* do: it does not merge, it does not retry, and it does not discard
 * the draft. `pageAutosave.test.ts` covers the state machine underneath; this
 * covers what an operator can see and reach.
 */

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CloudAgentsClient } from "../domain/CloudAgentsClient";
import type { Agent, Page, PageSummary, Space } from "../domain/types";
import { SpacesPanel } from "./SpacesPanel";

const ISO = new Date(0).toISOString();

const agent = (id: string, name: string): Agent => ({
  id, name, role: "Teammate", goal: name, status: "idle", avatar: "🤖",
  lastActiveAt: ISO, unreadCount: 0, computerId: `crew-${id}`,
});

const page = (over: Partial<Page> = {}): Page => ({
  id: "pg_1", space_id: "q3", parent_id: null, title: "Launch plan",
  content: "Ship on the 14th.", revision: 1, created_at: 0, updated_at: 0,
  created_by: "", ...over,
});

const summary = (over: Partial<PageSummary> = {}): PageSummary => {
  const { content: _content, ...rest } = page(over as Partial<Page>);
  return rest;
};

const space = (over: Partial<Space> = {}): Space => ({
  id: "q3", name: "Q3 Launch", created_at: 0, bot_ids: ["scout"], ...over,
});

function stubClient(overrides: Partial<CloudAgentsClient> = {}): CloudAgentsClient {
  const unused = () => { throw new Error("not used by SpacesPanel"); };
  return {
    listSpaces: async () => [space()],
    listPages: async () => [summary()],
    getPage: async () => page(),
    createSpace: unused,
    createPage: unused,
    patchPage: unused,
    deletePage: unused,
    deleteSpace: unused,
    setSpaceMember: async () => undefined,
    ...overrides,
    // Only the Spaces half of the interface is stubbed; the cast covers the
    // rest. A panel that started calling `listAgents` would fail here loudly,
    // which is the point — it takes its roster as a prop on purpose.
  } as unknown as CloudAgentsClient;
}

describe("SpacesPanel", () => {
  it("opens a page and shows its revision", async () => {
    render(<SpacesPanel client={stubClient()} agents={[agent("scout", "Scout")]} />);
    await userEvent.click(await screen.findByRole("button", { name: "Launch plan" }));

    expect(await screen.findByLabelText("Page content")).toHaveValue("Ship on the 14th.");
    expect(screen.getByLabelText("Page title")).toHaveValue("Launch plan");
    expect(screen.getByText("Revision 1")).toBeInTheDocument();
  });

  it("saves against the revision it read", async () => {
    const patchPage = vi.fn(async () => page({ content: "Ship on the 21st.", revision: 2 }));
    render(
      <SpacesPanel client={stubClient({ patchPage })} agents={[agent("scout", "Scout")]} />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Launch plan" }));
    const body = await screen.findByLabelText("Page content");

    await userEvent.clear(body);
    await userEvent.type(body, "Ship on the 21st.");
    await waitFor(() => expect(patchPage).toHaveBeenCalled(), { timeout: 3000 });

    const [, , patch] = patchPage.mock.calls[0] as unknown as [string, string, { expected_revision: number }];
    expect(patch.expected_revision).toBe(1);
    await screen.findByText("Saved");
  });

  it("offers a conflict as two choices and resolves neither of them for you", async () => {
    // **The case the whole surface is built around.** A save is refused; the
    // draft must still be in the box, nothing may be written, and the only
    // ways forward are the operator's.
    const patchPage = vi.fn(async () => {
      throw Object.assign(new Error("This page has moved on."), { kind: "conflict" });
    });
    render(
      <SpacesPanel client={stubClient({ patchPage })} agents={[agent("scout", "Scout")]} />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Launch plan" }));
    const body = await screen.findByLabelText("Page content");

    await userEvent.clear(body);
    await userEvent.type(body, "my paragraph");

    const banner = await screen.findByRole("alert", {}, { timeout: 3000 });
    expect(within(banner).getByRole("button", { name: /copy my draft/i })).toBeInTheDocument();
    expect(within(banner).getByRole("button", { name: /load the latest/i })).toBeInTheDocument();
    expect(body).toHaveValue("my paragraph");

    // Typing on does not start it saving again, and neither does waiting.
    const callsSoFar = patchPage.mock.calls.length;
    await userEvent.type(body, " and more");
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(patchPage.mock.calls).toHaveLength(callsSoFar);
    expect(body).toHaveValue("my paragraph and more");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("offers a retry after a plain failure, and does not retry on its own", async () => {
    const patchPage = vi.fn(async () => { throw new Error("the network went away"); });
    render(
      <SpacesPanel client={stubClient({ patchPage })} agents={[agent("scout", "Scout")]} />,
    );
    await userEvent.click(await screen.findByRole("button", { name: "Launch plan" }));
    const body = await screen.findByLabelText("Page content");
    await userEvent.type(body, "!");

    const banner = await screen.findByRole("alert", {}, { timeout: 3000 });
    expect(within(banner).getByText(/network went away/)).toBeInTheDocument();

    const callsSoFar = patchPage.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(patchPage.mock.calls).toHaveLength(callsSoFar);

    await userEvent.click(within(banner).getByRole("button", { name: /try again/i }));
    expect(patchPage.mock.calls.length).toBeGreaterThan(callsSoFar);
  });

  it("nests a sub-page under its parent", async () => {
    const pages = [
      summary({ id: "pg_1", title: "Launch" }),
      summary({ id: "pg_2", title: "Risks", parent_id: "pg_1" }),
    ];
    render(
      <SpacesPanel client={stubClient({ listPages: async () => pages })}
                   agents={[agent("scout", "Scout")]} />,
    );
    const child = await screen.findByRole("button", { name: "Risks" });
    const parent = screen.getByRole("button", { name: "Launch" });
    expect(child.closest(".spaces-tree-node")?.parentElement)
      .toBe(parent.closest(".spaces-tree-node"));
  });

  it("shows a page whose parent is not in the list rather than dropping it", async () => {
    // A search that matched the child but not the parent, or a parent deleted
    // between two requests. A document that exists and is not on screen is the
    // worst outcome available here.
    render(
      <SpacesPanel
        client={stubClient({ listPages: async () => [summary({ id: "pg_2", title: "Risks", parent_id: "gone" })] })}
        agents={[agent("scout", "Scout")]}
      />,
    );
    expect(await screen.findByRole("button", { name: "Risks" })).toBeInTheDocument();
  });

  it("lists who can read the Space and says when a removal takes effect", async () => {
    const setSpaceMember = vi.fn(async () => undefined);
    render(
      <SpacesPanel
        client={stubClient({ setSpaceMember })}
        agents={[agent("scout", "Scout"), agent("sorter", "Sorter")]}
      />,
    );
    const scout = await screen.findByRole("checkbox", { name: /Scout/ });
    const sorter = screen.getByRole("checkbox", { name: /Sorter/ });
    expect(scout).toBeChecked();
    expect(sorter).not.toBeChecked();
    expect(screen.getByText(/next tool call, not its next turn/)).toBeInTheDocument();

    await userEvent.click(sorter);
    expect(setSpaceMember).toHaveBeenCalledWith("q3", "sorter", true);
  });

  it("asks the server to search rather than filtering what it already has", async () => {
    // The Space is the source of truth and FTS ranks better than a substring
    // filter over one page of results.
    const listPages = vi.fn(async () => [summary()]);
    render(<SpacesPanel client={stubClient({ listPages })} agents={[]} />);
    await screen.findByRole("button", { name: "Launch plan" });

    await userEvent.type(screen.getByLabelText("Search this Space"), "risks");
    await waitFor(() =>
      expect(listPages).toHaveBeenCalledWith("q3", "risks"),
    );
  });
});
