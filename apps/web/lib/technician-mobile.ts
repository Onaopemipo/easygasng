import { z } from "zod";
import { one, type SQL } from "./db";
import { allow, AppError, type Actor } from "./auth";
async function authority(tx: SQL, user: Actor) {
  allow(user, ["technician"]);
  if (
    !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
      user.branch_id,
    ]))
  )
    throw new AppError(403, "Your active technician branch is required.");
}
const source = `WITH owned AS (SELECT b.*,s.starts_at,s.ends_at,u.name AS customer_name,(SELECT max(e.created_at) FROM service_booking_events e WHERE e.booking_id=b.id AND e.status=b.status AND e.status IN ('completed','failed','cancelled')) AS history_at FROM service_bookings b JOIN service_slots s ON s.id=b.slot_id JOIN users u ON u.id=b.customer_id WHERE b.technician_id=$1 AND b.branch_id=$2)`;
export async function technicianSummary(tx: SQL, user: Actor) {
  await authority(tx, user);
  const summary = (await one(
    tx,
    source +
      ` SELECT count(*)::int AS total,count(*) FILTER(WHERE status NOT IN ('completed','failed','cancelled'))::int AS active,count(*) FILTER(WHERE status IN ('assigned','confirmed'))::int AS assigned,count(*) FILTER(WHERE status IN ('en_route','in_progress','awaiting_customer_approval','awaiting_acknowledgement'))::int AS in_progress,count(*) FILTER(WHERE status='completed')::int AS completed,count(*) FILTER(WHERE status='completed' AND history_at IS NULL)::int AS unstamped_completed,count(*) FILTER(WHERE status='completed' AND (history_at AT TIME ZONE 'Africa/Lagos')::date>=date_trunc('month',now() AT TIME ZONE 'Africa/Lagos')::date AND history_at<=now())::int AS completed_month FROM owned`,
    [user.id, user.branch_id],
  ))!;
  const ratings = await one(
    tx,
    "SELECT count(*)::int AS count,avg(f.rating)::numeric(3,2) AS average FROM service_feedback f JOIN service_bookings b ON b.id=f.booking_id WHERE b.technician_id=$1 AND b.branch_id=$2 AND b.status='completed' AND f.customer_id=b.customer_id",
    [user.id, user.branch_id],
  );
  return {
    summary: {
      ...summary,
      completed_month:
        Number(summary.unstamped_completed) > 0
          ? null
          : Number(summary.completed_month),
      rating: ratings?.average == null ? null : Number(ratings.average),
      ratingCount: Number(ratings?.count ?? 0),
    },
    unreadNotifications: Number(
      (await one(
        tx,
        "SELECT count(*)::int count FROM notifications WHERE user_id=$1 AND read_at IS NULL",
        [user.id],
      ))!.count,
    ),
    preferences: await one(
      tx,
      "SELECT marketing,refill_reminders,service_reminders,quiet_start,quiet_end FROM communication_preferences WHERE user_id=$1",
      [user.id],
    ),
    generatedAt: new Date().toISOString(),
    timeZone: "Africa/Lagos",
  };
}
export async function technicianJobs(tx: SQL, user: Actor, input: unknown) {
  await authority(tx, user);
  const d = z
    .object({
      q: z.string().trim().max(100).default(""),
      filter: z
        .enum(["all", "assigned", "in_progress", "completed", "past"])
        .default("all"),
      page: z.coerce.number().int().min(1).max(10000).default(1),
      from: z.iso.date().optional(),
      to: z.iso.date().optional(),
      intent: z.enum(["photo", "report"]).optional(),
      location: z.string().trim().max(100).optional(),
    })
    .strict()
    .parse(input);
  if (
    d.from &&
    d.to &&
    (d.from > d.to || (Date.parse(d.to) - Date.parse(d.from)) / 86400000 > 366)
  )
    throw new AppError(400, "Choose a valid date range of at most 367 days.");
  const p = [
    user.id,
    user.branch_id,
    "%" + d.q.replace(/[\\%_]/g, "\\$&") + "%",
    d.filter,
    d.from ?? null,
    d.to ?? null,
    d.intent ?? null,
    d.location ? "%" + d.location.replace(/[\\%_]/g, "\\$&") + "%" : null,
  ];
  const match = ` WHERE ($3='%%' OR reference ILIKE $3 ESCAPE '\\' OR snapshot->>'name' ILIKE $3 ESCAPE '\\' OR customer_name ILIKE $3 ESCAPE '\\') AND ($4='all' OR ($4='assigned' AND status IN ('assigned','confirmed')) OR ($4='in_progress' AND status IN ('en_route','in_progress','awaiting_customer_approval','awaiting_acknowledgement')) OR ($4='completed' AND status='completed') OR ($4='past' AND status IN ('completed','failed','cancelled'))) AND ($5::date IS NULL OR (COALESCE(history_at,starts_at) AT TIME ZONE 'Africa/Lagos')::date>=$5) AND ($6::date IS NULL OR (COALESCE(history_at,starts_at) AT TIME ZONE 'Africa/Lagos')::date<=$6) AND ($7::text IS NULL OR (status='in_progress' AND work_phase='authorised' AND assignment_response<>'declined' AND NOT EXISTS(SELECT 1 FROM service_reports r WHERE r.booking_id=owned.id))) AND ($8::text IS NULL OR address->>'zone' ILIKE $8 ESCAPE '\\' OR address->>'street' ILIKE $8 ESCAPE '\\')`;
  const total = Number(
    (await one(
      tx,
      source + " SELECT count(*)::int count FROM owned" + match,
      p,
    ))!.count,
  );
  const rows = (
    await tx.query(
      source +
        " SELECT id,reference,snapshot->>'name' AS service,status,assignment_response,work_phase,address,starts_at,ends_at,history_at FROM owned" +
        match +
        " ORDER BY CASE WHEN $4 IN ('past','completed') THEN history_at ELSE starts_at END DESC NULLS LAST,id LIMIT 20 OFFSET $9",
      [...p, (d.page - 1) * 20],
    )
  ).rows;
  return {
    rows,
    total,
    page: d.page,
    hasMore: d.page * 20 < total,
    generatedAt: new Date().toISOString(),
    timeZone: "Africa/Lagos",
    periodBasis:
      d.filter === "past" || d.filter === "completed"
        ? "Recorded terminal event, or scheduled date when missing (not a claimed completion timestamp)"
        : "Appointment schedule",
  };
}
