/**
 * Where the WebView points to watch a teammate's screen.
 *
 * An http(s) URL, not a websocket one: the WebView loads a *page* the
 * dashboard serves, and that page opens the socket itself. Serving the page
 * from the same origin it then connects back to is what lets its CSP say
 * `connect-src 'self'` instead of naming a host it only learns at pairing
 * time — and it keeps the connection an ordinary same-origin request rather
 * than a WebView reaching across to a separate host, which is where Android's
 * cleartext rules bite on the LAN installs this app actually pairs with.
 *
 * The credential travels in the query string for the reason it always does
 * here: nothing can put a header on a WebSocket upgrade. See
 * `socketUrlFor` in `connection.ts`.
 */

import type { Credentials } from "./session";

export function screenPageUrl(
  { baseUrl, token }: Credentials,
  agentId: string,
): string {
  const base = baseUrl.replace(/\/+$/, "");
  return (
    `${base}/v1/bots/${encodeURIComponent(agentId)}/screen/page` +
    `?kind=token&auth=${encodeURIComponent(token)}`
  );
}

/** What the page tells us about itself, over the WebView bridge. */
export type ScreenState =
  | { state: "connecting" }
  | { state: "live" }
  | { state: "blank" }
  | { state: "closed"; code: number; reason: string };

/**
 * Read one bridge message, or `null` if it is not one of ours.
 *
 * A WebView posts whatever the page gives it, and the page is only one of the
 * things that can post — an injected script, a stray library, a future
 * version of this page. Everything unrecognised is dropped rather than
 * guessed at, so an unexpected message leaves the UI in its last honest state
 * instead of a wrong one.
 */
export function readScreenState(data: unknown): ScreenState | null {
  if (typeof data !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const state = (parsed as { state?: unknown }).state;
  if (state === "connecting" || state === "live" || state === "blank") {
    return { state };
  }
  if (state === "closed") {
    const { code, reason } = parsed as { code?: unknown; reason?: unknown };
    return {
      state: "closed",
      code: typeof code === "number" ? code : 0,
      reason: typeof reason === "string" ? reason : "",
    };
  }
  return null;
}

/**
 * One line for the person holding the phone.
 *
 * The close codes are the proxy's (`plugin_api.py`), and each one exists
 * because it needs a different sentence: "no teammate" means this phone's
 * list is stale, "no screen" means the teammate is fine and the screen is
 * not running, and a refused credential means re-pairing. A single "could
 * not connect" would send somebody looking in the wrong place.
 */
export function screenMessage(state: ScreenState): string | null {
  switch (state.state) {
    case "connecting":
      return "Connecting to the screen…";
    case "live":
      return null;
    case "blank":
      return "Connected, but nothing is being drawn. The teammate may not have opened anything yet.";
    case "closed":
      return closedMessage(state.code);
  }
}

function closedMessage(code: number): string {
  switch (code) {
    case 4401:
      return "This phone is not signed in to that dashboard any more. Pair it again.";
    case 4404:
      return "That teammate no longer exists.";
    case 4409:
      return "That teammate has no screen running right now.";
    case 4408:
      return "The screen was closed after a while with nobody watching.";
    case 4400:
      return "The screen stream could not be followed, so it was closed.";
    case 4502:
      return "The dashboard could not reach that screen.";
    default:
      return "The screen closed.";
  }
}
