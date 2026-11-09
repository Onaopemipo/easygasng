import { z } from "zod";
// Currency is integer kobo; basis points and integer division always round down.
// Expiry, tiers, service earning and welcome bonuses are not supported.
export const rewardsPolicy = z
  .object({
    serviceEarningEnabled: z.boolean().default(false),
    eligibleServiceIds: z.array(z.string().min(1).max(100)).max(50).default([]),
    offers: z
      .array(
        z
          .object({
            id: z.string().regex(/^[a-z0-9-]{2,60}$/),
            title: z.string().trim().min(3).max(100),
            description: z.string().max(500),
            points: z.number().int().positive().max(1000000),
            budgetKobo: z.number().int().positive().max(100000000000),
            maximumUsesPerCustomer: z.number().int().min(1).max(100),
            frequencyDays: z.number().int().min(1).max(365),
            startsAt: z.string().datetime(),
            expiresAt: z.string().datetime(),
            smartRefill: z.boolean(),
            active: z.boolean(),
          })
          .strict(),
      )
      .max(30)
      .default([]),
    earningEnabled: z.boolean(),
    redemptionEnabled: z.boolean(),
    spendPerPointKobo: z.number().int().min(100).max(100000000),
    discountPerPointKobo: z.number().int().min(1).max(10000),
    minimumPoints: z.number().int().min(1).max(1000000),
    maximumDiscountBps: z.number().int().min(1).max(10000),
    eligibleCategories: z
      .array(z.string().trim().min(1).max(100))
      .min(1)
      .max(30),
    referralPoints: z.number().int().min(0).max(100000),
    referralEnabled: z.boolean(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (new Set(p.offers.map((o) => o.id)).size !== p.offers.length)
      ctx.addIssue({ code: "custom", message: "Offer IDs must be unique" });
    if (p.referralEnabled && p.referralPoints <= 0)
      ctx.addIssue({
        code: "custom",
        message:
          "An enabled referral programme requires a positive approved bonus",
      });
    for (const o of p.offers)
      if (
        o.active &&
        (o.points < p.minimumPoints ||
          BigInt(o.budgetKobo) <
            BigInt(o.points) * BigInt(p.discountPerPointKobo))
      )
        ctx.addIssue({
          code: "custom",
          message:
            "Active offers must meet minimum points and fund at least one claim",
        });
    for (const o of p.offers)
      if (Date.parse(o.expiresAt) <= Date.parse(o.startsAt))
        ctx.addIssue({
          code: "custom",
          message: "Offer expiry must follow its start",
        });
  });
export type RewardsPolicy = z.infer<typeof rewardsPolicy>;
export function earnedPoints(eligibleKobo: bigint, spendPerPointKobo: number) {
  const result = eligibleKobo / BigInt(spendPerPointKobo);
  if (eligibleKobo < 0n || result > 2147483647n)
    throw new Error("Reward amount requires finance review.");
  return Number(result);
}
export const rewardsAdjustment = z
  .object({
    customerId: z.string().uuid(),
    points: z
      .number()
      .int()
      .min(-1000000)
      .max(1000000)
      .refine((n) => n !== 0, "Enter a nonzero adjustment"),
    reason: z.string().trim().min(10).max(1000),
    evidence: z.string().trim().min(10).max(2000),
  })
  .strict();

export const referralReview = z
  .object({
    attributionId: z.string().uuid(),
    state: z.enum(["held", "cleared", "blocked"]),
    reason: z.string().trim().min(10).max(2000),
  })
  .strict();
