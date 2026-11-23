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
    background: "#f8faf8",
    surface: "#ffffff",
    text: "#142c23",
    muted: "#61736a",
    border: "#e1e9e4",
    primary: "#087a43",
    accent: "#d1f460",
    onAccent: "#142c23",
    elevated: "#edf5ef",
    button: "#087a43",
    onButton: "#ffffff",
    error: "#93431d",
    success: "#087a43",
    overlay: "#000000aa",
    input: "#f8faf8",
    skeleton: "#e4ebe6",
    chart: "#087a43",
  },
  dark: {
    background: "#0b2017",
    surface: "#132c21",
    text: "#f1f7f3",
    muted: "#b0c7ba",
    border: "#2c4839",
    primary: "#9ddbaf",
    accent: "#d1f460",
    onAccent: "#142c23",
    elevated: "#183c29",
    button: "#17452d",
    onButton: "#f1f7f3",
    error: "#ffcbaa",
    success: "#9ddbaf",
    overlay: "#000000cc",
    input: "#132c21",
    skeleton: "#2c4839",
    chart: "#9ddbaf",
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
