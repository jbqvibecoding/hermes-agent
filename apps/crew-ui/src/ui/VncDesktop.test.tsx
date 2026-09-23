/**
 * Ported from errand/src/ui/components/VncDesktop.test.tsx (Apache-2.0, Runta).
 * Wording follows our copy; the cases are its.
 *
 * These are the tests that earn the port. Every one of them is a failure our
 * container can actually produce — x11vnc accepting a connection before
 * Chromium has painted, websockify dying mid-handshake, a host port that moved
 * when the container restarted — and the old `<iframe src="vnc.html">` could
 * not distinguish any of them from "working".
 */

import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";

const instances = vi.hoisted(() => [] as Array<EventTarget & {
  disconnect: ReturnType<typeof vi.fn>;
  viewOnly: boolean;
  scaleViewport: boolean;
  resizeSession: boolean;
  canvas: HTMLCanvasElement;
}>);
const constructor = vi.hoisted(() => vi.fn());

vi.mock("@novnc/novnc", () => ({
  default: class MockRfb extends EventTarget {
    disconnect = vi.fn();
    viewOnly = false;
    scaleViewport = false;
    resizeSession = false;
    canvas = document.createElement("canvas");
    constructor(target: HTMLElement, url: string, options: unknown) {
      super();
      this.canvas.width = 2;
      this.canvas.height = 2;
      target.appendChild(this.canvas);
      constructor(target, url, options);
      instances.push(this);
    }
  },
}));

import { DetailPanel } from "./DetailPanel";
import { VncDesktop } from "./VncDesktop";
import { canvasHasVisualFrame } from "./vncFrame";

const session = { url: "ws://127.0.0.1:6080/websockify", protocols: [], mode: "remote" as const };

beforeEach(() => { instances.splice(0); constructor.mockClear(); });

it("does not treat noVNC's uniform placeholder canvas as a video frame", () => {
  const canvas = (pixels: number[][]) => ({
    width: 100,
    height: 100,
    getContext: () => ({ getImageData: () => ({ data: pixels.shift() ?? [255, 255, 255, 255] }) }),
  }) as unknown as HTMLCanvasElement;
  expect(canvasHasVisualFrame(canvas(Array(9).fill([255, 255, 255, 255])))).toBe(false);
  expect(canvasHasVisualFrame(canvas([[255, 80, 20, 255], ...Array(8).fill([20, 20, 20, 255])]))).toBe(true);
});

it("connects noVNC with the websocket URL and subprotocols", async () => {
  const reconnect = vi.fn();
  const rendered = render(<VncDesktop
    session={{ ...session, protocols: ["binary"] }}
    title="Scout's computer"
    onClose={vi.fn()}
    onReconnect={reconnect}
  />);
  await waitFor(() => expect(instances).toHaveLength(1));
  expect(constructor).toHaveBeenCalledWith(
    expect.any(HTMLElement), session.url, { shared: true, wsProtocols: ["binary"] },
  );
  expect(instances[0]).toMatchObject({ viewOnly: false, scaleViewport: true, resizeSession: false });

  act(() => instances[0]!.dispatchEvent(new CustomEvent("disconnect", { detail: { clean: false } })));
  expect(screen.getByText("The connection to this computer was lost.")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Reconnect" }));
  expect(reconnect).toHaveBeenCalledOnce();

  rendered.unmount();
  expect(instances[0]!.disconnect).toHaveBeenCalledOnce();
});

it("shows connection feedback before a session is available", async () => {
  const reconnect = vi.fn();
  const rendered = render(<VncDesktop title="Scout's computer" onClose={vi.fn()} onReconnect={reconnect} />);
  expect(screen.getByText("Connecting…")).toBeInTheDocument();
  rendered.rerender(<VncDesktop title="Scout's computer" failure="Could not start it" onClose={vi.fn()} onReconnect={reconnect} />);
  expect(screen.getByText("Could not start it")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Reconnect" }));
  expect(reconnect).toHaveBeenCalledOnce();
});

it("waits for a framebuffer before treating the screen as ready", async () => {
  vi.useFakeTimers();
  const getImageData = vi.fn(() => ({ data: Uint8ClampedArray.from([0, 0, 0, 0]) }));
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue({ getImageData } as unknown as CanvasRenderingContext2D);
  try {
    render(<VncDesktop session={session} title="Scout's computer" onClose={vi.fn()} onReconnect={vi.fn()} />);
    await vi.waitFor(() => expect(instances).toHaveLength(1));
    act(() => instances[0]!.dispatchEvent(new CustomEvent("connect")));
    // Connected is not the same as visible: this is the exact state a bare
    // iframe reports as success while the operator stares at black.
    expect(screen.getByRole("status")).toHaveTextContent("Connecting…");
    let sample = 0;
    getImageData.mockImplementation(() => ({
      data: Uint8ClampedArray.from(sample++ % 2 === 0 ? [240, 90, 20, 255] : [20, 20, 20, 255]),
    }));
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  } finally { getContext.mockRestore(); vi.useRealTimers(); }
});

it("times out a stalled handshake and ignores a late connect event", async () => {
  vi.useFakeTimers();
  const rendered = render(<VncDesktop session={session} title="Scout's computer" onClose={vi.fn()} onReconnect={vi.fn()} />);
  try {
    await vi.waitFor(() => expect(instances).toHaveLength(1));
    await act(async () => { await vi.advanceTimersByTimeAsync(15_000); });
    expect(screen.getByText("This computer's screen did not answer.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reconnect" })).toBeInTheDocument();
    expect(instances[0]!.disconnect).toHaveBeenCalledOnce();
    act(() => instances[0]!.dispatchEvent(new CustomEvent("connect")));
    expect(screen.queryByText("Connecting…")).not.toBeInTheDocument();
  } finally { rendered.unmount(); vi.useRealTimers(); }
});

it("keeps the first-frame deadline separate from the handshake deadline", async () => {
  vi.useFakeTimers();
  const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    { getImageData: () => ({ data: Uint8ClampedArray.from([0, 0, 0, 0]) }) } as unknown as CanvasRenderingContext2D,
  );
  const rendered = render(<VncDesktop session={session} title="Scout's computer" onClose={vi.fn()} onReconnect={vi.fn()} />);
  try {
    await vi.waitFor(() => expect(instances).toHaveLength(1));
    await act(async () => { await vi.advanceTimersByTimeAsync(14_000); });
    // A connect at 14s must not inherit one second of the handshake budget —
    // the first frame gets its own eight.
    act(() => instances[0]!.dispatchEvent(new CustomEvent("connect")));
    await act(async () => { await vi.advanceTimersByTimeAsync(2_000); });
    expect(screen.getByText("Connecting…")).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(6_000); });
    expect(screen.getByText("This computer connected but never drew a frame.")).toBeInTheDocument();
    expect(instances[0]!.disconnect).toHaveBeenCalledOnce();
  } finally { rendered.unmount(); getContext.mockRestore(); vi.useRealTimers(); }
});

it("explains a VNC password prompt instead of waiting forever", async () => {
  render(<VncDesktop session={session} title="Scout's computer" onClose={vi.fn()} onReconnect={vi.fn()} />);
  await waitFor(() => expect(instances).toHaveLength(1));
  act(() => instances[0]!.dispatchEvent(new CustomEvent("credentialsrequired", { detail: { types: ["password"] } })));
  expect(screen.getByText("This computer's screen is asking for a VNC password.")).toBeInTheDocument();
  expect(instances[0]!.disconnect).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Reconnect" })).toBeInTheDocument();
});

it.each(["session", "connection"])(
  "stops retrying the preview after a %s failure and retries from the screen button",
  async (failure) => {
    const computerAction = vi.fn(async () => session);
    if (failure === "session") computerAction.mockRejectedValueOnce(new Error("No screen yet"));
    const rendered = render(<DetailPanel
      open
      width={340}
      onResize={vi.fn()}
      agentName="Scout"
      computer={{ id: "crew-scout", agentId: "scout", runtimeName: "crew-scout", status: "online", capabilities: ["open"] }}
      approvals={[]}
      routines={[]}
      grants={[]}
      grantsBusy={false}
      audit={[]}
      auditLoading={false}
      auditView="all"
      auditHasMore={false}
      artifacts={[]}
      artifactUrl={() => ""}
      onApproval={vi.fn()}
      onComputerAction={computerAction}
      onDeleteRoutine={vi.fn()}
      onSetGrant={vi.fn()}
      onClearGrant={vi.fn()}
      onChangeAuditView={vi.fn()}
      onLoadMoreAudit={vi.fn()}
      onClose={vi.fn()}
    />);
    if (failure === "connection") {
      await waitFor(() => expect(instances).toHaveLength(1));
      act(() => instances[0]!.dispatchEvent(new CustomEvent("disconnect", { detail: { clean: false } })));
    }
    expect(await screen.findByText("Screen unavailable")).toBeInTheDocument();
    // Once is the whole point: without the remembered failure this effect
    // re-fires on every render against a container that is not coming back.
    expect(computerAction).toHaveBeenCalledOnce();

    await userEvent.click(screen.getByRole("button", { name: "Open Scout's screen" }));

    expect(await screen.findByRole("dialog", { name: "Scout's computer" })).toBeInTheDocument();
    expect(computerAction).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByRole("button", { name: "Close this screen" }));
    await waitFor(() => expect(computerAction).toHaveBeenCalledTimes(3));
    rendered.unmount();
  },
);
