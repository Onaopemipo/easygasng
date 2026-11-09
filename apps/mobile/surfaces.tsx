import React, { forwardRef } from "react";
import {
  View as NativeView,
  ScrollView as NativeScrollView,
  Pressable as NativePressable,
  StyleSheet,
  type ViewProps,
  type ScrollViewProps,
  type PressableProps,
} from "react-native";
import { useTheme } from "./theme";
// Bridge existing module surfaces while preserving their handlers and layout.
function surface(style: any, dark: boolean) {
  if (!dark) return style;
  const resolved = { ...StyleSheet.flatten(style) };
  for (const key of [
    "backgroundColor",
    "borderColor",
    "borderBottomColor",
    "borderTopColor",
  ]) {
    const value = resolved[key];
    if (typeof value !== "string") continue;
    if (
      value === "white" ||
      value === "#fff" ||
      value === "#ffffff" ||
      /^#f[0-9a-f]{5}$/i.test(value)
    )
      resolved[key] = key === "backgroundColor" ? "#102b22" : "#365347";
    else if (/^#[de][0-9a-f]{5}$/i.test(value))
      resolved[key] = key === "backgroundColor" ? "#193b2d" : "#365347";
  }
  return resolved;
}
export const View = forwardRef<
  React.ComponentRef<typeof NativeView>,
  ViewProps
>(function View({ style, ...props }, ref) {
  const { dark } = useTheme();
  return <NativeView ref={ref} {...props} style={surface(style, dark)} />;
});
export const ScrollView = forwardRef<
  React.ComponentRef<typeof NativeScrollView>,
  ScrollViewProps
>(function ScrollView({ style, contentContainerStyle, ...props }, ref) {
  const { dark } = useTheme();
  return (
    <NativeScrollView
      ref={ref}
      {...props}
      style={surface(style, dark)}
      contentContainerStyle={surface(contentContainerStyle, dark)}
    />
  );
});
export const Pressable = forwardRef<
  React.ComponentRef<typeof NativeView>,
  PressableProps
>(function Pressable({ style, ...props }, ref) {
  const { dark } = useTheme();
  return (
    <NativePressable
      ref={ref}
      {...props}
      style={(state) =>
        surface(typeof style === "function" ? style(state) : style, dark)
      }
    />
  );
});
