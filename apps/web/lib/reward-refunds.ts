import { z } from "zod";
import { type SQL, one } from "./db";
import { id, digest, AppError } from "./auth";
import { canonicalRequest } from "./business-operation";
import { reverseReferral } from "./rewards-referrals";
export const partialRefundInput = z
  .array(
    z
      .object({
        source: z.string().min(1).max(150),
        quantity: z.number().int().positive().max(100000000),
      })
      .strict(),
  )
  .min(1)
  .max(50);
export async function refundSourceLines(tx: SQL, o: any) {
  const rows = (
    await tx.query(
      `SELECT 'product:'||product_id AS source,quantity::text AS units,(quantity::bigint*unit_price_kobo)::text AS gross FROM order_items WHERE order_id=$1 UNION ALL SELECT 'gas:'||id,grams::text,subtotal_kobo::text FROM order_gas_lines WHERE order_id=$1`,
      [o.id],
    )
  ).rows;
  const evidence = await one(
    tx,
    "SELECT snapshot,discount_kobo,points FROM reward_order_discounts WHERE order_id=$1",
    [o.id],
  );
  const job = await one(
    tx,
    "SELECT j.snapshot,v.value policy FROM reward_jobs j JOIN setting_versions v ON v.id=j.policy_version_id WHERE j.order_id=$1",
    [o.id],
  );
  const policy = await one(
    tx,
    "SELECT detail FROM reward_entry_details WHERE order_id=$1 AND kind='earned'",
    [o.id],
  );
  const legacy = await one(
    tx,
    "SELECT e.id FROM reward_entries e LEFT JOIN reward_entry_details d ON d.entry_id=e.id WHERE e.reference=$1 AND d.entry_id IS NULL",
    [`order:${o.id}`],
  );
  const categories =
    evidence?.snapshot.policy.eligibleCategories ??
    policy?.detail.policy?.eligibleCategories ??
    job?.policy?.eligibleCategories ??
    [];
  const frozen =
    evidence?.snapshot.lines ??
    job?.snapshot.lines ??
    policy?.detail.lines ??
    [];
  return {
    lines: rows.map((r) => ({
      source: String(r.source),
      units: String(r.units),
      gross: String(r.gross),
      eligible:
        !!legacy ||
        categories.includes(
          frozen.find(
            (l: any) =>
              "product:" + l.source === r.source ||
              "gas:" + l.source === r.source,
          )?.category,
        ),
    })),
    evidence,
  };
}
export async function prepareRefund(
  tx: SQL,
  o: any,
  requested: any[] | undefined,
) {
  const { lines, evidence } = await refundSourceLines(tx, o);
  const prior = (
    await tx.query(
      "SELECT refund_lines FROM credit_requests WHERE order_id=$1 AND kind='refund' AND status='approved' AND invoice_excess=false",
      [o.id],
    )
  ).rows;
  // Legacy full refunds cannot be followed by another refund.
  if (prior.some((p) => !p.refund_lines))
    throw new AppError(409, "This order has already been fully refunded.");
  const used = new Map<string, bigint>();
  let oldEligible = 0n,
    oldDiscount = 0n,
    oldRestored = 0n;
  for (const p of prior) {
    for (const l of p.refund_lines.lines)
      used.set(l.source, (used.get(l.source) ?? 0n) + BigInt(l.units));
    oldEligible += BigInt(p.refund_lines.eligibleGrossKobo);
    oldDiscount += BigInt(p.refund_lines.discountKobo);
    oldRestored += BigInt(p.refund_lines.restorePoints);
  }
  const selected =
    requested ??
    lines
      .filter((l) => BigInt(l.units) > (used.get(l.source) ?? 0n))
      .map((l) => ({
        source: l.source,
        quantity: Number(BigInt(l.units) - (used.get(l.source) ?? 0n)),
      }));
  if (new Set(selected.map((l) => l.source)).size !== selected.length)
    throw new AppError(400, "Each refund line must appear once.");
  let gross = 0n,
    eligible = 0n;
  const allocations = [];
  for (const r of selected) {
    const l = lines.find((l) => l.source === r.source);
    if (!l) throw new AppError(400, "Refund line is not part of this order.");
    const old = used.get(l.source) ?? 0n,
      q = BigInt(r.quantity),
      units = BigInt(l.units);
    if (old + q > units)
      throw new AppError(
        409,
        "Refund quantity exceeds the remaining fulfilled quantity.",
      );
    const amount =
      (BigInt(l.gross) * (old + q)) / units - (BigInt(l.gross) * old) / units;
    gross += amount;
    if (l.eligible) eligible += amount;
    allocations.push({
      source: l.source,
      units: q.toString(),
      grossKobo: amount.toString(),
      eligible: l.eligible,
    });
  }
  const eligibleTotal = lines
    .filter((l) => l.eligible)
    .reduce((n, l) => n + BigInt(l.gross), 0n);
  const targetDiscount =
    evidence && eligibleTotal
      ? (BigInt(evidence.discount_kobo) * (oldEligible + eligible)) /
        eligibleTotal
      : 0n;
  const targetPoints =
    evidence && eligibleTotal
      ? (BigInt(evidence.points) * (oldEligible + eligible)) / eligibleTotal
      : 0n;
  const discount = targetDiscount - oldDiscount,
    restored = targetPoints - oldRestored;
  const delivery = requested
    ? 0n
    : BigInt(o.delivery_kobo) -
      prior.reduce((n, p) => n + BigInt(p.refund_lines.deliveryKobo), 0n);
  const amount = gross - discount + delivery;
  const approvedPaid = BigInt(
    (await one(
      tx,
      "SELECT COALESCE(sum(amount_kobo),0)::text n FROM credit_requests WHERE order_id=$1 AND kind='refund' AND status='approved' AND invoice_excess=false",
      [o.id],
    ))!.n,
  );
  if (
    amount < 0n ||
    (amount === 0n && restored <= 0n) ||
    amount + approvedPaid > BigInt(o.total_kobo)
  )
    throw new AppError(409, "No refundable monetary amount remains.");
  return {
    amountKobo: Number(amount),
    snapshot: {
      lines: allocations,
      grossKobo: gross.toString(),
      eligibleGrossKobo: eligible.toString(),
      discountKobo: discount.toString(),
      restorePoints: restored.toString(),
      deliveryKobo: delivery.toString(),
    },
  };
}
export function refundFingerprint(lines: unknown, reason: string) {
  return digest(canonicalRequest({ lines: lines ?? null, reason }));
}
export async function applyAllocatedRefund(tx: SQL, o: any, c: any) {
  const s = c.refund_lines;
  // Original full requests predating revision 044 use the legacy compensation helper.
  if (!s) return false;
  const earned = await one(
    tx,
    "SELECT e.*,d.detail,d.policy_version_id FROM reward_entries e LEFT JOIN reward_entry_details d ON d.entry_id=e.id WHERE e.reference=$1",
    [`order:${o.id}`],
  );
  const approved = (
    await tx.query(
      "SELECT refund_lines FROM credit_requests WHERE order_id=$1 AND kind='refund' AND status='approved' AND invoice_excess=false",
      [o.id],
    )
  ).rows;
  const cumulative = [
    ...approved.map((r) => r.refund_lines).filter(Boolean),
    s,
  ];
  const netRefund = cumulative.reduce(
    (n, r) => n + BigInt(r.eligibleGrossKobo) - BigInt(r.discountKobo),
    0n,
  );
  let reversed = 0;
  if (earned) {
    const base = BigInt(earned.detail?.refundBaselineKobo ?? 0),
      original = BigInt(earned.detail?.eligibleKobo ?? o.subtotal_kobo);
    const delta = netRefund > base ? netRefund - base : 0n;
    const target =
      original > 0n
        ? (BigInt(earned.points) * (delta > original ? original : delta)) /
          original
        : BigInt(earned.points);
    const previous = BigInt(
      (await one(
        tx,
        "SELECT COALESCE(-sum(e.points),0)::text n FROM reward_entries e JOIN reward_entry_details d ON d.entry_id=e.id WHERE d.original_entry_id=$1 AND d.kind='reversed'",
        [earned.id],
      ))!.n,
    );
    reversed = Number(target > previous ? target - previous : 0n);
    if (reversed) {
      const entry = id();
      await tx.query(
        "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,$3,$4)",
        [entry, o.customer_id, -reversed, `partial-refund:${c.id}`],
      );
      await tx.query(
        "INSERT INTO reward_entry_details(entry_id,branch_id,order_id,policy_version_id,kind,original_entry_id,detail) VALUES($1,$2,$3,$4,'reversed',$5,$6)",
        [
          entry,
          o.branch_id,
          o.id,
          earned.policy_version_id ?? null,
          earned.id,
          JSON.stringify({
            creditId: c.id,
            rounding: "cumulative-floor",
            netRefundKobo: netRefund.toString(),
          }),
        ],
      );
    }
  }
  const returned = Number(s.restorePoints);
  if (returned) {
    const d = await one(
        tx,
        "SELECT entry_id,policy_version_id FROM reward_order_discounts WHERE order_id=$1",
        [o.id],
      ),
      entry = id();
    await tx.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,$3,$4)",
      [entry, o.customer_id, returned, `partial-restore:${c.id}`],
    );
    await tx.query(
      "INSERT INTO reward_entry_details(entry_id,branch_id,order_id,policy_version_id,kind,original_entry_id,detail) VALUES($1,$2,$3,$4,'restored',$5,$6)",
      [
        entry,
        o.branch_id,
        o.id,
        d!.policy_version_id,
        d!.entry_id,
        JSON.stringify({ creditId: c.id, rounding: "cumulative-floor" }),
      ],
    );
  }
  await tx.query(
    "INSERT INTO reward_refund_allocations(credit_id,order_id,gross_kobo,discount_kobo,returned_points,reversed_points,detail) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      c.id,
      o.id,
      s.grossKobo,
      s.discountKobo,
      returned,
      reversed,
      JSON.stringify(s),
    ],
  );
  await reverseReferral(tx, o.id);
  if (
    Number(
      (await one(
        tx,
        "SELECT COALESCE(sum(points),0) n FROM reward_entries WHERE customer_id=$1",
        [o.customer_id],
      ))!.n,
    ) < 0
  )
    await tx.query(
      "INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role) VALUES($1,$2,'high','reward_reversal_review',$3,'Partial refund reversal requires finance review. Points spending restricted; no monetary wallet debit.','finance') ON CONFLICT(category,target) DO NOTHING",
      [id(), o.branch_id, c.id],
    );
  return true;
}
