import { accountRoles } from "../../../packages/business-rules/src/staff-roles";
import { z } from "zod";
import { one, type SQL } from "./db";
import { allow, AppError, recentVerification, type Actor } from "./auth";
import { audit, propose } from "./governance";
export async function staffAction(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
): Promise<any> {
  if (action === "staff.manage") {
    allow(user, ["owner", "manager"]);
    const global = user.role === "owner",
      args = global ? [] : [user.branch_id];
    return {
      people: (
        await tx.query(
          `SELECT DISTINCT u.id,u.name,u.email,u.role,u.branch_id,u.active,(SELECT max(a.created_at) FROM audit_events a WHERE a.action='auth.signed_in' AND a.target=u.id AND a.outcome='success') AS last_login FROM users u WHERE (u.role NOT IN ('customer','commercial') OR EXISTS(SELECT 1 FROM staff_invitations i WHERE i.email=u.email AND i.accepted_at IS NOT NULL)) AND ${global ? "true" : "u.branch_id=$1"} ORDER BY u.name`,
          args,
        )
      ).rows,
      accessRequests: (
        await tx.query(
          `SELECT r.id,r.status,r.proposed_value,r.created_at,u.name AS requester FROM change_requests r JOIN users u ON u.id=r.requester_id WHERE r.key='security.permissions' AND ${global ? "true" : "r.scope=$1 AND r.requester_id=$2"} ORDER BY r.created_at DESC LIMIT 100`,
          global ? [] : [user.branch_id, user.id],
        )
      ).rows,
      invitations: (
        await tx.query(
          `SELECT i.id,i.name,i.email,i.branch_id,i.expires_at,i.accepted_at FROM staff_invitations i WHERE ${global ? "true" : "i.branch_id=$1"} ORDER BY i.created_at DESC LIMIT 200`,
          args,
        )
      ).rows,
      branches: (
        await tx.query(
          `SELECT id,name,active FROM branches WHERE ${global ? "true" : "id=$1"} ORDER BY name`,
          args,
        )
      ).rows,
    };
  }
  if (action === "staff.lookup") {
    allow(user, ["owner", "manager"]);
    const d = z
      .object({ email: z.email().transform((v) => v.trim().toLowerCase()) })
      .strict()
      .parse(input);
    const target = await one(
      tx,
      "SELECT id,name,email,role,branch_id,active FROM users WHERE email=$1",
      [d.email],
    );
    if (
      !target ||
      (user.role !== "owner" &&
        target.branch_id &&
        target.branch_id !== user.branch_id)
    )
      throw new AppError(404, "No eligible account found in your branch.");
    return target;
  }
  if (action === "staff.edit") {
    allow(user, ["owner", "manager"]);
    recentVerification(user);
    const d = z
      .object({
        userId: z.string().uuid(),
        name: z.string().trim().min(2).max(100),
        reason: z.string().trim().min(10).max(1000),
      })
      .strict()
      .parse(input);
    const t = await one(
      tx,
      "SELECT id,role,branch_id,name FROM users WHERE id=$1 FOR UPDATE",
      [d.userId],
    );
    if (!t) throw new AppError(404, "Staff account not found.");
    if (user.role !== "owner" && t.branch_id !== user.branch_id)
      throw new AppError(403, "This record belongs to another branch.");
    allow(user, ["owner", "manager"], t.branch_id);
    if (
      (t.role === "owner" && user.role !== "owner") ||
      (["customer", "commercial"].includes(t.role) &&
        !(await one(
          tx,
          "SELECT id FROM staff_invitations WHERE email=(SELECT email FROM users WHERE id=$1) AND accepted_at IS NOT NULL",
          [t.id],
        )))
    )
      throw new AppError(
        403,
        "This account is outside staff profile management.",
      );
    await tx.query("UPDATE users SET name=$1 WHERE id=$2", [d.name, t.id]);
    await audit(tx, user, "staff.profile_updated", t.id, "success", {
      previousName: t.name,
      reason: d.reason,
    });
    return { ok: true };
  }
  if (action === "staff.reinstate") {
    allow(user, ["owner"]);
    recentVerification(user);
    const d = z
      .object({
        userId: z.string().uuid(),
        reason: z.string().trim().min(10).max(1000),
      })
      .strict()
      .parse(input);
    const t = await one(tx, "SELECT * FROM users WHERE id=$1 FOR UPDATE", [
      d.userId,
    ]);
    if (
      !t ||
      t.role === "owner" ||
      ["customer", "commercial"].includes(t.role) ||
      t.id === user.id
    )
      throw new AppError(403, "Choose an eligible suspended staff account.");
    if (t.active) return { ok: true };
    await tx.query("UPDATE users SET active=true WHERE id=$1", [t.id]);
    await tx.query(
      "UPDATE sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
      [t.id],
    );
    await audit(tx, user, "staff.reinstated", t.id, "success", {
      reason: d.reason,
    });
    return { ok: true };
  }
  if (action === "staff.access.request") {
    allow(user, ["owner", "manager"]);
    recentVerification(user);
    const d = z
      .object({
        userId: z.string().uuid(),
        role: z.enum(accountRoles),
        branchId: z.string().min(1).max(100),
        reason: z.string().trim().min(10).max(1000),
      })
      .strict()
      .parse(input);
    const s = await one(
      tx,
      "SELECT version FROM settings WHERE key='security.permissions' AND scope=$1",
      [d.branchId],
    );
    if (!s) throw new AppError(404, "Branch permission settings not found.");
    return propose(tx, user, {
      key: "security.permissions",
      scope: d.branchId,
      version: s.version,
      value: { userId: d.userId, role: d.role, branchId: d.branchId },
      reason: d.reason,
    });
  }
  return undefined;
}
