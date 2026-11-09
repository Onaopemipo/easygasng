import { one, type SQL } from "./db";
/** Read only, same booking/report/invoice authority. Never changes work authority or safety outcome. */
export async function serviceSettlementSource(tx: SQL, b: Record<string, any>) {
  if (
    !["failed", "cancelled"].includes(b.status) ||
    (await one(
      tx,
      "SELECT id FROM operational_incidents WHERE category='service_dispute' AND target=$1 AND status<>'resolved'",
      [b.id],
    ))
  )
    return null;
  const s = await one(
    tx,
    "SELECT s.*,c.accepted FROM service_exception_settlements s LEFT JOIN service_settlement_consents c ON c.settlement_id=s.id WHERE s.booking_id=$1 ORDER BY s.revision DESC LIMIT 1",
    [b.id],
  );
  if (
    !s ||
    s.source_status !== b.status ||
    s.accepted !== true ||
    !(await one(
      tx,
      "SELECT key FROM settings WHERE key=$1 AND scope=$2 AND value='true'::jsonb",
      ["service_settlement." + s.id, b.branch_id],
    ))
  )
    return null;
  const report = await one(
    tx,
    "SELECT id,body,outcome FROM service_reports WHERE booking_id=$1",
    [b.id],
  );
  if (
    (report?.id ?? null) !== s.report_id ||
    (await one(
      tx,
      "SELECT id FROM service_materials WHERE booking_id=$1 AND state NOT IN ('reconciled','released') LIMIT 1",
      [b.id],
    ))
  )
    return null;
  return {
    totalKobo: Number(s.amount_kobo),
    report,
    quote: null,
    final: true,
    key: "settlement:" + s.id,
    exceptionSettlement: s,
  };
}
