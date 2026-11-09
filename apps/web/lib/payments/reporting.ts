import { z } from "zod";
import { one, type SQL } from "../db";
import { allow, type Actor } from "../auth";
import { audit } from "../governance";
export async function paystackReport(tx: SQL, user: Actor, input: unknown) {
  allow(user, ["owner", "finance"]);
  const d = z
    .object({
      from: z.iso.datetime(),
      to: z.iso.datetime(),
      purpose: z.enum(["invoice", "service", "wallet", "order"]).optional(),
      limit: z.number().int().min(1).max(200).default(100),
    })
    .strict()
    .refine(
      (v) =>
        Date.parse(v.to) > Date.parse(v.from) &&
        Date.parse(v.to) - Date.parse(v.from) <= 366 * 86400000,
      "Choose a date window of at most 366 days.",
    )
    .parse(input);
  const args = [
    user.role === "owner",
    user.branch_id,
    d.from,
    d.to,
    d.purpose ?? null,
  ];
  const filter =
    "($1::boolean OR i.branch_id=$2) AND p.created_at >= $3::timestamptz AND p.created_at < $4::timestamptz AND ($5::text IS NULL OR i.purpose=$5)";
  const totals = await one(
    tx,
    `SELECT count(*) AS count,COALESCE(sum(p.gross_kobo),0) AS gross,COALESCE(sum(p.customer_fee_kobo),0) AS recovered_fees,
    COALESCE(sum(p.base_kobo) FILTER(WHERE i.purpose='wallet'),0) AS wallet_funding,
    COALESCE(sum(p.base_kobo) FILTER(WHERE i.purpose<>'wallet'),0) AS obligation_collections,
    COALESCE(sum(p.actual_fee_kobo),0) AS known_provider_fees,count(*) FILTER(WHERE p.actual_fee_kobo IS NULL) AS unknown_fee_count
    FROM payment_postings p JOIN payment_intents i ON i.id=p.intent_id WHERE ${filter}`,
    args,
  );
  const rows = (
    await tx.query(
      `SELECT p.id,p.provider_reference,i.purpose,i.branch_id,p.base_kobo,p.customer_fee_kobo,p.gross_kobo,p.actual_fee_kobo,p.created_at
    FROM payment_postings p JOIN payment_intents i ON i.id=p.intent_id WHERE ${filter} ORDER BY p.created_at DESC,p.id DESC LIMIT $6`,
      [...args, d.limit],
    )
  ).rows;
  const exceptions = (
    await tx.query(
      `SELECT e.id,e.category,e.status,e.created_at,a.reference,i.branch_id FROM payment_exceptions e
    JOIN payment_attempts a ON a.id=e.attempt_id JOIN payment_intents i ON i.id=a.intent_id
    WHERE ($1::boolean OR i.branch_id=$2) AND e.created_at >= $3::timestamptz AND e.created_at < $4::timestamptz AND ($5::text IS NULL OR i.purpose=$5)
    ORDER BY e.created_at DESC,e.id DESC LIMIT $6`,
      [...args, d.limit],
    )
  ).rows;
  const unmatchedEvents =
    user.role === "owner"
      ? (
          await tx.query(
            "SELECT id,event_type,reference,received_at,state FROM payment_provider_events WHERE attempt_id IS NULL AND state='under_review' AND received_at >= $1::timestamptz AND received_at < $2::timestamptz ORDER BY received_at DESC,id DESC LIMIT $3",
            [d.from, d.to, d.limit],
          )
        ).rows
      : [];
  await audit(tx, user, "payment.finance_report", user.branch_id ?? "business");
  return {
    environment: "test",
    currency: "NGN",
    from: d.from,
    to: d.to,
    count: Number(totals!.count),
    grossCollectionsKobo: Number(totals!.gross),
    obligationCollectionsKobo: Number(totals!.obligation_collections),
    walletFundingLiabilityKobo: Number(totals!.wallet_funding),
    recoveredProcessingChargesKobo: Number(totals!.recovered_fees),
    knownProviderFeesKobo: Number(totals!.known_provider_fees),
    unknownFeeCount: Number(totals!.unknown_fee_count),
    estimatedProviderNetKobo: Number(totals!.unknown_fee_count)
      ? null
      : Number(totals!.gross) - Number(totals!.known_provider_fees),
    actualSettlementKobo: null,
    settlementStatus:
      "Not imported or reconciled; provider net is not bank settlement. Collections are not additional sales revenue.",
    rows,
    exceptions,
    unmatchedEvents,
    truncated: Number(totals!.count) > d.limit,
  };
}
