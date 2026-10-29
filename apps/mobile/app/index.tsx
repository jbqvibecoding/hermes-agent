/**
 * The roster — the desktop's left column, now the stack's root.
 *
 * It carries the thing a phone is actually for, at the top where it cannot be
 * missed: how many held actions are waiting across the whole crew. On a desk
 * that lives in a panel the operator already has open; here the reason to pick
 * the phone up at all is usually that something is waiting.
 */

import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ApprovalRequest } from "@hermes/crew-ui/domain";
import { pendingByAgent } from "../src/approvals";
import { useCrew, useCredentials } from "../src/crew";

export default function Index() {
  const credentials = useCredentials();
  if (credentials === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#e9e9e9" />
      </View>
    );
  }
  if (credentials === "unpaired") return <Redirect href="/connect" />;
  return <Roster />;
}

function Roster() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { crew, client } = useCrew();
  const [pending, setPending] = useState<ApprovalRequest[]>([]);

  // Across every teammate, which the controller cannot do — it is scoped to
  // the selected one. `listApprovalRequests()` with no agent already returns
  // the lot (plugin_api.py passes `agentId or None` straight through), so this
  // needs no new route and no fan-out.
  useEffect(() => {
    let alive = true;
    const read = () => {
      void client.listApprovalRequests()
        .then((all) => { if (alive) setPending(all); })
        .catch(() => undefined);
    };
    read();
    // Polled rather than pushed: the event stream is per-conversation, so a
    // hold taken in a thread this screen is not looking at would otherwise
    // never appear. Thirty seconds matches the controller's own safety net.
    const timer = setInterval(read, 30_000);
    return () => { alive = false; clearInterval(timer); };
  }, [client, crew.agents.length]);

  const waiting = pendingByAgent(pending, crew.agents)
    .reduce((count, group) => count + group.items.length, 0);

  if (crew.loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#e9e9e9" />
      </View>
    );
  }

  if (crew.error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
        <Text style={{ color: "#ef9a9a", fontSize: 15, lineHeight: 22 }}>{crew.error}</Text>
        <Pressable onPress={() => router.push("/connect")}>
          <Text style={{ color: "#8ab4f8", fontSize: 15 }}>Change the address or token</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      data={crew.agents}
      keyExtractor={(agent) => agent.id}
      ListHeaderComponent={
        waiting > 0 ? (
          <Pressable
            onPress={() => router.push("/approvals")}
            style={{
              margin: 12, padding: 14, borderRadius: 10,
              backgroundColor: "rgba(138,180,248,0.12)",
              borderWidth: 1, borderColor: "rgba(138,180,248,0.35)",
            }}
          >
            <Text style={{ color: "#8ab4f8", fontSize: 15, fontWeight: "600" }}>
              {waiting} {waiting === 1 ? "thing needs" : "things need"} you
            </Text>
            <Text style={{ color: "#9aa0a6", fontSize: 13, marginTop: 2 }}>
              Held until you decide
            </Text>
          </Pressable>
        ) : undefined
      }
      ListEmptyComponent={
        <Text style={{ color: "#9aa0a6", padding: 24, fontSize: 15 }}>
          No teammates yet. Hire one from the dashboard.
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/agent/${item.id}`)}
          // 56 is the smallest comfortably tappable row; the desktop's 32px
          // list row is a mouse target, not a thumb one.
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
