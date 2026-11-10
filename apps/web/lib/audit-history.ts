import { z } from "zod";
import { allow, type Actor } from "./auth";
import { one, type SQL } from "./db";
const schema = z
  .object({
    view: z.literal("paged").optional(),
    snapshot: z.iso.datetime({ offset: true }).optional(),
    cursor: z
      .string()
      .max(500)
      .transform((value, ctx) => {
        try {
          return z
            .object({
              at: z.iso.datetime({ offset: true }),
              id: z.string().min(1).max(200),
            })
            .strict()
            .parse(JSON.parse(value));
        } catch {
          ctx.addIssue({
            code: "custom",
            message: "Invalid pagination cursor.",
          });
          return z.NEVER;
        }
      })
      .optional(),
    direction: z.enum(["older", "newer"]).default("older"),
    page: z.coerce.number().int().min(1).max(1000000).default(1),
    pageSize: z.coerce
      .number()
      .int()
      .refine(
        (n) => [10, 25, 50, 100].includes(n),
        "Choose 10, 25, 50 or 100 rows.",
      )
      .default(25),
    q: z.string().trim().max(200).default(""),
  })
  .strict();
export async function auditHistory(tx: SQL, user: Actor, input: unknown) {
  // Audit History is already a global owner/administrator workspace. Do not widen it.
  allow(user, ["owner", "administrator"]);
  const d = schema.parse(input);
  if (!d.view)
    return (
      await tx.query(
        "SELECT a.*,u.name AS actor FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC,a.id DESC LIMIT 200",
      )
    ).rows;
  const snapshot =
    d.snapshot ??
    new Date(
      (await one(tx, "SELECT clock_timestamp() AS snapshot"))!.snapshot,
    ).toISOString();
  // Literal substring search: %, _ and backslashes are never wildcards.
  const source = `FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id
    WHERE a.created_at <= $2::timestamptz AND ($1='' OR strpos(lower(concat_ws(' ',a.action,a.target,a.outcome,u.name,a.actor_id,a.id,a.detail::text,a.created_at::text)),lower($1))>0)`;
  const total = Number(
    (await one(tx, `SELECT count(*)::int AS total ${source}`, [d.q, snapshot]))
      ?.total ?? 0,
  );
  const totalPages = Math.max(1, Math.ceil(total / d.pageSize));
  const page = Math.min(d.page, totalPages);
  const cursor = d.cursor ?? null;
  const newer = cursor && d.direction === "newer";
  const rows = (
    await tx.query(
      `SELECT a.*,u.name AS actor,to_char(a.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_at ${source}
     ${cursor ? `AND (a.created_at,a.id) ${newer ? ">" : "<"} ($3::timestamptz,$4::text)` : ""}
     ORDER BY a.created_at ${newer ? "ASC" : "DESC"},a.id ${newer ? "ASC" : "DESC"}
     ${cursor ? "LIMIT $5" : "LIMIT $3 OFFSET $4"}`,
      cursor
        ? [d.q, snapshot, cursor.at, cursor.id, d.pageSize]
        : [d.q, snapshot, d.pageSize, (page - 1) * d.pageSize],
    )
  ).rows;
  if (newer) rows.reverse();
  const encode = (r: any) =>
    r ? JSON.stringify({ at: r.cursor_at, id: r.id }) : null;
  const firstCursor = encode(rows[0]),
    lastCursor = encode(rows[rows.length - 1]);

  return {
    rows,
    page,
    pageSize: d.pageSize,
    total,
    totalPages,
    snapshot,
    firstCursor,
    lastCursor,
  };
}
