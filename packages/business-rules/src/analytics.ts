export const GOOGLE_TAG_MANAGER_ID = "GTM-KLJ8FM96";
export const GOOGLE_ANALYTICS_ID = "G-8Y34NXQMMK";
export const ANALYTICS_CONSENT_KEY = "easygas.analytics-consent.v1";
export type AnalyticsConsent = "granted" | "denied";

const publicPages = new Set([
  "/",
  "/products",
  "/services",
  "/about",
  "/how-it-works",
  "/help",
  "/delivery",
  "/privacy",
  "/terms",
  "/policies",
  "/refund",
  "/cancellation",
  "/service-terms",
  "/warranty",
  "/credit-terms",
  "/loyalty-terms",
  "/contact",
]);
export function publicAnalyticsPage(pathname: string) {
  return (
    publicPages.has(pathname) ||
    /^\/(products|services)\/[a-z0-9][a-z0-9-]{0,79}$/.test(pathname)
  );
}
export function analyticsPageAllowed(url: URL) {
  return (
    ["http:", "https:"].includes(url.protocol) &&
    publicAnalyticsPage(url.pathname) &&
    !url.search &&
    !url.hash
  );
}
export function readAnalyticsConsent(
  value: string | null,
): AnalyticsConsent | null {
  return value === "granted" || value === "denied" ? value : null;
}
export function analyticsSettings(env: Record<string, string | undefined>) {
  return {
    enabled:
      env.EASYGAS_ANALYTICS_ENABLED === "true" ||
      (env.EASYGAS_ANALYTICS_ENABLED !== "false" &&
        env.NODE_ENV === "production" &&
        env.VERCEL_ENV !== "preview"),
    containerId: GOOGLE_TAG_MANAGER_ID,
    measurementId: GOOGLE_ANALYTICS_ID,
  };
}
