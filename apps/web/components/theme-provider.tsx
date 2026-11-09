"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import {
  themePreference,
  resolvedTheme,
  type ThemePreference,
} from "../../../packages/business-rules/src/theme";
const ThemeContext = createContext({
  enabled: true,
  theme: "light" as ThemePreference,
  resolvedTheme: "light" as "light" | "dark",
  setTheme: (_value: ThemePreference) => {},
});
export function ThemeProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const path = usePathname(),
    [theme, setPreference] = useState<ThemePreference>("light"),
    [systemDark, setSystemDark] = useState(false),
    [ready, setReady] = useState(false);
  const resolved = enabled ? resolvedTheme(theme, systemDark, path) : "light";
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    try {
      setPreference(themePreference(localStorage.getItem("easygas.theme")));
    } catch {}
    setReady(true);
    const update = () => setSystemDark(media.matches);
    const storage = (e: StorageEvent) => {
      if (e.key === "easygas.theme" || e.key === null)
        setPreference(themePreference(e.newValue));
    };
    media.addEventListener("change", update);
    window.addEventListener("storage", storage);
    return () => {
      media.removeEventListener("change", update);
      window.removeEventListener("storage", storage);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  }, [resolved, ready]);
  function setTheme(value: ThemePreference) {
    if (!enabled) return;
    const next = themePreference(value);
    setPreference(next);
    document.documentElement.dataset.theme = resolvedTheme(
      next,
      systemDark,
      path,
    );
    document.documentElement.style.colorScheme = resolvedTheme(
      next,
      systemDark,
      path,
    );
    try {
      localStorage.setItem("easygas.theme", next);
    } catch {}
  }
  return (
    <ThemeContext.Provider
      value={{ enabled, theme, resolvedTheme: resolved, setTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
export function ThemeToggle() {
  const { enabled, resolvedTheme, setTheme } = useTheme();
  if (!enabled) return null;
  const label =
    resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label={label}
      title={label}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
export function ThemeSettings() {
  const { enabled, theme, setTheme } = useTheme();
  if (!enabled) return null;
  return (
    <section className="surface theme-settings">
      <h2>Appearance</h2>
      <p>
        Your preference stays with this browser across the website and
        dashboard.
      </p>
      <label>
        Colour theme
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as ThemePreference)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </label>
    </section>
  );
}
