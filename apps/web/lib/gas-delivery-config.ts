import { z } from "zod";
import { one, type SQL, type Row } from "./db";
import { AppError, type Actor } from "./auth";
import { grams } from "../../../packages/business-rules/src/gas-pricing";
export const locationConfig = z
  .object({
    name: z.string().trim().min(2).max(100),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    country: z.string().min(2).max(100),
    branchId: z.string().min(1).max(100),
    active: z.boolean(),
    visible: z.boolean(),
    archived: z.boolean(),
    displayOrder: z.number().int().min(0).max(10000),
    requiresAddressConfirmation: z.boolean().default(true),
    coverage: z.string().max(2000).default(""),
    description: z.string().max(1000).default(""),
  })
  .strict()
  .refine(
    (v) => !v.archived || (!v.active && !v.visible),
    "Archived locations must be inactive and hidden.",
  );
export const gasPolicyConfig = z
  .object({
    minimumKg: z.number().positive().max(1000).nullable(),
    maximumKg: z.number().positive().max(1000).nullable(),
    incrementKg: z.number().positive().max(1000).nullable(),
    precision: z.number().int().min(0).max(3).nullable(),
    capacitiesKg: z.array(z.number().positive().max(1000)).min(1).max(50),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (new Set(v.capacitiesKg).size !== v.capacitiesKg.length)
      ctx.addIssue({
        code: "custom",
        message: "Cylinder capacities must be distinct.",
      });
    if (
      v.minimumKg !== null &&
      v.maximumKg !== null &&
      v.minimumKg > v.maximumKg
    )
      ctx.addIssue({
        code: "custom",
        message: "Minimum must not exceed maximum.",
      });
    try {
      for (const n of [
        ...v.capacitiesKg,
        v.minimumKg,
        v.maximumKg,
        v.incrementKg,
      ])
        if (n !== null) grams(n);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Use at most three decimal places for kilograms.",
      });
    }
  });
export function validateGasSetting(d: Row, value: any) {
  if (d.value_type === "location") locationConfig.parse(value);
  if (d.value_type === "gas_policy") gasPolicyConfig.parse(value);
}
export async function applyGasSetting(tx: SQL, user: Actor, r: Row) {
  if (r.key.startsWith("location.")) {
    const v = locationConfig.parse(r.proposed_value);
    if (v.branchId !== r.scope)
      throw new AppError(403, "Location branch must match approval scope.");
    const result = await tx.query(
      "UPDATE delivery_locations SET name=$1,city=$2,state=$3,country=$4,active=$5,visible=$6,archived=$7,display_order=$8,coverage=$9,description=$10,version=version+1,updated_at=now() WHERE id=$11 AND branch_id=$12 RETURNING id",
      [
        v.name,
        v.city,
        v.state,
        v.country,
        v.active,
        v.visible,
        v.archived,
        v.displayOrder,
        v.coverage,
        v.description,
        r.key.slice(9),
        r.scope,
      ],
    );
    if (!result.rows.length)
      throw new AppError(409, "Location record missing.");
    if (!v.active || v.archived)
      await tx.query(
        "UPDATE orders SET operational_review='Delivery location is no longer active; review fulfilment with the customer.' WHERE location_id=$1 AND status NOT IN ('cancelled','delivered')",
        [r.key.slice(9)],
      );
  }
}
