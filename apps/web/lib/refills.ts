import { notifyRefillOffers } from "./reward-offers";
import { processServiceRewards } from "./reward-services";
import { processRewards } from "./rewards";
import { publishTrackingNotifications } from "./order-tracking";
import { refillFeedbackEffect } from "../../../packages/business-rules/src/refill-feedback";
import { transitionApproval } from "./governance";
import { serviceFollowupReminders } from "./service-followups";
import { generateRecurringOrders, deliverCampaigns } from "./scheduling";
import { z } from "zod";
import { type SQL, one } from "./db";
import { id, AppError, type Actor, allow, recentVerification } from "./auth";
import { audit, notify, activate } from "./governance";
import { supplyOptions } from "../../../packages/business-rules/src/cooking-gas-profiles";
import { forecast } from "../../../packages/business-rules/src/forecast";
export async function refillAction(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
): Promise<any> {
  if (["refill.profiles", "refill.profile.create", "refill.feedback"].includes(action))
    allow(user, ["customer", "commercial"]);
  if (action === "refill.profiles") {
    const profiles = (
      await tx.query(
        "SELECT cp.*,p.name AS product_name,p.size_kg AS product_size_kg FROM consumption_profiles cp JOIN products p ON p.id=cp.product_id WHERE cp.customer_id=$1 ORDER BY cp.created_at",
        [user.id],
      )
    ).rows;
    for (const p of profiles) {
      p.capacityKg = p.product_size_kg == null ? null : Number(p.product_size_kg);
      delete p.product_size_kg;
      await ingest(tx, p);
      const rows = (
        await tx.query(
          "SELECT h.*,COALESCE(o.delivered_at,(SELECT min(e.created_at) FROM order_events e WHERE e.order_id=o.id AND e.status='delivered')) AS refilled_at FROM refill_history h JOIN orders o ON o.id=h.order_id WHERE h.profile_id=$1 AND COALESCE(o.delivered_at,(SELECT min(e.created_at) FROM order_events e WHERE e.order_id=o.id AND e.status='delivered')) IS NOT NULL ORDER BY COALESCE(o.delivered_at,(SELECT min(e.created_at) FROM order_events e WHERE e.order_id=o.id AND e.status='delivered'))",
          [p.id],
        )
      ).rows;
      p.history = rows.map((r) => ({
        orderId: r.order_id,
        date: r.refilled_at,
        kg: Number(r.kg),
      }));
      p.lastVerifiedRefill = p.history.at(-1) ?? null;
      p.forecast = forecast(
        rows.map((r) => ({
          date: new Date(r.refilled_at).toISOString(),
          kg: Number(r.kg),
          verified: true,
          cylinderId: p.id,
        })),
        p.id,
      );
      p.typicalIntervalDays =
        p.forecast.available && p.lastVerifiedRefill
          ? Math.round(
              (Date.parse(p.forecast.nextDate) -
                new Date(p.lastVerifiedRefill.date).getTime()) /
                86400000,
            )
          : null;
      p.feedback = (
        await tx.query(
          "SELECT id,state,created_at FROM consumption_feedback WHERE profile_id=$1 ORDER BY created_at DESC,id DESC LIMIT 10",
          [p.id],
        )
      ).rows;
      p.lastRefillReport = await one(
        tx,
        "SELECT state,created_at FROM consumption_feedback WHERE profile_id=$1 AND state='already_refilled' ORDER BY created_at DESC,id DESC LIMIT 1",
        [p.id],
      );
      p.reminderState = refillFeedbackEffect(
        [p.feedback[0], p.lastRefillReport],
        p.lastVerifiedRefill?.date,
      );
      if (p.reminderState.suppressPrediction)
        p.forecast = {
          available: false,
          confidence: "low",
          reason: p.reminderState.reason,
        };
    }
    return profiles;
  }
  if (action === "refill.profile.create") {
    const d = z
      .object({
        productId: z.string().max(100),
        label: z.string().trim().min(2).max(80),
        householdSize: z.number().int().min(1).max(1000),
        cookingDays: z.number().int().min(1).max(7),
      })
      .strict()
      .parse(input);
    if (
      !(await one(
        tx,
        "SELECT id FROM products WHERE id=$1 AND category='Gas refills'",
        [d.productId],
      ))
    )
      throw new AppError(400, "Choose a gas refill product.");
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
    if (
      await one(
        tx,
        "SELECT id FROM consumption_profiles WHERE customer_id=$1 AND product_id=$2 AND active=true",
        [user.id, d.productId],
      )
    )
      throw new AppError(
        409,
        "An active profile already uses this refill size. Separate cylinder-level attribution is required before adding another.",
      );
    const pid = id();
    await tx.query(
      "INSERT INTO consumption_profiles(id,customer_id,product_id,label,household_size,cooking_days) VALUES ($1,$2,$3,$4,$5,$6)",
      [pid, user.id, d.productId, d.label, d.householdSize, d.cookingDays],
    );
    await audit(tx, user, "refill.profile_created", pid);
    return { id: pid };
  }
  if (action === "refill.feedback") {
    const d = z
      .object({
        profileId: z.string().uuid(),
        state: z.enum(supplyOptions.map((option) => option.value)),
        expectedFeedbackId: z.string().max(100).nullable().optional(),
      })
      .strict()
      .parse(input);
    if (
      !(await one(
        tx,
        "SELECT id FROM consumption_profiles WHERE id=$1 AND customer_id=$2 AND active=true FOR UPDATE",
        [d.profileId, user.id],
      ))
    )
      throw new AppError(404, "Profile not found.");
    if (d.expectedFeedbackId !== undefined) {
      const latest = await one(
        tx,
        "SELECT id FROM consumption_feedback WHERE profile_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1",
        [d.profileId],
      );
      if ((latest?.id ?? null) !== d.expectedFeedbackId)
        throw new AppError(409, "The saved supply has changed. Review the latest report before saving.", "REFILL_FEEDBACK_CONFLICT");
    }
    if (
      await one(
        tx,
        "SELECT id FROM consumption_feedback WHERE profile_id=$1 AND created_at>now()-interval '1 hour'",
        [d.profileId],
      )
    )
      throw new AppError(
        429,
        "Feedback was recently recorded. Please wait an hour before updating.",
      );
    const feedback = await one(
      tx,
      "INSERT INTO consumption_feedback(id,profile_id,state) VALUES ($1,$2,$3) RETURNING id,state,created_at",
      [id(), d.profileId, d.state],
    );
    if (["already_refilled", "remind_later"].includes(d.state))
      await tx.query(
        "UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE user_id=$1 AND related_id=$2 AND title='Estimated refill approaching'",
        [user.id, d.profileId],
      );
    await audit(tx, user, "refill.feedback_received", d.profileId);
    return { ok: true, feedback };
  }
  if (action === "jobs") {
    allow(user, ["owner", "administrator"]);
    return (
      await tx.query("SELECT * FROM job_runs ORDER BY started_at DESC LIMIT 50")
    ).rows;
  }
  if (action === "jobs.run") {
    allow(user, ["owner"]);
    recentVerification(user);
    z.object({}).strict().parse(input);
    return runJobs(tx, user);
  }
  return undefined;
}
async function ingest(tx: SQL, p: Record<string, any>) {
  // Dynamic refill quantities use delivered grams, only where attribution is unambiguous.
  await tx.query(
    "INSERT INTO refill_history(id,profile_id,order_id,refilled_at,kg) SELECT $1 || ':gas:' || o.id,$1,o.id,o.delivered_at,g.grams/1000.0 FROM orders o JOIN order_gas_lines g ON g.order_id=o.id JOIN products pr ON pr.id=$3 WHERE o.customer_id=$2 AND g.capacity_grams=pr.size_kg*1000 AND o.status='delivered' AND o.payment_status='verified' AND o.delivered_at IS NOT NULL AND (SELECT count(*) FROM order_gas_lines x WHERE x.order_id=o.id)=1 AND EXISTS(SELECT 1 FROM verified_payments v WHERE v.order_id=o.id) ON CONFLICT(profile_id,order_id) DO NOTHING",
    [p.id, p.customer_id, p.product_id],
  );
  // Historical fixed-quantity purchases retain their original evidence and units.
  await tx.query(
    "INSERT INTO refill_history(id,profile_id,order_id,refilled_at,kg) SELECT $1 || ':' || o.id,$1,o.id,COALESCE(o.delivered_at,(SELECT min(e.created_at) FROM order_events e WHERE e.order_id=o.id AND e.status='delivered')),pr.size_kg FROM orders o JOIN order_items oi ON oi.order_id=o.id JOIN products pr ON pr.id=oi.product_id JOIN verified_payments v ON v.order_id=o.id WHERE o.customer_id=$2 AND oi.product_id=$3 AND oi.quantity=1 AND o.status='delivered' AND o.payment_status='verified' AND COALESCE(o.delivered_at,(SELECT min(e.created_at) FROM order_events e WHERE e.order_id=o.id AND e.status='delivered')) IS NOT NULL ON CONFLICT(profile_id,order_id) DO NOTHING",
    [p.id, p.customer_id, p.product_id],
  );
}
async function once(tx: SQL, key: string, fn: () => Promise<void>) {
  const inserted = await one(
    tx,
    "INSERT INTO job_deliveries(key) VALUES ($1) ON CONFLICT DO NOTHING RETURNING key",
    [key],
  );
  if (inserted) await fn();
  return !!inserted;
}
export async function runJobs(tx: SQL, operator: Actor) {
  await processRewards(tx);
  await processServiceRewards(tx);
  await publishTrackingNotifications(tx);
  const { runReportSchedules } = await import("./business-reporting");
  await runReportSchedules(tx);
  const { inventoryExceptions } = await import("./inventory-monitoring");
  await inventoryExceptions(tx);
  await notifyRefillOffers(tx);
  // A transaction-wide lock serialises concurrent workers on PostgreSQL and PGlite.
  await tx.query("LOCK TABLE job_runs IN EXCLUSIVE MODE");
  await tx.query("SELECT id FROM branches ORDER BY id FOR UPDATE");
  const jid = id(),
    counts = {
      expired: 0,
      activated: 0,
      failed: 0,
      reminders: 0,
      inspections: 0,
    };
  await tx.query(
    "INSERT INTO job_runs(id,job,status) VALUES ($1,'maintenance','running')",
    [jid],
  );
  await tx.query(
    "UPDATE approval_delegations SET status='expired' WHERE status IN ('pending','approved') AND expires_at<=now()",
  );
  const pending = (
    await tx.query(
      "SELECT * FROM change_requests WHERE status IN ('pending_approval','partially_approved','changes_requested','scheduled','approved') ORDER BY created_at LIMIT 500 FOR UPDATE",
    )
  ).rows;
  for (const r of pending) {
    if (
      Date.parse(r.expires_at) <= Date.now() &&
      ["pending_approval", "partially_approved", "changes_requested"].includes(
        r.status,
      )
    ) {
      await transitionApproval(
        tx,
        operator,
        r.id,
        "expired",
        "Approval deadline elapsed",
      );
      await audit(tx, operator, "approval.expired", r.id);
      await notify(
        tx,
        r.requester_id,
        "Approval expired",
        "Submit a fresh request if the change is still needed.",
        r.id,
      );
      counts.expired++;
      continue;
    }
    if (
      ["scheduled", "approved"].includes(r.status) &&
      Date.parse(r.effective_at) <= Date.now()
    ) {
      const result = await activate(tx, operator, r.id, r.risk === 1);
      if (result?.status === "active") counts.activated++;
      else if (result?.status === "failed") counts.failed++;
    } else if (Date.parse(r.created_at) < Date.now() - 86400000)
      await once(tx, `escalation:${r.id}`, async () => {
        for (const u of (
          await tx.query(
            "SELECT id FROM users WHERE role='owner' AND active=true",
          )
        ).rows)
          await notify(
            tx,
            u.id,
            "Approval waiting over 24 hours",
            "Review the outstanding request in the Approval Centre.",
            r.id,
          );
      });
  }
  for (const c of (
    await tx.query(
      "SELECT * FROM cylinders WHERE test_due<=CURRENT_DATE AND status NOT IN ('quarantined','damaged','inspection_due','sold') FOR UPDATE",
    )
  ).rows) {
    await tx.query("UPDATE cylinders SET status='inspection_due' WHERE id=$1", [
      c.id,
    ]);
    await tx.query(
      "INSERT INTO cylinder_events(id,cylinder_id,actor_id,previous_status,status,reason) VALUES ($1,$2,$3,$4,'inspection_due','Documented inspection due date reached')",
      [id(), c.id, operator.id, c.status],
    );
    counts.inspections++;
  }
  const now = new Date(),
    hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Lagos",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(now),
    ),
    day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(now);
  const people = (
    await tx.query(
      "SELECT u.id,COALESCE(p.refill_reminders,true) AS enabled,COALESCE(p.quiet_start,21) AS start,COALESCE(p.quiet_end,8) AS finish FROM users u LEFT JOIN communication_preferences p ON p.user_id=u.id WHERE u.active=true AND u.role IN ('customer','commercial')",
    )
  ).rows;
  for (const u of people) {
    const quiet =
      u.start === u.finish
        ? false
        : u.start < u.finish
          ? hour >= u.start && hour < u.finish
          : hour >= u.start || hour < u.finish;
    if (!u.enabled || quiet) continue;
    for (const s of (
      await tx.query(
        "SELECT * FROM refill_schedules WHERE customer_id=$1 AND status='active' AND next_date<=CURRENT_DATE+3",
        [u.id],
      )
    ).rows)
      if (
        await once(
          tx,
          `schedule:${s.id}:${new Date(s.next_date).toISOString().slice(0, 10)}`,
          () =>
            notify(
              tx,
              u.id,
              "Refill plan reminder",
              "Your preferred refill date is approaching or due. Review your plan and place an order when ready. No payment or order has been generated.",
              s.id,
            ),
        )
      )
        counts.reminders++;
    for (const p of (
      await tx.query(
        "SELECT * FROM consumption_profiles WHERE customer_id=$1 AND active=true",
        [u.id],
      )
    ).rows) {
      await ingest(tx, p);
      const records = (
          await tx.query(
            "SELECT h.*,COALESCE(o.delivered_at,(SELECT min(e.created_at) FROM order_events e WHERE e.order_id=o.id AND e.status='delivered')) AS refilled_at FROM refill_history h JOIN orders o ON o.id=h.order_id WHERE h.profile_id=$1 AND COALESCE(o.delivered_at,(SELECT min(e.created_at) FROM order_events e WHERE e.order_id=o.id AND e.status='delivered')) IS NOT NULL ORDER BY COALESCE(o.delivered_at,(SELECT min(e.created_at) FROM order_events e WHERE e.order_id=o.id AND e.status='delivered'))",
            [p.id],
          )
        ).rows,
        f = forecast(
          records.map((r) => ({
            date: new Date(r.refilled_at).toISOString(),
            kg: Number(r.kg),
            verified: true,
            cylinderId: p.id,
          })),
          p.id,
          now,
        );
      const latestFeedback = await one(
        tx,
        "SELECT state,created_at FROM consumption_feedback WHERE profile_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1",
        [p.id],
      );
      const lastReport = await one(
        tx,
        "SELECT state,created_at FROM consumption_feedback WHERE profile_id=$1 AND state='already_refilled' ORDER BY created_at DESC,id DESC LIMIT 1",
        [p.id],
      );
      const feedbackEffect = refillFeedbackEffect(
        [latestFeedback as any, lastReport as any],
        records.at(-1)?.refilled_at,
        now,
      );
      if (f.available && f.daysLeft! <= 3 && !feedbackEffect.suppressReminder)
        if (
          await once(tx, `forecast:${p.id}:${day}`, () =>
            notify(
              tx,
              u.id,
              "Estimated refill approaching",
              `${p.label}: estimated ${f.daysLeft} days left. This is a purchase-history estimate, not a sensor reading.`,
              p.id,
            ),
          )
        )
          counts.reminders++;
    }
  }
  counts.reminders += await serviceFollowupReminders(tx, hour);
  const recurring = await generateRecurringOrders(tx, operator);
  const campaignsSent = await deliverCampaigns(tx);
  Object.assign(counts, {
    recurringCreated: recurring.created,
    recurringFailed: recurring.failed,
    campaignsSent,
  });
  await tx.query(
    "UPDATE job_runs SET status='completed',detail=$1,finished_at=now() WHERE id=$2",
    [JSON.stringify(counts), jid],
  );
  await audit(tx, operator, "maintenance.completed", jid, "success", counts);
  return { id: jid, ...counts };
}
