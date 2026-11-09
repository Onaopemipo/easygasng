import test from "node:test";
import assert from "node:assert/strict";
import { driverSessionPermission } from "../apps/web/lib/driver-workspace";
const driver: any = {
  id: "driver",
  role: "driver",
  driver_delivery_only: true,
};
test("DR-BOUNDARY-01 delivery-only sessions reject legacy cash, sales and stock endpoints", () => {
  for (const action of [
    "delivery.complete",
    "checkout",
    "wallet.topup",
    "inventory.adjust",
    "doorstep.propose",
    "doorstep.prepare",
    "doorstep.collection.verify",
    "doorstep.cancel",
    "fuel.record",
  ])
    assert.throws(
      () => driverSessionPermission(driver, action, {}),
      /limited to delivery/,
    );
});
test("DR-GPS-BOUNDARY: trip GPS authority does not grant fuel, cash or fleet-wide reads", () => {
  for (const action of ["driver.location", "trip.start", "trip.end"])
    assert.doesNotThrow(() => driverSessionPermission(driver, action, {}));
  assert.doesNotThrow(() =>
    driverSessionPermission(driver, "trip.sync", { events: [{ kind: "gps" }] }),
  );
  assert.throws(
    () =>
      driverSessionPermission(driver, "trip.sync", {
        events: [{ kind: "fuel" }],
      }),
    /only consented GPS/,
  );
  assert.throws(
    () => driverSessionPermission(driver, "fleet.summary", {}),
    /limited to delivery/,
  );
});
test("DR-BOUNDARY-02 delivery-only sessions reject skipped or invented order transitions", () => {
  for (const status of ["delivered", "assigned", "cancelled", "preparing"])
    assert.throws(
      () => driverSessionPermission(driver, "order.transition", { status }),
      /Only authorised/,
    );
  for (const status of ["out_for_delivery", "delivery_failed"])
    assert.doesNotThrow(() =>
      driverSessionPermission(driver, "order.transition", { status }),
    );
});
test("DR-BOUNDARY-03 canonical delivery reads and guarded completion remain available", () => {
  for (const action of [
    "orders",
    "driver.snapshot",
    "driver.complete",
    "dispatch.respond",
    "delivery.pickup",
    "delivery.arrived",
    "tracking.operation",
    "delivery.photos",
    "doorstep.list",
    "doorstep.gas.propose",
    "doorstep.collection.report",
    "doorstep.dispense",
    "logout",
  ])
    assert.doesNotThrow(() => driverSessionPermission(driver, action, {}));
});
test("DR-COMPAT-01 legacy session policy remains unchanged pending explicit cutover", () => {
  assert.doesNotThrow(() =>
    driverSessionPermission(
      { ...driver, driver_delivery_only: false },
      "delivery.complete",
      {},
    ),
  );
});

import { fixture } from "./helpers/order-tracking-fixture";
import { id } from "../apps/web/lib/auth";
test("DR-INTEGRATION-01 restricted canonical session enforces role, availability and legacy completion denial", async () => {
  const f = await fixture();
  try {
    await assert.rejects(
      () => f.call("customer", "driver.restrict"),
      /permission|permitted|role|authorised/i,
    );
    await f.call("driver", "driver.restrict");
    await f.call("driver", "driver.availability", {
      available: true,
      operationKey: id(),
    });
    assert.equal(
      (await f.call("driver", "driver.snapshot")).profile.driver_available,
      true,
    );
    const o = await f.assigned();
    await assert.rejects(
      () =>
        f.call("driver", "driver.availability", {
          available: false,
          operationKey: id(),
        }),
      /active assignments/,
    );
    await assert.rejects(
      () => f.call("driver", "delivery.complete", { orderId: o.id }),
      /limited to delivery/,
    );
    await assert.rejects(() => f.pickup(o), /acknowledg/i);
    await f.call("driver", "dispatch.respond", {
      orderId: o.id,
      version: o.tracking_version,
      decision: "acknowledged",
      reason: "Inspected assignment details",
      operationKey: id(),
    });
    await f.pickup(o);
    assert.equal((await f.snapshot(o.id)).attempt.state, "picked_up");
  } finally {
    await f.db.close?.();
  }
});
