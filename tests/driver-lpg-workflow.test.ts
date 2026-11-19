import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerHooks } from "node:module";
import { bulkFixture } from "./helpers/bulk-lpg-fixture";
import { id, actor } from "../apps/web/lib/auth";
import { attachDeliveryPhoto } from "../apps/web/lib/delivery-photos";
import { verifyVehicleLPGPickup } from "../apps/web/lib/bulk-lpg-reservation";
registerHooks({
  load(url, context, next) {
    if (url.endsWith(".css"))
      return {
        format: "module",
        shortCircuit: true,
        source: "export default {}",
      };
    return next(url, context);
  },
});
const { default: DriverLPGControls, lpgReadiness } = await import(
  "../apps/web/components/driver-lpg-controls"
);

async function setup() {
  const f = await bulkFixture();
  await f.db.exec(
    "UPDATE settings SET value=jsonb_set(value,'{requiresAddressConfirmation}','false') WHERE key LIKE 'location.%'",
  );
  await f.call("driver", "driver.restrict");
  return f;
}
async function arrive(f: Awaited<ReturnType<typeof setup>>) {
  // Explicit historical fixture: reproduce the deployed pre-fix picked-up attempt without fabricating new successful pickup through the new guard.
  await f.db.query("UPDATE orders SET status='out_for_delivery' WHERE id=$1", [
    f.order.id,
  ]);
  const aid = id();
  await f.db.query(
    "INSERT INTO delivery_attempts(id,order_id,driver_id,assignment_version,state,picked_up_at,arrived_at) VALUES($1,$2,$3,1,'arrived',now()-interval '5 minutes',now())",
    [aid, f.order.id, f.actors.driver.id],
  );
  return aid;
}
async function fund(f: Awaited<ReturnType<typeof setup>>) {
  await f.call("owner", "invoice.issue", { orderId: f.order.id });
  const load = (await f.call("driver", "bulk.summary")).loads[0];
  const order = await f.snapshot(f.order.id);
  await f.call("driver", "bulk.collection.record", {
    loadId: load.id,
    version: Number(load.version),
    orderId: order.id,
    amountKobo: Number(order.total_kobo),
    reason: "Synthetic physically collected test cash",
    operationKey: id(),
  });
  const collection = (await f.call("owner", "cash.collections")).find(
    (c: any) => c.reference === order.reference,
  );
  await f.call("owner", "cash.reconcile", { id: collection.id });
}

function recoverInput(
  f: Awaited<ReturnType<typeof setup>>,
  attemptId: string,
  extra: any = {},
) {
  return {
    tripId: f.trip.id,
    meterId: f.meter.id,
    grams: 10000,
    meterReadingGrams: 100000,
    orderIds: [f.order.id],
    reason: "Synthetic current vehicle mass measured before any dispensing",
    recovery: {
      orderId: f.order.id,
      version: 1,
      attemptId,
      observedAt: new Date().toISOString(),
      notDispensed: true,
    },
    operationKey: id(),
    ...extra,
  };
}
test("DLPG-01: restricted driver completes measured LPG acknowledgement, arrival, dispensing, proof, handover and return with one canonical debit", async () => {
  const old = process.env.EASYGAS_BULK_LPG_ENABLED,
    f = await setup();
  try {
    const current = await f.snapshot(f.order.id);
    await assert.rejects(
      () => f.db.transaction((tx) => verifyVehicleLPGPickup(tx, current)),
      /measured vehicle LPG load/,
    );
    const load = await f.issue();
    await assert.rejects(
      () => f.db.transaction((tx) => verifyVehicleLPGPickup(tx, current)),
      /acknowledge/,
    );
    const ack = {
      loadId: load.id,
      version: 1,
      returnGrams: 10000,
      meterReadingGrams: 100000,
      reason: "Synthetic independently observed load and meter",
      operationKey: id(),
    };
    await f.call("driver", "bulk.load.acknowledge", ack);
    await f.call("driver", "bulk.load.acknowledge", ack);
    await f.db.transaction((tx) => verifyVehicleLPGPickup(tx, current));
    await arrive(f);
    await fund(f);
    const dispense = {
      loadId: load.id,
      version: 2,
      orderId: f.order.id,
      meterReadingGrams: 106000,
      reason: "Synthetic verified actual full allocation dispensed",
      operationKey: id(),
    };
    await f.call("driver", "bulk.dispense", dispense);
    await f.call("driver", "bulk.dispense", dispense);
    const driver = await actor(f.db, f.actors.driver.token);
    await f.db.transaction((tx) =>
      attachDeliveryPhoto(
        tx,
        driver,
        f.order.id,
        Buffer.from("Synthetic consented proof"),
        "Synthetic proof",
        true,
      ),
    );
    const owned = (await f.call("customer", "orders", { id: f.order.id }))[0];
    const complete = {
      orderId: f.order.id,
      version: Number((await f.snapshot(f.order.id)).tracking_version),
      code: owned.confirmation_code,
      handover: true,
      operationKey: id(),
    };
    await f.call("driver", "driver.complete", complete);
    await f.call("driver", "driver.complete", complete);
    assert.equal((await f.snapshot(f.order.id)).status, "delivered");
    assert.equal(Number((await f.balance()).grams), 14000);
    assert.equal(Number((await f.balance()).reserved_grams), 4000);
    assert.equal(
      (
        await f.db.query(
          "SELECT id FROM gas_stock_movements WHERE reference=$1",
          [f.order.id + ":fulfilled"],
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await f.db.query(
          "SELECT state FROM bulk_lpg_allocations WHERE order_id=$1",
          [f.order.id],
        )
      ).rows[0].state,
      "fulfilled",
    );
    await f.call("driver", "bulk.return.declare", {
      loadId: load.id,
      version: 3,
      returnGrams: 4000,
      reason: "Synthetic measured depot remainder",
      operationKey: id(),
    });
    await f.call("inventory", "bulk.return.receive", {
      loadId: load.id,
      version: 4,
      returnGrams: 4000,
      reason: "Synthetic independent depot receipt",
      operationKey: id(),
    });
    assert.equal(Number((await f.balance()).reserved_grams), 0);
    await f.call("driver","trip.end",{tripId:f.trip.id,endOdometer:11,operationKey:id()});
    assert.equal((await f.call("driver","driver.location")).trip,null);

  } finally {
    if (old === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = old;
    await f.db.close?.();
  }
});
test("DLPG-02: arrived missing-custody recovery is fresh, scoped, versioned, independently qualified and replay-safe without status rewind or dispensing", async () => {
  const old = process.env.EASYGAS_BULK_LPG_ENABLED,
    f = await setup();
  try {
    const aid = await arrive(f),
      request = recoverInput(f, aid);
    await assert.rejects(
      () => f.call("driver", "bulk.load.recover", request),
      /permission|limited/,
    );
    await assert.rejects(
      () => f.call("customer", "bulk.load.recover", request),
      /permission/,
    );
    await assert.rejects(
      () => f.call("inventory", "bulk.load.issue", request),
      /explicit/,
    );
    await assert.rejects(
      () =>
        f.call("inventory", "bulk.load.recover", {
          ...request,
          recovery: { ...request.recovery, notDispensed: false },
        }),
      /true|Invalid/,
    );
    await assert.rejects(
      () =>
        f.call("inventory", "bulk.load.recover", {
          ...request,
          recovery: { ...request.recovery, version: 99 },
        }),
      /attempt changed/,
    );
    await assert.rejects(
      () =>
        f.call("inventory", "bulk.load.recover", {
          ...request,
          recovery: { ...request.recovery, attemptId: id() },
        }),
      /attempt changed/,
    );
    await assert.rejects(
      () =>
        f.call("inventory", "bulk.load.recover", {
          ...request,
          recovery: {
            ...request.recovery,
            observedAt: new Date(Date.now() - 3600000).toISOString(),
          },
        }),
      /fresh observed/,
    );
    await assert.rejects(
      () =>
        f.call("inventory", "bulk.load.recover", {
          ...request,
          orderIds: [f.order.id, id()],
        }),
      /one current order/,
    );
    await f.db.query(
      "UPDATE technician_qualifications SET expires_at=now()-interval '1 second' WHERE user_id=$1 AND code='bulk_lpg_loading'",
      [f.actors.inventory.id],
    );
    await assert.rejects(
      () => f.call("inventory", "bulk.load.recover", request),
      /qualification/,
    );
    assert.equal(
      (await f.db.query("SELECT id FROM bulk_lpg_loads")).rows.length,
      0,
    );
    await f.db.query(
      "UPDATE technician_qualifications SET expires_at=now()+interval '1 day' WHERE user_id=$1 AND code='bulk_lpg_loading'",
      [f.actors.inventory.id],
    );
    const load = await f.call("inventory", "bulk.load.recover", request);
    assert.equal(
      (await f.call("inventory", "bulk.load.recover", request)).id,
      load.id,
    );
    const order = await f.snapshot(f.order.id);
    assert.equal(order.status, "out_for_delivery");
    assert.equal(order.attempt.state, "arrived");
    assert.equal(Number(order.tracking_version), 1);
    assert.equal(
      (await f.db.query("SELECT id FROM bulk_lpg_loads")).rows.length,
      1,
    );
    assert.equal(
      (
        await f.db.query(
          "SELECT state,dispensed_grams FROM bulk_lpg_allocations WHERE order_id=$1",
          [f.order.id],
        )
      ).rows[0].state,
      "allocated",
    );
    assert.equal(
      (
        await f.db.query(
          "SELECT id FROM audit_events WHERE action='bulk.missing_custody.recovered' AND target=$1",
          [f.order.id],
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await f.db.query(
          "SELECT id FROM bulk_lpg_events WHERE kind='load.recovered'",
        )
      ).rows.length,
      1,
    );
    await f.call("driver", "bulk.load.acknowledge", {
      loadId: load.id,
      version: 1,
      returnGrams: 10000,
      meterReadingGrams: 100000,
      reason: "Synthetic fresh independent recovery acknowledgement",
      operationKey: id(),
    });
    await fund(f);
    await assert.rejects(
      () =>
        f.call("driver", "bulk.dispense", {
          loadId: load.id,
          version: 2,
          orderId: f.order.id,
          meterReadingGrams: 105999,
          reason: "Synthetic incorrect reading",
          operationKey: id(),
        }),
      /Meter delta/,
    );
    await f.call("driver", "bulk.dispense", {
      loadId: load.id,
      version: 2,
      orderId: f.order.id,
      meterReadingGrams: 106000,
      reason: "Synthetic correctly observed recovery dispensing",
      operationKey: id(),
    });
    assert.equal(Number((await f.balance()).grams), 20000); // stock debited only on handover
    const driver = await actor(f.db, f.actors.driver.token);
    await f.db.transaction((tx) =>
      attachDeliveryPhoto(
        tx,
        driver,
        f.order.id,
        Buffer.from("Synthetic recovered delivery proof"),
        "Synthetic proof",
        true,
      ),
    );
    const owned = (await f.call("customer", "orders", { id: f.order.id }))[0];
    await f.call("driver", "driver.complete", {
      orderId: f.order.id,
      version: Number((await f.snapshot(f.order.id)).tracking_version),
      code: owned.confirmation_code,
      handover: true,
      operationKey: id(),
    });
    assert.equal((await f.snapshot(f.order.id)).status, "delivered");
    assert.equal(Number((await f.balance()).grams), 14000);
  } finally {
    if (old === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = old;
    await f.db.close?.();
  }
});
test("DLPG-03: order cylinder discovery links marked serial to generated ID, scopes ownership and recovers registration without duplicates", async () => {
  const old = process.env.EASYGAS_BULK_LPG_ENABLED,
    f = await setup();
  try {
    const line = (
      await f.db.query("SELECT * FROM order_gas_lines WHERE order_id=$1", [
        f.order.id,
      ])
    ).rows[0];
    const cylinder = (
      await f.call("owner", "gas.cylinders", { lineId: line.id })
    )[0];
    assert.ok(cylinder.id);
    assert.ok(cylinder.serial);
    await assert.rejects(
      () => f.call("customer", "gas.cylinders", { lineId: line.id }),
      /permission/,
    );
    await assert.rejects(
      () => f.call("driver", "gas.cylinders", { lineId: line.id }),
      /limited|permission/,
    );
    await f.db.query("UPDATE orders SET status='preparing' WHERE id=$1", [
      f.order.id,
    ]);
    const request = {
      lineId: line.id,
      serial: "MARKED-SYNTHETIC-" + id(),
      sizeKg: 6,
      testDue: new Date(Date.now() + 86400000 * 365).toISOString().slice(0, 10),
      reason: "Synthetic customer cylinder present with marked serial",
      operationKey: id(),
    };
    const result = await f.call("owner", "gas.cylinder.intake", request);
    assert.equal(
      (await f.call("owner", "gas.cylinder.intake", request)).id,
      result.id,
    );
    const created = (
      await f.call("owner", "gas.cylinders", { lineId: line.id })
    ).find((c: any) => c.id === result.id);
    assert.equal(created.serial, request.serial);
    assert.equal(created.status, "quarantined");
    await assert.rejects(
      () =>
        f.call("owner", "gas.inspection.record", {
          lineId: line.id,
          cylinderId: result.id,
          allowableKg: 6,
          reason: "Synthetic unsafe uninspected record",
          operationKey: id(),
        }),
      /ineligible/,
    );
    await f.db.query("UPDATE cylinders SET customer_id=$1 WHERE id=$2", [
      f.actors.commercial.id,
      result.id,
    ]);
    assert.ok(
      !(await f.call("owner", "gas.cylinders", { lineId: line.id })).some(
        (c: any) => c.id === result.id,
      ),
    );
  } finally {
    if (old === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = old;
    await f.db.close?.();
  }
});
test("DLPG-UI01: driver sees actionable missing custody, observed acknowledgement and metered dispensing before handover", () => {
  const order = { id: "o", gas_lines: [{}], attempt: { state: "arrived" }, manifest:{serials:["MARKED-QA-006"]} };
  const missing = renderToStaticMarkup(
    React.createElement(DriverLPGControls, {
      bulk: { required: true, loads: [], enabled: true },
      order,
      disabled: false,
      write: async () => {},
    }),
  );
  assert.match(missing, /Recover missing LPG custody/);
  assert.match(missing,/MARKED-QA-006/);
  assert.match(missing,/Match the marked serial/);
  assert.equal(
    lpgReadiness(order, { required: true, loads: [] }).handoverReady,
    false,
  );
  const load = {
    id: "l",
    label: "Vehicle 01",
    state: "issued",
    loaded_grams: 10000,
    meter_reading_grams: 100000,
    version: 1,
    allocations: [{ order_id: "o", grams: 6000, state: "allocated" }],
  };
  const props = {
    bulk: { required: true, loads: [load], enabled: true },
    order,
    disabled: false,
    write: async () => {},
  };
  assert.match(
    renderToStaticMarkup(React.createElement(DriverLPGControls, props)),
    /Acknowledge LPG custody/,
  );
  load.state = "active";
  (load as any).acknowledged_by = "driver";
  assert.match(
    renderToStaticMarkup(React.createElement(DriverLPGControls, props)),
    /Save metered dispensing/,
  );
  assert.equal(lpgReadiness(order, props.bulk).handoverReady, false);
  load.allocations[0].state = "dispensed";
  (load.allocations[0] as any).dispensed_grams = 6000;
  assert.equal(lpgReadiness(order, props.bulk).handoverReady, true);
});

test("DLPG-04: customer checkout through serial registration, qualified inspection, assigned load, actual pickup and driver handover succeeds under bulk-enabled operations", async () => {
  const old = process.env.EASYGAS_BULK_LPG_ENABLED,
    oldNode = process.env.NODE_ENV,
    oldField = process.env.EASYGAS_FIELD_OPERATIONS_ENABLED,
    oldTracking = process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED,
    oldRetention = process.env.EASYGAS_PROOF_RETENTION_DAYS,
    f = await setup();
  try {
    await f.db.exec(
      "UPDATE settings SET value='true' WHERE key='wallet.enabled' AND scope='lagos'",
    );
    await f.db.query(
      "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES($1,$2,10000000,'test_fixture',$1)",
      [id(), f.actors.customer.id],
    );
    const policy = await f.call("owner", "setting.propose", {
      key: "gas.quantity_policy",
      scope: "lagos",
      version: 1,
      value: {
        minimumKg: 0.5,
        maximumKg: 50,
        incrementKg: 0.5,
        precision: 1,
        capacitiesKg: [3, 6, 12.5, 25, 50],
      },
      reason: "Synthetic independently approved delivery policy",
    });
    await f.call("dispatcher", "approval.decide", {
      id: policy.id,
      decision: "approve",
      reason: "Synthetic independent quantity approval",
    });
    const lines = [{ capacityKg: 6, kg: 6 }],
      q = await f.call("customer", "gas.quote", { lines, locationId: "lekki" });
    const o = await f.call("customer", "checkout", {
      items: [],
      gasLines: lines,
      pricing: {
        priceVersion: q.priceVersion,
        feeVersion: q.feeVersion,
        policyVersion: q.policyVersion,
        totalKobo: q.subtotalKobo + q.deliveryKobo,
      },
      address: {
        locationId: "lekki",
        zone: "Lekki",
        name: "Synthetic customer",
        phone: "08012345678",
        street: "12 Synthetic Street",
        building: "12",
      },
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      window: "14:00–18:00",
      paymentMethod: "wallet",
      idempotencyKey: id(),
    });
    const line = (
      await f.db.query("SELECT id FROM order_gas_lines WHERE order_id=$1", [
        o.id,
      ])
    ).rows[0];
    const c = await f.call("owner", "gas.cylinder.intake", {
      lineId: line.id,
      serial: "MARKED-DLPG-" + id(),
      sizeKg: 6,
      testDue: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      reason: "Synthetic physical customer cylinder intake",
      operationKey: id(),
    });
    await f.call("dispatcher", "technician.qualify", {
      userId: f.actors.owner.id,
      code: "cylinder_inspection",
      evidence: "Synthetic independently verified inspector evidence",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const inspection = {
      id: c.id,
      passed: true,
      nextDue: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      notes: "Synthetic verified physical inspection passed",
      operationKey: id(),
    };
    await f.call("owner", "cylinder.inspect", inspection);
    await f.call("owner", "cylinder.inspect", inspection);
    assert.equal(
      (
        await f.db.query(
          "SELECT id FROM cylinder_inspections WHERE cylinder_id=$1",
          [c.id],
        )
      ).rows.length,
      1,
    );
    await f.call("owner", "gas.inspection.record", {
      lineId: line.id,
      cylinderId: c.id,
      allowableKg: 6,
      reason: "Synthetic verified residual gas and safe additional fill",
      operationKey: id(),
    });
    await f.call("owner", "invoice.issue", { orderId: o.id });
    process.env.NODE_ENV = "production";
    process.env.EASYGAS_FIELD_OPERATIONS_ENABLED = "true";
    process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED = "true";
    process.env.EASYGAS_PROOF_RETENTION_DAYS = "30";
    for (const status of ["accepted", "preparing", "assigned"])
      await f.transition(o, status);
    let current = await f.snapshot(o.id);
    await f.call("driver", "dispatch.respond", {
      orderId: o.id,
      version: current.tracking_version,
      decision: "acknowledged",
      reason: "Synthetic assignment accepted",
      operationKey: id(),
    });
    await assert.rejects(() => f.pickup(o), /measured vehicle LPG load/);
    const load = await f.issue({ orderIds: [o.id], grams: 6000 });
    await f.call("driver", "bulk.load.acknowledge", {
      loadId: load.id,
      version: 1,
      returnGrams: 6000,
      meterReadingGrams: 100000,
      reason: "Synthetic independent observed vehicle load",
      operationKey: id(),
    });
    await f.pickup(o);
    await f.transition(o, "out_for_delivery", "driver");
    current = await f.snapshot(o.id);
    await f.call("driver", "delivery.arrived", {
      orderId: o.id,
      version: current.tracking_version,
      reason: "Synthetic actual arrival recorded",
      operationKey: id(),
    });
    await f.call("driver", "bulk.dispense", {
      loadId: load.id,
      version: 2,
      orderId: o.id,
      meterReadingGrams: 106000,
      reason: "Synthetic complete physical metered dispensing",
      operationKey: id(),
    });
    const driver = await actor(f.db, f.actors.driver.token);
    await f.db.transaction((tx) =>
      attachDeliveryPhoto(
        tx,
        driver,
        o.id,
        Buffer.from("Synthetic consented proof"),
        "Synthetic proof",
        true,
      ),
    );
    const own = (await f.call("customer", "orders", { id: o.id }))[0];
    current = await f.snapshot(o.id);
    await f.call("driver", "driver.complete", {
      orderId: o.id,
      version: current.tracking_version,
      code: own.confirmation_code,
      handover: true,
      operationKey: id(),
    });
    assert.equal((await f.snapshot(o.id)).status, "delivered");
    assert.equal(
      (await f.db.query("SELECT status FROM cylinders WHERE id=$1", [c.id]))
        .rows[0].status,
      "filled",
    );
    assert.equal(Number((await f.balance()).grams), 14000);
    assert.equal(Number((await f.balance()).reserved_grams), 6000); // other original fixture order retained
  } finally {
    if (oldRetention === undefined)
      delete process.env.EASYGAS_PROOF_RETENTION_DAYS;
    else process.env.EASYGAS_PROOF_RETENTION_DAYS = oldRetention;
    if (oldTracking === undefined)
      delete process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED;
    else process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED = oldTracking;
    if (oldNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldNode;
    if (oldField === undefined)
      delete process.env.EASYGAS_FIELD_OPERATIONS_ENABLED;
    else process.env.EASYGAS_FIELD_OPERATIONS_ENABLED = oldField;
    if (old === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = old;
    await f.db.close?.();
  }
});
