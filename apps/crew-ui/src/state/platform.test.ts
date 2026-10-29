/**
 * The web bridge still does what the inline effect did.
 *
 * `useCrewController` used to bind `focus`, `online` and `visibilitychange`
 * itself and skip the refresh when the tab was hidden or offline. Lifting that
 * into `webPlatform` is only safe if the lift is exact, and "the 94 other tests
 * still pass" does not prove it — none of them exercised those listeners. This
 * file does, so the refactor is checked rather than assumed.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { alwaysActivePlatform, detectPlatform, webPlatform } from "./platform";

function setVisibility(value: "visible" | "hidden") {
  Object.defineProperty(document, "visibilityState", { configurable: true, value });
  document.dispatchEvent(new Event("visibilitychange"));
}

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

afterEach(() => {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  setOnline(true);
});

describe("webPlatform", () => {
  it("wakes on focus, on coming back online, and on becoming visible", () => {
    const onWake = vi.fn();
    const stop = webPlatform.subscribe(onWake);

    window.dispatchEvent(new Event("focus"));
    expect(onWake).toHaveBeenCalledWith("focus");

    window.dispatchEvent(new Event("online"));
    expect(onWake).toHaveBeenCalledWith("online");

    setVisibility("visible");
    expect(onWake).toHaveBeenCalledWith("visible");
    expect(onWake).toHaveBeenCalledTimes(3);
    stop();
  });

  it("does not wake when the surface goes *away*", () => {
    const onWake = vi.fn();
    const stop = webPlatform.subscribe(onWake);
    setVisibility("hidden");
    expect(onWake).not.toHaveBeenCalled();
    stop();
  });

  it("unbinds all three on unsubscribe, so a remount does not double-refresh", () => {
    const onWake = vi.fn();
    webPlatform.subscribe(onWake)();

    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("online"));
    setVisibility("visible");
    expect(onWake).not.toHaveBeenCalled();
  });

  it("reports a hidden surface as inactive and an offline device as offline", () => {
    expect(webPlatform.isActive()).toBe(true);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    expect(webPlatform.isActive()).toBe(false);

    expect(webPlatform.isOnline()).toBe(true);
    setOnline(false);
    expect(webPlatform.isOnline()).toBe(false);
  });
});

describe("detectPlatform", () => {
  it("picks the web bridge when there is a DOM", () => {
    // The mirror of the assertion in portability.test.ts, which runs with no
    // DOM and must get `alwaysActivePlatform`. Both directions, because either
    // one alone passes with the detection hard-coded.
    expect(detectPlatform()).toBe(webPlatform);
    expect(detectPlatform()).not.toBe(alwaysActivePlatform);
  });
});
