import { friendlyMessage } from "../../packages/business-rules/src/friendly-message";
import { EasyGasLoader } from "./EasyGasLoader";
import { createContext, useContext, useRef } from "react";
import { customerReadAction } from "../../packages/business-rules/src/customer-mobile";
import React, { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./typography";
import { useTheme } from "./theme";
export type CustomerAPI = (action: string, data?: any) => Promise<any>;
type ReadStore = Map<string, { data: any; at: number }>;
const ReadContext = createContext<ReadStore | null>(null);
/** Private reads never survive an account/session change. Re-entry revalidates in place. */
export function RemoteReadScope({
  scope,
  children,
}: {
  scope: string;
  children: React.ReactNode;
}) {
  const store = useRef({ scope, entries: new Map() as ReadStore });
  if (store.current.scope !== scope)
    store.current = { scope, entries: new Map() };
  return (
    <ReadContext.Provider value={store.current.entries}>
      {children}
    </ReadContext.Provider>
  );
}
export function usePrivateReadCache() {
  return useContext(ReadContext);
}
export function useRemote(
  api: CustomerAPI,
  action: string,
  input?: any,
  enabled = true,
) {
  const fingerprint = JSON.stringify(input ?? {});
  const request = enabled
    ? customerReadAction(action, JSON.parse(fingerprint))
    : null;
  const cache = useContext(ReadContext);
  const cached = request ? cache?.get(request) : undefined;
  const fresh = cached && Date.now() - cached.at < 30000 ? cached : undefined;
  const [result, setResult] = useState<
    | { request: string; data: any; error: string; store: ReadStore | null }
    | undefined
  >(() =>
    request && fresh
      ? { request, data: fresh.data, error: "", store: cache }
      : undefined,
  );
  const [version, reload] = useState(0);
  useEffect(() => {
    if (!request) {
      setResult(undefined);
      return;
    }
    let live = true;
    const prior = cache?.get(request);
    setResult((previous) =>
      previous?.store === cache &&
      previous?.request === request &&
      !previous.error
        ? previous
        : prior && Date.now() - prior.at < 30000
          ? { request, data: prior.data, error: "", store: cache }
          : undefined,
    );
    api(request)
      .then((data) => {
        if (live) {
          cache?.set(request, { data, at: Date.now() });
          setResult({ request, data, error: "", store: cache });
        }
      })
      .catch(() => {
        if (live) {
          cache?.delete(request);
          setResult({
            request,
            data: null,
            error: "Could not load this information. Please try again.",
            store: cache,
          });
        }
      });
    return () => {
      live = false;
    };
  }, [request, version, cache]);
  const current =
    result?.store === cache && result?.request === request ? result : undefined;
  return {
    data: current?.data ?? null,
    error: current?.error ?? "",
    reload: () => reload((v) => v + 1),
    loading: enabled && !current,
  };
}
export function Button({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        padding: 14,
        minHeight: 50,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: secondary ? colors.surface : colors.button,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        preserveColor
        style={{
          color: secondary ? colors.text : colors.onButton,
          fontWeight: "700",
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function Card({
  children,
  accent = false,
}: {
  children: React.ReactNode;
  accent?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        padding: 21,
        borderRadius: 22,
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: accent ? colors.elevated : colors.surface,
      }}
    >
      {children}
    </View>
  );
}
export const FocusedFormContext = createContext(false);
export const ScreenTitleContext = createContext<string | null>(null);
export function Title({ children }: { children: React.ReactNode }) {
  const header = useContext(ScreenTitleContext);
  const { colors } = useTheme();
  if (typeof children === "string" && header === children) return null;
  return (
    <Text
      preserveColor
      accessibilityRole="header"
      style={{
        fontSize: 19,
        lineHeight: 25,
        fontWeight: "700",
        color: colors.text,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}
export function Copy({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text preserveColor style={{ color: colors.muted }}>
      {children}
    </Text>
  );
}
export function Feedback({
  loading,
  error,
  retry,
  empty,
}: {
  loading?: boolean;
  error?: string;
  retry?: () => void;
  empty?: string;
}) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(false);
    if (!loading) return;
    const timer = setTimeout(() => setShow(true), 180);
    return () => clearTimeout(timer);
  }, [loading]);
  if (loading && !error && !show) return null;
  if (loading && !error)
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading customer information"
        accessibilityState={{ busy: true }}
        style={{ padding: 16, gap: 10, alignSelf: "stretch" }}
      >
        <View
          style={{
            height: 12,
            width: "62%",
            borderRadius: 6,
            backgroundColor: colors.skeleton,
          }}
        />
        <View
          style={{
            height: 12,
            width: "88%",
            borderRadius: 6,
            backgroundColor: colors.skeleton,
          }}
        />
      </View>
    );
  if (error)
    return (
      <Card>
        <Text
          preserveColor
          accessibilityRole="alert"
          style={{ color: colors.error }}
        >
          {friendlyMessage(error)}
        </Text>
        {retry && <Button label="Try again" onPress={retry} secondary />}
      </Card>
    );
  return empty ? (
    <Card>
      <Copy>{empty}</Copy>
    </Card>
  ) : null;
}
export function Row({
  label,
  detail,
  icon,
  onPress,
}: {
  label: string;
  detail?: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: 60,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderRadius: 14,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Ionicons
        accessible={false}
        name={icon}
        size={23}
        color={colors.primary}
      />
      <View style={{ flex: 1 }}>
        <Text preserveColor style={{ color: colors.text, fontWeight: "700" }}>
          {label}
        </Text>
        {detail && <Copy>{detail}</Copy>}
      </View>
      <Ionicons
        accessible={false}
        name="chevron-forward"
        size={18}
        color={colors.muted}
      />
    </Pressable>
  );
}
export const money = (value: number | string | null | undefined) =>
  value == null
    ? "Not available"
    : `₦${(Number(value) / 100).toLocaleString("en-NG")}`;
