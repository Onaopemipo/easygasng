export type Refill = {
  date: string;
  kg: number;
  verified: boolean;
  cylinderId: string;
};
export function forecast(
  refills: Refill[],
  cylinderId: string,
  now = new Date(),
) {
  const records = refills
    .filter(
      (r) =>
        r.verified &&
        r.cylinderId === cylinderId &&
        r.kg > 0 &&
        new Date(r.date) <= now,
    )
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (records.length < 2)
    return {
      available: false,
      reason:
        "At least two verified refills for this cylinder are needed for a personalised estimate.",
      confidence: "low" as const,
    };
  const intervals = records
    .slice(1)
    .map(
      (r, i) => (Date.parse(r.date) - Date.parse(records[i].date)) / 86400000,
    )
    .filter((d) => d >= 3 && d <= 180);
  if (intervals.length < 1)
    return {
      available: false,
      reason: "There is not enough consistent purchase history yet.",
      confidence: "low" as const,
    };
  const sorted = [...intervals].sort((a, b) => a - b),
    median = sorted[Math.floor(sorted.length / 2)];
  const clean = intervals.filter((d) => d >= median * 0.4 && d <= median * 2);
  const weighted =
    clean.reduce((sum, n, i) => sum + n * (i + 1), 0) /
    clean.reduce((sum, _, i) => sum + i + 1, 0);
  const last = Date.parse(records[records.length - 1].date),
    next = new Date(last + weighted * 86400000);
  const variability =
    Math.sqrt(
      clean.reduce((s, n) => s + (n - weighted) ** 2, 0) / clean.length,
    ) / weighted;
  return {
    available: true,
    nextDate: next.toISOString(),
    daysLeft: Math.max(
      0,
      Math.ceil((next.getTime() - now.getTime()) / 86400000),
    ),
    estimatedPercent: Math.round(
      Math.max(
        0,
        Math.min(
          100,
          (1 - (now.getTime() - last) / (weighted * 86400000)) * 100,
        ),
      ),
    ),
    preliminary: records.length < 4,
    sampleCount: records.length,
    basis: "verified purchase intervals" as const,
    confidence:
      records.length < 4
        ? ("low" as const)
        : clean.length >= 5 && variability < 0.2
          ? ("high" as const)
          : ("medium" as const),
    reason:
      records.length < 4
        ? "Preliminary low-confidence estimate from limited verified purchase history. This is not a sensor measurement or measured consumption."
        : "Estimate based on recent verified refill intervals. This is not a sensor measurement.",
  };
}
export const orderTransitions: Record<string, string[]> = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["assigned", "cancelled"],
  assigned: ["out_for_delivery", "delivery_failed"],
  out_for_delivery: ["delivered", "delivery_failed"],
  delivery_failed: ["assigned", "cancelled"],
  delivered: [],
  cancelled: [],
};
