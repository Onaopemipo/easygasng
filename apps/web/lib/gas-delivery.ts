import { z } from "zod";
import { bulkReservation } from "./bulk-lpg-reservation";
import { one, type SQL } from "./db";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { propose, audit } from "./governance";
import { locationConfig } from "./gas-delivery-config";
import {
  gasLine,
  grams,
  type GasPolicy,
} from "../../../packages/business-rules/src/gas-pricing";
const verifiedKg = z
  .number()
  .positive()
  .max(1000)
  .refine((n) => {
    try {
      grams(n);
      return true;
    } catch {
      return false;
    }
  }, "Use kilograms with no more than three decimal places.");
export async function gasCatalogue(tx: SQL, branch = "lagos") {
  const price = await one(
    tx,
    "SELECT value,version FROM settings WHERE key='gas.price_per_kg' AND scope=$1",
    [branch],
  );
  const fee = await one(
    tx,
    "SELECT value,version FROM settings WHERE key='delivery.fee' AND scope=$1",
    [branch],
  );
  const policy = await one(
    tx,
    "SELECT value,version FROM settings WHERE key='gas.quantity_policy' AND scope=$1",
    [branch],
  );
  const locations = (
    await tx.query(
      "SELECT l.*,COALESCE((s.value->>'requiresAddressConfirmation')::boolean,true) AS requires_address_confirmation FROM delivery_locations l JOIN branches b ON b.id=l.branch_id LEFT JOIN settings s ON s.key='location.'||l.id AND s.scope=l.branch_id WHERE l.active=true AND l.visible=true AND l.archived=false AND b.active=true ORDER BY l.display_order,l.name",
    )
  ).rows;
  return {
    priceKobo: Number(price?.value),
    priceVersion: price?.version,
    deliveryKobo: Number(fee?.value),
    feeVersion: fee?.version,
    policy: policy?.value as GasPolicy,
    policyVersion: policy?.version,
    locations,
    deliveryOnly: true,
  };
}
export async function gasDeliveryAction(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
): Promise<any> {
  if (action === "delivery.locations.manage") {
    allow(user, ["owner", "manager", "dispatcher", "finance", "administrator"]);
    return (
      await tx.query(
        `SELECT l.*,(SELECT count(*) FROM orders o WHERE o.location_id=l.id) AS order_count,(SELECT count(*) FROM orders o WHERE o.location_id=l.id AND o.status='delivered') AS delivered_count FROM delivery_locations l WHERE ${user.role === "owner" ? "true" : "l.branch_id=$1"} ORDER BY l.display_order,l.name`,
        user.role === "owner" ? [] : [user.branch_id],
      )
    ).rows;
  }
  if (action === "delivery.location.create") {
    const d = z
      .object({ config: locationConfig, reason: z.string().min(5).max(1000) })
      .strict()
      .parse(input);
    allow(user, ["owner", "manager", "dispatcher"], d.config.branchId);
    if (
      !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
        d.config.branchId,
      ]))
    )
      throw new AppError(409, "Choose an active fulfilment branch.");
    const lid = id(),
      key = "location." + lid;
    const config = {
      ...d.config,
      active: false,
      visible: false,
      archived: false,
    };
    await tx.query(
      "INSERT INTO delivery_locations(id,name,branch_id) VALUES ($1,$2,$3)",
      [lid, config.name, config.branchId],
    );
    await tx.query(
      "INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) SELECT $1,$2,'Delivery Locations','Governed delivery coverage','owner',3,'location',propose_roles,approve_roles,view_roles,required_roles,true FROM setting_definitions WHERE key='location.lekki'",
      [key, config.name],
    );
    await tx.query("INSERT INTO settings(key,scope,value) VALUES ($1,$2,$3)", [
      key,
      config.branchId,
      JSON.stringify(config),
    ]);
    const r = await propose(tx, user, {
      key,
      scope: config.branchId,
      value: d.config,
      version: 1,
      reason: d.reason,
    });
    return { id: lid, request: r };
  }
  if (action === "gas.inspections") {
    allow(user, ["owner", "inventory"]);
    return (
      await tx.query(
        `SELECT g.id,g.order_id,g.capacity_grams,g.grams,g.inspected_at,o.reference,o.status,o.branch_id FROM order_gas_lines g JOIN orders o ON o.id=g.order_id WHERE o.status IN ('placed','accepted','preparing') AND ${user.role === "owner" ? "true" : "o.branch_id=$1"} ORDER BY o.created_at`,
        user.role === "owner" ? [] : [user.branch_id],
      )
    ).rows;
  }
  if (action === "gas.stock") {
    allow(user, ["owner", "manager", "inventory", "finance"]);
    return (
      await tx.query(
        `SELECT * FROM gas_stock WHERE ${user.role === "owner" ? "true" : "branch_id=$1"}`,
        user.role === "owner" ? [] : [user.branch_id],
      )
    ).rows;
  }
  if (action === "gas.stock.receive") {
    const d = z
      .object({
        branchId: z.string(),
        grams: z.number().int().positive().max(100000000000),
        reference: z.string().min(5).max(100),
        reason: z.string().min(5).max(1000),
      })
      .strict()
      .parse(input);
    allow(user, ["owner", "inventory"], d.branchId);
    recentVerification(user);
    const branch = await one(
      tx,
      "SELECT id FROM branches WHERE id=$1 AND active=true FOR UPDATE",
      [d.branchId],
    );
    if (!branch) throw new AppError(409, "Branch inactive.");
    const prior = await one(
      tx,
      "SELECT * FROM gas_stock_movements WHERE reference=$1",
      [d.reference],
    );
    if (prior) {
      if (prior.branch_id !== d.branchId || Number(prior.grams) !== d.grams)
        throw new AppError(409, "Receipt reference already used.");
      return { ok: true };
    }
    await tx.query(
      "INSERT INTO gas_stock(branch_id,grams) VALUES ($1,$2) ON CONFLICT(branch_id) DO UPDATE SET grams=gas_stock.grams+excluded.grams",
      [d.branchId, d.grams],
    );
    await tx.query(
      "INSERT INTO gas_stock_movements(id,branch_id,grams,kind,reference,actor_id,reason) VALUES ($1,$2,$3,'received',$4,$5,$6)",
      [id(), d.branchId, d.grams, d.reference, user.id, d.reason],
    );
    await audit(tx, user, "gas.stock_received", d.branchId, "success", d);
    return { ok: true };
  }
  if (action === "delivery.coverage.confirm") {
    const d = z
      .object({
        orderId: z.string().uuid(),
        reason: z.string().trim().min(10).max(1000),
      })
      .strict()
      .parse(input);
    const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
      d.orderId,
    ]);
    if (!o) throw new AppError(404, "Order not found.");
    allow(user, ["owner", "manager", "dispatcher"], o.branch_id);
    if (["cancelled", "delivered"].includes(o.status))
      throw new AppError(409, "This order is closed.");
    const l = await one(tx, "SELECT * FROM delivery_locations WHERE id=$1", [
      o.location_id,
    ]);
    if (!l) throw new AppError(409, "Location record missing.");
    if ((!l.active || l.archived) && user.role !== "owner")
      throw new AppError(
        403,
        "An owner must review fulfilment after a location is withdrawn.",
      );
    await audit(tx, user, "delivery.coverage_confirmed", o.id, "success", {
      reason: d.reason,
      locationId: l.id,
      locationVersion: l.version,
      address: o.address,
    });
    await tx.query("UPDATE orders SET operational_review=NULL WHERE id=$1", [
      o.id,
    ]);
    return { ok: true };
  }
  if (action === "gas.cylinder.intake") {
    const d = z
      .object({
        lineId: z.string().uuid(),
        serial: z.string().trim().min(4).max(80),
        sizeKg: verifiedKg,
        testDue: z.iso.date(),
        reason: z.string().trim().min(10).max(1000),
      })
      .strict()
      .parse(input);
    const line = await one(
      tx,
      "SELECT g.*,o.branch_id,o.customer_id,o.status FROM order_gas_lines g JOIN orders o ON o.id=g.order_id WHERE g.id=$1 FOR UPDATE OF o,g",
      [d.lineId],
    );
    if (!line) throw new AppError(404, "Gas line not found.");
    allow(user, ["owner", "inventory"], line.branch_id);
    recentVerification(user);
    if (
      !["placed", "accepted", "preparing"].includes(line.status) ||
      grams(d.sizeKg) !== Number(line.capacity_grams)
    )
      throw new AppError(
        409,
        "Verify the actual cylinder capacity against the open order.",
      );
    if (await one(tx, "SELECT id FROM cylinders WHERE serial=$1", [d.serial]))
      throw new AppError(
        409,
        "This serial already exists. Use its existing record and verify return custody; do not register it again.",
      );
    const cid = id();
    await tx.query(
      "INSERT INTO cylinders(id,branch_id,serial,size_kg,ownership,status,test_due,customer_id) VALUES ($1,$2,$3,$4,'customer','quarantined',$5,$6)",
      [cid, line.branch_id, d.serial, d.sizeKg, d.testDue, line.customer_id],
    );
    await tx.query(
      "INSERT INTO cylinder_events(id,cylinder_id,actor_id,status,reason) VALUES ($1,$2,$3,'quarantined',$4)",
      [id(), cid, user.id, d.reason],
    );
    await audit(tx, user, "gas.cylinder_intake", cid, "success", {
      orderId: line.order_id,
      reason: d.reason,
    });
    return {
      id: cid,
      message: `Cylinder ${cid} recorded in quarantine. Complete a documented cylinder inspection, then record verified filling eligibility before dispatch.`,
    };
  }
  if (action === "gas.inspection.record") {
    const d = z
      .object({
        lineId: z.string().uuid(),
        cylinderId: z.string().uuid(),
        allowableKg: verifiedKg,
        reason: z.string().min(10).max(1000),
      })
      .strict()
      .parse(input);
    const line = await one(
      tx,
      "SELECT g.*,o.branch_id,o.customer_id,o.status FROM order_gas_lines g JOIN orders o ON o.id=g.order_id WHERE g.id=$1 FOR UPDATE OF g,o",
      [d.lineId],
    );
    if (!line) throw new AppError(404, "Gas line not found.");
    allow(user, ["owner", "inventory"], line.branch_id);
    recentVerification(user);
    if (!["placed", "accepted", "preparing"].includes(line.status))
      throw new AppError(409, "Inspect before dispatch.");
    const c = await one(tx, "SELECT * FROM cylinders WHERE id=$1 FOR UPDATE", [
      d.cylinderId,
    ]);
    const allocated = await one(
      tx,
      "SELECT id FROM cylinder_allocations WHERE cylinder_id=$1 AND order_id=$2 AND state='reserved'",
      [d.cylinderId, line.order_id],
    );
    if (
      !c ||
      c.branch_id !== line.branch_id ||
      c.status !== "empty" ||
      Date.parse(c.test_due) <= Date.now() ||
      grams(Number(c.size_kg)) !== Number(line.capacity_grams) ||
      (c.customer_id !== line.customer_id && !allocated)
    )
      throw new AppError(
        409,
        "Cylinder custody, inspection, ownership or capacity is ineligible.",
      );
    if (
      await one(
        tx,
        "SELECT g.id FROM order_gas_lines g JOIN orders o ON o.id=g.order_id WHERE g.cylinder_id=$1 AND g.id<>$2 AND (o.status NOT IN ('cancelled','delivered','delivery_failed') OR EXISTS(SELECT 1 FROM delivery_attempts a WHERE a.order_id=o.id AND a.picked_up_at IS NOT NULL AND a.state IN ('picked_up','arrived','failed')))",
        [c.id, line.id],
      )
    )
      throw new AppError(
        409,
        "This cylinder is already committed to another live refill.",
      );
    if (
      await one(
        tx,
        "SELECT amendment_id FROM doorstep_execution WHERE cylinder_id=$1 AND state='reserved' UNION ALL SELECT amendment_id FROM doorstep_cylinder_lines WHERE cylinder_id=$1 AND state='reserved' LIMIT 1",
        [c.id],
      )
    )
      throw new AppError(409, "Cylinder is reserved for a doorstep addition.");
    if (
      grams(d.allowableKg) < Number(line.grams) ||
      grams(d.allowableKg) > Number(line.capacity_grams)
    )
      throw new AppError(
        409,
        "Verified allowable fill is insufficient or exceeds capacity.",
      );
    if (!Number.isSafeInteger(grams(d.allowableKg)))
      throw new AppError(
        400,
        "Use whole grams for verified filling allowance.",
      );
    await tx.query(
      "UPDATE order_gas_lines SET cylinder_id=$1,allowable_grams=$2,inspected_by=$3,inspection_note=$4,inspected_at=now() WHERE id=$5",
      [c.id, grams(d.allowableKg), user.id, d.reason, line.id],
    );
    await audit(tx, user, "gas.inspection_recorded", line.id, "success", {
      cylinderId: c.id,
      reason: d.reason,
    });
    return { ok: true };
  }
  if (action === "gas.report") {
    allow(user, ["owner", "finance", "manager"]);
    const d = z
      .object({
        from: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        to: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        locationId: z.string().optional(),
        status: z.string().optional(),
        paymentStatus: z.string().optional(),
        capacityKg: z.number().positive().optional(),
        branchId: z.string().optional(),
        minimumKg: z.number().min(0).optional(),
        maximumKg: z.number().positive().optional(),
        customerCategory: z.enum(["customer", "commercial"]).optional(),
      })
      .strict()
      .parse(input);
    if (d.branchId) allow(user, ["owner", "manager", "finance"], d.branchId);
    const orders = (
      await tx.query(
        `SELECT (SELECT role FROM users WHERE id=o.customer_id) AS customer_category,o.delivered_at,o.id,o.reference,o.customer_id,o.status,o.payment_status,o.delivery_kobo,o.total_kobo,o.created_at,o.location_id,o.location_snapshot,o.branch_id,COALESCE((SELECT sum(v.amount_kobo) FROM verified_payments v WHERE v.order_id=o.id),0) AS verified_kobo,(COALESCE((SELECT jsonb_agg(g) FROM order_gas_lines g WHERE g.order_id=o.id),'[]') || COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.product_id,'grams',i.quantity*i.gas_grams_per_unit,'capacity_grams',i.gas_grams_per_unit,'subtotal_kobo',i.quantity*i.unit_price_kobo,'unit_price_kobo',i.unit_price_kobo*1000.0/i.gas_grams_per_unit,'legacy',true)) FROM order_items i WHERE i.order_id=o.id AND i.gas_grams_per_unit IS NOT NULL),'[]')) AS gas_lines FROM orders o WHERE ($1::text IS NULL OR o.branch_id=$1) AND ($2::text IS NULL OR (o.created_at AT TIME ZONE 'Africa/Lagos')::date>=$2::date) AND ($3::text IS NULL OR (o.created_at AT TIME ZONE 'Africa/Lagos')::date<=$3::date) AND ($4::text IS NULL OR o.location_id=$4) AND ($5::text IS NULL OR o.status=$5) AND ($6::text IS NULL OR o.payment_status=$6) ORDER BY o.created_at DESC`,
        [
          user.role === "owner" ? (d.branchId ?? null) : user.branch_id,
          d.from ?? null,
          d.to ?? null,
          d.locationId ?? null,
          d.status ?? null,
          d.paymentStatus ?? null,
        ],
      )
    ).rows;
    const result = orders.filter((o) => {
      const kg = o.gas_lines.reduce(
        (n: number, g: any) => n + Number(g.grams) / 1000,
        0,
      );
      return (
        (!d.capacityKg ||
          o.gas_lines.some(
            (g: any) => Number(g.capacity_grams) === d.capacityKg! * 1000,
          )) &&
        (d.minimumKg === undefined || kg >= d.minimumKg) &&
        (d.maximumKg === undefined || kg <= d.maximumKg) &&
        (!d.customerCategory || d.customerCategory === o.customer_category)
      );
    });
    const summary = {
      orderedKg: 0,
      reservedKg: 0,
      dispatchedKg: 0,
      deliveredKg: 0,
      refundedKg: 0,
      netSoldKg: 0,
      gasRevenueKobo: 0,
      deliveryRevenueKobo: 0,
      verifiedPaymentsKobo: 0,
      outstandingKobo: 0,
    };
    for (const o of result) {
      const kg = o.gas_lines.reduce(
          (n: number, g: any) => n + Number(g.grams) / 1000,
          0,
        ),
        revenue = o.gas_lines.reduce(
          (n: number, g: any) => n + Number(g.subtotal_kobo),
          0,
        );
      summary.orderedKg += kg;
      if (["placed", "confirmed", "preparing", "assigned"].includes(o.status))
        summary.reservedKg += kg;
      if (o.status === "out_for_delivery") summary.dispatchedKg += kg;
      if (o.status === "delivered") {
        summary.deliveredKg += kg;
        if (o.payment_status === "refunded") summary.refundedKg += kg;
        else {
          summary.netSoldKg += kg;
          summary.gasRevenueKobo += revenue;
          summary.deliveryRevenueKobo += Number(o.delivery_kobo);
        }
      }
      summary.verifiedPaymentsKobo += Number(o.verified_kobo);
      if (o.status !== "cancelled" && o.payment_status !== "refunded")
        summary.outstandingKobo += Math.max(
          0,
          Number(o.total_kobo) - Number(o.verified_kobo),
        );
    }
    await audit(tx, user, "gas.report_viewed", "gas-sales");
    const grouped = (key: (o: any) => string) => {
      const groups: Record<string, any> = {};
      for (const o of result) {
        const k = key(o),
          g = (groups[k] ??= {
            group: k,
            orders: 0,
            delivered: 0,
            gasKg: 0,
            gasRevenueKobo: 0,
            deliveryRevenueKobo: 0,
            customers: new Set<string>(),
            deliveryHours: [],
          });
        g.orders++;
        g.customers.add(o.customer_id);
        if (o.status === "delivered") {
          g.delivered++;
          if (o.payment_status !== "refunded") {
            g.gasKg += o.gas_lines.reduce(
              (n: number, l: any) => n + Number(l.grams) / 1000,
              0,
            );
            g.gasRevenueKobo += o.gas_lines.reduce(
              (n: number, l: any) => n + Number(l.subtotal_kobo),
              0,
            );
            g.deliveryRevenueKobo += Number(o.delivery_kobo);
          }
          if (o.delivered_at)
            g.deliveryHours.push(
              (+new Date(o.delivered_at) - +new Date(o.created_at)) / 3600000,
            );
        }
      }
      return Object.values(groups).map((g: any) => ({
        ...g,
        customers: g.customers.size,
        completionRate: g.orders ? g.delivered / g.orders : null,
        averageDeliveryHours: g.deliveryHours.length
          ? g.deliveryHours.reduce((n: number, h: number) => n + h, 0) /
            g.deliveryHours.length
          : null,
        deliveryHours: undefined,
      }));
    };
    return {
      summary,
      orders: result,
      byLocation: grouped(
        (o) =>
          o.location_snapshot?.name ??
          o.location_id ??
          "Historical location unlinked",
      ),
      byDay: grouped((o) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Africa/Lagos",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(o.created_at)),
      ),
      byCustomer: grouped((o) => o.customer_id),
      byBranch: grouped((o) => o.branch_id),
      profit: "Unavailable without verified cost allocation",
    };
  }
}
export async function gasQuote(
  tx: SQL,
  lines: { capacityKg: number; kg: number }[],
  branch = "lagos",
  items: { productId: string; quantity: number }[] = [],
  locationId?: string,
) {
  const c = await gasCatalogue(tx, branch);
  if (locationId !== undefined) {
    const location = c.locations.find(l => l.id === locationId && l.branch_id === branch);
    if (!location) throw new AppError(400, "Choose an active supported delivery location.");
    if (typeof location.coverage !== "string" || location.coverage.trim().length < 10)
      throw new AppError(409, "Delivery coverage for this area is awaiting confirmation.");
    const delivery = await one(tx, "SELECT value FROM settings WHERE key='delivery.enabled' AND scope=$1", [branch]);
    if (delivery?.value !== true) throw new AppError(409, "Online delivery is not available in this area yet.");
    if (c.feeVersion == null || !Number.isSafeInteger(c.deliveryKobo) || c.deliveryKobo < 0)
      throw new AppError(409, "Delivery pricing is unavailable.");
  }
  let subtotal = 0;
  const calculated = lines.map((l) => {
    try {
      const q = gasLine(l.kg, l.capacityKg, c.priceKobo, c.policy);
      subtotal += q.subtotalKobo;
      return { ...l, ...q };
    } catch (e) {
      throw new AppError(400, (e as Error).message);
    }
  });
  if (!Number.isSafeInteger(subtotal + c.deliveryKobo))
    throw new AppError(400, "Total exceeds supported limits.");
  // Advisory only: checkout still atomically reserves stock under its existing locks.
  if (locationId !== undefined) {
    const requested = calculated.reduce((mass, line) => mass + line.grams, 0);
    if (!(await one(tx, "SELECT branch_id FROM gas_stock WHERE branch_id=$1 AND grams-reserved_grams >= $2", [branch, requested])))
      throw new AppError(409, "Insufficient verified gas stock for this order.");
  }
  let physicalSubtotalKobo = 0;
  const physicalLines = [];
  for (const item of items) {
    const p = await one(
      tx,
      "SELECT p.name,p.category,p.size_kg,p.archived,i.price_kobo,i.published FROM products p JOIN inventory i ON i.product_id=p.id WHERE p.id=$1 AND i.branch_id=$2",
      [item.productId, branch],
    );
    if (
      !p ||
      p.archived ||
      !p.published ||
      !p.price_kobo ||
      p.category === "Gas refills"
    )
      throw new AppError(409, "A physical product is unavailable.");
    physicalSubtotalKobo += Number(p.price_kobo) * item.quantity;
    physicalLines.push({
      productId: item.productId,
      quantity: item.quantity,
      name: p.name,
      category: p.category,
      sizeKg: p.size_kg === null ? null : Number(p.size_kg),
      unitPriceKobo: Number(p.price_kobo),
    });
  }
  if (!Number.isSafeInteger(subtotal + physicalSubtotalKobo + c.deliveryKobo))
    throw new AppError(400, "Quoted total exceeds supported monetary limits.");
  return {
    lines: calculated,
    subtotalKobo: subtotal,
    physicalSubtotalKobo,
    physicalLines,
    ...c,
  };
}
export async function gasReservation(
  tx: SQL,
  user: Actor,
  orderId: string,
  kind: "released" | "fulfilled",
) {
  const o = await one(tx, "SELECT branch_id FROM orders WHERE id=$1", [
    orderId,
  ]);
  const g = await one(
    tx,
    "SELECT COALESCE(sum(grams),0) AS grams FROM order_gas_lines WHERE order_id=$1",
    [orderId],
  );
  const n = Number(g!.grams);
  if (!n) return;
  const prior = await one(
    tx,
    "SELECT id FROM gas_stock_movements WHERE reference=$1",
    [`${orderId}:${kind}`],
  );
  if (prior) return;
  const retainedOnVehicle = await bulkReservation(tx, user, orderId, n, kind);
  const releasedGrams = retainedOnVehicle ? 0 : n;
  const row = await one(
    tx,
    `UPDATE gas_stock SET reserved_grams=reserved_grams-$1${kind === "fulfilled" ? ",grams=grams-$1" : ""} WHERE branch_id=$2 AND reserved_grams>=$1 RETURNING branch_id`,
    [releasedGrams, o!.branch_id],
  );
  if (!row) throw new AppError(409, "Gas reservation cannot be reconciled.");
  await tx.query(
    "INSERT INTO gas_stock_movements(id,branch_id,grams,kind,reference,actor_id,reason) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [
      id(),
      o!.branch_id,
      -releasedGrams,
      kind,
      `${orderId}:${kind}`,
      user.id,
      retainedOnVehicle
        ? "Order reservation transferred to vehicle buffer; physical LPG remains held"
        : `Order gas ${kind}`,
    ],
  );
  if (kind === "fulfilled") {
    const cylinders = (
      await tx.query(
        "UPDATE cylinders c SET status='filled' FROM order_gas_lines g WHERE g.order_id=$1 AND g.cylinder_id=c.id AND c.ownership='customer' AND c.status='empty' RETURNING c.id",
        [orderId],
      )
    ).rows;
    for (const c of cylinders)
      await tx.query(
        "INSERT INTO cylinder_events(id,cylinder_id,actor_id,previous_status,status,reason) VALUES ($1,$2,$3,'empty','filled',$4)",
        [id(), c.id, user.id, "Gas refill fulfilled on order " + orderId],
      );
  }
}
export async function verifyGasDispatch(tx: SQL, orderId: string) {
  const lines = (
    await tx.query(
      "SELECT g.*,c.status,c.test_due,c.branch_id,c.customer_id,c.ownership,o.branch_id AS order_branch,o.customer_id AS order_customer FROM order_gas_lines g JOIN orders o ON o.id=g.order_id LEFT JOIN cylinders c ON c.id=g.cylinder_id WHERE g.order_id=$1 FOR UPDATE OF g",
      [orderId],
    )
  ).rows;
  for (const g of lines) {
    const allocated = await one(
      tx,
      "SELECT id FROM cylinder_allocations WHERE cylinder_id=$1 AND order_id=$2 AND state='reserved'",
      [g.cylinder_id, orderId],
    );
    if (
      !g.inspected_at ||
      g.status !== "empty" ||
      Date.parse(g.test_due) <= Date.now() ||
      g.branch_id !== g.order_branch ||
      (!allocated && g.customer_id !== g.order_customer) ||
      Number(g.allowable_grams) < Number(g.grams)
    )
      throw new AppError(
        409,
        "Verified cylinder inspection and filling eligibility are required before dispatch.",
      );
  }
  if (lines.length) {
    const coverage = await one(
      tx,
      "SELECT l.id,l.version,s.value FROM orders o JOIN delivery_locations l ON l.id=o.location_id JOIN settings s ON s.key='location.'||l.id AND s.scope=l.branch_id WHERE o.id=$1",
      [orderId],
    );
    if (!coverage) throw new AppError(409, "Delivery coverage record missing.");
    if (
      coverage.value.requiresAddressConfirmation !== false &&
      !(await one(
        tx,
        "SELECT a.id FROM audit_events a JOIN users u ON u.id=a.actor_id WHERE a.action='delivery.coverage_confirmed' AND a.target=$1 AND a.detail->>'locationId'=$2 AND a.detail->>'locationVersion'=$3 AND u.active=true AND u.role IN ('owner','manager','dispatcher') AND (u.role='owner' OR u.branch_id=$4)",
        [orderId, coverage.id, String(coverage.version), lines[0].order_branch],
      ))
    )
      throw new AppError(
        409,
        "Record business confirmation of the actual delivery address before dispatch.",
      );
  }
}
