import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
const base =
  process.env.EASYGAS_ASSIGNMENT_QA_ORIGIN ?? "http://127.0.0.1:3101";
assert.ok(
  ["localhost", "127.0.0.1"].includes(new URL(base).hostname),
  "Disposable local server required",
);
const credentials = JSON.parse(
  await readFile(process.env.EASYGAS_ASSIGNMENT_QA_CREDENTIAL_FILE, "utf8"),
);
const { chromium } = await import(
  pathToFileURL(process.env.EASYGAS_QA_PLAYWRIGHT_MODULE).href
);
const evidence = "docs/assignment-notifications/evidence";
await mkdir(evidence, { recursive: true });
test("DAN-BROWSER: owner valid next steps, visible failed-save feedback and automatic driver bell notification", async () => {
  const browser = await chromium.launch({ channel: "chrome" }),
    owner = await browser.newContext(),
    driver = await browser.newContext();
  async function api(context, action, data) {
    return context.request.fetch(base + "/api/" + action, {
      method: data ? "POST" : "GET",
      headers: { Origin: base },
      ...(data ? { data } : {}),
    });
  }
  try {
    for (const [context, account] of [
      [owner, credentials.owner],
      [driver, credentials.driver],
    ])
      assert.equal(
        (
          await api(context, "login", {
            identifier: account.email,
            password: account.password,
          })
        ).status(),
        200,
      );
    const ownerPage = await owner.newPage(),
      driverPage = await driver.newPage();
    ownerPage.setDefaultTimeout(60000);
    driverPage.setDefaultTimeout(60000);
    await driverPage.goto(base + "/admin/deliveries", {
      waitUntil: "domcontentloaded",
    });
    await driverPage
      .getByRole("navigation", { name: "Driver workspace" })
      .waitFor();
    assert.equal(
      (await (await api(driver, "notifications.list")).json()).unread,
      0,
    );
    const orderUrl = base + "/admin/orders?orderId=" + credentials.order.id;
    await ownerPage.goto(orderUrl, { waitUntil: "domcontentloaded" });
    let dialog = ownerPage.getByRole("dialog");
    await dialog.waitFor();
    await dialog.getByText("Update order status", { exact: true }).click();
    const status = dialog.getByLabel(/Next status/),
      driverSelect = dialog.getByLabel(/Driver when assigning/);
    assert.deepEqual(
      await status
        .locator("option")
        .evaluateAll((options) => options.map((o) => o.value)),
      ["", "accepted", "cancelled"],
    );
    assert.ok(await driverSelect.isDisabled());
    let current = (
      await (await api(owner, "orders?id=" + credentials.order.id)).json()
    )[0];
    // A real concurrent update makes the open form stale; its rejection must be visible inside the modal.
    assert.equal(
      (
        await api(owner, "order.transition", {
          id: current.id,
          status: "accepted",
          version: current.tracking_version,
          note: "Synthetic concurrent owner acceptance",
          operationKey: crypto.randomUUID(),
        })
      ).status(),
      200,
    );
    await status.selectOption("accepted");
    await dialog
      .getByLabel(/Operational note/)
      .fill("Synthetic stale form should not save");
    await dialog
      .getByRole("button", { name: "Update Order", exact: true })
      .click();
    await dialog
      .getByText("This order changed. Refresh before retrying.", {
        exact: true,
      })
      .waitFor();
    await ownerPage.screenshot({
      path: evidence + "/owner-stale-error.png",
      fullPage: true,
    });
    assert.equal(
      (await (await api(driver, "notifications.list")).json()).unread,
      0,
    );
    await ownerPage.reload({ waitUntil: "domcontentloaded" });
    dialog = ownerPage.getByRole("dialog");
    await dialog.waitFor();
    await dialog.getByText("Update order status", { exact: true }).click();
    assert.deepEqual(
      await dialog
        .getByLabel(/Next status/)
        .locator("option")
        .evaluateAll((options) => options.map((o) => o.value)),
      ["", "preparing", "cancelled"],
    );
    await dialog.getByLabel(/Next status/).selectOption("preparing");
    await dialog
      .getByLabel(/Operational note/)
      .fill("Synthetic order preparation for notification check");
    await dialog
      .getByRole("button", { name: "Update Order", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    await ownerPage.goto(orderUrl, { waitUntil: "domcontentloaded" });
    dialog = ownerPage.getByRole("dialog");
    await dialog.waitFor();
    await dialog.getByText("Update order status", { exact: true }).click();
    assert.deepEqual(
      await dialog
        .getByLabel(/Next status/)
        .locator("option")
        .evaluateAll((options) => options.map((o) => o.value)),
      ["", "assigned", "cancelled"],
    );
    await dialog.getByLabel(/Next status/).selectOption("assigned");
    await dialog
      .getByLabel(/Driver when assigning/)
      .selectOption(credentials.driver.id);
    await dialog
      .getByLabel(/Operational note/)
      .fill("Synthetic owner assigns driver for bell acceptance");
    const committed = ownerPage.waitForResponse(
      (r) =>
        r.url().endsWith("/api/order.transition") &&
        r.request().method() === "POST",
    );
    await dialog
      .getByRole("button", { name: "Update Order", exact: true })
      .click();
    assert.equal((await committed).status(), 200);
    await dialog.waitFor({ state: "hidden" });
    await driverPage.bringToFront();
    await driverPage
      .locator(".notification-toggle .ac-unread-count")
      .filter({ hasText: "1" })
      .waitFor({ timeout: 45000 });
    await driverPage
      .getByRole("button", { name: "View notifications", exact: true })
      .click();
    const tray = driverPage.getByRole("dialog");
    await tray.getByText("Delivery assigned", { exact: true }).waitFor();
    await tray
      .getByText(
        credentials.order.reference +
          ": a delivery assignment requires your review. Open Orders to review the assignment.",
        { exact: true },
      )
      .waitFor();
    assert.equal(
      await tray
        .getByText("Delivery confirmation code", { exact: true })
        .count(),
      0,
    );
    await driverPage.setViewportSize({ width: 390, height: 900 });
    await driverPage.waitForFunction(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth + 1,
      {},
      { timeout: 5000 },
    );
    const fit = await driverPage.evaluate(() => ({
      view: document.documentElement.clientWidth,
      whole: document.documentElement.scrollWidth,
      over: [...document.querySelectorAll("body *")]
        .filter(
          (e) =>
            e.getBoundingClientRect().right >
            document.documentElement.clientWidth + 1,
        )
        .slice(0, 10)
        .map((e) => ({
          tag: e.tagName,
          class: e.className,
          right: e.getBoundingClientRect().right,
          width: e.getBoundingClientRect().width,
        })),
    }));
    console.log("Mobile geometry", JSON.stringify(fit));
    await driverPage.screenshot({
      path: evidence + "/driver-bell-before-fit.png",
      fullPage: true,
    });
    assert.ok(fit.whole <= fit.view + 1);
    await driverPage.screenshot({
      path: evidence + "/driver-bell-390.png",
      fullPage: true,
    });
    await driverPage.setViewportSize({ width: 1440, height: 1000 });
    await driverPage.screenshot({
      path: evidence + "/driver-bell-1440.png",
      fullPage: true,
    });
    await tray
      .getByRole("button", { name: "Mark as read", exact: true })
      .click();
    await driverPage.waitForFunction(
      () => !document.querySelector(".notification-toggle .ac-unread-count"),
    );
    assert.equal(
      (await (await api(driver, "notifications.list")).json()).unread,
      0,
    );
    console.log(
      "PASS actual two-session synthetic owner workflow: valid next statuses; driver disabled before preparation; real stale rejection visible inside order modal; committed assignment automatically updates driver badge; private bell alert fits390/1440; mark-read clears badge. No hosted/physical order changed.",
    );
  } finally {
    await Promise.allSettled([owner, driver].map((c) => api(c, "logout", {})));
    await browser.close();
  }
});
