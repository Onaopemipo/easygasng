import { z } from "zod";
export const serviceConfig = z
  .object({
    name: z.string().trim().min(3).max(100),
    description: z.string().trim().min(10).max(2000),
    active: z.boolean(),
    pricingModel: z.enum([
      "fixed",
      "starting",
      "quote",
      "labour_materials",
      "custom",
    ]),
    priceKobo: z.number().int().min(0).max(100000000).nullable(),
    calloutKobo: z.number().int().min(0).max(10000000),
    durationMinutes: z.number().int().min(15).max(480),
    zones: z.array(z.string().trim().min(2).max(100)).max(50),
    qualification: z.string().regex(/^[a-z][a-z0-9_]{2,60}$/),
    preparation: z.string().min(5).max(2000),
    safety: z.string().min(5).max(2000),
    cancellationHours: z.number().int().min(0).max(168),
    warranty: z.string().min(5).max(2000),
    inclusions: z.string().min(5).max(2000),
    exclusions: z.string().min(5).max(2000),
  })
  .strict()
  .refine(
    (v) =>
      !v.active ||
      (v.zones.length > 0 &&
        (v.pricingModel !== "fixed" || v.priceKobo !== null)),
    "Active services require areas and configured fixed pricing where applicable.",
  );
export const checklistConfig = z
  .array(
    z.object({
      id: z.string().regex(/^[a-z][a-z0-9_-]{1,60}$/),
      label: z.string().min(5).max(250),
      required: z.boolean(),
    }),
  )
  .min(1)
  .max(40)
  .refine(
    (v) => new Set(v.map((x) => x.id)).size === v.length,
    "Checklist identifiers must be unique.",
  )
  .refine(
    (v) => v.some((x) => x.required),
    "At least one safety check must be mandatory.",
  );
