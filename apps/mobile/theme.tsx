import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import {
  parseMobileAppearance,
  resolveMobileAppearance,
} from "../../packages/business-rules/src/mobile-appearance";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
export type Preference = "light" | "dark" | "system";
export const palettes = {
  light: {
    background: "#f7faf7",
    surface: "#ffffff",
    text: "#10251c",
    muted: "#54675e",
    border: "#dbe6df",
    primary: "#087a36",
    accent: "#c6f500",
    onAccent: "#10251c",
    elevated: "#edf7e9",
    button: "#087a36",
    onButton: "#ffffff",
    error: "#a32121",
    success: "#087a36",
    overlay: "#000000aa",
    input: "#f7faf7",
    skeleton: "#e4ebe6",
    chart: "#087a36",
  },
  dark: {
    background: "#03150f",
    surface: "#102b22",
    text: "#f4faf6",
    muted: "#bed0c5",
    border: "#365347",
    primary: "#a7ed67",
    accent: "#c6f500",
    onAccent: "#10251c",
    elevated: "#193b2d",
    button: "#c6f500",
    onButton: "#10251c",
    error: "#ffacac",
    success: "#a7ed67",
    overlay: "#000000cc",
    input: "#102b22",
    skeleton: "#365347",
    chart: "#a7ed67",
  },
};
const Context = createContext({
  preference: "system" as Preference,
  dark: false,
  colors: palettes.light,
  setPreference: async (_: Preference) => {},
});
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);
  const system = useColorScheme();
  const [preference, update] = useState<Preference>("system");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let live = true;
    SecureStore.getItemAsync("easygas.appearance.v1")
      .then((value) => {
        if (live) update(parseMobileAppearance(value));
      })
      .catch(() => {})
      .finally(() => {
        if (live) setReady(true);
      });
    return () => {
      live = false;
    };
  }, []);
  const dark = resolveMobileAppearance(preference, system) === "dark";
  async function setPreference(value: Preference) {
    await SecureStore.setItemAsync("easygas.appearance.v1", value);
    update(value);
  }
  if (!ready || (!fontsLoaded && !fontError)) return null;
  return (
    <Context.Provider
      value={{
        preference,
        dark,
        colors: dark ? palettes.dark : palettes.light,
        setPreference,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useTheme = () => useContext(Context);
