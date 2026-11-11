import React, { type ReactNode } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Pressable, View } from "./surfaces";
import { Text } from "./typography";
import { useTheme } from "./theme";

export function ContextSheet({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return <Modal visible transparent animationType="none" onRequestClose={onClose}>
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.overlay, { backgroundColor: colors.overlay }]}>
      <View accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: Math.max(16, insets.bottom) }]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close sheet" onPress={onClose} style={styles.close}><Text>Close</Text></Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { maxHeight: "88%", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { flex: 1, fontSize: 21, fontWeight: "700" },
  close: { minHeight: 44, minWidth: 56, justifyContent: "center", alignItems: "center" },
});
