/**
 * The real plugin payload: everything except the four lines that register it.
 *
 * Built as an ES module rather than folded into the IIFE, because the host
 * injects plugin bundles on dashboard boot — for everyone, whether or not they
 * ever open /crew. Splitting it here means the boot cost is the stub, and the
 * workspace (with streamdown, and behind it shiki and mermaid) is fetched the
 * first time somebody actually opens the tab. It also restores ordinary code
 * splitting, so noVNC lands in its own chunk again instead of being inlined.
 */

import { CrewWorkspace, HermesCrewClient } from "@hermes/crew-ui";
import "@hermes/crew-ui/styles.css";

const API = "/api/plugins/hermes-crew";

interface PluginSdk {
  authedFetch(url: string, init?: RequestInit): Promise<Response>;
  buildWsUrl(path: string, params?: Record<string, string>): Promise<string>;
}

const sdk = (window as unknown as { __HERMES_PLUGIN_SDK__?: PluginSdk }).__HERMES_PLUGIN_SDK__!;

const client = new HermesCrewClient({
  baseUrl: API,
  // The SDK's authed fetch, not the global one. Its own contract says plugins
  // must not hand-read the session token, and this is what keeps loopback,
  // gated-OAuth and server-internal modes all working from one bundle.
  fetchImpl: (url, init) => sdk.authedFetch(url, init),
  // A resolver, not a string: in gated mode `buildWsUrl` mints a single-use
  // ticket, so the URL has to be rebuilt for every connect and reconnect.
  eventsUrl: () => sdk.buildWsUrl(`${API}/v1/events`),
});

function notify(notification: { title: string; body: string }) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    // A tab the operator is looking at does not need to be told its own
    // contents changed.
    if (document.visibilityState === "visible") return;
    new Notification(notification.title, { body: notification.body });
  } catch { /* Notifications are a courtesy, never a dependency. */ }
}

export default function CrewPage() {
  return <CrewWorkspace client={client} notify={notify} />;
}
