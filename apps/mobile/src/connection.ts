/**
 * Getting the phone pointed at the operator's own Hermes, and saying precisely
 * what went wrong when it is not.
 *
 * This is the whole of milestone one, and it is first because nothing else in
 * the app is testable until it works. It is also the screen where a self-hosted
 * product is usually lost: the person types a host, something fails, and the app
 * says "could not connect", which is true of every one of five different
 * problems with five different fixes. So the failures are named.
 *
 * Nothing here is RN-specific on purpose — `fetch` is injected — which is what
 * lets the diagnosis be unit-tested on a laptop instead of only on a device.
 */

const PLUGIN_PATH = "/api/plugins/hermes-crew";

/** What the operator has to fix, not merely that something is broken. */
export type Reachability =
  | { ok: true; baseUrl: string }
  | {
      ok: false;
      /**
       * - `no-host` — what was typed is not an address at all.
       * - `unreachable` — nothing answered: wrong address, or the dashboard is
       *   bound to loopback and so cannot be seen from the phone at all.
       * - `unauthorized` — it answered and refused the token.
       * - `no-crew` — a server answered but the Crew plugin is not mounted.
       * - `server-error` — Hermes answered and is itself unwell.
       */
      kind: "no-host" | "unreachable" | "unauthorized" | "no-crew" | "server-error";
      /** One sentence naming the fix, for the screen. */
      detail: string;
    };

/**
 * What a person types into a box, turned into the plugin's base URL.
 *
 * They will type `10.0.0.5:8787`, because that is what they see in the
 * terminal. Requiring a scheme and the full plugin path would make the first
 * attempt fail for a reason that has nothing to do with their setup.
 */
export function normalizeBaseUrl(typed: string): string | null {
  // Trailing slashes are stripped from the *parsed pathname* below, not from
  // the raw text: doing it here turns "http://" into "http:", which then fails
  // the scheme test, gets re-prefixed, and parses as the host "http". A test
  // caught that — it would have sent requests to a host named after a scheme.
  const text = (typed || "").trim();
  if (!text) return null;

  const withScheme = /^https?:\/\//i.test(text) ? text : `http://${text}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (!url.hostname) return null;

  // Accept a bare origin, the dashboard root, or the full plugin path, and
  // land on the same place either way — people paste what they have.
  const path = url.pathname.replace(/\/+$/, "");
  const base = path.endsWith(PLUGIN_PATH) ? path : `${path}${PLUGIN_PATH}`;
  return `${url.origin}${base}`;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Ask the server one cheap question and classify the answer.
 *
 * `/v1/agents` rather than a health endpoint, because it is the first thing the
 * app needs anyway and it exercises the same auth the rest of the session will:
 * a check that passes while the real calls 401 would be worse than no check.
 */
export async function checkReachable(
  typed: string,
  token: string,
  fetchImpl: FetchLike,
  timeoutMs = 8_000,
): Promise<Reachability> {
  const baseUrl = normalizeBaseUrl(typed);
  if (!baseUrl) {
    return {
      ok: false, kind: "no-host",
      detail: "That is not an address. It looks like 10.0.0.5:8787.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}/v1/agents`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: controller.signal,
    });
  } catch {
    return {
      ok: false, kind: "unreachable",
      detail:
        "Nothing answered. Check the address, and that Hermes was started with " +
        "--host 0.0.0.0 — bound to localhost it cannot be reached from a phone.",
    };
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false, kind: "unauthorized",
      detail:
        "The server refused this token. Set HERMES_DASHBOARD_SESSION_TOKEN on " +
        "the machine running Hermes and use that value — without it the token " +
        "is random per restart.",
    };
  }
  if (response.status === 404) {
    return {
      ok: false, kind: "no-crew",
      detail: "A server answered, but the Crew plugin is not mounted there.",
    };
  }
  if (response.status >= 500) {
    return {
      ok: false, kind: "server-error",
      detail: `Hermes answered with ${response.status}. Its logs will say why.`,
    };
  }
  if (!response.ok) {
    return {
      ok: false, kind: "no-crew",
      detail: `Unexpected answer (${response.status}) from that address.`,
    };
  }

  // A 200 from something that is not Crew — a proxy login page, a different
  // app on that port — is still a wrong address, and saying "connected" here
  // would strand the person on an empty roster with no reason given.
  try {
    const body: unknown = await response.json();
    const agents = (body as { agents?: unknown })?.agents;
    if (!Array.isArray(agents)) {
      return {
        ok: false, kind: "no-crew",
        detail: "Something answered, but it is not the Crew plugin.",
      };
    }
  } catch {
    return {
      ok: false, kind: "no-crew",
      detail: "Something answered, but it is not the Crew plugin.",
    };
  }

  return { ok: true, baseUrl };
}


/**
 * `https` must become `wss`, not `ws`, or the socket is refused on any install
 * behind TLS. One substitution so the two cannot disagree.
 */
function wsBase(baseUrl: string): string {
  const ws = baseUrl.replace(/^https?:\/\//i, (match) =>
    match.toLowerCase().startsWith("https") ? "wss://" : "ws://",
  );
  return ws.replace(/\/+$/, "");
}

/**
 * A websocket URL carrying the credential in its query string.
 *
 * **Not an alternative to a header — the only option.** A WebSocket upgrade
 * cannot carry `Authorization`, which is why the dashboard's own gate reads
 * `?token=`/`?ticket=` and why its SPA mints a ticket before every connect.
 * This app's sockets were built without either, so the server answered
 * `no_credential` and closed them: the events stream has never actually run
 * against a dashboard. Fixed here rather than at each call site, so the screen
 * socket cannot repeat it.
 *
 * `kind` is `token` for a loopback/`--insecure` dashboard, which is what this
 * app pairs with today. The `ticket` form exists for the gated-OAuth mode the
 * README writes off: a ticket is single-use with a 30-second life, so it
 * cannot be cached and must be minted per connect.
 */
export function socketUrlFor(
  baseUrl: string,
  path: string,
  credential: { kind: "token" | "ticket"; value: string },
): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const query = `${credential.kind}=${encodeURIComponent(credential.value)}`;
  return `${wsBase(baseUrl)}${suffix}${suffix.includes("?") ? "&" : "?"}${query}`;
}

export function eventsUrlFor(
  baseUrl: string,
  credential: { kind: "token" | "ticket"; value: string },
): string {
  return socketUrlFor(baseUrl, "/v1/events", credential);
}
