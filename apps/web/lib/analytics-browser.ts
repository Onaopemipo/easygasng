import {
  GOOGLE_ANALYTICS_ID,
  analyticsPageAllowed,
  type AnalyticsConsent,
} from "../../../packages/business-rules/src/analytics";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  easygasAnalyticsLoaded?: boolean;
  "ga-disable-G-8Y34NXQMMK"?: boolean;
};
export function initialiseAnalytics(
  target: Window,
  consent: AnalyticsConsent | null,
) {
  const w = target as AnalyticsWindow;
  if (
    consent !== "granted" ||
    w.easygasAnalyticsLoaded ||
    !analyticsPageAllowed(new URL(w.location.href))
  )
    return false;
  w.dataLayer ??= [];
  w.gtag ??= function () {
    w.dataLayer!.push(arguments);
  };
  w[`ga-disable-${GOOGLE_ANALYTICS_ID}`] = false;
  // Runs only after a recorded grant and before the container is requested.
  w.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  w.gtag("set", {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    user_data: {},
    allow_enhanced_conversions: false,
    ads_data_redaction: true,
    url_passthrough: false,
    page_location: w.location.origin + w.location.pathname,
    page_referrer: "",
    page_title: "EasyGas public website",
  });
  // The published container already configures G-8Y34NXQMMK and page views.
  // Do not also load gtag.js or send a second config/page_view event.
  w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
  w.easygasAnalyticsLoaded = true;
  return true;
}
export function analyticsLoaded() {
  return (
    typeof window !== "undefined" &&
    Boolean((window as AnalyticsWindow).easygasAnalyticsLoaded)
  );
}
export function stopAnalytics(target: Window) {
  (target as AnalyticsWindow)[`ga-disable-${GOOGLE_ANALYTICS_ID}`] = true;
}
export function analyticsNavigate(
  router: { push: (href: string) => void; replace: (href: string) => void },
  href: string,
  replace = false,
) {
  if (analyticsLoaded()) {
    stopAnalytics(window);
    replace ? window.location.replace(href) : window.location.assign(href);
    return;
  }
  replace ? router.replace(href) : router.push(href);
}
export function clearAnalyticsCookies(target: Window, doc: Document) {
  const names = doc.cookie
    .split(";")
    .map((c) => c.trim().split("=")[0])
    .filter((n) => n === "_ga" || n === "_ga_" + GOOGLE_ANALYTICS_ID.slice(2));
  const parts = target.location.hostname.split(".");
  const domains = [
    "",
    ...parts.map((_, i) => "; Domain=" + parts.slice(i).join(".")),
  ];
  for (const name of names)
    for (const domain of domains)
      doc.cookie = `${name}=; Max-Age=0; Path=/${domain}; SameSite=Lax`;
}
