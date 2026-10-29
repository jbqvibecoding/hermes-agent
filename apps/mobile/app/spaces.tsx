/**
 * Spaces, and the pages in one.
 *
 * Two levels in one screen rather than two routes: a Space is usually picked
 * once and then its pages are what the person is actually after, so a back
 * button between them would be a tap they pay on every visit.
 *
 * The search box is wired from the first version because `listPages` already
 * takes a server-side query, and scrolling a long page list with a thumb is
 * worse than typing two letters.
 */

import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PageSummary, Space } from "@hermes/crew-ui/domain";
import { useCrew } from "../src/crew";

const C = {
  text: "#e9e9e9", dim: "#9aa0a6", faint: "#5f6368",
  bg: "#0f1115", line: "#1c1f24", chrome: "#2a2d33",
};

export default function Spaces() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { client } = useCrew();

  const [spaces, setSpaces] = useState<Space[] | null>(null);
  const [spaceId, setSpaceId] = useState("");
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState<PageSummary[] | null>(null);
  const [problem, setProblem] = useState("");

  useEffect(() => {
    let alive = true;
    void client.listSpaces()
      .then((found) => {
        if (!alive) return;
        setSpaces(found);
        // One Space is the common case; making them tap it first would be
        // ceremony.
        if (found.length === 1 && found[0]) setSpaceId(found[0].id);
      })
      .catch((reason: unknown) => {
        if (alive) setProblem(reason instanceof Error ? reason.message : "Could not read your Spaces.");
      });
    return () => { alive = false; };
  }, [client]);

  const loadPages = useCallback(
    (id: string, text: string, signal: AbortSignal) => {
      if (!id) return;
      void client.listPages(id, text, signal)
        .then(setPages)
        .catch((reason: unknown) => {
          // An aborted search is the next keystroke, not a failure.
          if (signal.aborted) return;
          setProblem(reason instanceof Error ? reason.message : "Could not read that Space.");
        });
    },
    [client],
  );

  useEffect(() => {
    if (!spaceId) return;
    const controller = new AbortController();
    // Debounced so a search is one request per pause, not one per letter —
    // which matters more on a phone connection than on a desk.
    const timer = setTimeout(() => loadPages(spaceId, query, controller.signal), 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [spaceId, query, loadPages]);

  if (spaces === null) {
    return <View style={styles.centre}><ActivityIndicator color={C.text} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {spaces.length > 1 ? (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.spaceStrip}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8, alignItems: "center" }}
          data={spaces}
          keyExtractor={(space) => space.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => { setSpaceId(item.id); setPages(null); }}
              style={[styles.spaceTab, item.id === spaceId ? styles.spaceTabOn : null]}
            >
              <Text style={item.id === spaceId ? styles.spaceTabTextOn : styles.spaceTabText}>
                {item.name}
              </Text>
            </Pressable>
          )}
        />
      ) : null}

      {spaceId ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search pages"
          placeholderTextColor={C.faint}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.search}
        />
      ) : null}

      {problem ? <Text style={styles.problem}>{problem}</Text> : null}

      {!spaceId ? (
        <Text style={styles.empty}>
          {spaces.length === 0
            ? "No Spaces yet. Make one from the dashboard."
            : "Pick a Space."}
        </Text>
      ) : pages === null ? (
        <View style={styles.centre}><ActivityIndicator color={C.text} /></View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          data={pages}
          keyExtractor={(page) => page.id}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {query ? "Nothing matches that." : "This Space has no pages yet."}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/space/${item.space_id}/${item.id}`)}
              style={styles.row}
            >
              <Text style={styles.title} numberOfLines={1}>{item.title || "Untitled"}</Text>
              <Text style={styles.sub} numberOfLines={1}>
                {/* Who wrote it last matters in a shared document: "a teammate
                    changed this while I was out" is the question this answers. */}
                {item.created_by ? `by ${item.created_by}` : "by you"}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: C.bg },
  spaceStrip: { flexGrow: 0, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  spaceTab: {
    minHeight: 34, paddingHorizontal: 12, justifyContent: "center",
    borderRadius: 17, borderWidth: 1, borderColor: C.chrome,
  },
  spaceTabOn: { backgroundColor: C.chrome },
  spaceTabText: { color: C.dim, fontSize: 13 },
  spaceTabTextOn: { color: C.text, fontSize: 13, fontWeight: "600" },
  search: {
    margin: 12, minHeight: 44,
    borderWidth: 1, borderColor: C.chrome, borderRadius: 10,
    paddingHorizontal: 12, color: C.text, fontSize: 15,
  },
  row: {
    minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, justifyContent: "center",
    borderBottomWidth: 1, borderBottomColor: C.line,
  },
  title: { color: C.text, fontSize: 15, fontWeight: "600" },
  sub: { color: C.dim, fontSize: 13, marginTop: 2 },
  empty: { color: C.dim, padding: 24, fontSize: 15, lineHeight: 22 },
  problem: { color: "#ef9a9a", paddingHorizontal: 16, paddingBottom: 8, fontSize: 13 },
});
