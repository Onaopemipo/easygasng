import { z } from "zod";
import { AppError, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { navigationAccess } from "./navigation";

export async function notificationInbox(tx: SQL, user: Actor, input: unknown) {
  const { filter, page } = z
    .object({
      filter: z.enum(["all", "unread"]).default("all"),
      page: z.coerce.number().int().min(1).max(1_000_000).default(1),
    })
    .strict()
    .parse(input);
  const pageSize = 8;
  const customer = ["customer", "commercial"].includes(user.role);
  let canOpenOrders = false;
  if (
    !customer &&
    !user.driver_delivery_only &&
    !user.technician_service_only &&
    !["driver", "technician"].includes(user.role)
  ) {
    try {
      canOpenOrders = (await navigationAccess(tx, user)).allowed.includes(
        "orders",
      );
    } catch (error) {
      if (!(error instanceof AppError) || error.status !== 403) throw error;
    }
  }
  const counts = await one(
    tx,
    "SELECT count(*)::int AS total, count(*) FILTER (WHERE read_at IS NULL)::int AS unread FROM notifications WHERE user_id=$1",
    [user.id],
  );
  const filteredTotal = Number(
    filter === "all" ? counts?.total : counts?.unread,
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filteredTotal / pageSize)),
  );
  const { rows } = await tx.query(
    `SELECT n.id,n.title,n.body,n.read_at,n.created_at,n.related_id,
      CASE WHEN $3::boolean AND EXISTS (
        SELECT 1 FROM orders o WHERE o.id::text=n.related_id::text
        AND ($2::text IS NULL OR o.branch_id=$2)
      ) THEN '/admin/orders?orderId=' || n.related_id::text END AS href
      FROM notifications n WHERE n.user_id=$1 AND (NOT $4::boolean OR n.read_at IS NULL)
      ORDER BY n.created_at DESC,n.id DESC LIMIT $5 OFFSET $6`,
    [
      user.id,
      user.role === "owner" ? null : user.branch_id,
      canOpenOrders,
      filter === "unread",
      pageSize,
      (currentPage - 1) * pageSize,
    ],
  );
  return {
    items: rows,
    total: Number(counts?.total),
    unread: Number(counts?.unread),
    filteredTotal,
    page: currentPage,
    pageSize,
    generatedAt: new Date().toISOString(),
  };
}

export async function markNotificationsRead(
  tx: SQL,
  user: Actor,
  input: unknown,
) {
  const request = z
    .union([
      z.object({ all: z.literal(true) }).strict(),
      z.object({ ids: z.array(z.string().uuid()).min(1).max(8) }).strict(),
    ])
    .parse(input);
  const { rows } = await tx.query(
    "UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL AND ($2::boolean OR id::text=ANY($3::text[])) RETURNING id",
    [user.id, "all" in request, "ids" in request ? request.ids : []],
  );
  const unread = await one(
    tx,
    "SELECT count(*)::int AS count FROM notifications WHERE user_id=$1 AND read_at IS NULL",
    [user.id],
  );
  return {
    ok: true,
    affected: rows.length,
    unread: Number(unread?.count ?? 0),
  };
}
