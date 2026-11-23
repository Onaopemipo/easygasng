import { NextIcon, NextText } from "./MobileNextUI";
import { FocusedFormContext, ScreenTitleContext } from "./CustomerUI";
import { ScreenTransition } from "./ScreenTransition";
import { ScreenModal } from "./ScreenCanvas";
import React, { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, View } from "./surfaces";
import { Text } from "./typography";
import { useTheme } from "./theme";

export function ContextSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScreenModal
      visible
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
      >
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: Math.max(16, insets.bottom),
            },
          ]}
        >
          <View
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: "center",
              marginBottom: 12,
            }}
          />
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close sheet"
              onPress={onClose}
              style={styles.close}
            >
              <NextIcon name="x" color={colors.text} />
            </Pressable>
          </View>
          <FocusedFormContext.Provider value={true}>
            <ScreenTitleContext.Provider value={title}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets={false}
                style={{ flexShrink: 1 }}
                contentContainerStyle={{ paddingVertical: 12, gap: 16 }}
              >
                <ScreenTransition identity={title} fill={false}>
                  {children}
                </ScreenTransition>
              </ScrollView>
            </ScreenTitleContext.Provider>
          </FocusedFormContext.Provider>
        </View>
      </KeyboardAvoidingView>
    </ScreenModal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "88%",
    flexShrink: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { flex: 1, fontSize: 21, fontWeight: "700" },
  close: {
    minHeight: 44,
    minWidth: 56,
    justifyContent: "center",
    alignItems: "center",
  },
});
