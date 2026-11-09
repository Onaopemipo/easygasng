import { bulkFixture } from "./bulk-lpg-fixture";
import { id, digest } from "../../apps/web/lib/auth";
import { type DB } from "../../apps/web/lib/db";
export async function doorstepFixture(database?: DB) {
  const f = await bulkFixture(database);
  process.env.EASYGAS_DOORSTEP_ENABLED = "true";
  await f.db.query(
    "UPDATE settings SET value=$1,version=version+1 WHERE key='gas.quantity_policy' AND scope='lagos'",
    [
      JSON.stringify({
        minimumKg: 1,
        maximumKg: 50,
        incrementKg: 1,
        precision: 0,
        capacitiesKg: [6],
      }),
    ],
  );
  await f.db.query(
    "UPDATE settings SET value=jsonb_set(value,'{requiresAddressConfirmation}','false') WHERE key LIKE 'location.%'",
  );
  const load = await f.issue();
  await f.call("driver", "bulk.load.acknowledge", {
    loadId: load.id,
    version: 1,
    returnGrams: 10000,
    meterReadingGrams: 100000,
    reason: "Synthetic measured load accepted",
    operationKey: id(),
  });
  await f.db.query(
    "UPDATE orders SET status='out_for_delivery',payment_status='unpaid',delivery_code_hash=$2,delivery_code_expires_at=now()+interval '1 hour' WHERE id=$1",
    [f.order.id, digest("123456")],
  );
  await f.db.query(
    "INSERT INTO delivery_attempts(id,order_id,driver_id,assignment_version,state,picked_up_at,arrived_at) VALUES($1,$2,$3,1,'arrived',now(),now())",
    [id(), f.order.id, f.actors.driver.id],
  );
  await f.db.query(
    "INSERT INTO customer_invoices(id,order_id,customer_id,branch_id,total_kobo,snapshot,issued_by) SELECT $1,id,customer_id,branch_id,total_kobo,'{}'::jsonb,$2 FROM orders WHERE id=$3",
    [id(), f.actors.owner.id, f.order.id],
  );
  const originalTotal = Number(
    (
      await f.db.query("SELECT total_kobo FROM orders WHERE id=$1", [
        f.order.id,
      ])
    ).rows[0].total_kobo,
  );
  await f.call("driver", "bulk.collection.record", {
    loadId: load.id,
    version: 2,
    orderId: f.order.id,
    amountKobo: originalTotal,
    reason: "Synthetic original cash physically collected",
    operationKey: id(),
  });
  const collection = (await f.call("owner", "cash.collections"))[0];
  await f.call("owner", "cash.reconcile", { id: collection.id });
  const c = id();
  await f.db.query(
    "INSERT INTO cylinders(id,branch_id,serial,size_kg,ownership,status,test_due,customer_id) VALUES($1,'lagos',$1,6,'customer','empty',current_date+365,$2)",
    [c, f.actors.customer.id],
  );
  const version = Number(
    (
      await f.db.query("SELECT tracking_version FROM orders WHERE id=$1", [
        f.order.id,
      ])
    ).rows[0].tracking_version,
  );
  const m = await f.call("driver", "doorstep.gas.propose", {
    orderId: f.order.id,
    version,
    capacityKg: 6,
    kg: 2,
    operationKey: id(),
  });
  const context = {
    orderId: f.order.id,
    amendmentId: m.id,
    reason: "Synthetic supplementary visit evidence",
  };
  const call = (who: string, action: string, extra: any = {}) =>
    f.call(who, action, { ...context, ...extra, operationKey: id() });
  const consent = () =>
    f.call("customer", "doorstep.consent", {
      orderId: f.order.id,
      amendmentId: m.id,
      consent: true,
      operationKey: id(),
    });
  const prepare = () =>
    call("inventory", "doorstep.prepare", {
      cylinderId: c,
      allowableKg: 6,
      evidence: "Synthetic independently inspected empty cylinder",
    });
  const decide = (noteId: string, approve = true) =>
    f.call("owner", "invoice.correction.decide", {
      orderId: f.order.id,
      noteId,
      approve,
      operationKey: id(),
    });
  return { ...f, load, c, context, execute: call, consent, prepare, decide };
}
