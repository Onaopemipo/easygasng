import { z } from "zod";
import { allow, AppError, type Actor } from "./auth";
import { one, type SQL } from "./db";
import type { TechnicianWorkspaceData } from "../../../packages/business-rules/src/technicians-availability";
const inputSchema = z
  .object({
    branchId: z.string().max(100).optional(),
    q: z.string().trim().max(100).default(""),
    status: z
      .enum(["all", "active", "inactive", "assigned", "available"])
      .default("all"),
    qualification: z
      .enum(["all", "verified", "expired", "missing"])
      .default("all"),
    serviceId: z.string().max(100).default(""),
    date: z.iso.date().optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    schedulePage: z.coerce.number().int().min(1).max(10000).default(1),
  })
  .strict();
export async function techniciansWorkspace(
  tx: SQL,
  user: Actor,
  input: unknown,
): Promise<TechnicianWorkspaceData> {
  allow(user, ["owner", "manager", "finance"]);
  const d = inputSchema.parse(input),
    branch =
      d.branchId === "" && user.role === "owner"
        ? null
        : d.branchId || user.branch_id;
  if (user.role !== "owner" && branch !== user.branch_id)
    throw new AppError(403, "Choose your authorised branch.");
  if (
    branch &&
    !(await one(tx, "SELECT id FROM branches WHERE id=$1", [branch]))
  )
    throw new AppError(404, "Branch not found.");
  const params = [
    branch || null,
    d.q,
    d.status,
    d.qualification,
    d.serviceId,
    d.date || null,
  ];
  const source = `WITH directory AS (SELECT u.id,u.name,u.branch_id,u.active,u.technician_available,
 COALESCE((SELECT jsonb_agg(jsonb_build_object('id',q.id,'code',q.code,'expires_at',q.expires_at,'evidence',${["owner"].includes(user.role) ? "q.evidence" : "NULL"},'verifiedBy',q.verified_by,'verified',q.expires_at>now() AND v.active AND v.role IN ('owner') AND v.id<>u.id AND (v.role='owner' OR v.branch_id=u.branch_id))) FROM technician_qualifications q JOIN users v ON v.id=q.verified_by WHERE q.user_id=u.id),'[]'::jsonb) AS qualifications,
 EXISTS(SELECT 1 FROM service_bookings b JOIN service_slots x ON x.id=b.slot_id WHERE b.technician_id=u.id AND b.branch_id=u.branch_id AND b.status NOT IN ('completed','cancelled','failed') AND (b.status IN ('en_route','in_progress','awaiting_customer_approval','awaiting_acknowledgement') OR (x.starts_at<=now() AND x.ends_at>now()))) AS on_assignment,
 (u.active AND u.technician_available AND EXISTS(SELECT 1 FROM branches br WHERE br.id=u.branch_id AND br.active) AND EXISTS(SELECT 1 FROM service_slots s JOIN service_catalogue c ON c.id=s.service_id AND c.branch_id=s.branch_id WHERE s.technician_id=u.id AND s.branch_id=u.branch_id AND s.blocked=false AND s.starts_at>now() AND (s.starts_at AT TIME ZONE 'Africa/Lagos')::date=COALESCE($6::date,(now() AT TIME ZONE 'Africa/Lagos')::date) AND (c.config->>'active')::boolean=true AND EXISTS(SELECT 1 FROM technician_qualifications q JOIN users v ON v.id=q.verified_by WHERE q.user_id=u.id AND q.code=c.config->>'qualification' AND q.expires_at>s.ends_at AND v.id<>u.id AND v.active AND v.role IN ('owner') AND (v.role='owner' OR v.branch_id=u.branch_id)) AND NOT EXISTS(SELECT 1 FROM service_bookings b JOIN service_slots x ON x.id=b.slot_id WHERE b.technician_id=u.id AND b.status NOT IN ('completed','cancelled','failed') AND x.starts_at<s.ends_at AND x.ends_at>s.starts_at))) AS available_today
 FROM users u WHERE u.role='technician' AND ($1::text IS NULL OR u.branch_id=$1)), filtered AS (SELECT * FROM directory u WHERE ($2='' OR u.name ILIKE '%'||$2||'%' OR u.id ILIKE '%'||$2||'%' OR EXISTS(SELECT 1 FROM jsonb_array_elements(u.qualifications) q WHERE q->>'code' ILIKE '%'||$2||'%')) AND ($3='all' OR ($3='active' AND u.active) OR ($3='inactive' AND NOT u.active) OR ($3='assigned' AND u.on_assignment) OR ($3='available' AND u.available_today AND NOT u.on_assignment)) AND ($4='all' OR ($4='verified' AND EXISTS(SELECT 1 FROM jsonb_array_elements(u.qualifications) q WHERE (q->>'verified')::boolean)) OR ($4='expired' AND EXISTS(SELECT 1 FROM jsonb_array_elements(u.qualifications) q WHERE NOT (q->>'verified')::boolean)) OR ($4='missing' AND jsonb_array_length(u.qualifications)=0)) AND ($5='' OR EXISTS(SELECT 1 FROM service_catalogue c JOIN technician_qualifications q ON q.code=c.config->>'qualification' JOIN users v ON v.id=q.verified_by WHERE c.id=$5 AND c.branch_id=u.branch_id AND q.user_id=u.id AND q.expires_at>now() AND v.active AND v.id<>u.id AND v.role IN ('owner') AND (v.role='owner' OR v.branch_id=u.branch_id))))`;
  const summary = (await one(
    tx,
    source +
      ` SELECT count(*)::int total,count(*) FILTER(WHERE active)::int active,count(*) FILTER(WHERE on_assignment)::int "onAssignment",count(*) FILTER(WHERE available_today AND NOT on_assignment)::int "availableToday" FROM directory`,
    params,
  ))!;
  const total = Number(
    (await one(tx, source + " SELECT count(*)::int n FROM filtered", params))!
      .n,
  );
  const people = (
    await tx.query(
      source + " SELECT * FROM filtered ORDER BY name,id LIMIT 20 OFFSET $7",
      [...params, (d.page - 1) * 20],
    )
  ).rows;
  const scheduleSource = `FROM service_slots s JOIN users u ON u.id=s.technician_id JOIN branches br ON br.id=s.branch_id JOIN service_catalogue c ON c.id=s.service_id AND c.branch_id=s.branch_id WHERE ($1::text IS NULL OR s.branch_id=$1) AND s.ends_at>now() AND ($2::date IS NULL OR (s.starts_at AT TIME ZONE 'Africa/Lagos')::date=$2::date)`;
  const schedule = (
    await tx.query(
      `SELECT s.*,u.name technician_name,c.name service_name,(SELECT count(*)::int FROM service_bookings b WHERE b.slot_id=s.id AND b.status NOT IN ('completed','cancelled','failed')) bookings,(u.active AND u.technician_available AND br.active AND u.branch_id=s.branch_id AND (c.config->>'active')::boolean=true AND EXISTS(SELECT 1 FROM technician_qualifications q JOIN users v ON v.id=q.verified_by WHERE q.user_id=u.id AND q.code=c.config->>'qualification' AND q.expires_at>s.ends_at AND v.active AND v.id<>u.id AND v.role IN ('owner') AND (v.role='owner' OR v.branch_id=s.branch_id))) eligible ` +
        scheduleSource +
        " ORDER BY s.starts_at,s.id LIMIT 10 OFFSET $3",
      [branch || null, d.date || null, (d.schedulePage - 1) * 10],
    )
  ).rows;
  return {
    generatedAt: new Date().toISOString(),
    timeZone: "Africa/Lagos",
    summary: summary as any,
    people: people as any,
    total,
    page: d.page,
    pageSize: 20,
    schedule: schedule as any,
    scheduleTotal: Number(
      (await one(tx, "SELECT count(*)::int n " + scheduleSource, [
        branch || null,
        d.date || null,
      ]))!.n,
    ),
    branches: (
      await tx.query(
        `SELECT id,name,active FROM branches ${user.role === "owner" ? "" : "WHERE id=$1"} ORDER BY name`,
        user.role === "owner" ? [] : [user.branch_id],
      )
    ).rows as any,
    services: (
      await tx.query(
        `SELECT id,name,branch_id,config FROM service_catalogue WHERE ($1::text IS NULL OR branch_id=$1) ORDER BY name`,
        [branch || null],
      )
    ).rows as any,
    verificationTargets: ["owner"].includes(user.role)
      ? ((
          await tx.query(
            "SELECT id,name,role,branch_id FROM users WHERE active=true AND role IN ('technician','owner') AND ($1::text IS NULL OR branch_id=$1) ORDER BY name,id LIMIT 200",
            [branch || null],
          )
        ).rows as any)
      : [],
    permissions: {
      invite: user.role === "owner",
      edit: user.role === "owner",
      verify: ["owner"].includes(user.role),
      schedule: ["owner", "manager"].includes(user.role),
    },
  };
}
