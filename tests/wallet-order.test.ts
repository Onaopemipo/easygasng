import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { fixture } from "./helpers/order-tracking-fixture";
import { id } from "../apps/web/lib/auth";
import { one, type DB } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";

function input(method = "wallet") {
  return {
    items: [{ productId: "hose", quantity: 1 }],
    address: {
      name: "Wallet customer",
      phone: "08012345678",
      street: "12 Wallet Test Street",
      zone: "Lekki",
    },
    date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    window: "14:00–18:00",
    paymentMethod: method,
    idempotencyKey: id(),
  };
}
async function setup(f: Awaited<ReturnType<typeof fixture>>, balance = 450000) {
  await f.db.exec(
    "UPDATE settings SET value='true' WHERE key='wallet.enabled' AND scope='lagos'; UPDATE settings SET value='100000' WHERE key='delivery.fee' AND scope='lagos';",
  );
  await f.db.query(
    "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES($1,$2,$3,'test_fixture',$4)",
    [id(), f.actors.customer.id, balance, id()],
  );
}
test("WALLET-ORDER-01: payment options expose only the authenticated balance and governed delivery-branch methods", async () => {
  const f = await fixture();
  try {
    await setup(f);
    const options = await f.call("customer", "checkout.payment-options", {});
    assert.equal(options.balanceKobo, 450000);
    assert.ok(options.methods.includes("wallet"));
    assert.ok(options.methods.includes("cash_on_delivery"));
    await assert.rejects(() =>
      dispatch("checkout.payment-options", null, {}, f.db),
    );
    await assert.rejects(() =>
      f.call("driver", "checkout.payment-options", {}),
    );
    await assert.rejects(() =>
      f.call("customer", "checkout.payment-options", {
        customerId: f.actors.commercial.id,
      }),
    );
    await assert.rejects(
      () =>
        f.call("customer", "checkout.payment-options", { branchId: "missing" }),
      /unavailable/,
    );
    await f.db.exec(
      "UPDATE settings SET value='false' WHERE key='wallet.enabled' AND scope='lagos'",
    );
    assert.ok(
      !(
        await f.call("customer", "checkout.payment-options", {})
      ).methods.includes("wallet"),
    );
    await assert.rejects(
      () => f.call("customer", "checkout", input()),
      /Wallet payment is not enabled/,
    );
    assert.equal((await f.call("customer", "wallet")).balanceKobo, 450000);
  } finally {
    await f.db.close?.();
  }
});
test("WALLET-ORDER-02: the exact full order total including delivery is debited once and replay stays paid", async () => {
  const f = await fixture();
  try {
    await setup(f);
    const request = { ...input(), source: "MOBILE" };
    const order = await f.call("customer", "checkout", request);
    const replay = await f.call("customer", "checkout", { ...request, source: "WEB" });
    assert.equal(order.id, replay.id);
    assert.equal(Number(order.total_kobo), 450000);
    assert.equal(order.payment_status, "verified");
    assert.equal(order.payment_method, "wallet");
    assert.equal(
      (await f.call("customer", "checkout.payment-options", {})).balanceKobo,
      0,
    );
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT count(*) n FROM wallet_entries WHERE kind='order_payment'",
        ))!.n,
      ),
      1,
    );
    const paid = await one(
      f.db,
      "SELECT amount_kobo,method FROM verified_payments WHERE order_id=$1",
      [order.id],
    );
    assert.equal(Number(paid!.amount_kobo), 450000);
    assert.equal(paid!.method, "wallet");
    await assert.rejects(
      () =>
        f.call("customer", "checkout", {
          ...request,
          paymentMethod: "cash_on_delivery",
        }),
      /already used/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("WALLET-ORDER-03: insufficient or changed balances roll back order, payment and stock reservations", async () => {
  const f = await fixture();
  try {
    await setup(f, 449999);
    const before = await one(
      f.db,
      "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
    );
    await assert.rejects(
      () => f.call("customer", "checkout", input()),
      (error) => (error as any).code === "WALLET_INSUFFICIENT_FUNDS",
    );
    for (const table of ["orders", "verified_payments", "order_events"])
      assert.equal(
        Number((await one(f.db, `SELECT count(*) n FROM ${table}`))!.n),
        0,
      );
    assert.equal(
      (await one(
        f.db,
        "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
      ))!.reserved,
      before!.reserved,
    );
    assert.equal((await f.call("customer", "wallet")).balanceKobo, 449999);
    const cash = await f.call(
      "customer",
      "checkout",
      input("cash_on_delivery"),
    );
    assert.equal(cash.payment_status, "unpaid");
    assert.equal((await f.call("customer", "wallet")).balanceKobo, 449999);
  } finally {
    await f.db.close?.();
  }
});

const pgEnabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "WALLET-ORDER-PG: independent cross-branch purchases cannot overdraw one wallet and concurrent retries debit once",
  { skip: pgEnabled ? false : "Disposable PostgreSQL not enabled" },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw Error("Isolated PostgreSQL required");
    const schema = "easygas_test_wallet_" + id().replaceAll("-", "");
    const admin = new Pool({ connectionString: String(url) });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: String(url),
      max: 8,
      options: `-c search_path=${schema},pg_catalog -c statement_timeout=20000 -c lock_timeout=10000`,
    });
    const db: DB = {
      query: (q, p) => pool.query(q, p),
      exec: (q) => pool.query(q),
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const r = await fn({
            query: (q, p) => c.query(q, p),
            exec: (q) => c.query(q),
          });
          await c.query("COMMIT");
          return r;
        } catch (e) {
          await c.query("ROLLBACK");
          throw e;
        } finally {
          c.release();
        }
      },
    };
    try {
      const f = await fixture(db);
      await setup(f);
      await db.exec(
        "INSERT INTO branches(id,name) VALUES('wallet-other','Wallet other'); INSERT INTO settings(key,scope,value,version) SELECT key,'wallet-other',value,version FROM settings WHERE scope='lagos'; INSERT INTO inventory(branch_id,product_id,quantity,reserved,price_kobo,published) VALUES('wallet-other','hose',50,0,350000,true); INSERT INTO delivery_locations(id,name,branch_id,active,visible,coverage) VALUES('wallet-other','Wallet Other','wallet-other',true,true,'Synthetic fixture only');",
      );
      const a = input(),
        b = input();
      b.address.zone = "Wallet Other";
      const results = await Promise.allSettled([
        f.call("customer", "checkout", a),
        f.call("customer", "checkout", b),
      ]);
      const success = results.filter((r) => r.status === "fulfilled");
      assert.equal(success.length, 1);
      assert.equal((await f.call("customer", "wallet")).balanceKobo, 0);
      assert.equal(
        Number((await one(db, "SELECT count(*) n FROM orders"))!.n),
        1,
      );
      const winner = (success[0] as PromiseFulfilledResult<any>).value;
      const retry = winner.branch_id === "lagos" ? a : b;
      const replay = await Promise.all([
        f.call("customer", "checkout", retry),
        f.call("customer", "checkout", retry),
      ]);
      assert.ok(replay.every((o) => o.id === winner.id));
      assert.equal(
        Number(
          (await one(
            db,
            "SELECT count(*) n FROM wallet_entries WHERE kind='order_payment'",
          ))!.n,
        ),
        1,
      );
      assert.equal(
        Number((await one(db, "SELECT count(*) n FROM verified_payments"))!.n),
        1,
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);

test("WALLET-ORDER-HTTP: authenticated payment choices use GET, private no-store responses and reject identity injection", async () => {
  const { GET, POST } = await import("../apps/web/app/api/[action]/route");
  const { NextRequest } = await import("next/server");
  const { localSchemaRevision } = await import("../apps/web/lib/db");
  const f = await fixture();
  const state = globalThis as any;
  const priorDb = state.easygasDb,
    priorVersion = state.easygasLocalVersion;
  const oldJobs = process.env.EASYGAS_BACKGROUND_JOBS,
    oldOrigin = process.env.APP_URL;
  try {
    await setup(f);
    state.easygasDb = Promise.resolve(f.db);
    state.easygasLocalVersion = localSchemaRevision;
    process.env.EASYGAS_BACKGROUND_JOBS = "false";
    process.env.APP_URL = "http://localhost:3003";
    const context = {
      params: Promise.resolve({ action: "checkout.payment-options" }),
    };
    const url = "http://localhost:3003/api/checkout.payment-options";
    const headers = { authorization: "Bearer " + f.actors.customer.token };
    const response = await GET(new NextRequest(url, { headers }), context);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).balanceKobo, 450000);
    assert.match(response.headers.get("cache-control")!, /private.*no-store/);
    assert.match(response.headers.get("vary")!, /Authorization/);
    assert.equal((await GET(new NextRequest(url), context)).status, 401);
    assert.equal(
      (
        await GET(
          new NextRequest(url + "?customerId=" + f.actors.commercial.id, {
            headers,
          }),
          context,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await POST(
          new NextRequest(url, {
            method: "POST",
            headers: {
              ...headers,
              origin: "http://localhost:3003",
              "content-type": "application/json",
            },
            body: "{}",
          }),
          context,
        )
      ).status,
      405,
    );
  } finally {
    state.easygasDb = priorDb;
    state.easygasLocalVersion = priorVersion;
    if (oldJobs === undefined) delete process.env.EASYGAS_BACKGROUND_JOBS;
    else process.env.EASYGAS_BACKGROUND_JOBS = oldJobs;
    if (oldOrigin === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = oldOrigin;
    await f.db.close?.();
  }
});
