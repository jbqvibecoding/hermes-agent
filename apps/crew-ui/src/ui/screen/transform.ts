/**
 * Ported verbatim from cindy's `packages/maker-shared/src/remote-desktop/
 * viewerRuntime.js` (Apache-2.0, XD Inc.), where it is the block delimited
 * `/* BEGIN TRANSFORM *\/`.
 *
 * Twenty-eight lines, and the only part of that 2616-line viewer that
 * transfers: the rest is a WebRTC receiver and a closure welded to its own
 * `<video>` element and data channel, neither of which has a seam for VNC
 * pixels. This has no DOM in it and no transport — it takes numbers and
 * returns numbers — which is exactly why it survives the move.
 *
 * It is also the part worth having. A 1280×800 desktop fitted to a 390pt phone
 * is about a third of life size: you can see that a window is open and not
 * read a word in it. Pinch and pan are the difference between a screen that
 * proves the teammate is alive and a screen you can actually use, and the
 * clamping decisions here are the ones that make pinching feel like a camera
 * rather than a slider:
 *
 * * **`maxZoom = max(1, 2 / fit)`** — "Pinch stops at two viewer points per
 *   desktop point, never below fit." Zooming further would magnify the
 *   framebuffer's own pixels, which reads as a bug rather than as detail.
 * * **`Math.max(1, …)` on the zoom** — there is no zooming out past fit, so
 *   the desktop can never float in a sea of background.
 * * **The `x` and `y` branches** — centre the axis while the desktop is
 *   smaller than the viewport, and clamp it to the edges once it is larger.
 *   One expression covers both, so there is no state to get out of step.
 *
 * `fillHeight` is cindy's; kept because a phone in landscape wants the height
 * filled and the sides cropped rather than letterboxing twice.
 */

export interface DesktopPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  maxZoom: number;
}

export function desktopTransform(
  vw: number,
  vh: number,
  dw: number,
  dh: number,
  zoom: number,
  fx: number,
  fy: number,
  fillHeight = false,
): DesktopPlacement {
  const fit = fillHeight
    ? vh / Math.max(1, dh)
    : Math.min(vw / Math.max(1, dw), vh / Math.max(1, dh));
  // Pinch stops at two viewer points per desktop point, never below fit.
  const maxZoom = Math.max(1, 2 / fit);
  const scale = fit * Math.max(1, Math.min(maxZoom, zoom));
  const width = dw * scale;
  const height = dh * scale;
  const x =
    width <= vw
      ? (vw - width) / 2
      : Math.min(0, Math.max(vw - width, vw / 2 - fx * width));
  const y =
    height <= vh
      ? (vh - height) / 2
      : Math.min(0, Math.max(vh - height, vh / 2 - fy * height));
  return { x, y, width, height, scale, maxZoom };
}
