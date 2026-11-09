export function deliveryDeadline(date: string, window: string): number {
  const m = /^(\d{2}):(\d{2})[–-](\d{2}):(\d{2})$/.exec(window);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !m)
    throw new Error("A dated numeric delivery window is required");
  const [h1, m1, h2, m2] = m.slice(1).map(Number);
  if (h1 > 23 || h2 > 23 || m1 > 59 || m2 > 59 || h2 * 60 + m2 <= h1 * 60 + m1)
    throw new Error("Invalid delivery window");
  const at = Date.parse(`${date}T${m[3]}:${m[4]}:00+01:00`);
  if (
    !Number.isFinite(at) ||
    new Date(at + 3600000).toISOString().slice(0, 10) !== date
  )
    throw new Error("Invalid delivery date");
  return at;
}
export function routePlan(
  stops: { id: string; deadline: number }[],
  legs: { distance: number; duration: number }[],
  start: number,
  policy: {
    stopMinutes: number;
    fuelKoboPerLitre: number;
    operatingKoboPerKm: number;
  },
  litresPer100km: number,
) {
  if (
    !stops.length ||
    stops.length !== legs.length ||
    !Number.isFinite(start) ||
    !Number.isFinite(litresPer100km) ||
    litresPer100km <= 0
  )
    throw new Error("Invalid route basis");
  let metres = 0,
    seconds = 0,
    at = start;
  const visits = stops.map((s, i) => {
    const leg = legs[i];
    if (
      ![leg.distance, leg.duration].every(
        (n) => Number.isFinite(n) && n >= 0,
      ) ||
      leg.distance > 2000000 ||
      leg.duration > 604800
    )
      throw new Error("Invalid road leg");
    metres += leg.distance;
    seconds += leg.duration;
    at += leg.duration * 1000;
    const arrivalAt = new Date(at).toISOString(),
      slackSeconds = Math.floor((s.deadline - at) / 1000);
    at += policy.stopMinutes * 60000;
    return { orderId: s.id, arrivalAt, slackSeconds };
  });
  const operatingKobo = Math.ceil(
    (metres / 1000) *
      (policy.operatingKoboPerKm +
        (litresPer100km / 100) * policy.fuelKoboPerLitre),
  );
  if (!Number.isSafeInteger(operatingKobo) || operatingKobo < 0)
    throw new Error("Invalid cost basis");
  return {
    metres,
    seconds,
    operatingKobo,
    visits,
    lateStops: visits.filter((v) => v.slackSeconds < 0).length,
    finishedAt: new Date(at).toISOString(),
    basis:
      "Whole planned road route; deadline order; no live traffic guarantee; never a customer fee",
  };
}
