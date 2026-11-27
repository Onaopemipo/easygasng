import { z } from "zod";
import { allow, recentVerification, id, AppError, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { audit, definition } from "./governance";
import {
  requiredBusinessOperation,
  operationOutcome,
} from "./business-operation";
import { rewardsAdjustment } from "./rewards-schema";
import { validateRewardsCustomer } from "./rewards-customers";
import { rewardBalance } from "./rewards";

/** Direct additions are an explicit Admin operation, not a relaxation of any approval policy. */
export async function addRewardPoints(tx: SQL, user: Actor, input: unknown) {
  allow(user, ["owner"]);
  recentVerification(user);
  const raw = z
    .object({
      operationKey: z.string().uuid(),
      scope: z.string().min(1).max(100),
      value: rewardsAdjustment.refine(
        (v) => v.points > 0,
        "Enter a positive whole number of points.",
      ),
      reason: z.string().trim().min(5).max(1000),
    })
    .strict()
    .parse(input);
  await definition(tx, user, "loyalty.adjustment", raw.scope, "propose");
  return requiredBusinessOperation(tx, user, "rewards.add", raw, async () => {
    const { target, value } = await validateRewardsCustomer(
      tx,
      raw.scope,
      raw.value,
      user,
      true,
    );
    const before = await rewardBalance(tx, value.customerId);
    if (!Number.isSafeInteger(before + value.points))
      throw new AppError(409, "Rewards balance requires reconciliation.");
    if (value.assignBranchId) {
      await tx.query(
        "UPDATE users SET branch_id=$1 WHERE id=$2 AND branch_id IS NULL",
        [raw.scope, value.customerId],
      );
      await audit(
        tx,
        user,
        "rewards.customer.branch_assigned",
        value.customerId,
        "success",
        {
          previousBranchId: target.branch_id,
          branchId: raw.scope,
          operationKey: raw.operationKey,
        },
      );
    }
    const entryId = id();
    await tx.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,$3,$4)",
      [
        entryId,
        value.customerId,
        value.points,
        `admin-add:${raw.operationKey}`,
      ],
    );
    await tx.query(
      "INSERT INTO reward_entry_details(entry_id,branch_id,kind,detail) VALUES($1,$2,'adjustment',$3)",
      [
        entryId,
        raw.scope,
        JSON.stringify({
          operationKey: raw.operationKey,
          actorId: user.id,
          reason: value.reason,
          evidence: value.evidence,
          mode: "admin_direct",
        }),
      ],
    );
    const after = await rewardBalance(tx, value.customerId);
    await audit(tx, user, "rewards.points.added", value.customerId, "success", {
      branch: raw.scope,
      customerId: value.customerId,
      customerName: target.name,
      customerPublicId: target.public_customer_id,
      points: value.points,
      balanceBefore: before,
      balanceAfter: after,
      reason: value.reason,
      evidence: value.evidence,
      changeReason: raw.reason,
      entryId,
      operationKey: raw.operationKey,
    });
    return {
      status: "active",
      state: "ACTIVE",
      rewardAdded: true,
      entryId,
      customerPublicId: target.public_customer_id,
      pointsAdded: value.points,
      balance: after,
      branchId: raw.scope,
      operationKey: raw.operationKey,
    };
  });
}
export async function rewardAdditionOutcome(
  tx: SQL,
  user: Actor,
  input: unknown,
) {
  allow(user, ["owner"]);
  const result = await operationOutcome(tx, user, input);
  if (result.status === "COMMITTED" && (!("action" in result) || result.action !== "rewards.add"))
    throw new AppError(404, "Reward addition not found.");
  return result;
}
