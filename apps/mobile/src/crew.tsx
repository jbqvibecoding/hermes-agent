/**
 * One controller for the whole app.
 *
 * `useCrewController` holds the websocket and the per-agent snapshot cache, and
 * `sendMessage` returns early unless the controller's own `selectedAgentId` and
 * `conversationId` are set. A controller built inside a screen — which is what
 * `app/index.tsx` did first — opens a second socket the moment you navigate and
 * throws the cache away, so it lives here and every screen reads the same one.
 *
 * The raw client comes along beside it because two things need it directly:
 * the approvals screen lists across *all* teammates (which the controller, being
 * scoped to the selected one, cannot do), and the login chip submits a secret.
 */

import type { HermesCrewClient } from "@hermes/crew-ui/client";
import { useCrewController } from "@hermes/crew-ui/state";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { createPlatformBridge } from "./platform";
import { createClient, loadCredentials, type Credentials } from "./session";

type Controller = ReturnType<typeof useCrewController>;

interface CrewContextValue {
  crew: Controller;
  client: HermesCrewClient;
  /** Cleared on sign-out so the next launch goes back to Connect. */
  credentials: Credentials;
}

const CrewContext = createContext<CrewContextValue | null>(null);

export function useCrew(): CrewContextValue {
  const value = useContext(CrewContext);
  // A screen rendered outside the provider is a wiring mistake, and failing
  // loudly here beats every screen having to handle a null controller.
  if (!value) throw new Error("useCrew() outside CrewProvider");
  return value;
}

/**
 * `null` while the keystore is being read, and `"unpaired"` when there is
 * nothing in it — the caller sends an unpaired launch to Connect rather than
 * rendering a controller with no server to talk to.
 */
export type CredentialState = Credentials | "unpaired" | null;

export function useCredentials(): CredentialState {
  const [state, setState] = useState<CredentialState>(null);
  useEffect(() => {
    let alive = true;
    void loadCredentials().then((found) => {
      if (alive) setState(found ?? "unpaired");
    });
    return () => { alive = false; };
  }, []);
  return state;
}

export function CrewProvider({
  credentials, children,
}: {
  credentials: Credentials;
  children: ReactNode;
}) {
  // Keyed on the credentials: re-pairing to a different host must build a new
  // client rather than keep talking to the old one.
  const client = useMemo(() => createClient(credentials), [credentials]);
  const platform = useMemo(() => createPlatformBridge(), []);
  const crew = useCrewController(client, { platform });

  const value = useMemo(
    () => ({ crew, client, credentials }),
    [crew, client, credentials],
  );
  return <CrewContext.Provider value={value}>{children}</CrewContext.Provider>;
}
