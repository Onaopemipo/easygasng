import { z } from "zod";
import { one, type SQL, type Row } from "./db";
import { allow, recentVerification, id, AppError, type Actor } from "./auth";
import { audit, notify } from "./governance";
function eligible(d: Row) {
  return (
    d.risk === 2 &&
    ["boolean", "integer"].includes(d.value_type) &&
    !["Staff & Permissions", "Security", "Payments & Wallet"].includes(
      d.category,
    ) &&
    (d.key === "delivery.capacity" || d.key.startsWith("publish."))
  );
}
export async function delegatedAuthority(
  tx: SQL,
  uid: string,
  d: Row,
  r: Row,
  delegationId?: string,
) {
  if (!eligible(d)) return null;
  const grants = (
    await tx.query(
      "SELECT a.*,g.active AS grantor_active,g.role AS grantor_role,g.branch_id AS grantor_branch,v.active AS reviewer_active,v.role AS reviewer_role FROM approval_delegations a JOIN users g ON g.id=a.grantor_id JOIN users v ON v.id=a.reviewed_by JOIN users du ON du.id=a.delegate_id WHERE du.active=true AND du.role IN ('manager','finance') AND du.branch_id=a.scope AND a.delegate_id=$1 AND a.setting_key=$2 AND a.scope=$3 AND a.status='approved' AND a.starts_at<=now() AND a.expires_at>now()",
      [uid, d.key, r.scope],
    )
  ).rows;
  return (
    grants.find(
      (a) =>
        (!delegationId || a.id === delegationId) &&
        a.grantor_active &&
        a.reviewer_active &&
        a.reviewer_role === "owner" &&
        a.reviewed_by !== a.grantor_id &&
        a.grantor_id !== r.requester_id &&
        ["owner", "manager"].includes(a.grantor_role) &&
        d.approve_roles.includes(a.grantor_role) &&
        (a.grantor_role === "owner" || a.grantor_branch === r.scope) &&
        (a.maximum_value === null ||
          typeof r.proposed_value === "boolean" ||
          Number(r.proposed_value) <= Number(a.maximum_value)),
    ) ?? null
  );
}
export async function delegationAction(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
): Promise<any> {
  if (action === "delegations") {
    allow(user, ["owner", "manager", "finance"]);
    return (
      await tx.query(
        `SELECT a.*,g.name AS grantor,d.name AS delegate,s.label FROM approval_delegations a JOIN users g ON g.id=a.grantor_id JOIN users d ON d.id=a.delegate_id JOIN setting_definitions s ON s.key=a.setting_key WHERE ${user.role === "owner" ? "true" : "a.grantor_id=$1 OR a.delegate_id=$1"} ORDER BY a.created_at DESC LIMIT 100`,
        user.role === "owner" ? [] : [user.id],
      )
    ).rows;
  }
  if (action === "delegation.request") {
    allow(user, ["owner", "manager"]);
    recentVerification(user);
    const d = z
      .object({
        delegateId: z.string().uuid(),
        key: z.string().max(100),
        scope: z.string().max(100),
        maximumValue: z.number().int().positive().max(10000).nullable(),
        startsAt: z.iso.datetime(),
        expiresAt: z.iso.datetime(),
        reason: z.string().trim().min(10).max(1000),
      })
      .strict()
      .parse(input);
    allow(user, ["owner", "manager"], d.scope);
    const definition = await one(
      tx,
      "SELECT * FROM setting_definitions WHERE key=$1",
      [d.key],
    );
    if (
      !definition ||
      !eligible(definition) ||
      !definition.approve_roles.includes(user.role)
    )
      throw new AppError(
        403,
        "Only bounded Level 2 publication or delivery-capacity authority can be delegated. Financial and security authority cannot be delegated.",
      );
    const delegate = await one(
      tx,
      "SELECT role,branch_id,active FROM users WHERE id=$1",
      [d.delegateId],
    );
    if (
      !delegate?.active ||
      !["manager", "finance"].includes(
        delegate.role,
      ) ||
      delegate.branch_id !== d.scope ||
      !definition.view_roles.includes(delegate.role) ||
      d.delegateId === user.id
    )
      throw new AppError(
        400,
        "Choose a different active eligible colleague in the same branch.",
      );
    const start = Date.parse(d.startsAt),
      end = Date.parse(d.expiresAt);
    if (
      start < Date.now() - 60000 ||
      end <= start ||
      end > Date.now() + 7 * 86400000
    )
      throw new AppError(
        400,
        "Choose a current or future start and an expiry within seven days.",
      );
    if (
      definition.value_type === "integer" &&
      (d.maximumValue === null || d.maximumValue > Number(definition.maximum))
    )
      throw new AppError(
        400,
        "Enter a maximum value within the setting limit.",
      );
    const did = id();
    await tx.query(
      "INSERT INTO approval_delegations(id,grantor_id,delegate_id,setting_key,scope,maximum_value,reason,starts_at,expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        did,
        user.id,
        d.delegateId,
        d.key,
        d.scope,
        d.maximumValue,
        d.reason,
        d.startsAt,
        d.expiresAt,
      ],
    );
    await audit(tx, user, "delegation.requested", did);
    return { id: did };
  }
  if (action === "delegation.decide") {
    allow(user, ["owner"]);
    recentVerification(user);
    const d = z
        .object({
          id: z.string().uuid(),
          decision: z.enum(["approved", "rejected"]),
          reason: z.string().min(10).max(1000),
        })
        .strict()
        .parse(input),
      a = await one(
        tx,
        "SELECT * FROM approval_delegations WHERE id=$1 FOR UPDATE",
        [d.id],
      );
    if (!a) throw new AppError(404, "Delegation not found.");
    if (a.grantor_id === user.id || a.delegate_id === user.id)
      throw new AppError(
        403,
        "A separate business owner must review the delegation.",
      );
    if (a.status !== "pending" || Date.parse(a.expires_at) <= Date.now())
      throw new AppError(409, "This delegation is no longer awaiting review.");
    const grantor = await one(
        tx,
        "SELECT active,role,branch_id FROM users WHERE id=$1",
        [a.grantor_id],
      ),
      delegate = await one(
        tx,
        "SELECT active,role,branch_id FROM users WHERE id=$1",
        [a.delegate_id],
      ),
      definition = await one(
        tx,
        "SELECT * FROM setting_definitions WHERE key=$1",
        [a.setting_key],
      );
    if (
      !grantor?.active ||
      !definition ||
      !eligible(definition) ||
      !definition.approve_roles.includes(grantor.role) ||
      (grantor.role !== "owner" && grantor.branch_id !== a.scope) ||
      !delegate?.active ||
      delegate.branch_id !== a.scope ||
      !["manager", "finance"].includes(delegate.role)
    )
      throw new AppError(
        409,
        "The grantor or recipient no longer has eligible authority.",
      );
    await tx.query(
      "UPDATE approval_delegations SET status=$1,reviewed_by=$2,review_reason=$3 WHERE id=$4",
      [d.decision, user.id, d.reason, a.id],
    );
    await audit(tx, user, `delegation.${d.decision}`, a.id);
    await notify(
      tx,
      a.delegate_id,
      "Delegation reviewed",
      `Your limited approval delegation was ${d.decision}. It cannot be redelegated.`,
      a.id,
    );
    return { ok: true };
  }
  if (action === "delegation.revoke") {
    const d = z
      .object({ id: z.string().uuid(), reason: z.string().min(10).max(1000) })
      .strict()
      .parse(input);
    allow(user, ["owner", "manager"]);
    recentVerification(user);
    const a = await one(
      tx,
      "SELECT * FROM approval_delegations WHERE id=$1 FOR UPDATE",
      [d.id],
    );
    if (!a) throw new AppError(404, "Delegation not found.");
    if (user.role !== "owner" && a.grantor_id !== user.id)
      throw new AppError(
        403,
        "Only the grantor or owner can revoke this delegation.",
      );
    await tx.query(
      "UPDATE approval_delegations SET status='revoked' WHERE id=$1 AND status IN ('pending','approved')",
      [a.id],
    );
    await audit(tx, user, "delegation.revoked", a.id, "success", {
      reason: d.reason,
    });
    return { ok: true };
  }
  return undefined;
}
