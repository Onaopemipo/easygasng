import { nextServiceMessageAt } from "../../../packages/business-rules/src/quiet-hours";
import { z } from "zod";
import { type SQL, one } from "./db";
import { id, allow, AppError, recentVerification, type Actor } from "./auth";
import { approvedRewardPolicy } from "./rewards";
import { audit } from "./governance";
export async function availableRewardOffers(
  tx: SQL,
  user: Actor,
  smart = false,
) {
  const approved = await approvedRewardPolicy(tx, user.branch_id ?? "lagos");
  if (
    !approved?.policy.redemptionEnabled ||
    process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED !== "true"
  )
    return [];
  if (smart) {
    const consent = await one(
      tx,
      "SELECT marketing,refill_reminders FROM communication_preferences WHERE user_id=$1",
      [user.id],
    );
    if (!consent?.marketing || !consent?.refill_reminders) return [];
    const { refillAction } = await import("./refills");
    const profiles = await refillAction(tx, "refill.profiles", user, {});
    if (
      !profiles.some(
        (p: any) =>
          p.forecast?.available && !p.reminderState?.suppressPrediction,
      )
    )
      return [];
  }
  const now = Date.now(),
    result = [];
  for (const o of approved.policy.offers) {
    if (
      !o.active ||
      (smart && !o.smartRefill) ||
      Date.parse(o.startsAt) > now ||
      Date.parse(o.expiresAt) <= now
    )
      continue;
    const usage = await one(
      tx,
      "SELECT count(*)::int n,max(created_at) last FROM reward_offer_claims WHERE customer_id=$1 AND offer_id=$2",
      [user.id, o.id],
    );
    if (
      usage!.n >= o.maximumUsesPerCustomer ||
      (usage!.last &&
        new Date(usage!.last).getTime() + o.frequencyDays * 86400000 > now)
    )
      continue;
    const spent = BigInt(
      (await one(
        tx,
        "SELECT COALESCE(sum(discount_kobo),0)::text n FROM reward_offer_claims WHERE policy_version_id=$1 AND offer_id=$2",
        [approved.id, o.id],
      ))!.n,
    );
    const value =
      BigInt(o.points) * BigInt(approved.policy.discountPerPointKobo);
    if (spent + value > BigInt(o.budgetKobo)) continue;
    result.push({
      ...o,
      discountKobo: value.toString(),
      policyVersion: approved.version,
    });
  }
  return result;
}
export async function validateRewardOffer(
  tx: SQL,
  user: Actor,
  branch: string,
  offerId: string,
  points: number,
  policy: any,
) {
  if (user.branch_id && user.branch_id !== branch)
    throw new AppError(409, "Review offers for the fulfilment branch.");
  const offers = await availableRewardOffers(tx, {
    ...user,
    branch_id: branch,
  });
  const offer = offers.find((o) => o.id === offerId);
  if (!offer || offer.points !== points)
    throw new AppError(
      409,
      "This reward offer is unavailable, expired, exhausted or already used.",
    );
  if (
    offer.smartRefill &&
    !(
      await availableRewardOffers(tx, { ...user, branch_id: branch }, true)
    ).some((o) => o.id === offerId)
  )
    throw new AppError(
      409,
      "This refill offer is not eligible for your current profile and consent.",
    );
  return offer;
}
export async function rewardOfferAction(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
): Promise<any> {
  if (action === "rewards.offers" || action === "rewards.smart-offers") {
    allow(user, ["customer", "commercial"]);
    z.object({}).strict().parse(input);
    return availableRewardOffers(tx, user, action === "rewards.smart-offers");
  }
  if (action === "rewards.retry") {
    allow(user, ["owner", "finance"]);
    recentVerification(user);
    const d = z
      .object({
        orderId: z.string().uuid().optional(),
        bookingId: z.string().uuid().optional(),
        reason: z.string().trim().min(10).max(1000),
      })
      .strict()
      .refine((d) => Number(!!d.orderId) + Number(!!d.bookingId) === 1)
      .parse(input);
    const source = d.orderId
      ? await one(tx, "SELECT branch_id FROM orders WHERE id=$1", [d.orderId])
      : await one(tx, "SELECT branch_id FROM service_bookings WHERE id=$1", [
          d.bookingId,
        ]);
    if (!source) throw new AppError(404, "Source not found.");
    allow(user, ["owner", "finance"], source.branch_id);
    if (d.orderId) {
      if (
        await one(
          tx,
          "SELECT r.customer_id FROM reward_referrals r JOIN reward_referral_reviews v ON v.attribution_id=r.attribution_id WHERE r.customer_id=(SELECT customer_id FROM orders WHERE id=$1) AND v.state IN ('held','blocked')",
          [d.orderId],
        )
      )
        throw new AppError(
          409,
          "Clear the referral through independent approval before retry.",
        );
      await tx.query(
        "UPDATE reward_jobs SET status='pending',attempts=0,last_error=NULL WHERE order_id=$1 AND status='review'",
        [d.orderId],
      );
    } else
      await tx.query(
        "UPDATE reward_service_jobs SET status='pending',attempts=0,last_error=NULL WHERE booking_id=$1 AND status='review'",
        [d.bookingId],
      );
    await audit(
      tx,
      user,
      "rewards.retry",
      d.orderId ?? d.bookingId!,
      "success",
      { reason: d.reason },
    );
    return { ok: true };
  }
}

export async function notifyRefillOffers(tx: SQL, now = new Date()) {
  if (process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED !== "true") return;
  for (const u of (
    await tx.query(
      "SELECT u.*,p.quiet_start,p.quiet_end FROM users u JOIN communication_preferences p ON p.user_id=u.id JOIN branches b ON b.id=u.branch_id AND b.active=true WHERE u.active=true AND u.role IN ('customer','commercial') AND p.marketing=true AND p.refill_reminders=true ORDER BY u.id LIMIT 500",
    )
  ).rows) {
    if (
      nextServiceMessageAt(
        now,
        u.quiet_start ?? 21,
        u.quiet_end ?? 8,
      ).getTime() > now.getTime()
    )
      continue;
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [u.id]);
    const actor = {
      ...u,
      verified_at: null,
      session_id: "rewards-notification-worker",
    } as Actor;
    const p = await approvedRewardPolicy(tx, u.branch_id);
    if (!p) continue;
    for (const o of await availableRewardOffers(tx, actor, true)) {
      const last = await one(
        tx,
        "SELECT created_at FROM reward_offer_notices WHERE customer_id=$1 AND offer_id=$2 ORDER BY created_at DESC LIMIT 1",
        [u.id, o.id],
      );
      if (
        last &&
        new Date(last.created_at).getTime() + o.frequencyDays * 86400000 >
          now.getTime()
      )
        continue;
      const noticeId = id();
      await tx.query(
        "INSERT INTO reward_offer_notices(id,customer_id,offer_id,policy_version_id) VALUES($1,$2,$3,$4)",
        [noticeId, u.id, o.id, p.id],
      );
      const { notify } = await import("./governance");
      await notify(
        tx,
        u.id,
        "Approved refill reward offer",
        `${o.title}: use ${o.points} points at eligible checkout before ${o.expiresAt}. Subject to remaining approved budget and eligibility. No order or payment is created.`,
        noticeId,
      );
    }
  }
}
