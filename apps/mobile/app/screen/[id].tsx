/**
 * Watching a teammate work, from a phone.
 *
 * A WebView over a page the dashboard serves. Everything that makes this safe
 * is on the far side of it — the proxy authenticates the upgrade and drops
 * every RFB message that would act on the machine — so this file's whole job
 * is to be honest about which of four things is happening, and to say "view
 * only" where somebody can see it before they try to tap something.
 */

import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { WebView } from "react-native-webview";

import { useCrew, useCredentials } from "../../src/crew";
import {
  readScreenState,
  screenMessage,
  screenPageUrl,
  type ScreenState,
} from "../../src/screenUrl";

const C = {
  text: "#e9e9e9", dim: "#9aa0a6", faint: "#5f6368",
  bg: "#0d0f13", surface: "#17191e", line: "#2a2d33", amber: "#fbbf24",
};

export default function ScreenRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const credentials = useCredentials();
  const { crew } = useCrew();
  const [status, setStatus] = useState<ScreenState>({ state: "connecting" });

  const agent = crew.agents.find((candidate) => candidate.id === id);
  // `null` is still loading and `"unpaired"` is a phone with no dashboard;
  // neither can build a URL, and the second needs saying out loud.
  const paired = credentials && credentials !== "unpaired" ? credentials : null;
  const uri = useMemo(
    () => (paired && id ? screenPageUrl(paired, id) : null),
    [paired, id],
  );

  // The page reports its own state; anything we do not recognise is ignored
  // rather than guessed at, so a stray message cannot make the UI lie.
  const onMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    const next = readScreenState(event.nativeEvent.data);
    if (next) setStatus(next);
  }, []);

  useLayoutEffect(() => {
    setStatus({ state: "connecting" });
  }, [uri]);

  const note = screenMessage(status);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: agent?.name ?? "Screen" }} />

      {uri ? (
        <WebView
          source={{ uri }}
          style={styles.web}
          containerStyle={styles.web}
          onMessage={onMessage}
          // The page is ours and does its own panning; the WebView must not
          // add a second, competing scroll surface on top of it.
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          // Nothing on this page is a link, so a navigation is something
          // going wrong rather than something to follow.
          onShouldStartLoadWithRequest={(request) => request.url === uri}
          onError={() =>
            setStatus({ state: "closed", code: 4502, reason: "webview" })
          }
          allowsInlineMediaPlayback
          javaScriptEnabled
        />
      ) : (
        <View style={styles.centre}>
          <Text style={styles.note}>This phone is not paired with a dashboard.</Text>
        </View>
      )}

      {status.state === "connecting" && (
        <View style={styles.centre} pointerEvents="none">
          <ActivityIndicator color={C.dim} />
        </View>
      )}

      {note && (
        <View style={styles.banner} pointerEvents="none">
          <Text style={[styles.note, status.state === "closed" && styles.noteBad]}>
            {note}
          </Text>
        </View>
      )}

      {/* Said plainly, because a screen you can see and cannot touch is
          otherwise indistinguishable from a screen that has frozen. */}
      <View style={styles.badge} pointerEvents="none">
        <Text style={styles.badgeText}>View only · pinch to zoom</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  web: { flex: 1, backgroundColor: C.bg },
  centre: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center" },
  banner: {
    position: "absolute", left: 12, right: 12, bottom: 56,
    padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: C.line, backgroundColor: C.surface,
  },
  note: { color: C.dim, fontSize: 13, lineHeight: 19, textAlign: "center" },
  noteBad: { color: C.amber },
  badge: {
    position: "absolute", left: 0, right: 0, bottom: 0,
    paddingVertical: 8, backgroundColor: "rgba(0,0,0,0.5)",
  },
  badgeText: {
    color: C.faint, fontSize: 11, textAlign: "center",
    textTransform: "uppercase", letterSpacing: 1,
  },
});
