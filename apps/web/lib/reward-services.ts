import { type SQL, one } from "./db";
import { id } from "./auth";
import { approvedRewardPolicy } from "./rewards";
import { rewardsPolicy, earnedPoints } from "./rewards-schema";
export async function enqueueServiceReward(tx: SQL, bookingId: string) {
  if (process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED !== "true") return;
  await tx.exec("SAVEPOINT service_reward_enqueue");
  try {
    const b = await one(
      tx,
      "SELECT b.*,r.body FROM service_bookings b JOIN service_reports r ON r.booking_id=b.id JOIN branches br ON br.id=b.branch_id AND br.active=true WHERE b.id=$1 AND b.status='completed'",
      [bookingId],
    );
    if (b) {
      const p = await approvedRewardPolicy(tx, b.branch_id);
      const paid = BigInt(
        (await one(
          tx,
          "SELECT COALESCE(sum(amount_kobo),0)::text n FROM verified_payments WHERE booking_id=$1",
          [b.id],
        ))!.n,
      );
      if (
        p?.policy.earningEnabled &&
        p.policy.serviceEarningEnabled &&
        p.policy.eligibleServiceIds.includes(b.service_id) &&
        paid >= BigInt(b.body.invoiceTotalKobo)
      ) {
        const q = await one(
          tx,
          "SELECT q.labour_kobo,d.approved FROM service_quotes q JOIN service_quote_decisions d ON d.quote_id=q.id WHERE q.booking_id=$1 ORDER BY q.revision DESC LIMIT 1",
          [b.id],
        );
        const labour = q?.approved
          ? BigInt(q.labour_kobo)
          : b.snapshot.pricingModel === "fixed"
            ? BigInt(b.snapshot.priceKobo)
            : 0n;
        if (labour > 0n)
          await tx.query(
            "INSERT INTO reward_service_jobs(booking_id,policy_version_id,eligible_kobo) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
            [b.id, p.id, labour.toString()],
          );
      }
    }
    await tx.exec("RELEASE SAVEPOINT service_reward_enqueue");
  } catch {
    await tx.exec("ROLLBACK TO SAVEPOINT service_reward_enqueue");
    await tx.exec("RELEASE SAVEPOINT service_reward_enqueue");
    const b = await one(
      tx,
      "SELECT branch_id FROM service_bookings WHERE id=$1",
      [bookingId],
    );
    if (b)
      await tx.query(
        "INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role) VALUES($1,$2,'high','reward_enqueue_failure',$3,'Service reward enqueue failed; preserve verified service and review original event policy.','finance') ON CONFLICT(category,target) DO NOTHING",
        [id(), b.branch_id, bookingId],
      );
  }
}
export async function processServiceRewards(tx: SQL) {
  if (process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED !== "true") return;
  for (const j of (
    await tx.query(
      "SELECT * FROM reward_service_jobs WHERE status='pending' ORDER BY created_at LIMIT 50 FOR UPDATE SKIP LOCKED",
    )
  ).rows) {
    await tx.exec("SAVEPOINT service_reward_post");
    try {
      const b = await one(
        tx,
        "SELECT b.*,r.body FROM service_bookings b JOIN service_reports r ON r.booking_id=b.id WHERE b.id=$1 FOR UPDATE OF b",
        [j.booking_id],
      );
      const current = b ? await approvedRewardPolicy(tx, b.branch_id) : null;
      if (!current?.policy.earningEnabled) {
        await tx.exec("RELEASE SAVEPOINT service_reward_post");
        continue;
      }
      const p = rewardsPolicy.parse(
        (await one(tx, "SELECT value FROM setting_versions WHERE id=$1", [
          j.policy_version_id,
        ]))!.value,
      );
      const paid = BigInt(
        (await one(
          tx,
          "SELECT COALESCE(sum(amount_kobo),0)::text n FROM verified_payments WHERE booking_id=$1",
          [j.booking_id],
        ))!.n,
      );
      const refund = BigInt(
        (await one(
          tx,
          "SELECT COALESCE(sum(amount_kobo),0)::text n FROM credit_requests WHERE booking_id=$1 AND status='approved' AND kind='refund'",
          [j.booking_id],
        ))!.n,
      );
      if (
        !b ||
        b.status !== "completed" ||
        paid < BigInt(b.body.invoiceTotalKobo) ||
        refund > 0n
      ) {
        await tx.query(
          "UPDATE reward_service_jobs SET status='review',last_error='Source no longer eligible' WHERE booking_id=$1",
          [j.booking_id],
        );
      } else {
        await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
          b.customer_id,
        ]);
        const points = earnedPoints(
          BigInt(j.eligible_kobo),
          p.spendPerPointKobo,
        );
        if (points) {
          const e = await one(
            tx,
            "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,$3,$4) ON CONFLICT(reference) DO NOTHING RETURNING id",
            [id(), b.customer_id, points, `service:${b.id}`],
          );
          if (e)
            await tx.query(
              "INSERT INTO reward_entry_details(entry_id,branch_id,booking_id,policy_version_id,kind,detail) VALUES($1,$2,$3,$4,'earned',$5)",
              [
                e.id,
                b.branch_id,
                b.id,
                j.policy_version_id,
                JSON.stringify({
                  eligibleKobo: String(j.eligible_kobo),
                  policy: p,
                  exclusions:
                    "Callout, materials and taxes excluded; labour only",
                }),
              ],
            );
        }
        await tx.query(
          "UPDATE reward_service_jobs SET status='completed',attempts=attempts+1,last_error=NULL WHERE booking_id=$1",
          [j.booking_id],
        );
      }
      await tx.exec("RELEASE SAVEPOINT service_reward_post");
    } catch {
      await tx.exec("ROLLBACK TO SAVEPOINT service_reward_post");
      await tx.exec("RELEASE SAVEPOINT service_reward_post");
      await tx.query(
        "UPDATE reward_service_jobs SET attempts=attempts+1,status=CASE WHEN attempts>=4 THEN 'review' ELSE 'pending' END,last_error='Service posting retry required' WHERE booking_id=$1",
        [j.booking_id],
      );
    }
  }
}
export async function reverseServiceRewards(
  tx: SQL,
  bookingId: string,
  creditId: string,
) {
  const b = await one(
    tx,
    "SELECT customer_id,branch_id FROM service_bookings WHERE id=$1",
    [bookingId],
  );
  if (!b) return;
  await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
    b.customer_id,
  ]);
  const original = await one(
    tx,
    "SELECT * FROM reward_entries WHERE reference=$1",
    [`service:${bookingId}`],
  );
  if (!original) return;
  const e = await one(
    tx,
    "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,$3,$4) ON CONFLICT(reference) DO NOTHING RETURNING id",
    [
      id(),
      b.customer_id,
      -Number(original.points),
      `service-refund:${bookingId}`,
    ],
  );
  if (e)
    await tx.query(
      "INSERT INTO reward_entry_details(entry_id,branch_id,booking_id,kind,original_entry_id,detail) VALUES($1,$2,$3,'reversed',$4,$5)",
      [e.id, b.branch_id, bookingId, original.id, JSON.stringify({ creditId })],
    );
  if (
    Number(
      (await one(
        tx,
        "SELECT COALESCE(sum(points),0) n FROM reward_entries WHERE customer_id=$1",
        [b.customer_id],
      ))!.n,
    ) < 0
  )
    await tx.query(
      "INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role) VALUES($1,$2,'high','reward_reversal_review',$3,'Service reward reversal exceeds available points; independent finance review required.','finance') ON CONFLICT(category,target) DO NOTHING",
      [id(), b.branch_id, creditId],
    );
}
