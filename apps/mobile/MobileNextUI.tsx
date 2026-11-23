import { TextInput } from "./typography";
import React, { createContext, useContext } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type TextProps,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  Polyline,
  Polygon,
  Ellipse,
} from "react-native-svg";
import iconNodes from "./mobile-next-icons.json";
import BrandLogo from "./BrandLogo";
import { useTheme } from "./theme";

// Lucide v0.548.0 icon nodes, ISC license. The approved prototype uses the same artwork.
const shapes: any = {
  path: Path,
  circle: Circle,
  rect: Rect,
  line: Line,
  polyline: Polyline,
  polygon: Polygon,
  ellipse: Ellipse,
};
export type NextIconName = keyof typeof iconNodes;
export function NextIcon({
  name = "flame",
  size = 21,
  color,
}: {
  name?: NextIconName;
  size?: number;
  color?: string;
}) {
  const { colors } = useTheme();
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? colors.primary}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessible={false}
    >
      {iconNodes[name].map(([tag, attrs]: any, i: number) =>
        React.createElement(shapes[tag], { ...attrs, key: i }),
      )}
    </Svg>
  );
}
export function NextText({
  kind = "body",
  style,
  ...props
}: TextProps & {
  kind?: "body" | "title" | "heading" | "label" | "small" | "eyebrow";
}) {
  const { colors } = useTheme();
  return (
    <Text
      {...props}
      allowFontScaling
      style={[{ color: colors.text }, type[kind], style]}
    />
  );
}
export function NextIntro({
  title,
  detail,
  eyebrow,
}: {
  title: string;
  detail?: string;
  eyebrow?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 9, marginTop: 12, marginBottom: 24 }}>
      {eyebrow && (
        <NextText kind="eyebrow" style={{ color: colors.muted }}>
          {eyebrow}
        </NextText>
      )}
      <NextText kind="title" accessibilityRole="header">
        {title}
      </NextText>
      {detail && <NextText style={{ color: colors.muted }}>{detail}</NextText>}
    </View>
  );
}
export function NextButton({
  label,
  onPress,
  secondary = false,
  disabled = false,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 50,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 13,
        paddingHorizontal: compact ? 18 : 24,
        borderRadius: 16,
        backgroundColor: secondary ? colors.surface : colors.button,
        borderWidth: secondary ? 1 : 0,
        borderColor: colors.border,
        opacity: disabled ? 0.48 : pressed ? 0.8 : 1,
      })}
    >
      <NextText
        kind="label"
        style={{
          color: secondary ? colors.text : colors.onButton,
          textAlign: "center",
        }}
      >
        {label}
      </NextText>
    </Pressable>
  );
}
export function NextCard({
  children,
  soft = false,
  style,
}: {
  children: React.ReactNode;
  soft?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          padding: 21,
          gap: 12,
          borderRadius: 22,
          backgroundColor: soft ? colors.elevated : colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function NextList({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderRadius: 21,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}
export function NextRow({
  title,
  detail,
  icon = "package",
  onPress,
  tail,
}: {
  title: string;
  detail?: string;
  icon?: NextIconName;
  onPress: () => void;
  tail?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => ({
        padding: 16,
        minHeight: 76,
        flexDirection: "row",
        alignItems: "center",
        gap: 13,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.elevated : colors.surface,
      })}
    >
      <View
        style={{
          height: 40,
          width: 40,
          borderRadius: 14,
          backgroundColor: colors.elevated,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <NextIcon name={icon} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <NextText kind="label">{title}</NextText>
        {detail && (
          <NextText kind="small" style={{ color: colors.muted }}>
            {detail}
          </NextText>
        )}
      </View>
      {tail ?? <NextIcon name="chevron-right" color={colors.muted} size={18} />}
    </Pressable>
  );
}
export function NextEmpty({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        alignItems: "center",
        gap: 12,
        paddingVertical: 35,
        paddingHorizontal: 16,
      }}
    >
      <View
        style={{
          height: 52,
          width: 52,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.elevated,
        }}
      >
        <NextIcon name="package" size={25} />
      </View>
      <NextText kind="heading" style={{ textAlign: "center" }}>
        {title}
      </NextText>
      {detail && (
        <NextText style={{ color: colors.muted, textAlign: "center" }}>
          {detail}
        </NextText>
      )}
      {action}
    </View>
  );
}
export function NextNotice({
  children,
  error = false,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        borderRadius: 15,
        padding: 15,
        gap: 8,
        backgroundColor: error ? colors.error + "14" : colors.elevated,
      }}
    >
      <NextText
        accessibilityRole={error ? "alert" : "text"}
        style={{ color: error ? colors.error : colors.text }}
      >
        {children}
      </NextText>
    </View>
  );
}
export function NextStatus({ value }: { value: string }) {
  const { colors } = useTheme();
  const positive = /^(verified|paid|delivered|completed|active|eligible)$/.test(
    value,
  );
  return (
    <View
      style={{
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 10,
        backgroundColor: positive ? colors.elevated : colors.border + "80",
        alignSelf: "flex-start",
      }}
    >
      <NextText
        kind="small"
        style={{
          color: positive ? colors.primary : colors.muted,
          textTransform: "capitalize",
        }}
      >
        {value?.replaceAll("_", " ") || "Pending"}
      </NextText>
    </View>
  );
}
export function NextField({
  label,
  value,
  onChange,
  placeholder,
  keyboardType,
  secureTextEntry = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  keyboardType?: any;
  secureTextEntry?: boolean;
  multiline?: boolean;
}) {
  const { colors, dark } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <NextText kind="label">{label}</NextText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardAppearance={dark ? "dark" : "light"}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        allowFontScaling
        style={{
          minHeight: 52,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          color: colors.text,
          backgroundColor: colors.input,
          fontSize: 16,
          lineHeight: 23,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}
export function NextChoice({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <NextText kind="label">{label}</NextText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label + ", " + value}
        onPress={onPress}
        style={{
          minHeight: 52,
          padding: 14,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          backgroundColor: colors.input,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <NextText style={{ flex: 1 }}>{value}</NextText>
        <NextIcon name="chevron-right" size={17} color={colors.muted} />
      </Pressable>
    </View>
  );
}
export function NextHeader({
  home = false,
  title,
  user,
  onBack,
  onWork,
  onNotifications,
  onAccount,
}: {
  home?: boolean;
  title?: string;
  user?: any;
  onBack?: () => void;
  onWork?: () => void;
  onNotifications?: () => void;
  onAccount?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        minHeight: 69,
        paddingHorizontal: 22,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: colors.background,
      }}
    >
      {home ? (
        <>
          <BrandLogo style={{ width: 105, height: 38 }} />
          <View style={{ flex: 1 }} />
          {onNotifications && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              onPress={onNotifications}
              style={styles.iconButton}
            >
              <NextIcon name="bell" color={colors.text} />
            </Pressable>
          )}
          {onAccount && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Account"
              onPress={onAccount}
              style={[
                styles.iconButton,
                { backgroundColor: colors.elevated, borderRadius: 23 },
              ]}
            >
              <NextText kind="label" style={{ color: colors.primary }}>
                {initials(user?.name)}
              </NextText>
            </Pressable>
          )}
        </>
      ) : (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            style={styles.iconButton}
          >
            <NextIcon name="chevron-left" color={colors.text} />
          </Pressable>
          <NextText kind="label" numberOfLines={1} style={{ flex: 1 }}>
            {title || "Your EasyGas"}
          </NextText>
          {onWork && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="More workspaces"
              onPress={onWork}
              style={styles.iconButton}
            >
              <NextIcon name="layers" color={colors.text} />
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}
export type NextTab = { label: string; screen: string; icon: NextIconName };
export function NextTabs({
  tabs,
  active,
  onNavigate,
}: {
  tabs: NextTab[];
  active: string;
  onNavigate: (screen: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        minHeight: 68,
        paddingVertical: 8,
        paddingHorizontal: 9,
        flexDirection: "row",
        gap: 3,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        backgroundColor: colors.background,
      }}
    >
      {tabs.map((t) => (
        <Pressable
          key={t.screen}
          accessibilityRole="tab"
          accessibilityLabel={t.label}
          accessibilityState={{ selected: active === t.screen }}
          onPress={() => onNavigate(t.screen)}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: 50,
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            paddingVertical: 5,
            paddingHorizontal: 2,
            borderRadius: 14,
            backgroundColor:
              active === t.screen
                ? colors.elevated
                : pressed
                  ? colors.surface
                  : "transparent",
          })}
        >
          <NextIcon
            name={t.icon}
            size={21}
            color={active === t.screen ? colors.primary : colors.muted}
          />
          <NextText
            kind="small"
            numberOfLines={1}
            style={{
              fontSize: 12,
              lineHeight: 16,
              fontWeight: active === t.screen ? "700" : "500",
              color: active === t.screen ? colors.primary : colors.muted,
            }}
          >
            {t.label}
          </NextText>
        </Pressable>
      ))}
    </View>
  );
}
export const customerNextTabs: NextTab[] = [
  { label: "Home", screen: "home", icon: "home" },
  { label: "Orders", screen: "orders", icon: "package" },
  { label: "Services", screen: "services", icon: "wrench" },
  { label: "Wallet", screen: "wallet", icon: "wallet" },
  { label: "Account", screen: "more", icon: "user-round" },
];
export const businessNextTabs: NextTab[] = [
  { label: "Overview", screen: "home", icon: "home" },
  { label: "Orders", screen: "orders", icon: "package" },
  { label: "Work", screen: "native-workspaces", icon: "layers" },
  { label: "Account", screen: "more", icon: "user-round" },
];
export function nextActiveTab(screen: string, customer = true) {
  if (customer) {
    if (
      [
        "gas-order",
        "checkout",
        "combined-checkout",
        "payment",
        "cart",
      ].includes(screen)
    )
      return "orders";
    if (["bookings"].includes(screen)) return "services";
    if (["credit"].includes(screen)) return "wallet";
    if (
      [
        "profile",
        "appearance",
        "notifications",
        "public-info",
        "public-policies",
        "consumption",
        "plans",
        "rewards",
        "cylinders",
        "invoices",
        "conversations",
        "recurring",
        "products",
        "detail",
        "customer-workspaces",
      ].includes(screen)
    )
      return "more";
  } else if (
    screen.startsWith("workspace:") ||
    screen === "native-workspaces" ||
    [
      "owner-operations",
      "owner-finance",
      "owner-reports",
      "owner-approvals",
      "owner-audit",
      "branch-dispatch",
      "sales-customers",
      "retail-pos",
      "technicians-management",
    ].includes(screen)
  )
    return "native-workspaces";
  return screen;
}
export function initials(name?: string) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0])
      .join("")
      .toUpperCase() || "EG"
  );
}
export const NextDockContext = createContext<(node: React.ReactNode) => void>(
  () => {},
);
export function NextDock({
  total,
  label,
  onPress,
  disabled = false,
}: {
  total?: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 22,
        paddingVertical: 13,
        borderTopWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        flexDirection: "row",
        alignItems: "center",
        gap: 18,
      }}
    >
      {total && (
        <View style={{ gap: 3 }}>
          <NextText kind="eyebrow" style={{ color: colors.muted }}>
            ORDER TOTAL
          </NextText>
          <NextText kind="heading">{total}</NextText>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <NextButton label={label} onPress={onPress} disabled={disabled} />
      </View>
    </View>
  );
}
export function useNextDock(
  options: React.ComponentProps<typeof NextDock> | null,
) {
  const set = useContext(NextDockContext),
    current = React.useRef(options);
  current.current = options;
  const onPress = React.useCallback(() => current.current?.onPress(), []);
  const label = options?.label,
    total = options?.total,
    disabled = options?.disabled,
    enabled = !!options;
  React.useLayoutEffect(() => {
    set(
      enabled ? (
        <NextDock
          total={total}
          label={label!}
          disabled={disabled}
          onPress={onPress}
        />
      ) : null,
    );
    return () => set(null);
  }, [set, enabled, label, total, disabled, onPress]);
}
const styles = StyleSheet.create({
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});
const type = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 25, fontWeight: "400" },
  title: {
    fontSize: 32,
    lineHeight: 37,
    letterSpacing: -1.1,
    fontWeight: "700",
  },
  heading: {
    fontSize: 19,
    lineHeight: 25,
    letterSpacing: -0.35,
    fontWeight: "700",
  },
  label: { fontSize: 14, lineHeight: 21, fontWeight: "600" },
  small: { fontSize: 13, lineHeight: 19, fontWeight: "400" },
  eyebrow: {
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 1.1,
    fontWeight: "600",
  },
});
