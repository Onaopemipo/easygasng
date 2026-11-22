import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import {
  View,
  Modal,
  Text,
  Pressable,
  ScrollView,
  AccessibilityInfo,
  Keyboard,
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
type DialogItem = NonNullable<ReturnType<typeof queue.current>>;
type Host = { id: symbol; depth: number };
const hosts: Host[] = [];
const hostListeners = new Set<() => void>();
const HostDepth = createContext(0);
const currentHost = () =>
  hosts.reduce<Host | null>(
    (top, host) => (!top || host.depth >= top.depth ? host : top),
    null,
  )?.id ?? null;
const subscribeHosts = (listener: () => void) => {
  hostListeners.add(listener);
  return () => {
    hostListeners.delete(listener);
  };
};
const notifyHosts = () => hostListeners.forEach((listener) => listener());
export function dismissPresentedDialog() {
  const item = queue.current();
  if (!item) return false;
  queue.settle(item.id, null);
  return true;
}
/** Render confirmations inside the top presented screen, above its controls. */
export function ModalAlertHost({
  children,
  visible,
}: {
  children: React.ReactNode;
  visible: boolean;
}) {
  const [id] = useState(() => Symbol("native-dialog-host"));
  const depth = useContext(HostDepth) + 1;
  useLayoutEffect(() => {
    if (!visible) return;
    const host = { id, depth };
    hosts.push(host);
    notifyHosts();
    return () => {
      if (currentHost() === id) EasyGasAlert.dismissAll();
      const index = hosts.indexOf(host);
      if (index >= 0) hosts.splice(index, 1);
      notifyHosts();
    };
  }, [id, depth, visible]);
  const top = useSyncExternalStore(subscribeHosts, currentHost, () => null);
  const item = useSyncExternalStore(queue.subscribe, queue.current, () => null);
  const active = visible && top === id && !!item;
  return (
    <HostDepth.Provider value={depth}>
      <View style={{ flex: 1 }}>
        <View
          style={{ flex: 1 }}
          pointerEvents={active ? "none" : "auto"}
          accessibilityElementsHidden={active}
          importantForAccessibility={active ? "no-hide-descendants" : "auto"}
        >
          {children}
        </View>
        {active && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          >
            <DialogSurface item={item} />
          </View>
        )}
      </View>
    </HostDepth.Provider>
  );
}
export function AppAlertProvider() {
  useEffect(() => () => EasyGasAlert.dismissAll(), []);
  const item = useSyncExternalStore(queue.subscribe, queue.current, () => null);
  const top = useSyncExternalStore(subscribeHosts, currentHost, () => null);
  if (!item || top) return null;
  return (
    <Modal
      key={item.id}
      visible
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={() => {
        dismissPresentedDialog();
      }}
    >
      <DialogSurface item={item} />
    </Modal>
  );
}
function DialogSurface({ item }: { item: DialogItem }) {
  const { colors } = useTheme();
  useEffect(() => {
    Keyboard.dismiss();
    AccessibilityInfo.announceForAccessibility(
      `${item.options.title}${item.options.message ? ". " + friendlyMessage(item.options.message) : ""}`,
    );
  }, [item.id]);
  return (
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
  );
}
