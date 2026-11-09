import test from "node:test";
import assert from "node:assert/strict";
import { bulkFixture as setup } from "./helpers/bulk-lpg-fixture";
import { id, actor } from "../apps/web/lib/auth";
import { gasReservation } from "../apps/web/lib/gas-delivery";

test("BULK-05: independent cash reconciliation cannot duplicate existing verified order principal", async () => {
  const before = process.env.EASYGAS_BULK_LPG_ENABLED,
    f = await setup();
  try {
    const collection = id();
    await f.db.query(
      "INSERT INTO cash_collections(id,order_id,collector_id,amount_kobo) SELECT $1,id,$2,total_kobo FROM orders WHERE id=$3",
      [collection, f.actors.driver.id, f.order.id],
    );
    await f.db.query(
      "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) SELECT $1,id,$1,total_kobo,'cash',$2 FROM orders WHERE id=$3",
      [id(), f.actors.owner.id, f.order.id],
    );
    await assert.rejects(
      () => f.call("owner", "cash.reconcile", { id: collection }),
      /already has verified principal/,
    );
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM verified_payments WHERE order_id=$1",
            [f.order.id],
          )
        ).rows[0].n,
      ),
      1,
    );
    assert.equal(
      (
        await f.db.query(
          "SELECT verified_at FROM cash_collections WHERE id=$1",
          [collection],
        )
      ).rows[0].verified_at,
      null,
    );
  } finally {
    if (before === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = before;
    await f.db.close?.();
  }
});

test("BULK-04: last-unit reservations, capacity, expired qualification and disabled-feature negatives preserve physical custody", async () => {
  const before = process.env.EASYGAS_BULK_LPG_ENABLED,
    f = await setup();
  try {
    const previousNode = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      process.env.EASYGAS_BULK_LPG_ENABLED = "false";
      const user = await actor(f.db, f.actors.owner.token);
      await assert.rejects(
        () =>
          f.db.transaction((tx) =>
            gasReservation(tx, user, f.order.id, "fulfilled"),
          ),
        /vehicle custody/,
      );
    } finally {
      if (previousNode === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNode;
      process.env.EASYGAS_BULK_LPG_ENABLED = "true";
    }
    await assert.rejects(
      () =>
        f.call("owner", "technician.qualify", {
          userId: f.actors.driver.id,
          code: "gas_installation",
          evidence: "Synthetic invalid role qualification",
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      /active inspection employee/,
    );
    await assert.rejects(() => f.issue({ grams: 20001 }), /capacity/);
    await assert.rejects(() => f.issue({ grams: 5000 }), /less than/);
    await f.db.query("UPDATE gas_stock SET grams=6000 WHERE branch_id='lagos'");
    await assert.rejects(() => f.issue(), /Insufficient/);
    const load = await f.issue({ grams: 6000 });
    assert.equal(Number((await f.balance()).reserved_grams), 6000);
    await f.db.query(
      "UPDATE technician_qualifications SET expires_at=now()-interval '1 day' WHERE user_id=$1",
      [f.actors.driver.id],
    );
    await assert.rejects(
      () =>
        f.call("driver", "bulk.load.acknowledge", {
          loadId: load.id,
          version: 1,
          returnGrams: 6000,
          meterReadingGrams: 100000,
          reason: "Synthetic expired qualification",
          operationKey: id(),
        }),
      /qualification/,
    );
    process.env.EASYGAS_BULK_LPG_ENABLED = "false";
    await assert.rejects(
      () =>
        f.call("driver", "bulk.return.declare", {
          loadId: load.id,
          version: 1,
          returnGrams: 6000,
          reason: "Synthetic disabled mutation",
          operationKey: id(),
        }),
      /release approval/,
    );
    const user = await actor(f.db, f.actors.owner.token);
    await assert.rejects(
      () =>
        f.db.transaction((tx) =>
          gasReservation(tx, user, f.order.id, "fulfilled"),
        ),
      /metered dispensing/,
    );
    await f.db.transaction((tx) =>
      gasReservation(tx, user, f.order.id, "released"),
    );
    assert.equal(Number((await f.balance()).grams), 6000);
    assert.equal(Number((await f.balance()).reserved_grams), 6000);
    assert.equal(
      (await f.call("driver", "bulk.summary")).loads[0].state,
      "issued",
    );
  } finally {
    if (before === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = before;
    await f.db.close?.();
  }
});

test("BULK-01: loading reserves only buffer; independent acknowledgement, return and replay preserve canonical mass", async () => {
  const before = process.env.EASYGAS_BULK_LPG_ENABLED;
  const f = await setup();
  try {
    const key = id(),
      load = await f.issue({ operationKey: key });
    assert.equal(Number((await f.balance()).reserved_grams), 10000);
    await f.issue({ operationKey: key });
    assert.equal(Number((await f.balance()).reserved_grams), 10000);
    await assert.rejects(
      () =>
        f.call("driver", "bulk.load.acknowledge", {
          loadId: load.id,
          version: 1,
          returnGrams: 9999,
          meterReadingGrams: 100000,
          reason: "Synthetic wrong measured load",
          operationKey: id(),
        }),
      /measured/,
    );
    await f.call("driver", "bulk.load.acknowledge", {
      loadId: load.id,
      version: 1,
      returnGrams: 10000,
      meterReadingGrams: 100000,
      reason: "Synthetic measured load accepted",
      operationKey: id(),
    });
    await assert.rejects(
      () =>
        f.call("driver", "trip.end", {
          tripId: f.trip.id,
          endOdometer: 11,
          operationKey: id(),
        }),
      /bulk LPG/,
    );
    await f.call("driver", "bulk.return.declare", {
      loadId: load.id,
      version: 2,
      returnGrams: 10000,
      reason: "Synthetic unused load returned",
      operationKey: id(),
    });
    await f.call("inventory", "bulk.return.receive", {
      loadId: load.id,
      version: 3,
      returnGrams: 10000,
      reason: "Synthetic independent receipt",
      operationKey: id(),
    });
    assert.equal(Number((await f.balance()).grams), 20000);
    assert.equal(Number((await f.balance()).reserved_grams), 6000);
    await f.call("driver", "trip.end", {
      tripId: f.trip.id,
      endOdometer: 11,
      operationKey: id(),
    });
    await assert.rejects(
      () => f.call("customer", "bulk.summary"),
      /permission/,
    );
  } finally {
    if (before === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = before;
    await f.db.close?.();
  }
});
test("BULK-02: cancelling loaded gas retains vehicle reservation and discrepancy holds closure without inventing adjustments", async () => {
  const before = process.env.EASYGAS_BULK_LPG_ENABLED;
  const f = await setup();
  try {
    const load = await f.issue();
    const user = await actor(f.db, f.actors.owner.token);
    await f.db.transaction((tx) =>
      gasReservation(tx, user, f.order.id, "released"),
    );
    assert.equal(Number((await f.balance()).reserved_grams), 10000);
    await f.call("driver", "bulk.return.declare", {
      loadId: load.id,
      version: 2,
      returnGrams: 9000,
      reason: "Synthetic measured discrepancy",
      operationKey: id(),
    });
    const held = await f.call("inventory", "bulk.return.receive", {
      loadId: load.id,
      version: 3,
      returnGrams: 9000,
      reason: "Synthetic independently measured discrepancy",
      operationKey: id(),
    });
    assert.equal(held.state, "held");
    assert.equal(Number((await f.balance()).grams), 20000);
    assert.equal(Number((await f.balance()).reserved_grams), 10000);
    await assert.rejects(
      () =>
        f.call("driver", "trip.end", {
          tripId: f.trip.id,
          endOdometer: 11,
          operationKey: id(),
        }),
      /bulk LPG/,
    );
    assert.equal(
      (
        await f.db.query(
          "SELECT count(*) n FROM bulk_lpg_events WHERE kind='return.discrepancy'",
        )
      ).rows[0].n,
      1,
    );
  } finally {
    if (before === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = before;
    await f.db.close?.();
  }
});

test("BULK-03: metered dispensing enforces arrival, invoice payment, safety and exact quantity; fulfilment debits canonical gas once", async () => {
  const before = process.env.EASYGAS_BULK_LPG_ENABLED,
    f = await setup();
  try {
    const load = await f.issue();
    await f.call("driver", "bulk.load.acknowledge", {
      loadId: load.id,
      version: 1,
      returnGrams: 10000,
      meterReadingGrams: 100000,
      reason: "Synthetic measured load accepted",
      operationKey: id(),
    });
    const user = await actor(f.db, f.actors.owner.token);
    await assert.rejects(
      () =>
        f.db.transaction((tx) =>
          gasReservation(tx, user, f.order.id, "fulfilled"),
        ),
      /metered dispensing/,
    );
    await f.db.query(
      "UPDATE orders SET status='out_for_delivery' WHERE id=$1",
      [f.order.id],
    );
    const dispense = (extra: any = {}) =>
      f.call("driver", "bulk.dispense", {
        loadId: load.id,
        version: 2,
        orderId: f.order.id,
        meterReadingGrams: 106000,
        reason: "Synthetic cumulative mass reading",
        operationKey: id(),
        ...extra,
      });
    await assert.rejects(() => dispense(), /arrival/);
    await f.db.query(
      "INSERT INTO delivery_attempts(id,order_id,driver_id,assignment_version,state) VALUES($1,$2,$3,1,'arrived')",
      [id(), f.order.id, f.actors.driver.id],
    );
    await assert.rejects(() => dispense(), /invoice/);
    await f.db.query(
      "INSERT INTO customer_invoices(id,order_id,customer_id,branch_id,total_kobo,snapshot,issued_by) SELECT $1,id,customer_id,branch_id,total_kobo,'{}'::jsonb,$2 FROM orders WHERE id=$3",
      [id(), f.actors.owner.id, f.order.id],
    );
    await assert.rejects(() => dispense(), /balance/);
    const total = Number(
      (
        await f.db.query("SELECT total_kobo FROM orders WHERE id=$1", [
          f.order.id,
        ])
      ).rows[0].total_kobo,
    );
    await f.call("driver", "bulk.collection.record", {
      loadId: load.id,
      version: 2,
      orderId: f.order.id,
      amountKobo: total,
      reason: "Synthetic cash physically collected",
      operationKey: id(),
    });
    await assert.rejects(() => dispense(), /balance/);
    const collection = (await f.call("owner", "cash.collections"))[0];
    await assert.rejects(
      () => f.call("driver", "cash.reconcile", { id: collection.id }),
      /permission/,
    );
    await f.call("owner", "cash.reconcile", { id: collection.id });
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM verified_payments WHERE order_id=$1",
            [f.order.id],
          )
        ).rows[0].n,
      ),
      1,
    );
    await f.db.query(
      "UPDATE settings SET value=jsonb_set(value,'{requiresAddressConfirmation}','false') WHERE key LIKE 'location.%'",
    );
    await assert.rejects(
      () => dispense({ meterReadingGrams: 106001 }),
      /Meter delta/,
    );
    await f.db.query(
      "UPDATE bulk_lpg_meters SET calibration_expires_at=now()-interval '1 day' WHERE id=$1",
      [f.meter.id],
    );
    await assert.rejects(() => dispense(), /calibration/);
    await f.db.query(
      "UPDATE bulk_lpg_meters SET calibration_expires_at=now()+interval '1 day' WHERE id=$1",
      [f.meter.id],
    );
    const key = id();
    await dispense({ operationKey: key });
    await dispense({ operationKey: key });
    assert.equal(Number((await f.balance()).grams), 20000);
    await assert.rejects(
      () =>
        f.db.transaction((tx) =>
          gasReservation(tx, user, f.order.id, "released"),
        ),
      /cannot be returned/,
    );
    await f.db.transaction((tx) =>
      gasReservation(tx, user, f.order.id, "fulfilled"),
    );
    await f.db.transaction((tx) =>
      gasReservation(tx, user, f.order.id, "fulfilled"),
    );
    assert.equal(Number((await f.balance()).grams), 14000);
    assert.equal(Number((await f.balance()).reserved_grams), 4000);
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM gas_stock_movements WHERE reference=$1",
            [f.order.id + ":fulfilled"],
          )
        ).rows[0].n,
      ),
      1,
    );
    await f.call("driver", "bulk.return.declare", {
      loadId: load.id,
      version: 3,
      returnGrams: 4000,
      reason: "Synthetic residual mass returned",
      operationKey: id(),
    });
    await f.call("inventory", "bulk.return.receive", {
      loadId: load.id,
      version: 4,
      returnGrams: 4000,
      reason: "Synthetic independent mass receipt",
      operationKey: id(),
    });
    assert.equal(Number((await f.balance()).reserved_grams), 0);
    assert.equal(Number((await f.balance()).grams), 14000);
  } finally {
    if (before === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = before;
    await f.db.close?.();
  }
});
