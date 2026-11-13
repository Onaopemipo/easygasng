import { z } from "zod";
import {
  staffPrivileges,
  privilegeById,
  privilegeForAction,
  isBusinessStaff,
} from "../../../packages/business-rules/src/staff-privileges";
import { AppError, recentVerification, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { audit } from "./governance";
export function enforceStaffPrivilege(user: Actor, action: string) {
  delete user.operation_grant_role;
  const p = privilegeForAction(action);
  if (!p) return;
  const effect = user.privilege_overrides?.[p.id];
  if (effect === "deny")
    throw new AppError(
      403,
      "Access to this operation has been revoked. Contact your administrator.",
      "PRIVILEGE_REVOKED",
    );
  if (
    effect === "grant" &&
    p.grantRole &&
    isBusinessStaff(user.role) &&
    user.branch_id
  )
    user.operation_grant_role = p.grantRole;
}
function administration(user: Actor) {
  // Explicit administrative identity: an operation grant can never grant privilege administration.
  if (user.role !== "owner")
    throw new AppError(
      403,
      "Only the Business Owner or an administrator can manage individual privileges.",
    );
  recentVerification(user);
}
async function target(tx: SQL, user: Actor, userId: string, lock = false) {
  const t = await one(
    tx,
    "SELECT id,name,email,role,branch_id,active FROM users WHERE id=$1" +
      (lock ? " FOR UPDATE" : ""),
    [userId],
  );
  if (!t) throw new AppError(404, "Account not found.");
  if (t.id === user.id)
    throw new AppError(
      403,
      "Ask another authorised administrator to change your privileges. You cannot change your own access.",
    );
  return t;
}
export async function staffPrivilegeAction(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  administration(user);
  if (action === "staff.privileges") {
    const d = z.object({ userId: z.string().uuid() }).strict().parse(input),
      t = await target(tx, user, d.userId);
    const records = (
      await tx.query(
        "SELECT privilege,effect,role_at_change,branch_at_change,invalidated_at FROM staff_privilege_overrides WHERE user_id=$1",
        [t.id],
      )
    ).rows;
    const stale = new Set(
      records
        .filter(
          (r) =>
            r.effect === "grant" &&
            (r.invalidated_at || r.role_at_change !== t.role || r.branch_at_change !== t.branch_id),
        )
        .map((r) => r.privilege),
    );
    const overrides = Object.fromEntries(
      records
        .filter((r) => !stale.has(r.privilege))
        .map((r) => [r.privilege, r.effect]),
    );
    return {
      user: t,
      version: Number(
        (
          await one(
            tx,
            "SELECT version FROM staff_privilege_versions WHERE user_id=$1",
            [t.id],
          )
        )?.version ?? 0,
      ),
      privileges: staffPrivileges.map((p) => ({
        ...p,
        stale: stale.has(p.id),
        effect: overrides[p.id] ?? "default",
        roleDefault: p.roles.includes(t.role),
        canGrant:
          p.roles.includes(t.role) ||
          Boolean(p.grantRole && isBusinessStaff(t.role) && t.branch_id),
        effective:
          overrides[p.id] === "deny"
            ? false
            : overrides[p.id] === "grant" &&
                (p.roles.includes(t.role) ||
                  Boolean(
                    p.grantRole && isBusinessStaff(t.role) && t.branch_id,
                  ))
              ? true
              : p.roles.includes(t.role),
      })),
      history: (
        await tx.query(
          "SELECT a.created_at,a.detail,u.name AS actor FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id WHERE a.target=$1 AND a.action='staff.privileges.changed' ORDER BY a.created_at DESC LIMIT 20",
          [t.id],
        )
      ).rows,
    };
  }
  const d = z
    .object({
      userId: z.string().uuid(),
      version: z.number().int().min(0),
      changes: z
        .array(
          z
            .object({
              privilege: z.string().max(100),
              effect: z.enum(["grant", "deny", "default"]),
            })
            .strict(),
        )
        .min(1)
        .max(staffPrivileges.length),
      reason: z.string().trim().min(10).max(1000),
    })
    .strict()
    .parse(input);
  if (new Set(d.changes.map((c) => c.privilege)).size !== d.changes.length)
    throw new AppError(400, "Choose each privilege once.");
  const t = await target(tx, user, d.userId, true),
    v = Number(
      (
        await one(
          tx,
          "SELECT version FROM staff_privilege_versions WHERE user_id=$1",
          [t.id],
        )
      )?.version ?? 0,
    );
  if (v !== d.version)
    throw new AppError(
      409,
      "Privileges changed since you opened this page. Close and reopen it to review the latest access.",
      "STALE_VERSION",
    );
  const before = (
    await tx.query(
      "SELECT privilege,effect FROM staff_privilege_overrides WHERE user_id=$1 ORDER BY privilege",
      [t.id],
    )
  ).rows;
  for (const c of d.changes) {
    const p = privilegeById.get(c.privilege);
    if (!p) throw new AppError(400, "Choose a recognised privilege.");
    if (
      c.effect === "grant" &&
      p.grantRole &&
      !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
        t.branch_id,
      ]))
    )
      throw new AppError(
        403,
        "Assign an active branch before granting business privileges.",
      );
    if (
      c.effect === "grant" &&
      !p.roles.includes(t.role) &&
      !(p.grantRole && isBusinessStaff(t.role) && t.branch_id)
    )
      throw new AppError(
        403,
        "This privilege requires an approved role or a qualified field identity. Change the role through the existing approval workflow.",
      );
    if (c.effect === "default")
      await tx.query(
        "DELETE FROM staff_privilege_overrides WHERE user_id=$1 AND privilege=$2",
        [t.id, p.id],
      );
    else
      await tx.query(
        "INSERT INTO staff_privilege_overrides(user_id,privilege,effect,changed_by,role_at_change,branch_at_change) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id,privilege) DO UPDATE SET effect=excluded.effect,changed_by=excluded.changed_by,role_at_change=excluded.role_at_change,branch_at_change=excluded.branch_at_change,invalidated_at=NULL,changed_at=now()",
        [t.id, p.id, c.effect, user.id, t.role, t.branch_id],
      );
  }
  await tx.query(
    "INSERT INTO staff_privilege_versions(user_id,version) VALUES($1,1) ON CONFLICT(user_id) DO UPDATE SET version=staff_privilege_versions.version+1",
    [t.id],
  );
  await audit(tx, user, "staff.privileges.changed", t.id, "success", {
    before,
    changes: d.changes,
    reason: d.reason,
    version: v + 1,
    targetRole: t.role,
    targetBranch: t.branch_id,
  });
  return {
    ok: true,
    version: v + 1,
    message:
      "Privileges updated. Changes apply to the next request, including existing signed-in sessions.",
  };
}
