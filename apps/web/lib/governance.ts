import { accountRoles } from "../../../packages/business-rules/src/staff-roles";
import { documentIdentitySchema } from "./document-identity";
import { serviceMaterialRecovery } from "./service-recovery-schema";
import { manifestReturn, vehiclePayload } from "./vehicle-manifest-schema";
import { dispatchRoutingPolicy } from "./dispatch-routing-schema";
import { gatewayPolicy } from "./payments/policy";
import { retentionPolicy } from "./operations-schema";
import { applyRewardsAdjustment } from "./rewards-adjustment";
import {
  rewardsPolicy,
  rewardsAdjustment,
  referralReview,
} from "./rewards-schema";
import { websiteContent } from "./website-schema";
import { testimonialPolicy } from "./testimonial-schema";
import {
  validateInventoryValue,
  applyInventoryOperation,
} from "./inventory-business";
import { approvalTransitions } from "../../../packages/business-rules/src/approval-states";
import { validateGasSetting, applyGasSetting } from "./gas-delivery-config";
import { bundleConfig } from "./bundles";
import { legalConfig } from "./policies";
import { serviceConfig, checklistConfig } from "./service-schema";
import { delegatedAuthority } from "./delegation";
import { one, type SQL, type Row } from "./db";
import { allow, recentVerification, AppError, id, type Actor } from "./auth";
export async function audit(
  tx: SQL,
  user: Actor | null,
  action: string,
  target: string,
  outcome = "success",
  detail: Row = {},
) {
  await tx.query(
    "INSERT INTO audit_events(id,actor_id,action,target,outcome,detail) VALUES ($1,$2,$3,$4,$5,$6)",
    [
      id(),
      user?.id ?? null,
      action,
      target,
      outcome,
      JSON.stringify({
        actorRole: user?.role ?? null,
        actorBranch: user?.branch_id ?? null,
        ...detail,
      }),
    ],
  );
}
export async function notify(
  tx: SQL,
  userId: string,
  title: string,
  body: string,
  related?: string,
) {
  await tx.query(
    "INSERT INTO notifications(id,user_id,title,body,related_id) VALUES ($1,$2,$3,$4,$5)",
    [id(), userId, title, body, related ?? null],
  );
}
function proposalRoles(d: Row): string[] {
  return d.propose_roles;
}
export async function definition(
  tx: SQL,
  user: Actor,
  key: string,
  scope: string,
  permission: "view" | "propose" | "approve",
) {
  const d = await one(tx, "SELECT * FROM setting_definitions WHERE key=$1", [
    key,
  ]);
  if (!d) throw new AppError(404, "Setting not found.");
  if (key.startsWith("service_quote.") && user.role === "technician") {
    const scoped = await one(
      tx,
      "SELECT q.id FROM service_quotes q JOIN service_bookings b ON b.id=q.booking_id WHERE q.id=$1 AND b.technician_id=$2 AND b.branch_id=$3 AND q.revision=(SELECT max(revision) FROM service_quotes WHERE booking_id=b.id)",
      [key.slice(14), user.id, scope],
    );
    if (!scoped)
      throw new AppError(
        403,
        "Only the current assigned quotation may be submitted or viewed.",
      );
  }
  allow(
    user,
    permission === "propose" ? proposalRoles(d) : d[`${permission}_roles`],
    scope,
  );
  return d;
}
export function validateValue(d: Row, value: any) {
  if (d.value_type === "payment_gateway") gatewayPolicy.parse(value);
  if (d.value_type === "crm_retention") retentionPolicy.parse(value);
  if (d.value_type === "dispatch_routing") dispatchRoutingPolicy.parse(value);
  if (d.value_type === "vehicle_return_recovery") manifestReturn.parse(value);
  if (d.value_type === "vehicle_payload") vehiclePayload.parse(value);
  if (d.value_type === "service_material_recovery")
    serviceMaterialRecovery.parse(value);
  if (d.value_type === "referral_review") referralReview.parse(value);
  if (d.value_type === "rewards_policy") rewardsPolicy.parse(value);
  if (d.value_type === "rewards_adjustment") rewardsAdjustment.parse(value);
  validateGasSetting(d, value);
  validateInventoryValue(d, value);
  if (d.value_type === "bundle") bundleConfig.parse(value);
  if (d.value_type === "legal") legalConfig.parse(value);
  if (d.value_type === "document_identity") documentIdentitySchema.parse(value);
  if (d.value_type === "website_content") websiteContent.parse(value);
  if (d.value_type === "testimonial_policy") testimonialPolicy.parse(value);
  if (d.value_type === "service") serviceConfig.parse(value);
  if (d.value_type === "checklist") checklistConfig.parse(value);
  if (
    d.value_type === "integer" &&
    (!Number.isSafeInteger(value) ||
      value < (d.minimum ?? 0) ||
      value > (d.maximum ?? 100000))
  )
    throw new AppError(
      400,
      "Enter a whole number within the configured limits.",
    );
  if (
    d.value_type === "money" &&
    (!Number.isSafeInteger(value) ||
      value < (d.minimum ?? 0) ||
      value > (d.maximum ?? Number.MAX_SAFE_INTEGER))
  )
    throw new AppError(
      400,
      `Enter an amount between ₦${Number(d.minimum ?? 0) / 100} and ₦${Number(d.maximum ?? 100000000) / 100}.`,
    );
  if (d.value_type === "boolean" && typeof value !== "boolean")
    throw new AppError(400, "Choose enabled or disabled.");
  if (
    d.value_type === "text" &&
    (typeof value !== "string" ||
      value.trim().length < 3 ||
      value.length > 1000)
  )
    throw new AppError(400, "Enter between 3 and 1,000 characters.");
  if (
    d.value_type === "bank" &&
    (!value ||
      !/^\d{10}$/.test(value.account) ||
      typeof value.bank !== "string" ||
      value.bank.length < 2 ||
      typeof value.name !== "string" ||
      value.name.length < 2)
  )
    throw new AppError(
      400,
      "Enter the bank, account name and a valid 10-digit account number.",
    );
  if (d.value_type === "policy")
    throw new AppError(
      403,
      "Approval policies cannot be weakened in this release.",
    );
  if (d.key === "delivery.zones" && typeof value === "string") {
    const zones = value.split(",").map((s) => s.trim().toLowerCase());
    if (
      zones.length > 100 ||
      zones.some((s) => s.length < 2 || s.length > 100) ||
      new Set(zones).size !== zones.length
    )
      throw new AppError(
        400,
        "Enter distinct, non-empty delivery areas separated by commas.",
      );
  }
  if (
    ["business.hours", "delivery.windows"].includes(d.key) &&
    typeof value === "string"
  ) {
    const windows =
      d.key === "business.hours"
        ? [value]
        : value.split(",").map((s) => s.trim());
    if (
      windows.some((w) => {
        const m = w.match(
          /^([01]\d|2[0-3]):([0-5]\d)[–-]([01]\d|2[0-3]):([0-5]\d)$/,
        );
        return (
          !m ||
          Number(m[1]) * 60 + Number(m[2]) >= Number(m[3]) * 60 + Number(m[4])
        );
      })
    )
      throw new AppError(
        400,
        "Use 24-hour windows such as 09:00–18:00, with the end after the start.",
      );
  }
  if (
    d.value_type === "access" &&
    (!value ||
      typeof value.userId !== "string" ||
      !accountRoles.includes(value.role) ||
      typeof value.branchId !== "string")
  )
    throw new AppError(
      400,
      "Choose an existing staff member, valid role and branch.",
    );
  if (d.key === "payment.integration" && value === true)
    throw new AppError(
      409,
      "This legacy switch does not enable Paystack. Open Business Settings → Payment Gateway & Fees to configure the Paystack sandbox. Live payment activation remains unavailable.",
    );
}
export async function propose(
  tx: SQL,
  user: Actor,
  input: {
    key: string;
    scope: string;
    value: any;
    version: number;
    reason: string;
    effectiveAt?: string;
    rollbackOf?: string;
    draft?: boolean;
  },
  options: { deferOwnerActivation?: boolean } = {},
) {
  const d = await definition(tx, user, input.key, input.scope, "propose");
  validateValue(d, input.value);
  const setting = await one(
    tx,
    "SELECT * FROM settings WHERE key=$1 AND scope=$2 FOR UPDATE",
    [input.key, input.scope],
  );
  if (!setting) throw new AppError(404, "Setting not found in this branch.");
  if (setting.version !== input.version)
    throw new AppError(
      409,
      "This setting changed. Reload and review the current version.",
      "VERSION_CONFLICT",
    );
  if (d.value_type === "access" && input.value?.userId === user.id)
    throw new AppError(
      403,
      "You cannot request changes to your own privileges.",
    );
  if (d.value_type === "access") {
    const target = await one(
      tx,
      "SELECT id,branch_id,active FROM users WHERE id=$1",
      [input.value.userId],
    );
    if (!target?.active)
      throw new AppError(400, "Choose an existing active account.");
    if (
      input.value.branchId !== input.scope ||
      (user.role !== "owner" &&
        target.branch_id &&
        target.branch_id !== input.scope)
    )
      throw new AppError(
        403,
        "The target account and assigned branch must be within the approved request scope.",
      );
    if (
      !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
        input.scope,
      ]))
    )
      throw new AppError(400, "Choose an active branch.");
  }
  if (input.reason.trim().length < 5)
    throw new AppError(400, "Explain the reason in at least five characters.");
  const effective = input.effectiveAt
    ? new Date(input.effectiveAt)
    : new Date();
  if (
    !Number.isFinite(effective.getTime()) ||
    effective.getTime() > Date.now() + 6 * 86400000
  )
    throw new AppError(400, "Choose an effective date within six days.");
  const requestId = id();
  await tx.query(
    "INSERT INTO change_requests(id,key,scope,requester_id,previous_value,proposed_value,base_version,reason,risk,status,effective_at,expires_at,rollback_of) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending_approval',$10,now()+interval '7 days',$11)",
    [
      requestId,
      input.key,
      input.scope,
      user.id,
      JSON.stringify(setting!.value),
      JSON.stringify(input.value),
      setting.version,
      input.reason,
      d.risk,
      effective,
      input.rollbackOf ?? null,
    ],
  );
  await audit(tx, user, "setting.proposed", requestId, "success", {
    key: d.key,
    risk: d.risk,
  });
  await tx.query(
    "UPDATE change_requests SET policy_snapshot=$1,requester_role=$2,submitted_at=CASE WHEN $3 THEN NULL ELSE now() END,status=CASE WHEN $3 THEN 'draft' ELSE status END WHERE id=$4",
    [
      JSON.stringify(policySnapshot(d)),
      user.role,
      Boolean(input.draft),
      requestId,
    ],
  );
  if (input.draft) {
    await audit(tx, user, "approval.created", requestId, "success", {
      previousState: null,
      newState: "DRAFT",
      key: d.key,
    });
    return { id: requestId, status: "draft", state: "DRAFT" };
  }
  await audit(tx, user, "approval.submitted", requestId, "success", {
    previousState: "DRAFT",
    newState: "PENDING_APPROVAL",
    version: setting.version,
  });
  if (canAutoApproveDefinition(d) && user.role === "owner" && !options.deferOwnerActivation) return autoApproveOwnerRequest(tx, user, requestId);
  if (d.risk === 1) {
    await transitionApproval(
      tx,
      user,
      requestId,
      "approved",
      "Routine change under existing policy",
    );
    await activate(tx, user, requestId, true);
  } else if (!(canAutoApproveDefinition(d) && user.role === "owner" && options.deferOwnerActivation)) {
    const users = (
      await tx.query(
        "SELECT id,role FROM users WHERE active=true AND (branch_id=$1 OR role='owner')",
        [input.scope],
      )
    ).rows;
    for (const u of users)
      if (u.id !== user.id && d.approve_roles.includes(u.role))
        await notify(
          tx,
          u.id,
          "Approval requested",
          `${d.label} requires an independent review.`,
          requestId,
        );
  }
  const result = await one(
    tx,
    "SELECT status,failure_reason FROM change_requests WHERE id=$1",
    [requestId],
  );
  return { id: requestId, ...result, state: result!.status.toUpperCase() };
}
export function canAutoApproveDefinition(d: Row) {
  if (!ownerAutoApprovalEnabled() || d.value_type === "access" || d.category === "Finance Operations")
    return false;
  return d.key === "gas.price_per_kg" || d.value_type === "checklist" ||
    (d.risk < 4 && d.required_roles.length === 0);
}
export function ownerAutoApprovalEnabled() {
  return process.env.EASYGAS_OWNER_AUTO_APPROVAL === "true";
}
/** Immutable authorisation for this revision; current owner authority is rechecked on every activation. */
async function ownerRequestAuthorized(tx: SQL, r: Row) {
  if (!ownerAutoApprovalEnabled() || r.requester_role !== "owner") return false;
  return Boolean(await one(tx, `SELECT a.id FROM audit_events a JOIN users u ON u.id=a.actor_id
    WHERE a.action='approval.owner_auto_approved' AND a.target=$1 AND a.actor_id=$2
    AND a.outcome='success' AND u.active=true AND u.role='owner'
    AND a.detail->>'revision'=$3 AND a.detail->>'baseVersion'=$4 LIMIT 1`,
    [r.id, r.requester_id, String(r.revision), String(r.base_version)]));
}
export async function autoApproveOwnerRequest(tx: SQL, user: Actor, requestId: string) {
  if (!ownerAutoApprovalEnabled() || user.role !== "owner")
    throw new AppError(403, "Automatic approval is available only to the Business Owner under the enabled owner policy.");
  const r = await one(tx, "SELECT * FROM change_requests WHERE id=$1 FOR UPDATE", [requestId]);
  if (!r) throw new AppError(404, "Request not found.");
  if (r.requester_id !== user.id || r.requester_role !== "owner")
    throw new AppError(403, "Only your own Business Owner requests qualify for automatic approval.");
  const d = await definition(tx, user, r.key, r.scope, "propose");
  if (!canAutoApproveDefinition(d)) throw new AppError(403, "This change requires independent approval.");
  if (d.additional_verification) recentVerification(user);
  if (new Date(r.expires_at).getTime() <= Date.now()) throw new AppError(409, "This request has expired. Create a fresh request.");
  if (r.status === "active") return { id: r.id, status: "active", state: "ACTIVE", autoApproved: true };
  if (["pending_approval", "partially_approved"].includes(r.status)) {
    validateValue(d, r.proposed_value);
    if (d.value_type === "access" && r.proposed_value.userId === user.id)
      throw new AppError(403, "You cannot approve changes to your own privileges.");
    if (!(await ownerRequestAuthorized(tx, r))) await audit(tx, user, "approval.owner_auto_approved", r.id, "success", {
      revision: r.revision, baseVersion: r.base_version, key: r.key,
      policy: "explicit-business-owner-authority-v1", reason: r.reason,
    });
    // Owner authority replaces business approval, never the independent qualified safety review.
    if (d.value_type === "checklist" && !(await validApprovals(tx, r, d))) {
      if (r.status !== "partially_approved") await transitionApproval(tx, user, r.id, "partially_approved", "Owner approval recorded; qualified safety review still required");
      return { id: r.id, status: "partially_approved", state: "PARTIALLY_APPROVED", autoApproved: true, awaitingQualifiedReview: true };
    }
    await transitionApproval(tx, user, r.id, "approved", "Automatically approved under Business Owner authority");
  } else if (!["approved", "scheduled", "failed"].includes(r.status) || !(await ownerRequestAuthorized(tx, r)))
    throw new AppError(409, "Only an open owner request or an owner-authorised activation can be applied.");
  const result = await activate(tx, user, r.id);
  return { id: r.id, ...result, autoApproved: true };
}
export async function hasQualifiedSafetyReviewer(tx: SQL, ids: string[]) {
  return Boolean(await one(tx, `SELECT q.id FROM technician_qualifications q
    JOIN users verifier ON verifier.id=q.verified_by
    WHERE q.user_id=ANY($1::text[]) AND q.code='safety_review' AND q.expires_at>now()
      AND q.verified_by<>q.user_id AND verifier.active=true AND verifier.role='owner' LIMIT 1`, [ids]));
}
export async function validApprovals(tx: SQL, r: Row, d: Row) {
  const ownerAuthorized = canAutoApproveDefinition(d) && await ownerRequestAuthorized(tx, r);
  if (ownerAuthorized && d.value_type !== "checklist") return true;
  const decisions = (
    await tx.query(
      "SELECT a.*,u.role AS current_role,u.active,u.branch_id FROM approval_decisions a JOIN users u ON u.id=a.approver_id WHERE a.request_id=$1 AND a.revision=$2 AND a.decision='approve'",
      [r.id, r.revision],
    )
  ).rows;
  const valid: Row[] = [];
  for (const a of decisions) {
    if (
      !a.active ||
      a.role !== a.current_role ||
      a.approver_id === r.requester_id ||
      (a.current_role !== "owner" && a.branch_id !== r.scope)
    )
      continue;
    if (
      d.additional_verification &&
      (!a.verified_at ||
        new Date(a.created_at).getTime() - new Date(a.verified_at).getTime() <
          0 ||
        new Date(a.created_at).getTime() - new Date(a.verified_at).getTime() >
          5 * 60 * 1000)
    )
      continue;
    if (a.delegation_id) {
      if (!(await delegatedAuthority(tx, a.approver_id, d, r, a.delegation_id)))
        continue;
    } else if (!d.approve_roles.includes(a.current_role)) continue;
    valid.push(a);
  }
  if (d.value_type === "checklist" && !(await hasQualifiedSafetyReviewer(tx, valid.map((a) => a.approver_id))))
    return false;
  if (ownerAuthorized) valid.push({ approver_id: r.requester_id, current_role: "owner" });
  const unique = [...new Map(valid.map((a) => [a.approver_id, a])).values()];
  return (
    unique.length >= (d.risk === 4 ? 2 : 1) &&
    d.required_roles.every((role: string) =>
      unique.some((a) => a.current_role === role),
    )
  );
}
async function applyApproved(
  tx: SQL,
  user: Actor,
  requestId: string,
  routine = false,
) {
  const r = await one(
    tx,
    "SELECT * FROM change_requests WHERE id=$1 FOR UPDATE",
    [requestId],
  );
  if (!r) throw new AppError(404, "Request not found.");
  const d = await one(tx, "SELECT * FROM setting_definitions WHERE key=$1", [
    r.key,
  ]);
  if (!d) throw new AppError(404, "Setting definition missing.");
  const requester = await one(
    tx,
    "SELECT role,branch_id,active FROM users WHERE id=$1",
    [r.requester_id],
  );
  if (
    !requester?.active ||
    !proposalRoles(d).includes(requester.role) ||
    (requester.role !== "owner" && requester.branch_id !== r.scope)
  )
    throw new AppError(
      409,
      "The requester no longer has authority for this change.",
      "ACTIVATION_FAILED",
    );
  if (!["approved", "scheduled", "failed"].includes(r.status))
    throw new AppError(409, "This request is no longer awaiting activation.");
  if (new Date(r.expires_at).getTime() <= Date.now())
    throw new AppError(409, "This approval request has expired.");
  if (
    !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
      r.scope,
    ]))
  )
    throw new AppError(
      409,
      "The fulfilment branch is inactive.",
      "ACTIVATION_FAILED",
    );
  if (
    r.policy_snapshot &&
    JSON.stringify(policySnapshot(r.policy_snapshot)) !==
      JSON.stringify(policySnapshot(d))
  )
    throw new AppError(
      409,
      "Approval policy changed. A new review is required.",
      "ACTIVATION_FAILED",
    );
  validateValue(d, r.proposed_value);
  if (
    r.rollback_of &&
    !(await one(
      tx,
      "SELECT id FROM setting_versions WHERE id=$1 AND key=$2 AND scope=$3 AND previous_value=$4::jsonb",
      [r.rollback_of, r.key, r.scope, JSON.stringify(r.proposed_value)],
    ))
  )
    throw new AppError(
      409,
      "A rollback must restore the referenced prior value.",
      "ACTIVATION_FAILED",
    );
  const setting = await one(
    tx,
    "SELECT * FROM settings WHERE key=$1 AND scope=$2 FOR UPDATE",
    [r.key, r.scope],
  );
  if (setting?.version !== r.base_version)
    throw new AppError(
      409,
      "A newer setting is active. Request a new review.",
      "VERSION_CONFLICT",
    );
  if (!(routine && d.risk === 1) && !(await validApprovals(tx, r, d)))
    throw new AppError(
      403,
      "Required independent approvals are missing or no longer valid.",
    );
  if (new Date(r.effective_at).getTime() > Date.now()) {
    if (r.status !== "scheduled")
      await transitionApproval(
        tx,
        user,
        r.id,
        "scheduled",
        "Awaiting requested effective date",
      );
    return;
  }
  await transitionApproval(
    tx,
    user,
    r.id,
    "applying",
    "Authoritative activation started",
  );
  await tx.query(
    "UPDATE change_requests SET activation_attempts=activation_attempts+1,failure_reason=NULL WHERE id=$1",
    [r.id],
  );
  await applyRewardsAdjustment(tx, r);
  if (r.key === "loyalty.referral_review") {
    const v = referralReview.parse(r.proposed_value);
    const target = await one(
      tx,
      "SELECT r.attribution_id FROM reward_referrals r JOIN users u ON u.id=r.customer_id WHERE r.attribution_id=$1 AND u.branch_id=$2",
      [v.attributionId, r.scope],
    );
    if (!target)
      throw new AppError(403, "Referral does not belong to this branch.");
    await tx.query(
      "INSERT INTO reward_referral_reviews(attribution_id,state,reason,request_id) VALUES($1,$2,$3,$4) ON CONFLICT(attribution_id) DO UPDATE SET state=excluded.state,reason=excluded.reason,request_id=excluded.request_id,updated_at=now()",
      [v.attributionId, v.state, v.reason, r.id],
    );
  }
  if (d.value_type === "vehicle_payload") {
    const value = vehiclePayload.parse(r.proposed_value);
    if (r.key !== "vehicle_payload." + value.vehicleId)
      throw new AppError(409, "Vehicle payload identity changed.");
    const vehicle = await one(
      tx,
      "SELECT * FROM driver_vehicles WHERE id=$1 AND branch_id=$2 FOR UPDATE",
      [value.vehicleId, r.scope],
    );
    const held = Number(
      (await one(
        tx,
        "SELECT COALESCE(sum((l.available+l.reserved)*l.unit_weight_grams),0) n FROM vehicle_product_loads l JOIN driver_trips t ON t.id=l.trip_id WHERE t.vehicle_id=$1 AND l.state<>'reconciled'",
        [value.vehicleId],
      ))!.n,
    );
    if (!vehicle || !vehicle.active || held > value.physicalCapacityGrams)
      throw new AppError(
        409,
        "Active physical custody exceeds the proposed payload capacity or vehicle is inactive.",
      );
    await tx.query(
      "UPDATE driver_vehicles SET physical_capacity_grams=$1 WHERE id=$2",
      [value.physicalCapacityGrams, value.vehicleId],
    );
  }
  await applyGasSetting(tx, user, r);
  await applyInventoryOperation(tx, user, r);
  if (d.value_type === "bundle")
    await tx.query(
      "UPDATE service_bundles SET config=$1,version=$2 WHERE id=$3 AND branch_id=$4",
      [
        JSON.stringify(r.proposed_value),
        r.base_version + 1,
        r.key.slice(7),
        r.scope,
      ],
    );
  if (d.value_type === "legal")
    await tx.query(
      "UPDATE legal_documents SET title=$1,content=$2,published=$3,effective_at=$4,version=version+1 WHERE kind=$5",
      [
        r.proposed_value.title,
        r.proposed_value.content,
        r.proposed_value.published,
        r.proposed_value.effectiveAt,
        r.key.slice(6),
      ],
    );
  if (d.value_type === "service") {
    if (
      r.proposed_value.active &&
      !(await one(
        tx,
        "SELECT id FROM service_catalogue WHERE id=$1 AND branch_id=$2 AND checklist_version>0",
        [r.key.slice(8), r.scope],
      ))
    )
      throw new AppError(
        409,
        "Approve the service safety checklist before opening bookings.",
        "ACTIVATION_FAILED",
      );
    await tx.query(
      "UPDATE service_catalogue SET name=$1,config=$2,version=version+1 WHERE id=$3 AND branch_id=$4",
      [
        r.proposed_value.name,
        JSON.stringify(r.proposed_value),
        r.key.slice(8),
        r.scope,
      ],
    );
  }
  if (d.value_type === "checklist")
    await tx.query(
      "UPDATE service_catalogue SET checklist=$1,checklist_version=checklist_version+1 WHERE id=$2 AND branch_id=$3",
      [JSON.stringify(r.proposed_value), r.key.slice(10), r.scope],
    );
  if (r.key.startsWith("price."))
    await tx.query(
      "UPDATE inventory SET price_kobo=$1 WHERE product_id=$2 AND branch_id=$3",
      [r.proposed_value, r.key.slice(6), r.scope],
    );
  if (r.key.startsWith("publish.")) {
    if (
      r.proposed_value &&
      !(
        await one(
          tx,
          "SELECT price_kobo FROM inventory WHERE product_id=$1 AND branch_id=$2",
          [r.key.slice(8), r.scope],
        )
      )?.price_kobo
    )
      throw new AppError(
        409,
        "Set an approved selling price before publishing this product.",
        "ACTIVATION_FAILED",
      );
    await tx.query(
      "UPDATE inventory SET published=$1 WHERE product_id=$2 AND branch_id=$3",
      [r.proposed_value, r.key.slice(8), r.scope],
    );
  }
  if (d.value_type === "access") {
    if (r.proposed_value.userId === r.requester_id)
      throw new AppError(403, "Self-promotion is prohibited.");
    const exists = await one(tx, "SELECT id FROM users WHERE id=$1", [
      r.proposed_value.userId,
    ]);
    if (!exists) throw new AppError(404, "The target account does not exist.");
    const approving = await one(
      tx,
      "SELECT id FROM approval_decisions WHERE request_id=$1 AND approver_id=$2 AND decision='approve'",
      [r.id, r.proposed_value.userId],
    );
    if (approving)
      throw new AppError(
        403,
        "The account receiving privileges cannot approve this request.",
      );
    await tx.query("UPDATE users SET role=$1,branch_id=$2 WHERE id=$3", [
      r.proposed_value.role,
      r.proposed_value.branchId,
      r.proposed_value.userId,
    ]);
    await tx.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1", [
      r.proposed_value.userId,
    ]);
  }
  await tx.query(
    "UPDATE settings SET value=$1,version=version+1,changed_at=now() WHERE key=$2 AND scope=$3",
    [JSON.stringify(r.proposed_value), r.key, r.scope],
  );
  await tx.query(
    "INSERT INTO setting_versions(id,key,scope,version,previous_value,value,request_id,actor_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
    [
      id(),
      r.key,
      r.scope,
      r.base_version + 1,
      JSON.stringify(setting!.value),
      JSON.stringify(r.proposed_value),
      r.id,
      user.id,
    ],
  );
  await transitionApproval(
    tx,
    user,
    r.id,
    "active",
    "Setting version activated",
  );
  await tx.query("UPDATE change_requests SET activated_at=now() WHERE id=$1", [
    r.id,
  ]);
  if (r.rollback_of) {
    const reversed = await one(
      tx,
      "SELECT request_id FROM setting_versions WHERE id=$1 AND key=$2 AND scope=$3",
      [r.rollback_of, r.key, r.scope],
    );
    if (!reversed)
      throw new AppError(
        409,
        "Rollback version does not match this setting.",
        "ACTIVATION_FAILED",
      );
    const prior = await one(
      tx,
      "SELECT status FROM change_requests WHERE id=$1",
      [reversed.request_id],
    );
    if (prior?.status === "active")
      await transitionApproval(
        tx,
        user,
        reversed.request_id,
        "rolled_back",
        `Reversed by approved request ${r.id}`,
      );
  }
  await audit(tx, user, "setting.activated", r.id, "success", {
    key: r.key,
    version: r.base_version + 1,
  });
  await notify(
    tx,
    r.requester_id,
    "Setting activated",
    `${d.label} is now active.`,
    r.id,
  );
}
export async function decide(
  tx: SQL,
  user: Actor,
  requestId: string,
  decision: "approve" | "reject" | "request_changes",
  reason: string,
) {
  const r = await one(
    tx,
    "SELECT * FROM change_requests WHERE id=$1 FOR UPDATE",
    [requestId],
  );
  if (!r) throw new AppError(404, "Request not found.");
  const d = await definition(tx, user, r.key, r.scope, "view");
  const delegation = d.approve_roles.includes(user.role)
    ? null
    : await delegatedAuthority(tx, user.id, d, r);
  if (!d.approve_roles.includes(user.role) && !delegation)
    throw new AppError(
      403,
      "Your account has no current approval authority for this request.",
    );
  if (r.requester_id === user.id)
    throw new AppError(
      403,
      "An independent colleague must review your request.",
      "SELF_APPROVAL",
    );
  if (decision === "approve" && d.value_type === "checklist" && await ownerRequestAuthorized(tx, r)
      && !(await hasQualifiedSafetyReviewer(tx, [user.id])))
    throw new AppError(403, "A current independently verified safety-review qualification is required.");
  if (
    !["pending_approval", "partially_approved"].includes(r.status) ||
    new Date(r.expires_at).getTime() < Date.now()
  )
    throw new AppError(409, "This request is no longer open for a decision.");
  if (decision !== "approve" && reason.trim().length < 5)
    throw new AppError(
      400,
      "Explain your decision in at least five characters.",
    );
  if (d.additional_verification || delegation) recentVerification(user);
  if (d.value_type === "access" && r.proposed_value.userId === user.id)
    throw new AppError(
      403,
      "You cannot approve an increase to your own privileges.",
    );
  const prior = await one(
    tx,
    "SELECT id FROM approval_decisions WHERE request_id=$1 AND revision=$2 AND approver_id=$3",
    [r.id, r.revision, user.id],
  );
  if (prior) throw new AppError(409, "You have already reviewed this version.");
  const setting = await one(
    tx,
    "SELECT version FROM settings WHERE key=$1 AND scope=$2",
    [r.key, r.scope],
  );
  if (setting?.version !== r.base_version)
    throw new AppError(
      409,
      "The active setting changed. A fresh request is required.",
      "VERSION_CONFLICT",
    );
  await tx.query(
    "INSERT INTO approval_decisions(id,request_id,revision,approver_id,role,decision,reason,verified_at,delegation_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [
      id(),
      r.id,
      r.revision,
      user.id,
      user.role,
      decision,
      reason,
      user.verified_at,
      delegation?.id ?? null,
    ],
  );
  if (decision === "approve") {
    if (await validApprovals(tx, r, d)) {
      await transitionApproval(
        tx,
        user,
        r.id,
        "approved",
        reason || "All independent approvals received",
      );
      await activate(tx, user, r.id);
    } else if (r.status !== "partially_approved")
      await transitionApproval(
        tx,
        user,
        r.id,
        "partially_approved",
        reason || "Additional independent approval required",
      );
  } else
    await transitionApproval(
      tx,
      user,
      r.id,
      decision === "reject" ? "rejected" : "changes_requested",
      reason,
    );
  await audit(tx, user, `approval.${decision}`, r.id);
  await notify(
    tx,
    r.requester_id,
    "Approval update",
    `Your request was ${decision === "approve" ? "reviewed" : decision === "reject" ? "rejected" : "returned for changes"}.`,
    r.id,
  );
  const result = await one(
    tx,
    "SELECT status,failure_reason FROM change_requests WHERE id=$1",
    [r.id],
  );
  return {
    ok: result!.status !== "failed",
    ...result,
    state: result!.status.toUpperCase(),
  };
}
export async function emergencyDisable(
  tx: SQL,
  user: Actor,
  key: string,
  scope: string,
  reason: string,
) {
  allow(user, ["owner"], scope);
  recentVerification(user);
  if (!["payment.integration", "delivery.enabled"].includes(key))
    throw new AppError(
      403,
      "This action is not an approved emergency protection.",
    );
  if (reason.trim().length < 10)
    throw new AppError(
      400,
      "Provide an incident reason of at least ten characters.",
    );
  const s = await one(
    tx,
    "SELECT * FROM settings WHERE key=$1 AND scope=$2 FOR UPDATE",
    [key, scope],
  );
  if (!s) throw new AppError(404, "Setting not found.");
  const requestId = id();
  await tx.query(
    "INSERT INTO change_requests(id,key,scope,requester_id,previous_value,proposed_value,base_version,reason,risk,status,effective_at,expires_at) VALUES ($1,$2,$3,$4,$5,'false',$6,$7,4,'active',now(),now())",
    [
      requestId,
      key,
      scope,
      user.id,
      JSON.stringify(s.value),
      s.version,
      reason,
    ],
  );
  await tx.query(
    "UPDATE settings SET value='false',version=version+1,changed_at=now() WHERE key=$1 AND scope=$2",
    [key, scope],
  );
  await tx.query(
    "INSERT INTO setting_versions(id,key,scope,version,previous_value,value,request_id,actor_id) VALUES ($1,$2,$3,$4,$5,'false',$6,$7)",
    [
      id(),
      key,
      scope,
      s.version + 1,
      JSON.stringify(s.value),
      requestId,
      user.id,
    ],
  );
  await audit(tx, user, "emergency.disabled", requestId, "success", {
    key,
    reason,
    reviewRequired: true,
  });
  for (const u of (
    await tx.query(
      "SELECT id FROM users WHERE active=true AND role IN ('owner','finance')",
    )
  ).rows)
    await notify(
      tx,
      u.id,
      "Emergency protection — review required",
      `${key} was disabled. An independent post-incident review is required.`,
      requestId,
    );
  return { ok: true };
}

export function policySnapshot(d: Row) {
  return {
    risk: d.risk,
    propose_roles: d.propose_roles,
    approve_roles: d.approve_roles,
    required_roles: d.required_roles,
    additional_verification: d.additional_verification,
  };
}
export async function transitionApproval(
  tx: SQL,
  user: Actor,
  rid: string,
  next: string,
  reason: string,
) {
  const r = await one(
    tx,
    "SELECT * FROM change_requests WHERE id=$1 FOR UPDATE",
    [rid],
  );
  if (!r || !approvalTransitions[r.status]?.includes(next))
    throw new AppError(
      409,
      `Approval cannot transition from ${r?.status ?? "missing"} to ${next}.`,
    );
  await tx.query("UPDATE change_requests SET status=$1 WHERE id=$2", [
    next,
    rid,
  ]);
  await audit(tx, user, `approval.${next}`, rid, "success", {
    previousState: r.status.toUpperCase(),
    newState: next.toUpperCase(),
    reason,
    version: r.base_version,
    revision: r.revision,
  });
  await notify(
    tx,
    r.requester_id,
    `Approval ${next.replaceAll("_", " ")}`,
    reason,
    rid,
  );
}
export async function activate(
  tx: SQL,
  user: Actor,
  requestId: string,
  routine = false,
) {
  const r = await one(
    tx,
    "SELECT * FROM change_requests WHERE id=$1 FOR UPDATE",
    [requestId],
  );
  if (!r) throw new AppError(404, "Request not found.");
  if (r.status === "active") return { status: "active", state: "ACTIVE" };
  if (!["approved", "scheduled", "failed"].includes(r.status))
    throw new AppError(409, "This request is not approved for activation.");
  await tx.exec("SAVEPOINT approval_activation");
  try {
    await applyApproved(tx, user, requestId, routine);
    await tx.exec("RELEASE SAVEPOINT approval_activation");
  } catch (error) {
    await tx.exec("ROLLBACK TO SAVEPOINT approval_activation");
    await tx.exec("RELEASE SAVEPOINT approval_activation");
    const stale =
      error instanceof AppError && error.code === "VERSION_CONFLICT";
    if (stale)
      await transitionApproval(
        tx,
        user,
        r.id,
        "superseded",
        "A newer setting version is already active.",
      );
    else {
      await transitionApproval(
        tx,
        user,
        r.id,
        "applying",
        "Activation validation attempt",
      );
      await transitionApproval(
        tx,
        user,
        r.id,
        "failed",
        error instanceof AppError
          ? error.message
          : "Activation failed; the prior value remains active.",
      );
      await audit(tx, user, "approval.activation_diagnostic", r.id, "failed", {
        type: error instanceof Error ? error.name : "unknown",
        code:
          typeof (error as any)?.code === "string" &&
          /^[A-Z0-9_]{1,32}$/.test((error as any).code)
            ? (error as any).code
            : null,
        key: r.key,
        baseVersion: r.base_version,
      });
      await tx.query(
        "UPDATE change_requests SET failure_reason=$1,activation_attempts=activation_attempts+1 WHERE id=$2",
        [
          error instanceof AppError
            ? error.message
            : "Database activation failure; see protected operational diagnostics.",
          r.id,
        ],
      );
    }
  }
  const result = await one(
    tx,
    "SELECT status,failure_reason FROM change_requests WHERE id=$1",
    [r.id],
  );
  return { ...result, state: result!.status.toUpperCase() };
}
