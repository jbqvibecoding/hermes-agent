/**
 * The eight chip kinds, and the one that has a button worth getting wrong.
 *
 * These payloads come from the model by way of `crew/tools.py`, which validates
 * shape but not every field — so the assertions that a half-filled payload
 * still renders are the point, not padding.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import type { ChipKind } from "../../domain/types";
import { ChipView, type ChipHandlers } from "./index";

const handlers = (over: Partial<ChipHandlers> = {}): ChipHandlers => ({
  onDecide: vi.fn(),
  onOpenScreen: vi.fn(),
  onSubmitSecret: vi.fn(async () => undefined),
  loadEffects: vi.fn(async () => []),
  undoEffect: vi.fn(async () => undefined),
  screenshotUrl: (agentId, file) => `/api/plugins/hermes-crew/screenshots/${agentId}/${file}`,
  ...over,
});

const show = (
  kind: ChipKind, payload: unknown, over?: Partial<ChipHandlers>, turnId?: string,
) => {
  const h = handlers(over);
  return {
    ...render(<ChipView kind={kind} payload={payload} turnId={turnId} handlers={h} />),
    handlers: h,
  };
};

it("renders a report as scannable lines rather than a paragraph", () => {
  show("report", {
    lines: [
      { system: "Salesforce", result: "list pulled", count: "52 accounts" },
      { system: "Inbox", result: "nothing new" },
    ],
    closing: "Nothing needs you.",
  });
  expect(screen.getByText("Salesforce")).toBeInTheDocument();
  expect(screen.getByText("list pulled")).toBeInTheDocument();
  expect(screen.getByText("· 52 accounts")).toBeInTheDocument();
  expect(screen.getByText("Nothing needs you.")).toBeInTheDocument();
  // The second line has no count; it must not render a stray separator.
  expect(screen.queryByText("· undefined")).not.toBeInTheDocument();
});

it("offers both decisions on a held action and reports them in errand's verbs", async () => {
  const onDecide = vi.fn();
  show("approval_request", { approval_id: 7, action: "send the 4 drafts", detail: "to 4 customers" }, { onDecide });
  expect(screen.getByText("Needs you")).toBeInTheDocument();
  expect(screen.getByText("to 4 customers")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Approve" }));
  expect(onDecide).toHaveBeenCalledWith("7", "allow");
  await userEvent.click(screen.getByRole("button", { name: "Discard" }));
  expect(onDecide).toHaveBeenCalledWith("7", "deny");
});

it("shows a decided action as decided, with no buttons left to press", () => {
  show("approval_request", { approval_id: 7, action: "send the 4 drafts", status: "approved" });
  expect(screen.getByText("Decided")).toBeInTheDocument();
  expect(screen.getByText("Approved")).toBeInTheDocument();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("renders the operator's own decision as a separate note in the thread", () => {
  show("approval_resolved", { action: "send the 4 drafts", status: "discarded" });
  expect(screen.getByText("You decided")).toBeInTheDocument();
  expect(screen.getByText("Discarded")).toBeInTheDocument();
});

it("renders a memory rule with its diff", () => {
  show("memory_updated", { rule: "Never email Finance before 10am", diff: "+ Never email Finance before 10am" });
  show("login_request", { site: "Zendesk", why: "the queue is behind a login" });
  show("login_request", {
    site: "Zendesk", field: "password", ref: "a3f1",
    why: "the queue is behind a login",
  });
  show("memory_updated", { tidied: 2, note: "I merged 2 pair(s) that said the same thing." });
  show("memory_updated", {
    proposal: true, kind: "conflicting", why: "one says reply fast, one says wait",
    entries: ["reply within the hour", "never reply before I have read it"],
    note: "These two rules disagree — which one stands?",
  });
  expect(screen.getByText("Memory updated")).toBeInTheDocument();
  expect(screen.getByText("+ Never email Finance before 10am")).toBeInTheDocument();
});

it("renders a routine with a human schedule when it has one", () => {
  show("routine_created", { name: "Morning brief", human: "every weekday at 08:30", cron: "30 8 * * 1-5" });
  expect(screen.getByText("every weekday at 08:30")).toBeInTheDocument();
  expect(screen.queryByText("30 8 * * 1-5")).not.toBeInTheDocument();
});

it("falls back to the cron expression when there is no human schedule", () => {
  show("routine_created", { name: "Morning brief", cron: "30 8 * * 1-5" });
  expect(screen.getByText("30 8 * * 1-5")).toBeInTheDocument();
});

it("attributes a handoff to whoever sent it", () => {
  show("bot_ref", { from: "chief", from_name: "Chief", content: "Pull Q3 churn by segment." });
  expect(screen.getByText("Handed over by @Chief")).toBeInTheDocument();
  expect(screen.getByText("Pull Q3 churn by segment.")).toBeInTheDocument();
});

it("sends the operator to the screen for a login rather than asking for a password", async () => {
  const onOpenScreen = vi.fn();
  show("login_request", { site: "salesforce.com", why: "The session expired." }, { onOpenScreen });
  expect(screen.getByText(/Sign in to/)).toHaveTextContent("Sign in to salesforce.com");
  // The teammate never has credentials and must never ask for them in chat, so
  // this chip's only affordance is "go do it yourself, on their machine".
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Take the wheel" }));
  expect(onOpenScreen).toHaveBeenCalledOnce();
});

it("builds a screenshot URL from the teammate and file when no url was given", () => {
  const { container } = show("screenshot", { bot_id: "scout", file: "1730000000.png", caption: "The report page" });
  const image = container.querySelector("img");
  expect(image).toHaveAttribute("src", "/api/plugins/hermes-crew/screenshots/scout/1730000000.png");
  expect(image).toHaveAttribute("alt", "The report page");
});

it("renders nothing for a screenshot with no source instead of a broken image", () => {
  const { container } = show("screenshot", { caption: "Nothing here" });
  expect(container.querySelector("img")).toBeNull();
});

it("renders nothing for a kind the backend added and this renderer has not", () => {
  const { container } = show("wat" as ChipKind, { anything: true });
  expect(container).toBeEmptyDOMElement();
});

it("shows a secret card as answered on a screen that did not answer it", () => {
  // `filled` is the server's half. The browser that typed the password knows
  // from its own React state; every other open client — a phone, another tab,
  // a colleague watching the thread — has only the row, and without this keeps
  // offering a live password box for a request that is already closed.
  show("login_request", {
    site: "Zendesk", field: "password", ref: "a3f1", filled: true,
    why: "the queue is behind a login",
  });
  expect(screen.queryByPlaceholderText("password")).not.toBeInTheDocument();
  expect(screen.getByText(/went into the page|Typed into the page/)).toBeInTheDocument();
});

it("still asks when the server has not recorded an answer", () => {
  show("login_request", {
    site: "Zendesk", field: "password", ref: "a3f1",
    why: "the queue is behind a login",
  });
  expect(screen.getByPlaceholderText("password")).toBeInTheDocument();
});

/**
 * "What changed" — the record, under the teammate's account of it.
 *
 * The report above it is prose the model typed, so these two can disagree, and
 * the panel exists so the operator sees both. The tests below are mostly about
 * the ways the panel could quietly agree with the report when it shouldn't: by
 * not loading, by not saying it failed to load, or by offering an undo it
 * cannot honour.
 */

const REPORT = { lines: [{ system: "mail", result: "sent the launch note" }] };

it("says nothing about changes until asked, and nothing at all without a turn", () => {
  const { handlers: h } = show("report", REPORT);
  expect(screen.queryByRole("button", { name: "What changed" })).not.toBeInTheDocument();
  expect(h.loadEffects).not.toHaveBeenCalled();
});

it("loads the record only on expand, so a quiet turn costs no request", async () => {
  const loadEffects = vi.fn(async () => [
    { id: "e1", kind: "send" as const, text: "Sent to dana@henley.example", target: "", undoable: false },
  ]);
  show("report", REPORT, { loadEffects }, "turn-1");
  expect(loadEffects).not.toHaveBeenCalled();

  await userEvent.click(screen.getByRole("button", { name: "What changed" }));
  expect(loadEffects).toHaveBeenCalledWith("turn-1");
  expect(await screen.findByText("Sent to dana@henley.example")).toBeInTheDocument();
});

it("offers undo on exactly the changes the server says can be put back", async () => {
  const loadEffects = vi.fn(async () => [
    { id: "e1", kind: "publish" as const, text: "Created the page “Q3”", target: "Q3", undoable: true },
    { id: "e2", kind: "send" as const, text: "Sent to dana@henley.example", target: "", undoable: false },
  ]);
  show("report", REPORT, { loadEffects }, "turn-1");
  await userEvent.click(screen.getByRole("button", { name: "What changed" }));
  await screen.findByText("Created the page “Q3”");

  // One button, not two: an undo offered for the email would be a button that
  // cannot honour itself, which is worse than no button at all.
  expect(screen.getAllByRole("button", { name: "Undo" })).toHaveLength(1);
});

it("puts a change back and re-reads the record rather than guessing the new state", async () => {
  const undoEffect = vi.fn(async () => undefined);
  let pass = 0;
  const loadEffects = vi.fn(async () => {
    pass += 1;
    return [{
      id: "e1", kind: "publish" as const, text: "Created the page “Q3”", target: "Q3",
      undoable: pass === 1, undone_at: pass === 1 ? 0 : 1_700_000_000,
    }];
  });
  show("report", REPORT, { loadEffects, undoEffect }, "turn-1");
  await userEvent.click(screen.getByRole("button", { name: "What changed" }));
  await userEvent.click(await screen.findByRole("button", { name: "Undo" }));

  expect(undoEffect).toHaveBeenCalledWith("e1");
  expect(await screen.findByText("undone")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
  expect(loadEffects).toHaveBeenCalledTimes(2);
});

it("distinguishes a turn that changed nothing from one it could not ask about", async () => {
  show("report", REPORT, { loadEffects: vi.fn(async () => []) }, "turn-1");
  await userEvent.click(screen.getByRole("button", { name: "What changed" }));
  expect(await screen.findByText("Nothing outside this conversation.")).toBeInTheDocument();

  show("report", REPORT, {
    loadEffects: vi.fn(async () => { throw new Error("offline"); }),
  }, "turn-2");
  await userEvent.click(screen.getAllByRole("button", { name: "What changed" })[1]);
  expect(await screen.findByText("Could not load what changed.")).toBeInTheDocument();
});

it("shows a change whose record was lost rather than leaving the list short", async () => {
  const loadEffects = vi.fn(async () => [
    { id: "", kind: "other" as const, text: "A change could not be recorded",
      target: "", undoable: false, unrecorded: true },
    { id: "e2", kind: "file" as const, text: "Wrote /workspace/a.md", target: "", undoable: false },
  ]);
  show("report", REPORT, { loadEffects }, "turn-1");
  await userEvent.click(screen.getByRole("button", { name: "What changed" }));
  expect(await screen.findByText("A change could not be recorded")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Undo" })).not.toBeInTheDocument();
});
