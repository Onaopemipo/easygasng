import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { id, issueSession } from "../apps/web/lib/auth";
import { beginAttempt } from "../apps/web/lib/order-tracking";

async function preparing(f: Awaited<ReturnType<typeof fixture>>) {
  const order = await f.make();
  await f.transition(order, "accepted");
  await f.transition(order, "preparing");
  return f.snapshot(order.id);
}

test("DAN-01: owner first assignment notifies only its driver once across operation replay and keeps customer code private", async () => {
  const f = await fixture();
  try {
    const order = await preparing(f);
    const input = {
      id: order.id,
      status: "assigned",
      driverId: f.actors.driver.id,
      version: order.tracking_version,
      note: "Synthetic owner assignment notification regression",
      operationKey: id(),
    };
    await f.call("owner", "order.transition", input);
    const inbox = await f.call("driver", "notifications.list");
    const alerts = inbox.items.filter(
      (n: any) => n.related_id === order.id && n.title === "Delivery assigned",
    );
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].read_at, null);
    assert.equal(inbox.unread, 1);
    assert.match(alerts[0].body, new RegExp(order.reference));
    assert.doesNotMatch(
      alerts[0].body,
      /confirmation code|Synthetic Street|08012345678/,
    );
    const customer = await f.call("customer", "notifications.list");
    const code = customer.items.find(
      (n: any) =>
        n.related_id === order.id && n.title === "Delivery confirmation code",
    );
    assert.ok(code);
    assert.doesNotMatch(
      alerts[0].body,
      new RegExp(code.body.match(/\b\d{6}\b/)[0]),
    );
    assert.equal(
      customer.items.filter((n: any) => n.title === "Delivery assigned").length,
      0,
    );
    assert.equal(
      (await f.call("inventory", "notifications.list")).items.filter(
        (n: any) => n.related_id === order.id,
      ).length,
      0,
    );
    await f.call("owner", "order.transition", input);
    assert.equal(
      (
        await f.db.query(
          "SELECT id FROM notifications WHERE user_id=$1 AND related_id=$2 AND title='Delivery assigned'",
          [f.actors.driver.id, order.id],
        )
      ).rows.length,
      1,
    );
    await assert.rejects(
      () =>
        f.call("owner", "order.transition", { ...input, operationKey: id() }),
      /changed|transition/i,
    );
    assert.equal((await f.call("driver", "notifications.list")).unread, 1);
    await f.call("driver", "notifications.read", { id: alerts[0].id });
    assert.equal((await f.call("driver", "notifications.list")).unread, 0);
  } finally {
    await f.db.close?.();
  }
});

test("DAN-02: enhanced first assignment and reassignment each notify the receiving driver exactly once", async () => {
  const f = await fixture();
  try {
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    const second = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id,driver_available) SELECT $1,'Second synthetic driver',$2,password_hash,'driver','lagos',true FROM users WHERE id=$3",
      [second, second + "@tracking.example.test", f.actors.driver.id],
    );
    f.actors.second = { id: second, token: await issueSession(f.db, second) };
    for (const role of ["driver", "second"]) {
      const vehicle = await f.call("owner", "fleet.vehicle.create", {
        branchId: "lagos",
        label: "Synthetic notification van " + role,
        capacityGrams: 50000,
        lpgSuitable: true,
        operationKey: id(),
      });
      await f.call(role, "trip.start", {
        vehicleId: vehicle.id,
        startOdometer: 10,
        locationConsent: false,
        operationKey: id(),
      });
    }
    const order = await preparing(f);
    await f.call("owner", "dispatch.assign", {
      orderId: order.id,
      driverId: f.actors.driver.id,
      version: order.tracking_version,
      reason: "Synthetic enhanced assignment notification",
      operationKey: id(),
    });
    const original = (
      await f.call("driver", "notifications.list")
    ).items.filter(
      (n: any) => n.related_id === order.id && n.title === "Delivery assigned",
    );
    assert.equal(original.length, 1);
    const current = await f.snapshot(order.id);
    const reassign = {
      orderId: order.id,
      driverId: second,
      version: current.tracking_version,
      reason: "Synthetic reassignment before physical pickup",
      operationKey: id(),
    };
    await f.call("owner", "dispatch.reassign", reassign);
    await f.call("owner", "dispatch.reassign", reassign);
    const replacement = await f.call("second", "notifications.list");
    assert.equal(
      replacement.items.filter(
        (n: any) =>
          n.related_id === order.id && n.title === "Delivery assigned",
      ).length,
      1,
    );
    assert.match(
      replacement.items.find((n: any) => n.title === "Delivery assigned").body,
      new RegExp(order.reference),
    );
    const previous = await f.call("driver", "notifications.list");
    assert.equal(
      previous.items.filter(
        (n: any) =>
          n.related_id === order.id && n.title === "Assignment changed",
      ).length,
      1,
    );
    assert.deepEqual(
      await f.call("driver", "orders", { active: "1", id: order.id }),
      [],
    );
  } finally {
    await f.db.close?.();
  }
});

test("DAN-03: unavailable driver rejection and a failure after attempt creation leave no phantom assignment alert", async () => {
  const f = await fixture();
  try {
    const order = await preparing(f);
    const before = (
      await f.db.query("SELECT id FROM notifications WHERE related_id=$1", [
        order.id,
      ])
    ).rows.length;
    await f.db.query("UPDATE users SET driver_available=false WHERE id=$1", [
      f.actors.driver.id,
    ]);
    await assert.rejects(
      () => f.transition(order, "assigned"),
      /unavailable|availability/i,
    );
    assert.equal((await f.call("driver", "notifications.list")).unread, 0);
    await f.db.query("UPDATE users SET driver_available=true WHERE id=$1", [
      f.actors.driver.id,
    ]);
    await assert.rejects(
      () =>
        f.db.transaction(async (tx) => {
          await beginAttempt(tx, order, f.actors.driver.id);
          throw new Error("Synthetic failure after attempt and notifications");
        }),
      /Synthetic failure/,
    );
    assert.equal(
      (
        await f.db.query("SELECT id FROM notifications WHERE related_id=$1", [
          order.id,
        ])
      ).rows.length,
      before,
    );
    assert.equal(
      (
        await f.db.query("SELECT id FROM delivery_attempts WHERE order_id=$1", [
          order.id,
        ])
      ).rows.length,
      0,
    );
    assert.equal((await f.snapshot(order.id)).driver_id, null);
  } finally {
    await f.db.close?.();
  }
});
