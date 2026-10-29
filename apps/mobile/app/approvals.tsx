/**
 * What needs the operator, across the whole crew.
 *
 * The reason a phone app exists at all, so it is reachable from the roster
 * header rather than down inside a thread. Everything decidable about it lives
 * in `src/approvals.ts`, which is tested; this draws it.
 *
 * `source` is shown on every card because its own type comment says it is what
 * "stops an operator hunting through threads to find out what they are being
 * asked about" — more true on a phone, where there is no second window to go
 * and look in.
 */

import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, Text, TextInput, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ApprovalRequest } from "@hermes/crew-ui/domain";
import { decide, pendingByAgent } from "../src/approvals";
import { useCrew } from "../src/crew";

export default function Approvals() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { crew, client } = useCrew();
  const [all, setAll] = useState<ApprovalRequest[] | null>(null);
  const [problem, setProblem] = useState("");

  const reload = useCallback(async () => {
    try {
      setAll(await client.listApprovalRequests());
    } catch (reason) {
      setProblem(reason instanceof Error ? reason.message : "Could not read what is waiting.");
    }
  }, [client]);

  useEffect(() => { void reload(); }, [reload]);

  if (all === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#e9e9e9" />
      </View>
    );
  }

  const groups = pendingByAgent(all, crew.agents);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24, gap: 12 }}
    >
      {problem ? (
        <Text style={{ color: "#ef9a9a", fontSize: 14, lineHeight: 20 }}>{problem}</Text>
      ) : null}

      {groups.length === 0 ? (
        <Text style={{ color: "#9aa0a6", padding: 12, fontSize: 15, lineHeight: 22 }}>
          Nothing is waiting on you.
        </Text>
      ) : null}

      {groups.map((group) => (
        <View key={group.agentId} style={{ gap: 10 }}>
          <Pressable onPress={() => router.push(`/agent/${group.agentId}`)}>
            <Text style={{ color: "#9aa0a6", fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}>
              {group.agentName}
            </Text>
          </Pressable>
          {group.items.map((approval) => (
            <Card
              key={approval.id}
              approval={approval}
              onDecide={async (decision, note) => {
                const outcome = await decide(
                  crew.respondToApproval, approval, decision, note,
                );
                // Re-read either way. On success the card is settled; on a
                // conflict the version in hand is not the one the server has,
                // and the next render must show the server's.
                await reload();
                return outcome;
              }}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

function Card({
  approval, onDecide,
}: {
  approval: ApprovalRequest;
  onDecide(
    decision: "allow" | "deny",
    note: string,
  ): Promise<{ ok: boolean; stale?: boolean; message?: string }>;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState("");

  async function answer(decision: "allow" | "deny") {
    setBusy(true);
    setRefused("");
    const outcome = await onDecide(decision, note);
    setBusy(false);
    // The server's own sentence, not one of ours. "The card changed since you
    // read it" and "that was already decided" are both 409s and only the
    // message tells them apart — matching its prose to classify them would
    // break the day it is reworded.
    if (!outcome.ok) setRefused(outcome.message ?? "That did not go through.");
  }

  return (
    <View
      style={{
        borderWidth: 1, borderColor: "#2a2d33", borderRadius: 10,
        backgroundColor: "#17191e", padding: 14, gap: 8,
      }}
    >
      <Text style={{ color: "#e9e9e9", fontSize: 15, fontWeight: "600", lineHeight: 21 }}>
        {approval.title}
      </Text>
      {approval.description ? (
        <Text style={{ color: "#c9ccd1", fontSize: 14, lineHeight: 20 }}>
          {approval.description}
        </Text>
      ) : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {approval.source ? <Tag text={approval.source} /> : null}
        {approval.tool ? <Tag text={approval.tool} /> : null}
        {approval.scope.map((item) => <Tag key={item} text={item} />)}
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Add a note (optional)"
        placeholderTextColor="#5f6368"
        multiline
        style={{
          borderWidth: 1, borderColor: "#2a2d33", borderRadius: 8,
          paddingHorizontal: 10, paddingVertical: 8,
          color: "#e9e9e9", fontSize: 14, minHeight: 40,
        }}
      />
      {/* The note is not decoration: it reaches the teammate through the
          continuation seed, so "yes, but use the finance address" is an
          instruction and not just a record. */}

      <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end" }}>
        <Pressable
          onPress={() => void answer("deny")}
          disabled={busy}
          style={{
            minHeight: 44, minWidth: 96, alignItems: "center", justifyContent: "center",
            borderRadius: 8, borderWidth: 1, borderColor: "#5c2b2b",
          }}
        >
          <Text style={{ color: "#ef9a9a", fontSize: 15 }}>Discard</Text>
        </Pressable>
        <Pressable
          onPress={() => void answer("allow")}
          disabled={busy}
          style={{
            minHeight: 44, minWidth: 96, alignItems: "center", justifyContent: "center",
            borderRadius: 8, backgroundColor: "#2a2d33",
          }}
        >
          {busy
            ? <ActivityIndicator color="#e9e9e9" />
            : <Text style={{ color: "#e9e9e9", fontSize: 15, fontWeight: "600" }}>Approve</Text>}
        </Pressable>
      </View>

      {refused ? (
        <View style={{ padding: 10, borderRadius: 8, backgroundColor: "rgba(239,83,80,0.12)" }}>
          <Text style={{ color: "#ef9a9a", fontSize: 13, lineHeight: 19 }}>{refused}</Text>
        </View>
      ) : null}
    </View>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <Text
      style={{
        color: "#9aa0a6", fontSize: 11,
        paddingHorizontal: 7, paddingVertical: 3,
        borderRadius: 5, backgroundColor: "#22252b",
      }}
    >
      {text}
    </Text>
  );
}
