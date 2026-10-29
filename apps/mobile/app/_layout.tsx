/**
 * The navigation stack, and the one place the controller is built.
 *
 * The desktop is a three-column grid with a 720px minimum — roster, thread,
 * details. None of that fits a phone, and shrinking it gives three unusable
 * columns, so the same information becomes a back-stack: roster → thread →
 * details, one at a time. That is how every messaging app on a phone works and
 * it matches the data model exactly.
 *
 * `connect` is deliberately *outside* the provider: it is the screen that has
 * to work when there are no credentials to build a client from.
 */

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CrewProvider, useCredentials } from "../src/crew";

const BACKGROUND = "#0f1115";

function Screens() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: BACKGROUND },
        headerTintColor: "#e9e9e9",
        contentStyle: { backgroundColor: BACKGROUND },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Crew" }} />
      <Stack.Screen name="approvals" options={{ title: "Needs you" }} />
      <Stack.Screen name="agent/[id]" options={{ title: "" }} />
      <Stack.Screen name="spaces" options={{ title: "Documents" }} />
      <Stack.Screen name="space/[spaceId]/[pageId]" options={{ title: "" }} />
      <Stack.Screen name="connect" options={{ title: "Connect", presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const credentials = useCredentials();

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {credentials === null ? (
        // Reading the keystore. Rendering the stack first and the provider a
        // beat later would mount the roster without a controller.
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BACKGROUND }}>
          <ActivityIndicator color="#e9e9e9" />
        </View>
      ) : credentials === "unpaired" ? (
        <Screens />
      ) : (
        // Keyed on the host so re-pairing to a different Hermes remounts
        // rather than keeping a client pointed at the old one. The remount is
        // the point, not a cost.
        <CrewProvider key={credentials.baseUrl} credentials={credentials}>
          <Screens />
        </CrewProvider>
      )}
    </SafeAreaProvider>
  );
}
