import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

test("WALLET-ORDER-WEB: desktop and mobile gas, cart and linked checkout use Card/Cash/Wallet with exact wallet debits", async () => {
  const base = process.env.EASYGAS_WALLET_QA_ORIGIN ?? "http://127.0.0.1:3097";
  assert.ok(
    ["127.0.0.1", "localhost"].includes(new URL(base).hostname),
    "Disposable local server required",
  );
  const account = JSON.parse(
    await readFile(process.env.EASYGAS_WALLET_QA_CREDENTIAL_FILE, "utf8"),
  );
  const staged = JSON.parse(
    await readFile(process.env.EASYGAS_WALLET_QA_SERVICE_FILE, "utf8"),
  );
  const { chromium } = await import(
    pathToFileURL(process.env.EASYGAS_QA_PLAYWRIGHT_MODULE).href
  );
  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  async function call(path, body) {
    const r = await context.request.fetch(base + "/api/" + path, {
      method: body ? "POST" : "GET",
      headers: { origin: base },
      ...(body ? { data: body } : {}),
    });
    assert.equal(r.status(), 200, `${path}: ${await r.text()}`);
    return r.json();
  }
  async function methods() {
    const select = page.getByLabel(/Payment method/);
    await page.getByText("Wallet balance:", { exact: false }).first().waitFor();
    for (const method of ["card", "cash_on_delivery", "wallet"])
      assert.equal(
        await select.locator(`option[value="${method}"]`).isEnabled(),
        true,
      );
    await select.selectOption("wallet");
  }
  async function paid(action, submit) {
    const balance = (await call("checkout.payment-options")).balanceKobo;
    const wait = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/" + action) && r.request().method() === "POST",
    );
    await submit();
    const response = await wait;
    assert.equal(response.status(), 200, await response.text());
    const result = await response.json();
    const order = result.order ?? result;
    const total = Number(order.totalKobo ?? order.total_kobo);
    assert.equal(order.payment_status ?? order.paymentStatus, "verified");
    assert.equal(order.payment_method, "wallet");
    assert.equal(
      (await call("checkout.payment-options")).balanceKobo,
      balance - total,
    );
    const replay = await call(action, response.request().postDataJSON());
    assert.equal(replay.order?.id ?? replay.id, order.id);
    assert.equal(
      (await call("checkout.payment-options")).balanceKobo,
      balance - total,
    );
    console.log(
      `PASS ${action}: wallet total ${total} kobo paid once; replay preserves the balance.`,
    );
  }
  async function gasDetails(kg = "3", method = "wallet") {
    await page.goto(base + "/gas-order", { waitUntil: "domcontentloaded" });
    if (kg === "50")
      await page.getByRole("button", { name: /50 kg/ }).first().click();
    await page
      .getByLabel(/Requested gas/)
      .first()
      .fill(kg);
    await page
      .getByLabel(/Complete house address/)
      .fill("12 Wallet Test Street");
    await page
      .locator("#gas-order-address")
      .getByLabel(/Delivery location/)
      .selectOption({ label: "Lekki" });
    await page
      .getByText("Recipient and delivery notes", { exact: true })
      .click();
    await page.getByLabel(/Recipient phone/).fill("08012345678");
    await page.getByLabel(/Delivery date/).fill(date);
    await methods();
    await page.getByLabel(/Payment method/).selectOption(method);
    await page
      .getByRole("button", { name: "Review current quotation" })
      .click();
  }
  const date = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  try {
    await call("login", {
      identifier: account.email,
      password: account.password,
    });
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 960 });
      await gasDetails();
      await paid("checkout", () =>
        page
          .getByRole("button", { name: "Accept total and confirm order" })
          .click(),
      );
      assert.ok(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      );
      console.log(`PASS ${width}px gas checkout choices, balance and layout.`);
    }
    for (const linked of [false, true]) {
      await page.goto(base + "/products", { waitUntil: "domcontentloaded" });
      await page
        .getByRole("button", { name: /Add .*hose.* to cart/i })
        .first()
        .click();
      if (linked)
        await page.evaluate(
          ({ account, staged }) =>
            sessionStorage.setItem(
              "easygas.serviceDrafts." + account.id,
              JSON.stringify([staged]),
            ),
          { account, staged },
        );
      await page.goto(base + (linked ? "/combined-checkout" : "/checkout"), {
        waitUntil: "domcontentloaded",
      });
      await page.locator('input[name="phone"]').fill("08012345678");
      await page
        .getByLabel(/Complete house address/)
        .fill("12 Wallet Test Street");
      await page.getByLabel(/Delivery area/).selectOption({ label: "Lekki" });
      await page.getByLabel(/Delivery date/).fill(date);
      await methods();
      await paid(linked ? "checkout.mixed" : "checkout", () =>
        page
          .getByRole("button", {
            name: linked ? "Confirm linked request" : "Place Order",
            exact: true,
          })
          .click(),
      );
    }
    await page.setViewportSize({ width: 390, height: 960 });
    await gasDetails("50");
    await page.getByText(/Your wallet needs/).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Accept total and confirm order" })
        .isDisabled(),
      true,
    );
    assert.equal(
      await page
        .getByRole("link", { name: /Top up wallet/ })
        .getAttribute("target"),
      "_blank",
    );
    console.log(
      "PASS insufficient quoted wallet balance blocks confirmation and offers top-up without losing checkout.",
    );
    for (const method of ["card", "cash_on_delivery"]) {
      if (method === "card") {
        await page.getByLabel(/Payment method/).selectOption(method);
        await page
          .getByRole("button", { name: "Review current quotation" })
          .click();
      } else await gasDetails("3", method);
      const balance = (await call("checkout.payment-options")).balanceKobo;
      const wait = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/checkout") && r.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Accept total and confirm order" })
        .click();
      const response = await wait;
      assert.equal(response.status(), 200, await response.text());
      const order = await response.json();
      assert.equal(order.payment_method, method);
      assert.equal(order.payment_status, "unpaid");
      assert.equal(
        (await call("checkout.payment-options")).balanceKobo,
        balance,
      );
      console.log(
        `PASS ${method} order remains unpaid and does not debit the wallet.`,
      );
    }
  } finally {
    await context.request.post(base + "/api/logout", {
      headers: { origin: base },
      data: {},
    });
    await browser.close();
  }
});
