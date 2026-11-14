import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import * as SecureStore from "expo-secure-store";
import {
  introductionBenefits,
  introductionIndex,
  introductionScenes,
  nativeIntroductionKey,
  shouldShowFirstIntroduction,
} from "../../packages/business-rules/src/customer-introduction";

const cooking = require("./assets/cooking-hero.webp");
const delivery = require("./assets/introduction-delivery.webp");
const brand = require("./assets/introduction-logo.webp");
const benefitIcons = [
  "shield-checkmark-outline",
  "star-outline",
  "calendar-outline",
] as const;

export default function Onboarding({
  automatic,
  request,
}: {
  automatic: boolean;
  request: { revision: number; preview: boolean };
}) {
  const { height, width, fontScale } = useWindowDimensions();
  const [mode, setMode] = useState<"first" | "preview" | "replay" | null>(null);
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const seen = useRef(false);
  const handled = useRef(request.revision);
  const saving = useRef(false);
  const lastChange = useRef(0);
  const animated = useRef(new Animated.Value(1)).current;
  const direction = useRef(1);
  const current = useRef(index);
  current.current = index;
  const open = !!mode && (mode !== "first" || automatic);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (live) setReduced(value);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      live = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!automatic || seen.current) return;
    let live = true;
    SecureStore.getItemAsync(nativeIntroductionKey)
      .then((value) => {
        if (
          live &&
          !seen.current &&
          shouldShowFirstIntroduction(value, automatic)
        )
          setMode((previous) => previous ?? "first");
      })
      .catch(() => {
        // Keep the normal app usable when the device cannot read SecureStore.
        // The explicit introduction shortcut remains available from Appearance.
      });
    return () => {
      live = false;
    };
  }, [automatic]);

  useEffect(() => {
    if (request.revision === handled.current) return;
    handled.current = request.revision;
    setIndex(0);
    setError(false);
    setFailed({});
    lastChange.current = 0;
    setMode(request.preview ? "preview" : "replay");
  }, [request]);

  useEffect(() => {
    animated.stopAnimation();
    if (!open || reduced) {
      animated.setValue(1);
      return;
    }
    animated.setValue(0);
    const motion = Animated.timing(animated, {
      toValue: 1,
      duration: 460,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    motion.start();
    return () => motion.stop();
  }, [index, open, reduced, animated]);

  useEffect(() => {
    if (!open) return;
    const scene = introductionScenes[index];
    const announce = setTimeout(
      () =>
        AccessibilityInfo.announceForAccessibility(
          `${scene.title} ${scene.emphasis}. Introduction ${index + 1} of ${introductionScenes.length}.`,
        ),
      200,
    );
    return () => clearTimeout(announce);
  }, [index, open]);

  function jump(next: number) {
    const previous = current.current;
    if (next === previous || saving.current) return;
    direction.current = next > previous ? 1 : -1;
    lastChange.current = Date.now();
    current.current = next;
    setIndex(next);
    setError(false);
  }

  const gesture = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 35 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) >= 55)
            jump(introductionIndex(current.current, g.dx < 0 ? 1 : -1));
        },
      }),
    [],
  );

  function dismiss() {
    if (mode !== "replay") seen.current = true;
    setMode(null);
    setError(false);
    current.current = 0;
    setIndex(0);
  }

  async function finish() {
    if (saving.current) return;
    if (mode === "replay") {
      dismiss();
      return;
    }
    saving.current = true;
    setBusy(true);
    try {
      await SecureStore.setItemAsync(nativeIntroductionKey, "seen");
      dismiss();
    } catch {
      setError(true);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const item = introductionScenes[index];
  const artwork = (
    <View
      style={[
        s.art,
        {
          minHeight: Math.max(210, Math.min(height * 0.35, width * 0.96, 480)),
        },
      ]}
      {...gesture.panHandlers}
    >
      {!failed[index] && (
        <Image
          source={index === 1 ? delivery : cooking}
          accessible={false}
          resizeMode="cover"
          onError={() =>
            setFailed((previous) => ({ ...previous, [index]: true }))
          }
          style={[StyleSheet.absoluteFill, s.photo, index !== 1 && s.cooking]}
        />
      )}
      <Svg
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        width="100%"
        height="100%"
        viewBox="0 0 360 280"
        preserveAspectRatio="none"
        accessible={false}
      >
        <Defs>
          <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
            <Stop stopColor="#042e21" stopOpacity={index === 2 ? 0.9 : 0.2} />
            <Stop offset="1" stopColor="#042e21" stopOpacity={0.06} />
          </LinearGradient>
          <LinearGradient id="wave" x1="0" y1="0" x2="1" y2="1">
            <Stop stopColor="#73d729" />
            <Stop offset="1" stopColor="#075934" />
          </LinearGradient>
        </Defs>
        <Rect width="360" height="280" fill="url(#shade)" />
        <Path d="M0 253 C120 295 221 224 360 207 V280 H0Z" fill="#c9f5a1" />
        <Path d="M0 257 C125 297 233 230 360 212 V280 H0Z" fill="url(#wave)" />
        <Path d="M0 265 C149 284 230 254 360 237 V280 H0Z" fill="#063625" />
      </Svg>
      {index === 2 && fontScale < 1.3 && (
        <View
          style={s.artTags}
          importantForAccessibility="no-hide-descendants"
          accessible={false}
        >
          {introductionBenefits.map(({ title }, i) => (
            <View key={title} style={s.tag}>
              <Ionicons name={benefitIcons[i]} size={19} color="#bef680" />
              <Text style={s.tagText}>{title}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
  const copy = (
    <View style={[s.copy, index === 0 && s.center]} {...gesture.panHandlers}>
      {index === 0 && (
        <Image
          source={brand}
          accessible={false}
          style={s.brand}
          resizeMode="contain"
        />
      )}
      {index > 0 && (
        <View style={s.sceneIcon}>
          <Ionicons
            name={index === 1 ? "car-outline" : "flame-outline"}
            size={27}
            color="#07512e"
          />
        </View>
      )}
      <Text
        accessibilityRole="header"
        style={[s.title, index === 0 && s.centerText]}
      >
        {item.title}
        {"\n"}
        <Text style={s.emphasis}>{item.emphasis}</Text>
      </Text>
      <Text style={[s.body, index === 0 && s.centerText]}>{item.body}</Text>
      {index === 2 && (
        <View style={s.details}>
          {introductionBenefits.map(({ title, detail }, i) => (
            <View key={title} style={s.benefit}>
              <Ionicons name={benefitIcons[i]} size={18} color="#bef680" />
              <Text style={s.fine}>
                <Text style={s.bold}>{title}: </Text>
                {detail}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <Modal
      visible={open}
      animationType="none"
      onRequestClose={() => (index > 0 ? jump(index - 1) : void finish())}
    >
      <SafeAreaProvider>
        <SafeAreaView accessibilityViewIsModal style={s.screen}>
          <StatusBar barStyle="light-content" />
          <View style={s.frame}>
            <View style={s.bar}>
              <View style={s.progress}>
                {introductionScenes.map((scene, i) => (
                  <Pressable
                    key={scene.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Introduction ${i + 1} of 3`}
                    accessibilityState={{
                      selected: i === index,
                      disabled: busy,
                    }}
                    disabled={busy}
                    onPress={() => jump(i)}
                    style={s.dotTarget}
                  >
                    <View style={[s.dot, i === index && s.dotActive]} />
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                style={s.skip}
                onPress={() => void finish()}
              >
                <Text style={s.skipText}>Skip</Text>
              </Pressable>
            </View>
            <ScrollView
              key={index}
              contentContainerStyle={s.scroll}
              showsVerticalScrollIndicator={false}
            >
              <Animated.View
                style={[
                  s.scene,
                  {
                    opacity: animated.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.78, 1],
                    }),
                    transform: [
                      {
                        translateX: animated.interpolate({
                          inputRange: [0, 1],
                          outputRange: [14 * direction.current, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {index === 0 ? (
                  <>
                    {copy}
                    {artwork}
                  </>
                ) : (
                  <>
                    {artwork}
                    {copy}
                  </>
                )}
              </Animated.View>
            </ScrollView>
            <View style={s.actions}>
              {error && (
                <View style={s.error}>
                  <Text
                    accessibilityRole="alert"
                    accessibilityLiveRegion="polite"
                    style={s.body}
                  >
                    Could not save this preference. Try again, or continue
                    without saving.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    style={s.skip}
                    onPress={dismiss}
                  >
                    <Text style={s.skipText}>Continue without saving</Text>
                  </Pressable>
                </View>
              )}
              <View style={s.actionRow}>
                {index > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={() => jump(index - 1)}
                    style={s.back}
                  >
                    <Text style={s.skipText}>Back</Text>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  disabled={busy}
                  style={s.next}
                  onPress={() => {
                    if (Date.now() - lastChange.current < 250) return;
                    if (index === introductionScenes.length - 1 || error)
                      void finish();
                    else jump(introductionIndex(index, 1));
                  }}
                >
                  <Text style={s.nextText}>
                    {busy
                      ? "Saving…"
                      : error
                        ? "Try again"
                        : index === 2
                          ? "Get Started"
                          : "Next"}
                  </Text>
                  <Ionicons name="arrow-forward" size={22} color="#073721" />
                </Pressable>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#042e21" },
  frame: { flex: 1, width: "100%", maxWidth: 640, alignSelf: "center" },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  progress: { flexDirection: "row" },
  dotTarget: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 11, height: 6, borderRadius: 7, backgroundColor: "#719e89" },
  dotActive: { width: 27, backgroundColor: "#93ec47" },
  skip: {
    minHeight: 48,
    minWidth: 60,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#719e89",
  },
  skipText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  scroll: { flexGrow: 1 },
  scene: { flexGrow: 1, backgroundColor: "#063625" },
  art: {
    backgroundColor: "#135439",
    overflow: "hidden",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  photo: { width: "100%", height: "100%" },
  cooking: { width: "145%", left: "-45%" },
  artTags: { padding: 20, gap: 6, alignItems: "flex-end" },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#073723",
    borderWidth: 1,
    borderColor: "#619478",
  },
  tagText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  copy: { paddingHorizontal: 23, paddingVertical: 14, gap: 8 },
  center: { alignItems: "center" },
  centerText: { textAlign: "center" },
  sceneIcon: {
    width: 48,
    height: 48,
    backgroundColor: "#e7f9d5",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { width: 157, height: 50, borderRadius: 11, backgroundColor: "#fff" },
  title: {
    color: "#fff",
    fontSize: 33,
    fontWeight: "900",
    letterSpacing: -0.8,
  },
  emphasis: { color: "#a4ee50" },
  body: { color: "#e7f5ea", fontSize: 16 },
  details: { gap: 6 },
  benefit: { flexDirection: "row", gap: 7 },
  fine: { color: "#e7f5ea", flex: 1, fontSize: 14 },
  bold: { fontWeight: "700" },
  actions: {
    paddingHorizontal: 21,
    paddingVertical: 9,
    backgroundColor: "#042e21",
    gap: 5,
  },
  error: { gap: 6 },
  actionRow: { flexDirection: "row", gap: 8 },
  back: {
    minWidth: 58,
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  next: {
    minHeight: 52,
    borderRadius: 30,
    backgroundColor: "#f6fdf0",
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    padding: 8,
  },
  nextText: {
    color: "#073721",
    fontSize: 17,
    fontWeight: "900",
    flexShrink: 1,
  },
});
