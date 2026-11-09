import { randomBytes } from "node:crypto";
import { z } from "zod";
import { one, type SQL } from "./db";
import { id, AppError, allow, type Actor } from "./auth";
import { approvedRewardPolicy } from "./rewards";
export function referralShareUrl(code: string) {
  if (!/^[a-f0-9]{32}$/.test(code)) return null;
  try {
    const url = new URL(process.env.APP_URL ?? "");
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !url.hostname.includes(".") ||
      /(^|\.)(localhost|local|test|internal)$/.test(url.hostname) ||
      /^[\d.:\[\]]+$/.test(url.hostname)
    )
      return null;
    url.pathname = "/register";
    url.search = "";
    url.hash = "";
    url.searchParams.set("ref", code);
    return url.toString();
  } catch {
    return null;
  }
}
export async function referralAction(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
): Promise<any> {
  if (!["rewards.referral", "rewards.referral.attribute"].includes(action))
    return;
  allow(user, ["customer", "commercial"]);
  const approved = await approvedRewardPolicy(tx, user.branch_id ?? "lagos");
  const enabled =
    !!approved?.policy.referralEnabled &&
    process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED === "true";
  if (
    enabled &&
    !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
      user.branch_id ?? "lagos",
    ]))
  )
    throw new AppError(409, "This branch is inactive.");
  if (action === "rewards.referral") {
    z.object({}).strict().parse(input);
    if (!enabled) return { enabled: false, code: null, shareUrl: null };
    await tx.query(
      "INSERT INTO reward_referral_codes(customer_id,code) VALUES($1,$2) ON CONFLICT(customer_id) DO NOTHING",
      [user.id, randomBytes(16).toString("hex")],
    );
    const row = await one(
      tx,
      "SELECT code FROM reward_referral_codes WHERE customer_id=$1",
      [user.id],
    );
    return {
      enabled: true,
      code: row!.code,
      shareUrl: referralShareUrl(row!.code),
    };
  }
  const d = z
    .object({ code: z.string().regex(/^[a-f0-9]{32}$/) })
    .strict()
    .parse(input);
  if (!enabled) throw new AppError(409, "Referral programme is disabled.");
  await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
  const referrer = await one(
    tx,
    "SELECT c.customer_id FROM reward_referral_codes c JOIN users u ON u.id=c.customer_id WHERE c.code=$1 AND u.active=true AND u.branch_id IS NOT DISTINCT FROM $2",
    [d.code, user.branch_id],
  );
  if (!referrer || referrer.customer_id === user.id)
    throw new AppError(409, "This referral cannot be applied.");
  const existing = await one(
    tx,
    "SELECT code FROM reward_referrals WHERE customer_id=$1",
    [user.id],
  );
  if (existing) {
    if (existing.code === d.code) return { ok: true };
    throw new AppError(409, "A referral is already attributed.");
  }
  if (
    await one(
      tx,
      "SELECT id FROM orders WHERE customer_id=$1 AND status='delivered' AND payment_status IN ('verified','refunded') LIMIT 1",
      [user.id],
    )
  )
    throw new AppError(
      409,
      "A referral must be added before the first qualifying purchase.",
    );
  await tx.query(
    "INSERT INTO reward_referrals(customer_id,referrer_id,code,attribution_id) VALUES($1,$2,$3,$4)",
    [user.id, referrer.customer_id, d.code, id()],
  );
  return { ok: true };
}
export async function awardReferral(
  tx: SQL,
  order: any,
  policy: any,
  policyVersion: string,
  eligible: bigint,
) {
  if (!policy.referralEnabled || policy.referralPoints <= 0 || eligible <= 0n)
    return;
  const r = await one(
    tx,
    "SELECT * FROM reward_referrals WHERE customer_id=$1 FOR UPDATE",
    [order.customer_id],
  );
  if (
    r &&
    (await one(
      tx,
      "SELECT attribution_id FROM reward_referral_reviews WHERE attribution_id=$1 AND state IN ('held','blocked')",
      [r.attribution_id],
    ))
  )
    throw new AppError(409, "Referral requires independent risk review.");
  if (
    !r ||
    r.awarded_entry_id ||
    new Date(order.created_at) <= new Date(r.created_at)
  )
    return;
  // Pick the actual earliest paid+fulfilled eligible source, not whichever job
  // happens to run first after an outage. Later orders must not suppress it.
  const first = await one(
    tx,
    `SELECT o.id FROM orders o JOIN reward_jobs j ON j.order_id=o.id
    JOIN verified_payments p ON p.order_id=o.id
    WHERE o.customer_id=$1 AND o.status='delivered' AND o.payment_status IN ('verified','refunded')
      AND (SELECT COALESCE(sum((line->>'subtotal')::bigint),0) FROM jsonb_array_elements(j.snapshot->'lines') line WHERE line->>'category'=ANY($2::text[]))>o.reward_discount_kobo
    GROUP BY o.id,o.delivered_at,o.created_at,o.total_kobo
    HAVING sum(p.amount_kobo)>=o.total_kobo
    ORDER BY GREATEST(COALESCE(o.delivered_at,o.created_at),max(p.created_at)),o.created_at,o.id LIMIT 1`,
    [order.customer_id, policy.eligibleCategories],
  );
  if (first?.id !== order.id) return;
  const referrer = await one(
    tx,
    "SELECT id FROM users WHERE id=$1 AND branch_id=$2 AND active=true AND role IN ('customer','commercial') FOR UPDATE",
    [r.referrer_id, order.branch_id],
  );
  if (!referrer) return;
  const entry = await one(
    tx,
    "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,$3,$4) ON CONFLICT(reference) DO NOTHING RETURNING id",
    [
      id(),
      r.referrer_id,
      policy.referralPoints,
      `referral:${r.attribution_id}`,
    ],
  );
  if (entry) {
    await tx.query(
      "INSERT INTO reward_entry_details(entry_id,branch_id,order_id,policy_version_id,kind,detail) VALUES($1,$2,$3,$4,'referral',$5)",
      [
        entry.id,
        order.branch_id,
        order.id,
        policyVersion,
        JSON.stringify({
          policy,
          source:
            "First verified fulfilled purchase; public history hides referred identity",
        }),
      ],
    );
    await tx.query(
      "UPDATE reward_referrals SET source_order_id=$1,awarded_entry_id=$2 WHERE customer_id=$3",
      [order.id, entry.id, order.customer_id],
    );
  }
}
export async function reverseReferral(tx: SQL, orderId: string) {
  const r = await one(
    tx,
    "SELECT e.*,d.branch_id,d.policy_version_id FROM reward_referrals r JOIN reward_entries e ON e.id=r.awarded_entry_id JOIN reward_entry_details d ON d.entry_id=e.id WHERE r.source_order_id=$1",
    [orderId],
  );
  if (!r) return;
  await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
    r.customer_id,
  ]);
  const entry = await one(
    tx,
    "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,$3,$4) ON CONFLICT(reference) DO NOTHING RETURNING id",
    [id(), r.customer_id, -Number(r.points), `referral-refund:${r.id}`],
  );
  if (entry) {
    await tx.query(
      "INSERT INTO reward_entry_details(entry_id,branch_id,order_id,policy_version_id,kind,original_entry_id,detail) VALUES($1,$2,$3,$4,'reversed',$5,$6)",
      [
        entry.id,
        r.branch_id,
        orderId,
        r.policy_version_id,
        r.id,
        JSON.stringify({
          reason: "Qualifying referral purchase refunded",
          financeReview: true,
        }),
      ],
    );
    await tx.query(
      "INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role) VALUES($1,$2,'high','reward_reversal_review',$3,'Referral bonus reversed after qualifying refund. Finance review; monetary wallet must not be debited.','finance') ON CONFLICT(category,target) DO NOTHING",
      [id(), r.branch_id, entry.id],
    );
  }
}
