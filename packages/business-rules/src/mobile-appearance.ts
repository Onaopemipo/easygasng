export type MobileAppearance = "light" | "dark" | "system";
export function parseMobileAppearance(value: unknown): MobileAppearance {
  return value === "light" || value === "dark" ? value : "system";
}
export function resolveMobileAppearance(
  preference: MobileAppearance,
  system: string | null | undefined,
): "light" | "dark" {
  return preference === "dark" || (preference === "system" && system === "dark")
    ? "dark"
    : "light";
}
