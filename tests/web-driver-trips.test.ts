import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { id, issueSession } from "../apps/web/lib/auth";
import { actor } from "../apps/web/lib/auth";
import { attachDeliveryPhoto } from "../apps/web/lib/delivery-photos";

test("DWT-PROOFNEG: web completion requires payment, arrival, current consented proof, correct code and full handover without granting cash authority", async () => {
  const f = await fixture();
  try {
    const order = await f.ready();
    await f.call("driver", "driver.restrict");
    const code = (await f.call("customer", "orders", { id: order.id }))[0]
      .confirmation_code;
    const complete = {
      orderId: order.id,
      version: order.tracking_version,
      code,
      handover: true,
      operationKey: id(),
    };
    await assert.rejects(
      () => f.call("driver", "driver.complete", complete),
      /Payment needs authorised/i,
    );
    // Explicit disposable fixture funding; the actual wallet checkout below consumes it through the canonical ledger.
    await f.db.exec(
      "UPDATE settings SET value='true' WHERE key='wallet.enabled' AND scope='lagos'",
    );
    await f.db.query(
      "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES($1,$2,1000000,'test_fixture',$3)",
      [id(), f.actors.customer.id, id()],
    );
    const paid = await f.call("customer", "checkout", {
      items: [{ productId: "hose", quantity: 1 }],
      address: {
        name: "Synthetic web customer",
        phone: "08012345678",
        street: "12 Synthetic Street",
        zone: "Lekki",
      },
      date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      window: "14:00–18:00",
      paymentMethod: "wallet",
      idempotencyKey: id(),
    });
    for (const status of ["accepted", "preparing", "assigned"])
      await f.transition(paid, status);
    let current = await f.snapshot(paid.id);
    await f.call("driver", "dispatch.respond", {
      orderId: paid.id,
      version: current.tracking_version,
      decision: "acknowledged",
      reason: "Synthetic web completion acknowledged",
      operationKey: id(),
    });
    await f.pickup(paid);
    await f.transition(paid, "out_for_delivery", "driver");
    current = await f.snapshot(paid.id);
    const owned = (await f.call("customer", "orders", { id: paid.id }))[0];
    const request = {
      orderId: paid.id,
      version: current.tracking_version,
      code: owned.confirmation_code,
      handover: true,
      operationKey: id(),
    };
    await assert.rejects(
      () => f.call("driver", "driver.complete", request),
      /arrival/i,
    );
    await f.call("driver", "delivery.arrived", {
      orderId: paid.id,
      version: current.tracking_version,
      reason: "Synthetic verified arrival",
      operationKey: id(),
    });
    current = await f.snapshot(paid.id);
    request.version = current.tracking_version;
    await assert.rejects(
      () => f.call("driver", "driver.complete", request),
      /proof photo/i,
    );
    const driver = await actor(f.db, f.actors.driver.token);
    await assert.rejects(
      () =>
        f.db.transaction((tx) =>
          attachDeliveryPhoto(
            tx,
            driver,
            paid.id,
            Buffer.from("Synthetic test proof"),
            "Synthetic proof",
            false,
          ),
        ),
      /consent/i,
    );
    await f.db.transaction((tx) =>
      attachDeliveryPhoto(
        tx,
        driver,
        paid.id,
        Buffer.from("Synthetic test proof"),
        "Synthetic proof",
        true,
      ),
    );
    await assert.rejects(
      () =>
        f.call("driver", "driver.complete", {
          ...request,
          code: owned.confirmation_code === "000000" ? "111111" : "000000",
          operationKey: id(),
        }),
      /code/i,
    );
    await assert.rejects(
      () =>
        f.call("driver", "driver.complete", {
          ...request,
          handover: false,
          operationKey: id(),
        }),
      /true|Invalid/i,
    );
    assert.equal(
      (await f.call("driver", "orders", { id: paid.id }))[0].confirmation_code,
      undefined,
    );
    await f.call("driver", "driver.complete", request);
    await f.call("driver", "driver.complete", request);
    const result = await f.snapshot(paid.id);
    assert.equal(result.status, "delivered");
    assert.equal(result.payment_status, "verified");
    assert.equal(
      (
        await f.db.query("SELECT id FROM stock_movements WHERE reference=$1", [
          paid.id + ":fulfil:hose",
        ])
      ).rows.length,
      1,
    );
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT amount_kobo FROM verified_payments WHERE order_id=$1",
            [paid.id],
          )
        ).rows[0].amount_kobo,
      ),
      Number(result.total_kobo),
    );
  } finally {
    await f.db.close?.();
  }
});

test("DWT-SEC: restricted driver web trip lifecycle keeps ownership, suitability, branch, replay and odometer controls", async () => {
  const f = await fixture();
  try {
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    const vehicle = await f.call("owner", "fleet.vehicle.create", {
      branchId: "lagos",
      label: "Web trip synthetic van",
      capacityGrams: 30000,
      lpgSuitable: true,
      operationKey: id(),
    });
    const request = {
      vehicleId: vehicle.id,
      startOdometer: 25,
      locationConsent: true,
      operationKey: id(),
    };
    await assert.rejects(
      () => f.call("customer", "trip.start", request),
      /permission/i,
    );
    await f.call("driver", "driver.restrict");
    await assert.rejects(
      () =>
        f.call("driver", "trip.start", {
          ...request,
          driverId: f.actors.owner.id,
        }),
      /Unrecognized/i,
    );
    await f.db.query(
      "UPDATE driver_vehicles SET lpg_suitable=false WHERE id=$1",
      [vehicle.id],
    );
    assert.deepEqual((await f.call("driver", "driver.location")).vehicles, []);
    await assert.rejects(
      () => f.call("driver", "trip.start", request),
      /suitable/i,
    );
    await f.db.query(
      "UPDATE driver_vehicles SET lpg_suitable=true,active=false WHERE id=$1",
      [vehicle.id],
    );
    await assert.rejects(
      () => f.call("driver", "trip.start", request),
      /suitable/i,
    );
    await f.db.query("UPDATE driver_vehicles SET active=true WHERE id=$1", [
      vehicle.id,
    ]);
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('web-trip-other','Other synthetic branch')",
    );
    await f.db.query(
      "UPDATE driver_vehicles SET branch_id='web-trip-other' WHERE id=$1",
      [vehicle.id],
    );
    assert.deepEqual((await f.call("driver", "driver.location")).vehicles, []);
    await assert.rejects(
      () => f.call("driver", "trip.start", request),
      /branch/i,
    );
    await f.db.query(
      "UPDATE driver_vehicles SET branch_id='lagos' WHERE id=$1",
      [vehicle.id],
    );
    const trip = await f.call("driver", "trip.start", request);
    await f.call("driver", "trip.start", request);
    assert.equal(
      (
        await f.db.query("SELECT id FROM driver_trips WHERE driver_id=$1", [
          f.actors.driver.id,
        ])
      ).rows.length,
      1,
    );
    const other = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) SELECT $1,'Other synthetic driver',$2,password_hash,'driver','lagos' FROM users WHERE id=$3",
      [other, other + "@tracking.example.test", f.actors.driver.id],
    );
    f.actors.other = { id: other, token: await issueSession(f.db, other) };
    await f.call("other", "driver.restrict");
    assert.equal((await f.call("other", "driver.location")).trip, null);
    await assert.rejects(
      () =>
        f.call("other", "trip.end", {
          tripId: trip.id,
          endOdometer: 30,
          operationKey: id(),
        }),
      /not found/i,
    );
    await assert.rejects(
      () =>
        f.call("driver", "trip.end", {
          tripId: trip.id,
          endOdometer: 24,
          operationKey: id(),
        }),
      /at least the start/i,
    );
    await f.call("driver", "trip.location.revoke", {
      tripId: trip.id,
      operationKey: id(),
    });
    assert.equal(
      (await f.call("driver", "driver.location")).trip.location_consent,
      false,
    );
    const end = { tripId: trip.id, endOdometer: 30, operationKey: id() };
    await f.call("driver", "trip.end", end);
    await f.call("driver", "trip.end", end);
    assert.equal((await f.call("driver", "driver.location")).trip, null);
    await assert.rejects(
      () =>
        f.call("driver", "trip.sync", {
          tripId: trip.id,
          events: [{ kind: "fuel" }],
          operationKey: id(),
        }),
      /only consented GPS/i,
    );
  } finally {
    await f.db.close?.();
  }
});
