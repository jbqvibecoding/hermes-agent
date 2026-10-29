/**
 * Pointing the phone at the operator's own Hermes.
 *
 * The screen a self-hosted product is usually lost on. Everything here exists
 * to avoid the single message "could not connect", which is true of five
 * different problems with five different fixes — `src/connection.ts` names
 * them and this screen shows the name.
 */

import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { checkReachable } from "../src/connection";
import { saveCredentials } from "../src/session";

export default function Connect() {
  const router = useRouter();
  const [host, setHost] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function connect() {
    setBusy(true);
    setProblem("");
    const result = await checkReachable(host, token, (url, init) => fetch(url, init));
    setBusy(false);
    if (!result.ok) {
      setProblem(result.detail);
      return;
    }
    await saveCredentials({ baseUrl: result.baseUrl, token: token.trim() });
    router.replace("/");
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#0f1115" }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text style={{ color: "#e9e9e9", fontSize: 15, lineHeight: 22 }}>
        On the machine running Hermes, start the dashboard so this phone can see it:
      </Text>
      <Text style={{ color: "#9aa0a6", fontFamily: "monospace", fontSize: 13 }}>
        hermes dashboard --host 0.0.0.0
      </Text>
      <Text style={{ color: "#9aa0a6", fontSize: 13, lineHeight: 20 }}>
        Set HERMES_DASHBOARD_SESSION_TOKEN there too — without it the token is
        regenerated on every restart and cannot be typed in.
      </Text>

      <Text style={{ color: "#9aa0a6", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Address</Text>
      <TextInput
        value={host}
        onChangeText={setHost}
        placeholder="10.0.0.5:8787"
        placeholderTextColor="#5f6368"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={input}
      />

      <Text style={{ color: "#9aa0a6", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>Token</Text>
      <TextInput
        value={token}
        onChangeText={setToken}
        placeholder="HERMES_DASHBOARD_SESSION_TOKEN"
        placeholderTextColor="#5f6368"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        style={input}
      />

      <Pressable onPress={() => void connect()} disabled={busy} style={button}>
        {busy ? <ActivityIndicator color="#e9e9e9" /> : <Text style={{ color: "#e9e9e9", fontWeight: "600" }}>Connect</Text>}
      </Pressable>

      {problem ? (
        <View style={{ padding: 12, borderRadius: 8, backgroundColor: "rgba(239,83,80,0.12)" }}>
          <Text style={{ color: "#ef9a9a", fontSize: 13, lineHeight: 20 }}>{problem}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const input = {
  borderWidth: 1,
  borderColor: "#2a2d33",
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: "#e9e9e9",
  fontSize: 15,
} as const;

const button = {
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  borderRadius: 8,
  backgroundColor: "#2a2d33",
} as const;
