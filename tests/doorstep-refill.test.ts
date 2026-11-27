import { paySyntheticPhoneOrder } from "./helpers/phone-prepayment";
import test from "node:test";
import assert from "node:assert/strict";
import { dispatchJourneyFixture } from "./helpers/dispatch-journey-fixture";
import { one } from "../apps/web/lib/db";
import { id } from "../apps/web/lib/auth";

async function setup(payment = "cash_on_delivery") {
  const f = await dispatchJourneyFixture();
  const originalCylinders = Number(
    (await one(f.db, "SELECT count(*) n FROM cylinders"))!.n,
  );
  const o = await f.make(true, payment);
  await f.transition(o, "accepted", "dispatcher");
  await f.transition(o, "preparing", "dispatcher");
  await f.call("dispatcher", "delivery.coverage.confirm", {
    orderId: o.id,
    reason: "Synthetic business confirmation of actual customer address",
  });
  const trip = await f.start();
  const candidates = await f.call("owner", "dispatch.candidates", {
    orderId: o.id,
  });
  assert.equal(candidates.orderReadiness.ready, true);
  assert(
    !candidates.preparationActions.some((a: any) =>
      a.id.startsWith("inspection:"),
    ),
  );
  await f.assign(o);
  await f.ack(o);
  const load = await f.run("inventory", "bulk.load.issue", {
    tripId: trip.id,
    meterId: f.meter.id,
    grams: 10000,
    meterReadingGrams: 100000,
    orderIds: [o.id],
    reason: "Synthetic measured tanker LPG issued with4000g buffer",
  });
  await assert.rejects(() => f.pickup(o), /acknowledge/);
  await f.run("driver", "bulk.load.acknowledge", {
    loadId: load.id,
    version: 1,
    returnGrams: 10000,
    meterReadingGrams: 100000,
    reason: "Synthetic driver confirms actual loaded mass and meter",
  });
  await f.arrive(o);
  const current = () => f.snapshot(o.id);
  const complete = async (extra: any = {}) =>
    f.run("driver", "driver.complete", {
      orderId: o.id,
      version: Number((await current()).tracking_version),
      handover: true,
      ...extra,
    });
  return {
    ...f,
    o,
    startedTrip: trip,
    load,
    originalCylinders,
    current,
    complete,
  };
}
async function use(
  fn: (f: Awaited<ReturnType<typeof setup>>) => Promise<void>,
  payment?: string,
) {
  const env = { ...process.env };
  let f: any;
  try {
    f = await setup(payment);
    await fn(f);
  } finally {
    await f?.db.close?.();
    process.env = env;
  }
}

test("DRF-JOURNEY: self-service COD refill has no cylinder registry/inspection or OTP, uses actual mass and photo, reconciles cash/tanker and ends trip once", () =>
  use(async (f) => {
    const before = await one(
      f.db,
      "SELECT * FROM gas_stock WHERE branch_id='lagos'",
    );
    assert.equal((await f.current()).gas_lines[0].cylinder_id, null);
    await assert.rejects(
      () => f.complete({ collectedKobo: Number(f.o.total_kobo) }),
      /photo|dispense/i,
    );
    await f.proof(f.o, "Synthetic photo captured before filling");
    const dispense = {
      loadId: f.load.id,
      version: 2,
      orderId: f.o.id,
      meterReadingGrams: 106000,
      reason: "Synthetic actual6000g gas supplied at customer address",
    };
    await f.run("driver", "bulk.dispense", dispense);
    await assert.rejects(
      () => f.complete({ collectedKobo: Number(f.o.total_kobo) }),
      /photo/i,
    );
    await f.proof(
      f.o,
      "Synthetic customer-consented refill photo after dispensing",
    );
    await assert.rejects(
      () => f.complete({ collectedKobo: 0 }),
      /cash amount|collected/i,
    );
    const finish = {
      collectedKobo: Number(f.o.total_kobo),
      operationKey: id(),
    };
    const completion = {
      orderId: f.o.id,
      version: Number((await f.current()).tracking_version),
      handover: true,
      ...finish,
    };
    await f.run("driver", "driver.complete", completion);
    await f.run("driver", "driver.complete", completion);
    assert.equal((await f.current()).status, "delivered");
    assert.equal((await f.current()).payment_status, "collected");
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM cylinders"))!.n),
      f.originalCylinders,
    );
    assert.equal(
      Number(
        (await one(f.db, "SELECT count(*) n FROM cylinder_inspections"))!.n,
      ),
      0,
    );
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT count(*) n FROM cash_collections WHERE order_id=$1",
          [f.o.id],
        ))!.n,
      ),
      1,
    );
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT count(*) n FROM verified_payments WHERE order_id=$1",
          [f.o.id],
        ))!.n,
      ),
      0,
    );
    const cash = (await f.call("inventory", "cash.collections")).find(
      (c: any) => c.reference === f.o.reference,
    );
    await f.call("inventory", "cash.reconcile", { id: cash.id });
    await f.call("inventory", "cash.reconcile", { id: cash.id });
    assert.equal((await f.current()).payment_status, "verified");
    const l = () =>
      one(f.db, "SELECT * FROM bulk_lpg_loads WHERE id=$1", [f.load.id]);
    await assert.rejects(() => f.end(), /reconcil/i);
    await f.run("driver", "bulk.return.declare", {
      loadId: f.load.id,
      version: Number((await l())!.version),
      returnGrams: 4000,
      reason: "Synthetic actual measured tanker remainder4000g",
    });
    await f.run("inventory", "bulk.return.receive", {
      loadId: f.load.id,
      version: Number((await l())!.version),
      returnGrams: 4000,
      reason: "Synthetic independent actual remaining LPG receipt",
    });
    await f.end();
    assert.equal(await f.trip(), undefined);
    const after = await one(
      f.db,
      "SELECT * FROM gas_stock WHERE branch_id='lagos'",
    );
    assert.equal(Number(after!.grams), Number(before!.grams) - 6000);
    assert.equal(Number(after!.reserved_grams), 0);
  }));

test("DRF-NEG: wrong roles, partial or excess mass, missing/stale proof, revoked COD and unverified prepaid cannot complete or consume gas", () =>
  use(async (f) => {
    const dispense = {
      loadId: f.load.id,
      version: 2,
      orderId: f.o.id,
      meterReadingGrams: 106000,
      reason: "Synthetic current metered doorstep dispensing evidence",
    };
    for (const meterReadingGrams of [100000, 105999, 106001])
      await assert.rejects(
        () =>
          f.run("driver", "bulk.dispense", { ...dispense, meterReadingGrams }),
        /delta/,
      );
    await f.db.exec(
      "UPDATE settings SET value='false' WHERE key='payment.cod' AND scope='lagos'",
    );
    await assert.rejects(
      () => f.run("driver", "bulk.dispense", dispense),
      /payment|exception/i,
    );
    await f.db.exec(
      "UPDATE settings SET value='true' WHERE key='payment.cod' AND scope='lagos'",
    );
    await assert.rejects(
      () => f.run("customer", "bulk.dispense", dispense),
      (e) => (e as any).status === 403,
    );
    await f.run("driver", "bulk.dispense", dispense);
    const attempt = (await f.current()).attempt;
    await f.db.query(
      "INSERT INTO delivery_photos(id,order_id,attempt_id,actor_id,data,sha256,alt,consent,retain_until,captured_at) VALUES($1,$2,$3,$4,$5,$6,'Synthetic expired negative fixture',true,now()-interval '1 second',now()-interval '2 days')",
      [
        id(),
        f.o.id,
        attempt.id,
        f.actors.driver.id,
        Buffer.from("Synthetic expired photo"),
        id(),
      ],
    );
    await assert.rejects(
      () => f.complete({ collectedKobo: Number(f.o.total_kobo) }),
      /photo/,
    );
    await f.db.query(
      "INSERT INTO delivery_photos(id,order_id,attempt_id,actor_id,data,sha256,alt,consent,retain_until) VALUES($1,$2,$3,$4,$5,$6,'Synthetic foreign proof denied',true,now()+interval '1 day')",
      [
        id(),
        f.o.id,
        attempt.id,
        f.actors.owner.id,
        Buffer.from("Synthetic foreign photo"),
        id(),
      ],
    );
    await assert.rejects(
      () => f.complete({ collectedKobo: Number(f.o.total_kobo) }),
      /photo/,
    );
    assert.equal((await f.current()).status, "out_for_delivery");
    await f.db.query(
      "UPDATE orders SET payment_method='card',payment_status='unpaid' WHERE id=$1",
      [f.o.id],
    );
    await assert.rejects(() => f.complete(), /Payment|payment/);
  }));

test("DRF-EXTRA: extra gas on an active customer visit reuses current destination evidence, assigns the same tanker driver and adds no delivery fee or cylinder record", () =>
  use(async (f) => {
    const parent = await f.current();
    const cart = {
      parentOrderId: f.o.id,
      version: Number(parent.tracking_version),
      items: [],
      gasLines: [{ capacityKg: 6, kg: 2 }],
    };
    const quote = await f.call("owner", "order.visit.quote", cart);
    const child = await f.call("owner", "order.visit.create", {
      ...cart,
      quoteHash: quote.quoteHash,
      requestKey: id(),
      reason: "Synthetic customer requests extra2kg during the same visit",
    });
    assert.equal(child.status, "placed");
    assert.equal((await paySyntheticPhoneOrder(f, child)).status, "assigned");
    const o = await f.snapshot(child.orderId);
    assert.equal(o.driver_id, parent.driver_id);
    assert.equal(Number(o.delivery_kobo), 0);
    assert.equal(o.gas_lines[0].cylinder_id, null);
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM cylinders"))!.n),
      f.originalCylinders,
    );
    const coverage = await one(
      f.db,
      "SELECT detail FROM audit_events WHERE action='delivery.coverage_confirmed' AND target=$1",
      [o.id],
    );
    assert.equal(coverage!.detail.sourceParentOrderId, f.o.id);
    await assert.rejects(() => f.end(), /reconcil|active/i);
  }));

export async function preloadedTanker(
  database?: import("../apps/web/lib/db").DB,
) {
  const f = await dispatchJourneyFixture(database);
  const trip = await f.start();
  await f.db.exec(
    "UPDATE gas_stock SET grams=10000,reserved_grams=0 WHERE branch_id='lagos'",
  );
  const load = await f.run("inventory", "bulk.load.issue", {
    tripId: trip.id,
    meterId: f.meter.id,
    grams: 10000,
    meterReadingGrams: 100000,
    orderIds: [],
    reason: "Synthetic tanker loaded before incoming customer calls",
  });
  await f.run("driver", "bulk.load.acknowledge", {
    loadId: load.id,
    version: 1,
    returnGrams: 10000,
    meterReadingGrams: 100000,
    reason: "Synthetic driver acknowledges actual preloaded tanker mass",
  });
  return { ...f, load };
}

test("DRF-TANK: an incoming order reserves acknowledged preloaded tanker gas once and cancellation restores its buffer without releasing physical custody", async () => {
  const env = { ...process.env };
  let f: any;
  try {
    f = await preloadedTanker();
    const o = await f.make(true, "cash_on_delivery");
    const allocation = await one(
      f.db,
      "SELECT * FROM bulk_lpg_allocations WHERE order_id=$1",
      [o.id],
    );
    assert.equal(allocation!.load_id, f.load.id);
    assert.equal(Number(allocation!.grams), 6000);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT buffer_grams FROM bulk_lpg_loads WHERE id=$1",
          [f.load.id],
        ))!.buffer_grams,
      ),
      4000,
    );
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT reserved_grams FROM gas_stock WHERE branch_id='lagos'",
        ))!.reserved_grams,
      ),
      10000,
    );
    await assert.rejects(() => f.make(true, "cash_on_delivery"), /stock/);
    await f.transition(o, "accepted", "dispatcher");
    await f.transition(o, "preparing", "dispatcher");
    await f.call("dispatcher", "delivery.coverage.confirm", {
      orderId: o.id,
      reason: "Synthetic current customer address confirmed",
    });
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT buffer_grams FROM bulk_lpg_loads WHERE id=$1",
          [f.load.id],
        ))!.buffer_grams,
      ),
      4000,
    );
    await f.transition(o, "cancelled", "owner");
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT buffer_grams FROM bulk_lpg_loads WHERE id=$1",
          [f.load.id],
        ))!.buffer_grams,
      ),
      10000,
    );
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT reserved_grams FROM gas_stock WHERE branch_id='lagos'",
        ))!.reserved_grams,
      ),
      10000,
    );
    const next = await f.make(true, "cash_on_delivery");
    assert.notEqual(next.id, o.id);
  } finally {
    await f?.db.close?.();
    process.env = env;
  }
});

test("DRF-TANK-DEPOT: assignment uses existing driver tanker buffer without double-counting capacity or reserving both depot and tanker gas", async () => {
  const env = { ...process.env };
  let f: any;
  try {
    f = await preloadedTanker();
    await f.db.exec(
      "UPDATE gas_stock SET grams=20000 WHERE branch_id='lagos'; UPDATE driver_vehicles SET capacity_grams=10000",
    );
    const o = await f.make(true, "cash_on_delivery");
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT reserved_grams FROM gas_stock WHERE branch_id='lagos'",
        ))!.reserved_grams,
      ),
      16000,
    );
    await f.transition(o, "accepted", "dispatcher");
    await f.transition(o, "preparing", "dispatcher");
    await f.call("dispatcher", "delivery.coverage.confirm", {
      orderId: o.id,
      reason: "Synthetic current actual customer address confirmation",
    });
    await f.assign(o);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT reserved_grams FROM gas_stock WHERE branch_id='lagos'",
        ))!.reserved_grams,
      ),
      10000,
    );
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT buffer_grams FROM bulk_lpg_loads WHERE id=$1",
          [f.load.id],
        ))!.buffer_grams,
      ),
      4000,
    );
    assert.equal((await f.snapshot(o.id)).status, "assigned");
  } finally {
    await f?.db.close?.();
    process.env = env;
  }
});
