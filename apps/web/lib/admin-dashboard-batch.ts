import { type SQL, one } from './db';
import { orderRevenueSql } from './order-financial-basis';

/** Fast normal read; the original per-widget savepoints remain the error fallback. */
export async function readDashboardBatch(
  tx: SQL,
  branch: string | null,
  from: string,
  to: string,
  allowed: string[],
  role: string,
  errors: Record<string, string>,
) {
  const can = (id: string) => allowed.includes(id);
  const period = "($1::text IS NULL OR o.branch_id=$1) AND (o.created_at AT TIME ZONE 'Africa/Lagos')::date BETWEEN $2::date AND $3::date";
  await tx.exec('SAVEPOINT admin_dashboard_batch');
  try {
    const row = await one(tx, `SELECT
      CASE WHEN $4::boolean THEN (SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.status),'[]'::jsonb) FROM (SELECT o.status,count(*)::int AS count FROM orders o WHERE ${period} GROUP BY o.status) s) END AS statuses,
      CASE WHEN $4::boolean THEN (SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.date),'[]'::jsonb) FROM (SELECT (o.created_at AT TIME ZONE 'Africa/Lagos')::date::text AS date,count(*)::int AS count FROM orders o WHERE ${period} GROUP BY 1) s) END AS trend,
      CASE WHEN $5::boolean THEN (SELECT count(DISTINCT o.customer_id)::int FROM orders o JOIN users u ON u.id=o.customer_id WHERE ${period} AND o.status<>'cancelled' AND u.role IN ('customer','commercial')) END AS customers,
      CASE WHEN $6::boolean THEN (SELECT count(*)::int FROM service_bookings b WHERE ($1::text IS NULL OR b.branch_id=$1) AND (b.created_at AT TIME ZONE 'Africa/Lagos')::date BETWEEN $2::date AND $3::date) END AS services,
      CASE WHEN $7::boolean THEN (SELECT count(*)::int FROM cylinders c WHERE ($1::text IS NULL OR c.branch_id=$1) AND c.status='filled' AND c.ownership='company' AND c.customer_id IS NULL AND c.test_due>=(now() AT TIME ZONE 'Africa/Lagos')::date AND NOT EXISTS(SELECT 1 FROM cylinder_allocations a WHERE a.cylinder_id=c.id AND a.state IN ('reserved','issued')) AND NOT EXISTS(SELECT 1 FROM vehicle_product_serials s WHERE s.cylinder_id=c.id AND s.state IN ('loaded','reserved'))) END AS cylinders,
      CASE WHEN $8::boolean THEN (SELECT count(*)::int FROM operational_incidents WHERE ($1::text IS NULL OR branch_id=$1) AND status IN ('open','acknowledged')) END AS incidents,
      CASE WHEN $4::boolean OR $6::boolean THEN jsonb_build_object(
        'deliveries',CASE WHEN $9::boolean THEN (SELECT count(*)::int FROM orders WHERE ($1::text IS NULL OR branch_id=$1) AND status='out_for_delivery') END,
        'drivers',CASE WHEN $9::boolean THEN (SELECT count(DISTINCT driver_id)::int FROM orders WHERE ($1::text IS NULL OR branch_id=$1) AND status='out_for_delivery') END,
        'appointments',CASE WHEN $6::boolean THEN (SELECT count(*)::int FROM service_bookings b JOIN service_slots s ON s.id=b.slot_id WHERE ($1::text IS NULL OR b.branch_id=$1) AND (s.starts_at AT TIME ZONE 'Africa/Lagos')::date BETWEEN $2::date AND $3::date AND b.status NOT IN ('cancelled','failed')) END,
        'technicians',CASE WHEN $6::boolean THEN (SELECT count(DISTINCT technician_id)::int FROM service_bookings WHERE ($1::text IS NULL OR branch_id=$1) AND status='in_progress' AND work_phase='authorised') END
      ) END AS operations,
      CASE WHEN $10::boolean THEN ((SELECT COALESCE(sum(${orderRevenueSql}),0) FROM orders o WHERE ($1::text IS NULL OR o.branch_id=$1) AND o.status='delivered' AND o.payment_status='verified' AND (SELECT (max(e.created_at) AT TIME ZONE 'Africa/Lagos')::date FROM order_events e WHERE e.order_id=o.id AND e.status='delivered') BETWEEN $2::date AND $3::date)
        +(SELECT COALESCE(sum(p.total_kobo),0) FROM pos_sales p JOIN pos_shifts s ON s.id=p.shift_id WHERE ($1::text IS NULL OR s.branch_id=$1) AND s.status='verified' AND (p.created_at AT TIME ZONE 'Africa/Lagos')::date BETWEEN $2::date AND $3::date)
        +(SELECT COALESCE(sum(GREATEST(0,LEAST((r.body->>'invoiceTotalKobo')::bigint,COALESCE((SELECT sum(p.amount_kobo) FROM verified_payments p WHERE p.booking_id=b.id),0)-COALESCE((SELECT sum(c.amount_kobo) FROM credit_requests c WHERE c.booking_id=b.id AND c.status='approved' AND c.kind='refund'),0)))),0) FROM service_bookings b JOIN service_reports r ON r.booking_id=b.id WHERE ($1::text IS NULL OR b.branch_id=$1) AND b.status='completed' AND (SELECT (max(e.created_at) AT TIME ZONE 'Africa/Lagos')::date FROM service_booking_events e WHERE e.booking_id=b.id AND e.status='completed') BETWEEN $2::date AND $3::date))::text END AS revenue,
      CASE WHEN $11::boolean THEN (SELECT jsonb_build_object('title',title,'body',body) FROM campaigns WHERE ($1::text IS NULL OR branch_id=$1) AND status='approved' AND approved_by IS NOT NULL ORDER BY created_at DESC LIMIT 1) END AS campaign`,
      [branch, from, to, can('orders'), can('customers'), can('bookings'), can('cylinders'), can('incidents'), can('deliveries'), ['owner','finance'].includes(role), can('campaigns')]);
    if (!row) throw new Error('Dashboard snapshot missing');
    let revenue: number | null = row.revenue == null ? null : Number(row.revenue);
    if (revenue !== null && (!Number.isSafeInteger(revenue) || revenue < 0)) {
      revenue = null;
      errors.revenue = 'Unavailable. Retry or contact operations.';
    }
    const result = {
      orders: can('orders') ? { count: row.statuses.reduce((n: number, r: any) => n + Number(r.count), 0), statuses: row.statuses } : null,
      trend: row.trend,
      customers: row.customers,
      services: row.services,
      cylinders: row.cylinders,
      incidents: row.incidents,
      operations: row.operations,
      revenue,
      campaign: can('campaigns') ? row.campaign ?? undefined : null,
    };
    await tx.exec('RELEASE SAVEPOINT admin_dashboard_batch');
    return result;
  } catch {
    await tx.exec('ROLLBACK TO SAVEPOINT admin_dashboard_batch');
    await tx.exec('RELEASE SAVEPOINT admin_dashboard_batch');
    return undefined;
  }
}
