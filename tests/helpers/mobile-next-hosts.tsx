export * from "./native-host-shim";
import { randomBytes, randomUUID as uuid } from "node:crypto";
export const storage = new Map<string, string>(),
  files = new Map<string, string>(),
  listeners = new Set<(s: string) => void>();
export const getItemAsync = async (k: string) => storage.get(k) ?? null;
export const setItemAsync = async (k: string, v: string) => {
  storage.set(k, v);
};
export const deleteItemAsync = async (k: string) => {
  storage.delete(k);
};
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = "device-only";
export const randomUUID = () => uuid(),
  getRandomBytesAsync = async (n: number) => new Uint8Array(randomBytes(n));
export const documentDirectory = "/qa-private/",
  cacheDirectory = "/qa-cache/";
export const getInfoAsync = async (p: string) => ({
  exists: files.has(p),
  size: files.get(p)?.length,
});
export const makeDirectoryAsync = async () => {};
export const writeAsStringAsync = async (p: string, v: string) => {
  files.set(p, v);
};
export const readAsStringAsync = async (p: string) => {
  if (!files.has(p)) throw Error("Not found");
  return files.get(p)!;
};
export const deleteAsync = async (p: string) => {
  for (const k of files.keys())
    if (k === p || k.startsWith(p.endsWith("/") ? p : p + "/")) files.delete(k);
};
export const moveAsync = async ({ from, to }: any) => {
  if (!files.has(from)) throw Error("Not found");
  files.set(to, files.get(from)!);
  files.delete(from);
};
export const AppState = {
  addEventListener: (_: string, fn: any) => {
    listeners.add(fn);
    return {
      remove() {
        listeners.delete(fn);
      },
    };
  },
};
export const links: string[] = [];
export const Linking = {
  openURL: async (url: string) => {
    links.push(url);
  },
};
export const Keyboard = { dismiss() {}, addListener: () => ({ remove() {} }) };
export const AccessibilityInfo = {
  isReduceMotionEnabled: async () => true,
  addEventListener: () => ({ remove() {} }),
  announceForAccessibility() {},
};
class Value {
  value: number;
  constructor(n: number) {
    this.value = n;
  }
  setValue(n: number) {
    this.value = n;
  }
  interpolate() {
    return this.value;
  }
}
export const Animated = {
  Value,
  View: "View",
  timing: () => ({ start() {}, stop() {} }),
  loop: () => ({ start() {}, stop() {} }),
};
export const useWindowDimensions = () => ({
  width: 390,
  height: 844,
  scale: 3,
  fontScale: 1,
});
export const useTheme = () => ({
  colors: {
    background: "#f8faf8",
    surface: "#fff",
    text: "#142c23",
    muted: "#61736a",
    border: "#e1e9e4",
    primary: "#087a43",
    button: "#087a43",
    onButton: "#fff",
    elevated: "#edf5ef",
    overlay: "#0008",
    error: "#93431d",
    lime: "#d1f460",
  },
  dark: false,
});
export const Ionicons = "Icon";
export const Share = { share: async () => ({}) };
