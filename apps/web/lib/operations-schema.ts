import { z } from "zod";
export const retentionPolicy = z
  .object({
    enabled: z.boolean(),
    atRiskDays: z.number().int().min(7).max(365),
    dormantDays: z.number().int().min(8).max(730),
    monthlyBudgetKobo: z.number().int().min(0).max(100000000),
    costCeilingPerMessageKobo: z.number().int().min(0).max(100000),
  })
  .strict()
  .refine(
    (v) => v.dormantDays > v.atRiskDays,
    "Dormant threshold must exceed at-risk threshold",
  )
  .refine(
    (v) =>
      !v.enabled ||
      (v.monthlyBudgetKobo > 0 && v.costCeilingPerMessageKobo > 0),
    "Enabled win-back requires an approved positive budget and per-message cost ceiling",
  );
