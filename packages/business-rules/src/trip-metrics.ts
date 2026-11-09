export type Fix = {
  lat: number;
  lng: number;
  accuracy: number;
  recordedAt: string;
};
/** An uploaded point is recent evidence only, never a promise of live tracking. */
export function recentTripFix(
  fixes: Fix[],
  now: number,
  locationConsent: boolean,
  ended: boolean,
): Fix | null {
  if (!locationConsent || ended || !Number.isFinite(now)) return null;
  return fixes.reduce<Fix | null>((latest, fix) => {
    const at = Date.parse(fix.recordedAt);
    if (
      !Number.isFinite(at) ||
      at > now ||
      now - at >= 120_000 ||
      !Number.isFinite(fix.lat) ||
      Math.abs(fix.lat) > 90 ||
      !Number.isFinite(fix.lng) ||
      Math.abs(fix.lng) > 180 ||
      !Number.isFinite(fix.accuracy) ||
      fix.accuracy < 0 ||
      fix.accuracy > 100
    )
      return latest;
    return !latest || at > Date.parse(latest.recordedAt) ? fix : latest;
  }, null);
}
export function tripMetrics(
  fixes: Fix[],
  start: number,
  end: number | null,
  rate: number | null,
) {
  const sorted = [...fixes].sort(
    (a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt),
  );
  let km = 0,
    gaps = 0,
    rejected = 0,
    previous: Fix | undefined;
  for (const f of sorted) {
    if (
      !Number.isFinite(f.lat) ||
      Math.abs(f.lat) > 90 ||
      !Number.isFinite(f.lng) ||
      Math.abs(f.lng) > 180 ||
      !Number.isFinite(f.accuracy) ||
      f.accuracy < 0 ||
      f.accuracy > 100 ||
      !Number.isFinite(Date.parse(f.recordedAt))
    ) {
      rejected++;
      previous = undefined;
      continue;
    }
    if (previous) {
      const seconds =
        (Date.parse(f.recordedAt) - Date.parse(previous.recordedAt)) / 1000;
      if (seconds <= 0) {
        rejected++;
        continue;
      }
      if (seconds > 300) {
        gaps++;
        previous = f;
        continue;
      }
      const rad = (n: number) => (n * Math.PI) / 180,
        a =
          Math.sin(rad(f.lat - previous.lat) / 2) ** 2 +
          Math.cos(rad(f.lat)) *
            Math.cos(rad(previous.lat)) *
            Math.sin(rad(f.lng - previous.lng) / 2) ** 2;
      const distance =
        6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
      if ((distance / seconds) * 3600 > 150) {
        rejected++;
        previous = undefined;
        continue;
      }
      km += distance;
    }
    previous = f;
  }
  const odometer = end !== null && end >= start ? end - start : null;
  return {
    gpsObservedKm: Math.round(km * 1000) / 1000,
    odometerKm: odometer,
    gaps,
    rejected,
    estimatedLitres: rate && odometer !== null ? (odometer * rate) / 100 : null,
    fuelBasis:
      "Estimate from approved vehicle rate; recorded fuel purchases are separate",
    live: false,
  };
}

/** Historical location is never made recent by a later upload timestamp. */
export function tripLocationEvidence(
  fixes: (Fix & { receivedAt?: string })[],
  now: number,
  consent: boolean,
  ended: boolean,
) {
  const valid = fixes.filter(
    (f) =>
      Number.isFinite(Date.parse(f.recordedAt)) &&
      Date.parse(f.recordedAt) <= now &&
      Number.isFinite(f.lat) &&
      Math.abs(f.lat) <= 90 &&
      Number.isFinite(f.lng) &&
      Math.abs(f.lng) <= 180 &&
      Number.isFinite(f.accuracy) &&
      f.accuracy >= 0 &&
      f.accuracy <= 100,
  );
  const last = valid.reduce<(Fix & { receivedAt?: string }) | null>(
    (a, b) =>
      !a || Date.parse(b.recordedAt) > Date.parse(a.recordedAt) ? b : a,
    null,
  );
  return {
    status: ended
      ? "trip_ended"
      : recentTripFix(valid, now, consent, ended)
        ? "recent_observation"
        : last
          ? "last_known_only"
          : "unavailable",
    live: false,
    history: [...valid]
      .sort((a, b) => Date.parse(a.recordedAt) - Date.parse(b.recordedAt))
      .slice(-200),
    historyTruncated: valid.length > 200,
    recordedPointCount: valid.length,
    lastKnown: last
      ? {
          ...last,
          ageSeconds: Math.max(
            0,
            Math.floor((now - Date.parse(last.recordedAt)) / 1000),
          ),
          delayedUpload: Boolean(
            last.receivedAt &&
              Date.parse(last.receivedAt) - Date.parse(last.recordedAt) >
                120000,
          ),
        }
      : null,
  };
}
