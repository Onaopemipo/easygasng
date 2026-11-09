import test from "node:test";
import assert from "node:assert/strict";
import {
  reconcileTripGPS,
  type TripRecoveryRecord,
} from "../packages/business-rules/src/trip-recovery";
const rec = (id: string, trip = "trip-a"): TripRecoveryRecord => ({
  id,
  userId: "driver-a",
  tripId: trip,
  operationKey: id,
  sequence: 1,
  kind: "gps",
  recordedAt: "2026-11-09T00:00:00Z",
  payload: { lat: 6.4, lng: 3.4, accuracy: 4 },
});
test("GPS-REC01: committed lost response clears only acknowledged evidence without replay or timestamp changes", async () => {
  const e = rec("one"),
    acked: string[] = [];
  let sends = 0;
  const result = await reconcileTripGPS([e], "driver-a", {
    api: async (a) => {
      sends++;
      assert.match(a, /tracking.operation/);
      return {
        status: "COMMITTED",
        action: "trip.sync",
        result: { results: [{ id: e.id, accepted: true }] },
      };
    },
    ack: async (e) => {
      acked.push(e.id);
    },
    review: async () => {
      throw Error("no conflict");
    },
  });
  assert.equal(result.sent, 1);
  assert.equal(sends, 1);
  assert.deepEqual(acked, ["one"]);
  assert.equal(e.recordedAt, "2026-11-09T00:00:00Z");
});
test("GPS-REC02: conflicted trip is held while independent trip sync continues; non-GPS is untouched", async () => {
  const reviews: string[] = [],
    acked: string[] = [],
    sent: string[] = [];
  const result = await reconcileTripGPS(
    [
      rec("one"),
      rec("two"),
      rec("three", "trip-b"),
      { ...rec("fuel"), kind: "fuel" },
    ],
    "driver-a",
    {
      api: async (a, d) => {
        if (a.startsWith("tracking.operation")) return { status: "NOT_FOUND" };
        sent.push(d.events[0].id);
        if (d.tripId === "trip-a")
          throw Object.assign(Error("Trip ended"), { status: 409 });
        return {};
      },
      ack: async (e) => {
        acked.push(e.id);
      },
      review: async (e) => {
        reviews.push(e.id);
      },
    },
  );
  assert.deepEqual(reviews, ["one"]);
  assert.deepEqual(acked, ["three"]);
  assert.deepEqual(sent, ["one", "three"]);
  assert.equal(result.conflicts.length, 1);
});
test("GPS-REC03: unknown commit, revoked authority and wrong account retain all unacknowledged evidence", async () => {
  let ack = 0,
    review = 0;
  const io = {
    ack: async () => {
      ack++;
    },
    review: async () => {
      review++;
    },
    api: async () => {
      throw Error("network disconnected");
    },
  };
  const pending = await reconcileTripGPS(
    [rec("one"), rec("two", "trip-b")],
    "driver-a",
    io,
  );
  assert.equal(pending.sent, 0);
  assert.equal(pending.conflicts.length, 1);
  await assert.rejects(
    () =>
      reconcileTripGPS([rec("one")], "driver-a", {
        ...io,
        api: async () => {
          throw Object.assign(Error("revoked"), { status: 403 });
        },
      }),
    /revoked/,
  );
  await assert.rejects(
    () => reconcileTripGPS([rec("one")], "other", io),
    /identity conflict/,
  );
  assert.equal(ack, 0);
  assert.equal(review, 0);
});
test("GPS-REC04: an unrelated committed receipt never discards a different observation", async () => {
  let ack = 0,
    review = 0;
  const result = await reconcileTripGPS([rec("one")], "driver-a", {
    api: async () => ({
      status: "COMMITTED",
      action: "trip.sync",
      result: { results: [{ id: "other", accepted: true }] },
    }),
    ack: async () => {
      ack++;
    },
    review: async () => {
      review++;
    },
  });
  assert.equal(ack, 0);
  assert.equal(review, 1);
  assert.equal(result.sent, 0);
});
