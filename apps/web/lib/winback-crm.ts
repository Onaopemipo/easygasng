import { retentionPolicy } from "./operations-schema";
import { z } from "zod";
import { one, type SQL } from "./db";
import { allow, AppError, id, type Actor } from "./auth";
import { audit } from "./governance";
import { enqueueChannel } from "./channel-messaging";
async function followupPage(tx: SQL, user: Actor, input: unknown) {
  const d = z
    .object({
      after: z.string().uuid().optional(),
      limit: z.coerce.number().int().min(1).max(100).default(100),
      q: z.string().trim().max(100).default(""),
    })
    .strict()
    .parse(input);
  const cursor = d.after
    ? await one(
        tx,
        "SELECT due_at::text AS due_at,id FROM crm_followups WHERE id=$1 AND ($2::boolean OR branch_id=$3)",
        [d.after, user.role === "owner", user.branch_id],
      )
    : null;
  if (d.after && !cursor)
    throw new AppError(400, "Choose a valid follow-up cursor in your branch.");
  const rows = (
    await tx.query(
      "SELECT f.*,u.name AS customer_name FROM crm_followups f JOIN users u ON u.id=f.customer_id WHERE ($1::boolean OR f.branch_id=$2) AND ($3::text IS NULL OR (f.due_at,f.id)>($3::timestamptz,$4::text)) AND (u.name ILIKE $5 OR u.public_customer_id ILIKE $5 OR f.next_action ILIKE $5) ORDER BY f.due_at,f.id LIMIT $6",
      [
        user.role === "owner",
        user.branch_id,
        cursor ? cursor.due_at : null,
        cursor?.id ?? null,
        "%" + d.q.replace(/[\\%_]/g, "\\$&") + "%",
        d.limit + 1,
      ],
    )
  ).rows;
  const hasMore = rows.length > d.limit;
  if (hasMore) rows.pop();
  return {
    followups: rows,
    hasMore,
    nextCursor: hasMore ? rows.at(-1)?.id : null,
  };
}
export async function winbackCRM(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  allow(user, ["owner", "manager"]);
  if (action === "crm.followups") return followupPage(tx, user, input);
  const d = z
    .object({
      customerId: z.string().uuid().optional(),
      after: z.string().uuid().optional(),
      q: z.string().trim().max(100).default(""),
      limit: z.coerce.number().int().min(1).max(100).default(50),
      ownerId: z.string().uuid().optional(),
      dueAt: z.iso.datetime().optional(),
      nextAction: z.string().trim().min(5).max(500).optional(),
      channel: z.enum(["sms", "whatsapp"]).optional(),
      followupId: z.string().uuid().optional(),
      outcome: z.string().trim().min(5).max(500).optional(),
      reason: z.string().trim().min(10).max(500).optional(),
    })
    .strict()
    .parse(input);
  const summary = action === "crm.summary";
  const pattern = "%" + d.q.replace(/[\\%_]/g, "\\$&") + "%";
  if (
    summary &&
    d.after &&
    !(await one(
      tx,
      "SELECT id FROM users WHERE id=$1 AND role IN ('customer','commercial') AND active=true AND ($2::boolean OR branch_id=$3)",
      [d.after, user.role === "owner", user.branch_id],
    ))
  )
    throw new AppError(400, "Choose a valid customer page cursor.");
  const rows = (
    await tx.query(
      "SELECT u.id,u.name,u.public_customer_id,u.branch_id,(SELECT count(*) FROM message_outbox m WHERE m.user_id=u.id AND m.purpose='marketing' AND m.dedupe_key LIKE 'winback:%' AND m.status='pending' AND m.lease_until IS NULL) AS pending_winbacks,count(o.id) AS completed_orders,max(da.completed_at) AS last_purchase,COALESCE(sum(o.total_kobo),0) AS order_value_kobo FROM users u LEFT JOIN orders o ON o.customer_id=u.id AND o.status='delivered' AND o.payment_status='verified' AND o.branch_id=u.branch_id AND NOT EXISTS(SELECT 1 FROM credit_requests cr WHERE cr.order_id=o.id AND cr.kind='refund' AND cr.status='approved') AND (SELECT COALESCE(sum(p.amount_kobo),0) FROM verified_payments p WHERE p.order_id=o.id)>=o.total_kobo LEFT JOIN delivery_attempts da ON da.order_id=o.id AND da.state='delivered' WHERE u.role IN ('customer','commercial') AND u.active=true AND ($1::boolean OR u.branch_id=$2) AND ($3::text IS NULL OR u.id=$3) AND ($4::text IS NULL OR u.id>$4) AND (u.name ILIKE $5 OR u.public_customer_id ILIKE $5) GROUP BY u.id ORDER BY u.id LIMIT $6",
      [
        user.role === "owner",
        user.branch_id,
        summary ? null : (d.customerId ?? null),
        summary ? (d.after ?? null) : null,
        summary ? pattern : "%",
        summary ? d.limit + 1 : 1,
      ],
    )
  ).rows;
  const hasMore = summary && rows.length > d.limit;
  if (hasMore) rows.pop();
  const policies = new Map(
    (
      await tx.query(
        "SELECT scope,value FROM settings WHERE key='crm.retention' AND ($1::boolean OR scope=$2)",
        [user.role === "owner", user.branch_id],
      )
    ).rows.map((p) => [p.scope, p.value]),
  );
  const thresholds = (policy: any) => {
    const parsed = retentionPolicy.safeParse(policy);
    return parsed.success
      ? {
          atRiskDays: parsed.data.atRiskDays,
          dormantDays: parsed.data.dormantDays,
          source: "approved_setting",
        }
      : {
          atRiskDays: 45,
          dormantDays: 90,
          source: "default_review_thresholds",
        };
  };
  const { atRiskDays, dormantDays, source } = thresholds(
    policies.get(user.branch_id ?? "lagos"),
  );
  for (const c of rows) {
    const branchPolicy = thresholds(policies.get(c.branch_id));
    c.segmentPolicy = branchPolicy;
    const days = c.last_purchase
      ? Math.floor(
          (Date.now() - new Date(c.last_purchase).getTime()) / 86400000,
        )
      : null;
    c.daysSincePurchase = days;
    c.segment =
      days === null
        ? "low_data"
        : days >= branchPolicy.dormantDays
          ? "dormant"
          : days >= branchPolicy.atRiskDays
            ? "at_risk"
            : "active";
  }
  if (action === "crm.summary")
    return {
      customers: rows,
      hasMore,
      nextCursor: hasMore ? rows.at(-1)?.id : null,
      followupLimit: 100,
      policy: {
        atRiskDays,
        dormantDays,
        source,
      },
      ...(await (async () => {
        const page = await followupPage(tx, user, { q: d.q });
        return {
          followups: page.followups,
          followupsHasMore: page.hasMore,
          followupsNextCursor: page.nextCursor,
        };
      })()),
    };
  if (action === "crm.followup.outcome") {
    if (!d.followupId || !d.outcome)
      throw new AppError(400, "Follow-up and outcome required.");
    const f = await one(
      tx,
      "SELECT * FROM crm_followups WHERE id=$1 FOR UPDATE",
      [d.followupId],
    );
    if (!f) throw new AppError(404, "Follow-up not found.");
    allow(user, ["owner", "manager"], f.branch_id);
    if (f.outcome) throw new AppError(409, "Outcome already recorded.");
    await tx.query("UPDATE crm_followups SET outcome=$1 WHERE id=$2", [
      d.outcome,
      f.id,
    ]);
    await audit(tx, user, action, f.id);
    return { ok: true };
  }
  const c = rows.find((c) => c.id === d.customerId);
  if (!c || !c.branch_id)
    throw new AppError(404, "Customer not available in this branch.");
  if (action === "crm.winback.cancel") {
    if (!d.reason) throw new AppError(400, "Record the cancellation reason.");
    const cancelled = (
      await tx.query(
        "UPDATE message_outbox SET status='cancelled',delivery_status='operator_cancelled' WHERE user_id=$1 AND purpose='marketing' AND dedupe_key LIKE 'winback:%' AND status='pending' AND lease_until IS NULL RETURNING id",
        [c.id],
      )
    ).rows;
    const inFlight = Number(
      (await one(
        tx,
        "SELECT count(*) n FROM message_outbox WHERE user_id=$1 AND purpose='marketing' AND dedupe_key LIKE 'winback:%' AND status='pending' AND lease_until IS NOT NULL",
        [c.id],
      ))!.n,
    );
    await audit(tx, user, action, c.id, "success", {
      reason: d.reason,
      messageIds: cancelled.map((x) => x.id),
      inFlight,
    });
    return {
      cancelled: cancelled.length,
      inFlight,
      providerRecallAttempted: false,
      message: inFlight
        ? "A provider attempt is already leased; review its receipt. Cancellation does not recall accepted messages."
        : "Unsent, unleased win-back messages cancelled.",
    };
  }
  if (action === "crm.followup.create") {
    if (!d.ownerId || !d.dueAt || !d.nextAction)
      throw new AppError(400, "Owner, due date and next action required.");
    const owner = await one(
      tx,
      "SELECT id FROM users WHERE id=$1 AND active=true AND role IN ('owner','manager') AND (role='owner' OR branch_id=$2)",
      [d.ownerId, c.branch_id],
    );
    if (!owner)
      throw new AppError(
        400,
        "Follow-up owner must have access to this branch.",
      );
    const fid = id();
    await tx.query(
      "INSERT INTO crm_followups(id,customer_id,branch_id,owner_id,next_action,due_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [fid, c.id, c.branch_id, d.ownerId, d.nextAction, d.dueAt, user.id],
    );
    await audit(tx, user, action, fid);
    return { id: fid };
  }
  if (action === "crm.winback.queue") {
    if (!d.channel || !["at_risk", "dormant"].includes(c.segment))
      throw new AppError(
        409,
        "Select a reviewed at-risk or dormant customer and channel.",
      );
    const governed = await one(
      tx,
      "SELECT value FROM settings WHERE key='crm.retention' AND scope=$1 FOR UPDATE",
      [c.branch_id],
    );
    const config = retentionPolicy.safeParse(governed?.value);
    if (!config.success || !config.data.enabled)
      throw new AppError(
        409,
        "Win-back requires an independently approved enabled retention policy and message budget.",
      );
    if (
      c.daysSincePurchase === null ||
      c.daysSincePurchase < config.data.atRiskDays
    )
      throw new AppError(
        409,
        "Customer no longer meets the approved retention threshold.",
      );
    const day = new Date().toLocaleDateString("en-CA", {
      timeZone: "Africa/Lagos",
    });
    const dedupe = `winback:${c.id}:${day}`;
    const existing = await one(
      tx,
      "SELECT id,status,delivery_status,channel FROM message_outbox WHERE dedupe_key=$1 AND user_id=$2",
      [dedupe, c.id],
    );
    if (existing)
      return {
        queued: existing.status === "pending",
        delivered: false,
        replayed: true,
        messageId: existing.id,
        status: existing.status,
        channel: existing.channel,
        deliveryStatus: existing.delivery_status,
      };
    const reserved = Number(
      (
        await one(
          tx,
          "SELECT count(*) AS n FROM message_outbox m JOIN users u ON u.id=m.user_id WHERE u.branch_id=$1 AND m.purpose='marketing' AND m.status<>'cancelled' AND m.created_at>=date_trunc('month',now() AT TIME ZONE 'Africa/Lagos') AT TIME ZONE 'Africa/Lagos'",
          [c.branch_id],
        )
      )?.n ?? 0,
    );
    if (
      (reserved + 1) * config.data.costCeilingPerMessageKobo >
      config.data.monthlyBudgetKobo
    )
      throw new AppError(409, "Approved monthly message budget is exhausted.");
    const queued = await enqueueChannel(tx, {
      userId: c.id,
      channel: d.channel,
      purpose: "marketing",
      body: "Ready for your next EasyGas refill? Review current availability and prices on your account. Reply STOP or update your account preferences to opt out.",
      dedupe,
      template: process.env.META_WINBACK_TEMPLATE,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    await audit(tx, user, action, c.id);
    return { ...queued, delivered: false };
  }
  throw new AppError(404, "Unknown CRM action.");
}
