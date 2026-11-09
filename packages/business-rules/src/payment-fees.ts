import { z } from "zod";
const minor = z.number().int().min(0).max(1_000_000_000_000);
export const paymentFeePolicy = z
  .object({
    version: z.number().int().positive(),
    currency: z.literal("NGN"),
    percentageBps: z.number().int().min(0).max(9999),
    fixedKobo: minor,
    fixedWaivedBelowKobo: minor,
    capKobo: minor.nullable(),
    rounding: z.enum(["ceil", "floor", "nearest"]),
    maximumGrossKobo: minor.refine((n) => n > 0),
    bearer: z.enum(["merchant", "customer"]),
  })
  .strict();
export type PaymentFeePolicy = z.infer<typeof paymentFeePolicy>;
export function providerFee(gross: number, policy: PaymentFeePolicy): number {
  const p = paymentFeePolicy.parse(policy);
  minor.parse(gross);
  if (gross === 0) return 0;
  const numerator = BigInt(gross) * BigInt(p.percentageBps),
    denominator = 10000n;
  const percentage =
    p.rounding === "ceil"
      ? (numerator + denominator - 1n) / denominator
      : p.rounding === "nearest"
        ? (numerator + denominator / 2n) / denominator
        : numerator / denominator;
  const fee =
    percentage + (gross < p.fixedWaivedBelowKobo ? 0n : BigInt(p.fixedKobo));
  return Number(
    p.capKobo === null
      ? fee
      : fee > BigInt(p.capKobo)
        ? BigInt(p.capKobo)
        : fee,
  );
}
export function quotePaymentFee(baseKobo: number, policy: PaymentFeePolicy) {
  const p = paymentFeePolicy.parse(policy);
  minor.parse(baseKobo);
  if (baseKobo > p.maximumGrossKobo)
    throw new Error("Payment exceeds approved maximum.");
  let gross = baseKobo;
  if (baseKobo > 0 && p.bearer === "customer") {
    const intervals: [[number, number], [number, number]] = [
      [baseKobo, Math.min(p.maximumGrossKobo, p.fixedWaivedBelowKobo - 1)],
      [Math.max(baseKobo, p.fixedWaivedBelowKobo), p.maximumGrossKobo],
    ];
    const candidates: number[] = [];
    for (let [lo, hi] of intervals) {
      if (lo > hi || hi - providerFee(hi, p) < baseKobo) continue;
      while (lo < hi) {
        const mid = lo + Math.floor((hi - lo) / 2);
        if (mid - providerFee(mid, p) >= baseKobo) hi = mid;
        else lo = mid + 1;
      }
      candidates.push(lo);
    }
    if (!candidates.length)
      throw new Error("No permitted gross covers the obligation.");
    gross = Math.min(...candidates);
  }
  const estimatedFeeKobo = providerFee(gross, p),
    expectedNetKobo = gross - estimatedFeeKobo;
  if (expectedNetKobo < 0)
    throw new Error("Provider fee exceeds the permitted charge.");
  return {
    currency: "NGN" as const,
    baseKobo,
    customerFeeKobo: gross - baseKobo,
    grossKobo: gross,
    estimatedFeeKobo,
    expectedNetKobo,
    policyVersion: p.version,
    policy: p,
  };
}
