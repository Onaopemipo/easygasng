import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

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
    driver = await browser.newContext();
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
    let current = (await api(driver, "orders?id=" + order.id))[0];
    await api(driver, "dispatch.respond", {
      orderId: order.id,
      version: current.tracking_version,
      decision: "acknowledged",
      reason: "Synthetic web trip assignment acknowledged",
      operationKey: crypto.randomUUID(),
    });
    await api(driver, "delivery.pickup", {
      orderId: order.id,
      version: current.tracking_version,
      operationKey: crypto.randomUUID(),
      manifest: current.manifest,
      reason: "Synthetic web trip complete manifest checked",
    });
    current = (await api(driver, "orders?id=" + order.id))[0];
    await api(driver, "order.transition", {
      id: order.id,
      status: "out_for_delivery",
      version: current.tracking_version,
      note: "Synthetic driver delivery custody underway",
      operationKey: crypto.randomUUID(),
    });
    await modal.getByLabel(/End odometer/).fill("35");
    await modal.getByRole("button", { name: "End trip", exact: true }).click();
    await modal
      .getByText("Resolve active delivery custody before ending the trip.", {
        exact: true,
      })
      .waitFor();
    assert.ok((await api(driver, "driver.location")).trip);
    console.log(
      "PASS actual browser start/end/revoke; failed read disables writes until refresh; 390/1440 fit; canonical synthetic assignment/pickup succeeds with web-created trip; unresolved delivery blocks trip end. No hosted writes or GPS permission requested.",
    );
  } finally {
    await Promise.allSettled([
      api(owner, "logout", {}),
      api(driver, "logout", {}),
    ]);
    await browser.close();
  }
});
