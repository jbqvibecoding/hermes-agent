/**
 * The roster — the desktop's left column, now the stack's root.
 *
 * It carries the thing a phone is actually for: the count of what needs the
 * operator. On the desktop that lives in a panel they already have open; here
 * it has to be visible on the first screen, because the reason to pick the
 * phone up at all is usually that something is waiting.
 */

import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCrewController } from "@hermes/crew-ui/state";
import { createPlatformBridge } from "../src/platform";
import { createClient, loadCredentials, type Credentials } from "../src/session";

export default function Roster() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    void loadCredentials().then((found) => {
      setCredentials(found);
      setChecked(true);
      if (!found) router.replace("/connect");
    });
  }, [router]);

  // Both memoised on the credentials: a new client every render would open a
  // new websocket every render.
  const client = useMemo(() => (credentials ? createClient(credentials) : null), [credentials]);
  const platform = useMemo(() => createPlatformBridge(), []);

  if (!checked || !client) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f1115" }}>
        <ActivityIndicator color="#e9e9e9" />
      </View>
    );
  }
  return <RosterList client={client} platform={platform} bottomInset={insets.bottom} />;
}

function RosterList({
  client, platform, bottomInset,
}: {
  client: NonNullable<ReturnType<typeof createClient>>;
  platform: ReturnType<typeof createPlatformBridge>;
  bottomInset: number;
}) {
  const router = useRouter();
  // The same controller the dashboard and the desktop app run. The only thing
  // mobile hands it that they do not is the bridge.
  const crew = useCrewController(client, { platform });

  if (crew.loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0f1115" }}>
        <ActivityIndicator color="#e9e9e9" />
      </View>
    );
  }

  if (crew.error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12, backgroundColor: "#0f1115" }}>
        <Text style={{ color: "#ef9a9a", fontSize: 15 }}>{crew.error}</Text>
        <Pressable onPress={() => router.push("/connect")}>
          <Text style={{ color: "#8ab4f8", fontSize: 15 }}>Change the address or token</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: "#0f1115" }}
      contentContainerStyle={{ paddingBottom: bottomInset + 16 }}
      data={crew.agents}
      keyExtractor={(agent) => agent.id}
      ListEmptyComponent={
        <Text style={{ color: "#9aa0a6", padding: 24, fontSize: 15 }}>
          No teammates yet. Hire one from the dashboard.
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/agent/${item.id}`)}
          // 56 is the smallest row that is comfortably tappable; the desktop's
          // 32px list row is a mouse target, not a thumb one.
          style={{
            minHeight: 56, paddingHorizontal: 16, paddingVertical: 10,
            flexDirection: "row", alignItems: "center", gap: 12,
            borderBottomWidth: 1, borderBottomColor: "#1c1f24",
          }}
        >
          <Text style={{ fontSize: 22 }}>{item.avatar || "🤖"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#e9e9e9", fontSize: 15, fontWeight: "600" }} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={{ color: "#9aa0a6", fontSize: 13 }} numberOfLines={1}>
              {item.lastMessagePreview || item.role}
            </Text>
          </View>
          {item.unreadCount > 0 ? (
            <View style={{ minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 11, backgroundColor: "#2a2d33" }}>
              <Text style={{ color: "#e9e9e9", fontSize: 12, textAlign: "center" }}>{item.unreadCount}</Text>
            </View>
          ) : null}
        </Pressable>
      )}
    />
  );
}
