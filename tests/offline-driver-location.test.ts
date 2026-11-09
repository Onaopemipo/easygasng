import test from "node:test";
import assert from "node:assert/strict";
import {
  authorisedOfflineFix,
  locationLeaseMs,
  nextLocationSequence,
} from "../packages/business-rules/src/offline-location";
import { tripLocationEvidence } from "../packages/business-rules/src/trip-metrics";
import { bulkFixture } from "./helpers/bulk-lpg-fixture";
import { id } from "../apps/web/lib/auth";

test("GPS-OFF01: offline capture authority expires and rejects off-trip, future and invalid observations", () => {
  const now = Date.parse("2026-11-08T12:00:00Z");
  const lease = {
    userId: id(),
    tripId: id(),
    nextSequence: 1,
    startedAt: "2026-11-08T10:00:00Z",
    expiresAt: now + locationLeaseMs,
  };
  const fix = {
    timestamp: now - 1000,
    coords: { latitude: 6.4, longitude: 3.4, accuracy: 10 },
  };
  assert.equal(authorisedOfflineFix(lease, fix, now), true);
  assert.equal(
    authorisedOfflineFix({ ...lease, expiresAt: now }, fix, now),
    false,
  );
  assert.equal(
    authorisedOfflineFix(lease, { ...fix, timestamp: now + 1 }, now),
    false,
  );
  assert.equal(
    authorisedOfflineFix(
      lease,
      { ...fix, timestamp: Date.parse(lease.startedAt) - 1 },
      now,
    ),
    false,
  );
  assert.equal(
    authorisedOfflineFix(
      lease,
      { ...fix, coords: { ...fix.coords, accuracy: null } },
      now,
    ),
    false,
  );
  assert.equal(
    authorisedOfflineFix(
      lease,
      { ...fix, coords: { ...fix.coords, latitude: 91 } },
      now,
    ),
    false,
  );
  const history = tripLocationEvidence(
    [
      {
        lat: 6.4,
        lng: 3.4,
        accuracy: 10,
        recordedAt: new Date(now - 3600000).toISOString(),
        receivedAt: new Date(now).toISOString(),
      },
    ],
    now,
    true,
    false,
  );
  assert.equal(history.status, "last_known_only");
  assert.equal(history.live, false);
  assert.equal(history.lastKnown?.delayedUpload, true);
  assert.equal(history.lastKnown?.ageSeconds, 3600);
});

test("GPS-OFF02: delayed driver GPS sync preserves observed time/history, replays once and cannot grant fuel/finance access", async () => {
  const env = { ...process.env };
  const f = await bulkFixture();
  try {
    await f.db.query(
      "UPDATE driver_trips SET location_consent=true,started_at=now()-interval '2 hours' WHERE id=$1",
      [f.trip.id],
    );
    await f.call("driver", "driver.restrict", {});
    const own = await f.call("driver", "driver.location", {});
    assert.equal(own.trip.id, f.trip.id);
    assert.equal(own.trip.driver_id, f.actors.driver.id);
    const observed = new Date(Date.now() - 3600000).toISOString();
    const input = {
      tripId: f.trip.id,
      operationKey: id(),
      events: [
        {
          id: id(),
          sequence: 1,
          kind: "gps",
          recordedAt: observed,
          payload: { lat: 6.45, lng: 3.4, accuracy: 8 },
        },
      ],
    };
    await f.call("driver", "trip.sync", input);
    assert.equal((await f.call("driver", "trip.sync", input)).replayed, true);
    const board = await f.call("owner", "fleet.summary");
    const trip = board.trips.find((t: any) => t.id === f.trip.id);
    assert.equal(trip.location.status, "last_known_only");
    assert.equal(trip.location.lastKnown.recordedAt, observed);
    assert.equal(trip.location.lastKnown.delayedUpload, true);
    assert.equal(trip.connectivity, "location_unavailable");
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM trip_events WHERE trip_id=$1",
            [f.trip.id],
          )
        ).rows[0].n,
      ),
      1,
    );
    await assert.rejects(
      () =>
        f.call("driver", "trip.sync", {
          ...input,
          operationKey: id(),
          events: [{ ...input.events[0], kind: "fuel" }],
        }),
      /only consented GPS/,
    );
    await assert.rejects(
      () => f.call("driver", "fleet.summary", {}),
      /limited to delivery/,
    );
    await f.db.query(
      "UPDATE driver_trips SET location_consent=false WHERE id=$1",
      [f.trip.id],
    );
    await assert.rejects(
      () =>
        f.call("driver", "trip.sync", {
          ...input,
          operationKey: id(),
          events: [{ ...input.events[0], id: id(), sequence: 2 }],
        }),
      /no longer authorised/,
    );
  } finally {
    process.env = env;
    await f.db.close?.();
  }
});

test("GPS-OFF03: acknowledged GPS sequence cannot be reused after queue empties or a capture crashes", () => {
  assert.equal(nextLocationSequence(1, 11, []), 11);
  assert.equal(nextLocationSequence(20, 11, [13, 15]), 20);
  assert.equal(nextLocationSequence(1, 11, [13]), 13);
  assert.throws(() => nextLocationSequence(1, NaN, []), /review/);
  assert.throws(() => nextLocationSequence(1, 0, []), /review/);
});
