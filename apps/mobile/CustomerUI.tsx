import { createContext, useContext } from "react";
import { customerReadAction } from "../../packages/business-rules/src/customer-mobile";
import React, { useEffect, useState } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./typography";
import { useTheme } from "./theme";
export type CustomerAPI = (action: string, data?: any) => Promise<any>;
export function useRemote(
  api: CustomerAPI,
  action: string,
  input?: any,
  enabled = true,
) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [version, reload] = useState(0);
  const fingerprint = JSON.stringify(input ?? {});
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    if (enabled)
      api(customerReadAction(action, JSON.parse(fingerprint)))
        .then((value) => {
          if (live) setData(value);
        })
        .catch(() => {
          if (live)
            setError("Could not load this information. Please try again.");
        });
    return () => {
      live = false;
    };
  }, [action, fingerprint, version, enabled]);
  return {
    data,
    error,
    reload: () => reload((v) => v + 1),
    loading: enabled && data === null && !error,
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
        minHeight: 48,
        borderRadius: 14,
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
        padding: 18,
        borderRadius: 18,
        gap: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: accent ? colors.elevated : colors.surface,
      }}
    >
      {children}
    </View>
  );
}
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
        fontSize: 25,
        lineHeight: 32,
        fontWeight: "800",
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
  if (loading)
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Loading customer information"
        style={{ padding: 20 }}
      >
        <ActivityIndicator color={colors.primary} />
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
          {error}
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
