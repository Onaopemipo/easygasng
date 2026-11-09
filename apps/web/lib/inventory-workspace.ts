import { z } from "zod";
import { one, type SQL } from "./db";
import { AppError, allow, type Actor } from "./auth";
import { navigationAccess } from "./navigation";
import { inventoryValuation } from "./inventory-valuation";
import { audit } from "./governance";
const inputSchema = z
  .object({
    branchId: z.string().min(1).max(100).optional(),
    q: z.string().trim().max(100).default(""),
    category: z
      .enum(["all", "gas", "cylinders", "accessories", "other"])
      .default("all"),
    status: z
      .enum(["all", "healthy", "low", "out", "held", "reserved", "shortage"])
      .default("all"),
    sort: z
      .enum(["name", "available", "available_desc", "branch"])
      .default("name"),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    kind: z.string().max(80).optional(),
  })
  .strict();
// Derived only: holds have already been removed from eligible quantities by the canonical mutation engine.
const base = `WITH held AS (SELECT branch_id,product_id,gas,sum(quantity-released) AS held FROM stock_holds WHERE quantity>released GROUP BY branch_id,product_id,gas), stock AS (
SELECT i.branch_id,b.name AS branch,p.id AS product_id,p.name,p.sku,p.asset,p.size_kg,p.category,i.quantity::bigint AS eligible,i.reserved::bigint,i.quantity-i.reserved AS available,COALESCE(h.held,0)::bigint AS held,i.threshold::bigint,'units' AS unit,
CASE WHEN p.asset='cylinder' THEN 'cylinders' WHEN p.category ILIKE '%accessor%' OR p.category ILIKE 'Gas %' THEN 'accessories' ELSE 'other' END AS family
FROM inventory i JOIN products p ON p.id=i.product_id JOIN branches b ON b.id=i.branch_id LEFT JOIN held h ON h.branch_id=i.branch_id AND h.product_id=p.id AND h.gas=false WHERE p.archived=false AND p.category<>'Gas refills' AND ($1::text IS NULL OR i.branch_id=$1)
UNION ALL SELECT g.branch_id,b.name,NULL,'Cooking Gas (kg)','GAS-KG','gas',NULL,'Gas',g.grams,g.reserved_grams,g.grams-g.reserved_grams,COALESCE(h.held,0)::bigint,g.threshold_grams,'grams','gas' FROM gas_stock g JOIN branches b ON b.id=g.branch_id LEFT JOIN held h ON h.branch_id=g.branch_id AND h.gas=true WHERE ($1::text IS NULL OR g.branch_id=$1)) `;
const where = `WHERE ($2='%%' OR name ILIKE $2 ESCAPE '\\' OR sku ILIKE $2 ESCAPE '\\' OR branch ILIKE $2 ESCAPE '\\') AND ($3='all' OR family=$3) AND ($4='all' OR ($4='shortage' AND threshold IS NOT NULL AND available<=threshold) OR ($4='out' AND available=0) OR ($4='low' AND available>0 AND threshold IS NOT NULL AND available<=threshold) OR ($4='healthy' AND threshold IS NOT NULL AND available>threshold) OR ($4='held' AND held>0) OR ($4='reserved' AND reserved>0))`;
const ordering = {
  name: "name,branch_id,sku",
  available: "available,name,branch_id",
  available_desc: "available DESC,name,branch_id",
  branch: "branch,name,sku",
};
const literal = (s: string) => "%" + s.replace(/[\\%_]/g, "\\$&") + "%";
export async function inventoryWorkspace(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  const d = inputSchema.parse(input),
    access = await navigationAccess(tx, user);
  if (!access.allowed.includes("inventory"))
    throw new AppError(403, "Inventory access is not authorised.");
  if (user.role !== "owner" && d.branchId && d.branchId !== user.branch_id)
    throw new AppError(403, "Inventory belongs to another branch.");
  const branch = user.role === "owner" ? (d.branchId ?? null) : user.branch_id;
  if (
    branch &&
    !(await one(tx, "SELECT id FROM branches WHERE id=$1", [branch]))
  )
    throw new AppError(404, "Branch not found.");
  if (
    d.from &&
    d.to &&
    (d.from > d.to || (Date.parse(d.to) - Date.parse(d.from)) / 86400000 > 366)
  )
    throw new AppError(400, "Use an ordered date range of at most 367 days.");
  const params = [branch, literal(d.q), d.category, d.status];
  const canWrite = ["owner", "manager", "inventory"].includes(user.role),
    canExport = ["owner", "manager", "inventory", "finance"].includes(
      user.role,
    );
  if (action === "inventory.movements") {
    allow(user, [
      "owner",
      "manager",
      "inventory",
      "finance",
      "dispatcher",
      "administrator",
    ]);
    const union = `WITH movements AS (SELECT m.id,m.branch_id,p.name,p.sku,m.quantity::numeric AS quantity,'units' AS unit,m.kind,m.reason,m.reference,m.actor_id,m.created_at FROM stock_movements m JOIN products p ON p.id=m.product_id UNION ALL SELECT m.id,m.branch_id,'Bulk gas','GAS-KG',m.grams::numeric/1000,'kg',m.kind,m.reason,m.reference,m.actor_id,m.created_at FROM gas_stock_movements m), matches AS (SELECT m.*,u.name AS actor FROM movements m LEFT JOIN users u ON u.id=m.actor_id WHERE ($1::text IS NULL OR m.branch_id=$1) AND ($2='%%' OR m.name ILIKE $2 ESCAPE '\\' OR m.sku ILIKE $2 ESCAPE '\\' OR m.reference ILIKE $2 ESCAPE '\\') AND ($3::date IS NULL OR (m.created_at AT TIME ZONE 'Africa/Lagos')::date>=$3) AND ($4::date IS NULL OR (m.created_at AT TIME ZONE 'Africa/Lagos')::date<=$4) AND ($5::text IS NULL OR m.kind=$5)) `;
    const p = [
      branch,
      literal(d.q),
      d.from ?? null,
      d.to ?? null,
      d.kind || null,
    ];
    return {
      rows: (
        await tx.query(
          union +
            "SELECT * FROM matches ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET $6",
          [...p, (d.page - 1) * 20],
        )
      ).rows,
      total: Number(
        (await one(
          tx,
          union + "SELECT count(*)::int AS count FROM matches",
          p,
        ))!.count,
      ),
      page: d.page,
      generatedAt: new Date().toISOString(),
    };
  }
  if (action === "inventory.export") {
    if (!canExport)
      throw new AppError(403, "Inventory export is not authorised.");
    const rows = (
      await tx.query(
        base +
          "SELECT branch,name,sku,category,unit,eligible+held AS on_hand,reserved,available,held,threshold FROM stock " +
          where +
          " ORDER BY " +
          ordering[d.sort] +
          " LIMIT 5001",
        params,
      )
    ).rows;
    if (rows.length > 5000)
      throw new AppError(
        413,
        "Narrow the filters to at most 5000 stock records. No partial export was generated.",
      );
    const clean = (v: unknown) => {
      let s = v === null || v === undefined ? "Unavailable" : String(v);
      if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const normalized = rows.map((r) =>
      Object.fromEntries(
        Object.entries(r).map(([k, v]) => [
          k,
          ["on_hand", "reserved", "available", "held", "threshold"].includes(
            k,
          ) &&
          v !== null &&
          r.unit === "grams"
            ? Number(v) / 1000
            : k === "unit" && v === "grams"
              ? "kg"
              : v,
        ]),
      ),
    );
    const cols = [
      "branch",
      "name",
      "sku",
      "category",
      "unit",
      "on_hand",
      "reserved",
      "available",
      "held",
      "threshold",
    ];
    await audit(tx, user, "inventory.export", branch ?? "business", "success", {
      filters: d,
      rows: rows.length,
    });
    return {
      csv:
        "\uFEFF" +
        [
          cols.map(clean).join(","),
          ...normalized.map((r) => cols.map((k) => clean(r[k])).join(",")),
        ].join("\r\n"),
      count: rows.length,
    };
  }
  const rows = (
    await tx.query(
      base +
        "SELECT *,eligible+held AS on_hand FROM stock " +
        where +
        " ORDER BY " +
        ordering[d.sort] +
        " LIMIT 20 OFFSET $5",
      [...params, (d.page - 1) * 20],
    )
  ).rows;
  const total = Number(
    (await one(
      tx,
      base + "SELECT count(*)::int count FROM stock " + where,
      params,
    ))!.count,
  );
  const summary = (await one(
    tx,
    base +
      `SELECT COALESCE(sum(eligible+held) FILTER(WHERE unit='units'),0) AS physical,COALESCE(sum(reserved) FILTER(WHERE unit='units'),0) AS reserved,COALESCE(sum(held) FILTER(WHERE unit='units'),0) AS held,COALESCE(sum(available) FILTER(WHERE unit='grams'),0) AS gas_available,COALESCE(sum(held) FILTER(WHERE unit='grams'),0) AS gas_held,count(*) FILTER(WHERE threshold IS NOT NULL AND available<=threshold)::int AS alerts,count(*) FILTER(WHERE threshold IS NOT NULL AND available>0 AND available<=threshold)::int AS low,count(*) FILTER(WHERE available=0)::int AS out,count(*) FILTER(WHERE unit='units')::int AS stock_records,count(DISTINCT product_id)::int AS skus FROM stock`,
    [branch],
  ))!;
  const gas = (
    await tx.query(
      base +
        "SELECT *,eligible+held AS on_hand FROM stock WHERE family='gas' ORDER BY branch",
      [branch],
    )
  ).rows;
  const categories = (
    await tx.query(
      base +
        "SELECT family,count(*)::int count FROM stock GROUP BY family ORDER BY family",
      [branch],
    )
  ).rows;
  const pending = Number(
    (await one(
      tx,
      "SELECT count(*)::int count FROM inventory_operations o JOIN change_requests r ON r.id=o.request_id WHERE ($1::text IS NULL OR o.branch_id=$1) AND o.applied_at IS NULL AND r.status IN ('pending_approval','partially_approved') AND r.expires_at>now()",
      [branch],
    ))!.count,
  );
  const recent =
    user.role === "sales"
      ? []
      : (
          await tx.query(
            "SELECT id,kind,quantity::numeric AS quantity,'units' AS unit,reference,created_at FROM stock_movements WHERE ($1::text IS NULL OR branch_id=$1) UNION ALL SELECT id,kind,grams::numeric/1000,'kg',reference,created_at FROM gas_stock_movements WHERE ($1::text IS NULL OR branch_id=$1) ORDER BY created_at DESC LIMIT 5",
            [branch],
          )
        ).rows;
  let valuation: any = {
    totalKobo: null,
    reason:
      "Acquisition costs and independently approved valuation policy are required.",
    categories: [],
  };
  if (["owner", "finance"].includes(user.role)) {
    const policies = (
      await tx.query(
        "SELECT value FROM settings WHERE key='inventory.valuation' AND ($1::text IS NULL OR scope=$1)",
        [branch],
      )
    ).rows;
    if (
      policies.length &&
      policies.every((p) => p.value === "weighted_average")
    ) {
      const v = await inventoryValuation(tx, branch);
      valuation = {
        totalKobo: v.totalKobo,
        reason:
          v.totalKobo === null
            ? "Opening balances or movements have incomplete acquisition costs."
            : "Approved moving weighted average; eligible stock only, held costs excluded.",
        categories: [],
      };
      if (v.totalKobo !== null) {
        const groups: Record<string, number> = {};
        const productCategories = (
          await tx.query(
            "SELECT id,category FROM products WHERE archived=false",
          )
        ).rows;
        const categoryOf = new Map(
          productCategories.map((p) => [p.id, p.category]),
        );
        for (const r of v.rows as any[]) {
          const label =
            r.unit === "grams"
              ? "Gas"
              : (categoryOf.get(r.product_id) ?? "Other physical goods");
          groups[label] = (groups[label] ?? 0) + (r.value_kobo ?? 0);
        }
        valuation.categories = Object.entries(groups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, value]) => ({
            name,
            value,
          }));
      }
    }
  } else
    valuation.reason =
      "Acquisition costs are restricted to authorised finance roles.";
  return {
    rows,
    total,
    page: d.page,
    summary,
    gas,
    categories,
    pending,
    recent,
    valuation,
    scope: branch ?? "All authorised branches",
    branches: (
      await tx.query(
        "SELECT id,name,active FROM branches WHERE ($1::text IS NULL OR id=$1) ORDER BY name LIMIT 200",
        [user.role === "owner" ? null : branch],
      )
    ).rows,
    permissions: {
      write: canWrite,
      export: canExport,
      history: user.role !== "sales",
      cylinders: access.allowed.includes("cylinders"),
      products: access.allowed.includes("products"),
      services: access.allowed.includes("bookings"),
      approvals: access.allowed.includes("approvals"),
    },
    generatedAt: new Date().toISOString(),
  };
}
