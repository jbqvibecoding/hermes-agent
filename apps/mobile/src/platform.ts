/**
 * The phone's answer to the two questions `useCrewController` asks.
 *
 * This is the whole reason `apps/crew-ui/src/state/platform.ts` exists: the
 * controller's roster safety net wants to know "am I in front of the person"
 * and "am I online", and skip its refresh when either is false. On the web
 * those are `visibilitychange` and `navigator.onLine`; here they are
 * `AppState` and NetInfo. 623 lines of controller cross over unchanged because
 * this file answers them.
 *
 * Both halves matter more on a phone than in a tab. A backgrounded app polling
 * the roster every thirty seconds is a battery complaint, and a refresh on a
 * dead cellular connection is a request that hangs until it times out.
 */

import NetInfo from "@react-native-community/netinfo";
import type { PlatformBridge, WakeReason } from "@hermes/crew-ui/state";
import { AppState } from "react-native";

export function createPlatformBridge(): PlatformBridge {
  // NetInfo is push-based: it tells you when reachability changes rather than
  // answering on demand, so the latest value is held here. It starts `true`
  // deliberately — assuming offline until told otherwise would skip the first
  // refresh on a cold start, which is the one the operator is waiting for.
  let online = true;

  return {
    isActive: () => AppState.currentState === "active",
    isOnline: () => online,
    subscribe(onWake: (reason: WakeReason) => void) {
      const app = AppState.addEventListener("change", (next) => {
        // "active" only. On iOS a notification shade pulls the app through
        // "inactive", and treating that as a wake would refresh twice for one
        // glance at the screen.
        if (next === "active") onWake("visible");
      });

      const net = NetInfo.addEventListener((state) => {
        const next = state.isConnected !== false;
        const regained = next && !online;
        online = next;
        // Only the transition, not every NetInfo event: it fires on cellular
        // ↔ wifi changes too, and those are not "came back online".
        if (regained) onWake("online");
      });

      return () => {
        app.remove();
        net();
      };
    },
  };
}
