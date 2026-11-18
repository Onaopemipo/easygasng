import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const base = process.env.EASYGAS_TRIP_QA_ORIGIN ?? "http://127.0.0.1:3101";
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Disposable local server required",
);
const credentials = JSON.parse(
  await readFile(process.env.EASYGAS_TRIP_QA_CREDENTIAL_FILE, "utf8"),
);
const { chromium } = await import(
  pathToFileURL(process.env.EASYGAS_QA_PLAYWRIGHT_MODULE).href
);
test("DWT-BROWSER: web start, status recovery, profile management, consent and guarded end unlock synthetic assignment", async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  const owner = await browser.newContext(),
    driver = await browser.newContext(),
    customer = await browser.newContext();
  async function api(context, action, data) {
    const response = await context.request.fetch(base + "/api/" + action, {
      method: data ? "POST" : "GET",
      headers: { Origin: base },
      ...(data ? { data } : {}),
    });
    assert.equal(response.status(), 200, await response.text());
    return response.json();
  }
  try {
    for (const [context, account] of [
      [owner, credentials.owner],
      [driver, credentials.driver],
      [customer, credentials.customer],
    ])
      await api(context, "login", {
        identifier: account.email,
        password: account.password,
      });
    const page = await driver.newPage();
    page.setDefaultTimeout(60000);
    await page.goto(base + "/admin/deliveries", {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: "Start trip", exact: true }).click();
    let modal = page.getByRole("dialog", {
      name: "Manage duty trip",
      exact: true,
    });
    await modal
      .getByLabel("Vehicle", { exact: false })
      .selectOption(credentials.vehicle.id);
    await modal.getByLabel(/Start odometer/).fill("25");
    assert.equal(
      await modal.getByLabel(/Allow location capture/).isChecked(),
      false,
    );
    await page.route("**/api/trip.start", async (route) => {
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({ response });
    });
    await modal
      .getByRole("button", { name: "Start trip", exact: true })
      .click();
    await page.keyboard.press("Escape");
    assert.ok(
      await modal.isVisible(),
      "Escape must not close an in-flight trip mutation",
    );
    await modal
      .getByText(
        "Trip started. Dispatch can now check this vehicle when assigning work.",
        { exact: true },
      )
      .waitFor();
    await modal
      .getByRole("button", { name: "End trip", exact: true })
      .waitFor();
    await page.unroute("**/api/trip.start");
    const first = (await api(driver, "driver.location")).trip;
    assert.ok(first);
    assert.equal(first.location_consent, false);
    assert.equal(Number(first.start_odometer), 25);
    // An actual failed status request blocks writes until authoritative refresh succeeds.
    await page.route("**/api/driver.location", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "Synthetic trip read unavailable" }),
      }),
    );
    await modal.getByRole("button", { name: "Refresh trip status" }).click();
    await modal
      .getByText("Synthetic trip read unavailable", { exact: true })
      .waitFor();
    assert.ok(
      await modal
        .getByRole("button", { name: "End trip", exact: true })
        .isDisabled(),
    );
    await page.unroute("**/api/driver.location");
    await modal.getByRole("button", { name: "Refresh trip status" }).click();
    await modal
      .getByRole("button", { name: "End trip", exact: true })
      .waitFor();
    await page.waitForFunction(
      () =>
        !Array.from(document.querySelectorAll("button")).find(
          (b) => b.textContent === "End trip",
        )?.disabled,
    );
    await modal.getByLabel(/End odometer/).fill("30");
    await modal.getByRole("button", { name: "End trip", exact: true }).click();
    await modal.getByText("Trip ended.", { exact: true }).waitFor();
    assert.equal((await api(driver, "driver.location")).trip, null);
    await modal.getByRole("button", { name: "Close dialog" }).click();
    await page
      .getByRole("navigation", { name: "Driver workspace" })
      .getByRole("button", { name: "Profile", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Manage trip", exact: true })
      .click();
    modal = page.getByRole("dialog", { name: "Manage duty trip" });
    await modal
      .getByLabel("Vehicle", { exact: false })
      .selectOption(credentials.vehicle.id);
    await modal.getByLabel(/Start odometer/).fill("30");
    await modal.getByLabel(/Allow location capture/).check();
    await modal
      .getByRole("button", { name: "Start trip", exact: true })
      .click();
    await modal
      .getByRole("button", { name: "Revoke trip location consent" })
      .click();
    await modal
      .getByText("Location consent revoked for this trip.", { exact: true })
      .waitFor();
    assert.equal(
      (await api(driver, "driver.location")).trip.location_consent,
      false,
    );
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForFunction(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      );
      await page.screenshot({
        path: `docs/web-driver-trips/evidence/trip-${width}.png`,
        fullPage: true,
      });
    }
    // Use the canonical owner flow and driver pickup. The web-created trip now satisfies the trip gate.
    const order = credentials.order;
    for (const status of ["accepted", "preparing", "assigned"]) {
      const current = (await api(owner, "orders?id=" + order.id))[0];
      await api(owner, "order.transition", {
        id: order.id,
        status,
        version: current.tracking_version,
        note: "Synthetic web trip browser assignment acceptance",
        operationKey: crypto.randomUUID(),
        ...(status === "assigned" ? { driverId: credentials.driver.id } : {}),
      });
    }
    await modal.getByRole("button", { name: "Close dialog" }).click();
    const nav = page.getByRole("navigation", { name: "Driver workspace" });
    await nav.getByRole("button", { name: "Home", exact: true }).click();
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page.getByRole("button", { name: "View order", exact: true }).click();
    await page
      .getByLabel(/Reason or acknowledgement note/)
      .fill("Synthetic web assignment acknowledgement");
    await page
      .getByRole("button", { name: "Acknowledge assignment", exact: true })
      .click();
    await page.getByLabel(/I inspected and received every listed/).check();
    await page
      .getByLabel(/Pickup note/)
      .fill("Synthetic complete manifest physically checked");
    await page
      .getByRole("button", { name: "Confirm inspected pickup", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Start delivery", exact: true })
      .click();
    await page.getByLabel(/Arrival note/).waitFor();
    await nav.getByRole("button", { name: "Home", exact: true }).click();
    await page
      .getByRole("button", { name: "Manage trip", exact: true })
      .click();
    modal = page.getByRole("dialog", { name: "Manage duty trip" });
    await modal.getByLabel(/End odometer/).fill("35");
    await modal.getByRole("button", { name: "End trip", exact: true }).click();
    await modal
      .getByText("Resolve active delivery custody before ending the trip.", {
        exact: true,
      })
      .waitFor();
    assert.ok((await api(driver, "driver.location")).trip);
    await modal.getByRole("button", { name: "Close dialog" }).click();
    await page.getByRole("button", { name: "View order", exact: true }).click();
    await page
      .getByLabel(/Arrival note/)
      .fill("Synthetic arrival confirmed at test address");
    await page
      .getByRole("button", { name: "Confirm arrival", exact: true })
      .click();
    await page.getByLabel(/Customer six-digit handover code/).waitFor();
    const owned = (await api(customer, "orders?id=" + order.id))[0];
    assert.equal(owned.payment_method, "wallet");
    assert.equal(owned.payment_status, "verified");
    await page
      .getByLabel(/Customer six-digit handover code/)
      .fill(owned.confirmation_code);
    await page
      .getByLabel(/All items and the full gas quantity were physically/)
      .check();
    await page
      .getByRole("button", { name: "Complete delivery", exact: true })
      .click();
    await page
      .getByText(
        "Upload an authorised proof photo for this delivery attempt before completion.",
        { exact: true },
      )
      .waitFor();
    const bytes = await sharp({
      create: { width: 10, height: 10, channels: 3, background: "green" },
    })
      .png()
      .toBuffer();
    await page.getByLabel("Proof photo", { exact: false }).setInputFiles({
      name: "synthetic-delivery-proof.png",
      mimeType: "image/png",
      buffer: bytes,
    });
    await page
      .getByLabel(/Proof description/)
      .fill("Synthetic local fixture delivery evidence");
    await page.getByLabel(/Customer consented to this evidence photo/).check();
    await page
      .getByRole("button", { name: "Upload proof photo", exact: true })
      .click();
    await page
      .getByText("Proof photo uploaded for this order.", { exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByText(
          "Upload an authorised proof photo for this delivery attempt before completion.",
          { exact: true },
        )
        .count(),
      0,
    );
    await page.getByLabel(/Customer six-digit handover code/).fill("");
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.waitForFunction(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      );
      await page.screenshot({
        path: `docs/web-driver-trips/evidence/handover-${width}.png`,
        fullPage: true,
      });
    }
    await page
      .getByLabel(/Customer six-digit handover code/)
      .fill(owned.confirmation_code);
    await page
      .getByRole("button", { name: "Complete delivery", exact: true })
      .click();
    await page
      .getByText("This assignment is no longer in your current orders.", {
        exact: true,
      })
      .waitFor();
    const delivered = (await api(owner, "orders?id=" + order.id))[0];
    assert.equal(delivered.status, "delivered");
    assert.equal(delivered.payment_status, "verified");
    await nav.getByRole("button", { name: "Home", exact: true }).click();
    await page
      .getByRole("button", { name: "Manage trip", exact: true })
      .click();
    modal = page.getByRole("dialog", { name: "Manage duty trip" });
    await modal.getByLabel(/End odometer/).fill("35");
    await modal.getByRole("button", { name: "End trip", exact: true }).click();
    await modal.getByText("Trip ended.", { exact: true }).waitFor();
    assert.equal((await api(driver, "driver.location")).trip, null);
    // A second local COD order exercises web exception actions; no payment success is fabricated.
    await modal
      .getByLabel("Vehicle", { exact: false })
      .selectOption(credentials.vehicle.id);
    await modal.getByLabel(/Start odometer/).fill("35");
    await modal
      .getByRole("button", { name: "Start trip", exact: true })
      .click();
    await modal
      .getByRole("button", { name: "End trip", exact: true })
      .waitFor();
    await modal.getByRole("button", { name: "Close dialog" }).click();
    const failed = await api(customer, "checkout", {
      items: [{ productId: "hose", quantity: 1 }],
      address: {
        name: "Synthetic exception customer",
        phone: "08012345678",
        street: "12 Synthetic Street",
        zone: "Lekki",
      },
      date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      window: "14:00–18:00",
      paymentMethod: "cash_on_delivery",
      idempotencyKey: crypto.randomUUID(),
    });
    for (const status of ["accepted", "preparing", "assigned"]) {
      const current = (await api(owner, "orders?id=" + failed.id))[0];
      await api(owner, "order.transition", {
        id: failed.id,
        status,
        version: current.tracking_version,
        note: "Synthetic web exception assignment",
        operationKey: crypto.randomUUID(),
        ...(status === "assigned" ? { driverId: credentials.driver.id } : {}),
      });
    }
    await page.getByRole("button", { name: "Refresh", exact: true }).click();
    await page.getByRole("button", { name: "View order", exact: true }).click();
    await page
      .getByText("Delivery problem or dispatch help", { exact: true })
      .click();
    await page
      .getByLabel(/Help request/)
      .fill("Synthetic dispatch help request before pickup");
    const help = page.waitForResponse(
      (response) =>
        response.url().endsWith("/api/delivery.help") &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Request dispatch help", exact: true })
      .click();
    assert.equal((await help).status(), 200);
    await page
      .getByLabel(/Failure category/)
      .selectOption("customer_unavailable");
    await page
      .getByLabel(/Failure note/)
      .fill("Synthetic customer unavailable before custody pickup");
    await page
      .getByRole("button", { name: "Report failed delivery", exact: true })
      .click();
    await page
      .getByText("This assignment is no longer in your current orders.", {
        exact: true,
      })
      .waitFor();
    const exception = (await api(owner, "orders?id=" + failed.id))[0];
    assert.equal(exception.status, "delivery_failed");
    assert.notEqual(exception.payment_status, "verified");
    console.log(
      "PASS second synthetic web exception order: dispatch help accepted; structured customer_unavailable failure recorded without pickup or fabricated payment.",
    );
    console.log(
      "PASS actual browser start/end/revoke; failed read disables writes until refresh; 390/1440 fit; canonical synthetic assignment/pickup succeeds with web-created trip; unresolved delivery blocks trip end. Actual driver UI acknowledgement/pickup/departure/arrival/proof/handover completes a canonically wallet-paid synthetic order; missing proof rejected; trip closes after handover. No hosted writes or GPS permission requested.",
    );
  } finally {
    await Promise.allSettled([
      api(owner, "logout", {}),
      api(driver, "logout", {}),
      api(customer, "logout", {}),
    ]);
    await browser.close();
  }
});
