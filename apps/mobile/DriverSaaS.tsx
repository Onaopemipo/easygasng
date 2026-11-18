import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./typography";
import { useTheme } from "./theme";
import {
  driverAssignmentTone,
  driverMetric,
} from "../../packages/business-rules/src/driver-presentation";
type Icon = React.ComponentProps<typeof Ionicons>["name"];
export function DriverPanel({ children }: { children: React.ReactNode }) {
  const { colors, dark } = useTheme();
  return (
    <View
      style={{
        padding: 18,
        gap: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        boxShadow: dark ? undefined : "0 3px 15px #123f240c",
      }}
    >
      {children}
    </View>
  );
}
export function DriverHeading({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: Icon;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
      {icon && (
        <Ionicons
          accessible={false}
          name={icon}
          size={22}
          color={colors.primary}
        />
      )}
      <Text
        preserveColor
        accessibilityRole="header"
        style={{
          fontWeight: "800",
          fontSize: 20,
          letterSpacing: -0.6,
          color: colors.text,
          flexShrink: 1,
        }}
      >
        {children}
      </Text>
    </View>
  );
}
export function DriverBadge({ label }: { label: string }) {
  const { colors, dark } = useTheme(),
    tone = driverAssignmentTone(label);
  const tint =
    tone === "blue"
      ? dark
        ? "#143c55"
        : "#e6f2ff"
      : tone === "amber"
        ? dark
          ? "#49371c"
          : "#fff2d8"
        : colors.elevated;
  const ink =
    tone === "blue"
      ? dark
        ? "#a8d9ff"
        : "#0c5d9c"
      : tone === "amber"
        ? dark
          ? "#ffdb98"
          : "#7b4c0b"
        : colors.primary;
  return (
    <View
      style={{
        borderRadius: 30,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: tint,
        alignSelf: "flex-start",
        maxWidth: "100%",
      }}
    >
      <Text
        preserveColor
        style={{ color: ink, fontWeight: "700", fontSize: 13, flexShrink: 1 }}
      >
        {label}
      </Text>
    </View>
  );
}
export function DriverMetric({
  label,
  value,
  confirmed,
  icon,
  tone = "green",
}: {
  label: string;
  value: unknown;
  confirmed: boolean;
  icon: Icon;
  tone?: string;
}) {
  const { colors, dark } = useTheme();
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: 88,
        minWidth: 0,
        padding: 14,
        gap: 10,
        borderRadius: 16,
        backgroundColor: dark
          ? colors.elevated
          : tone === "blue"
            ? "#eaf5ff"
            : tone === "amber"
              ? "#fff7e7"
              : "#edf9ef",
      }}
    >
      <Ionicons
        accessible={false}
        name={icon}
        size={25}
        color={colors.primary}
      />
      <Text
        preserveColor
        style={{
          color: colors.text,
          fontWeight: "800",
          fontSize: 29,
          letterSpacing: -1,
          flexShrink: 1,
        }}
      >
        {driverMetric(value, confirmed)}
      </Text>
      <Text
        preserveColor
        style={{
          color: colors.text,
          fontSize: 13,
          fontWeight: "600",
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
export function DriverSettingRow({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description?: string;
  icon: Icon;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const content = (
    <>
      <View style={{ width: 35, alignItems: "center" }}>
        <Ionicons
          accessible={false}
          name={icon}
          size={25}
          color={colors.primary}
        />
      </View>
      <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
        <Text
          preserveColor
          style={{ fontWeight: "700", fontSize: 16, color: colors.text }}
        >
          {title}
        </Text>
        {description && (
          <Text preserveColor style={{ color: colors.muted, fontSize: 13 }}>
            {description}
          </Text>
        )}
      </View>
      {onPress && (
        <Ionicons
          accessible={false}
          name="chevron-forward"
          size={19}
          color={colors.muted}
        />
      )}
    </>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}
export function DriverSignal({
  label,
  value,
  icon,
  onPress,
}: {
  label: string;
  value: string;
  icon: Icon;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const content = (
    <>
      <Ionicons
        accessible={false}
        name={icon}
        size={22}
        color={colors.primary}
      />
      <Text
        preserveColor
        style={{ fontSize: 12, fontWeight: "700", color: colors.text }}
      >
        {label}
      </Text>
      <Text preserveColor style={{ fontSize: 12, color: colors.muted }}>
        {value}
      </Text>
    </>
  );
  const style = {
    flex: 1,
    minWidth: 80,
    minHeight: 80,
    gap: 5,
    padding: 8,
    alignItems: "flex-start" as const,
  };
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={style}
    >
      {content}
    </Pressable>
  ) : (
    <View style={style}>{content}</View>
  );
}
const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
