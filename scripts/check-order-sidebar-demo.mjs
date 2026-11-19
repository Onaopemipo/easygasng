// Existing client-demo readback only; login/logout are the only writes.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const base = "https://easygas-client-demo.vercel.app";
const root = "docs/deployment/evidence/20261119-order-sidebar";
const before = process.env.EASYGAS_ORDER_SIDEBAR_BASELINE === "true";
test("OSREL-HTTP: hosted order/navigation/invoice/history reads preserve scoped access, retained orders and verified ledger", async () => {
  const manifest = JSON.parse(await readFile(".data/demo-test-logins-20261110.json", "utf8"));
  assert.equal(manifest.project, "easygas-client-demo");
  const tokens = {};
  async function call(role, action, body) {
    const response = await fetch(base + "/api/" + action, {
      method: body === undefined ? "GET" : "POST", signal: AbortSignal.timeout(45000),
      headers: { "content-type": "application/json", "x-easygas-client": "native", origin: base,
        ...(tokens[role] ? { authorization: "Bearer " + tokens[role] } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, data: await response.json() };
  }
  const ok = async (role, action, body) => {
    const r = await call(role, action, body);
    assert.equal(r.status, 200, action + " HTTP " + r.status);
    return r.data;
  };
  const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
  const evidence = { base, phase: before ? "before" : "after", reads: [], denials: [], preservation: {} };
  try {
    assert.deepEqual(await ok("", "status"), { status: "ready", scope: "demo" });
    for (const role of ["owner", "customer"]) {
      const account = manifest.accounts.find((a) => a.role === role);
      const login = await ok(role, "login", { identifier: account.email, password: account.password });
      tokens[role] = login.token;
      assert.equal((await ok(role, "me")).user.id, account.id);
    }
    const access = await ok("owner", "navigation.access");
    assert.ok(access.allowed.includes("orders") && access.allowed.includes("recommendations"));
    const orders = await ok("owner", "orders");
    assert.ok(orders.length > 0);
    if (!before) assert.ok(orders.every((o) => typeof o.customer_provisional === "boolean"));
    const completed = orders.find((o) => o.reference === "EG-2026-FD9F2C67");
    assert.equal(completed?.status, "delivered");
    const invoice = await ok("owner", "invoice.order", { orderId: completed.id });
    assert.ok(invoice.invoice, "existing delivered invoice");
    const photos = await ok("owner", "delivery.photos?orderId=" + completed.id);
    await ok("owner", "doorstep.list", { orderId: completed.id });
    evidence.reads.push({ action: "navigation.access/orders/invoice.order/delivery.photos/doorstep.list", status: 200, completedReference: completed.reference, retainedPhotos: photos.photos?.length ?? photos.rows?.length ?? null });
    const customer = manifest.accounts.find((a) => a.role === "customer");
    const own = await ok("customer", "orders");
    assert.ok(own.every((o) => o.customer_id === customer.id && !("customer_provisional" in o)));
    assert.equal((await call("customer", "navigation.access")).status, 403);
    const other = orders.find((o) => o.customer_id !== customer.id);
    assert.ok(other, "another demo customer's order exists");
    const denied = await call("customer", "invoice.order", { orderId: other.id });
    assert.ok([403, 404].includes(denied.status));
    evidence.denials.push({ action: "customer navigation.access", status: 403 }, { action: "customer other-order invoice", status: denied.status });
    const payment = await ok("owner", "payments/paystack/configuration");
    const bulk = await ok("owner", "bulk.summary");
    assert.equal(payment.environment, "test"); assert.equal(payment.available, true); assert.equal(bulk.enabled, true);
    evidence.preservation = {
      // This rollout adds one staff-only read projection; omit only that field for old/new comparison.
      ordersHash: digest(orders.map(({ customer_provisional, ...order }) => order)),
      verifiedLedgerHash: digest(await ok("owner", "finance.ledger")),
      invoiceHash: digest(invoice), count: orders.length, paystack: "test/available", bulkEnabled: true,
    };
    if (!before) assert.deepEqual(evidence.preservation, JSON.parse(await readFile(root + "/hosted-before.json", "utf8")).preservation);
    await writeFile(root + "/hosted-" + (before ? "before" : "after") + ".json", JSON.stringify(evidence, null, 2) + "\n");
    console.log("PASS scoped reads/denials, canonical completed invoice/history, unchanged orders/ledger/invoice hashes and permanent demo/sandbox configuration");
  } finally {
    for (const role of Object.keys(tokens)) await call(role, "logout", {});
  }
});
