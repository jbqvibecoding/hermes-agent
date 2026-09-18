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
  screenshotUrl: (agentId, file) => `/api/plugins/hermes-crew/screenshots/${agentId}/${file}`,
  ...over,
});

const show = (kind: ChipKind, payload: unknown, over?: Partial<ChipHandlers>) => {
  const h = handlers(over);
  return { ...render(<ChipView kind={kind} payload={payload} handlers={h} />), handlers: h };
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
