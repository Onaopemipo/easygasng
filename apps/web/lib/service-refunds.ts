import { serviceSettlementSource } from "./service-settlement-source";
import { one, type SQL } from "./db";
// Caller holds the canonical booking lock. Preserve reviewed full-service refunds;
// explicit excess reconciliation retains earned charges and service rewards.
export async function serviceRefundAllowance(
  tx: SQL,
  booking: { id: string; status: string },
  scope: "service" | "excess" = "service",
) {
  const paid = Number(
    (await one(
      tx,
      "SELECT COALESCE(sum(amount_kobo),0) AS n FROM verified_payments WHERE booking_id=$1",
      [booking.id],
    ))!.n,
  );
  const refunded = Number(
    (await one(
      tx,
      "SELECT COALESCE(sum(amount_kobo),0) AS n FROM credit_requests WHERE booking_id=$1 AND kind='refund' AND status='approved'",
      [booking.id],
    ))!.n,
  );
  if (
    scope === "service" &&
    ["cancelled", "failed", "completed"].includes(booking.status)
  )
    return Math.max(0, paid - refunded);
  if (booking.status !== "completed") {
    const b = await one(tx, "SELECT * FROM service_bookings WHERE id=$1", [
      booking.id,
    ]);
    const settlement = b && (await serviceSettlementSource(tx, b));
    return settlement ? Math.max(0, paid - refunded - settlement.totalKobo) : 0;
  }
  const report = await one(
    tx,
    "SELECT body FROM service_reports WHERE booking_id=$1",
    [booking.id],
  );
  const total = Number(report?.body.invoiceTotalKobo);
  if (!report || !Number.isSafeInteger(total) || total < 0) return 0;
  return Math.max(0, paid - refunded - total);
}
