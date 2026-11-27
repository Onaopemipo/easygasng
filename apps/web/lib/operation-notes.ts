import { z } from "zod";
import {
  operationNoteAuditText,
  operationNoteMode,
} from "../../../packages/business-rules/src/operation-notes";

export function operationNoteSchema(
  action: string,
  values: Record<string, any> = {},
  field = "reason",
  max = 500,
  min = 5,
) {
  const optional = operationNoteMode(action, field, values) === "optional";
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value, ctx) => {
      if (optional) return value || operationNoteAuditText(action, values);
      if (!value || value.length < min) {
        ctx.addIssue({
          code: "custom",
          message: `Enter at least ${min} characters explaining this exception or decision.`,
        });
        return z.NEVER;
      }
      return value;
    });
}
