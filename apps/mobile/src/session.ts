/**
 * Where the phone keeps what it needs to reach Hermes, and how it builds the
 * client from it.
 *
 * The token is a bearer credential for the operator's whole dashboard, so it
 * goes in the platform keystore (`expo-secure-store` → Keychain / Keystore),
 * never in AsyncStorage. The base URL is not secret and is kept beside it only
 * because reading one store is simpler than two.
 *
 * The client itself is `@hermes/crew-ui/client`, unchanged — `HermesCrewClient`
 * already took an injectable `headers()` "so the desktop app's session token
 * rides here", and that is exactly the seam a phone needs. Nothing about the
 * REST surface or the event stream is rewritten for mobile.
 */

import { HermesCrewClient } from "@hermes/crew-ui/client";
import { eventsUrlFor } from "./connection";
import * as SecureStore from "expo-secure-store";

const BASE_URL_KEY = "crew.baseUrl";
const TOKEN_KEY = "crew.token";

export interface Credentials {
  baseUrl: string;
  token: string;
}

/**
 * SecureStore throws rather than returning null on some devices (a locked
 * keychain, a restored backup from another device). A paired phone that
 * reports itself unpaired sends the operator to the connect screen, which is
 * recoverable; an unhandled throw at launch is a crash on open.
 */
export async function loadCredentials(): Promise<Credentials | null> {
  try {
    const [baseUrl, token] = await Promise.all([
      SecureStore.getItemAsync(BASE_URL_KEY),
      SecureStore.getItemAsync(TOKEN_KEY),
    ]);
    if (!baseUrl || !token) return null;
    return { baseUrl, token };
  } catch {
    return null;
  }
}

export async function saveCredentials({ baseUrl, token }: Credentials): Promise<void> {
  await SecureStore.setItemAsync(BASE_URL_KEY, baseUrl);
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    // The token is only ever used while the person is looking at the app, so
    // it does not need to be readable while the device is locked.
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function forgetCredentials(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(BASE_URL_KEY),
    SecureStore.deleteItemAsync(TOKEN_KEY),
  ]);
}

/**
 * The websocket URL, derived rather than stored.
 *
 * `defaultEventsUrl` reads `globalThis.location` on the web and falls back to
 * loopback, which is wrong for a phone — so the base URL is passed explicitly.
 * It is also re-derived on every connect rather than cached, matching the
 * dashboard's reason: a cached ticket makes the first reconnect a 401.
 */
export function createClient({ baseUrl, token }: Credentials): HermesCrewClient {
  return new HermesCrewClient({
    baseUrl,
    eventsUrl: eventsUrlFor(baseUrl),
    headers: () => ({ Authorization: `Bearer ${token}` }),
  });
}
