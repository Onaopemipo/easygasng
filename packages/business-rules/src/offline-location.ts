export const locationLeaseMs = 8 * 60 * 60 * 1000;
export type LocationLease = {
  userId: string;
  tripId: string;
  nextSequence: number;
  startedAt: string;
  expiresAt: number;
};
export function authorisedOfflineFix(
  lease: LocationLease,
  fix: {
    timestamp: number;
    coords: { latitude: number; longitude: number; accuracy: number | null };
  },
  now: number,
) {
  return (
    Number.isFinite(now) &&
    Number.isFinite(lease.expiresAt) &&
    lease.expiresAt > now &&
    Number.isFinite(fix.timestamp) &&
    fix.timestamp >= Date.parse(lease.startedAt) &&
    fix.timestamp <= now &&
    Number.isFinite(fix.coords.latitude) &&
    Math.abs(fix.coords.latitude) <= 90 &&
    Number.isFinite(fix.coords.longitude) &&
    Math.abs(fix.coords.longitude) <= 180 &&
    fix.coords.accuracy !== null &&
    Number.isFinite(fix.coords.accuracy) &&
    fix.coords.accuracy >= 0 &&
    fix.coords.accuracy <= 10000
  );
}

/** Persistent high-water marks survive an emptied, successfully uploaded queue. */
export function nextLocationSequence(
  serverNext: number,
  persistedNext: number,
  queuedNext: number[],
) {
  const values = [serverNext, persistedNext, ...queuedNext];
  if (values.some((v) => !Number.isSafeInteger(v) || v < 1 || v >= 2147483647))
    throw new Error("GPS sequence needs review; records retained.");
  return Math.max(...values);
}
