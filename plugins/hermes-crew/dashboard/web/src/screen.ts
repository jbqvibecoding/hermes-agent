/**
 * The read-only screen viewer the phone's WebView loads.
 *
 * Three pieces, each already owned by someone:
 *
 * * **noVNC** speaks RFB and paints the canvas — the same client the dashboard
 *   has driven since the crew shipped, not an iframe pointed at `vnc.html`.
 * * **`desktopTransform`** (cindy, Apache-2.0) decides where that canvas sits
 *   and how big it is. noVNC's own `scaleViewport` is therefore off: it fits
 *   the canvas to its container, which is the right answer on a desktop and
 *   the wrong one on a phone, where fitting 1280×800 into 390 points makes
 *   every word unreadable and there is nothing to be done about it.
 * * **`canvasHasVisualFrame`** (ours, from errand) answers the question an
 *   iframe cannot: x11vnc will accept a connection and serve a display
 *   Chromium has not painted to yet, and "connected but black forever" is this
 *   image's most likely failure.
 *
 * Input is not forwarded — not because the page declines to, but because the
 * proxy drops it (`crew/rfb_guard.py`). The touch handling below is a camera:
 * one finger pans, two pinch, and nothing reaches the teammate's machine.
 */

import RFB from "@novnc/novnc";

import { canvasHasVisualFrame, desktopTransform } from "@hermes/crew-ui/screen";

/** What the host app is told, so its UI can say something true. */
type State =
  | { state: "connecting" }
  | { state: "live" }
  | { state: "blank" }
  | { state: "closed"; code: number; reason: string };

/** How long a connected-but-unpainted screen stays "connecting" before we say
 *  so. Eight seconds is the dashboard's existing deadline for the same thing. */
const FIRST_FRAME_MS = 8000;
const BLANK_POLL_MS = 400;

function report(message: State): void {
  const bridge = (window as unknown as {
    ReactNativeWebView?: { postMessage(data: string): void };
  }).ReactNativeWebView;
  try {
    bridge?.postMessage(JSON.stringify(message));
  } catch {
    /* No host to tell. The page still works on its own. */
  }
}

function note(text: string | null): void {
  const element = document.getElementById("note");
  if (!element) return;
  if (text === null) {
    element.setAttribute("hidden", "");
    return;
  }
  element.textContent = text;
  element.removeAttribute("hidden");
}

function socketUrl(path: string): string {
  const url = new URL(path, document.baseURI);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

function start(): void {
  const configElement = document.getElementById("config");
  const screen = document.getElementById("screen");
  if (!configElement?.textContent || !screen) return;

  const { socketPath } = JSON.parse(configElement.textContent) as { socketPath: string };

  report({ state: "connecting" });
  note("Connecting…");

  const rfb = new RFB(screen, socketUrl(socketPath), { shared: true });
  // The client's half of read-only. The half that counts is the proxy's, which
  // drops input messages whatever this page sets — this one is here so a
  // stray browser gesture is not even sent.
  rfb.viewOnly = true;
  // We own the geometry; see the module comment.
  rfb.scaleViewport = false;
  rfb.clipViewport = false;
  rfb.showDotCursor = false;

  let zoom = 1;
  let focusX = 0.5;
  let focusY = 0.5;

  const place = (): void => {
    const canvas = screen.querySelector("canvas");
    if (!canvas) return;
    const at = desktopTransform(
      window.innerWidth,
      window.innerHeight,
      canvas.width,
      canvas.height,
      zoom,
      focusX,
      focusY,
    );
    screen.style.transform =
      `translate(${at.x}px, ${at.y}px) scale(${at.scale})`;
  };

  // --- the camera ---------------------------------------------------------
  // Pointer events rather than touch events: one code path for a finger, a
  // trackpad and the desktop browser somebody will inevitably open this in.
  const active = new Map<number, { x: number; y: number }>();
  let pinchFrom = 0;
  let zoomFrom = 1;

  const spread = (): number => {
    const [a, b] = [...active.values()];
    if (!a || !b) return 0;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  screen.parentElement?.addEventListener("pointerdown", (event) => {
    active.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (active.size === 2) {
      pinchFrom = spread();
      zoomFrom = zoom;
    }
  });

  const end = (event: PointerEvent): void => {
    active.delete(event.pointerId);
    pinchFrom = 0;
  };
  screen.parentElement?.addEventListener("pointerup", end);
  screen.parentElement?.addEventListener("pointercancel", end);

  screen.parentElement?.addEventListener("pointermove", (event) => {
    const previous = active.get(event.pointerId);
    if (!previous) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    active.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (active.size >= 2) {
      if (pinchFrom > 0) {
        const now = spread();
        if (now > 0) zoom = zoomFrom * (now / pinchFrom);
      }
    } else {
      const canvas = screen.querySelector("canvas");
      if (!canvas) return;
      const at = desktopTransform(
        window.innerWidth, window.innerHeight,
        canvas.width, canvas.height, zoom, focusX, focusY,
      );
      // Pan in desktop fractions, so dragging moves the picture by the number
      // of pixels the finger moved regardless of how far it is zoomed in.
      if (at.width > window.innerWidth) focusX -= dx / at.width;
      if (at.height > window.innerHeight) focusY -= dy / at.height;
      focusX = Math.min(1, Math.max(0, focusX));
      focusY = Math.min(1, Math.max(0, focusY));
    }
    place();
  });

  window.addEventListener("resize", place);

  // --- is it actually painting? ------------------------------------------
  let settled = false;
  const openedAt = Date.now();
  const watch = window.setInterval(() => {
    const canvas = screen.querySelector("canvas");
    if (!canvas) return;
    place();
    if (canvasHasVisualFrame(canvas)) {
      settled = true;
      window.clearInterval(watch);
      note(null);
      report({ state: "live" });
    } else if (Date.now() - openedAt > FIRST_FRAME_MS) {
      window.clearInterval(watch);
      note("Connected, but this screen is not painting anything.");
      report({ state: "blank" });
    }
  }, BLANK_POLL_MS);

  rfb.addEventListener("disconnect", (event: Event) => {
    window.clearInterval(watch);
    const detail = (event as CustomEvent<{ clean?: boolean }>).detail;
    const code = (rfb as unknown as { _rfbCloseCode?: number })._rfbCloseCode ?? 0;
    note(detail?.clean && settled ? "Screen closed." : "Lost the screen.");
    report({ state: "closed", code, reason: detail?.clean ? "clean" : "lost" });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", start);
} else {
  start();
}
