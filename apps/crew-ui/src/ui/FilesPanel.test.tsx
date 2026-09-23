import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Artifact } from "../domain/types";
import { FilesPanel } from "./FilesPanel";

const artifact = (over: Partial<Artifact> = {}): Artifact => ({
  id: "1",
  agentId: "scout",
  conversationId: "dm:scout",
  path: "q3-review.pptx",
  name: "q3-review.pptx",
  kind: "slides",
  size: 48_200,
  updatedAt: "2026-03-14T09:00:00.000Z",
  downloadPath: "/bots/scout/files/q3-review.pptx",
  ...over,
});

describe("FilesPanel", () => {
  it("offers each file as a download rather than something to open in place", () => {
    // Not a gap: a teammate writes files out of things it read on the web, so
    // rendering one inline would run whatever it saved on the dashboard's own
    // origin.
    render(<FilesPanel agentName="Scout" artifacts={[artifact()]} urlFor={(a) => `/x${a.downloadPath}`} />);
    const link = screen.getByRole("link", { name: /q3-review\.pptx/ });
    expect(link).toHaveAttribute("href", "/x/bots/scout/files/q3-review.pptx");
    expect(link).toHaveAttribute("download", "q3-review.pptx");
    expect(link).not.toHaveAttribute("target");
  });

  it("marks a zero-byte file instead of hiding it", () => {
    // The visible half of the delivery check. A script that died inside save()
    // leaves an empty shell, and an operator who can see "0 bytes" understands
    // immediately what an absent row would have left them guessing about.
    render(<FilesPanel agentName="Scout" artifacts={[artifact({ size: 0 })]} urlFor={() => "#"} />);
    expect(screen.getByText("0 bytes")).toBeInTheDocument();
    expect(screen.getByText("didn't finish")).toBeInTheDocument();
  });

  it("says who has produced nothing yet, by name", () => {
    render(<FilesPanel agentName="Scout" artifacts={[]} urlFor={() => "#"} />);
    expect(screen.getByText(/Scout has not produced any files yet/)).toBeInTheDocument();
  });

  it("shows a size somebody can read, with a decimal only where it changes the answer", () => {
    // "47 KB" and "2.4 MB" are both what a person wants; "47.07 KB" is noise
    // and "2 MB" has lost the useful part.
    render(<FilesPanel agentName="Scout" artifacts={[
      artifact({ id: "1", path: "a.pptx", name: "a.pptx", size: 48_200 }),
      artifact({ id: "2", path: "b.pptx", name: "b.pptx", size: 2_500_000 }),
    ]} urlFor={() => "#"} />);
    expect(screen.getByText("47 KB")).toBeInTheDocument();
    expect(screen.getByText("2.4 MB")).toBeInTheDocument();
  });
});
