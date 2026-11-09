import { serviceSettlementSource } from "./service-settlement-source";
import { one, type SQL } from "./db";
// Source for invoice previews, issue and collectible requests. Never authorises work.
export async function serviceInvoiceSource(tx: SQL, b: Record<string, any>) {
  if (["cancelled", "failed"].includes(b.status))
    return serviceSettlementSource(tx, b);
  if (
    await one(
      tx,
      "SELECT id FROM operational_incidents WHERE category='service_dispute' AND target=$1 AND status<>'resolved'",
      [b.id],
    )
  )
    return null;
  const report = await one(
    tx,
    "SELECT id,body,outcome FROM service_reports WHERE booking_id=$1",
    [b.id],
  );
  if (report && ["success", "recommendations"].includes(report.outcome))
    return {
      totalKobo: Number(report.body.invoiceTotalKobo),
      report,
      quote: null,
      final: true,
      key: "report:" + report.id,
    };
  if (report || ["cancelled", "failed", "completed"].includes(b.status))
    return null;
  if (
    !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
      b.branch_id,
    ]))
  )
    return null;
  const quote = await one(
    tx,
    "SELECT q.*,d.approved FROM service_quotes q LEFT JOIN service_quote_decisions d ON d.quote_id=q.id WHERE q.booking_id=$1 ORDER BY q.revision DESC LIMIT 1",
    [b.id],
  );
  if (quote) {
    if (
      !quote.approved ||
      (quote.valid_until && Date.parse(quote.valid_until) <= Date.now())
    )
      return null;
    if (
      !(await one(
        tx,
        "SELECT key FROM settings WHERE key=$1 AND scope=$2 AND value='true'::jsonb",
        ["service_quote." + quote.id, b.branch_id],
      ))
    )
      return null;
    return {
      totalKobo: Number(quote.total_kobo),
      quote,
      report: null,
      final: false,
      key: "quote:" + quote.id,
    };
  }
  if (b.snapshot.pricingModel !== "fixed") return null;
  return {
    totalKobo: Number(b.snapshot.priceKobo) + Number(b.snapshot.calloutKobo),
    quote: null,
    report: null,
    final: false,
    key: "fixed:" + b.id,
  };
}
