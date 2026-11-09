import { one, type SQL } from "./db";
import type { Actor } from "./auth";
/** Resolve existing authoritative context, never assign or backfill a customer identity. */
export async function customerFundingBranch(
  tx: SQL,
  user: Pick<Actor, "id" | "branch_id">,
) {
  if (user.branch_id)
    return (
      (
        await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
          user.branch_id,
        ])
      )?.id ?? null
    );
  const addresses = (
    await tx.query(
      `SELECT DISTINCT b.id FROM account_addresses a
    JOIN delivery_locations l ON l.id=a.location_id JOIN branches b ON b.id=l.branch_id
    WHERE a.customer_id=$1 AND a.is_default=true AND a.archived=false
      AND l.active=true AND l.visible=true AND l.archived=false AND b.active=true ORDER BY b.id LIMIT 2`,
      [user.id],
    )
  ).rows;
  if (addresses.length === 1) return addresses[0].id;
  if (addresses.length > 1) return null;
  const branches = (
    await tx.query(
      "SELECT id FROM branches WHERE active=true ORDER BY id LIMIT 2",
    )
  ).rows;
  return branches.length === 1 ? branches[0].id : null;
}
