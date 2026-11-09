import { gasQuote } from "./gas-delivery";
import { z } from "zod";
import { type SQL, one } from "./db";
import {
  type Actor,
  allow,
  recentVerification,
  id,
  digest,
  AppError,
} from "./auth";
import { checkoutSchema, checkout, settingValue } from "./operations";
import { audit, notify } from "./governance";
export async function schedulingAction(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
): Promise<any> {
  if (action === "schedule.authorisations")
    return (
      await tx.query(
        "SELECT a.*,s.product_id,s.next_date FROM recurring_authorisations a JOIN refill_schedules s ON s.id=a.schedule_id WHERE a.customer_id=$1 ORDER BY a.authorised_at DESC",
        [user.id],
      )
    ).rows;
  if (action === "schedule.authorise") {
    allow(user, ["customer", "commercial"]);
    recentVerification(user);
    const d = z
      .object({
        scheduleId: z.string().uuid(),
        address: checkoutSchema.shape.address,
        window: z.string().min(1).max(100),
        quantity: z.number().int().min(1).max(20),
        maximumTotalKobo: z.number().int().positive().max(100000000),
        consent: z.literal(true),
      })
      .strict()
      .parse(input);
    const s = await one(
      tx,
      "SELECT * FROM refill_schedules WHERE id=$1 AND customer_id=$2 AND status='active' FOR UPDATE",
      [d.scheduleId, user.id],
    );
    if (!s) throw new AppError(404, "Active refill plan not found.");
    if (!(await settingValue(tx, "subscription.enabled")))
      throw new AppError(409, "Recurring order generation is not enabled.");
    const location = await one(
      tx,
      "SELECT id FROM delivery_locations WHERE branch_id='lagos' AND lower(name)=lower($1) AND active=true AND visible=true AND archived=false",
      [d.address.zone],
    );
    if (!location)
      throw new AppError(400, "Choose an active supported delivery location.");
    if (
      !String(await settingValue(tx, "delivery.windows"))
        .split(",")
        .map((w) => w.trim())
        .includes(d.window)
    )
      throw new AppError(400, "Choose a configured delivery window.");
    const aid = id(),
      consent =
        "I authorise recurring cash-on-delivery orders for this plan, quantity and address, up to the stated maximum total per order. I can pause the plan or revoke authorisation before generation. No automatic electronic debit is authorised.";
    const existing = await one(
      tx,
      "SELECT id FROM recurring_authorisations WHERE schedule_id=$1",
      [s.id],
    );
    if (existing)
      throw new AppError(
        409,
        "This plan already has an authorisation record. Create a new plan to change its authorisation.",
      );
    await tx.query(
      "INSERT INTO recurring_authorisations(id,schedule_id,customer_id,address,delivery_window,quantity,maximum_total_kobo,consent_text) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        aid,
        s.id,
        user.id,
        JSON.stringify(d.address),
        d.window,
        d.quantity,
        d.maximumTotalKobo,
        consent,
      ],
    );
    const product = await one(tx, "SELECT size_kg FROM products WHERE id=$1", [
      s.product_id,
    ]);
    const quote = await gasQuote(
      tx,
      Array.from({ length: d.quantity }, () => ({
        kg: Number(product!.size_kg),
        capacityKg: Number(product!.size_kg),
      })),
    );
    await tx.query(
      "UPDATE recurring_authorisations SET pricing_snapshot=$1 WHERE id=$2",
      [
        JSON.stringify({
          priceVersion: quote.priceVersion,
          feeVersion: quote.feeVersion,
          policyVersion: quote.policyVersion,
          totalKobo: quote.subtotalKobo + quote.deliveryKobo,
        }),
        aid,
      ],
    );
    await audit(tx, user, "schedule.authorised", aid, "success", {
      maximumTotalKobo: d.maximumTotalKobo,
    });
    return { id: aid };
  }
  if (action === "schedule.revoke") {
    const d = z.object({ id: z.string().uuid() }).strict().parse(input);
    await tx.query(
      "UPDATE recurring_authorisations SET active=false,revoked_at=COALESCE(revoked_at,now()) WHERE id=$1 AND customer_id=$2",
      [d.id, user.id],
    );
    await audit(tx, user, "schedule.authorisation_revoked", d.id);
    return { ok: true };
  }
  if (action === "schedule.reschedule") {
    const d = z
      .object({ id: z.string().uuid(), nextDate: z.iso.date() })
      .strict()
      .parse(input);
    if (
      Date.parse(d.nextDate) <= Date.now() ||
      Date.parse(d.nextDate) > Date.now() + 365 * 86400000
    )
      throw new AppError(400, "Choose a future date within one year.");
    const s = await one(
      tx,
      "UPDATE refill_schedules SET next_date=$1 WHERE id=$2 AND customer_id=$3 AND status<>'cancelled' RETURNING id",
      [d.nextDate, d.id, user.id],
    );
    if (!s) throw new AppError(404, "Plan not found.");
    await audit(tx, user, "schedule.rescheduled", d.id);
    return { ok: true };
  }
  if (action === "campaigns") {
    allow(user, ["owner", "manager"]);
    return (
      await tx.query(
        `SELECT c.*,(SELECT count(*)::int FROM campaign_recipients r WHERE r.campaign_id=c.id) AS recipients,(SELECT count(*)::int FROM campaign_recipients r WHERE r.campaign_id=c.id AND status='sent') AS sent,
        (SELECT count(*)::int FROM campaign_recipients r WHERE r.campaign_id=c.id AND r.status='pending') AS pending,
        (SELECT count(*)::int FROM campaign_recipients r WHERE r.campaign_id=c.id AND r.status='skipped') AS skipped,
        (SELECT count(*)::int FROM campaign_recipients r WHERE r.campaign_id=c.id AND r.status='sent' AND r.sent_at IS NOT NULL AND EXISTS(
          SELECT 1 FROM orders o JOIN delivery_attempts da ON da.order_id=o.id AND da.state='delivered'
          WHERE o.customer_id=r.user_id AND o.branch_id=c.branch_id AND o.status='delivered' AND o.payment_status='verified'
          AND da.completed_at>=o.created_at AND da.completed_at>r.sent_at AND da.completed_at<=LEAST(now(),r.sent_at+interval '30 days')
          AND (SELECT COALESCE(sum(p.amount_kobo),0) FROM verified_payments p WHERE p.order_id=o.id)>=o.total_kobo
          AND NOT EXISTS(SELECT 1 FROM credit_requests cr WHERE cr.order_id=o.id AND cr.kind='refund' AND cr.status='approved')
        )) AS returning_customers_30d FROM campaigns c WHERE ${user.role === "owner" ? "true" : "c.branch_id=$1"} ORDER BY c.created_at DESC LIMIT 100`,
        user.role === "owner" ? [] : [user.branch_id],
      )
    ).rows;
  }
  if (action === "campaign.create") {
    const d = z
      .object({
        branchId: z.string().max(100),
        title: z.string().trim().min(5).max(100),
        body: z.string().trim().min(10).max(1000),
        segment: z.enum(["all", "inactive", "repeat"]),
      })
      .strict()
      .parse(input);
    allow(user, ["owner", "manager"], d.branchId);
    if (
      !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
        d.branchId,
      ]))
    )
      throw new AppError(409, "Campaign branch is inactive.");
    const cid = id();
    await tx.query(
      "INSERT INTO campaigns(id,branch_id,title,body,segment,requested_by) VALUES ($1,$2,$3,$4,$5,$6)",
      [cid, d.branchId, d.title, d.body, d.segment, user.id],
    );
    await tx.query(
      `INSERT INTO campaign_recipients(campaign_id,user_id) SELECT $1,u.id FROM users u JOIN communication_preferences p ON p.user_id=u.id WHERE u.active=true AND u.role IN ('customer','commercial') AND p.marketing=true AND u.branch_id=$2 AND EXISTS(SELECT 1 FROM orders o WHERE o.customer_id=u.id AND o.branch_id=$2) ${d.segment === "inactive" ? "AND NOT EXISTS(SELECT 1 FROM orders o WHERE o.customer_id=u.id AND o.created_at>now()-interval '30 days')" : d.segment === "repeat" ? "AND (SELECT count(*) FROM orders o WHERE o.customer_id=u.id AND o.branch_id=$2 AND o.status='delivered')>=2" : ""}`,
      [cid, d.branchId],
    );
    await audit(tx, user, "campaign.created", cid);
    return { id: cid };
  }
  if (action === "campaign.decide") {
    const d = z
        .object({
          id: z.string().uuid(),
          decision: z.enum(["approved", "cancelled"]),
        })
        .strict()
        .parse(input),
      c = await one(tx, "SELECT * FROM campaigns WHERE id=$1 FOR UPDATE", [
        d.id,
      ]);
    if (!c) throw new AppError(404, "Campaign not found.");
    allow(user, ["owner", "manager"], c.branch_id);
    if (d.decision === "approved") {
      recentVerification(user);
      if (c.requested_by === user.id)
        throw new AppError(
          403,
          "A different authorised colleague must approve the campaign.",
        );
      if (c.status !== "draft")
        throw new AppError(409, "Only draft campaigns can be approved.");
    } else if (c.status === "completed")
      throw new AppError(409, "Completed campaigns cannot be cancelled.");
    await tx.query(
      "UPDATE campaigns SET status=$1,approved_by=$2 WHERE id=$3",
      [d.decision, d.decision === "approved" ? user.id : c.approved_by, c.id],
    );
    await audit(tx, user, `campaign.${d.decision}`, c.id);
    return { ok: true };
  }
  return undefined;
}
export async function generateRecurringOrders(tx: SQL, operator: Actor) {
  if (!(await settingValue(tx, "subscription.enabled")))
    return { created: 0, failed: 0 };
  const counts = { created: 0, failed: 0 };
  const rows = (
    await tx.query(
      "SELECT s.*,a.id AS authorisation,a.address,a.delivery_window,a.quantity,a.maximum_total_kobo,a.pricing_snapshot,u.active,u.name,u.email,u.role,u.branch_id FROM refill_schedules s JOIN recurring_authorisations a ON a.schedule_id=s.id JOIN users u ON u.id=s.customer_id WHERE s.status='active' AND a.active=true AND s.next_date<=(now() AT TIME ZONE 'Africa/Lagos')::date ORDER BY s.next_date LIMIT 100 FOR UPDATE OF s,a",
    )
  ).rows;
  for (const s of rows) {
    const due = new Date(s.next_date).toISOString().slice(0, 10);
    if (
      await one(
        tx,
        "SELECT id FROM schedule_occurrences WHERE schedule_id=$1 AND due_date=$2",
        [s.id, due],
      )
    )
      continue;
    await tx.exec("SAVEPOINT recurring_order");
    try {
      if (!s.active || !["customer", "commercial"].includes(s.role))
        throw new AppError(
          409,
          "The customer account no longer has purchasing authority.",
        );
      if (!s.pricing_snapshot)
        throw new AppError(
          409,
          "Gas pricing changed: review and renew this recurring authorisation.",
        );
      if (Number(s.pricing_snapshot.totalKobo) > Number(s.maximum_total_kobo))
        throw new AppError(
          409,
          "Current total exceeds the customer-authorised limit.",
        );
      const h = digest(`schedule:${s.id}:${due}`),
        key = `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
      const order = await checkout(
        tx,
        {
          id: s.customer_id,
          name: s.name,
          email: s.email,
          role: s.role,
          branch_id: s.branch_id,
          verified_at: null,
          session_id: "recurring-authorisation",
        },
        checkoutSchema.parse({
          items: [{ productId: s.product_id, quantity: s.quantity }],
          pricing: s.pricing_snapshot,
          address: s.address,
          date: due,
          window: s.delivery_window,
          instructions:
            "Customer-authorised recurring cash-on-delivery refill.",
          paymentMethod: "cash_on_delivery",
          idempotencyKey: key,
        }),
      );
      if (Number(order!.total_kobo) > Number(s.maximum_total_kobo))
        throw new AppError(
          409,
          "The final order total exceeds the authorised maximum.",
        );
      await tx.query(
        "INSERT INTO schedule_occurrences(id,schedule_id,due_date,status,order_id) VALUES ($1,$2,$3,'created',$4)",
        [id(), s.id, due, order!.id],
      );
      await tx.query(
        "UPDATE refill_schedules SET next_date=next_date+interval_days WHERE id=$1",
        [s.id],
      );
      await audit(
        tx,
        operator,
        "schedule.order_generated",
        order!.id,
        "success",
        { authorisation: s.authorisation },
      );
      await tx.exec("RELEASE SAVEPOINT recurring_order");
      counts.created++;
    } catch (error) {
      await tx.exec("ROLLBACK TO SAVEPOINT recurring_order");
      await tx.exec("RELEASE SAVEPOINT recurring_order");
      await tx.query(
        "INSERT INTO schedule_occurrences(id,schedule_id,due_date,status,failure) VALUES ($1,$2,$3,'failed',$4)",
        [
          id(),
          s.id,
          due,
          error instanceof AppError
            ? error.message
            : "Generation failed; previous stock and financial state retained.",
        ],
      );
      await notify(
        tx,
        s.customer_id,
        "Scheduled refill needs attention",
        "No order was generated. Review current prices, delivery availability and your plan, then choose a new date.",
        s.id,
      );
      await audit(tx, operator, "schedule.generation_failed", s.id, "failed");
      counts.failed++;
    }
  }
  return counts;
}
export async function deliverCampaigns(tx: SQL) {
  let sent = 0;
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date()),
  );
  for (const c of (
    await tx.query(
      "SELECT c.*,u.active,u.role,u.branch_id AS approver_branch FROM campaigns c JOIN users u ON u.id=c.approved_by WHERE c.status='approved' ORDER BY c.created_at LIMIT 100 FOR UPDATE OF c",
    )
  ).rows) {
    if (
      !c.active ||
      !["owner", "manager"].includes(c.role) ||
      (c.role !== "owner" && c.approver_branch !== c.branch_id)
    ) {
      await tx.query("UPDATE campaigns SET status='cancelled' WHERE id=$1", [
        c.id,
      ]);
      continue;
    }
    for (const r of (
      await tx.query(
        "SELECT r.user_id,u.active,u.branch_id AS customer_branch,p.marketing,p.quiet_start,p.quiet_end FROM campaign_recipients r JOIN users u ON u.id=r.user_id LEFT JOIN communication_preferences p ON p.user_id=r.user_id WHERE r.campaign_id=$1 AND r.status='pending' LIMIT 500 FOR UPDATE OF r",
        [c.id],
      )
    ).rows) {
      if (!r.active || !r.marketing || r.customer_branch !== c.branch_id) {
        await tx.query(
          "UPDATE campaign_recipients SET status='skipped' WHERE campaign_id=$1 AND user_id=$2",
          [c.id, r.user_id],
        );
        continue;
      }
      const start = r.quiet_start ?? 21,
        end = r.quiet_end ?? 8,
        quiet =
          start === end
            ? false
            : start < end
              ? hour >= start && hour < end
              : hour >= start || hour < end;
      if (quiet) continue;
      await notify(tx, r.user_id, c.title, c.body, c.id);
      await tx.query(
        "UPDATE campaign_recipients SET status='sent',sent_at=now() WHERE campaign_id=$1 AND user_id=$2",
        [c.id, r.user_id],
      );
      sent++;
    }
    if (
      !(await one(
        tx,
        "SELECT user_id FROM campaign_recipients WHERE campaign_id=$1 AND status='pending' LIMIT 1",
        [c.id],
      ))
    )
      await tx.query("UPDATE campaigns SET status='completed' WHERE id=$1", [
        c.id,
      ]);
  }
  return sent;
}
