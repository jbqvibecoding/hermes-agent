import type { ExpoConfig } from "expo/config";

/**
 * The phone surface for the Crew workspace.
 *
 * `scheme` is here so a future "open this approval" deep link has somewhere to
 * land; nothing uses it yet, and it costs nothing to reserve the name now
 * rather than migrate installed apps later.
 */
const config: ExpoConfig = {
  name: "Hermes Crew",
  slug: "hermes-crew",
  scheme: "hermescrew",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  plugins: ["expo-router", "expo-secure-store"],
  ios: { supportsTablet: true },
};

export default config;
