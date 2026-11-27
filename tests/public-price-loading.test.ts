import test from "node:test";
import assert from "node:assert/strict";
import { createPublicGasCache } from "../packages/business-rules/src/public-gas-cache";
import { fixture } from "./helpers/order-tracking-fixture";
import { setup } from "./helpers/daily-delivery-fixture";
import { dispatch } from "../apps/web/lib/service";
import { id } from "../apps/web/lib/auth";
const snapshot = (branchId = "lagos", fetchedAt = 1000, version = 1) => ({
  branchId,
  fetchedAt,
  priceVersion: version,
  feeVersion: version,
  policyVersion: version,
  priceKobo: 180000,
  deliveryKobo: 500000,
  policy: {},
  locations: [],
  deliveryOnly: true,
});
test("PRICE-CACHE fresh public price pairs survive remounts, expire together after60s and never cache identity/quotes", async () => {
  let now = 1000,
    calls = 0;
  const c = createPublicGasCache(() => now);
  c.seed({
    ...snapshot(),
    user: { id: "private" },
    token: "must-not-cache",
    quote: { total: 9 },
  });
  assert.equal(c.read("lagos")?.fresh, true);
  assert.equal(c.read("lagos")?.value.user, undefined);
  assert.equal(c.read("lagos")?.value.token, undefined);
  assert.equal(c.read("lagos")?.value.quote, undefined);
  await c.load("lagos", async () => {
    calls++;
    return snapshot();
  });
  assert.equal(calls, 0);
  now += 60001;
  assert.equal(c.read("lagos")?.fresh, false);
  assert.equal(c.read("lagos")?.value.deliveryKobo, 500000);
  await c.load("lagos", async () => {
    calls++;
    return snapshot("lagos", now, 2);
  });
  assert.equal(calls, 1);
  assert.equal(c.read("lagos")?.fresh, true);
});
test("PRICE-BRANCH concurrent reads deduplicate only within the same branch; out-of-order old versions cannot overwrite newer prices", async () => {
  const c = createPublicGasCache(() => 1000);
  let finish: (v: any) => void = () => {},
    calls = 0;
  const fetch = () => {
    calls++;
    return new Promise((r) => (finish = r));
  };
  const a = c.load("lagos", fetch),
    b = c.load("lagos", fetch);
  await Promise.resolve();
  assert.equal(calls, 1);
  assert.equal(a, b);
  c.seed({ ...snapshot("lagos", 1000, 3), priceKobo: 190000 });
  finish(snapshot("lagos", 1000, 1));
  assert.equal((await a).priceKobo, 190000);
  assert.equal(c.read("abuja"), null);
  await assert.rejects(
    () => c.load("abuja", async () => snapshot("lagos")),
    /selected delivery branch/,
  );
  assert.equal(c.read("abuja"), null);
  await c.load("abuja", async () => snapshot("abuja"));
  assert.equal(c.read("abuja")?.value.branchId, "abuja");
});
test("PRICE-RETRY a failed refresh retains the last loaded pair and releases the request for an explicit retry; invalid payload cannot become a price", async () => {
  let now = 1000;
  const c = createPublicGasCache(() => now);
  c.seed(snapshot());
  now += 60001;
  await assert.rejects(
    () =>
      c.load("lagos", async () => {
        throw Error("offline");
      }),
    /offline/,
  );
  assert.equal(c.read("lagos")?.value.priceKobo, 180000);
  await c.load("lagos", async () => ({
    ...snapshot("lagos", now),
    priceKobo: 185000,
  }));
  assert.equal(c.read("lagos")?.value.priceKobo, 185000);
  assert.equal(c.seed({ ...snapshot(), deliveryKobo: -1 }), undefined);
  assert.equal(c.read("lagos")?.value.priceKobo, 185000);
});
test("PRICE-API public catalogue reads gas price/fee/policy once, before product reads, and reuses the same fee snapshot", async () => {
  const f = await fixture();
  try {
    const queries: string[] = [];
    const db = {
      ...f.db,
      transaction: (fn: any) =>
        f.db.transaction((tx) =>
          fn({
            exec: (q: string) => tx.exec(q),
            query: (q: string, p: any[]) => {
              queries.push(q);
              return tx.query(q, p);
            },
          }),
        ),
    };
    const data = await dispatch(
      "catalogue",
      null,
      { view: "homepage" },
      db as any,
    );
    const pricing = queries.filter((q) =>
      q.includes(
        "key IN ('gas.price_per_kg','delivery.fee','gas.quantity_policy')",
      ),
    );
    assert.equal(pricing.length, 1);
    assert.equal(queries.filter((q) => q.startsWith("SELECT l.*,")).length, 1);
    assert.ok(
      queries.indexOf(pricing[0]) <
        queries.findIndex((q) => q.includes("FROM products p")),
    );
    assert.equal(data.gas.branchId, "lagos");
    assert.ok(Number.isFinite(data.gas.fetchedAt));
    assert.equal(data.deliveryFee, data.gas.deliveryKobo);
    assert.deepEqual(
      data.zones,
      data.gas.locations.map((l: any) => l.name),
    );
  } finally {
    await f.db.close?.();
  }
});
test("PRICE-CHECKOUT cached presentation cannot bypass a new canonical price version or reserve stock using an old quote", async () => {
  const f = await setup();
  try {
    const lines = [{ capacityKg: 6, kg: 6 }],
      q = await f.call("customer", "gas.quote", { lines, locationId: "lekki" });
    const before = (
      await f.db.query(
        "SELECT grams,reserved_grams FROM gas_stock WHERE branch_id='lagos'",
      )
    ).rows;
    await f.db.query(
      "UPDATE settings SET value=to_jsonb((value::text)::integer+100),version=version+1 WHERE key='gas.price_per_kg' AND scope='lagos'",
    );
    await assert.rejects(
      () =>
        f.call("customer", "checkout", {
          items: [],
          gasLines: lines,
          pricing: {
            priceVersion: q.priceVersion,
            feeVersion: q.feeVersion,
            policyVersion: q.policyVersion,
            totalKobo: q.subtotalKobo + q.deliveryKobo,
          },
          address: {
            name: "Synthetic customer",
            phone: "08012345678",
            street: "27 Synthetic Street",
            zone: "Lekki",
            locationId: "lekki",
          },
          date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          window: "14:00–18:00",
          paymentMethod: "wallet",
          idempotencyKey: id(),
        }),
      (e: any) => e.code === "PRICE_CHANGED",
    );
    assert.deepEqual(
      (
        await f.db.query(
          "SELECT grams,reserved_grams FROM gas_stock WHERE branch_id='lagos'",
        )
      ).rows,
      before,
    );
  } finally {
    await f.db.close?.();
  }
});
