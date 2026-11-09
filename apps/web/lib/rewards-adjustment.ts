import { one, type SQL, type Row } from "./db";
import { id, AppError } from "./auth";
import { rewardsAdjustment } from "./rewards-schema";
export async function applyRewardsAdjustment(tx: SQL, request: Row) {
  if (request.key !== "loyalty.adjustment") return;
  const d = rewardsAdjustment.parse(request.proposed_value);
  const target = await one(
    tx,
    "SELECT u.id FROM users u JOIN branches b ON b.id=u.branch_id AND b.active=true WHERE u.id=$1 AND u.branch_id=$2 AND u.role IN ('customer','commercial') AND u.active=true FOR UPDATE OF u",
    [d.customerId, request.scope],
  );
  if (!target)
    throw new AppError(
      403,
      "Choose an active customer in the approved branch.",
    );
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
