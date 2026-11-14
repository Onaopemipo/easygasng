import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./theme";
import React, { forwardRef, useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  type StyleProp,
  type TextStyle,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextProps,
  type TextInputProps,
} from "react-native";

function fontMetrics(fontSize = 15) {
  const size = Math.max(15, fontSize);
  return { fontSize: size, lineHeight: Math.max(24, Math.ceil(size * 1.5)) };
}

// Explicit defaults cover unstyled labels, notices, controls and navigation.
// Native accessibility font scaling remains enabled.
function readable(style: StyleProp<TextStyle>, dark: boolean) {
  const resolved = StyleSheet.flatten(style);
  const value = resolved?.color;
  const color =
    dark &&
    (!value ||
      (typeof value === "string" &&
        ([
          "#10251c",
          "#07592e",
          "#087a36",
          "#142c20",
          "#24361f",
          "#064527",
          "#153c28",
          "#173b26",
          "#1b3024",
          "#142b20",
          "#223b2b",
          "#111",
          "#000",
          "black",
        ].includes(value) ||
          /^#[456789ab][0-9a-f]{5}$/i.test(value))))
      ? "#d7efdf"
      : value;
  return {
    color,
    ...fontMetrics(resolved?.fontSize),
  };
}
export const Text = forwardRef<
  React.ComponentRef<typeof NativeText>,
  TextProps & { preserveColor?: boolean }
>(function Text(
  { style, preserveColor = false, allowFontScaling = true, ...props },
  ref,
) {
  const { dark } = useTheme();
  return (
    <NativeText
      ref={ref}
      {...props}
      allowFontScaling={allowFontScaling}
      style={[style, readable(style, dark && !preserveColor)]}
    />
  );
});
export const TextInput = forwardRef<
  React.ComponentRef<typeof NativeTextInput>,
  TextInputProps
>(function TextInput({ style, allowFontScaling = true, ...props }, ref) {
  const { dark, colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const input = (
    <NativeTextInput
      ref={ref}
      keyboardAppearance={dark ? "dark" : "light"}
      {...props}
      placeholderTextColor={colors.muted}
      selectionColor={colors.primary}
      secureTextEntry={Boolean(props.secureTextEntry) && !visible}
      allowFontScaling={allowFontScaling}
      style={[
        style,
        {
          ...fontMetrics(StyleSheet.flatten(style)?.fontSize),
          backgroundColor: colors.input,
          color: colors.text,
          borderColor: colors.border,
        },
        props.secureTextEntry && { paddingRight: 52 },
      ]}
    />
  );
  if (!props.secureTextEntry) return input;
  return (
    <View style={{ position: "relative" }}>
      {input}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? "Hide password" : "Show password"}
        accessibilityState={{ disabled: props.editable === false, selected: visible }}
        disabled={props.editable === false}
        onPress={() => setVisible((current) => !current)}
        style={{ position: "absolute", right: 4, top: 0, bottom: 0, width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}
      >
        <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={22} color={colors.text} />
      </Pressable>
    </View>
  );
});

export function FieldCaption({
  children,
  required,
  style,
}: {
  children: string;
  required: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Text style={style} accessibilityLabel={fieldAccessibilityLabel(children, required)}>
      {children}
      <Text preserveColor style={{ color: required ? colors.error : colors.muted }}>
        {required ? " *" : " (optional)"}
      </Text>
    </Text>
  );
}

export function fieldAccessibilityLabel(label: string, required: boolean) {
  return `${label}, ${required ? "required" : "optional"}`;
}
