import { paySyntheticPhoneOrder } from "./helpers/phone-prepayment";
import test from "node:test";
import assert from "node:assert/strict";
import { dispatchJourneyFixture } from "./helpers/dispatch-journey-fixture";
import { id } from "../apps/web/lib/auth";
import { one } from "../apps/web/lib/db";
async function setup() {
  const f = await dispatchJourneyFixture();
  const parent = await f.make(false, "cash_on_delivery");
  await f.prepare(parent);
  await f.start();
  await f.assign(parent);
  const trip = await f.trip();
  const evidence = {
    evidence: "Synthetic independently measured loaded stock",
    reason: "Synthetic visit custody fixture",
  };
  const manifest = await f.run("inventory", "manifest.issue", {
    tripId: trip!.id,
    productId: "hose",
    quantity: 3,
    unitWeightGrams: 500,
    serialIds: [],
    ...evidence,
  });
  await f.run("driver", "manifest.acknowledge", {
    manifestId: manifest.id,
    version: 1,
    quantity: 3,
    serialIds: [],
    ...evidence,
  });
  const load = await f.run("inventory", "bulk.load.issue", {
    tripId: trip!.id,
    meterId: f.meter.id,
    grams: 12000,
    meterReadingGrams: 100000,
    orderIds: [],
    reason: "Synthetic independently measured LPG buffer",
  });
  await f.run("driver", "bulk.load.acknowledge", {
    loadId: load.id,
    version: 1,
    returnGrams: 12000,
    meterReadingGrams: 100000,
    reason: "Synthetic driver independently receives measured buffer",
  });
  return { ...f, parent, manifest, load };
}
async function cart(f: any, gas = false) {
  const parent = await f.snapshot(f.parent.id);
  const input = {
    parentOrderId: parent.id,
    version: Number(parent.tracking_version),
    items: gas ? [] : [{ productId: "hose", quantity: 1 }],
    gasLines: gas ? [{ capacityKg: 6, kg: 6 }] : [],
  };
  const quote = await f.call("owner", "order.visit.quote", input);
  return {
    ...input,
    quoteHash: quote.quoteHash,
    requestKey: id(),
    reason: "Synthetic customer requests extra goods on this visit",
  };
}
async function use(
  fn: (f: Awaited<ReturnType<typeof setup>>) => Promise<void>,
) {
  const env = { ...process.env };
  let f: any;
  try {
    f = await setup();
    await fn(f);
  } finally {
    await f?.db.close?.();
    process.env = env;
  }
}

test("VISIT-CREATE: an active driver takes a separate fee-free order on the same visit, retaining original totals and idempotency", () =>
  use(async (f) => {
    const before = await f.snapshot(f.parent.id);
    const d = await cart(f);
    const result = await f.call("owner", "order.visit.create", d);
    assert.equal(result.status, "placed");
    assert.equal((await paySyntheticPhoneOrder(f, result)).status, "assigned");
    const child = await f.snapshot(result.orderId);
    assert.equal(child.delivery_kobo, 0);
    assert.equal(Number(child.total_kobo), 350000);
    assert.equal(child.driver_id, before.driver_id);
    assert.deepEqual(child.address, before.address);
    assert.equal(child.customer_id, before.customer_id);
    assert.equal(child.visit_link.parent_order_id, before.id);
    const original = await f.snapshot(before.id);
    assert.equal(original.total_kobo, before.total_kobo);
    assert.equal(original.delivery_kobo, before.delivery_kobo);
    assert.equal(original.extra_orders.length, 1);
    assert.equal(
      (await f.call("owner", "order.visit.create", d)).orderId,
      result.orderId,
    );
    assert.equal(
      (await f.db.query("SELECT * FROM order_visit_links")).rows.length,
      1,
    );
    await assert.rejects(
      () =>
        f.call("owner", "order.visit.create", {
          ...d,
          reason: "Synthetic changed duplicate request reason",
        }),
      /different details/,
    );
    await assert.rejects(() => f.end(), /reconcil|active deliveries/i);
  }));

test("VISIT-GAS: ready busy drivers can receive same-visit gas without a customer cylinder gate", () =>
  use(async (f) => {
    const created = await f.call(
      "owner",
      "order.visit.create",
      await cart(f, true),
    );
    assert.equal(created.status, "placed");
    assert.equal((await paySyntheticPhoneOrder(f, created)).status, "assigned");
    const child = await f.snapshot(created.orderId);
    assert.equal(child.gas_lines[0].cylinder_id, null);
    const candidates = await f.call("owner", "dispatch.candidates", {
      orderId: child.id,
    });
    assert.equal(candidates.orderReadiness.ready, true);
    assert(
      !candidates.preparationActions.some((a: any) =>
        a.id.startsWith("inspection:"),
      ),
    );
    const driver = candidates.candidates.find(
      (d: any) => d.id === f.actors.driver.id,
    );
    assert.deepEqual(
      driver.readiness.issues.map((i: any) => i.code),
      ["DRIVER_ALREADY_ASSIGNED"],
    );
    assert.equal(driver.activeOrders, 2);
  }));

test("VISIT-NEG: roles, revoked privileges, client scope/fee overrides, closed visits and stale price/visit are rejected", () =>
  use(async (f) => {
    const d = await cart(f);
    for (const role of ["customer", "driver", "inventory"])
      await assert.rejects(
        () => f.call(role, "order.visit.create", d),
        /permission|access|limited/i,
      );
    await assert.rejects(
      () => f.call("owner", "order.visit.create", { ...d, deliveryKobo: 0 }),
      /unrecognized/i,
    );
    await assert.rejects(
      () => f.call("owner", "order.visit.create", { ...d, customerId: id() }),
      /unrecognized/i,
    );
    await assert.rejects(
      () =>
        f.call("dispatcher", "order.visit.quote", {
          ...d,
          requestKey: undefined,
          quoteHash: undefined,
          reason: undefined,
          version: d.version - 1,
        }),
      /unrecognized|changed/i,
    );
    await f.db.query(
      "UPDATE inventory SET price_kobo=price_kobo+100 WHERE product_id='hose' AND branch_id='lagos'",
    );
    await assert.rejects(
      () => f.call("owner", "order.visit.create", d),
      /prices changed/,
    );
    assert.equal(
      (await f.db.query("SELECT * FROM order_visit_links")).rows.length,
      0,
    );
    await f.db.query("UPDATE orders SET status='delivered' WHERE id=$1", [
      f.parent.id,
    ]);
    await assert.rejects(() => cart(f), /active visit/);
  }));

test("VISIT-CAPACITY: one visit consumes one stop while gas/vehicle demand and normal delivery fees stay authoritative", () =>
  use(async (f) => {
    await f.db.query(
      "UPDATE settings SET value='1' WHERE key='delivery.capacity' AND scope='lagos'",
    );
    const created = await f.call("owner", "order.visit.create", await cart(f));
    assert.equal(created.status, "placed");
    assert.equal((await paySyntheticPhoneOrder(f, created)).status, "assigned");
    assert.equal((await f.snapshot(created.orderId)).delivery_kobo, 0);
    await assert.rejects(
      () => f.make(false, "cash_on_delivery"),
      /fully booked/,
    );
    const child = await f.snapshot(created.orderId);
    await f.db.query(
      "UPDATE driver_trips SET ended_at=now() WHERE driver_id=$1",
      [f.actors.driver.id],
    );
    const readiness = await f.call("owner", "dispatch.candidates", {
      orderId: child.id,
    });
    assert.equal(readiness.orderReadiness.ready, false);
  }));

test("VISIT-JOURNEY: an extra order placed at the customer shares the active trip, has independent proof/payment and reconciles both deliveries before trip end", () =>
  use(async (f) => {
    const parent = f.parent;
    const trip = await f.trip();
    await f.ack(parent);
    const evidence = {
      evidence: "Synthetic independently measured vehicle product evidence",
      reason: "Synthetic extra visit custody acceptance",
    };
    const manifest = f.manifest;
    await f.arrive(parent);
    const created = await f.call(
      "dispatcher",
      "order.visit.create",
      await cart(f),
    );
    assert.equal(created.status, "placed");
    assert.equal((await paySyntheticPhoneOrder(f, created)).status, "assigned");
    const child = await f.snapshot(created.orderId);
    await f.call("inventory", "invoice.issue", { orderId: child.id });
    const active = await f.call("driver", "orders", { active: "1" });
    assert(
      active.some((o: any) => o.id === parent.id) &&
        active.some((o: any) => o.id === child.id),
    );
    await f.ack(child);
    await f.arrive(child);
    await assert.rejects(() => f.end(), /active deliveries|reconcile/);
    for (const order of [parent, child]) {
      await f.proof(order, "Synthetic unique proof for " + order.id);
      const current = await f.snapshot(order.id);
      const own = (await f.call("customer", "orders", { id: order.id }))[0];
      await f.run("owner", "delivery.complete", {
        orderId: order.id,
        version: Number(current.tracking_version),
        code: own.confirmation_code,
        collectedKobo:
          current.payment_method === "cash_on_delivery"
            ? Number(current.total_kobo)
            : 0,
        handover: true,
      });
      const cash = (await f.call("inventory", "cash.collections")).find(
        (c: any) => c.reference === current.reference,
      );
      if (current.payment_method === "cash_on_delivery") {
        assert(cash);
        await f.call("owner", "cash.reconcile", {id:cash.id});
        await f.call("inventory", "cash.reconcile", { id: cash.id });
      }
      assert.equal((await f.snapshot(order.id)).payment_status, "verified");
      assert.equal(
        (await f.call("customer", "invoice.order", { orderId: order.id }))
          .invoice.amountDueKobo,
        0,
      );
    }
    await assert.rejects(() => f.end(), /manifests|reconcile/);
    await f.run("driver", "manifest.return.declare", {
      manifestId: manifest.id,
      version: Number(
        (await one(
          f.db,
          "SELECT version FROM vehicle_product_loads WHERE id=$1",
          [manifest.id],
        ))!.version,
      ),
      quantity: 2,
      serialIds: [],
      ...evidence,
    });
    await assert.rejects(() => f.end(), /manifests|reconcile/);
    await f.run("inventory", "manifest.return.receive", {
      manifestId: manifest.id,
      version: Number(
        (await one(
          f.db,
          "SELECT version FROM vehicle_product_loads WHERE id=$1",
          [manifest.id],
        ))!.version,
      ),
      foundQuantity: 2,
      saleableQuantity: 2,
      foundSerialIds: [],
      saleableSerialIds: [],
      ...evidence,
    });
    const loadVersion = async () =>
      Number(
        (await one(f.db, "SELECT version FROM bulk_lpg_loads WHERE id=$1", [
          f.load.id,
        ]))!.version,
      );
    await f.run("driver", "bulk.return.declare", {
      loadId: f.load.id,
      version: await loadVersion(),
      returnGrams: 12000,
      reason: "Synthetic full measured unused buffer return",
    });
    await f.run("inventory", "bulk.return.receive", {
      loadId: f.load.id,
      version: await loadVersion(),
      returnGrams: 12000,
      reason: "Synthetic independent measured buffer receipt",
    });
    await f.end();
    assert.equal(await f.trip(), undefined);
    const original = await f.snapshot(parent.id),
      extra = await f.snapshot(child.id);
    assert(Number(original.delivery_kobo) > 0);
    assert.equal(Number(extra.delivery_kobo), 0);
    const stock = await one(
      f.db,
      "SELECT quantity,reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
    );
    assert.equal(Number(stock!.quantity), 48);
    assert.equal(Number(stock!.reserved), 0);
    assert.equal(
      (
        await f.db.query(
          "SELECT * FROM verified_payments WHERE order_id IN ($1,$2)",
          [parent.id, child.id],
        )
      ).rows.length,
      2,
    );
  }));

test("VISIT-STOCK: missing or unacknowledged custody, stale load quotes and insufficient mass cannot promise an extra order", () =>
  use(async (f) => {
    const parent = await f.snapshot(f.parent.id);
    const input = {
      parentOrderId: parent.id,
      version: Number(parent.tracking_version),
      items: [{ productId: "hose", quantity: 4 }],
      gasLines: [],
    };
    await assert.rejects(
      () => f.call("owner", "order.visit.quote", input),
      /enough acknowledged vehicle stock/,
    );
    await assert.rejects(
      () =>
        f.call("owner", "order.visit.quote", {
          ...input,
          items: [],
          gasLines: [{ capacityKg: 12.5, kg: 13 }],
        }),
      /capacity|quantity|maximum|capacity/i,
    );
    const quote = await cart(f);
    await f.db.query(
      "UPDATE vehicle_product_loads SET version=version+1 WHERE id=$1",
      [f.manifest.id],
    );
    await assert.rejects(
      () => f.call("owner", "order.visit.create", quote),
      /prices changed/,
    );
    await f.db.query(
      "UPDATE vehicle_product_loads SET state='returning' WHERE id=$1",
      [f.manifest.id],
    );
    await assert.rejects(() => cart(f), /acknowledged vehicle stock/);
    assert.equal(
      (await f.db.query("SELECT * FROM order_visit_links")).rows.length,
      0,
    );
  }));

test("VISIT-CANCEL: cancellation returns an unpicked extra reservation to vehicle custody exactly once; protected parent, immutable links and role revocations remain", () =>
  use(async (f) => {
    const before = await one(
      f.db,
      "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
    );
    const result = await f.call("owner", "order.visit.create", await cart(f));
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
        ))!.reserved,
      ),
      Number(before!.reserved),
    );
    await assert.rejects(
      () =>
        f.run("owner", "dispatch.reassign", {
          orderId: f.parent.id,
          driverId: f.actors.driver.id,
          version: 0,
          reason: "Synthetic cannot abandon a linked extra order",
        }),
      /linked extra/,
    );
    await assert.rejects(
      () =>
        f.db.query(
          "UPDATE order_visit_links SET reason='tampered reason' WHERE order_id=$1",
          [result.orderId],
        ),
      /immutable/,
    );
    await f.run("owner", "order.transition", {
      id: result.orderId,
      status: "cancelled",
      note: "Synthetic customer cancels extra before pickup",
    });
    const manifest = await one(
      f.db,
      "SELECT available,reserved FROM vehicle_product_loads WHERE id=$1",
      [f.manifest.id],
    );
    assert.equal(Number(manifest!.available), 3);
    assert.equal(Number(manifest!.reserved), 0);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
        ))!.reserved,
      ),
      Number(before!.reserved),
    );
    await f.db.query(
      "INSERT INTO staff_privilege_overrides(user_id,privilege,effect,changed_by,role_at_change,branch_at_change) VALUES($1,'orders.manage','deny',$2,'manager','lagos')",
      [f.actors.dispatcher.id, f.actors.owner.id],
    );
    const parent = await f.snapshot(f.parent.id);
    await assert.rejects(
      () =>
        f.call("dispatcher", "order.visit.context", {
          parentOrderId: parent.id,
          version: Number(parent.tracking_version),
        }),
      /revoked/,
    );
  }));

test("VISIT-LPG: an extra gas order uses acknowledged buffer once, still requires its own acknowledgement, metering and proof without cylinder registration", () =>
  use(async (f) => {
    const before = await one(
      f.db,
      "SELECT grams,reserved_grams FROM gas_stock WHERE branch_id='lagos'",
    );
    const created = await f.call(
      "owner",
      "order.visit.create",
      await cart(f, true),
    );
    await paySyntheticPhoneOrder(f, created);
    const child = await f.snapshot(created.orderId);
    const line = child.gas_lines[0];
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT reserved_grams FROM gas_stock WHERE branch_id='lagos'",
        ))!.reserved_grams,
      ),
      Number(before!.reserved_grams),
    );
    assert.equal(line.cylinder_id, null);
    assert.equal(child.status, "assigned");
    await f.ack(child);
    await f.arrive(child);
    await f.proof(child);
    const load = await one(f.db, "SELECT * FROM bulk_lpg_loads WHERE id=$1", [
      f.load.id,
    ]);
    assert.equal(Number(load!.buffer_grams), 6000);
    await f.call("inventory", "invoice.issue", { orderId: child.id });
    const dispense = {
      loadId: f.load.id,
      version: Number(load!.version),
      orderId: child.id,
      meterReadingGrams: 106000,
      reason: "Synthetic independently metered6000g extra handover",
    };
    // Every extra phone order was prepaid through the synthetic provider above.
    await f.run("driver", "bulk.dispense", dispense);
    const current = await f.snapshot(child.id),
      own = (await f.call("customer", "orders", { id: child.id }))[0];
    await f.run("owner", "delivery.complete", {
      orderId: child.id,
      version: Number(current.tracking_version),
      code: own.confirmation_code,
      collectedKobo:
        current.payment_method === "cash_on_delivery"
          ? Number(current.total_kobo)
          : 0,
      handover: true,
    });
    const after = await one(
      f.db,
      "SELECT grams,reserved_grams FROM gas_stock WHERE branch_id='lagos'",
    );
    assert.equal(Number(after!.grams), Number(before!.grams) - 6000);
    assert.equal(Number(after!.reserved_grams), 6000);
    assert.equal(
      (await one(
        f.db,
        "SELECT state FROM bulk_lpg_allocations WHERE order_id=$1",
        [child.id],
      ))!.state,
      "fulfilled",
    );
  }));

test("VISIT-SERIAL: extra empty cylinders retain exact acknowledged vehicle serials through allocation and customer handover", () =>
  use(async (f) => {
    const cylinder = id(),
      due = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
    await f.db.query(
      "UPDATE inventory SET quantity=5,price_kobo=250000,published=true WHERE branch_id='lagos' AND product_id='cylinder-empty-6'",
    );
    await f.db.query(
      "INSERT INTO cylinders(id,branch_id,serial,size_kg,ownership,status,test_due) VALUES($1,'lagos',$2,6,'company','empty',$3)",
      [cylinder, "SYNTHETIC-VISIT-SERIAL-" + id(), due],
    );
    const trip = await f.trip(),
      common = {
        evidence: "Synthetic qualified cylinder custody evidence",
        reason: "Synthetic exact serial vehicle loading",
      };
    const manifest = await f.run("inventory", "manifest.issue", {
      tripId: trip!.id,
      productId: "cylinder-empty-6",
      quantity: 1,
      unitWeightGrams: 5000,
      serialIds: [cylinder],
      ...common,
    });
    await f.run("driver", "manifest.acknowledge", {
      manifestId: manifest.id,
      version: 1,
      quantity: 1,
      serialIds: [cylinder],
      ...common,
    });
    const parent = await f.snapshot(f.parent.id),
      input = {
        parentOrderId: parent.id,
        version: Number(parent.tracking_version),
        items: [{ productId: "cylinder-empty-6", quantity: 1 }],
        gasLines: [],
      };
    const quote = await f.call("owner", "order.visit.quote", input);
    const created = await f.call("owner", "order.visit.create", {
      ...input,
      quoteHash: quote.quoteHash,
      requestKey: id(),
      reason: "Synthetic same-customer request for an extra empty cylinder",
    });
    assert.equal(created.status, "placed");
    assert.equal((await paySyntheticPhoneOrder(f, created)).status, "assigned");
    const child = await f.snapshot(created.orderId);
    assert.deepEqual(child.manifest.serials, [
      "SYNTHETIC-VISIT-SERIAL-" +
        (await one(f.db, "SELECT serial FROM cylinders WHERE id=$1", [
          cylinder,
        ]))!.serial.split("SYNTHETIC-VISIT-SERIAL-")[1],
    ]);
    await f.ack(child);
    await f.arrive(child);
    await f.proof(child);
    const current = await f.snapshot(child.id),
      own = (await f.call("customer", "orders", { id: child.id }))[0];
    await f.run("owner", "delivery.complete", {
      orderId: child.id,
      version: Number(current.tracking_version),
      code: own.confirmation_code,
      collectedKobo:
        current.payment_method === "cash_on_delivery"
          ? Number(current.total_kobo)
          : 0,
      handover: true,
    });
    const issued = await one(
      f.db,
      "SELECT ownership,customer_id FROM cylinders WHERE id=$1",
      [cylinder],
    );
    assert.equal(issued!.ownership, "customer");
    assert.equal(issued!.customer_id, child.customer_id);
    assert.equal(
      (await one(
        f.db,
        "SELECT state FROM vehicle_product_serials WHERE load_id=$1 AND cylinder_id=$2",
        [manifest.id, cylinder],
      ))!.state,
      "handed",
    );
  }));
