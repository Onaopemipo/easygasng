import { z } from "zod";
const n = z.number().int().nonnegative().max(1000000);
export const serviceMaterialRecovery = z
  .object({
    bookingId: z.string().uuid(),
    bookingVersion: z.number().int().positive(),
    materialId: z.string().uuid(),
    issuedQuantity: n,
    unitCostKobo: z.number().int().nonnegative().nullable(),
    used: n,
    damaged: n,
    missing: n,
    returned: n,
    damagedReturned: n,
    evidence: z.string().trim().min(10).max(1000),
    reason: z.string().trim().min(10).max(1000),
  })
  .strict()
  .refine(
    (d) =>
      d.used + d.damaged + d.missing + d.returned === d.issuedQuantity &&
      d.damagedReturned <= d.damaged,
    "Issued stock must equal actual used, damaged, missing and safe returned stock",
  );
