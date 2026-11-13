import { gasQuote } from "./gas-delivery";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  normaliseCustomerPhone,
  publicCustomerId,
} from "../../../packages/business-rules/src/customer-identity";
import { allow, AppError, hashPassword, id, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { audit } from "./governance";
import { checkout, checkoutSchema } from "./operations";
const operators = ["owner", "manager"];
export async function assistedOrdering(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  allow(user, operators);
  if (user.role !== "owner" && !user.branch_id)
    throw new AppError(403, "A branch assignment is required.");
  if (action === "customers.lookup") {
    const d = z
      .object({ query: z.string().trim().min(5).max(100) })
      .strict()
      .parse(input);
    const phone = normaliseCustomerPhone(d.query),
      publicId = publicCustomerId(d.query);
    if (!phone && !publicId)
      throw new AppError(
        400,
        "Enter a complete Nigerian phone number or public customer ID.",
      );
    const rows = (
      await tx.query(
        `SELECT DISTINCT u.id,u.public_customer_id,u.name,u.contact_phone,u.provisional FROM users u
      WHERE u.active=true AND u.role IN ('customer','commercial') AND
      ($1::boolean OR u.branch_id=$2 OR EXISTS(SELECT 1 FROM orders o WHERE o.customer_id=u.id AND o.branch_id=$2)) AND
      (($3::text IS NOT NULL AND u.public_customer_id=$3) OR ($4::text IS NOT NULL AND (u.contact_phone=$4 OR EXISTS(
        SELECT 1 FROM account_addresses a WHERE a.customer_id=u.id AND a.archived=false AND
        regexp_replace(a.phone,'[^0-9]','','g') IN (substring($4 from 2),'0'||substring($4 from 5)))))) ORDER BY u.id LIMIT 21`,
        [user.role === "owner", user.branch_id, publicId, phone],
      )
    ).rows;
    await audit(tx, user, action, "customer-lookup", "success", {
      matches: rows.length,
    });
    return {
      customers: rows,
      duplicate: rows.length > 1,
      more: rows.length === 21,
    };
  }
  if (action === "customers.provisional") {
    const d = z
      .object({
        name: z.string().trim().min(2).max(120),
        phone: z.string().max(40),
        branchId: z.string().min(1).max(100),
      })
      .strict()
      .parse(input);
    allow(user, operators, d.branchId);
    const phone = normaliseCustomerPhone(d.phone);
    if (!phone) throw new AppError(400, "Enter a valid Nigerian phone number.");
    if (
      !(await one(
        tx,
        "SELECT id FROM branches WHERE id=$1 AND active=true FOR UPDATE",
        [d.branchId],
      ))
    )
      throw new AppError(409, "Choose an active branch.");
    // Serialize the same phone across branches without granting a duplicate lookup across branches.
    await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      "customer-phone:" + phone,
    ]);
    const existing = await one(
      tx,
      `SELECT u.id FROM users u WHERE u.role IN ('customer','commercial') AND (u.contact_phone=$1 OR EXISTS(SELECT 1 FROM account_addresses a WHERE a.customer_id=u.id AND a.archived=false AND regexp_replace(a.phone,'[^0-9]','','g') IN (substring($1 from 2),'0'||substring($1 from 5))))`,
      [phone],
    );
    if (existing)
      throw new AppError(
        409,
        "This phone already has a customer record. Use lookup or ask an authorised owner to review it; records have not been merged.",
      );
    const uid = id();
    const created = await one(
      tx,
      `INSERT INTO users(id,name,email,password_hash,role,branch_id,contact_phone,provisional) VALUES($1,$2,$3,$4,'customer',$5,$6,true) RETURNING id,public_customer_id,name,provisional`,
      [
        uid,
        d.name,
        `provisional-${uid}@identity.invalid`,
        hashPassword(randomBytes(48).toString("hex")),
        d.branchId,
        phone,
      ],
    );
    await audit(tx, user, action, uid);
    return created;
  }
  if (action === "order.assisted.quote") {
    const d = checkoutSchema.parse(input);
    const location = await one(
      tx,
      "SELECT l.branch_id FROM delivery_locations l JOIN branches b ON b.id=l.branch_id WHERE b.active=true AND l.active=true AND l.visible=true AND l.archived=false AND (($1::text IS NOT NULL AND l.id=$1) OR ($1::text IS NULL AND lower(l.name)=lower($2)))",
      [d.address.locationId ?? null, d.address.zone],
    );
    if (!location)
      throw new AppError(409, "Choose an active supported delivery location.");
    allow(user, operators, location.branch_id);
    return gasQuote(tx, d.gasLines ?? [], location.branch_id, d.items);
  }
  if (action === "order.assisted.create") {
    const d = z
      .object({
        customerId: z.string().uuid(),
        reason: z.string().trim().min(10).max(500),
        checkout: checkoutSchema,
      })
      .strict()
      .parse(input);
    const order = await checkout(tx, user, d.checkout, {
      customerId: d.customerId,
      reason: d.reason,
    });
    const safe = { ...order };
    delete safe.delivery_code_hash;
    delete safe.delivery_code_expires_at;
    return safe;
  }
  throw new AppError(404, "Unknown assisted ordering action.");
}
