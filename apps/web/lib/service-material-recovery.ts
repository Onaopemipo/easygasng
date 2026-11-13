import { z } from "zod";
import { one, type SQL, type Row } from "./db";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { audit, propose } from "./governance";
import { inventoryQualification } from "./inventory-business";
import { serviceMaterialRecovery } from "./service-recovery-schema";
import { canonicalRequest } from "./business-operation";
export async function serviceMaterialRecoveryAction(
  tx: SQL,
  user: Actor,
  b: Row,
  action: string,
  input: unknown,
) {
  const d = z
    .object({
      bookingId: z.string().uuid(),
      materialId: z.string().uuid(),
      version: z.number().int().positive(),
      used: z.number().int().nonnegative(),
      damaged: z.number().int().nonnegative(),
      missing: z.number().int().nonnegative(),
      returned: z.number().int().nonnegative(),
      damagedReturned: z.number().int().nonnegative(),
      evidence: z.string().trim().min(10).max(1000),
      reason: z.string().trim().min(10).max(1000),
    })
    .strict()
    .parse(input);
  allow(user, ["owner", "finance"], b.branch_id);
  recentVerification(user);
  await inventoryQualification(tx, user.id, b.branch_id, "inventory_safety");
  const m = await one(
    tx,
    "SELECT * FROM service_materials WHERE id=$1 AND booking_id=$2 FOR UPDATE",
    [d.materialId, b.id],
  );
  if (!m || m.state !== "issued" || Number(b.version) !== d.version)
    throw new AppError(
      409,
      "Recover only the current exact issued material and booking revision.",
    );
  const payload = serviceMaterialRecovery.parse({
    bookingId: b.id,
    bookingVersion: b.version,
    materialId: m.id,
    issuedQuantity: m.quantity,
    unitCostKobo: m.unit_cost_kobo === null ? null : Number(m.unit_cost_kobo),
    used: d.used,
    damaged: d.damaged,
    missing: d.missing,
    returned: d.returned,
    damagedReturned: d.damagedReturned,
    evidence: d.evidence,
    reason: d.reason,
  });
  const key = `service_material_recovery.${m.id}.${b.version}`;
  if (action === "service.material.recovery.request") {
    allow(user, ["finance"], b.branch_id);
    await tx.query(
      'INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) VALUES($1,$2,\'Professional Services\',\'One-time actual material custody recovery after stopped work; never authorises work or changes customer charges.\',\'owner\',4,\'service_material_recovery\',\'["finance"]\',\'["owner","finance"]\',\'["owner","finance","manager"]\',\'["owner","finance"]\',true) ON CONFLICT(key) DO NOTHING',
      [key, b.reference + " material custody recovery"],
    );
    await tx.query(
      "INSERT INTO settings(key,scope,value) VALUES($1,$2,'null'::jsonb) ON CONFLICT DO NOTHING",
      [key, b.branch_id],
    );
    const setting = await one(
      tx,
      "SELECT version FROM settings WHERE key=$1 AND scope=$2",
      [key, b.branch_id],
    );
    return propose(tx, user, {
      key,
      scope: b.branch_id,
      version: setting!.version,
      value: payload,
      reason: d.reason,
    });
  }
  const approved = await one(
    tx,
    "SELECT value FROM settings WHERE key=$1 AND scope=$2",
    [key, b.branch_id],
  );
  if (canonicalRequest(approved?.value) !== canonicalRequest(payload))
    throw new AppError(
      409,
      "Exact independent owner and finance material recovery approval required.",
    );
  await tx.query(
    "UPDATE inventory SET quantity=quantity+$1 WHERE branch_id=$2 AND product_id=$3",
    [d.returned, b.branch_id, m.product_id],
  );
  if (d.returned)
    await tx.query(
      "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reason,actor_id,reference) VALUES($1,$2,$3,$4,'service_returned',$5,$6,$7)",
      [
        id(),
        b.branch_id,
        m.product_id,
        d.returned,
        d.reason,
        user.id,
        `service-recovery:${m.id}:returned`,
      ],
    );
  if (d.damagedReturned)
    await tx.query(
      "INSERT INTO stock_holds(id,branch_id,product_id,gas,quantity,kind,reference,reason,evidence,actor_id) VALUES($1,$2,$3,false,$4,'quarantine',$5,$6,$7,$8)",
      [
        id(),
        b.branch_id,
        m.product_id,
        d.damagedReturned,
        `service-recovery:${m.id}:damaged`,
        d.reason,
        d.evidence,
        user.id,
      ],
    );
  await tx.query(
    "UPDATE service_materials SET state='reconciled',used=$1,damaged=$2,missing=$3 WHERE id=$4",
    [d.used, d.damaged, d.missing, m.id],
  );
  await tx.query(
    "INSERT INTO service_material_recovery_history(id,material_id,booking_id,approval_key,detail,recorded_by) VALUES($1,$2,$3,$4,$5,$6)",
    [id(), m.id, b.id, key, JSON.stringify(payload), user.id],
  );
  await audit(tx, user, action, m.id, "success", {
    approvalKey: key,
    workAuthorised: false,
  });
  return { ok: true, workAuthorised: false };
}
