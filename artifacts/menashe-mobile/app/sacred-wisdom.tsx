/**
 * SPR-M012 — Sacred Wisdom Experience
 * Platform: Mobile V1 | Priority: 🔴 PLATFORM FLAGSHIP
 *
 * "Rav Menashe" — a trusted learning companion for the Bnei Menashe community.
 * NOT a chatbot. NOT ChatGPT inside Menashe. A guide. A teacher.
 *
 * Architecture rules (SPR-M012):
 *   ✓ Web untouched                 ✓ Existing AI backend reused (POST /api/chat)
 *   ✓ Shared Core reused            ✓ Mobile Shell reused
 *   ✓ MMDL followed                 ✓ MEL followed
 *   ✓ No duplicate AI logic         ✓ No new AI system created
 *   ✓ Streaming messages            ✓ Accessibility (VoiceOver / TalkBack / Dynamic Type)
 *   ✓ 60 FPS (FlatList + memoization) ✓ Reduced Motion respected
 */

import React, {
  memo, useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { fetch } from "expo/fetch";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "@clerk/expo";
import { hapticLight } from "@/src/mobile/lib/haptics";
import { useEntrance, useReducedMotion } from "@/src/mobile/lib/useEntrance";
import { usePressScale } from "@/src/mobile/lib/usePressScale";

import { useThemeTokens } from "@/src/mobile/design-system";
import { storageGet, storageSet } from "@/lib/storageUtils";
import { useLanguage } from "@/context/LanguageContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
const CONV_STORAGE_KEY = "menashe-sacred-wisdom-convs-v1";
const MAX_CONVERSATIONS = 20;
const READING_MAX_WIDTH = 680;

// Suggested questions and library topics are derived from the translation system
// inside HomeView via useLanguage(). AI prompts always use English topic labels
// so the gateway receives well-formed queries regardless of UI language.

const REFLECTIONS = [
  { text: "Who is wise? One who learns from every person.", source: "Pirkei Avot 4:1" },
  { text: "The beginning of wisdom is the fear of God; those who practice it have good understanding.", source: "Psalms 111:10" },
  { text: "Great is Torah, for it gives life to those who practice it, in this world and in the World to Come.", source: "Pirkei Avot 6:7" },
  { text: "Set aside a fixed time for Torah study every day, for every moment of study is precious.", source: "Shulchan Aruch, YD 246" },
  { text: "It is not your duty to finish the work, but neither are you free to desist from it.", source: "Pirkei Avot 2:16" },
  { text: "Torah study is equal in weight to all the other commandments combined.", source: "Talmud, Peah 1:1" },
  { text: "Turn it over, and turn it over, for everything is in it.", source: "Ben Bag Bag, Pirkei Avot 5:22" },
];

const LEARNING_CHIPS: Array<{
  label: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  prompt: string;
}> = [
  { label: "Today's Parashah", icon: "book-open",  prompt: "What is this week's Parashah and its key themes?" },
  { label: "Siddur Library",   icon: "book",        prompt: "Guide me through the structure of the daily prayers" },
  { label: "Hebrew Calendar",  icon: "calendar",    prompt: "What Jewish holidays or observances are coming up soon?" },
  { label: "Daf Yomi",         icon: "layers",      prompt: "Explain today's Daf Yomi in simple terms" },
  { label: "Holiday Insight",  icon: "sun",         prompt: "Tell me about an upcoming Jewish holiday and how to observe it" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type AiProvider = "openai" | "gemini" | "grok";
type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  streaming?: boolean;
  provider?: AiProvider;
  timestamp: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

type ScreenView = "home" | "chat";

// ─── Utilities ────────────────────────────────────────────────────────────────

function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getTodayReflection(): (typeof REFLECTIONS)[0] {
  const dayIndex = Math.floor(Date.now() / 86_400_000) % REFLECTIONS.length;
  return REFLECTIONS[dayIndex];
}

function getConvTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "Conversation";
  const text = first.content.trim();
  return text.length > 50 ? text.slice(0, 47) + "…" : text;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ampm}`;
}

// ─── Streaming ────────────────────────────────────────────────────────────────

async function* streamChat(
  messages: Array<{ role: string; content: string }>,
  token: string | null,
  signal: AbortSignal,
): AsyncGenerator<{ text?: string; provider?: AiProvider; error?: string; done?: boolean }> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
    body: JSON.stringify({ messages }),
  });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") { yield { done: true }; return; }
      try { yield JSON.parse(payload); } catch {}
    }
  }
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function parseInline(
  text: string,
  baseStyle: object,
  boldStyle: object,
  italicStyle: object,
  codeStyle: object,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(<Text key={i++} style={baseStyle}>{text.slice(last, m.index)}</Text>);
    }
    const raw = m[0];
    if (raw.startsWith("**")) {
      parts.push(<Text key={i++} style={[baseStyle, boldStyle]}>{raw.slice(2, -2)}</Text>);
    } else if (raw.startsWith("*")) {
      parts.push(<Text key={i++} style={[baseStyle, italicStyle]}>{raw.slice(1, -1)}</Text>);
    } else {
      parts.push(<Text key={i++} style={[baseStyle, codeStyle]}>{raw.slice(1, -1)}</Text>);
    }
    last = m.index + raw.length;
  }
  if (last < text.length) {
    parts.push(<Text key={i++} style={baseStyle}>{text.slice(last)}</Text>);
  }
  return parts;
}

interface SimpleMarkdownProps {
  content: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
}

const SimpleMarkdown = memo(function SimpleMarkdown({
  content,
  textColor,
  mutedColor,
  accentColor,
}: SimpleMarkdownProps) {
  const monoFont = Platform.select({ ios: "Courier New", android: "monospace", default: "monospace" });

  const baseStyle = { color: textColor, fontSize: 15, lineHeight: 24, fontFamily: "Inter_400Regular" };
  const boldStyle = { fontFamily: "Inter_700Bold" };
  const italicStyle = { fontStyle: "italic" as const };
  const codeStyle = { fontFamily: monoFont, backgroundColor: accentColor + "1a", borderRadius: 4, paddingHorizontal: 4 };

  const blocks = content.split(/\n\n+/);

  return (
    <View style={{ gap: 10 }}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        // Heading
        if (lines[0].startsWith("### ")) {
          return (
            <Text key={bi} style={{ color: textColor, fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 0.2, marginTop: 4 }}>
              {lines[0].slice(4)}
            </Text>
          );
        }
        if (lines[0].startsWith("## ")) {
          return (
            <Text key={bi} style={{ color: textColor, fontSize: 16, fontFamily: "Inter_700Bold", letterSpacing: -0.2, marginTop: 4 }}>
              {lines[0].slice(3)}
            </Text>
          );
        }
        if (lines[0].startsWith("# ")) {
          return (
            <Text key={bi} style={{ color: textColor, fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.4, marginTop: 4 }}>
              {lines[0].slice(2)}
            </Text>
          );
        }
        // Bullet list
        if (lines.every((l) => l.match(/^[-*•]\s/))) {
          return (
            <View key={bi} style={{ gap: 6 }}>
              {lines.map((l, li) => (
                <View key={li} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                  <Text style={{ color: accentColor, fontSize: 15, lineHeight: 24 }}>•</Text>
                  <Text style={{ flex: 1, ...baseStyle }}>
                    {parseInline(l.slice(2).trim(), baseStyle, boldStyle, italicStyle, codeStyle)}
                  </Text>
                </View>
              ))}
            </View>
          );
        }
        // Numbered list
        if (lines.every((l) => l.match(/^\d+\.\s/))) {
          return (
            <View key={bi} style={{ gap: 6 }}>
              {lines.map((l, li) => {
                const numMatch = l.match(/^(\d+)\.\s(.*)/);
                if (!numMatch) return null;
                return (
                  <View key={li} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                    <Text style={{ color: accentColor, fontSize: 15, lineHeight: 24, fontFamily: "Inter_600SemiBold", minWidth: 18 }}>{numMatch[1]}.</Text>
                    <Text style={{ flex: 1, ...baseStyle }}>
                      {parseInline(numMatch[2].trim(), baseStyle, boldStyle, italicStyle, codeStyle)}
                    </Text>
                  </View>
                );
              })}
            </View>
          );
        }
        // Regular paragraph (may have inline formatting)
        const combined = lines.join(" ");
        return (
          <Text key={bi} style={baseStyle}>
            {parseInline(combined, baseStyle, boldStyle, italicStyle, codeStyle)}
          </Text>
        );
      })}
    </View>
  );
});

// ─── Typing Indicator ─────────────────────────────────────────────────────────

const TypingIndicator = memo(function TypingIndicator({ color }: { color: string }) {
  const anims = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];
  useEffect(() => {
    const loop = Animated.loop(
      Animated.stagger(160, anims.map((a) =>
        Animated.sequence([
          Animated.timing(a, { toValue: 1, duration: 320, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 320, useNativeDriver: true }),
        ])
      ))
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={{ flexDirection: "row", gap: 5, alignItems: "center", paddingVertical: 4 }}>
      {anims.map((a, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7, height: 7, borderRadius: 3.5,
            backgroundColor: color,
            opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] }),
            transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }) }],
          }}
        />
      ))}
    </View>
  );
});

// ─── Message Bubble ───────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: Message;
  colors: ReturnType<typeof useThemeTokens>["colors"];
  accentPrimary: string;
  accentGold: string;
  isLastAssistant: boolean;
  onChip: (prompt: string) => void;
  reducedMotion: boolean;
}

const MessageBubble = memo(function MessageBubble({
  message,
  colors,
  accentPrimary,
  accentGold,
  isLastAssistant,
  onChip,
  reducedMotion,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isStreaming = !!message.streaming;

  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) return;
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
  }, [opacity, reducedMotion]);

  return (
    <Animated.View style={{ opacity, marginBottom: 16 }}>
      {/* Sender label */}
      <Text
        style={{
          fontSize: 11,
          fontFamily: "Inter_600SemiBold",
          letterSpacing: 0.8,
          color: isUser ? accentGold : accentPrimary,
          textTransform: "uppercase",
          marginBottom: 6,
          marginLeft: isUser ? undefined : 0,
          textAlign: isUser ? "right" : "left",
        }}
        accessibilityLabel={isUser ? "You" : "Rav Menashe"}
      >
        {isUser ? "You" : "Rav Menashe"}
      </Text>

      {/* Bubble */}
      <View
        style={{
          alignSelf: isUser ? "flex-end" : "flex-start",
          maxWidth: "90%",
          backgroundColor: isUser ? accentGold + "22" : colors.card,
          borderRadius: 18,
          borderBottomRightRadius: isUser ? 4 : 18,
          borderBottomLeftRadius: isUser ? 18 : 4,
          borderWidth: 1,
          borderColor: isUser ? accentGold + "30" : colors.cardBorder,
          paddingHorizontal: 16,
          paddingVertical: 13,
        }}
        accessibilityRole="text"
        accessibilityLabel={message.content || "Rav Menashe is thinking…"}
      >
        {isStreaming && !message.content ? (
          <TypingIndicator color={accentPrimary} />
        ) : isUser ? (
          <Text style={{ color: colors.textPrimary, fontSize: 15, lineHeight: 24, fontFamily: "Inter_400Regular" }}>
            {message.content}
          </Text>
        ) : (
          <SimpleMarkdown
            content={message.content}
            textColor={colors.textPrimary}
            mutedColor={colors.textMuted}
            accentColor={accentPrimary}
          />
        )}

        {/* Blinking cursor during streaming */}
        {isStreaming && message.content ? (
          <Text style={{ color: accentPrimary, fontSize: 14 }}> ▍</Text>
        ) : null}
      </View>

      {/* Timestamp + Provider badge */}
      <View style={{ flexDirection: isUser ? "row-reverse" : "row", alignItems: "center", gap: 8, marginTop: 5 }}>
        {!isStreaming && (
          <Text style={{ fontSize: 10, color: colors.textMuted + "80", fontFamily: "Inter_400Regular" }}>
            {formatTime(message.timestamp)}
          </Text>
        )}
        {!isUser && !isStreaming && message.provider && (
          <Text style={{ fontSize: 9, color: colors.textMuted + "99", fontFamily: "Inter_400Regular" }}>
            via {message.provider === "openai" ? "OpenAI" : message.provider === "gemini" ? "Gemini" : "Grok"}
          </Text>
        )}
      </View>

      {/* ─── Section 4: Learning Suggestions — shown after every assistant response ─ */}
      {isLastAssistant && !isStreaming && message.content.length > 0 && (
        <View style={{ marginTop: 14 }}>
          <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.6, color: colors.textMuted, marginBottom: 8 }}>
            LEARNING SUGGESTIONS
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: -2 }}>
            <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 2 }}>
              {LEARNING_CHIPS.map((chip) => (
                <Pressable
                  key={chip.label}
                  onPress={() => onChip(chip.prompt)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ask about ${chip.label}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    backgroundColor: accentPrimary + "14",
                    borderRadius: 24,
                    borderWidth: 1,
                    borderColor: accentPrimary + "30",
                    minHeight: 48,
                  }}
                >
                  <Feather name={chip.icon} size={12} color={accentPrimary} />
                  <Text style={{ color: accentPrimary, fontSize: 12, fontFamily: "Inter_500Medium" }}>{chip.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </Animated.View>
  );
});

// ─── Suggested Question Card ──────────────────────────────────────────────────

const SuggestedQuestionCard = memo(function SuggestedQuestionCard({
  question,
  onPress,
  colors,
  accentPrimary,
  accentGold,
}: {
  question: string;
  onPress: () => void;
  colors: ReturnType<typeof useThemeTokens>["colors"];
  accentPrimary: string;
  accentGold: string;
}) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.95);
  return (
    <Animated.View style={{ transform: [{ scale }], width: 200 }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={question}
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          padding: 14,
          minHeight: 80,
          justifyContent: "space-between",
        }}
      >
        <Feather name="message-circle" size={14} color={accentPrimary} />
        <Text
          style={{ color: colors.textPrimary, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 19, marginTop: 8 }}
          numberOfLines={3}
        >
          {question}
        </Text>
      </Pressable>
    </Animated.View>
  );
});

// ─── Conversation Item ────────────────────────────────────────────────────────

const ConversationItem = memo(function ConversationItem({
  conv,
  onResume,
  onDelete,
  onPin,
  colors,
  accentPrimary,
  accentGold,
}: {
  conv: Conversation;
  onResume: () => void;
  onDelete: () => void;
  onPin: () => void;
  colors: ReturnType<typeof useThemeTokens>["colors"];
  accentPrimary: string;
  accentGold: string;
}) {
  const { t } = useLanguage();
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  const dateStr = useMemo(() => {
    const d = new Date(conv.updatedAt);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return t.commJustNow;
    if (diff < 3600) return t.commMinAgo.replace("{n}", String(Math.floor(diff / 60)));
    if (diff < 86400) return t.commHourAgo.replace("{n}", String(Math.floor(diff / 3600)));
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [conv.updatedAt, t]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onResume}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`Resume conversation: ${conv.title}`}
        style={{
          backgroundColor: colors.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: conv.pinned ? accentGold + "40" : colors.cardBorder,
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          minHeight: 60,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: (conv.pinned ? accentGold : accentPrimary) + "1a",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Feather name={conv.pinned ? "bookmark" : "message-circle"} size={15} color={conv.pinned ? accentGold : accentPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 14, fontFamily: "Inter_500Medium" }} numberOfLines={1}>
            {conv.title}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 }}>
            {conv.messages.length} message{conv.messages.length !== 1 ? "s" : ""} · {dateStr}
          </Text>
        </View>
        {/* Actions */}
        <View style={{ flexDirection: "row", gap: 4 }}>
          <Pressable
            onPress={onPin}
            accessibilityRole="button"
            accessibilityLabel={conv.pinned ? "Unpin conversation" : "Pin conversation"}
            hitSlop={8}
            style={{ padding: 8, minWidth: 40, minHeight: 40, alignItems: "center", justifyContent: "center" }}
          >
            <Feather name="bookmark" size={16} color={conv.pinned ? accentGold : colors.textMuted} />
          </Pressable>
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel="Delete conversation"
            hitSlop={8}
            style={{ padding: 8, minWidth: 40, minHeight: 40, alignItems: "center", justifyContent: "center" }}
          >
            <Feather name="trash-2" size={15} color={colors.textMuted} />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── Hebrew Date Badge ────────────────────────────────────────────────────────

function HebrewDateBadge({ accentGold }: { accentGold: string }) {
  const label = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { HDate } = require("@hebcal/core") as typeof import("@hebcal/core");
      return new HDate(new Date()).render("en");
    } catch {
      return null;
    }
  }, []);
  if (!label) return null;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 18,
        alignSelf: "flex-start",
        backgroundColor: accentGold + "15",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: accentGold + "30",
        paddingHorizontal: 12,
        paddingVertical: 5,
      }}
    >
      <Text style={{ fontSize: 11, color: accentGold }}>☀</Text>
      <Text style={{ fontSize: 11, color: accentGold, fontFamily: "Inter_500Medium", letterSpacing: 0.2 }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Home View ────────────────────────────────────────────────────────────────

interface HomeViewProps {
  colors: ReturnType<typeof useThemeTokens>["colors"];
  sp: ReturnType<typeof useThemeTokens>["sp"];
  rd: ReturnType<typeof useThemeTokens>["rd"];
  accentPrimary: string;
  accentGold: string;
  insets: { top: number; bottom: number };
  conversations: Conversation[];
  onStartChat: (prompt?: string) => void;
  onResumeConv: (conv: Conversation) => void;
  onDeleteConv: (id: string) => void;
  onPinConv: (id: string) => void;
  reducedMotion: boolean;
}

function HomeView({
  colors,
  sp,
  rd,
  accentPrimary,
  accentGold,
  insets,
  conversations,
  onStartChat,
  onResumeConv,
  onDeleteConv,
  onPinConv,
  reducedMotion,
}: HomeViewProps) {
  const { t } = useLanguage();
  const reflection = useMemo(() => getTodayReflection(), []);

  /** Bilingual suggested questions — displayed label is the prompt sent to AI. */
  const suggestedQuestions = useMemo(() => [
    t.sacredWisdomQ1,
    t.sacredWisdomQ2,
    t.sacredWisdomQ3,
    t.sacredWisdomQ4,
    t.sacredWisdomQ5,
    t.sacredWisdomQ6,
    t.sacredWisdomQ7,
    t.sacredWisdomQ8,
  ], [t]);

  /** Bilingual library topics — label is translated; promptLabel (always EN) drives the AI query. */
  const libraryTopics: Array<{
    label: string;
    promptLabel: string;
    icon: React.ComponentProps<typeof Feather>["name"];
  }> = useMemo(() => [
    { label: t.sacredWisdomTopicJudaism,     promptLabel: "Judaism",      icon: "star" },
    { label: t.sacredWisdomTopicHebrew,      promptLabel: "Hebrew",       icon: "type" },
    { label: t.sacredWisdomTopicPrayer,      promptLabel: "Prayer",       icon: "heart" },
    { label: t.sacredWisdomTopicTorah,       promptLabel: "Torah",        icon: "book-open" },
    { label: t.sacredWisdomTopicBneiMenashe, promptLabel: "Bnei Menashe", icon: "users" },
    { label: t.sacredWisdomTopicCalendar,    promptLabel: "Calendar",     icon: "calendar" },
    { label: t.sacredWisdomTopicHistory,     promptLabel: "History",      icon: "clock" },
  ], [t]);
  const a0 = useEntrance(0);
  const a1 = useEntrance(80);
  const a2 = useEntrance(140);
  const a3 = useEntrance(200);
  const a4 = useEntrance(260);
  const a5 = useEntrance(320);

  const topPad = (insets.top || 0) + 16;
  const bottomPad = (insets.bottom || 0) + 104;
  const HX = 20;

  const sortedConvs = useMemo(
    () => [...conversations].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt),
    [conversations],
  );

  const SAPPHIRE_DEEP  = "#050c1a";
  const SAPPHIRE_MID   = "#0c1830";
  const SAPPHIRE_BLUE  = "#1a2e58";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: bottomPad, maxWidth: READING_MAX_WIDTH, width: "100%", alignSelf: "center" }}
      keyboardShouldPersistTaps="handled"
    >
      {/* ─── 1. HERO ─────────────────────────────────────────────────────── */}
      <Animated.View style={a0}>
        <LinearGradient
          colors={[SAPPHIRE_DEEP, SAPPHIRE_MID, SAPPHIRE_BLUE]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingTop: topPad + 10, paddingHorizontal: HX, paddingBottom: 32, overflow: "hidden" }}
        >
          {/* Decorative sapphire orbs */}
          <View pointerEvents="none" style={{ position: "absolute", top: -70, right: -60, opacity: 0.12 }}>
            <Feather name="star" size={280} color={accentPrimary} />
          </View>
          <View pointerEvents="none" style={{ position: "absolute", bottom: -30, left: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: accentPrimary + "0e" }} />
          <View pointerEvents="none" style={{ position: "absolute", top: 60, right: -10, width: 90, height: 90, borderRadius: 45, backgroundColor: accentGold + "0d" }} />

          <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 2.5, color: accentPrimary, textTransform: "uppercase", marginBottom: 20 }}>
            {t.sacredWisdomTitle}
          </Text>
          <Text style={{ fontSize: 36, fontFamily: "Inter_700Bold", letterSpacing: -0.8, color: "#e8f0ff", lineHeight: 40 }}>
            Rav Menashe
          </Text>
          <Text style={{ fontSize: 17, fontFamily: "Inter_400Regular", color: "#8ba8d4", marginTop: 10, lineHeight: 26 }}>
            {t.sacredWisdomTagline}
          </Text>

          {/* Hebrew date badge */}
          <HebrewDateBadge accentGold={accentGold} />

          {/* Start chat input tap target */}
          <Pressable
            onPress={() => onStartChat()}
            accessibilityRole="button"
            accessibilityLabel="Start a conversation with Rav Menashe"
            style={{
              marginTop: 24,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: "rgba(255,255,255,0.06)",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: accentPrimary + "30",
              paddingHorizontal: 16,
              paddingVertical: 14,
            }}
          >
            <Feather name="message-circle" size={18} color={accentPrimary} />
            <Text style={{ flex: 1, color: "#8ba8d4", fontSize: 15, fontFamily: "Inter_400Regular" }}>
              {t.sacredWisdomPlaceholder}
            </Text>
            <Feather name="arrow-up-circle" size={20} color={accentPrimary} />
          </Pressable>
        </LinearGradient>
      </Animated.View>

      {/* ─── 2. SUGGESTED QUESTIONS ──────────────────────────────────────── */}
      <Animated.View style={[a1, { marginTop: 28, marginBottom: 4 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: HX, marginBottom: 14 }}>
          <Feather name="compass" size={14} color={accentGold} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.2, color: accentGold, textTransform: "uppercase" }}>
            {t.sacredWisdomSuggestedTitle}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: HX, gap: 10 }}
          style={{ marginBottom: 8 }}
        >
          {suggestedQuestions.map((q) => (
            <SuggestedQuestionCard
              key={q}
              question={q}
              onPress={() => onStartChat(q)}
              colors={colors}
              accentPrimary={accentPrimary}
              accentGold={accentGold}
            />
          ))}
        </ScrollView>
      </Animated.View>

      {/* ─── 5. CONTINUE LEARNING (recent conversations) ─────────────────── */}
      {sortedConvs.length > 0 && (
        <Animated.View style={[a2, { marginHorizontal: HX, marginTop: 28, marginBottom: 4 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Feather name="clock" size={14} color={accentGold} />
            <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.2, color: accentGold, textTransform: "uppercase" }}>
              {t.sacredWisdomContinueTitle}
            </Text>
          </View>
          <View style={{ gap: 8 }}>
            {sortedConvs.slice(0, 5).map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                onResume={() => onResumeConv(conv)}
                onDelete={() => onDeleteConv(conv.id)}
                onPin={() => onPinConv(conv.id)}
                colors={colors}
                accentPrimary={accentPrimary}
                accentGold={accentGold}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {/* ─── 6. LEARNING LIBRARY ─────────────────────────────────────────── */}
      <Animated.View style={[a3, { marginHorizontal: HX, marginTop: 28, marginBottom: 4 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Feather name="grid" size={14} color={accentGold} />
          <Text style={{ fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.2, color: accentGold, textTransform: "uppercase" }}>
            {t.sacredWisdomLibraryTitle}
          </Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {libraryTopics.map((topic) => (
            <Pressable
              key={topic.promptLabel}
              onPress={() => onStartChat(`Tell me about ${topic.promptLabel} in the context of Bnei Menashe and Jewish tradition`)}
              accessibilityRole="button"
              accessibilityLabel={`Explore ${topic.label}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 14,
                paddingVertical: 10,
                backgroundColor: colors.card,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: colors.cardBorder,
                minHeight: 42,
              }}
            >
              <Feather name={topic.icon} size={13} color={accentPrimary} />
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontFamily: "Inter_500Medium" }}>{topic.label}</Text>
            </Pressable>
          ))}
        </View>
      </Animated.View>

      {/* ─── 7. REFLECTION ───────────────────────────────────────────────── */}
      <Animated.View style={[a5, { marginHorizontal: HX, marginTop: 32, marginBottom: 8 }]}>
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: accentGold + "28",
            padding: 20,
            borderLeftWidth: 3,
            borderLeftColor: accentGold,
          }}
          accessibilityRole="text"
          accessibilityLabel={`Daily reflection: ${reflection.text} — ${reflection.source}`}
        >
          <Feather name="feather" size={14} color={accentGold} style={{ marginBottom: 12 }} />
          <Text style={{ color: colors.textPrimary, fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 25, fontStyle: "italic" }}>
            "{reflection.text}"
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 10, letterSpacing: 0.3 }}>
            — {reflection.source}
          </Text>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Section 3: Conversation UI (SPR-M012 §3) ────────────────────────────────
// Premium conversation interface with streaming, typing indicator, markdown
// rendering, provider badge, and accessibility attributes.
// Section 4 (Learning Suggestions) renders inside MessageBubble after
// each completed assistant response, per spec: "After every response, suggest…"
// ─────────────────────────────────────────────────────────────────────────────

interface ChatViewProps {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  streaming: boolean;
  onSend: (text?: string) => void;
  onStop: () => void;
  colors: ReturnType<typeof useThemeTokens>["colors"];
  accentPrimary: string;
  accentGold: string;
  insets: { top: number; bottom: number };
  reducedMotion: boolean;
}

function ChatView({
  messages,
  input,
  setInput,
  streaming,
  onSend,
  onStop,
  colors,
  accentPrimary,
  accentGold,
  insets,
  reducedMotion,
}: ChatViewProps) {
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Auto-scroll when messages update
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: !reducedMotion }), 80);
    }
  }, [messages, reducedMotion]);

  // Determine the index of the last assistant message
  const lastAssistantIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return i;
    }
    return -1;
  }, [messages]);

  const onChip = useCallback((prompt: string) => onSend(prompt), [onSend]);

  const renderItem = useCallback(
    ({ item, index }: { item: Message; index: number }) => (
      <MessageBubble
        message={item}
        colors={colors}
        accentPrimary={accentPrimary}
        accentGold={accentGold}
        isLastAssistant={index === lastAssistantIdx}
        onChip={onChip}
        reducedMotion={reducedMotion}
      />
    ),
    [colors, accentPrimary, accentGold, lastAssistantIdx, onChip, reducedMotion],
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  const bottomPad = Math.max(insets.bottom || 0, 8);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Message list */}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 20,
          maxWidth: READING_MAX_WIDTH,
          width: "100%",
          alignSelf: "center",
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 64, paddingHorizontal: 32 }}>
            <View
              style={{
                width: 72, height: 72, borderRadius: 36,
                backgroundColor: accentPrimary + "18",
                borderWidth: 1, borderColor: accentPrimary + "30",
                alignItems: "center", justifyContent: "center",
                marginBottom: 22,
              }}
            >
              <Text style={{ fontSize: 32 }}>✡</Text>
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.4, marginBottom: 10, textAlign: "center" }}>
              Ask Rav Menashe
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22, maxWidth: 260 }}>
              Your trusted guide to Torah, prayer, and the traditions of Bnei Menashe
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS !== "web"}
        maxToRenderPerBatch={10}
        windowSize={8}
        initialNumToRender={20}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        accessibilityLabel="Conversation with Rav Menashe"
      />

      {/* Input bar */}
      <View
        style={{
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.cardBorder,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: bottomPad + 12,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 10,
            backgroundColor: colors.card,
            borderRadius: 18,
            borderWidth: 1,
            borderColor: colors.cardBorder,
            paddingHorizontal: 14,
            paddingVertical: 8,
            maxWidth: READING_MAX_WIDTH,
            width: "100%",
            alignSelf: "center",
          }}
        >
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder="Ask Rav Menashe…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={2000}
            onSubmitEditing={() => onSend()}
            returnKeyType="send"
            blurOnSubmit={false}
            editable={!streaming}
            accessible
            accessibilityLabel="Message input"
            style={{
              flex: 1,
              color: colors.textPrimary,
              fontSize: 15,
              fontFamily: "Inter_400Regular",
              lineHeight: 22,
              maxHeight: 120,
              paddingVertical: 4,
            }}
          />
          {streaming ? (
            <Pressable
              onPress={onStop}
              accessibilityRole="button"
              accessibilityLabel="Stop generating"
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: "#ef4444",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Feather name="square" size={16} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => onSend()}
              disabled={!input.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: input.trim() ? accentPrimary : colors.cardBorder,
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Feather name="arrow-up" size={18} color={input.trim() ? "#fff" : colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function SacredWisdomScreen() {
  const { colors, sp, rd, shadow } = useThemeTokens();

  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const reducedMotion = useReducedMotion();

  // Derive accent colors — sapphire primary (#6382FF) or theme primary, always gold accent
  const accentPrimary = colors.primary as string;   // #6382FF in sapphire, #d4a843 in dark
  const accentGold    = colors.accentGold;   // #d4a843 always

  // Screen state
  const [view,          setView]          = useState<ScreenView>("home");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId,  setActiveConvId]  = useState<string | null>(null);
  const [messages,      setMessages]      = useState<Message[]>([]);
  const [input,         setInput]         = useState("");
  const [streaming,     setStreaming]      = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Load persisted conversations
  useEffect(() => {
    storageGet<Conversation[]>(CONV_STORAGE_KEY, []).then((convs) => {
      if (convs.length > 0) setConversations(convs);
    });
  }, []);

  const saveConversations = useCallback((convs: Conversation[]) => {
    setConversations(convs);
    storageSet(CONV_STORAGE_KEY, convs);
  }, []);

  // Upsert active conversation
  const flushConversation = useCallback((msgs: Message[], convId: string) => {
    if (msgs.length === 0) return;
    setConversations((prev) => {
      const existing = prev.find((c) => c.id === convId);
      const updated: Conversation = existing
        ? { ...existing, messages: msgs, title: getConvTitle(msgs), updatedAt: Date.now() }
        : {
            id: convId,
            title: getConvTitle(msgs),
            messages: msgs,
            pinned: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
      const rest = prev.filter((c) => c.id !== convId);
      const all = [updated, ...rest].slice(0, MAX_CONVERSATIONS);
      storageSet(CONV_STORAGE_KEY, all);
      return all;
    });
  }, []);

  // Start or continue a conversation
  const startChat = useCallback((prompt?: string) => {
    const convId = genId();
    setActiveConvId(convId);
    setMessages([]);
    setView("chat");
    if (prompt) {
      // Defer send so the view transition renders first
      setTimeout(() => sendMessage(prompt, [], convId), 60);
    }
  }, []);

  const resumeConversation = useCallback((conv: Conversation) => {
    setActiveConvId(conv.id);
    setMessages(conv.messages);
    setView("chat");
  }, []);

  const deleteConversation = useCallback((id: string) => {
    hapticLight();
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      storageSet(CONV_STORAGE_KEY, updated);
      return updated;
    });
  }, []);

  const pinConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c));
      storageSet(CONV_STORAGE_KEY, updated);
      return updated;
    });
  }, []);

  // Send a message and stream the response
  const sendMessage = useCallback(async (
    text: string,
    prevMessages?: Message[],
    convId?: string,
  ) => {
    const txt = text.trim();
    if (!txt || streaming) return;

    const currentConvId = convId ?? activeConvId ?? genId();
    if (!activeConvId && !convId) setActiveConvId(currentConvId);

    const userMsg: Message = { id: genId(), role: "user", content: txt, timestamp: Date.now() };
    const base = prevMessages ?? messages;
    const withUser = [...base, userMsg];

    setMessages(withUser);
    setInput("");
    setStreaming(true);

    const assistantId = genId();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", streaming: true, timestamp: Date.now() };
    const withAssistant = [...withUser, assistantMsg];
    setMessages(withAssistant);

    const controller = new AbortController();
    abortRef.current = controller;

    let accumulated = "";
    let providerFound: AiProvider | undefined;

    try {
      const token = await getToken().catch(() => null);
      const apiMsgs = withUser.map(({ role, content }) => ({ role, content }));

      for await (const event of streamChat(apiMsgs, token, controller.signal)) {
        if (event.done) break;
        if (event.error) throw new Error(event.error);
        if (event.provider) providerFound = event.provider as AiProvider;
        if (event.text) {
          accumulated += event.text;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: accumulated, provider: providerFound } : m,
            ),
          );
        }
      }

      const finalMsgs = withUser.concat({
        id: assistantId,
        role: "assistant",
        content: accumulated,
        provider: providerFound,
        timestamp: Date.now(),
      });
      setMessages(finalMsgs);
      flushConversation(finalMsgs, currentConvId);
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // User stopped — save partial
        const partial = withUser.concat({
          id: assistantId,
          role: "assistant",
          content: accumulated || "…",
          provider: providerFound,
          timestamp: Date.now(),
        });
        setMessages(partial);
        flushConversation(partial, currentConvId);
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "I'm sorry — I couldn't reach the wisdom servers right now. Please try again.", streaming: false }
              : m,
          ),
        );
      }
    } finally {
      setStreaming(false);
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)));
      abortRef.current = null;
    }
  }, [streaming, activeConvId, messages, getToken, flushConversation]);

  const handleSend = useCallback((text?: string) => {
    sendMessage(text ?? input);
  }, [sendMessage, input]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleBack = useCallback(() => {
    if (streaming) abortRef.current?.abort();
    if (view === "chat") {
      setView("home");
    } else {
      router.back();
    }
  }, [streaming, view]);

  const handleNewChat = useCallback(() => {
    if (streaming) abortRef.current?.abort();
    setActiveConvId(null);
    setMessages([]);
    setInput("");
    setView("chat");
    setTimeout(() => startChat(), 10);
  }, [streaming, startChat]);

  const isWeb = Platform.OS === "web";
  const topPad = (insets.top || 0) + (isWeb ? 67 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <View
        style={{
          paddingTop: topPad + 12,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: colors.background,
          borderBottomWidth: view === "chat" ? 1 : 0,
          borderBottomColor: colors.cardBorder,
          maxWidth: READING_MAX_WIDTH,
          width: "100%",
          alignSelf: "center",
        }}
      >
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={view === "chat" ? "Back to Sacred Wisdom home" : "Go back"}
          style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" }}
        >
          <Feather name="arrow-left" size={22} color={colors.textPrimary} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontFamily: "Inter_700Bold", color: colors.textPrimary, letterSpacing: -0.3 }}>
            Rav Menashe
          </Text>
          {view === "chat" && streaming && (
            <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: accentPrimary, marginTop: 1 }}>
              Composing wisdom…
            </Text>
          )}
        </View>

        {view === "chat" && (
          <Pressable
            onPress={handleNewChat}
            accessibilityRole="button"
            accessibilityLabel="Start a new conversation"
            style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: colors.card,
              alignItems: "center", justifyContent: "center",
              borderWidth: 1, borderColor: colors.cardBorder,
            }}
          >
            <Feather name="edit-2" size={16} color={colors.textPrimary} />
          </Pressable>
        )}
      </View>

      {/* ─── Content ─────────────────────────────────────────────────────── */}
      {view === "home" ? (
        <HomeView
          colors={colors}
          sp={sp}
          rd={rd}
          accentPrimary={accentPrimary}
          accentGold={accentGold}
          insets={insets}
          conversations={conversations}
          onStartChat={startChat}
          onResumeConv={resumeConversation}
          onDeleteConv={deleteConversation}
          onPinConv={pinConversation}
          reducedMotion={reducedMotion}
        />
      ) : (
        <ChatView
          messages={messages}
          input={input}
          setInput={setInput}
          streaming={streaming}
          onSend={handleSend}
          onStop={handleStop}
          colors={colors}
          accentPrimary={accentPrimary}
          accentGold={accentGold}
          insets={insets}
          reducedMotion={reducedMotion}
        />
      )}
    </View>
  );
}
