import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const { chromium } = await import(
  pathToFileURL(process.env.EASYGAS_QA_PLAYWRIGHT_MODULE).href
);
assert.ok(
  process.env.EASYGAS_HOSTED_QA_CREDENTIAL_FILE,
  "Private QA credentials required",
);
const { accounts } = JSON.parse(
  await readFile(process.env.EASYGAS_HOSTED_QA_CREDENTIAL_FILE, "utf8"),
);
test("DWT-HOSTED: demo driver Home/Profile trip controls fit and read canonical state without starting a trip", async () => {
  const base = "https://easygas-client-demo.vercel.app";
  const browser = await chromium.launch({ channel: "chrome" });
  const driver = await browser.newContext(),
    owner = await browser.newContext();
  async function api(context, action, data) {
    const response = await context.request.fetch(base + "/api/" + action, {
      method: data ? "POST" : "GET",
      headers: { Origin: base },
      ...(data ? { data } : {}),
    });
    assert.equal(response.status(), 200, action);
    return response.json();
  }
  try {
    assert.deepEqual(await api(owner, "status"), {
      status: "ready",
      scope: "demo",
    });
    for (const [context, role] of [
      [driver, "driver"],
      [owner, "owner"],
    ]) {
      const account = accounts.find((a) => a.role === role);
      await api(context, "login", {
        identifier: account.email,
        password: account.password,
      });
    }
    const paystack = await api(owner, "payments/paystack/configuration");
    assert.equal(paystack.environment, "test");
    assert.equal(paystack.available, true);
    assert.equal(
      (await api(owner, "drivers.workspace")).canChangeAvailability,
      true,
    );
    assert.equal((await api(owner, "bulk.summary")).enabled, true);
    const orderBefore = (await api(owner, "orders")).find(
      (o) => o.reference === "EG-2026-7BB8640B",
    );
    assert.ok(orderBefore);
    const orderState = (o) => ({
      status: o.status,
      driverId: o.driver_id,
      version: o.tracking_version,
      paymentStatus: o.payment_status,
      attemptId: o.attempt?.id ?? null,
    });
    const page = await driver.newPage();
    page.setDefaultTimeout(30000);
    await page.goto(base + "/admin/deliveries", {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("button", { name: /^(Start trip|Manage trip)$/ })
      .click();
    const before = await api(driver, "driver.location");
    let modal = page.getByRole("dialog", {
      name: "Manage duty trip",
      exact: true,
    });
    await modal.getByRole("button", { name: "Refresh trip status" }).waitFor();
    if (before.trip) {
      await modal
        .getByRole("button", { name: "End trip", exact: true })
        .waitFor();
      await modal.getByLabel(/End odometer/).waitFor();
    } else if (before.vehicles.length) {
      await modal.getByLabel("Vehicle", { exact: false }).waitFor();
      assert.deepEqual(
        await modal
          .getByLabel("Vehicle", { exact: false })
          .locator("option")
          .evaluateAll((rows) => rows.map((o) => o.value)),
        ["", ...before.vehicles.map((v) => v.id)],
      );
      assert.equal(
        await modal.getByLabel(/Allow location capture/).isChecked(),
        false,
      );
      await modal.getByLabel(/Start odometer/).waitFor();
    } else await modal.getByText(/No active LPG-suitable vehicle/).waitFor();
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForFunction(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      );
    }
    await modal.getByRole("button", { name: "Close dialog" }).click();
    await page
      .getByRole("navigation", { name: "Driver workspace" })
      .getByRole("button", { name: "Profile", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Manage trip", exact: true })
      .click();
    modal = page.getByRole("dialog", { name: "Manage duty trip", exact: true });
    await modal.getByRole("button", { name: "Refresh trip status" }).waitFor();
    assert.deepEqual((await api(driver, "driver.location")).trip, before.trip);
    const orderAfter = (await api(owner, "orders?id=" + orderBefore.id))[0];
    assert.deepEqual(orderState(orderAfter), orderState(orderBefore));
    console.log(
      "READONLY named order",
      JSON.stringify({
        reference: orderAfter.reference,
        ...orderState(orderAfter),
      }),
    );
    console.log(
      "PASS hosted Home/Profile trip popup, branch vehicle list and consent-off default, 320/390/1440 fit. Existing QA driver trip and named order unchanged. Paystack available/test and fulfilment enabled. No trip/order/stock/payment mutation or GPS request submitted.",
    );
  } finally {
    await Promise.allSettled([
      api(driver, "logout", {}),
      api(owner, "logout", {}),
    ]);
    await browser.close();
  }
});
