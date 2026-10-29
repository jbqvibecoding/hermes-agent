/**
 * The thin half: tokens from `markdown.ts` onto React Native primitives.
 *
 * Everything decidable lives in the tokeniser so it can be tested without a
 * device. This file should stay boring enough that reading it is sufficient
 * review.
 */

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { type Block, parseMarkdown, type Span } from "./markdown";

const COLOURS = {
  text: "#e9e9e9",
  dim: "#9aa0a6",
  faint: "#5f6368",
  surface: "#17191e",
  line: "#2a2d33",
};

function Spans({ spans }: { spans: Span[] }) {
  return (
    <>
      {spans.map((span, index) => (
        <Text
          key={index}
          style={[
            span.bold ? styles.bold : null,
            span.code ? styles.inlineCode : null,
          ]}
        >
          {span.text}
        </Text>
      ))}
    </>
  );
}

function CodeBlock({ block }: { block: Extract<Block, { kind: "code" }> }) {
  return (
    <View style={styles.codeBlock}>
      {block.lang ? <Text style={styles.codeLang}>{block.lang}</Text> : null}
      {/*
        Horizontal, and this is the whole reason the renderer is hand-written.
        Wrapping code at 390px destroys its one useful property — that the
        indentation means something — and a teammate that writes code is most
        of what this product is for. Scrolling sideways is mildly annoying;
        reflowed Python is unreadable.
      */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Text style={styles.codeText} selectable>
          {block.text}
        </Text>
      </ScrollView>
    </View>
  );
}

export function Markdown({ source }: { source: string }) {
  const blocks = parseMarkdown(source);
  if (blocks.length === 0) return null;

  return (
    <View style={styles.root}>
      {blocks.map((block, index) => {
        if (block.kind === "code") return <CodeBlock key={index} block={block} />;
        if (block.kind === "bullet") {
          return (
            <View key={index} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>•</Text>
              <Text style={styles.paragraph}>
                <Spans spans={block.spans} />
              </Text>
            </View>
          );
        }
        return (
          <Text key={index} style={styles.paragraph} selectable>
            <Spans spans={block.spans} />
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  paragraph: { color: COLOURS.text, fontSize: 15, lineHeight: 22 },
  bold: { fontWeight: "700" },
  inlineCode: {
    fontFamily: "monospace",
    fontSize: 13.5,
    color: COLOURS.text,
    backgroundColor: COLOURS.surface,
  },
  bulletRow: { flexDirection: "row", gap: 8, paddingLeft: 2 },
  bulletDot: { color: COLOURS.faint, fontSize: 15, lineHeight: 22 },
  codeBlock: {
    borderWidth: 1,
    borderColor: COLOURS.line,
    borderRadius: 8,
    backgroundColor: COLOURS.surface,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 4,
  },
  codeLang: {
    color: COLOURS.faint,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  codeText: { color: COLOURS.text, fontFamily: "monospace", fontSize: 13, lineHeight: 19 },
});
