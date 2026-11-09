import { z } from "zod";
export const dispatchRoutingPolicy = z
  .object({
    enabled: z.boolean(),
    fuelKoboPerLitre: z.number().int().positive().max(10000000).nullable(),
    operatingKoboPerKm: z.number().int().min(0).max(10000000).nullable(),
    stopMinutes: z.number().int().min(0).max(240).nullable(),
    maxSnapMetres: z.number().positive().max(1000).nullable(),
  })
  .strict()
  .refine(
    (p) =>
      !p.enabled ||
      Object.entries(p).every(([k, v]) => k === "enabled" || v !== null),
    "Enabled routing requires explicit approved rates, stop allowance and snap limit",
  );
