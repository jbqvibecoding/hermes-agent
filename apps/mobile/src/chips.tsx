/**
 * The nine chips, in React Native.
 *
 * Same payloads as `apps/crew-ui/src/ui/chips/index.tsx` — these are written
 * from that file's shapes, not invented — because a chip exists for the reason
 * stated there: some of what a teammate produces is *structured* and loses its
 * meaning as prose.
 *
 * One deliberate difference, and it is the point of this round.
 * `approval_request` **does not decide here.** On the desktop the in-thread
 * chip calls `onDecide(id, decision)` with no content hash, while the details
 * panel sends `approval.contentHash` and the server refuses a mismatch. A
 * phone is the weaker context, so the chip navigates to the approvals screen,
 * which takes the stronger path. Round 11's `offers.ts` rule again: the code
 * draws the card, the model only names which one.
 */

import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import type { ChipKind, StandstillItem, TurnEffect } from "@hermes/crew-ui/domain";
import { useCrew } from "./crew";
import { Markdown } from "./Markdown";

const C = {
  text: "#e9e9e9", dim: "#9aa0a6", faint: "#5f6368",
  surface: "#17191e", line: "#2a2d33", green: "#4ade80", amber: "#fbbf24",
};

function Chip({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <View style={styles.chip}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {children}
    </View>
  );
}

/** "3d" / "4h" / "just now", from whole hours. Mirrors the web helper. */
function age(hours: number): string {
  if (!Number.isFinite(hours) || hours < 1) return "just now";
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}

// ---------------------------------------------------------------------------

function ReportChip({ payload, turnId }: {
  payload: { lines?: { system?: string; result?: string; count?: string }[]; closing?: string };
  turnId?: string;
}) {
  const { client } = useCrew();
  const [effects, setEffects] = useState<TurnEffect[] | null>(null);
  const [open, setOpen] = useState(false);
  const [problem, setProblem] = useState("");

  async function expand() {
    setOpen((was) => !was);
    if (effects !== null || !turnId) return;
    try {
      setEffects((await client.listTurnEffects(turnId)).effects);
    } catch {
      // "Could not ask" must not read as "nothing changed" — that silence is
      // what round 10 built this panel to remove.
      setProblem("Could not load what changed.");
    }
  }

  return (
    <Chip>
      {(payload.lines ?? []).map((line, index) => (
        <View key={index} style={styles.row}>
          <Text style={{ color: C.green, fontSize: 13 }}>✓</Text>
          <Text style={styles.body}>
            <Text style={{ fontWeight: "600" }}>{line.system}</Text>
            <Text style={{ color: C.faint }}> → </Text>
            {line.result}
            {line.count ? <Text style={{ color: C.dim }}> · {line.count}</Text> : null}
          </Text>
        </View>
      ))}
      {payload.closing ? <Text style={styles.closing}>{payload.closing}</Text> : null}

      {turnId ? (
        <View style={styles.divider}>
          <Pressable onPress={() => void expand()} hitSlop={8}>
            <Text style={styles.toggle}>What changed</Text>
          </Pressable>
          {open ? (
            <View style={{ gap: 4, marginTop: 6 }}>
              {problem ? <Text style={styles.note}>{problem}</Text> : null}
              {effects?.length === 0 && !problem ? (
                <Text style={styles.note}>Nothing outside this conversation.</Text>
              ) : null}
              {(effects ?? []).map((effect) => (
                <View key={effect.id || effect.text} style={styles.row}>
                  <Text style={styles.kind}>{effect.kind}</Text>
                  <Text
                    style={[styles.body, effect.undone_at ? styles.struck : null]}
                  >{effect.text}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </Chip>
  );
}

function StandstillChip({ payload }: {
  payload: {
    items?: StandstillItem[];
    could_not?: { source: string; why: string }[];
    spoke?: boolean;
  };
}) {
  const { crew, client } = useCrew();
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState<string[]>([]);
  const [problem, setProblem] = useState("");

  async function resume(item: StandstillItem) {
    if (!item.ref || !crew.selectedAgentId) return;
    setBusy(item.subject);
    setProblem("");
    try {
      await client.setRoutineEnabled(crew.selectedAgentId, item.ref.id, true);
      setDone((was) => [...was, item.subject]);
    } catch (reason) {
      // 409 is a real answer from that route — a one-shot whose time has
      // passed cannot be resumed — and saying so beats a button that looks
      // like it worked.
      setProblem(reason instanceof Error ? reason.message : "Could not resume that.");
    } finally {
      setBusy("");
    }
  }

  return (
    <Chip label="Still waiting">
      {(payload.items ?? []).map((item) => (
        <View key={item.subject} style={styles.row}>
          <Text style={styles.ageCol}>{age(item.stuck_for_hours)}</Text>
          <Text style={styles.body}>{item.summary}</Text>
          {item.kind === "routine_suspended" && item.ref ? (
            done.includes(item.subject)
              ? <Text style={{ color: C.green, fontSize: 11 }}>resumed</Text>
              : (
                <Pressable onPress={() => void resume(item)} disabled={busy === item.subject} style={styles.smallButton}>
                  {busy === item.subject
                    ? <ActivityIndicator color={C.dim} size="small" />
                    : <Text style={styles.smallButtonText}>Resume</Text>}
                </Pressable>
              )
          ) : null}
        </View>
      ))}
      {problem ? <Text style={styles.note}>{problem}</Text> : null}
      {(payload.could_not ?? []).map((entry) => (
        <Text key={entry.source} style={styles.note}>
          Could not check {entry.source} — {entry.why}
        </Text>
      ))}
      {payload.spoke === false ? (
        <View style={styles.divider}>
          <Text style={styles.note}>I could not write this up, so here it is as I found it.</Text>
        </View>
      ) : null}
    </Chip>
  );
}

function ApprovalChip({ payload }: {
  payload: { approval_id?: number; action?: string; detail?: string; status?: string };
}) {
  const router = useRouter();
  const decided = payload.status && payload.status !== "pending";

  return (
    <Chip label={decided ? "Decided" : "Needs you"}>
      <Text style={[styles.body, { fontWeight: "600" }]}>{payload.action || "an action"}</Text>
      {payload.detail ? <Text style={styles.sub}>{payload.detail}</Text> : null}
      {decided ? (
        <Text style={styles.note}>{payload.status}</Text>
      ) : (
        // No buttons here, deliberately. Deciding needs the content hash, and
        // this payload has none — see the module comment.
        <Pressable onPress={() => router.push("/approvals")} style={styles.wideButton}>
          <Text style={styles.wideButtonText}>Read it and decide</Text>
        </Pressable>
      )}
    </Chip>
  );
}

/** Where the page actually is, read off it by the server rather than named by
 * the teammate.
 *
 * This matters more here than on the desktop, and the reason is the phone: the
 * dashboard's card sits next to a "Take the wheel" button, so an operator who
 * is unsure can go and look at the screen. There is no such button on a phone
 * — the teammate's screen is not a surface this app has — so these few
 * characters are the *only* thing standing between the person and typing their
 * password into whatever page a teammate has been talked onto.
 */
function PageItIsOn({ origin, warning }: { origin?: string | null; warning?: string | null }) {
  if (!origin) {
    return (
      <View style={styles.origin}>
        <Text style={styles.originUnknown}>Could not confirm which page this is</Text>
      </View>
    );
  }
  return (
    <View style={[styles.origin, warning ? styles.originOdd : null]}>
      <Text style={styles.originText} numberOfLines={2}>{origin}</Text>
      {warning ? <Text style={styles.originWarning}>{warning}</Text> : null}
    </View>
  );
}

function LoginChip({ payload }: {
  payload: {
    site?: string; why?: string; field?: string; ref?: string; filled?: boolean;
    origin?: string | null; origin_warning?: string | null;
  };
}) {
  const { crew, client } = useCrew();
  const [value, setValue] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!payload.ref || !crew.selectedAgentId) return;
    setBusy(true);
    try {
      await client.submitSecret(crew.selectedAgentId, payload.ref, value);
      setSent(true);
      setValue("");
    } finally {
      setBusy(false);
    }
  }

  if (payload.filled || sent) {
    return <Chip label="Signed in"><Text style={styles.body}>{payload.site}</Text></Chip>;
  }

  return (
    <Chip label="Sign in">
      <PageItIsOn origin={payload.origin} warning={payload.origin_warning} />
      <Text style={[styles.body, { fontWeight: "600" }]}>{payload.site || "a site"}</Text>
      {payload.why ? <Text style={styles.sub}>{payload.why}</Text> : null}
      {/* Masked, and it goes straight to the site. The whole point of this
          chip is that the password never lands in the conversation the
          teammate reads. */}
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={payload.field || "Password"}
        placeholderTextColor={C.faint}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
      <Pressable onPress={() => void submit()} disabled={busy || !value} style={styles.wideButton}>
        {busy
          ? <ActivityIndicator color={C.text} />
          : <Text style={styles.wideButtonText}>Send it to the site</Text>}
      </Pressable>
    </Chip>
  );
}

function ScreenshotChip({ payload }: {
  payload: { url?: string; file?: string; bot_id?: string; caption?: string };
}) {
  const { client, credentials } = useCrew();
  const uri = payload.bot_id && payload.file
    ? client.screenshotUrl(payload.bot_id, payload.file)
    : payload.url;

  if (!uri) return null;
  return (
    <Chip>
      {/* The header has to ride on the request: unlike the dashboard's
          authedFetch, an <Image> makes its own and would otherwise 401. */}
      <Image
        source={{ uri, headers: { Authorization: `Bearer ${credentials.token}` } }}
        style={{ width: "100%", aspectRatio: 16 / 10, borderRadius: 6, backgroundColor: C.surface }}
        resizeMode="contain"
      />
      {payload.caption ? <Text style={styles.sub}>{payload.caption}</Text> : null}
    </Chip>
  );
}

// ---------------------------------------------------------------------------

export function ChipView({ kind, payload, turnId }: {
  kind: ChipKind;
  payload: unknown;
  turnId?: string;
}) {
  // Payloads come from the model by way of `crew/tools.py`, which validates
  // shape but not every field, so each chip reads defensively rather than
  // letting one missing key blank the thread.
  const data = (payload ?? {}) as Record<string, never>;
  switch (kind) {
    case "report": return <ReportChip payload={data} turnId={turnId} />;
    case "standstill": return <StandstillChip payload={data} />;
    case "approval_request": return <ApprovalChip payload={data} />;
    case "approval_resolved": {
      const p = data as unknown as { action?: string; status?: string };
      return (
        <Chip label={p.status === "approved" ? "Approved" : "Discarded"}>
          <Text style={styles.body}>{p.action || "decided"}</Text>
        </Chip>
      );
    }
    case "memory_updated": {
      const p = data as unknown as { rule?: string; note?: string; tidied?: number };
      return (
        <Chip label={p.tidied ? "Tidied" : "Remembered"}>
          <Text style={styles.body}>{p.rule || p.note || `${p.tidied ?? 0} rules merged`}</Text>
        </Chip>
      );
    }
    case "routine_created": {
      const p = data as unknown as { name?: string; human?: string; cron?: string };
      return (
        <Chip label="Routine">
          <Text style={[styles.body, { fontWeight: "600" }]}>{p.name}</Text>
          <Text style={styles.sub}>{p.human || p.cron}</Text>
        </Chip>
      );
    }
    case "bot_ref": {
      const p = data as unknown as { from_name?: string; from?: string; content?: string };
      return (
        <Chip label={`From @${p.from_name || p.from || "a teammate"}`}>
          {p.content ? <Markdown source={p.content} /> : null}
        </Chip>
      );
    }
    case "login_request": return <LoginChip payload={data} />;
    case "screenshot": return <ScreenshotChip payload={data} />;
    default: return null;
  }
}

const styles = StyleSheet.create({
  chip: {
    marginTop: 8, padding: 12, gap: 6,
    borderWidth: 1, borderColor: C.line, borderRadius: 10, backgroundColor: C.surface,
  },
  label: {
    color: C.dim, fontSize: 10, textTransform: "uppercase", letterSpacing: 1,
  },
  row: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  body: { flex: 1, color: C.text, fontSize: 14, lineHeight: 20 },
  sub: { color: C.dim, fontSize: 13, lineHeight: 19 },
  // Monospaced and given two lines: a look-alike domain is only catchable when
  // the characters have room, and this is the one string on the card the
  // operator is being asked to actually read.
  origin: {
    marginBottom: 6, padding: 8,
    borderWidth: 1, borderColor: C.line, borderRadius: 8,
  },
  originOdd: { borderColor: C.amber },
  originText: { color: C.text, fontFamily: "monospace", fontSize: 13, lineHeight: 18 },
  originWarning: { marginTop: 4, color: C.amber, fontSize: 12, lineHeight: 17 },
  originUnknown: { color: C.amber, fontSize: 13, lineHeight: 18 },
  note: { color: C.dim, fontSize: 12, lineHeight: 18 },
  closing: {
    marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.line,
    color: C.dim, fontSize: 13, lineHeight: 19,
  },
  divider: { marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.line },
  toggle: { color: C.dim, fontSize: 12 },
  kind: {
    minWidth: 58, color: C.faint, fontSize: 10,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  struck: { color: C.faint, textDecorationLine: "line-through" },
  ageCol: { minWidth: 34, color: C.faint, fontSize: 11, textAlign: "right" },
  smallButton: {
    paddingHorizontal: 8, paddingVertical: 4, minHeight: 28,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: C.line, borderRadius: 6,
  },
  smallButtonText: { color: C.dim, fontSize: 11 },
  wideButton: {
    minHeight: 44, alignItems: "center", justifyContent: "center",
    borderRadius: 8, backgroundColor: C.line,
  },
  wideButtonText: { color: C.text, fontSize: 14, fontWeight: "600" },
  input: {
    borderWidth: 1, borderColor: C.line, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 9, color: C.text, fontSize: 15,
  },
});
