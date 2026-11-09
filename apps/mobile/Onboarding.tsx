import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Image,
  ImageBackground,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";
import { Text } from "./typography";
import { useTheme } from "./theme";
const pages = [
  {
    title: "Gas to Your\nDoorstep",
    body: "Order cooking gas for your home, with clear prices and delivery records.",
    image: require("./assets/delivery.png"),
  },
  {
    title: "Never Run\nOut of Gas",
    body: "Plan your next refill. Estimates use your verified purchase history, not a gas sensor.",
    image: require("./assets/cooking-hero.webp"),
  },
  {
    title: "Track\nEvery Delivery",
    body: "Follow recorded order updates from confirmation to delivery. Location appears only when available.",
    image: require("./assets/delivery.png"),
  },
  {
    title: "Care for\nYour Kitchen",
    body: "Explore available services, request appointments and keep your service records together.",
    image: require("./assets/cooking-hero.webp"),
  },
];
export default function Onboarding({ replay = 0 }: { replay?: number }) {
  const { colors, dark } = useTheme();
  const { width } = useWindowDimensions();
  const [visible, setVisible] = useState(false),
    [page, setPage] = useState(0),
    [reduced, setReduced] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    SecureStore.getItemAsync("easygas.onboarding.v1")
      .then((seen) => {
        if (live) setVisible(!seen);
      })
      .catch(() => {
        if (live) setVisible(true);
      });
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (live) setReduced(value);
    });
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      live = false;
      listener.remove();
    };
  }, []);
  async function finish() {
    try {
      await SecureStore.setItemAsync("easygas.onboarding.v1", "seen");
      setVisible(false);
    } catch {
      setError(
        "Could not save your introduction preference. Try again, or continue without saving.",
      );
    }
  }
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [page]);
  const gesture = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 35 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderRelease: (_, g) => {
      if (g.dx < -50) setPage((value) => Math.min(pages.length - 1, value + 1));
      else if (g.dx > 50) setPage((value) => Math.max(0, value - 1));
    },
  });
  useEffect(() => {
    if (replay > 0) {
      setPage(0);
      setVisible(true);
      setError("");
    }
  }, [replay]);
  const item = pages[page];
  return (
    <Modal
      visible={visible}
      animationType={reduced ? "none" : "fade"}
      onRequestClose={finish}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <ImageBackground
            {...gesture.panHandlers}
            source={
              imageFailed ? require("./assets/brand-reference.png") : item.image
            }
            onError={() => setImageFailed(true)}
            resizeMode="cover"
            style={{
              height: Math.min(width * 1.12, 450),
              backgroundColor: colors.surface,
            }}
            accessible={false}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                padding: 22,
              }}
            >
              <Image
                source={require("./assets/easygas-logo-hd.png")}
                resizeMode="contain"
                style={{
                  width: 130,
                  height: 46,
                  backgroundColor: "#fff",
                  borderRadius: 12,
                }}
              />
              <Pressable
                accessibilityRole="button"
                onPress={finish}
                style={{
                  minHeight: 48,
                  minWidth: 60,
                  backgroundColor: colors.surface,
                  borderRadius: 24,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  preserveColor
                  style={{ color: colors.text, fontWeight: "700" }}
                >
                  Skip
                </Text>
              </Pressable>
            </View>
          </ImageBackground>
          <View
            style={{
              padding: 26,
              flex: 1,
              backgroundColor: colors.background,
              borderTopLeftRadius: 32,
              borderTopRightRadius: 32,
              marginTop: -24,
            }}
          >
            <Text
              preserveColor
              accessibilityRole="header"
              style={{
                fontSize: 34,
                lineHeight: 40,
                fontWeight: "800",
                color: colors.text,
              }}
            >
              {item.title}
            </Text>
            <Text
              preserveColor
              style={{
                fontSize: 17,
                lineHeight: 26,
                color: colors.muted,
                marginTop: 16,
              }}
            >
              {item.body}
            </Text>
            {error ? (
              <>
                <Text
                  preserveColor
                  accessibilityRole="alert"
                  style={{ color: colors.text, marginTop: 12 }}
                >
                  {error}
                </Text>
                <Pressable
                  onPress={() => setVisible(false)}
                  style={{ paddingVertical: 14 }}
                >
                  <Text preserveColor style={{ color: colors.primary }}>
                    Continue without saving preference
                  </Text>
                </Pressable>
              </>
            ) : null}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 32,
              }}
            >
              <View style={{ flexDirection: "row" }}>
                {pages.map((_, i) => (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={`Introduction ${i + 1} of ${pages.length}`}
                    accessibilityState={{ selected: i === page }}
                    onPress={() => setPage(i)}
                    style={{
                      minWidth: 44,
                      minHeight: 48,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        height: 8,
                        width: i === page ? 22 : 8,
                        borderRadius: 8,
                        backgroundColor:
                          i === page ? colors.primary : colors.border,
                      }}
                    />
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  page === pages.length - 1
                    ? "Get started"
                    : "Next introduction"
                }
                onPress={() =>
                  page === pages.length - 1 ? finish() : setPage(page + 1)
                }
                style={{
                  minHeight: 52,
                  minWidth: 58,
                  borderRadius: 28,
                  backgroundColor: dark ? colors.accent : colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  preserveColor
                  style={{
                    fontSize: 24,
                    color: dark ? colors.onAccent : "#fff",
                  }}
                >
                  →
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
