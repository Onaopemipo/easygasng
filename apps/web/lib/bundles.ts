import { z } from "zod";
import { one, type SQL } from "./db";
import { allow, AppError, id, type Actor } from "./auth";
import { audit, propose } from "./governance";
export const bundleConfig = z
  .object({
    active: z.boolean(),
    products: z
      .array(
        z
          .object({
            productId: z.string().min(1).max(100),
            quantity: z.number().int().min(1).max(20),
          })
          .strict(),
      )
      .min(1)
      .max(10),
    serviceId: z.string().min(1).max(100),
    serviceDiscountPercent: z.number().int().min(0).max(30),
    description: z.string().trim().min(10).max(1000),
  })
  .strict()
  .refine(
    (v) =>
      new Set(v.products.map((p) => p.productId)).size === v.products.length,
    "Each product may appear once.",
  );
export async function pricedBundle(tx: SQL, bid: string) {
  const b = await one(
    tx,
    "SELECT * FROM service_bundles WHERE id=$1 FOR UPDATE",
    [bid],
  );
  if (!b || !b.config.active)
    throw new AppError(409, "This bundle is unavailable.");
  const c = bundleConfig.parse(b.config);
  const s = await one(
    tx,
    "SELECT s.* FROM service_catalogue s JOIN branches b ON b.id=s.branch_id WHERE s.id=$1 AND s.branch_id=$2 AND b.active=true",
    [c.serviceId, b.branch_id],
  );
  if (
    !s?.config.active ||
    s.config.pricingModel !== "fixed" ||
    s.config.priceKobo === null
  )
    throw new AppError(
      409,
      "Bundle service must have active, approved fixed pricing.",
    );
  const products = [];
  let productTotalKobo = 0;
  for (const p of c.products) {
    const row = await one(
      tx,
      "SELECT p.name,i.price_kobo,i.quantity-i.reserved AS available FROM products p JOIN product_categories c ON c.name=p.category JOIN inventory i ON i.product_id=p.id AND i.branch_id=$2 WHERE p.id=$1 AND p.archived=false AND c.active=true AND i.published=true AND i.price_kobo>0",
      [p.productId, b.branch_id],
    );
    if (!row || Number(row.available) < p.quantity)
      throw new AppError(409, "A bundle product is unavailable.");
    products.push({
      ...p,
      name: row.name,
      unitPriceKobo: Number(row.price_kobo),
    });
    productTotalKobo += Number(row.price_kobo) * p.quantity;
  }
  const discountKobo = Math.floor(
      (Number(s.config.priceKobo) * c.serviceDiscountPercent) / 100,
    ),
    servicePriceKobo = Number(s.config.priceKobo) - discountKobo;
  return {
    ...b,
    id: b.id,
    branch_id: b.branch_id,
    name: b.name,
    version: b.version,
    config: c,
    products,
    productTotalKobo,
    servicePriceKobo,
    discountKobo,
    calloutKobo: Number(s.config.calloutKobo),
    totalKobo:
      productTotalKobo + servicePriceKobo + Number(s.config.calloutKobo),
    serviceVersion: s.version,
    serviceName: s.name,
  };
}
export async function bundleAction(
  tx: SQL,
  action: string,
  user: Actor | null,
  input: unknown,
): Promise<any> {
  if (action === "bundles") {
    const rows = (
      await tx.query(
        "SELECT id FROM service_bundles WHERE (config->>'active')::boolean=true ORDER BY name LIMIT 30",
      )
    ).rows;
    const result = [];
    for (const r of rows) {
      try {
        result.push(await pricedBundle(tx, r.id));
      } catch (e) {
        if (!(e instanceof AppError)) throw e;
      }
    }
    return result;
  }
  if (!user) return undefined;
  if (action === "bundles.manage") {
    allow(user, ["owner", "manager"]);
    return (
      await tx.query(
        `SELECT * FROM service_bundles WHERE ${user.role === "owner" ? "true" : "branch_id=$1"} ORDER BY name`,
        user.role === "owner" ? [] : [user.branch_id],
      )
    ).rows;
  }
  if (action === "bundle.create") {
    const d = z
      .object({
        name: z.string().trim().min(3).max(100),
        branchId: z.string().min(1).max(100),
      })
      .strict()
      .parse(input);
    allow(user, ["owner"], d.branchId);
    const bid = id();
    await tx.query(
      "INSERT INTO service_bundles(id,branch_id,name) VALUES ($1,$2,$3)",
      [bid, d.branchId, d.name],
    );
    await tx.query(
      "INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) VALUES ($1,$2,'Product & Service Bundles','Item quantities and service-only discount require independent owner approval.','owner',3,'bundle','[\"owner\",\"manager\"]','[\"owner\"]','[\"owner\",\"manager\"]','[]',true)",
      ["bundle." + bid, d.name],
    );
    await tx.query(
      "INSERT INTO settings(key,scope,value) SELECT $1,$2,config FROM service_bundles WHERE id=$3",
      ["bundle." + bid, d.branchId, bid],
    );
    await audit(tx, user, "bundle.draft_created", bid);
    return { id: bid };
  }
  if (action === "bundle.propose") {
    const d = z
      .object({
        id: z.string().uuid(),
        version: z.number().int().positive(),
        config: bundleConfig,
        reason: z.string().trim().min(5).max(1000),
      })
      .strict()
      .parse(input);
    const b = await one(tx, "SELECT * FROM service_bundles WHERE id=$1", [
      d.id,
    ]);
    if (!b) throw new AppError(404, "Bundle not found.");
    allow(user, ["owner", "manager"], b.branch_id);
    return propose(tx, user, {
      key: "bundle." + b.id,
      scope: b.branch_id,
      version: d.version,
      value: d.config,
      reason: d.reason,
    });
  }
  return undefined;
}
