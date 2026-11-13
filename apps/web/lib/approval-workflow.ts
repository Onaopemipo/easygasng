import { z } from "zod";
import { one, type SQL } from "./db";
import { AppError, recentVerification, type Actor } from "./auth";
import {
  autoApproveOwnerRequest,
  ownerAutoApprovalEnabled,
  canAutoApproveDefinition,
  definition,
  validateValue,
  transitionApproval,
  policySnapshot,
  activate,
  audit,
  notify,
} from "./governance";
export async function approvalWorkflowAction(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
) {
  if (
    ![
      "approval.owner_apply",
      "approval.submit",
      "approval.edit",
      "approval.cancel",
      "approval.retry",
      "approval.revise",
    ].includes(action)
  )
    return undefined;
  if (action === "approval.owner_apply" && (!ownerAutoApprovalEnabled() || user.role !== "owner"))
    throw new AppError(403, "Only the Business Owner can apply an owner request under the enabled owner policy.");
  const d = z
    .object({
      id: z.string().uuid(),
      value: z.unknown().optional(),
      reason: z.string().trim().min(5).max(1000),
      effectiveAt: z.iso.datetime({ offset: true }).optional(),
    })
    .strict()
    .parse(input);
  const r = await one(
    tx,
    "SELECT * FROM change_requests WHERE id=$1 FOR UPDATE",
    [d.id],
  );
  if (!r) throw new AppError(404, "Request not found.");
  if (action === "approval.owner_apply") return autoApproveOwnerRequest(tx, user, r.id);
  const def = await definition(
    tx,
    user,
    r.key,
    r.scope,
    action === "approval.retry" ? "approve" : "propose",
  );
  if (
    action !== "approval.retry" &&
    r.requester_id !== user.id &&
    user.role !== "owner"
  )
    throw new AppError(
      403,
      "Only the requester or owner may manage this request.",
    );
  if (
    def.additional_verification &&
    (action === "approval.retry" ||
      (action === "approval.cancel" &&
        ["approved", "scheduled", "failed"].includes(r.status)))
  )
    recentVerification(user);
  if (action === "approval.cancel") {
    await transitionApproval(tx, user, r.id, "cancelled", d.reason);
    return { status: "cancelled", state: "CANCELLED" };
  }
  if (new Date(r.expires_at).getTime() <= Date.now())
    throw new AppError(
      409,
      "This request has expired. Create a fresh request.",
    );
  if (action === "approval.retry") {
    if (r.status !== "failed")
      throw new AppError(409, "Only failed activation can be retried.");
    await audit(tx, user, "approval.retry_requested", r.id, "success", {
      reason: d.reason,
    });
    return activate(tx, user, r.id);
  }
  if (action === "approval.revise") {
    if (r.requester_id !== user.id)
      throw new AppError(
        403,
        "Only the requester may revise a returned request.",
      );
    await transitionApproval(tx, user, r.id, "draft", d.reason);
  }
  if (action === "approval.edit" || action === "approval.revise") {
    if (
      (action === "approval.edit" && r.status !== "draft") ||
      (action === "approval.revise" && r.status !== "changes_requested")
    )
      throw new AppError(
        409,
        "Only a draft or returned request can be edited.",
      );
    if (d.value === undefined)
      throw new AppError(400, "Provide the revised value.");
    validateValue(def, d.value);
    const current = await one(
      tx,
      "SELECT * FROM settings WHERE key=$1 AND scope=$2",
      [r.key, r.scope],
    );
    const effective = d.effectiveAt ?? r.effective_at;
    if (
      !Number.isFinite(+new Date(effective)) ||
      +new Date(effective) > Date.now() + 6 * 86400000
    )
      throw new AppError(400, "Choose an effective date within six days.");
    if (def.value_type === "access" && (d.value as any)?.userId === user.id)
      throw new AppError(403, "Self-promotion is prohibited.");
    await tx.query(
      "UPDATE change_requests SET proposed_value=$1,reason=$2,revision=revision+1,base_version=$3,previous_value=$4,effective_at=$5,policy_snapshot=$6 WHERE id=$7",
      [
        JSON.stringify(d.value),
        d.reason,
        current!.version,
        JSON.stringify(current!.value),
        effective,
        JSON.stringify(policySnapshot(def)),
        r.id,
      ],
    );
    await audit(tx, user, "approval.draft_modified", r.id, "success", {
      previousState: "DRAFT",
      newState: "DRAFT",
      reason: d.reason,
      approvalsInvalidated: true,
    });
    return { id: r.id, status: "draft", state: "DRAFT" };
  }
  if (r.status !== "draft") throw new AppError(409, "Submit a draft request.");
  validateValue(def, r.proposed_value);
  if (def.value_type === "access" && r.proposed_value.userId === user.id)
    throw new AppError(403, "Self-promotion is prohibited.");
  const current = await one(
    tx,
    "SELECT version FROM settings WHERE key=$1 AND scope=$2",
    [r.key, r.scope],
  );
  if (current?.version !== r.base_version)
    throw new AppError(
      409,
      "The setting changed. Edit the draft against the current value.",
    );
  await tx.query(
    "UPDATE change_requests SET policy_snapshot=$1,risk=$3,submitted_at=now() WHERE id=$2",
    [JSON.stringify(policySnapshot(def)), r.id, def.risk],
  );
  await transitionApproval(tx, user, r.id, "pending_approval", d.reason);
  if (canAutoApproveDefinition(def) && user.role === "owner" && r.requester_id === user.id && r.requester_role === "owner") return autoApproveOwnerRequest(tx, user, r.id);
  for (const u of (
    await tx.query(
      "SELECT id,role FROM users WHERE active=true AND (role='owner' OR branch_id=$1)",
      [r.scope],
    )
  ).rows)
    if (u.id !== user.id && def.approve_roles.includes(u.role))
      await notify(
        tx,
        u.id,
        "Approval requested",
        `${def.label} requires review.`,
        r.id,
      );
  if (def.risk === 1) {
    await transitionApproval(tx, user, r.id, "approved", "Routine policy");
    await activate(tx, user, r.id, true);
  }
  const result = await one(
    tx,
    "SELECT status FROM change_requests WHERE id=$1",
    [r.id],
  );
  return { ...result, state: result!.status.toUpperCase() };
}
