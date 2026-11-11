export type GasPolicy = {
  minimumKg: number | null;
  maximumKg: number | null;
  incrementKg: number | null;
  precision: number | null;
  capacitiesKg: number[];
};
// Integer grams and BigInt kobo arithmetic; round half-up once per cylinder line.
export function grams(kg: number | string): number {
  const value = String(kg);
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(value))
    throw new Error("Enter kilograms with at most three decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const n = Number(whole) * 1000 + Number(fraction.padEnd(3, "0"));
  if (!Number.isSafeInteger(n) || n <= 0)
    throw new Error("Gas quantity must be positive.");
  return n;
}
export function gasLine(
  kg: number | string,
  capacity: number | string,
  priceKobo: number,
  policy?: GasPolicy,
) {
  const quantity = grams(kg),
    capacityGrams = grams(capacity);
  if (quantity > capacityGrams)
    throw new Error("Requested gas exceeds cylinder capacity.");
  if (!Number.isSafeInteger(priceKobo) || priceKobo <= 0)
    throw new Error("Gas pricing is unavailable.");
  if (policy) {
    if (
      policy.minimumKg === null ||
      policy.maximumKg === null ||
      policy.incrementKg === null ||
      policy.precision === null
    )
      throw new Error(
        "Business gas quantity limits must be configured before ordering.",
      );
    if (!policy.capacitiesKg.some((c) => grams(c) === capacityGrams))
      throw new Error("Choose an active supported cylinder capacity.");
    if (
      quantity < grams(policy.minimumKg) ||
      quantity > grams(policy.maximumKg) ||
      quantity % grams(policy.incrementKg) !== 0 ||
      quantity % 10 ** (3 - policy.precision) !== 0
    )
      throw new Error(
        "Gas quantity is outside the configured limits, increments or precision.",
      );
  }
  const kobo = Number((BigInt(quantity) * BigInt(priceKobo) + 500n) / 1000n);
  if (!Number.isSafeInteger(kobo) || kobo <= 0)
    throw new Error("Gas amount is outside supported limits.");
  return { grams: quantity, capacityGrams, subtotalKobo: kobo };
}

// Move along the same integer-gram grid enforced by gasLine.
export function nextGasQuantity(
  current: string | number,
  direction: -1 | 1,
  capacityKg: number,
  policy?: GasPolicy,
): number | null {
  if (
    !policy?.minimumKg ||
    !policy.maximumKg ||
    !policy.incrementKg ||
    !Number.isInteger(policy.precision) ||
    policy.precision! < 0 ||
    policy.precision! > 3 ||
    !policy.capacitiesKg.includes(capacityKg)
  )
    return null;
  const increment = grams(policy.incrementKg);
  const precision = 10 ** (3 - policy.precision!);
  let a = increment,
    b = precision;
  while (b) [a, b] = [b, a % b];
  const step = (increment / a) * precision;
  const min = Math.ceil(grams(policy.minimumKg) / step) * step;
  const max =
    Math.floor(Math.min(grams(capacityKg), grams(policy.maximumKg)) / step) *
    step;
  let mass = 0;
  try {
    mass = grams(current);
  } catch {}
  const next =
    direction === 1
      ? Math.max(min, (Math.floor(mass / step) + 1) * step)
      : Math.min(max, (Math.ceil(mass / step) - 1) * step);
  return next >= min && next <= max ? next / 1000 : null;
}

export function gasMoney(kobo: number | string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: Number(kobo) % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(kobo) / 100);
}
