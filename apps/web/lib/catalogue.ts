import { z } from "zod";
import { one, type SQL } from "./db";
import { id, allow, AppError, recentVerification, type Actor } from "./auth";
import { audit, hasQualifiedSafetyReviewer } from "./governance";
export async function catalogueAction(
  tx: SQL,
  action: string,
  user: Actor | null,
  input: unknown,
): Promise<any> {
  if (action === "compatibility" || action === "compatibility.manage") {
    const d = z
      .object({ productId: z.string().min(1).max(100) })
      .strict()
      .parse(input);
    if (action === "compatibility.manage") {
      if (!user) throw new AppError(401, "Please sign in.");
      allow(user, ["owner", "manager", "finance"]);
    }
    return (
      await tx.query(
        "SELECT c.*,u.name AS reviewer FROM product_compatibility c LEFT JOIN users u ON u.id=c.reviewed_by WHERE c.product_id=$1 AND ($2::boolean OR (c.reviewed_by IS NOT NULL AND u.active=true AND u.role IN ('owner') AND (c.status<>'verified_compatible' OR EXISTS(SELECT 1 FROM technician_qualifications q JOIN users v ON v.id=q.verified_by WHERE q.user_id=u.id AND q.code='safety_review' AND q.expires_at>now() AND v.active=true AND v.role='owner' AND v.id<>q.user_id)))) ORDER BY c.created_at DESC",
        [d.productId, action === "compatibility.manage"],
      )
    ).rows.map((c) =>
      action === "compatibility.manage"
        ? c
        : {
            id: c.id,
            equipment_brand: c.equipment_brand,
            equipment_model: c.equipment_model,
            connection_spec: c.connection_spec,
            pressure_spec: c.pressure_spec,
            evidence: c.evidence,
            status: c.status,
            reviewed: true,
          },
    );
  }
  if (!user) return undefined;
  if (action === "compatibility.propose") {
    allow(user, ["owner", "manager"]);
    const d = z
      .object({
        productId: z.string().min(1).max(100),
        equipmentBrand: z.string().trim().min(1).max(100),
        equipmentModel: z.string().trim().min(1).max(100),
        connectionSpec: z.string().trim().min(2).max(500),
        pressureSpec: z.string().trim().min(2).max(500),
        evidence: z.string().trim().min(10).max(2000),
        status: z.enum([
          "unknown",
          "professional_confirmation",
          "verified_compatible",
          "incompatible",
        ]),
      })
      .strict()
      .parse(input);
    const cid = id();
    await tx.query(
      "INSERT INTO product_compatibility(id,product_id,equipment_brand,equipment_model,connection_spec,pressure_spec,evidence,status,proposed_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        cid,
        d.productId,
        d.equipmentBrand,
        d.equipmentModel,
        d.connectionSpec,
        d.pressureSpec,
        d.evidence,
        d.status,
        user.id,
      ],
    );
    await audit(tx, user, "compatibility.proposed", cid);
    return { id: cid };
  }
  if (action === "compatibility.review") {
    allow(user, ["owner"]);
    recentVerification(user);
    const d = z
      .object({ id: z.string().uuid(), approve: z.boolean() })
      .strict()
      .parse(input);
    const c = await one(
      tx,
      "SELECT * FROM product_compatibility WHERE id=$1 FOR UPDATE",
      [d.id],
    );
    if (!c) throw new AppError(404, "Specification record not found.");
    if (c.proposed_by === user.id)
      throw new AppError(403, "Independent specification review is required.");
    if (c.reviewed_by)
      throw new AppError(
        409,
        "Reviewed specifications are immutable; submit a corrected record.",
      );
    if (
      d.approve &&
      c.status === "verified_compatible" &&
      !(await hasQualifiedSafetyReviewer(tx, [user.id]))
    )
      throw new AppError(
        409,
        "Verified compatibility requires a current safety-review qualification and specification evidence.",
      );
    if (!d.approve)
      throw new AppError(
        409,
        "Leave unverified records unpublished; submit a corrected specification for review.",
      );
    await tx.query(
      "UPDATE product_compatibility SET reviewed_by=$1 WHERE id=$2",
      [user.id, c.id],
    );
    await audit(tx, user, "compatibility.reviewed", c.id);
    return { ok: true };
  }
  if (action === "catalogue.manage") {
    allow(user, ["owner", "manager", "finance"]);
    const branch = user.branch_id ?? "lagos";
    return {
      categories: (
        await tx.query("SELECT * FROM product_categories ORDER BY name")
      ).rows,
      products: (
        await tx.query(
          "SELECT p.*,i.quantity,i.reserved,i.price_kobo,i.published FROM products p JOIN inventory i ON i.product_id=p.id WHERE i.branch_id=$1 ORDER BY p.name",
          [branch],
        )
      ).rows,
      images: (
        await tx.query(
          "SELECT id,product_id,alt,position,archived FROM media_assets WHERE product_id IS NOT NULL ORDER BY position,created_at",
        )
      ).rows,
    };
  }
  if (action === "category.save") {
    allow(user, ["owner"]);
    const d = z
      .object({ name: z.string().trim().min(2).max(80), active: z.boolean() })
      .strict()
      .parse(input);
    await tx.query(
      "INSERT INTO product_categories(name,active) VALUES ($1,$2) ON CONFLICT(name) DO UPDATE SET active=$2",
      [d.name, d.active],
    );
    await audit(tx, user, "catalogue.category_saved", d.name);
    return { ok: true };
  }
  if (action === "product.metadata") {
    allow(user, ["owner"]);
    const d = z
      .object({
        id: z.string().min(1).max(100),
        sku: z.string().trim().min(2).max(100),
        parentId: z.string().max(100).nullable(),
        archived: z.boolean(),
        brand: z.string().max(100),
        model: z.string().max(100),
        specifications: z.string().max(2000),
        warranty: z.string().max(2000),
        installationRequired: z.boolean(),
        compatibility: z.enum([
          "unknown",
          "professional_confirmation",
          "verified",
          "incompatible",
        ]),
        compatibilityEvidence: z.string().max(2000),
      })
      .strict()
      .parse(input);
    if (d.parentId) {
      const parent = await one(
        tx,
        "SELECT parent_id FROM products WHERE id=$1 AND archived=false",
        [d.parentId],
      );
      if (!parent || parent.parent_id || d.parentId === d.id)
        throw new AppError(
          400,
          "Choose an active base product as the variant parent.",
        );
    }
    if (d.compatibility === "verified")
      throw new AppError(
        409,
        "Verified compatibility requires independently reviewed specification records; use professional confirmation until that review is recorded.",
      );
    const p = await one(
      tx,
      "UPDATE products SET sku=$1,parent_id=$2,archived=$3,attributes=$4,updated_at=now() WHERE id=$5 RETURNING id",
      [
        d.sku,
        d.parentId,
        d.archived,
        JSON.stringify({
          brand: d.brand,
          model: d.model,
          specifications: d.specifications,
          warranty: d.warranty,
          installationRequired: d.installationRequired,
          compatibility: d.compatibility,
          compatibilityEvidence: d.compatibilityEvidence,
        }),
        d.id,
      ],
    );
    if (!p) throw new AppError(404, "Product not found.");
    await audit(tx, user, "product.metadata_updated", d.id);
    return { ok: true };
  }
  if (action === "media.update") {
    allow(user, ["owner"]);
    const d = z
      .object({
        id: z.string().uuid(),
        position: z.number().int().min(0).max(100),
        archived: z.boolean(),
        alt: z.string().min(3).max(250),
      })
      .strict()
      .parse(input);
    const m = await one(tx, "SELECT product_id FROM media_assets WHERE id=$1", [
      d.id,
    ]);
    if (!m?.product_id)
      throw new AppError(
        403,
        "Only product images may be reordered or archived here.",
      );
    await tx.query(
      "UPDATE media_assets SET position=$1,archived=$2,alt=$3 WHERE id=$4",
      [d.position, d.archived, d.alt, d.id],
    );
    await audit(tx, user, "catalogue.media_updated", d.id);
    return { ok: true };
  }
  if (action === "recommendations") {
    allow(user, ["customer", "commercial"]);
    const d = z
      .object({
        productId: z.string().max(100).optional(),
        zone: z.string().max(100).optional(),
      })
      .strict()
      .parse(input);
    const rows = (
      await tx.query(
        "SELECT r.id,r.relation,r.evidence,p.name AS product,s.id AS service_id,s.name AS service,s.config FROM recommendation_rules r JOIN users reviewer ON reviewer.id=r.reviewed_by JOIN products p ON p.id=r.product_id JOIN inventory i ON i.product_id=p.id AND i.branch_id=r.branch_id JOIN service_catalogue s ON s.id=r.service_id AND s.branch_id=r.branch_id WHERE r.active=true AND reviewer.active=true AND reviewer.role IN ('owner') AND p.archived=false AND i.published=true AND i.price_kobo>0 AND i.quantity-i.reserved>0 AND (s.config->>'active')::boolean=true AND r.relation IN ('assessment','unknown') AND (($1::text IS NOT NULL AND p.id=$1) OR ($1::text IS NULL AND EXISTS(SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id=o.id WHERE o.customer_id=$2 AND oi.product_id=p.id AND o.status='delivered' AND o.payment_status='verified'))) ORDER BY r.id LIMIT 12",
        [d.productId ?? null, user.id],
      )
    ).rows;
    return rows
      .filter(
        (r) =>
          !d.zone ||
          r.config.zones.some(
            (x: string) => x.toLowerCase() === d.zone!.toLowerCase(),
          ),
      )
      .map((r) => ({
        ...r,
        message:
          "Professional assessment is available for this equipment. Compatibility and required work must be confirmed by qualified personnel.",
      }));
  }
  if (action === "recommendation.event") {
    const d = z
      .object({
        ruleId: z.string().uuid(),
        kind: z.enum(["displayed", "selected"]),
      })
      .strict()
      .parse(input);
    allow(user, ["customer", "commercial"]);
    const r = await one(
      tx,
      "SELECT id FROM recommendation_rules WHERE id=$1 AND active=true",
      [d.ruleId],
    );
    if (!r) throw new AppError(404, "Recommendation is unavailable.");
    const key =
      d.ruleId +
      ":" +
      user.id +
      ":" +
      d.kind +
      ":" +
      new Date().toISOString().slice(0, 13);
    await tx.query(
      "INSERT INTO recommendation_events(id,rule_id,customer_id,kind,dedupe_key) VALUES ($1,$2,$3,$4,$5) ON CONFLICT(dedupe_key) DO NOTHING",
      [id(), r.id, user.id, d.kind, key],
    );
    return { ok: true };
  }
  if (action === "recommendations.manage") {
    allow(user, ["owner", "manager"]);
    return (
      await tx.query(
        `SELECT r.*,(SELECT count(*) FROM recommendation_events e WHERE e.rule_id=r.id AND kind='displayed') AS displayed,(SELECT count(*) FROM recommendation_events e WHERE e.rule_id=r.id AND kind='selected') AS selected,(SELECT count(*) FROM recommendation_events e WHERE e.rule_id=r.id AND kind='booked') AS booked,(SELECT count(*) FROM recommendation_events e WHERE e.rule_id=r.id AND kind='completed') AS completed,p.name AS product,s.name AS service FROM recommendation_rules r LEFT JOIN products p ON p.id=r.product_id JOIN service_catalogue s ON s.id=r.service_id AND s.branch_id=r.branch_id WHERE ${user.role === "owner" ? "true" : "r.branch_id=$1"} ORDER BY r.id`,
        user.role === "owner" ? [] : [user.branch_id],
      )
    ).rows;
  }
  if (action === "recommendation.propose") {
    const d = z
      .object({
        branchId: z.string().min(1).max(100),
        productId: z.string().max(100),
        serviceId: z.string().max(100),
        relation: z.enum(["assessment", "unknown", "incompatible"]),
        evidence: z.string().min(10).max(2000),
      })
      .strict()
      .parse(input);
    allow(user, ["owner", "manager"], d.branchId);
    const rid = id();
    await tx.query(
      "INSERT INTO recommendation_rules(id,branch_id,product_id,service_id,relation,evidence,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [
        rid,
        d.branchId,
        d.productId,
        d.serviceId,
        d.relation,
        d.evidence,
        user.id,
      ],
    );
    await audit(tx, user, "recommendation.proposed", rid);
    return { id: rid };
  }
  if (action === "recommendation.approve") {
    const d = z
      .object({ id: z.string().uuid(), active: z.boolean() })
      .strict()
      .parse(input);
    const r = await one(
      tx,
      "SELECT * FROM recommendation_rules WHERE id=$1 FOR UPDATE",
      [d.id],
    );
    if (!r) throw new AppError(404, "Rule not found.");
    allow(user, ["owner"], r.branch_id);
    recentVerification(user);
    if (r.created_by === user.id)
      throw new AppError(
        403,
        "Recommendation rules require independent review.",
      );
    await tx.query(
      "UPDATE recommendation_rules SET active=$1,reviewed_by=$2 WHERE id=$3",
      [d.active, user.id, r.id],
    );
    await audit(tx, user, "recommendation.reviewed", r.id);
    return { ok: true };
  }
  return undefined;
}
