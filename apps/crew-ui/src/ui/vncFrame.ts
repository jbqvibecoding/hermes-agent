/**
 * Ported verbatim from errand/src/ui/components/vncFrame.ts (Apache-2.0, Runta).
 *
 * Worth its weight several times over for our container. A teammate's computer
 * is Xvfb + x11vnc + a headed Chromium, and "the socket connected but nothing
 * ever painted" is that stack's most common failure — x11vnc will happily serve
 * a display Chromium has not drawn to yet. An `<iframe src="vnc.html">` cannot
 * tell that apart from a working screen; sampling the canvas can.
 *
 * Nine points, not the whole canvas: reading every pixel of a 1280×800 frame on
 * a 100ms poll is real CPU for a question three corners already answer.
 */

export function canvasHasVisualFrame(canvas: HTMLCanvasElement): boolean {
  if (canvas.width <= 0 || canvas.height <= 0) return false;
  try {
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return false;
    const xs = [0, Math.floor(canvas.width / 2), canvas.width - 1];
    const ys = [0, Math.floor(canvas.height / 2), canvas.height - 1];
    const samples = xs.flatMap((x) => ys.map((y) => context.getImageData(x, y, 1, 1).data));
    if (samples.every((pixel) => pixel[3] === 0)) return false;
    for (let channel = 0; channel < 3; channel += 1) {
      const values = samples.map((pixel) => pixel[channel]!);
      // A uniform field is a blank desktop, not a frame. 6 is the tolerance
      // that survives JPEG-ish rect encoding without calling noise a picture.
      if (Math.max(...values) - Math.min(...values) > 6) return true;
    }
    return false;
  } catch {
    return false;
  }
}
