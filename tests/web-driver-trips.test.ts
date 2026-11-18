import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { id, issueSession } from "../apps/web/lib/auth";

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
