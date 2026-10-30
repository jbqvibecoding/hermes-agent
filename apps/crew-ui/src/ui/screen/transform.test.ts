import { describe, expect, it } from "vitest";

import { desktopTransform } from "./transform";

/**
 * cindy's transform, under our tests rather than theirs.
 *
 * The arithmetic is theirs and is not in question; what these pin is the three
 * decisions encoded in it, because those are what a later "tidy-up" would
 * quietly remove. Each one reads like an arbitrary `Math.max` until you ask
 * what the screen does without it.
 */

// A teammate's container is 1280×800; a phone in portrait is about this.
const PHONE = { vw: 390, vh: 700 };
const DESKTOP = { dw: 1280, dh: 800 };

const place = (zoom: number, fx = 0.5, fy = 0.5, fill = false) =>
  desktopTransform(PHONE.vw, PHONE.vh, DESKTOP.dw, DESKTOP.dh, zoom, fx, fy, fill);

describe("fitting a desktop onto a phone", () => {
  it("fits the whole desktop at rest, letterboxed and centred", () => {
    const at = place(1);

    expect(at.width).toBeCloseTo(390, 5);
    expect(at.height).toBeCloseTo(243.75, 5);
    expect(at.x).toBeCloseTo(0, 5);
    // Centred vertically rather than pinned to the top: the empty space is
    // split, which is what makes the letterboxing read as deliberate.
    expect(at.y).toBeCloseTo((700 - 243.75) / 2, 5);
  });

  it("never zooms out past fit", () => {
    // A pinch-out past the floor, and a nonsense value from a stale gesture.
    for (const zoom of [0.5, 0.01, 0, -3]) {
      expect(place(zoom).scale).toBeCloseTo(place(1).scale, 10);
    }
  });

  it("stops at two viewer points per desktop point", () => {
    const hard = place(10_000);
    const fit = place(1).scale;

    expect(hard.scale).toBeCloseTo(fit * (2 / fit), 5);
    expect(hard.scale).toBeCloseTo(2, 5);
    // Past that the viewer is magnifying the framebuffer's own pixels, which
    // looks like a broken screen rather than a closer one.
    expect(hard.maxZoom).toBeCloseTo(2 / fit, 5);
  });
});

describe("where the desktop sits once it is bigger than the screen", () => {
  it("follows the focus point", () => {
    const left = place(4, 0.1, 0.5);
    const right = place(4, 0.9, 0.5);

    expect(left.x).toBeGreaterThan(right.x);
  });

  it("clamps at the edges instead of letting the desktop drift off", () => {
    const past = place(4, -5, -5);
    const beyond = place(4, 5, 5);

    // Hard against the left/top, and against the right/bottom: in both cases
    // the viewport stays full of desktop.
    expect(past.x).toBeCloseTo(0, 5);
    expect(past.y).toBeCloseTo(0, 5);
    expect(beyond.x).toBeCloseTo(PHONE.vw - beyond.width, 5);
    expect(beyond.y).toBeCloseTo(PHONE.vh - beyond.height, 5);
  });

  it("keeps an axis centred while that axis still fits", () => {
    // Zoomed enough to overflow horizontally, not enough to fill the height.
    const at = place(2, 0.5, 0.5);

    expect(at.width).toBeGreaterThan(PHONE.vw);
    expect(at.height).toBeLessThan(PHONE.vh);
    expect(at.y).toBeCloseTo((PHONE.vh - at.height) / 2, 5);
  });
});

describe("edges", () => {
  it("fills the height when asked, cropping the sides", () => {
    const at = place(1, 0.5, 0.5, true);

    expect(at.height).toBeCloseTo(PHONE.vh, 5);
    expect(at.width).toBeGreaterThan(PHONE.vw);
  });

  it("survives a zero-sized desktop rather than dividing by it", () => {
    // The first frames can arrive before noVNC knows the framebuffer size.
    const at = desktopTransform(390, 700, 0, 0, 1, 0.5, 0.5);

    expect(Number.isFinite(at.scale)).toBe(true);
    expect(Number.isFinite(at.x)).toBe(true);
    expect(Number.isFinite(at.y)).toBe(true);
  });
});
