/**
 * The navigation stack, which is the mobile form's central decision.
 *
 * The desktop is a three-column grid with a 720px minimum — a roster beside a
 * thread beside a details panel. None of that fits on a phone, and shrinking
 * it would give a 390px screen three unusable columns. So the same information
 * becomes a back-stack: roster → thread → details, one at a time, which is how
 * every messaging app on a phone works and matches the data model exactly
 * (a teammate has threads; a thread has a turn's details).
 *
 * `connect` sits outside that stack as a modal: it is the one screen that must
 * be reachable when nothing else works.
 */

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: "#0f1115" }, headerTintColor: "#e9e9e9" }}>
        <Stack.Screen name="index" options={{ title: "Crew" }} />
        <Stack.Screen name="agent/[id]" options={{ title: "" }} />
        <Stack.Screen name="connect" options={{ title: "Connect", presentation: "modal" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
