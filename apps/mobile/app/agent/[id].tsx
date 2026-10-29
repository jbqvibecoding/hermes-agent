/**
 * One teammate's thread.
 *
 * The desktop's middle column. The parts model comes across unchanged — a
 * message is a list of `text` / `chip` / `activity` parts — so this renders
 * what the server already sends rather than reshaping it for mobile.
 */

import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform,
  Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Message } from "@hermes/crew-ui/domain";
import { ChipView } from "../../src/chips";
import { useCrew } from "../../src/crew";
import { Markdown } from "../../src/Markdown";

const C = {
  text: "#e9e9e9", dim: "#9aa0a6", faint: "#5f6368",
  bg: "#0f1115", surface: "#17191e", line: "#2a2d33", mine: "#23262c",
};

export default function Thread() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { crew } = useCrew();
  const [draft, setDraft] = useState("");
  const listRef = useRef<FlatList<Message>>(null);

  // The route names the teammate; the controller owns the selection, because
  // `sendMessage` reads it and the snapshot cache is keyed on it.
  useEffect(() => {
    if (id && crew.selectedAgentId !== id) crew.setSelectedAgentId(id);
  }, [id, crew.selectedAgentId, crew.setSelectedAgentId]);

  const agent = crew.agents.find((candidate) => candidate.id === id);

  useLayoutEffect(() => {
    navigation.setOptions({ title: agent?.name ?? "" });
  }, [navigation, agent?.name]);

  // Until the controller has caught up, this would be the *previous*
  // teammate's messages under this one's name — which is worse than a spinner.
  const ready = crew.selectedAgentId === id && !crew.conversationLoading;

  if (!ready) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={C.text} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      // iOS lifts the whole view; Android's window already resizes, and
      // doubling up there pushes the composer off the top of the keyboard.
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <FlatList
        ref={listRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12, gap: 10 }}
        data={crew.messages}
        keyExtractor={(message) => message.id}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <Text style={styles.empty}>Nothing here yet. Ask for something.</Text>
        }
        renderItem={({ item }) => <MessageView message={item} />}
      />

      <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={`Message ${agent?.name ?? "your teammate"}`}
          placeholderTextColor={C.faint}
          multiline
          style={styles.input}
        />
        <Pressable
          onPress={() => {
            const text = draft.trim();
            if (!text) return;
            // Cleared first: the controller writes an optimistic bubble, so
            // leaving the draft in place shows the same words twice.
            setDraft("");
            void crew.sendMessage(text).catch(() => undefined);
          }}
          disabled={!draft.trim()}
          style={styles.send}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function MessageView({ message }: { message: Message }) {
  const mine = message.role === "user";
  const chips = message.parts.filter((part) => part.type === "chip");
  const text = message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { text: string }).text)
    .join("\n")
    .trim();
  const working = message.parts.some((part) => part.type === "activity");

  return (
    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
      {text ? (
        mine
          // The operator's own words are not markdown and should not be
          // reinterpreted as it — a stray asterisk is an asterisk.
          ? <Text style={styles.plain}>{text}</Text>
          : <Markdown source={text} />
      ) : null}

      {working && !text ? (
        <View style={styles.row}>
          <ActivityIndicator color={C.dim} size="small" />
          <Text style={styles.working}>Working…</Text>
        </View>
      ) : null}

      {/* `filter` narrows to ChipPart, so no cast: the part already carries
          the kind, the payload and the turnId the report chip needs. */}
      {chips.map((chip, index) => (
        <ChipView
          key={`${message.id}:${index}`}
          kind={chip.kind}
          payload={chip.payload}
          turnId={chip.turnId}
        />
      ))}

      {message.interrupted ? <Text style={styles.working}>Stopped.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  empty: { color: C.dim, padding: 24, fontSize: 15 },
  bubble: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, maxWidth: "92%" },
  // The operator right, the teammate left — the one convention a phone user
  // reads without being told.
  bubbleMine: { alignSelf: "flex-end", backgroundColor: C.mine },
  bubbleTheirs: { alignSelf: "flex-start", backgroundColor: "transparent", paddingHorizontal: 0 },
  plain: { color: C.text, fontSize: 15, lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  working: { color: C.dim, fontSize: 13 },
  composer: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    paddingHorizontal: 12, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg,
  },
  input: {
    flex: 1, maxHeight: 120, minHeight: 44,
    borderWidth: 1, borderColor: C.line, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    color: C.text, fontSize: 15,
  },
  send: {
    minHeight: 44, paddingHorizontal: 16,
    alignItems: "center", justifyContent: "center",
    borderRadius: 10, backgroundColor: C.line,
  },
  sendText: { color: C.text, fontSize: 15, fontWeight: "600" },
});
