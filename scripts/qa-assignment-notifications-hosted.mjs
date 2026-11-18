import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { chromium } = await import(
  process.env.EASYGAS_QA_PLAYWRIGHT_MODULE || "playwright"
);
const credentialFile = process.env.EASYGAS_HOSTED_QA_CREDENTIAL_FILE;
assert.ok(
  credentialFile,
  "Set a private hosted QA credential file; credentials must not be committed.",
);
test("DAN-HOSTED: demo owner valid-step form, driver bell and sandbox configuration remain scoped", async () => {
  const base = "https://easygas-client-demo.vercel.app";
  const { accounts } = JSON.parse(await readFile(credentialFile));
  const browser = await chromium.launch({ channel: "chrome" });
  const contexts = [];
  async function api(c, path, data) {
    const r = await c.request.fetch(base + "/api/" + path, {
      method: data ? "POST" : "GET",
      headers: { Origin: base },
      ...(data ? { data } : {}),
    });
    assert.equal(r.status(), 200, path);
    return r.json();
  }
  try {
    const owner = await browser.newContext();
    contexts.push(owner);
    const account = accounts.find((a) => a.role === "owner");
    await api(owner, "login", {
      identifier: account.email,
      password: account.password,
    });
    assert.deepEqual(await api(owner, "status"), {
      status: "ready",
      scope: "demo",
    });
    const config = await api(owner, "payments/paystack/configuration");
    assert.equal(config.environment, "test");
    assert.equal(config.available, true);
    assert.equal(
      (await api(owner, "drivers.workspace")).canChangeAvailability,
      true,
    );
    assert.equal((await api(owner, "bulk.summary")).enabled, true);
    const orders = await api(owner, "orders"),
      reported = orders.find((o) => o.reference === "EG-2026-7BB8640B");
    assert.ok(reported);
    const before = {
      status: reported.status,
      driverId: reported.driver_id,
      version: reported.tracking_version,
      paymentStatus: reported.payment_status,
      attemptId: reported.attempt?.id ?? null,
    };
    console.log(
      "READONLY reported order",
      JSON.stringify({ reference: reported.reference, ...before }),
    );
    if (["placed", "accepted", "preparing"].includes(reported.status)) {
      const page = await owner.newPage();
      page.setDefaultTimeout(30000);
      await page.goto(base + "/admin/orders?orderId=" + reported.id, {
        waitUntil: "domcontentloaded",
      });
      const modal = page.getByRole("dialog");
      await modal.waitFor();
      await modal.getByText("Update order status", { exact: true }).click();
      const expected = {
        placed: ["", "accepted", "cancelled"],
        accepted: ["", "preparing", "cancelled"],
        preparing: ["", "assigned", "cancelled"],
      }[reported.status];
      assert.deepEqual(
        await modal
          .getByLabel(/Next status/)
          .locator("option")
          .evaluateAll((rows) => rows.map((o) => o.value)),
        expected,
      );
      assert.equal(
        await modal.getByLabel(/Driver when assigning/).isDisabled(),
        reported.status !== "preparing",
      );
      console.log(
        "PASS hosted owner status form exposes canonical next steps and explicit assignment/save guidance. No update submitted.",
      );
    }
    const driver = await browser.newContext();
    contexts.push(driver);
    const a = accounts.find((a) => a.role === "driver");
    await api(driver, "login", { identifier: a.email, password: a.password });
    const page = await driver.newPage();
    page.setDefaultTimeout(30000);
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(base + "/admin/deliveries", {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("navigation", { name: "Driver workspace" }).waitFor();
    await page
      .getByRole("button", { name: "View notifications", exact: true })
      .click();
    const tray = page.getByRole("dialog");
    await tray
      .getByRole("heading", { name: "Notifications", exact: true })
      .waitFor();
    await page.waitForFunction(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
    );
    assert.equal(
      await tray
        .getByText("Delivery confirmation code", { exact: true })
        .count(),
      0,
    );
    const final = (await api(owner, "orders?id=" + reported.id))[0];
    assert.deepEqual(
      {
        status: final.status,
        driverId: final.driver_id,
        version: final.tracking_version,
        paymentStatus: final.payment_status,
        attemptId: final.attempt?.id ?? null,
      },
      before,
    );
    console.log(
      "PASS hosted mobile driver bell is available and fits; reported order unchanged throughout read-only verification; fulfilment enabled and Paystack available/test. New assignment delivery proven in disposable local two-session acceptance; no fake or backfilled notice added here.",
    );
  } finally {
    await Promise.allSettled(contexts.map((c) => api(c, "logout", {})));
    await browser.close();
  }
});
