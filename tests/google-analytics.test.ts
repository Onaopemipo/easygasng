import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  GOOGLE_TAG_MANAGER_ID,
  GOOGLE_ANALYTICS_ID,
  analyticsSettings,
  publicAnalyticsPage,
  analyticsPageAllowed,
  readAnalyticsConsent,
} from "../packages/business-rules/src/analytics";
import {
  initialiseAnalytics,
  stopAnalytics,
  clearAnalyticsCookies,
  analyticsNavigate,
} from "../apps/web/lib/analytics-browser";

function fakeWindow(href = "https://demo.example.test/products") {
  const navigations: string[] = [];
  return {
    location: {
      ...new URL(href),
      href,
      origin: new URL(href).origin,
      pathname: new URL(href).pathname,
      hostname: new URL(href).hostname,
      assign: (url: string) => navigations.push(url),
      replace: (url: string) => navigations.push(url),
    },
    navigations,
  } as any;
}
test("ANALYTICS-LOAD: one GTM bootstrap uses the supplied existing GA4 destination without duplicate config or page events", () => {
  const w = fakeWindow();
  assert.equal(GOOGLE_TAG_MANAGER_ID, "GTM-KLJ8FM96");
  assert.equal(GOOGLE_ANALYTICS_ID, "G-8Y34NXQMMK");
  assert.equal(initialiseAnalytics(w, "granted"), true);
  assert.equal(initialiseAnalytics(w, "granted"), false);
  const messages = w.dataLayer.map((value: any) =>
    value.event ? value : Array.from(value),
  );
  assert.equal(messages.filter((m: any) => m.event === "gtm.js").length, 1);
  assert.ok(!messages.some((m: any) => m[0] === "config" || m[0] === "event"));
  assert.deepEqual(messages[0], [
    "consent",
    "default",
    {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    },
  ]);
  assert.equal(
    messages[1][1].page_location,
    "https://demo.example.test/products",
  );
  assert.deepEqual(messages[1][1].user_data, {});
  assert.equal(messages[1][1].page_referrer, "");
  assert.equal(messages[1][1].allow_google_signals, false);
});
test("ANALYTICS-PRIVACY: consent defaults closed and private, malformed, query/token/hash URLs cannot initialise Google tracking", async () => {
  for (const value of [null, "true", "yes", "GRANTED", '{"granted":true}'])
    assert.equal(readAnalyticsConsent(value), null);
  assert.equal(readAnalyticsConsent("denied"), "denied");
  for (const consent of [null, "denied"] as const) {
    const w = fakeWindow();
    assert.equal(initialiseAnalytics(w, consent), false);
    assert.equal(w.dataLayer, undefined);
  }
  for (const path of [
    "/admin",
    "/admin/orders",
    "/orders",
    "/track",
    "/checkout",
    "/wallet",
    "/account",
    "/login",
    "/register",
    "/gas-order",
    "/reset-password",
    "/accept-invitation",
    "/api/status",
    "/products?email=private@example.test",
    "/?token=opaque",
    "/products#secret",
    "/products/%40private",
    "/products/nested/extra",
    "/products/customer@example.test",
  ]) {
    const w = fakeWindow("https://demo.example.test" + path);
    assert.equal(analyticsPageAllowed(new URL(w.location.href)), false, path);
    assert.equal(initialiseAnalytics(w, "granted"), false);
    assert.equal(w.dataLayer, undefined);
  }
  for (const path of [
    "/",
    "/products",
    "/products/refill-6",
    "/services/cooker-installation",
    "/privacy",
  ])
    assert.equal(publicAnalyticsPage(path), true);
  const layout = await readFile("apps/web/app/layout.tsx", "utf8");
  assert.match(layout, /cookies\(\)\)\.has\("easygas_session"\)/);
  assert.match(layout, /analytics.enabled && anonymous/);
});
test("ANALYTICS-REVOKE: withdrawal disables the stream and clears only this integration's analytics cookies", () => {
  const w = fakeWindow();
  initialiseAnalytics(w, "granted");
  stopAnalytics(w);
  assert.equal(w["ga-disable-G-8Y34NXQMMK"], true);
  const writes: string[] = [];
  const doc = {
    get cookie() {
      return "_ga=one; _ga_8Y34NXQMMK=two; easygas_session=private; easygas.theme=dark; _ga_OTHER=unrelated";
    },
    set cookie(value: string) {
      writes.push(value);
    },
  } as Document;
  clearAnalyticsCookies(w, doc);
  assert.ok(writes.length > 2);
  assert.ok(
    writes.every((v) => /^(_ga|_ga_8Y34NXQMMK)=; Max-Age=0; Path=\//.test(v)),
  );
  assert.ok(!writes.some((v) => /easygas|OTHER/.test(v)));
});
test("ANALYTICS-NAV: active analytics leaves the document before private navigation while untracked workspaces retain client routing", () => {
  const old = (globalThis as any).window,
    w = fakeWindow();
  const calls: string[] = [];
  const router = {
    push: (s: string) => calls.push(s),
    replace: (s: string) => calls.push(s),
  };
  try {
    (globalThis as any).window = w;
    analyticsNavigate(router, "/products");
    assert.deepEqual(calls, ["/products"]);
    initialiseAnalytics(w, "granted");
    analyticsNavigate(router, "/login?returnTo=%2Forders");
    assert.deepEqual(w.navigations, ["/login?returnTo=%2Forders"]);
    assert.equal(w["ga-disable-G-8Y34NXQMMK"], true);
    assert.equal(calls.length, 1);
  } finally {
    if (old === undefined) delete (globalThis as any).window;
    else (globalThis as any).window = old;
  }
});
test("ANALYTICS-CONFIG: local/preview defaults off, production defaults on and explicit disable is the rollback switch", () => {
  assert.equal(analyticsSettings({ NODE_ENV: "development" }).enabled, false);
  assert.equal(
    analyticsSettings({ NODE_ENV: "production", VERCEL_ENV: "preview" })
      .enabled,
    false,
  );
  assert.equal(analyticsSettings({ NODE_ENV: "production" }).enabled, true);
  assert.equal(
    analyticsSettings({
      NODE_ENV: "production",
      EASYGAS_ANALYTICS_ENABLED: "false",
    }).enabled,
    false,
  );
  assert.equal(
    analyticsSettings({
      NODE_ENV: "development",
      EASYGAS_ANALYTICS_ENABLED: "true",
    }).enabled,
    true,
  );
});
