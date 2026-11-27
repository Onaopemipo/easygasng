import { z } from "zod";
import { one, type SQL, type Row } from "./db";
import { AppError, type Actor } from "./auth";
import { audit, definition } from "./governance";
import { rewardsAdjustment } from "./rewards-schema";

/** Minimal, bounded directory for the governed adjustment, never the general staff directory. */
export async function rewardsCustomers(tx: SQL, user: Actor, input: unknown) {
  const d = z
    .object({
      scope: z.string().min(1).max(100),
      query: z.string().trim().min(2).max(100).optional(),
      customerId: z.string().uuid().optional(),
    })
    .strict()
    .refine(
      (d) => Boolean(d.query) !== Boolean(d.customerId),
      "Enter a customer name or public customer ID.",
    )
    .parse(input);
  await definition(tx, user, "loyalty.adjustment", d.scope, "propose");
  if (
    !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
      d.scope,
    ]))
  )
    throw new AppError(400, "Choose an active branch.");
  // Finance can select its branch customers; only the Owner can initially assign branchless accounts.
  const params: unknown[] = [d.scope];
  const permitted =
    user.role === "owner" ? "$1::text IS NOT NULL" : "u.branch_id=$1";
  let match: string;
  if (d.customerId) {
    params.push(d.customerId);
    match = "u.id=$2";
  } else {
    params.push(
      d.query!.toUpperCase(),
      "%" + d.query!.replace(/[\\%_]/g, "\\$&") + "%",
    );
    match = "(upper(u.public_customer_id)=$2 OR u.name ILIKE $3)";
  }
  const customers = (
    await tx.query(
      `SELECT u.id,u.name,u.public_customer_id,u.branch_id,b.name AS branch_name
    FROM users u LEFT JOIN branches b ON b.id=u.branch_id
    WHERE u.active=true AND u.role IN ('customer','commercial') AND ${permitted}
    AND (u.branch_id IS NULL OR b.active=true) AND ${match}
    ORDER BY u.name,u.public_customer_id LIMIT 21`,
      params,
    )
  ).rows;
  await audit(tx, user, "rewards.customers.searched", d.scope, "success", {
    count: Math.min(customers.length, 20),
  });
  return {
    customers: customers.slice(0, 20),
    hasMore: customers.length > 20,
    canAssignBranch: user.role === "owner",
  };
}

/** Called at proposal/revision and again under row lock when applying the approved transaction. */
export async function validateRewardsCustomer(
  tx: SQL,
  scope: string,
  value: unknown,
  requester: Pick<Actor, "role">,
  lock = false,
) {
  const d = rewardsAdjustment.parse(value);
  const target = await one(
    tx,
    `SELECT id,name,public_customer_id,branch_id,active,role FROM users WHERE id=$1${lock ? " FOR UPDATE" : ""}`,
    [d.customerId],
  );
  if (!target?.active || !["customer", "commercial"].includes(target.role))
    throw new AppError(400, "Select an active customer again.");
  if (d.customerPublicId && d.customerPublicId !== target.public_customer_id)
    throw new AppError(
      409,
      "The customer reference changed. Select the customer again.",
    );
  if (
    !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
      scope,
    ]))
  )
    throw new AppError(400, "Choose an active branch.");
  if (d.assignBranchId) {
    if (requester.role !== "owner")
      throw new AppError(
        403,
        "Only the Business Owner can assign a customer's initial branch.",
      );
    if (d.assignBranchId !== scope)
      throw new AppError(
        403,
        "The assigned branch must match this adjustment's branch.",
      );
    if (target.branch_id !== null)
      throw new AppError(
        409,
        "This customer's branch changed. Select the customer again; existing branches cannot be transferred here.",
      );
  } else if (target.branch_id !== scope)
    throw new AppError(
      403,
      target.branch_id
        ? "Choose the customer's existing branch for this adjustment."
        : "Select a branch for this customer before adding points.",
    );
  return { target, value: d };
}
