import { availableRewardOffers, validateRewardOffer } from "./reward-offers";
import { awardReferral, reverseReferral } from "./rewards-referrals";
import { z } from "zod";
import { one, type SQL } from "./db";
import { id, allow, AppError, recentVerification, type Actor } from "./auth";
import { notify, audit } from "./governance";
import { rewardsPolicy, earnedPoints } from "./rewards-schema";

export async function approvedRewardPolicy(tx: SQL, branch: string) {
  const version = await one(
    tx,
    `SELECT v.id,v.version,v.value FROM settings s
    JOIN setting_versions v ON v.key=s.key AND v.scope=s.scope AND v.version=s.version AND v.value=s.value
    JOIN change_requests r ON r.id=v.request_id
    WHERE s.key='loyalty.policy' AND s.scope=$1 AND r.activated_at IS NOT NULL AND r.status='active'`,
    [branch],
  );
  if (!version) return null;
  return {
    id: String(version.id),
    version: Number(version.version),
    policy: rewardsPolicy.parse(version.value),
  };
}
export async function rewardBalance(tx: SQL, customerId: string) {
  const value = (await one(
    tx,
    "SELECT COALESCE(sum(points),0)::text AS n FROM reward_entries WHERE customer_id=$1",
    [customerId],
  ))!.n;
  const points = Number(value);
  if (!Number.isSafeInteger(points))
    throw new AppError(409, "Rewards balance requires reconciliation.");
  return points;
}
// Only enqueue on the real verified fulfilment event, never scan old orders for backfill.
// Issuance runs separately with a savepoint: optional calculation/notification errors
// cannot roll back a completed delivery or independently verified collection.
export async function enqueueReward(tx: SQL, orderId: string) {
  await tx.exec("SAVEPOINT reward_enqueue");
  try {
    await enqueueEligibleReward(tx, orderId);
    await tx.exec("RELEASE SAVEPOINT reward_enqueue");
  } catch {
    await tx.exec("ROLLBACK TO SAVEPOINT reward_enqueue");
    await tx.exec("RELEASE SAVEPOINT reward_enqueue");
    const o = await one(tx, "SELECT branch_id FROM orders WHERE id=$1", [
      orderId,
    ]);
    if (o)
      await tx.query(
        "INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role) VALUES($1,$2,'high','reward_enqueue_failure',$3,'Optional award enqueue failed. Review source-event policy before approved reconciliation; no historical backfill. Fulfilment is preserved.','finance') ON CONFLICT(category,target) DO NOTHING",
        [id(), o.branch_id, orderId],
      );
  }
}
async function enqueueEligibleReward(tx: SQL, orderId: string) {
  if (process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED !== "true") return;
  const o = await one(
    tx,
    `SELECT o.* FROM orders o JOIN branches b ON b.id=o.branch_id AND b.active=true JOIN users u ON u.id=o.customer_id AND u.role IN ('customer','commercial')
    WHERE o.id=$1 AND o.status='delivered' AND o.payment_status='verified'`,
    [orderId],
  );
  if (!o) return;
  const policy = await approvedRewardPolicy(tx, o.branch_id);
  if (!policy?.policy.earningEnabled) return;
  const lines = await rewardLines(tx, o.id);
  await tx.query(
    "INSERT INTO reward_jobs(order_id,policy_version_id,snapshot) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
    [o.id, policy.id, JSON.stringify({ lines })],
  );
}
export async function processRewards(tx: SQL) {
  if (process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED !== "true")
    return { processed: 0 };
  const jobs = (
    await tx.query(
      "SELECT * FROM reward_jobs WHERE status='pending' ORDER BY created_at,order_id LIMIT 50 FOR UPDATE SKIP LOCKED",
    )
  ).rows;
  let processed = 0;
  for (const job of jobs) {
    await tx.exec("SAVEPOINT reward_posting");
    try {
      const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
        job.order_id,
      ]);
      const current = o ? await approvedRewardPolicy(tx, o.branch_id) : null;
      if (!current?.policy.earningEnabled) {
        await tx.exec("RELEASE SAVEPOINT reward_posting");
        continue;
      }
      const v = await one(
        tx,
        "SELECT value FROM setting_versions WHERE id=$1",
        [job.policy_version_id],
      );
      const policy = rewardsPolicy.parse(v?.value);
      if (!o || o.status !== "delivered" || o.payment_status !== "verified") {
        await tx.query(
          "UPDATE reward_jobs SET status='review',last_error='Source no longer eligible',attempts=attempts+1 WHERE order_id=$1",
          [job.order_id],
        );
      } else {
        await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
          o.customer_id,
        ]);
        // Independent payment evidence must actually cover the monetary total.
        const paid = BigInt(
          (await one(
            tx,
            "SELECT COALESCE(sum(amount_kobo),0)::text n FROM verified_payments WHERE order_id=$1",
            [o.id],
          ))!.n,
        );
        if (paid < BigInt(o.total_kobo))
          throw new Error("Verified payment evidence is incomplete");
        const lines = job.snapshot.lines;
        if (!Array.isArray(lines)) throw new Error("Missing source snapshot");
        const eligible = lines.filter((l: any) =>
          policy.eligibleCategories.includes(l.category),
        );
        let subtotal = eligible.reduce(
          (n: bigint, l: any) => n + BigInt(l.subtotal),
          0n,
        );
        const discount = await one(
          tx,
          "SELECT discount_kobo,eligible_kobo FROM reward_order_discounts WHERE order_id=$1",
          [o.id],
        );
        if (discount)
          subtotal =
            subtotal > BigInt(discount.discount_kobo)
              ? subtotal - BigInt(discount.discount_kobo)
              : 0n;
        const refunded = BigInt(
          (await one(
            tx,
            "SELECT COALESCE(sum((refund_lines->>'eligibleGrossKobo')::bigint-(refund_lines->>'discountKobo')::bigint),0)::text n FROM credit_requests WHERE order_id=$1 AND status='approved' AND refund_lines IS NOT NULL",
            [o.id],
          ))!.n,
        );
        subtotal = subtotal > refunded ? subtotal - refunded : 0n;
        const points = earnedPoints(subtotal, policy.spendPerPointKobo);
        if (points > 0) {
          const entry = await one(
            tx,
            "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,$3,$4) ON CONFLICT(reference) DO NOTHING RETURNING id",
            [id(), o.customer_id, points, `order:${o.id}`],
          );
          if (entry) {
            await tx.query(
              "INSERT INTO reward_entry_details(entry_id,branch_id,order_id,policy_version_id,kind,detail) VALUES($1,$2,$3,$4,'earned',$5)",
              [
                entry.id,
                o.branch_id,
                o.id,
                job.policy_version_id,
                JSON.stringify({
                  eligibleKobo: subtotal.toString(),
                  refundBaselineKobo: refunded.toString(),
                  rounding: "floor",
                  lines: eligible.map((l: any) => ({
                    source: l.source,
                    category: l.category,
                    subtotalKobo: String(l.subtotal),
                  })),
                  policy,
                }),
              ],
            );
            await notify(
              tx,
              o.customer_id,
              "Reward points earned",
              `${points} points earned on ${o.reference}.`,
              o.id,
            );
          }
        }
        await awardReferral(tx, o, policy, job.policy_version_id, subtotal);
        await tx.query(
          "UPDATE reward_jobs SET status='completed',attempts=attempts+1,completed_at=now(),last_error=NULL WHERE order_id=$1",
          [o.id],
        );
        processed++;
      }
      await tx.exec("RELEASE SAVEPOINT reward_posting");
    } catch {
      await tx.exec("ROLLBACK TO SAVEPOINT reward_posting");
      await tx.exec("RELEASE SAVEPOINT reward_posting");
      // No raw errors or customer data in retry diagnostics.
      await tx.query(
        "UPDATE reward_jobs SET attempts=attempts+1,last_error='Posting failed; retry or finance review required',status=CASE WHEN attempts>=4 THEN 'review' ELSE 'pending' END WHERE order_id=$1",
        [job.order_id],
      );
    }
  }
  return { processed };
}
export async function reverseOrderRewards(tx: SQL, orderId: string) {
  await reverseReferral(tx, orderId);
  const o = await one(
    tx,
    "SELECT customer_id,branch_id FROM orders WHERE id=$1",
    [orderId],
  );
  if (!o) return;
  await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
    o.customer_id,
  ]);
  const earned = await one(
    tx,
    "SELECT e.*,d.policy_version_id FROM reward_entries e LEFT JOIN reward_entry_details d ON d.entry_id=e.id WHERE e.reference=$1",
    [`order:${orderId}`],
  );
  if (!earned || Number(earned.points) <= 0) return;
  const entry = await one(
    tx,
    "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,$3,$4) ON CONFLICT(reference) DO NOTHING RETURNING id",
    [id(), o.customer_id, -Number(earned.points), `refund:${orderId}`],
  );
  if (entry) {
    const review = (await rewardBalance(tx, o.customer_id)) < 0;
    await tx.query(
      "INSERT INTO reward_entry_details(entry_id,branch_id,order_id,policy_version_id,kind,original_entry_id,detail) VALUES($1,$2,$3,$4,'reversed',$5,$6)",
      [
        entry.id,
        o.branch_id,
        orderId,
        earned.policy_version_id ?? null,
        earned.id,
        JSON.stringify({
          reason: "Verified full order refund",
          financeReview: review,
        }),
      ],
    );
    if (review)
      await tx.query(
        "INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role) VALUES($1,$2,'high','reward_reversal_review',$3,'Award reversal exceeds remaining points. Point spending restricted; finance review and independent adjustment approval required. Monetary wallet must not be debited.','finance') ON CONFLICT(category,target) DO NOTHING",
        [id(), o.branch_id, entry.id],
      );
  }
}
export async function rewardsAction(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
): Promise<any> {
  if (action === "rewards.checkout-outcome") {
    allow(user, ["customer", "commercial"]);
    const d = z
      .object({ idempotencyKey: z.string().uuid() })
      .strict()
      .parse(input);
    const o = await one(
      tx,
      "SELECT id,reference,total_kobo,reward_discount_kobo FROM orders WHERE customer_id=$1 AND idempotency_key=$2",
      [user.id, d.idempotencyKey],
    );
    return o
      ? { status: "COMMITTED", order: o }
      : {
          status: "NOT_FOUND",
          message:
            "Retry the same checkout key and payload; do not assume a timeout failed.",
        };
  }
  if (action === "rewards.summary") {
    z.object({}).strict().parse(input);
    allow(user, ["customer", "commercial"]);
    const balance = await rewardBalance(tx, user.id);
    const policy = await approvedRewardPolicy(tx, user.branch_id ?? "lagos");
    const entries = (
      await tx.query(
        `SELECT e.id,e.points,CASE WHEN d.kind IN ('referral','reversed') THEN d.kind ELSE e.reference END AS reference,e.created_at,d.kind,CASE WHEN b.customer_id=e.customer_id THEN d.booking_id ELSE NULL END AS booking_id,b.reference AS booking_reference,CASE WHEN o.customer_id=e.customer_id THEN d.order_id ELSE NULL END AS order_id,o.reference AS order_reference
      FROM reward_entries e LEFT JOIN reward_entry_details d ON d.entry_id=e.id LEFT JOIN orders o ON o.id=d.order_id AND o.customer_id=e.customer_id LEFT JOIN service_bookings b ON b.id=d.booking_id AND b.customer_id=e.customer_id
      WHERE e.customer_id=$1 ORDER BY e.created_at DESC,e.id DESC LIMIT 200`,
        [user.id],
      )
    ).rows;
    return {
      customerId: user.id,
      points: balance,
      availablePoints: Math.max(0, balance),
      restricted: balance < 0,
      pendingPoints: null,
      pendingAwards: Number(
        (await one(
          tx,
          "SELECT (SELECT count(*) FROM reward_jobs j JOIN orders o ON o.id=j.order_id WHERE o.customer_id=$1 AND j.status='pending')+(SELECT count(*) FROM reward_service_jobs j JOIN service_bookings b ON b.id=j.booking_id WHERE b.customer_id=$1 AND j.status='pending') AS n",
          [user.id],
        ))!.n,
      ),
      reservedPoints: 0,
      entries,
      earningEnabled:
        !!policy?.policy.earningEnabled &&
        process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED === "true",
      redemptionEnabled:
        !!policy?.policy.redemptionEnabled &&
        process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED === "true" &&
        balance >= 0,
      policy: policy ? { version: policy.version, ...policy.policy } : null,
      catalogue: await availableRewardOffers(tx, user),
      referral: null,
      historyLimit: 200,
      message:
        "Points are separate from monetary purchase credit. Checkout discounts and referrals require an approved policy.",
    };
  }
  if (action === "rewards.export") {
    allow(user, ["owner", "finance", "manager"]);
    recentVerification(user);
    const report = await rewardsAction(tx, "rewards.report", user, input);
    await audit(
      tx,
      user,
      "rewards.exported",
      user.branch_id ?? "all",
      "success",
      { rows: report.ledger.length },
    );
    return report;
  }
  if (action === "rewards.report") {
    const d = z
      .object({ branchId: z.string().max(100).optional() })
      .strict()
      .parse(input);
    allow(user, ["owner", "finance", "manager"]);
    const branch = d.branchId ?? user.branch_id;
    if (branch) allow(user, ["owner", "finance", "manager"], branch);
    const scope = user.role === "owner" && !branch ? null : branch;
    if (user.role !== "owner" && !scope)
      throw new AppError(403, "A branch scope is required.");
    const ledger = (
      await tx.query(
        `SELECT e.customer_id,COALESCE(d.branch_id,u.branch_id) AS branch_id,
      COALESCE(sum(e.points),0)::text AS net_points,
      COALESCE(sum(CASE WHEN d.kind='earned' THEN e.points ELSE 0 END),0)::text AS earned_points,
      COALESCE(sum(CASE WHEN d.kind='referral' THEN e.points ELSE 0 END),0)::text AS referral_points,
      COALESCE(sum(CASE WHEN d.kind='redeemed' THEN -e.points ELSE 0 END),0)::text AS redeemed_points,
      COALESCE(sum(CASE WHEN d.kind='reversed' THEN -e.points ELSE 0 END),0)::text AS reversed_points,
      COALESCE(sum(CASE WHEN d.kind='adjustment' THEN e.points ELSE 0 END),0)::text AS adjusted_points,
      COALESCE(sum(CASE WHEN d.entry_id IS NULL THEN e.points ELSE 0 END),0)::text AS legacy_points,
      COALESCE(sum(CASE WHEN e.points>0 THEN e.points ELSE 0 END),0)::text AS positive_points,
      COALESCE(sum(CASE WHEN e.points<0 THEN -e.points ELSE 0 END),0)::text AS negative_points
      FROM reward_entries e JOIN users u ON u.id=e.customer_id LEFT JOIN reward_entry_details d ON d.entry_id=e.id
      WHERE ($1::text IS NULL OR COALESCE(d.branch_id,u.branch_id)=$1)
      GROUP BY e.customer_id,COALESCE(d.branch_id,u.branch_id) ORDER BY e.customer_id`,
        [scope],
      )
    ).rows;
    const rates = new Map<string, any>();
    for (const row of ledger) {
      if (!rates.has(row.branch_id))
        rates.set(row.branch_id, await approvedRewardPolicy(tx, row.branch_id));
      const p = rates.get(row.branch_id);
      row.estimatedDiscountKobo = p
        ? (BigInt(row.net_points) > 0n
            ? BigInt(row.net_points) * BigInt(p.policy.discountPerPointKobo)
            : 0n
          ).toString()
        : null;
      row.valuationPolicyVersion = p?.version ?? null;
    }
    const jobs = (
      await tx.query(
        `SELECT j.order_id,NULL::text booking_id,j.status,j.attempts,j.last_error FROM reward_jobs j JOIN orders o ON o.id=j.order_id WHERE ($1::text IS NULL OR o.branch_id=$1) UNION ALL SELECT NULL::text,j.booking_id,j.status,j.attempts,j.last_error FROM reward_service_jobs j JOIN service_bookings b ON b.id=j.booking_id WHERE ($1::text IS NULL OR b.branch_id=$1) LIMIT 200`,
        [scope],
      )
    ).rows;
    return {
      ledger,
      jobs,
      referrals: (
        await tx.query(
          "SELECT r.attribution_id,r.customer_id,u.name AS customer_name,r.referrer_id,ru.name AS referrer_name,r.awarded_entry_id,v.state,v.reason FROM reward_referrals r JOIN users u ON u.id=r.customer_id JOIN users ru ON ru.id=r.referrer_id LEFT JOIN reward_referral_reviews v ON v.attribution_id=r.attribution_id WHERE ($1::text IS NULL OR u.branch_id=$1) ORDER BY r.created_at DESC LIMIT 200",
          [scope],
        )
      ).rows,
      offers: scope
        ? ((await approvedRewardPolicy(tx, scope))?.policy.offers ?? [])
        : [],
      offerSpending: (
        await tx.query(
          "SELECT c.offer_id,c.policy_version_id,sum(c.discount_kobo)::text spent_kobo,count(*)::int claims FROM reward_offer_claims c JOIN orders o ON o.id=c.order_id WHERE ($1::text IS NULL OR o.branch_id=$1) GROUP BY c.offer_id,c.policy_version_id",
          [scope],
        )
      ).rows,
      valuation:
        "Estimated discount value uses each currently approved branch rate and positive ledger balance; it is not cash, a wallet posting or recognised accounting liability. No margin conclusion is possible without approved costing. Legacy rows may lack historical branch attribution.",
      legacyAttribution:
        "Legacy rows use current customer branch; do not infer an historical branch.",
      redemptionEnabled: false,
    };
  }
  if (action === "rewards.program") {
    const p = await approvedRewardPolicy(tx, user.branch_id ?? "lagos");
    return {
      enabled:
        !!p?.policy.earningEnabled &&
        process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED === "true",
      spendPerPoint: p?.policy.spendPerPointKobo ?? null,
      creditPerPoint: null,
      walletEnabled:
        (
          await one(
            tx,
            "SELECT value FROM settings WHERE key='wallet.enabled' AND scope=$1",
            [user.branch_id ?? "lagos"],
          )
        )?.value ?? false,
      redemptionEnabled:
        !!p?.policy.redemptionEnabled &&
        process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED === "true",
      policyVersion: p?.version ?? null,
    };
  }
  if (action === "rewards.redeem") {
    const d = z
      .object({
        points: z.number().int().positive().max(1000000),
        idempotencyKey: z.string().uuid(),
      })
      .strict()
      .parse(input);
    allow(user, ["customer", "commercial"]);
    // Older clients may reconcile their own already-committed conversion only.
    const old = await one(
      tx,
      "SELECT points,credit_kobo FROM reward_redemptions WHERE customer_id=$1 AND idempotency_key=$2",
      [user.id, d.idempotencyKey],
    );
    if (old) {
      if (Number(old.points) !== d.points)
        throw new AppError(
          409,
          "This redemption key was used for another amount.",
        );
      return { ok: true, creditKobo: Number(old.credit_kobo), legacy: true };
    }
    throw new AppError(
      409,
      "Point-to-wallet conversion is closed. Checkout discounts await approved policy and integrity acceptance.",
    );
  }
}

export async function rewardLines(tx: SQL, orderId: string) {
  return (
    await tx.query(
      `SELECT i.product_id AS source,(i.quantity::bigint*i.unit_price_kobo)::text AS subtotal,p.category FROM order_items i JOIN products p ON p.id=i.product_id WHERE i.order_id=$1
    UNION ALL SELECT g.id,g.subtotal_kobo::text,'Gas refills' FROM order_gas_lines g WHERE g.order_id=$1`,
      [orderId],
    )
  ).rows;
}
// A checkout commits the discount and negative point entry together, so there is
// no separately pending reservation to leak after a failed/abandoned transaction.
export async function applyRewardDiscount(
  tx: SQL,
  user: Actor,
  orderId: string,
  points: number,
  offerId?: string,
) {
  allow(user, ["customer", "commercial"]);
  if (process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED !== "true")
    throw new AppError(409, "Checkout reward discounts are disabled.");
  const o = await one(
    tx,
    "SELECT * FROM orders WHERE id=$1 AND customer_id=$2 FOR UPDATE",
    [orderId, user.id],
  );
  if (!o || o.status !== "placed")
    throw new AppError(409, "Review the current checkout.");
  await tx.query(
    "SELECT key FROM settings WHERE key='loyalty.policy' AND scope=$1 FOR UPDATE",
    [o.branch_id],
  );
  const approved = await approvedRewardPolicy(tx, o.branch_id);
  if (!approved?.policy.redemptionEnabled)
    throw new AppError(
      409,
      "Reward discount policy is not independently approved.",
    );
  const policy = approved.policy;
  if (offerId)
    await validateRewardOffer(tx, user, o.branch_id, offerId, points, policy);
  await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
  const balance = await rewardBalance(tx, user.id);
  if (balance < points || balance < 0)
    throw new AppError(409, "Insufficient available reward points.");
  if (points < policy.minimumPoints)
    throw new AppError(409, "The minimum redemption has not been reached.");
  const lines = await rewardLines(tx, orderId);
  const eligible = lines
    .filter((l) => policy.eligibleCategories.includes(l.category))
    .reduce((n, l) => n + BigInt(l.subtotal), 0n);
  const amount = BigInt(points) * BigInt(policy.discountPerPointKobo);
  const cap = (eligible * BigInt(policy.maximumDiscountBps)) / 10000n;
  if (amount > cap || amount > eligible || amount > BigInt(o.subtotal_kobo))
    throw new AppError(409, "Points exceed the eligible cart discount limit.");
  if (offerId)
    await tx.query(
      "INSERT INTO reward_offer_claims(order_id,offer_id,policy_version_id,discount_kobo,customer_id) VALUES($1,$2,$3,$4,$5)",
      [orderId, offerId, approved.id, amount.toString(), user.id],
    );
  const entry = id();
  await tx.query(
    "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,$3,$4)",
    [entry, user.id, -points, `discount:${orderId}`],
  );
  await tx.query(
    "INSERT INTO reward_entry_details(entry_id,branch_id,order_id,policy_version_id,kind,detail) VALUES($1,$2,$3,$4,'redeemed',$5)",
    [
      entry,
      o.branch_id,
      orderId,
      approved.id,
      JSON.stringify({
        discountKobo: amount.toString(),
        commitMilestone: "checkout",
        policy,
      }),
    ],
  );
  await tx.query(
    "INSERT INTO reward_order_discounts(order_id,entry_id,policy_version_id,points,discount_kobo,eligible_kobo,snapshot) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      orderId,
      entry,
      approved.id,
      points,
      amount.toString(),
      eligible.toString(),
      JSON.stringify({ policy, lines, deliveryKobo: String(o.delivery_kobo) }),
    ],
  );
  await tx.query(
    "UPDATE orders SET reward_discount_kobo=$1,total_kobo=subtotal_kobo+delivery_kobo-$1 WHERE id=$2",
    [amount.toString(), orderId],
  );
  return Number(amount);
}
export async function restoreOrderDiscount(tx: SQL, orderId: string) {
  const d = await one(
    tx,
    "SELECT d.*,o.customer_id,o.branch_id FROM reward_order_discounts d JOIN orders o ON o.id=d.order_id WHERE d.order_id=$1",
    [orderId],
  );
  if (!d) return;
  await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
    d.customer_id,
  ]);
  const entry = await one(
    tx,
    "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,$3,$4) ON CONFLICT(reference) DO NOTHING RETURNING id",
    [id(), d.customer_id, d.points, `discount-restore:${orderId}`],
  );
  if (entry)
    await tx.query(
      "INSERT INTO reward_entry_details(entry_id,branch_id,order_id,policy_version_id,kind,original_entry_id,detail) VALUES($1,$2,$3,$4,'restored',$5,$6)",
      [
        entry.id,
        d.branch_id,
        orderId,
        d.policy_version_id,
        d.entry_id,
        JSON.stringify({ reason: "Cancelled order or verified full refund" }),
      ],
    );
}
