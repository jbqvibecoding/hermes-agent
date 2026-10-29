/**
 * One Space page, read and written from a phone.
 *
 * The saving is `PageAutosave` from `@hermes/crew-ui/state`, unchanged — it is
 * already shared, already tested, and its revision handling is the load-bearing
 * part. This screen is the editor around it plus the two things a phone adds:
 * a flush before the OS takes the app away, and a conflict the operator
 * resolves by hand.
 */

import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ActivityIndicator, AppState, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PageAutosave } from "@hermes/crew-ui/state";
import { shouldFlushOnBackground, statusLabel } from "../../../src/draft";
import { useCrew } from "../../../src/crew";

const C = {
  text: "#e9e9e9", dim: "#9aa0a6", faint: "#5f6368",
  bg: "#0f1115", line: "#2a2d33", warn: "#fbbf24",
};

export default function PageEditor() {
  const { spaceId, pageId } = useLocalSearchParams<{ spaceId: string; pageId: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { client } = useCrew();
  const [problem, setProblem] = useState("");

  const autosave = useMemo(
    () => new PageAutosave((id, patch, signal) => client.patchPage(spaceId, id, patch, signal)),
    [client, spaceId],
  );
  const state = useSyncExternalStore(autosave.subscribe, autosave.getSnapshot);
  const statusRef = useRef(state.status);
  statusRef.current = state.status;

  useEffect(() => {
    let alive = true;
    void client.getPage(spaceId, pageId)
      .then((page) => { if (alive) autosave.receive(page); })
      .catch((reason: unknown) => {
        if (alive) setProblem(reason instanceof Error ? reason.message : "Could not open that page.");
      });
    return () => { alive = false; autosave.dispose(); };
  }, [client, spaceId, pageId, autosave]);

  /**
   * The phone-only hazard. The autosave is debounced; on the web a tab stays
   * alive so the timer fires, but an OS can suspend or kill this app the moment
   * the operator switches away and the typed text is simply gone.
   *
   * `AppState` directly rather than `PlatformBridge`: that seam answers the
   * controller's question — am I in front of the person, am I online — and only
   * fires on *becoming* active. Widening it would mean editing crew-ui, and a
   * dashboard-bundle rebuild, for something one screen needs.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") return;
      if (shouldFlushOnBackground(statusRef.current)) void autosave.flush().catch(() => undefined);
    });
    return () => subscription.remove();
  }, [autosave]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: state.draft?.title || "" });
  }, [navigation, state.draft?.title]);

  if (problem) {
    return <View style={styles.centre}><Text style={styles.problem}>{problem}</Text></View>;
  }
  if (!state.draft) {
    return <View style={styles.centre}><ActivityIndicator color={C.text} /></View>;
  }

  const conflicted = state.status === "conflict";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {conflicted ? (
        <View style={styles.conflict}>
          <Text style={styles.conflictText}>
            Somebody else changed this page while you were editing. Your version is
            still here — choose which one to keep.
          </Text>
          <View style={styles.conflictButtons}>
            {/* Never resolved on a timer. `useLatest()` is the only thing in
                PageAutosave that discards work, so it only ever runs because a
                person pressed it. */}
            <Pressable onPress={() => autosave.useLatest()} style={styles.button}>
              <Text style={styles.buttonText}>Take theirs</Text>
            </Pressable>
            <Pressable onPress={() => void autosave.flush(true)} style={styles.button}>
              <Text style={styles.buttonText}>Keep mine</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 24, gap: 12 }}
        keyboardDismissMode="interactive"
      >
        <TextInput
          value={state.draft.title}
          onChangeText={(title) => autosave.edit({ title })}
          placeholder="Title"
          placeholderTextColor={C.faint}
          style={styles.title}
        />
        {/* The markdown source, not a rich editor — the desktop's is a plain
            textarea too, and a phone is the wrong place to invent a second
            editing model for the same document. */}
        <TextInput
          value={state.draft.content}
          onChangeText={(content) => autosave.edit({ content })}
          placeholder="Write something"
          placeholderTextColor={C.faint}
          multiline
          textAlignVertical="top"
          style={styles.body}
        />
      </ScrollView>

      <View style={[styles.statusBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {/* The whole save indicator: a phone has no room for a toolbar, so it
            has to be one honest line. */}
        <Text style={[styles.status, conflicted ? styles.statusWarn : null]}>
          {statusLabel(state)}
        </Text>
        {state.status === "dirty" ? (
          <Pressable onPress={() => void autosave.flush()} hitSlop={8}>
            <Text style={styles.saveNow}>Save now</Text>
          </Pressable>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg, padding: 24 },
  problem: { color: "#ef9a9a", fontSize: 15, lineHeight: 22, textAlign: "center" },
  title: { color: C.text, fontSize: 20, fontWeight: "700", paddingVertical: 4 },
  body: { color: C.text, fontSize: 15, lineHeight: 22, minHeight: 320 },
  statusBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: C.line,
  },
  status: { color: C.dim, fontSize: 12 },
  statusWarn: { color: C.warn },
  saveNow: { color: "#8ab4f8", fontSize: 12 },
  conflict: {
    margin: 12, padding: 12, gap: 10, borderRadius: 10,
    borderWidth: 1, borderColor: "rgba(251,191,36,0.4)",
    backgroundColor: "rgba(251,191,36,0.10)",
  },
  conflictText: { color: C.text, fontSize: 13, lineHeight: 19 },
  conflictButtons: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
  button: {
    minHeight: 40, minWidth: 100, alignItems: "center", justifyContent: "center",
    borderRadius: 8, borderWidth: 1, borderColor: C.line,
  },
  buttonText: { color: C.text, fontSize: 14, fontWeight: "600" },
});
