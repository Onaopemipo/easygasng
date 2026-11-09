// Internal SQL fragments use the fixed canonical orders alias `o`, never user SQL.
export const orderEffectiveSql =
  "COALESCE((SELECT i.total_kobo+COALESCE((SELECT sum(CASE WHEN n.kind='debit' THEN n.amount_kobo ELSE -n.amount_kobo END) FROM invoice_notes n WHERE n.invoice_id=i.id AND n.state='approved'),0) FROM customer_invoices i WHERE i.order_id=o.id),o.total_kobo)";
export const orderNetReceiptsSql =
  "COALESCE((SELECT sum(p.amount_kobo) FROM verified_payments p WHERE p.order_id=o.id),0)-COALESCE((SELECT sum(c.amount_kobo) FROM credit_requests c WHERE c.order_id=o.id AND c.kind='refund' AND c.status='approved'),0)";
export const orderRevenueSql = `GREATEST(0,LEAST(${orderEffectiveSql},${orderNetReceiptsSql}))`;
export function orderCompletedRevenue(order: any) {
  return Math.max(
    0,
    Math.min(
      Number(order.effective_total_kobo ?? order.total_kobo),
      Number(order.net_receipts_kobo ?? 0),
    ),
  );
}
