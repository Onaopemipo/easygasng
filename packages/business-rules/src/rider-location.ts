import { recentTripFix, type Fix } from "./trip-metrics";

export type RiderFix = Fix & {
  expiresAt: string;
  source: "device_gps";
};

export const unavailableRiderLocation = {
  enabled: false,
  status: "unavailable",
  eta: null,
} as const;

export function withoutRiderLocations<T extends { gps?: unknown }>(
  orders: T[],
): T[] {
  return orders.map((order) => ({ ...order, gps: unavailableRiderLocation }));
}

export function riderObservation(
  fix: Fix,
  receivedAt: string,
  now: number,
  freshnessMs: number,
): RiderFix | null {
  const observed = Date.parse(fix.recordedAt);
  const received = Date.parse(receivedAt);
  const expires = observed + freshnessMs;
  if (
    !recentTripFix([fix], now, true, false) ||
    !Number.isFinite(received) ||
    received < observed ||
    received > now ||
    received - observed >= freshnessMs ||
    expires <= now
  )
    return null;
  return {
    ...fix,
    expiresAt: new Date(expires).toISOString(),
    source: "device_gps",
  };
}

export function implausibleRiderSegment(first: Fix, second: Fix) {
  const seconds =
    Math.abs(Date.parse(second.recordedAt) - Date.parse(first.recordedAt)) /
    1000;
  if (
    !Number.isFinite(seconds) ||
    seconds > 300 ||
    [first, second].some(
      ({ lat, lng, accuracy }) =>
        !Number.isFinite(lat) ||
        Math.abs(lat) > 90 ||
        !Number.isFinite(lng) ||
        Math.abs(lng) > 180 ||
        !Number.isFinite(accuracy) ||
        accuracy < 0 ||
        accuracy > 100,
    )
  )
    return false;

  const rad = Math.PI / 180;
  const arc =
    Math.sin(((second.lat - first.lat) * rad) / 2) ** 2 +
    Math.cos(first.lat * rad) *
      Math.cos(second.lat * rad) *
      Math.sin(((second.lng - first.lng) * rad) / 2) ** 2;
  const metres = 12742000 * Math.asin(Math.sqrt(Math.min(1, arc)));
  return metres - first.accuracy - second.accuracy > seconds * (150 / 3.6);
}
