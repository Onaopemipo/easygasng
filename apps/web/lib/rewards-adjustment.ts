import { validateRewardsCustomer } from "./rewards-customers";
import { audit } from "./governance";
import { one, type SQL, type Row } from "./db";
import { id, AppError } from "./auth";
export async function applyRewardsAdjustment(tx: SQL, request: Row) {
  if (request.key !== "loyalty.adjustment") return;
  // Retries never repeat either the branch assignment or the ledger credit.
  if (
    await one(tx, "SELECT id FROM reward_entries WHERE reference=$1", [
      `adjustment:${request.id}`,
    ])
  )
    return;
  const requester = await one(
    tx,
    "SELECT id,role,branch_id,active FROM users WHERE id=$1",
    [request.requester_id],
  );
  if (!requester?.active)
    throw new AppError(403, "The adjustment requester is no longer active.");
  const { target, value: d } = await validateRewardsCustomer(
    tx,
    request.scope,
    request.proposed_value,
    requester as any,
    true,
  );
  if (d.assignBranchId) {
    await tx.query(
      "UPDATE users SET branch_id=$1 WHERE id=$2 AND branch_id IS NULL",
      [request.scope, d.customerId],
    );
    await audit(
      tx,
      requester as any,
      "rewards.customer.branch_assigned",
      d.customerId,
      "success",
      {
        previousBranchId: target.branch_id,
        branchId: request.scope,
        approvalRequestId: request.id,
      },
    );
  }
  const entry = await one(
    tx,
    "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,$3,$4) ON CONFLICT(reference) DO NOTHING RETURNING id",
    [id(), d.customerId, d.points, `adjustment:${request.id}`],
  );
  if (entry)
    await tx.query(
      "INSERT INTO reward_entry_details(entry_id,branch_id,kind,detail) VALUES($1,$2,'adjustment',$3)",
      [
        entry.id,
        request.scope,
        JSON.stringify({
          approvalRequestId: request.id,
          reason: d.reason,
          evidence: d.evidence,
        }),
      ],
    );
}
