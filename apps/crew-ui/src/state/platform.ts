/**
 * The one thing `useCrewController` needs from the surface it is running on.
 *
 * Everything else in `state/`, `client/` and `domain/` is already platform-free
 * — plain `fetch`, `WebSocket` and timers, all of which React Native has. This
 * module exists because exactly one effect in the controller was not: the
 * safety net that re-reads the roster when the surface comes back to the front
 * or regains a network. On the web that is `visibilitychange` / `focus` /
 * `online`; on a phone it is `AppState` and NetInfo. Same question, different
 * vocabulary, so it goes behind an interface rather than a `typeof window`
 * check — a check like that compiles everywhere and then fails at runtime on
 * the platform nobody tested.
 *
 * Deliberately tiny. The temptation with a seam like this is to make it a
 * general "platform services" object (storage, notifications, clipboard) ahead
 * of any caller. Those have real consumers on the RN side and will arrive with
 * them; an interface with no implementor is the speculative infrastructure
 * AGENTS.md rejects.
 */

/** Why the controller was woken. Kept for the caller's logging, not branched on. */
export type WakeReason = "visible" | "focus" | "online";

export interface PlatformBridge {
  /**
   * Is the surface in front of the person right now?
   *
   * The refresh is skipped when it is not, which is the whole point of the
   * net: a backgrounded phone or a hidden tab polling the roster every thirty
   * seconds costs battery and tells nobody anything.
   */
  isActive(): boolean;
  /** Does the device believe it has a network? A refresh offline just fails. */
  isOnline(): boolean;
  /**
   * Call `onWake` whenever the surface returns to the front or regains a
   * network. Returns the unsubscribe.
   *
   * One callback for all three web events because the controller treated them
   * identically — all three ran the same `refreshWhenActive`. Collapsing them
   * here keeps that true by construction instead of by three call sites
   * agreeing.
   */
  subscribe(onWake: (reason: WakeReason) => void): () => void;
}

/**
 * The browser implementation, which is what the dashboard plugin and the
 * desktop app have always used — this is a lift of the effect that was inline
 * in `useCrewController`, not new behaviour.
 */
export const webPlatform: PlatformBridge = {
  isActive: () => document.visibilityState !== "hidden",
  isOnline: () => navigator.onLine,
  subscribe(onWake) {
    const onFocus = () => onWake("focus");
    const onOnline = () => onWake("online");
    const onVisibility = () => {
      if (document.visibilityState === "visible") onWake("visible");
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  },
};

/**
 * For a surface that cannot answer either question — a test renderer, or a
 * server render. Always awake, never woken: the interval in the controller
 * still runs, so the roster is never *stuck*, it just has no event to ride.
 */
export const alwaysActivePlatform: PlatformBridge = {
  isActive: () => true,
  isOnline: () => true,
  subscribe: () => () => undefined,
};

/**
 * What `useCrewController` falls back to when the caller passes no bridge.
 *
 * This is the `typeof document` check the doc comment above warns about, and
 * it is here on purpose for the one thing such a check is good for: a **net**,
 * not a behaviour. Without it, a React Native caller that forgets `platform`
 * gets `webPlatform` and dies on `document.visibilityState` the first time the
 * net fires — thirty seconds in, far from the mistake. With it, that caller
 * degrades to interval-only refresh, which is correct if slightly wasteful,
 * and the roster still works.
 *
 * It is not a licence to skip the bridge: without one a backgrounded phone
 * keeps polling. RN callers pass `RNPlatformBridge`.
 */
export function detectPlatform(): PlatformBridge {
  const hasDom =
    typeof document !== "undefined" &&
    typeof window !== "undefined" &&
    typeof document.addEventListener === "function";
  return hasDom ? webPlatform : alwaysActivePlatform;
}
