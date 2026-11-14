import { z } from "zod";
import { staffRoles } from "../../../packages/business-rules/src/staff-roles";
import {
  canGrantStaffPrivilege,
  privilegeById,
  staffPrivileges,
} from "../../../packages/business-rules/src/staff-privileges";
import { AppError } from "./auth";

export const staffInvitationAccess = z
  .object({
    role: z.enum(staffRoles),
    changes: z
      .array(
        z
          .object({
            privilege: z.string().max(100),
            effect: z.enum(["grant", "deny"]),
          })
          .strict(),
      )
      .max(staffPrivileges.length)
      .default([]),
  })
  .strict();

export function validateInvitationAccess(input: unknown, branchId: string) {
  const plan = staffInvitationAccess.parse(input);
  if (
    new Set(plan.changes.map((c) => c.privilege)).size !== plan.changes.length
  )
    throw new AppError(400, "Choose each privilege once.");
  for (const change of plan.changes) {
    const privilege = privilegeById.get(change.privilege);
    if (!privilege) throw new AppError(400, "Choose a recognised privilege.");
    if (
      change.effect === "grant" &&
      !canGrantStaffPrivilege(privilege, plan.role, branchId)
    )
      throw new AppError(
        403,
        "This privilege cannot be granted to the selected role.",
      );
  }
  return plan;
}
