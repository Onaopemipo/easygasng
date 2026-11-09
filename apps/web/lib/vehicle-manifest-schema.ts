import { z } from "zod";
export const manifestReturn = z
  .object({
    manifestId: z.string().uuid(),
    version: z.number().int().positive(),
    foundQuantity: z.number().int().nonnegative().max(10000),
    saleableQuantity: z.number().int().nonnegative().max(10000),
    foundSerialIds: z.array(z.string().uuid()).max(10000).default([]),
    saleableSerialIds: z.array(z.string().uuid()).max(10000).default([]),
    evidence: z.string().trim().min(10).max(1000),
    reason: z.string().trim().min(10).max(1000),
  })
  .strict()
  .refine(
    (d) =>
      d.saleableQuantity <= d.foundQuantity &&
      new Set(d.foundSerialIds).size === d.foundSerialIds.length &&
      new Set(d.saleableSerialIds).size === d.saleableSerialIds.length &&
      d.saleableSerialIds.every((s) => d.foundSerialIds.includes(s)),
    "Found/saleable quantities and distinct serials must reconcile",
  );
export const vehiclePayload = z
  .object({
    vehicleId: z.string().uuid(),
    physicalCapacityGrams: z.number().int().positive().max(10000000),
    evidence: z.string().trim().min(10).max(1000),
  })
  .strict();
