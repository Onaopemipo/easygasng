"use client";
import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import {
  ANALYTICS_CONSENT_KEY,
  GOOGLE_TAG_MANAGER_ID,
  publicAnalyticsPage,
  analyticsPageAllowed,
  readAnalyticsConsent,
  type AnalyticsConsent,
} from "../../../packages/business-rules/src/analytics";
import {
  analyticsLoaded,
  initialiseAnalytics,
  stopAnalytics,
  clearAnalyticsCookies,
} from "../lib/analytics-browser";

export default function GoogleAnalytics({
  enabled,
  demo = false,
}: {
  enabled: boolean;
  demo?: boolean;
}) {
  const pathname = usePathname(),
    search = useSearchParams();
  const [choice, setChoice] = useState<AnalyticsConsent | null>(null);
  const [ready, setReady] = useState(false),
    [open, setOpen] = useState(false);
  const [loadTag, setLoadTag] = useState(false),
    [error, setError] = useState("");
  const [blockedDocument, setBlockedDocument] = useState(false);
  const [tagStatus, setTagStatus] = useState("unloaded");
  const publicPage = publicAnalyticsPage(pathname);
  useEffect(() => {
    if (
      !enabled ||
      !publicPage ||
      !analyticsPageAllowed(new URL(window.location.href))
    ) {
      stopAnalytics(window);
      setBlockedDocument(true);
      return;
    }
    // Root layouts survive SPA navigation: a document that entered any private
    // surface stays untracked until a fresh server request checks session cookies.
    if (blockedDocument) return;
    let consent: AnalyticsConsent | null = null;
    try {
      consent = readAnalyticsConsent(
        localStorage.getItem(ANALYTICS_CONSENT_KEY),
      );
    } catch {}
    setChoice(consent);
    setOpen(consent === null);
    setReady(true);
    if (
      consent === "granted" &&
      analyticsPageAllowed(new URL(window.location.href))
    ) {
      initialiseAnalytics(window, consent);
      setLoadTag(true);
    }
    const checkPreference = (event?: StorageEvent) => {
      if (event?.key === "easygas.auth.changed") {
        stopAnalytics(window);
        window.location.reload();
        return;
      }
      if (event && event.key !== ANALYTICS_CONSENT_KEY && event.key !== null)
        return;
      let current: AnalyticsConsent | null = null;
      try {
        current = readAnalyticsConsent(
          localStorage.getItem(ANALYTICS_CONSENT_KEY),
        );
      } catch {}
      if (analyticsLoaded() && current !== "granted") {
        stopAnalytics(window);
        window.location.reload();
      } else {
        setChoice(current);
        setOpen(current === null);
      }
    };
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) {
        stopAnalytics(window);
        window.location.reload();
      } else checkPreference();
    };
    window.addEventListener("storage", checkPreference);
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("storage", checkPreference);
      window.removeEventListener("pageshow", restore);
    };
  }, [enabled, publicPage, pathname, search, blockedDocument]);
  function save(consent: AnalyticsConsent) {
    stopAnalytics(window);
    try {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
    } catch {
      setError(
        "Your browser could not save this preference. Analytics stays off.",
      );
      return;
    }
    if (consent === "denied") clearAnalyticsCookies(window, document);
    // A new document reliably removes loaded Google listeners after withdrawal.
    window.location.reload();
  }
  if (!enabled || !publicPage || !ready || blockedDocument) return null;
  return (
    <>
      {loadTag && (
        <Script
          id="easygas-google-tag-manager"
          src={`https://www.googletagmanager.com/gtm.js?id=${GOOGLE_TAG_MANAGER_ID}`}
          strategy="afterInteractive"
          onReady={() => setTagStatus("loaded")}
          onError={() => setTagStatus("unavailable")}
        />
      )}
      <div
        className="analytics-settings"
        data-analytics-container={GOOGLE_TAG_MANAGER_ID}
        data-analytics-status={tagStatus}
      >
        <button
          type="button"
          className="text-link"
          onClick={() => setOpen(true)}
        >
          Cookie settings
        </button>
      </div>
      {open && (
        <section
          className={`analytics-notice${demo ? " analytics-notice-demo" : ""}`}
          aria-label="Analytics preferences"
        >
          <div>
            <h2>Optional analytics</h2>
            <p>
              Allow Google Analytics to help us understand visits to our public
              website. Essential services work without it. Advertising stays
              off.
            </p>
            <a href="/privacy">Privacy information</a>
            {choice && (
              <p className="analytics-current">
                Current choice:{" "}
                {choice === "granted" ? "analytics allowed" : "essential only"}.
              </p>
            )}
            {error && <p role="alert">{error}</p>}
          </div>
          <div className="analytics-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => save("denied")}
            >
              Essential only
            </button>
            <button
              type="button"
              className="button"
              onClick={() => save("granted")}
            >
              Allow analytics
            </button>
            {choice && (
              <button
                type="button"
                className="text-link"
                onClick={() => setOpen(false)}
              >
                Close
              </button>
            )}
          </div>
        </section>
      )}
    </>
  );
}
