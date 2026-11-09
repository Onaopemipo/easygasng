import assert from "node:assert/strict";
import test from "node:test";
import { recentTripFix } from "../packages/business-rules/src/trip-metrics";

test("FIELD-GPS-01: recent location excludes future, stale, inaccurate, invalid and off-duty evidence regardless of upload order", () => {
  const now = Date.parse("2026-11-06T10:00:00Z");
  const point = {
    lat: 6.45,
    lng: 3.4,
    accuracy: 10,
    recordedAt: "2026-11-06T09:59:50Z",
  };
  const old = { ...point, recordedAt: "2026-11-06T09:58:00Z" };
  const future = { ...point, recordedAt: "2026-11-06T10:00:01Z" };
  const inaccurate = { ...point, accuracy: 101 };
  const invalid = { ...point, lng: Number.NaN };
  assert.equal(
    recentTripFix([point, old, future, inaccurate, invalid], now, true, false),
    point,
  );
  assert.equal(
    recentTripFix([old, future, inaccurate, invalid], now, true, false),
    null,
  );
  assert.equal(recentTripFix([point], now, false, false), null);
  assert.equal(recentTripFix([point], now, true, true), null);
  assert.equal(recentTripFix([point], Number.NaN, true, false), null);
  const earlier = { ...point, recordedAt: "2026-11-06T09:59:30Z" };
  assert.equal(recentTripFix([point, earlier], now, true, false), point);
  assert.equal(recentTripFix([earlier, point], now, true, false), point);
});
