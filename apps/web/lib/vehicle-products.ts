import { z } from "zod";
import { one, type SQL, type Row } from "./db";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { audit, propose } from "./governance";
import { inventoryQualification } from "./inventory-business";
import { manifestReturn } from "./vehicle-manifest-schema";
const uid = z.string().uuid(),
  why = z.string().trim().min(10).max(1000);
export async function productCustodyEvent(
  tx: SQL,
  user: Actor,
  loadId: string,
  kind: string,
  detail: unknown,
  orderId?: string,
) {
  await tx.query(
    "INSERT INTO vehicle_product_events(id,load_id,order_id,kind,actor_id,detail) VALUES($1,$2,$3,$4,$5,$6)",
    [id(), loadId, orderId ?? null, kind, user.id, JSON.stringify(detail)],
  );
  await audit(tx, user, kind, loadId);
}
async function checkedSerials(
  tx: SQL,
  branch: string,
  serials: string[],
  size: number,
) {
  for (const serial of [...serials].sort()) {
    const c = await one(tx, "SELECT * FROM cylinders WHERE id=$1 FOR UPDATE", [
      serial,
    ]);
    if (
      !c ||
      c.branch_id !== branch ||
      c.ownership !== "company" ||
      c.customer_id ||
      c.status !== "empty" ||
      Date.parse(c.test_due) <= Date.now() ||
      Number(c.size_kg) !== size
    )
      throw new AppError(
        409,
        "Every saleable serial needs current company custody, matching capacity and safe empty-cylinder inspection.",
      );
  }
}
export async function vehicleProducts(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
): Promise<any> {
  if (action === "manifest.summary") {
    allow(user, [
      "owner",
      "manager",
      "dispatcher",
      "inventory",
      "finance",
      "driver",
    ]);
    const loads = (
      await tx.query(
        "SELECT l.*,p.name,t.driver_id,v.label,u.active AS driver_active FROM vehicle_product_loads l JOIN products p ON p.id=l.product_id JOIN driver_trips t ON t.id=l.trip_id JOIN users u ON u.id=t.driver_id JOIN driver_vehicles v ON v.id=t.vehicle_id WHERE ($1::boolean OR l.branch_id=$2) AND ($3::boolean OR t.driver_id=$4) ORDER BY l.created_at DESC LIMIT 100",
        [
          user.role === "owner",
          user.branch_id,
          user.role !== "driver",
          user.id,
        ],
      )
    ).rows;
    for (const l of loads) {
      l.serials = (
        await tx.query(
          "SELECT s.*,c.serial FROM vehicle_product_serials s JOIN cylinders c ON c.id=s.cylinder_id WHERE s.load_id=$1 ORDER BY c.serial",
          [l.id],
        )
      ).rows;
      l.events = (
        await tx.query(
          "SELECT kind,detail,created_at FROM vehicle_product_events WHERE load_id=$1 ORDER BY created_at,id",
          [l.id],
        )
      ).rows;
    }
    return {
      loads,
      products:
        user.role === "driver"
          ? []
          : (
              await tx.query(
                "SELECT p.id,p.name,i.branch_id,i.quantity-i.reserved AS available FROM products p JOIN inventory i ON i.product_id=p.id WHERE p.archived=false AND i.published=true AND p.category<>'Gas refills' AND ($1::boolean OR i.branch_id=$2) ORDER BY p.name,i.branch_id LIMIT 1000",
                [user.role === "owner", user.branch_id],
              )
            ).rows,
      trips: (
        await tx.query(
          "SELECT t.id,t.vehicle_id,t.driver_id,t.branch_id,v.label,v.physical_capacity_grams FROM driver_trips t JOIN driver_vehicles v ON v.id=t.vehicle_id WHERE t.ended_at IS NULL AND v.active=true AND ($1::boolean OR t.branch_id=$2) AND ($3::boolean OR t.driver_id=$4)",
          [
            user.role === "owner",
            user.branch_id,
            user.role !== "driver",
            user.id,
          ],
        )
      ).rows,
    };
  }
  if (
    process.env.EASYGAS_DOORSTEP_ENABLED !== "true" ||
    (process.env.NODE_ENV === "production" &&
      process.env.EASYGAS_FIELD_OPERATIONS_ENABLED !== "true")
  )
    throw new AppError(
      503,
      "Vehicle product operations require operational release approval.",
    );
  if (action === "manifest.issue") {
    allow(user, ["owner", "inventory"]);
    recentVerification(user);
    const d = z
      .object({
        tripId: uid,
        productId: z.string().min(1).max(100),
        quantity: z.number().int().positive().max(10000),
        unitWeightGrams: z.number().int().positive().max(1000000),
        serialIds: z.array(uid).max(10000).default([]),
        evidence: why,
        reason: why,
      })
      .strict()
      .parse(input);
    const t = await one(
      tx,
      "SELECT t.*,v.active,v.physical_capacity_grams FROM driver_trips t JOIN driver_vehicles v ON v.id=t.vehicle_id WHERE t.id=$1 FOR UPDATE OF t,v",
      [d.tripId],
    );
    if (!t || t.ended_at || !t.active)
      throw new AppError(409, "Active vehicle trip required.");
    allow(user, ["owner", "inventory"], t.branch_id);
    await inventoryQualification(tx, user.id, t.branch_id, "inventory_safety");
    const product = await one(
      tx,
      "SELECT p.*,i.published FROM products p JOIN inventory i ON i.product_id=p.id AND i.branch_id=$2 WHERE p.id=$1",
      [d.productId, t.branch_id],
    );
    if (
      !product ||
      product.archived ||
      !product.published ||
      product.category === "Gas refills"
    )
      throw new AppError(409, "Choose an active published physical product.");
    const serialized = product.category === "Empty cylinders";
    if (
      serialized
        ? d.serialIds.length !== d.quantity ||
          new Set(d.serialIds).size !== d.quantity
        : d.serialIds.length > 0
    )
      throw new AppError(
        409,
        "Provide exact distinct cylinder serial IDs only for serialized cylinder stock.",
      );
    const held = Number(
      (await one(
        tx,
        "SELECT COALESCE(sum((available+reserved)*unit_weight_grams),0) n FROM vehicle_product_loads WHERE trip_id=$1 AND state<>'reconciled'",
        [t.id],
      ))!.n,
    );
    if (
      !t.physical_capacity_grams ||
      held + d.quantity * d.unitWeightGrams > Number(t.physical_capacity_grams)
    )
      throw new AppError(
        409,
        "Configure an actual physical payload capacity and keep measured stock within it.",
      );
    const stock = await one(
      tx,
      "UPDATE inventory SET reserved=reserved+$1 WHERE branch_id=$2 AND product_id=$3 AND quantity-reserved>=$1 RETURNING product_id",
      [d.quantity, t.branch_id, d.productId],
    );
    if (!stock)
      throw new AppError(
        409,
        "Insufficient unreserved canonical branch stock.",
      );
    if (serialized) {
      await checkedSerials(
        tx,
        t.branch_id,
        d.serialIds,
        Number(product.size_kg),
      );
      if (
        await one(
          tx,
          "SELECT id FROM cylinder_allocations WHERE cylinder_id=ANY($1::text[]) AND state IN ('reserved','issued') UNION ALL SELECT id FROM vehicle_product_serials WHERE cylinder_id=ANY($1::text[]) AND state IN ('loaded','reserved')",
          [d.serialIds],
        )
      )
        throw new AppError(
          409,
          "A serial is already in sale or vehicle custody.",
        );
    }
    const loadId = id();
    await tx.query(
      "INSERT INTO vehicle_product_loads(id,trip_id,branch_id,product_id,quantity,unit_weight_grams,available,issued_by,evidence,serialized) VALUES($1,$2,$3,$4,$5,$6,$5,$7,$8,$9)",
      [
        loadId,
        t.id,
        t.branch_id,
        d.productId,
        d.quantity,
        d.unitWeightGrams,
        user.id,
        d.evidence,
        serialized,
      ],
    );
    for (const cylinder of d.serialIds)
      await tx.query(
        "INSERT INTO vehicle_product_serials(id,load_id,cylinder_id) VALUES($1,$2,$3)",
        [id(), loadId, cylinder],
      );
    await tx.query(
      "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reason,actor_id,reference) VALUES($1,$2,$3,$4,'reserved',$5,$6,$7)",
      [
        id(),
        t.branch_id,
        d.productId,
        -d.quantity,
        d.reason,
        user.id,
        `manifest:${loadId}:reserved`,
      ],
    );
    await productCustodyEvent(tx, user, loadId, "manifest.issued", d);
    return { id: loadId, version: 1 };
  }
  const raw = input as any;
  const d = z
    .object({
      manifestId: uid,
      version: z.number().int().positive(),
      quantity: z.number().int().nonnegative().max(10000).optional(),
      serialIds: z.array(uid).max(10000).optional(),
      foundQuantity: z.number().int().nonnegative().max(10000).optional(),
      saleableQuantity: z.number().int().nonnegative().max(10000).optional(),
      foundSerialIds: z.array(uid).max(10000).optional(),
      saleableSerialIds: z.array(uid).max(10000).optional(),
      evidence: why,
      reason: why,
    })
    .strict()
    .parse(raw);
  const l = await one(
    tx,
    "SELECT l.*,t.driver_id,t.ended_at,p.size_kg,u.active AS driver_active FROM vehicle_product_loads l JOIN driver_trips t ON t.id=l.trip_id JOIN users u ON u.id=t.driver_id JOIN products p ON p.id=l.product_id WHERE l.id=$1 FOR UPDATE OF l,t,u",
    [d.manifestId],
  );
  if (!l) throw new AppError(404, "Manifest not found.");
  allow(user, ["owner", "inventory", "driver"], l.branch_id);
  if (user.role === "driver" && l.driver_id !== user.id)
    throw new AppError(404, "Manifest not found.");
  if (Number(l.version) !== d.version || l.state === "reconciled")
    throw new AppError(409, "Manifest changed. Refresh its current version.");
  const serials = (
    await tx.query(
      "SELECT * FROM vehicle_product_serials WHERE load_id=$1 AND state IN ('loaded','reserved') ORDER BY cylinder_id FOR UPDATE",
      [l.id],
    )
  ).rows;
  if (action === "manifest.acknowledge") {
    allow(user, ["driver"], l.branch_id);
    if (l.state !== "issued" || l.ended_at || user.id === l.issued_by)
      throw new AppError(
        409,
        "Only the independent active-trip driver may acknowledge issued stock.",
      );
    const expected = serials.map((s) => s.cylinder_id).sort(),
      actual = [...(d.serialIds ?? [])].sort();
    const matched =
      d.quantity === Number(l.quantity) &&
      JSON.stringify(expected) === JSON.stringify(actual);
    await tx.query(
      "UPDATE vehicle_product_loads SET state=$1,acknowledged_by=$2,version=version+1 WHERE id=$3",
      [matched ? "active" : "held", matched ? user.id : null, l.id],
    );
    await productCustodyEvent(
      tx,
      user,
      l.id,
      matched ? "manifest.acknowledged" : "manifest.receipt_mismatch",
      d,
    );
    return { ok: matched, held: !matched };
  }
  if (action === "manifest.return.declare") {
    allow(user, ["driver"], l.branch_id);
    if (
      l.reserved !== 0 ||
      !["active", "issued", "held"].includes(l.state) ||
      d.quantity === undefined ||
      d.quantity > Number(l.available)
    )
      throw new AppError(
        409,
        "Resolve supplementary reservations and declare the actual remaining stock.",
      );
    const expected = serials.map((s) => s.cylinder_id),
      actual = d.serialIds ?? [];
    if (
      new Set(actual).size !== actual.length ||
      actual.some((s) => !expected.includes(s)) ||
      (l.serialized ? actual.length !== d.quantity : actual.length > 0)
    )
      throw new AppError(
        409,
        "Declared serials must identify exact stock actually found on this manifest.",
      );
    const matched = d.quantity === Number(l.available);
    await tx.query(
      "UPDATE vehicle_product_loads SET state=$1,version=version+1 WHERE id=$2",
      [matched ? "returning" : "held", l.id],
    );
    await productCustodyEvent(tx, user, l.id, "manifest.return_declared", d);
    return { ok: true, held: !matched };
  }
  allow(user, ["owner", "inventory"], l.branch_id);
  recentVerification(user);
  await inventoryQualification(tx, user.id, l.branch_id, "inventory_safety");
  const supervisedRecovery =
    l.driver_active === false && ["issued", "active"].includes(l.state);
  if (
    l.reserved !== 0 ||
    (!["returning", "held"].includes(l.state) && !supervisedRecovery) ||
    user.id === l.driver_id
  )
    throw new AppError(
      409,
      "Independently receive a declared return with no pending customer reservations.",
    );
  const p = manifestReturn.parse(input),
    remaining = Number(l.available),
    found = p.foundSerialIds,
    saleable = p.saleableSerialIds;
  if (
    p.foundQuantity > remaining ||
    (l.serialized
      ? found.length !== p.foundQuantity ||
        saleable.length !== p.saleableQuantity ||
        found.some((s) => !serials.some((x) => x.cylinder_id === s))
      : found.length > 0 || saleable.length > 0)
  )
    throw new AppError(
      409,
      "Return counts and serial evidence do not reconcile to current vehicle custody.",
    );
  if (l.serialized)
    await checkedSerials(tx, l.branch_id, saleable, Number(l.size_kg));
  const key = `vehicle_return.${l.id}.${l.version}`;
  if (action === "manifest.return.review") {
    allow(user, ["inventory"], l.branch_id);
    await tx.query(
      "INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) VALUES($1,$2,'Inventory','Immutable manifest return loss/quarantine quantities and serial evidence; does not create a cash refund.','owner',4,'vehicle_return_recovery','[\"inventory\"]','[\"owner\",\"finance\"]','[\"owner\",\"finance\",\"inventory\"]','[\"owner\",\"finance\"]',true) ON CONFLICT(key) DO NOTHING",
      [key, "Vehicle product return " + l.id],
    );
    await tx.query(
      "INSERT INTO settings(key,scope,value) VALUES($1,$2,'null'::jsonb) ON CONFLICT DO NOTHING",
      [key, l.branch_id],
    );
    const setting = await one(
      tx,
      "SELECT version FROM settings WHERE key=$1 AND scope=$2",
      [key, l.branch_id],
    );
    return propose(tx, user, {
      key,
      scope: l.branch_id,
      version: setting!.version,
      value: p,
      reason: p.reason,
    });
  }
  if (action !== "manifest.return.receive")
    throw new AppError(400, "Unsupported manifest operation.");
  if (
    supervisedRecovery ||
    l.state === "held" ||
    p.saleableQuantity !== remaining
  ) {
    const approved = await one(
      tx,
      "SELECT value FROM settings WHERE key=$1 AND scope=$2",
      [key, l.branch_id],
    );
    if (JSON.stringify(approved?.value) !== JSON.stringify(p)) {
      // jsonb object order is not authoritative; compare each approved field canonically.
      const { canonicalRequest } = await import("./business-operation");
      if (canonicalRequest(approved?.value) !== canonicalRequest(p))
        throw new AppError(
          409,
          "Exact independent owner and finance approval is required for missing or quarantined stock.",
        );
    }
  }
  const removed = remaining - p.saleableQuantity,
    damaged = p.foundQuantity - p.saleableQuantity,
    missing = remaining - p.foundQuantity;
  const stock = await one(
    tx,
    "UPDATE inventory SET reserved=reserved-$1,quantity=quantity-$2 WHERE branch_id=$3 AND product_id=$4 AND reserved>=$1 AND quantity-$2>=reserved-$1 RETURNING product_id",
    [remaining, removed, l.branch_id, l.product_id],
  );
  if (!stock)
    throw new AppError(409, "Canonical stock cannot reconcile the return.");
  for (const [kind, n] of [
    ["vehicle_loss", missing],
    ["quarantine", damaged],
  ] as const)
    if (n)
      await tx.query(
        "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reason,actor_id,reference) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          id(),
          l.branch_id,
          l.product_id,
          -n,
          kind,
          p.reason,
          user.id,
          `manifest:${l.id}:${kind}`,
        ],
      );
  if (damaged)
    await tx.query(
      "INSERT INTO stock_holds(id,branch_id,product_id,gas,quantity,kind,reference,reason,evidence,actor_id) VALUES($1,$2,$3,false,$4,'quarantine',$5,$6,$7,$8)",
      [
        id(),
        l.branch_id,
        l.product_id,
        damaged,
        `manifest:${l.id}:quarantine`,
        p.reason,
        p.evidence,
        user.id,
      ],
    );
  for (const serial of serials) {
    const safe = saleable.includes(serial.cylinder_id);
    await tx.query("UPDATE vehicle_product_serials SET state=$1 WHERE id=$2", [
      safe ? "returned" : "quarantined",
      serial.id,
    ]);
    if (!safe) {
      await tx.query(
        "INSERT INTO cylinder_events(id,cylinder_id,actor_id,previous_status,status,reason) SELECT $1,id,$2,status,'quarantined',$3 FROM cylinders WHERE id=$4",
        [
          id(),
          user.id,
          `Manifest return: ${l.id}; ${p.reason}`,
          serial.cylinder_id,
        ],
      );
      await tx.query("UPDATE cylinders SET status='quarantined' WHERE id=$1", [
        serial.cylinder_id,
      ]);
    }
  }
  await tx.query(
    "UPDATE vehicle_product_loads SET available=0,returned=returned+$1,removed=removed+$2,received_by=$3,state='reconciled',version=version+1 WHERE id=$4",
    [p.saleableQuantity, removed, user.id, l.id],
  );
  await productCustodyEvent(tx, user, l.id, "manifest.return_received", {
    ...p,
    missing,
    damaged,
    returned: p.saleableQuantity,
  });
  return {
    ok: true,
    missing,
    damaged,
    returned: p.saleableQuantity,
    costBasis: "Canonical movement valuation; no invented expense or profit",
  };
}
