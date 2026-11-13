import {latestDeliveryPhoto} from "./delivery-photos";
import { z } from "zod";
import { type SQL, one } from "./db";
import { allow, AppError, hashPassword, id, type Actor } from "./auth";
import { audit } from "./governance";
import { challenge, generateTemporaryPassword } from "./accounts";

export async function customerManagement(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  allow(user, ["owner", "manager"]);
  if (user.role !== "owner" && !user.branch_id)
    throw new AppError(403, "A branch assignment is required.");
  if (action === "customers.create") {
    const d = z
      .object({
        name: z.string().trim().min(2).max(120),
        email: z
          .email()
          .max(200)
          .transform((v) => v.toLowerCase()),
        branchId: z.string().min(1).max(100),
      })
      .strict()
      .parse(input);
    allow(user, ["owner", "manager"], d.branchId);
    if (
      !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
        d.branchId,
      ]))
    )
      throw new AppError(400, "Choose an active branch.");
    await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["staff-invite:" + d.email]);
    if (await one(tx, "SELECT id FROM users WHERE lower(email)=$1", [d.email]))
      throw new AppError(409, "An account already uses this email address.");
    if (await one(tx, "SELECT id FROM staff_invitations WHERE email=$1 AND accepted_at IS NULL AND expires_at>now()", [d.email]))
      throw new AppError(409, "An invitation already uses this email address.");
    const uid = id();
    const temporaryPassword = generateTemporaryPassword();
    await tx.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id,temporary_password_expires_at) VALUES($1,$2,$3,$4,'customer',$5,now()+interval '48 hours')",
      [
        uid,
        d.name,
        d.email,
        hashPassword(temporaryPassword),
        d.branchId,
      ],
    );
    await challenge(tx, { id: uid, email: d.email }, "verify", temporaryPassword);
    await audit(tx, user, action, uid);
    return {
      id: uid,
      message:
        "Customer created. An acceptance email with a temporary password is queued.",
    };
  }
  const scope = user.role === "owner" ? [] : [user.branch_id];
  const predicate =
    user.role === "owner"
      ? "true"
      : "(u.branch_id=$1 OR EXISTS(SELECT 1 FROM orders s WHERE s.customer_id=u.id AND s.branch_id=$1))";
  if (action === "customers.update") {
    const d = z
      .object({
        id: z.string().max(100),
        name: z.string().trim().min(2).max(120),
      })
      .strict()
      .parse(input);
    const row = await one(
      tx,
      `SELECT u.id FROM users u WHERE u.role IN ('customer','commercial') AND ${predicate} AND u.id=$${scope.length + 1} FOR UPDATE`,
      [...scope, d.id],
    );
    if (!row) throw new AppError(404, "Customer not found.");
    await tx.query("UPDATE users SET name=$1 WHERE id=$2", [d.name, d.id]);
    await audit(tx, user, action, d.id);
    return { ok: true };
  }
  const rows = (
    await tx.query(
      `SELECT u.id,u.public_customer_id,u.contact_phone,u.provisional,u.name,u.email,u.active,u.created_at,b.name AS location,u.branch_id,
    COALESCE(u.contact_phone,(SELECT a.phone FROM account_addresses a WHERE a.customer_id=u.id AND a.archived=false ${user.role === "owner" ? "" : "AND u.branch_id=$1"} ORDER BY a.is_default DESC,a.created_at DESC LIMIT 1)) AS phone,
    (SELECT count(*)::int FROM orders o WHERE o.customer_id=u.id ${user.role === "owner" ? "" : "AND o.branch_id=$1"}) AS orders,
    (SELECT coalesce(sum(p.amount_kobo),0)::text FROM verified_payments p JOIN orders o ON o.id=p.order_id WHERE o.customer_id=u.id ${user.role === "owner" ? "" : "AND o.branch_id=$1"}) AS spent_kobo
    FROM users u LEFT JOIN branches b ON b.id=u.branch_id WHERE u.role IN ('customer','commercial') AND ${predicate} ORDER BY u.created_at DESC,u.id`,
      scope,
    )
  ).rows;
  if (action === "customers.detail") {
    const d = z
      .object({ id: z.string().max(100) })
      .strict()
      .parse(input);
    const customer = rows.find((r) => r.id === d.id);
    if (!customer) throw new AppError(404, "Customer not found.");
    const orders = (
      await tx.query(
        `SELECT reference,status,payment_status,total_kobo,created_at FROM orders WHERE customer_id=$1 ${user.role === "owner" ? "" : "AND branch_id=$2"} ORDER BY created_at DESC LIMIT 50`,
        user.role === "owner" ? [d.id] : [d.id, user.branch_id],
      )
    ).rows;
    return { customer, orders, latestDeliveryPhoto:["owner", "manager"].includes(user.role)?await latestDeliveryPhoto(tx,user,d.id):null };
  }
  await audit(tx, user, "customers.view", "directory");
  return {
    customers: rows,
    branches: (
      await tx.query(
        `SELECT id,name FROM branches WHERE active=true ${user.role === "owner" ? "" : "AND id=$1"} ORDER BY name`,
        scope,
      )
    ).rows,
  };
}
