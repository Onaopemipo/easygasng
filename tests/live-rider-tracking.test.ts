import test from "node:test";
import assert from "node:assert/strict";
import { id } from "../apps/web/lib/auth";
import { openTrackingStream } from "../apps/web/lib/tracking-stream";
import {
  riderObservation,
  withoutRiderLocations,
} from "../packages/business-rules/src/rider-location";
import { reconcileTracking } from "../packages/business-rules/src/order-tracking";
import { fixture } from "./helpers/order-tracking-fixture";

test("LRT-T012: invalid, future, expired and late observations cannot be published as recent", () => {
  const now = Date.now();
  const fix = {
    lat: 6.45,
    lng: 3.4,
    accuracy: 22,
    recordedAt: new Date(now - 5_000).toISOString(),
  };
  const received = new Date(now).toISOString();
  assert.equal(
    riderObservation(fix, received, now, 90000)?.source,
    "device_gps",
  );
  for (const point of [
    { ...fix, lat: 91 },
    { ...fix, lng: -181 },
    { ...fix, accuracy: 101 },
    { ...fix, recordedAt: new Date(now + 1000).toISOString() },
    { ...fix, recordedAt: new Date(now - 90000).toISOString() },
  ])
    assert.equal(riderObservation(point, received, now, 90000), null);
  assert.equal(
    riderObservation(fix, new Date(now - 6000).toISOString(), now, 90000),
    null,
  );
});

test("LRT-T010: scope removal and old snapshots cannot restore rider coordinates", () => {
  const active = {
    id: "example",
    tracking_version: 2,
    gps: { fix: { lat: 6, lng: 3 } },
  };
  assert.deepEqual(reconcileTracking([active], []), []);
  assert.deepEqual(
    reconcileTracking([active], [{ ...active, tracking_version: 1 }])[0].gps,
    { enabled: false, status: "unavailable", eta: null },
  );
  assert.deepEqual(withoutRiderLocations([active])[0].gps, {
    enabled: false,
    status: "unavailable",
    eta: null,
  });
});

test("LRT-T008: owned active stop gets committed GPS and foreign orders, revoked consent and sessions get no coordinates", async () => {
  const f = await fixture();
  const priorFlag = process.env.EASYGAS_CUSTOMER_RIDER_GPS_ENABLED;
  const connection = new AbortController();
  try {
    process.env.EASYGAS_CUSTOMER_RIDER_GPS_ENABLED = "false";
    const vehicle = id();
    await f.db.query(
      "INSERT INTO driver_vehicles(id,branch_id,label,capacity_grams,lpg_suitable) VALUES($1,'lagos','Synthetic GPS test vehicle',20000,true)",
      [vehicle],
    );
    const trip = await f.call("driver", "trip.start", {
      vehicleId: vehicle,
      startOdometer: 0,
      locationConsent: true,
      operationKey: id(),
    });
    const order = await f.ready();
    const event = {
      id: id(),
      sequence: 1,
      kind: "gps",
      recordedAt: new Date().toISOString(),
      payload: { lat: 6.45, lng: 3.4, accuracy: 22 },
    };
    const write = { tripId: trip.id, events: [event], operationKey: id() };
    await f.call("driver", "trip.sync", write);
    await f.call("driver", "trip.sync", write);
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM trip_events WHERE trip_id=$1",
            [trip.id],
          )
        ).rows[0].n,
      ),
      1,
    );

    const view = async () =>
      (await f.call("customer", "orders", { id: order.id }))[0].gps;
    assert.equal((await view()).status, "unavailable");
    process.env.EASYGAS_CUSTOMER_RIDER_GPS_ENABLED = "true";
    assert.deepEqual(
      await f.call("commercial", "orders", { id: order.id }),
      [],
    );
    assert.equal((await view()).fix.lat, event.payload.lat);
    assert.equal((await view()).fix.accuracy, event.payload.accuracy);
    assert.equal((await view()).eta, null);

    await assert.rejects(
      () =>
        f.call("driver", "trip.sync", {
          tripId: trip.id,
          operationKey: id(),
          events: [
            {
              ...event,
              id: id(),
              sequence: 2,
              payload: { ...event.payload, lat: 7.1 },
            },
          ],
        }),
      /conflicts with nearby/,
    );
    assert.equal((await view()).fix.lat, event.payload.lat);

    const stream = await openTrackingStream({
      token: f.actors.customer.token,
      orderId: order.id,
      database: f.db,
      signal: connection.signal,
      intervalMs: 30,
    });
    const reader = stream.getReader();
    const first = await reader.read();
    assert.match(new TextDecoder().decode(first.value), /device_gps/);
    await f.call("driver", "trip.location.revoke", {
      tripId: trip.id,
      operationKey: id(),
    });
    assert.equal((await view()).status, "unavailable");
    await assert.rejects(
      () =>
        f.call("driver", "trip.sync", {
          tripId: trip.id,
          operationKey: id(),
          events: [{ ...event, id: id(), sequence: 2 }],
        }),
      /no longer authorised/,
    );
    await f.db.query("DELETE FROM sessions WHERE user_id=$1", [
      f.actors.customer.id,
    ]);
    for (let i = 0; i < 10; i++) {
      const next = await reader.read();
      if (next.done) break;
      if (!new TextDecoder().decode(next.value).includes("device_gps"))
        continue;
      assert.fail("Revoked session received rider coordinates");
    }
    assert.equal((await reader.read()).done, true);
  } finally {
    connection.abort();
    if (priorFlag === undefined)
      delete process.env.EASYGAS_CUSTOMER_RIDER_GPS_ENABLED;
    else process.env.EASYGAS_CUSTOMER_RIDER_GPS_ENABLED = priorFlag;
    await f.db.close?.();
  }
});

test("LRT-T007: fleet reads exclude foreign branches and enforce a per-user owner denial", async () => {
  const f = await fixture();
  try {
    const vehicle = id();
    const assigned = await f.assigned();
    await f.db.query(
      "INSERT INTO driver_vehicles(id,branch_id,label,capacity_grams,lpg_suitable) VALUES($1,'lagos','Synthetic fleet vehicle',20000,true)",
      [vehicle],
    );
    const trip = await f.call("driver", "trip.start", {
      vehicleId: vehicle,
      startOdometer: 0,
      locationConsent: true,
      operationKey: id(),
    });
    const fix = { lat: 6.44, lng: 3.42, accuracy: 18 };
    await f.call("driver", "trip.sync", {
      tripId: trip.id,
      operationKey: id(),
      events: [
        {
          id: id(),
          sequence: 1,
          kind: "gps",
          recordedAt: new Date().toISOString(),
          payload: fix,
        },
      ],
    });
    await f.db.query(
      "INSERT INTO branches(id,name,active) VALUES('test-other','Test other branch',true)",
    );
    const date = assigned.delivery_date;
    const read = () => f.call("dispatcher", "dispatch.centre", { date });
    const own = await read();
    assert.equal(
      own.drivers.find((driver: any) => driver.id === f.actors.driver.id)
        .location.lastKnown.lat,
      fix.lat,
    );
    await assert.rejects(
      () =>
        f.call("dispatcher", "dispatch.centre", { date, branch: "test-other" }),
      /Branch access denied/,
    );
    await f.db.query("UPDATE users SET branch_id='test-other' WHERE id=$1", [
      f.actors.dispatcher.id,
    ]);
    assert.deepEqual((await read()).drivers, []);
    await f.db.query(
      "INSERT INTO staff_privilege_overrides(user_id,privilege,effect,changed_by,role_at_change,branch_at_change) VALUES($1,'dispatch.manage','deny',$1,'owner','lagos')",
      [f.actors.owner.id],
    );
    await assert.rejects(
      () => f.call("owner", "dispatch.centre", { date }),
      /revoked/,
    );
  } finally {
    await f.db.close?.();
  }
});
