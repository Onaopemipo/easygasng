import { z } from "zod";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { one, type SQL, type Row } from "./db";
import {
  inventoryQualification,
  requestOperation,
  stockBalance,
} from "./inventory-business";
import { audit } from "./governance";

function enabled() {
  if (
    process.env.EASYGAS_BULK_LPG_ENABLED !== "true" ||
    (process.env.NODE_ENV === "production" &&
      process.env.EASYGAS_FIELD_OPERATIONS_ENABLED !== "true")
  )
    throw new AppError(
      503,
      "Bulk recovery requires operational release approval.",
    );
}

export async function requestBulkRecovery(
  tx: SQL,
  user: Actor,
  input: unknown,
) {
  enabled();
  allow(user, ["owner", "finance"]);
  recentVerification(user);
  const d = z
    .object({
      loadId: z.string().uuid(),
      version: z.number().int().positive(),
      returnGrams: z.number().int().nonnegative().max(1_000_000_000),
      observedAt: z.iso.datetime(),
      evidence: z.string().trim().min(10).max(1000),
      reason: z.string().trim().min(10).max(500),
    })
    .strict()
    .parse(input);
  // Same reference metadata ordering as existing inventory proposals.
  await tx.query("SELECT id FROM branches ORDER BY id FOR UPDATE");
  const load = await one(
    tx,
    "SELECT l.*,t.driver_id,t.vehicle_id,t.ended_at FROM bulk_lpg_loads l JOIN driver_trips t ON t.id=l.trip_id WHERE l.id=$1 FOR UPDATE OF l,t",
    [d.loadId],
  );
  if (!load) throw new AppError(404, "Load not found.");
  allow(user, ["owner", "finance"], load.branch_id);
  if (
    load.state !== "held" ||
    load.ended_at ||
    Number(load.version) !== d.version ||
    load.driver_id === user.id
  )
    throw new AppError(
      409,
      "Current held custody and independent inventory measurement required.",
    );
  await inventoryQualification(tx, user.id, load.branch_id, "bulk_lpg_loading");
  const vehicle = await one(
    tx,
    "SELECT capacity_grams FROM driver_vehicles WHERE id=$1 FOR SHARE",
    [load.vehicle_id],
  );
  if (!vehicle || d.returnGrams > Number(vehicle.capacity_grams))
    throw new AppError(
      409,
      "Measured return exceeds documented vehicle capacity.",
    );
  const held = await one(
    tx,
    "SELECT created_at FROM bulk_lpg_events WHERE load_id=$1 AND kind='return.discrepancy' ORDER BY created_at DESC,id DESC LIMIT 1",
    [load.id],
  );
  const observed = Date.parse(d.observedAt);
  if (
    !held ||
    observed < new Date(held.created_at).getTime() ||
    observed > Date.now() ||
    observed < Date.now() - 86400000
  )
    throw new AppError(
      409,
      "Provide a fresh measured return after the recorded discrepancy.",
    );
  const stock = await stockBalance(tx, load.branch_id, true, undefined, true);
  const expected = Number(load.loaded_grams) - Number(load.dispensed_grams);
  const delta = d.returnGrams - expected;
  if (
    stock.reserved < Number(load.buffer_grams) ||
    stock.quantity + delta < stock.reserved - Number(load.buffer_grams)
  )
    throw new AppError(
      409,
      "Measured recovery would breach canonical reserved stock. Independent inventory investigation required.",
    );
  const result = await requestOperation(
    tx,
    user,
    "bulk_return_recovery",
    load.branch_id,
    {
      gas: true,
      bulkLoadId: load.id,
      loadVersion: d.version,
      before: stock.quantity,
      reserved: stock.reserved,
      expectedGrams: expected,
      observedGrams: d.returnGrams,
      bufferGrams: Number(load.buffer_grams),
      delta,
      observedAt: d.observedAt,
      evidence: d.evidence,
      reason: d.reason,
    },
    `bulk-recovery:${load.id}:${id()}`,
    d.reason,
  );
  await audit(tx, user, "bulk.recovery.requested", load.id, "success", {
    requestId: result.requestId,
    ...d,
  });
  return result;
}

/** Runs only inside the existing independently approved inventory activation. */
export async function applyBulkRecovery(tx: SQL, user: Actor, op: Row) {
  enabled();
  allow(user, ["owner"], op.branch_id);
  recentVerification(user);
  const p = op.payload;
  const load = await one(
    tx,
    "SELECT l.*,t.driver_id,t.vehicle_id,t.ended_at FROM bulk_lpg_loads l JOIN driver_trips t ON t.id=l.trip_id WHERE l.id=$1 FOR UPDATE OF l,t",
    [p.bulkLoadId],
  );
  if (
    !load ||
    load.branch_id !== op.branch_id ||
    load.state !== "held" ||
    load.ended_at ||
    Number(load.version) !== p.loadVersion ||
    user.id === op.requested_by ||
    user.id === load.driver_id ||
    user.id === load.received_by
  )
    throw new AppError(
      409,
      "Held load changed or independent recovery approval is missing.",
    );
  await inventoryQualification(
    tx,
    op.requested_by,
    op.branch_id,
    "bulk_lpg_loading",
  );
  const vehicle = await one(
    tx,
    "SELECT capacity_grams FROM driver_vehicles WHERE id=$1 FOR SHARE",
    [load.vehicle_id],
  );
  if (!vehicle || p.observedGrams > Number(vehicle.capacity_grams))
    throw new AppError(
      409,
      "Measured return exceeds documented vehicle capacity.",
    );
  const stock = await stockBalance(tx, op.branch_id, true, undefined, true);
  const expected = Number(load.loaded_grams) - Number(load.dispensed_grams);
  if (
    stock.quantity !== p.before ||
    stock.reserved !== p.reserved ||
    expected !== p.expectedGrams ||
    Number(load.buffer_grams) !== p.bufferGrams ||
    p.delta !== p.observedGrams - expected ||
    Date.parse(p.observedAt) < Date.now() - 86400000
  )
    throw new AppError(
      409,
      "Recovery evidence or canonical stock changed. Request a fresh independent review.",
    );
  const updated = await one(
    tx,
    "UPDATE gas_stock SET grams=grams+$1,reserved_grams=reserved_grams-$2 WHERE branch_id=$3 AND reserved_grams>=$2 AND grams+$1>=reserved_grams-$2 RETURNING branch_id",
    [p.delta, p.bufferGrams, op.branch_id],
  );
  if (!updated)
    throw new AppError(
      409,
      "Recovery cannot release or adjust canonical stock.",
    );
  // Record separate mass correction and custody release in the canonical ledger.
  for (const [kind, grams] of [
    ["adjustment", p.delta],
    ["released", -p.bufferGrams],
  ] as const) {
    if (grams)
      await tx.query(
        "INSERT INTO gas_stock_movements(id,branch_id,grams,kind,reference,actor_id,reason) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          id(),
          op.branch_id,
          grams,
          kind,
          `bulk-recovery:${load.id}:${kind}`,
          user.id,
          p.reason,
        ],
      );
  }
  await tx.query(
    "UPDATE bulk_lpg_allocations SET state='returned' WHERE load_id=$1 AND state='allocated'",
    [load.id],
  );
  await tx.query(
    "UPDATE bulk_lpg_loads SET state='reconciled',version=version+1 WHERE id=$1",
    [load.id],
  );
  await tx.query(
    "INSERT INTO bulk_lpg_events(id,load_id,kind,actor_id,detail) VALUES($1,$2,'return.recovered',$3,$4)",
    [
      id(),
      load.id,
      user.id,
      JSON.stringify({
        ...p,
        operationId: op.id,
        requestId: op.request_id,
        requesterId: op.requested_by,
        independentApproverId: user.id,
      }),
    ],
  );
  await audit(tx, user, "bulk.recovery.applied", load.id, "success", {
    operationId: op.id,
    ...p,
  });
}
