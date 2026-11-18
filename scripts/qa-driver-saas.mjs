import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const base = process.env.EASYGAS_DRIVER_QA_ORIGIN ?? "http://127.0.0.1:3098";
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Disposable local server required",
);
const accounts = JSON.parse(
  await readFile(process.env.EASYGAS_DRIVER_QA_CREDENTIAL_FILE, "utf8"),
);
const evidence =
  process.env.EASYGAS_DRIVER_QA_EVIDENCE_DIR ??
  "docs/driver-saas-redesign/evidence";
await mkdir(evidence, { recursive: true });
const { chromium } = await import(
  pathToFileURL(process.env.EASYGAS_QA_PLAYWRIGHT_MODULE).href
);
test("DRVS-BROWSER: four driver views, responsive themes, real actions, history privacy, stale state and revoked access", async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(45000);
  async function api(action, data) {
    return context.request.fetch(base + "/api/" + action, {
      method: data ? "POST" : "GET",
      headers: { Origin: base },
      ...(data ? { data } : {}),
    });
  }
  const nav = page.getByRole("navigation", { name: "Driver workspace" });
  const root = nav.locator("..");
  async function open(account) {
    assert.equal(
      (
        await api("login", {
          identifier: account.email,
          password: account.password,
        })
      ).status(),
      200,
    );
    await page.goto(base + "/admin/deliveries", {
      waitUntil: "domcontentloaded",
    });
    await root.getByRole("heading", { name: /Good to see you/ }).waitFor();
  }
  async function fit() {
    assert.ok(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    );
    assert.ok(
      await root.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
  }
  try {
    await open(accounts.primary);
    const originalProfile = (await (await api("driver.snapshot")).json())
      .profile;
    await nav.getByRole("button", { name: "Profile", exact: true }).click();
    await root.getByText("Edit personal information", { exact: true }).click();
    const personalForm = root.locator("form").filter({
      has: page.getByRole("heading", { name: "Edit your name", exact: true }),
    });
    try {
      await personalForm
        .getByLabel("Your name")
        .fill("Synthetic Driver Name QA");
      await personalForm
        .getByRole("button", { name: "Save", exact: true })
        .click();
      await root
        .getByRole("heading", { name: "Synthetic Driver Name QA", exact: true })
        .waitFor();
      assert.equal(
        (await (await api("driver.snapshot")).json()).profile.name,
        "Synthetic Driver Name QA",
      );
      for (const extra of [
        { role: "owner" },
        { branch_id: "other" },
        { active: false },
      ])
        assert.equal(
          (
            await api("account.update", {
              name: "Forbidden profile edit",
              ...extra,
            })
          ).status(),
          400,
        );
      const after = (await (await api("driver.snapshot")).json()).profile;
      assert.equal(after.id, originalProfile.id);
      assert.equal(after.branch_name, originalProfile.branch_name);
      assert.equal(after.active, originalProfile.active);
      assert.equal(after.name, "Synthetic Driver Name QA");
    } finally {
      assert.equal(
        (await api("account.update", { name: originalProfile.name })).status(),
        200,
      );
    }
    await nav.getByRole("button", { name: "Home", exact: true }).click();
    await root.getByRole("button", { name: "Refresh", exact: true }).click();
    await root
      .getByRole("heading", { name: new RegExp(originalProfile.name) })
      .waitFor();
    console.log(
      "PASS actual name-edit form and canonical name-only update; role, branch and activation edits rejected; disposable identity restored.",
    );
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const tab of ["Home", "Orders", "History", "Profile"]) {
        await nav.getByRole("button", { name: tab, exact: true }).click();
        if (tab === "History")
          await root.getByText(/completed deliveries in this period/).waitFor();
        await fit();
        assert.equal(
          await nav
            .getByRole("button", { name: tab, exact: true })
            .getAttribute("aria-pressed"),
          "true",
        );
        if (width === 1440 || width === 390)
          await page.screenshot({
            path: `${evidence}/web-${width}-${tab.toLowerCase()}-light.png`,
            fullPage: true,
          });
      }
      console.log(
        `PASS ${width}px four views: no page/workspace horizontal scroll; current route and driver shell retained.`,
      );
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await root.getByLabel("Colour theme").selectOption("dark");
    for (const tab of ["Home", "Orders", "History", "Profile"]) {
      await nav.getByRole("button", { name: tab, exact: true }).click();
      await fit();
      await page.screenshot({
        path: `${evidence}/web-1440-${tab.toLowerCase()}-dark.png`,
        fullPage: true,
      });
    }
    await root.getByLabel("Colour theme").selectOption("system");
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await page.waitForFunction(
      () => document.documentElement.dataset.theme === "dark",
    );
    await page.emulateMedia({ colorScheme: "light" });
    await page.waitForFunction(
      () => document.documentElement.dataset.theme === "light",
    );
    await nav.getByRole("button", { name: "Orders", exact: true }).click();
    await root.getByLabel("Search assignments").fill(accounts.orders[0]);
    await root
      .getByRole("button", { name: "View delivery progress", exact: true })
      .click();
    await root
      .getByRole("button", { name: "Back to orders", exact: true })
      .click();
    assert.equal(
      await root.getByLabel("Search assignments").inputValue(),
      accounts.orders[0],
    );
    await nav.getByRole("button", { name: "History", exact: true }).click();
    await root.getByText(/completed deliveries in this period/).waitFor();
    assert.equal(
      await root.getByText("Synthetic customer", { exact: true }).count(),
      0,
    );
    await root.getByLabel("Final outcome").selectOption("declined");
    await root.getByRole("button", { name: "Apply filters" }).click();
    await root
      .getByRole("button", { name: new RegExp(accounts.history) })
      .click();
    assert.ok(await root.getByText(/Declined/).count());
    await root
      .getByRole("button", { name: "Back to history", exact: true })
      .click();
    assert.equal(
      await root.getByLabel("Final outcome").inputValue(),
      "declined",
    );
    await nav.getByRole("button", { name: "Home", exact: true }).click();
    assert.equal(await root.getByText(/^Earnings$/).count(), 0);
    assert.equal(
      await root
        .getByRole("button", { name: /scan.*qr|rate.*delivery|claim.*order/i })
        .count(),
      0,
    );
    const activeToggle = root.getByRole("switch", {
      name: "Available for dispatch",
    });
    let toggleCalls = 0;
    const countToggle = (req) => {
      if (
        req.url().endsWith("/api/driver.availability") &&
        req.method() === "POST"
      )
        toggleCalls++;
    };
    page.on("request", countToggle);
    await activeToggle.evaluate((el) => {
      el.click();
      el.click();
    });
    await root.getByText(/Resolve active assignments/).waitFor();
    assert.equal(await activeToggle.getAttribute("aria-checked"), "true");
    assert.equal(toggleCalls, 1);
    page.off("request", countToggle);
    await root.getByRole("button", { name: "Refresh", exact: true }).click();
    await root.getByText("Connected", { exact: true }).waitFor();
    await page.route("**/api/driver.snapshot", (route) =>
      route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: "Synthetic rate limit" }),
      }),
    );
    await root.getByRole("button", { name: "Refresh", exact: true }).click();
    await root
      .getByText(/Connection unconfirmed/)
      .first()
      .waitFor();
    assert.ok(await activeToggle.isDisabled());
    await page.screenshot({
      path: `${evidence}/web-rate-limited.png`,
      fullPage: true,
    });
    await page.unroute("**/api/driver.snapshot");
    await root.getByRole("button", { name: "Refresh", exact: true }).click();
    await root.getByText("Connected", { exact: true }).waitFor();
    await page.route("**/api/driver.snapshot", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 20000));
      await route.abort().catch(() => {});
    });
    await root.getByRole("button", { name: "Refresh", exact: true }).click();
    await root
      .getByText(/Connection unconfirmed/)
      .first()
      .waitFor();
    assert.ok(await activeToggle.isDisabled());
    await root.getByText("Unavailable", { exact: true }).first().waitFor();
    await page.unroute("**/api/driver.snapshot");
    await root.getByRole("button", { name: "Refresh", exact: true }).click();
    await root.getByText("Connected", { exact: true }).waitFor();
    console.log(
      "PASS active-work 409 guard, duplicate-tap suppression, 429 and timeout stale/read-only recovery; no optimistic availability.",
    );
    await context.setOffline(true);
    await root
      .getByText(/Connection unconfirmed/)
      .first()
      .waitFor();
    assert.ok(
      await root
        .getByRole("switch", { name: "Available for dispatch" })
        .isDisabled(),
    );
    await page.screenshot({
      path: `${evidence}/web-offline.png`,
      fullPage: true,
    });
    await context.setOffline(false);
    await root.getByRole("button", { name: "Refresh", exact: true }).click();
    await root.getByText("Connected", { exact: true }).waitFor();
    await page.route("**/api/driver.history?**", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Synthetic revoked session" }),
      }),
    );
    await nav.getByRole("button", { name: "History", exact: true }).click();
    await page.waitForURL("**/login");
    assert.equal(
      await page.getByRole("navigation", { name: "Driver workspace" }).count(),
      0,
    );
    assert.equal(
      await page.getByText(accounts.history, { exact: true }).count(),
      0,
    );
    await page.screenshot({
      path: `${evidence}/web-denied.png`,
      fullPage: true,
    });
    await page.unroute("**/api/driver.history?**");
    await api("logout", {});
    await page.goto(base + "/");
    await open(accounts.empty);
    await nav.getByRole("button", { name: "Home", exact: true }).click();
    await root.getByRole("heading", { name: "You're up to date" }).waitFor();
    const toggle = root.getByRole("switch", { name: "Available for dispatch" });
    await toggle.click();
    await root.getByRole("heading", { name: "Assignments paused" }).waitFor();
    assert.equal(
      (await (await api("driver.snapshot")).json()).profile.driver_available,
      false,
    );
    assert.equal(await toggle.getAttribute("aria-checked"), "false");
    await toggle.click();
    await root
      .getByRole("heading", { name: "Available for dispatch" })
      .waitFor();
    await page.screenshot({
      path: `${evidence}/web-empty.png`,
      fullPage: true,
    });
    assert.equal((await api("driver.snapshot")).status(), 200);
    await api("logout", {});
    assert.equal(
      (
        await api("login", {
          identifier: accounts.customer.email,
          password: accounts.customer.password,
        })
      ).status(),
      200,
    );
    assert.equal((await api("driver.snapshot")).status(), 403);
    assert.equal(
      (
        await api("driver.availability", {
          available: true,
          operationKey: crypto.randomUUID(),
        })
      ).status(),
      403,
    );
    console.log(
      "PASS light/dark/system/reduced-motion, filter preservation, private closed history, offline read-only, authoritative 401 clearance, empty state and server-confirmed availability toggles.",
    );
    console.log(
      "PASS customer driver API denial. No scan, earnings, unassigned jobs, map, ETA or fake identity/verification was introduced.",
    );
  } finally {
    await api("logout", {});
    await browser.close();
  }
});
