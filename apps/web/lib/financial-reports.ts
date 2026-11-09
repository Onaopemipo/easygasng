import { orderRevenueSql } from "./order-financial-basis";
import { paystackReport } from "./payments/reporting";
import { z } from "zod";
import { one, type SQL } from "./db";
import { allow, AppError, type Actor } from "./auth";
import { audit } from "./governance";
export async function financialReports(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
): Promise<any> {
  if (action === "finance.paystack") return paystackReport(tx, user, input);
  if (!["finance.summary", "finance.ledger"].includes(action)) return undefined;
  allow(user, ["owner", "finance"]);
  const global = user.role === "owner",
    branch = user.branch_id;
  if (action === "finance.ledger") {
    const d = z
      .object({
        after: z.string().uuid().optional(),
        limit: z.coerce.number().int().min(1).max(500).default(100),
      })
      .strict()
      .parse(input);
    if (
      d.after &&
      !(await one(
        tx,
        "SELECT p.id FROM verified_payments p LEFT JOIN orders o ON o.id=p.order_id LEFT JOIN service_bookings b ON b.id=p.booking_id WHERE p.id=$1 AND ($2::boolean OR COALESCE(o.branch_id,b.branch_id)=$3)",
        [d.after, global, branch],
      ))
    )
      throw new AppError(400, "Choose a valid report cursor.");
    const rows = (
      await tx.query(
        "SELECT p.id,p.reference,p.amount_kobo,p.method,p.created_at,o.reference AS order_reference,b.reference AS booking_reference,COALESCE(o.branch_id,b.branch_id) AS branch_id FROM verified_payments p LEFT JOIN orders o ON o.id=p.order_id LEFT JOIN service_bookings b ON b.id=p.booking_id WHERE ($1::boolean OR COALESCE(o.branch_id,b.branch_id)=$2) AND ($3::text IS NULL OR (p.created_at,p.id)>(SELECT created_at,id FROM verified_payments WHERE id=$3)) ORDER BY p.created_at,p.id LIMIT $4",
        [global, branch, d.after ?? null, d.limit + 1],
      )
    ).rows;
    const more = rows.length > d.limit;
    if (more) rows.pop();
    await audit(tx, user, "finance.ledger_viewed", "verified_payments");
    return { rows, hasMore: more, nextCursor: more ? rows.at(-1)?.id : null };
  }
  z.object({}).strict().parse(input);
  const productRevenue = Number(
    (await one(
      tx,
      `SELECT COALESCE(sum(${orderRevenueSql}),0) AS n FROM orders o WHERE o.status='delivered' AND o.payment_status='verified' AND ($1::boolean OR o.branch_id=$2)`,
      [global, branch],
    ))!.n,
  );
  const posRevenue = Number(
    (await one(
      tx,
      "SELECT COALESCE(sum(p.total_kobo),0) AS n FROM pos_sales p JOIN pos_shifts s ON s.id=p.shift_id WHERE s.status='verified' AND ($1::boolean OR s.branch_id=$2)",
      [global, branch],
    ))!.n,
  );
  const services = (
    await tx.query(
      "SELECT b.id,b.reference,b.status,(r.body->>'invoiceTotalKobo')::bigint AS invoiced_kobo,COALESCE((SELECT sum(p.amount_kobo) FROM verified_payments p WHERE p.booking_id=b.id),0) AS paid_kobo,COALESCE((SELECT sum(c.amount_kobo) FROM credit_requests c WHERE c.booking_id=b.id AND c.status='approved' AND c.kind='refund'),0) AS refunded_kobo,COALESCE((SELECT sum(m.unit_cost_kobo*(m.used+m.damaged+m.missing)) FROM service_materials m WHERE m.booking_id=b.id AND m.state='reconciled'),0) AS recorded_material_cost_kobo FROM service_bookings b LEFT JOIN service_reports r ON r.booking_id=b.id WHERE ($1::boolean OR b.branch_id=$2) ORDER BY b.created_at",
      [global, branch],
    )
  ).rows;
  const serviceRevenue = services
    .filter((s) => s.status === "completed")
    .reduce(
      (n, s) =>
        n +
        Math.max(
          0,
          Math.min(
            Number(s.invoiced_kobo ?? 0),
            Number(s.paid_kobo) - Number(s.refunded_kobo),
          ),
        ),
      0,
    );
  const unverifiedCash =
    Number(
      (await one(
        tx,
        "SELECT COALESCE(sum(c.amount_kobo),0) AS n FROM cash_collections c JOIN orders o ON o.id=c.order_id WHERE c.verified_at IS NULL AND ($1::boolean OR o.branch_id=$2)",
        [global, branch],
      ))!.n,
    ) +
    Number(
      (await one(
        tx,
        "SELECT COALESCE(sum(c.amount_kobo),0) AS n FROM service_cash_collections c JOIN service_bookings b ON b.id=c.booking_id WHERE c.verified_at IS NULL AND ($1::boolean OR b.branch_id=$2)",
        [global, branch],
      ))!.n,
    );
  const supplementaryCash = Number(
    (await one(
      tx,
      "SELECT COALESCE(sum(x.amount_kobo),0) n FROM (SELECT e.amount_kobo,o.branch_id FROM doorstep_execution e JOIN orders o ON o.id=e.order_id WHERE e.cash_reported_at IS NOT NULL AND e.cash_verified_at IS NULL UNION ALL SELECT e.amount_kobo,o.branch_id FROM doorstep_product_execution e JOIN orders o ON o.id=e.order_id WHERE e.cash_reported_at IS NOT NULL AND e.cash_verified_at IS NULL) x WHERE ($1::boolean OR x.branch_id=$2)",
      [global, branch],
    ))!.n,
  );
  const wallet = global
    ? Number(
        (await one(
          tx,
          "SELECT COALESCE(sum(amount_kobo),0) AS n FROM wallet_entries",
        ))!.n,
      )
    : null;
  const rewardPoints = global
    ? Number(
        (await one(
          tx,
          "SELECT COALESCE(sum(points),0) AS n FROM reward_entries",
        ))!.n,
      )
    : null;
  await audit(tx, user, "finance.summary_viewed", branch ?? "business");
  return {
    currency: "NGN",
    productRevenueKobo: productRevenue,
    posRevenueKobo: posRevenue,
    serviceRevenueKobo: serviceRevenue,
    totalVerifiedCompletedRevenueKobo:
      productRevenue + posRevenue + serviceRevenue,
    unverifiedCashKobo: unverifiedCash + supplementaryCash,
    walletLiabilityKobo: wallet,
    rewardPointsOutstanding: rewardPoints,
    services,
    profitKobo: null,
    limitations: [
      "Revenue is verified receipts against completed fulfilments, not profit.",
      "Labour, transport, overhead and tax costs are not fully recorded; profit is unavailable.",
      "Wallet and reward liabilities are business-wide; only the owner can view consolidated balances.",
    ],
  };
}
