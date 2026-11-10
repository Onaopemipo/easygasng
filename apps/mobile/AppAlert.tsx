import React, { useEffect, useSyncExternalStore } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  AccessibilityInfo,
} from "react-native";
import { useTheme } from "./theme";
import { createDialogQueue } from "../../packages/business-rules/src/dialog-queue";
import { friendlyMessage } from "../../packages/business-rules/src/friendly-message";
type Button = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void | Promise<void>;
};
type Options = { title: string; message: string; buttons: Button[] };
const queue = createDialogQueue<Options, number | null>();
export const EasyGasAlert = {
  dismissAll() {
    queue.cancelAll(null);
  },
  alert(title: string, message = "", buttons: Button[] = [{ text: "Got it" }]) {
    void queue
      .open({
        title,
        message: message ? friendlyMessage(message) : "",
        buttons,
      })
      .then(async (index) => {
        if (index !== null) await buttons[index]?.onPress?.();
      })
      .catch((error: unknown) => {
        EasyGasAlert.alert(
          "Unable to complete this request",
          friendlyMessage(error),
        );
      });
  },
};
export function AppAlertProvider() {
  useEffect(() => () => EasyGasAlert.dismissAll(), []);
  const item = useSyncExternalStore(queue.subscribe, queue.current, () => null),
    { colors } = useTheme();
  if (!item) return null;
  const cancel = () => queue.settle(item.id, null);
  return (
    <Modal
      key={item.id}
      visible
      transparent
      animationType="fade"
      onRequestClose={cancel}
      onShow={() =>
        AccessibilityInfo.announceForAccessibility(
          `${item.options.title}${item.options.message ? ". " + friendlyMessage(item.options.message) : ""}`,
        )
      }
    >
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          backgroundColor: colors.overlay,
        }}
        accessibilityViewIsModal
      >
        <View
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 24,
            padding: 24,
            maxHeight: "85%",
          }}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text
              style={{ fontSize: 18, fontWeight: "800", color: colors.primary }}
            >
              EasyGas
            </Text>
            <Text
              accessibilityRole="header"
              style={{
                fontSize: 24,
                fontWeight: "700",
                color: colors.text,
                marginVertical: 16,
              }}
            >
              {item.options.title}
            </Text>
            <Text style={{ fontSize: 16, lineHeight: 25, color: colors.text }}>
              {item.options.message ? friendlyMessage(item.options.message) : ""}
            </Text>
          </ScrollView>
          <View style={{ gap: 12, marginTop: 24 }}>
            {item.options.buttons.map((button, index) => (
              <Pressable
                key={index}
                accessibilityRole="button"
                onPress={() => queue.settle(item.id, index)}
                style={{
                  minHeight: 48,
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor:
                    button.style === "cancel"
                      ? colors.surface
                      : button.style === "destructive"
                        ? colors.error
                        : colors.button,
                }}
              >
                <Text
                  style={{
                    textAlign: "center",
                    fontSize: 16,
                    fontWeight: "700",
                    color:
                      button.style === "cancel" ? colors.text : colors.onButton,
                  }}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}
