import test from "node:test";
import assert from "node:assert/strict";
import { dispatchJourneyFixture } from "./helpers/dispatch-journey-fixture";
import { id } from "../apps/web/lib/auth";
import { one } from "../apps/web/lib/db";
const reject = (status: number) => (e: any) => e.status === status;
async function withJourney(
  fn: (f: Awaited<ReturnType<typeof dispatchJourneyFixture>>) => Promise<void>,
) {
  const env = { ...process.env };
  let f: any;
  try {
    f = await dispatchJourneyFixture();
    await fn(f);
  } finally {
    await f?.db.close?.();
    process.env = env;
  }
}

test("DJ-GAS: real admin vehicle assignment and manager order assignment lead through qualified gas pickup, restricted-driver metering/proof/handover, independent remainder receipt and admin closure exactly once", () =>
  withJourney(async (f) => {
    const before = await one(
      f.db,
      "SELECT * FROM gas_stock WHERE branch_id='lagos'",
    );
    const o = await f.make(true);
    await f.prepare(o);
    await assert.rejects(() => f.assign(o), reject(409));
    const start = await f.start();
    assert.equal((await f.call("driver", "driver.snapshot")).trip.id, start.id);
    await f.assign(o);
    await f.ack(o);
    await assert.rejects(() => f.pickup(o), /measured vehicle LPG load/);
    await assert.rejects(
      () => f.end(),
      (e: any) => e.code === "TRIP_RECONCILIATION_REQUIRED",
    );
    const load = await f.run("inventory", "bulk.load.issue", {
      tripId: start.id,
      meterId: f.meter.id,
      grams: 10000,
      meterReadingGrams: 100000,
      orderIds: [o.id],
      reason: "Synthetic measured full load with4000g return buffer",
    });
    await assert.rejects(() => f.pickup(o), /acknowledge/);
    const ack = {
      loadId: load.id,
      version: 1,
      returnGrams: 10000,
      meterReadingGrams: 100000,
      reason: "Synthetic independent measured vehicle receipt",
    };
    await f.run("driver", "bulk.load.acknowledge", ack);
    await f.arrive(o);
    await assert.rejects(() => f.complete(o), /proof/i);
    await f.proof(o);
    await assert.rejects(() => f.complete(o), /meter|dispens/i);
    await assert.rejects(
      () =>
        f.run("driver", "bulk.dispense", {
          loadId: load.id,
          version: 2,
          orderId: o.id,
          meterReadingGrams: 100001,
          reason: "Synthetic incorrect cumulative meter reading",
        }),
      reject(409),
    );
    const dispense = {
      loadId: load.id,
      version: 2,
      orderId: o.id,
      meterReadingGrams: 106000,
      reason: "Synthetic full6000g actual metered handover",
    };
    await f.run("driver", "bulk.dispense", dispense);
    await f.complete(o);
    assert.equal((await f.snapshot(o.id)).status, "delivered");
    const invoice = (
      await f.call("customer", "invoice.order", { orderId: o.id })
    ).invoice;
    assert.equal(invoice.amountDueKobo, 0);
    assert.equal(
      Number(
        (await one(f.db, "SELECT * FROM gas_stock WHERE branch_id='lagos'"))!
          .grams,
      ),
      Number(before!.grams) - 6000,
    );
    await assert.rejects(
      () => f.end(),
      (e: any) => e.code === "TRIP_RECONCILIATION_REQUIRED",
    );
    const l = async () =>
      one(f.db, "SELECT * FROM bulk_lpg_loads WHERE id=$1", [load.id]);
    await f.run("driver", "bulk.return.declare", {
      loadId: load.id,
      version: Number((await l())!.version),
      returnGrams: 4000,
      reason: "Synthetic measured actual4000g remainder declared",
    });
    await assert.rejects(
      async () =>
        f.run("driver", "bulk.return.receive", {
          loadId: load.id,
          version: Number((await l())!.version),
          returnGrams: 4000,
          reason: "Synthetic self-receipt must fail",
        }),
      reject(403),
    );
    await assert.rejects(() => f.end(), reject(409));
    const receive = {
      loadId: load.id,
      version: Number((await l())!.version),
      returnGrams: 4000,
      reason: "Synthetic independent exact4000g depot receipt",
    };
    const received = await f.run("inventory", "bulk.return.receive", receive);
    assert.ok(received);
    assert.equal((await l())!.state, "reconciled");
    assert.equal(
      Number(
        (await one(f.db, "SELECT * FROM gas_stock WHERE branch_id='lagos'"))!
          .reserved_grams,
      ),
      0,
    );
    const end = {
      tripId: start.id,
      version: Number((await f.trip())!.version),
      endOdometer: 125,
      operationKey: id(),
    };
    const closed = await f.run("dispatcher", "dispatch.trip.end", end);
    assert.equal(
      (await f.run("dispatcher", "dispatch.trip.end", end)).id,
      closed.id,
    );
    assert.equal(await f.trip(), undefined);
    assert.equal((await f.call("driver", "driver.snapshot")).trip, null);
  }));

test("DJ-COD: actual product delivery and surplus manifests retain independent cash and physical return controls before admin trip closure", () =>
  withJourney(async (f) => {
    const o = await f.make(false, "cash_on_delivery");
    await f.prepare(o);
    const t = await f.start();
    await f.assign(o);
    await f.ack(o);
    const common = {
      evidence: "Synthetic measured physical inspection evidence",
      reason: "Synthetic product custody acceptance",
    };
    const m = await f.run("inventory", "manifest.issue", {
      tripId: t.id,
      productId: "hose",
      quantity: 2,
      unitWeightGrams: 500,
      serialIds: [],
      ...common,
    });
    await f.run("driver", "manifest.acknowledge", {
      manifestId: m.id,
      version: 1,
      quantity: 2,
      serialIds: [],
      ...common,
    });
    await f.arrive(o);
    await f.proof(o);
    await assert.rejects(
      () => f.complete(o),
      /Payment needs authorised operations review/,
    );
    const current = await f.snapshot(o.id),
      own = (await f.call("customer", "orders", { id: o.id }))[0];
    await f.run("owner", "delivery.complete", {
      orderId: o.id,
      version: Number(current.tracking_version),
      code: own.confirmation_code,
      collectedKobo: Number(current.total_kobo),
      handover: true,
    });
    assert.equal((await f.snapshot(o.id)).payment_status, "collected");
    const cash = (await f.call("inventory", "cash.collections")).find(
      (c: any) => c.reference === o.reference,
    );
    assert.ok(cash);
    await f.call("owner", "cash.reconcile", {id:cash.id});
    await f.call("inventory", "cash.reconcile", { id: cash.id });
    await f.call("inventory", "cash.reconcile", { id: cash.id });
    assert.equal((await f.snapshot(o.id)).payment_status, "verified");
    assert.equal(
      (await f.call("customer", "invoice.order", { orderId: o.id })).invoice
        .amountDueKobo,
      0,
    );
    await assert.rejects(() => f.end(), reject(409));
    await f.run("driver", "manifest.return.declare", {
      manifestId: m.id,
      version: 2,
      quantity: 2,
      serialIds: [],
      ...common,
    });
    await assert.rejects(() => f.end(), reject(409));
    await f.run("inventory", "manifest.return.receive", {
      manifestId: m.id,
      version: 3,
      foundQuantity: 2,
      saleableQuantity: 2,
      foundSerialIds: [],
      saleableSerialIds: [],
      ...common,
    });
    await f.end();
    const stock = await one(
      f.db,
      "SELECT quantity,reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
    );
    assert.equal(Number(stock!.quantity), 49);
    assert.equal(Number(stock!.reserved), 0);
    assert.equal(await f.trip(), undefined);
    assert.equal(
      (
        await f.db.query("SELECT id FROM verified_payments WHERE order_id=$1", [
          o.id,
        ])
      ).rows.length,
      1,
    );
  }));

test("DJ-RETRY: failed wallet delivery requires independent exact return; retry keeps one debit/reservation, requires new attempt proof and ends only after final handover", () =>
  withJourney(async (f) => {
    const o = await f.make();
    await f.prepare(o);
    await f.start();
    await f.assign(o);
    await f.ack(o);
    await f.arrive(o);
    await f.proof(o, "Synthetic first attempt proof");
    const first = await f.snapshot(o.id);
    await f.run("driver", "order.transition", {
      id: o.id,
      status: "delivery_failed",
      version: Number(first.tracking_version),
      note: "Synthetic customer unavailable on first attempt",
      failureReason: "customer_unavailable",
    });
    await assert.rejects(() => f.end(), reject(409));
    let current = await f.snapshot(o.id);
    await assert.rejects(
      () =>
        f.run("driver", "delivery.return", {
          orderId: o.id,
          version: Number(current.tracking_version),
          manifest: current.manifest,
          reason: "Synthetic self-receipt rejected",
        }),
      reject(403),
    );
    await assert.rejects(
      () =>
        f.run("inventory", "delivery.return", {
          orderId: o.id,
          version: Number(current.tracking_version),
          manifest: [],
          reason: "Synthetic incomplete return rejected",
        }),
      reject(409),
    );
    await f.run("inventory", "delivery.return", {
      orderId: o.id,
      version: Number(current.tracking_version),
      manifest: current.manifest,
      reason: "Synthetic exact independent received manifest",
    });
    const wallet = await f.call("customer", "wallet"),
      stock = await f.call("inventory", "inventory");
    current = await f.snapshot(o.id);
    await f.run("dispatcher", "delivery.reschedule", {
      orderId: o.id,
      version: Number(current.tracking_version),
      date: current.delivery_date.slice(0, 10),
      window: current.delivery_window,
      reason: "Synthetic safe retry only after independent return",
    });
    await f.assign(o);
    await f.ack(o);
    await f.arrive(o);
    current = await f.snapshot(o.id);
    assert.notEqual(current.attempt.id, first.attempt.id);
    assert.deepEqual(await f.call("customer", "wallet"), wallet);
    assert.deepEqual(await f.call("inventory", "inventory"), stock);
    await assert.rejects(() => f.complete(o), /proof/i);
    await assert.rejects(
      () => f.proof(o, "Synthetic first attempt proof"),
      (e: any) =>
        e.status === 409 && /earlier delivery attempt/i.test(e.message),
    );
    await f.proof(o, "Synthetic new second attempt proof");
    await f.complete(o);
    await f.end();
    assert.equal((await f.snapshot(o.id)).status, "delivered");
    assert.deepEqual(await f.call("customer", "wallet"), wallet);
    assert.equal(
      (
        await f.db.query("SELECT id FROM delivery_attempts WHERE order_id=$1", [
          o.id,
        ])
      ).rows.length,
      2,
    );
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT quantity FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
        ))!.quantity,
      ),
      49,
    );
  }));
