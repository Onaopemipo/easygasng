import { consolidatedRole } from "../../packages/business-rules/src/staff-roles";
import { createDatabase, migrate, one, type DB } from "../../apps/web/lib/db";
import { dispatch } from "../../apps/web/lib/service";
import { id, hashPassword, issueSession } from "../../apps/web/lib/auth";
export async function fixture(database?: DB) {
  const db = database ?? (await createDatabase("memory://"));
  await migrate(db);
  const actors: Record<string, any> = {};
  for (const role of [
    "owner",
    "dispatcher",
    "driver",
    "customer",
    "commercial",
    "inventory",
  ]) {
    const uid = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,'lagos')",
      [
        uid,
        role,
        `${uid}@tracking.example.test`,
        hashPassword("Tracking-fixture-only-123!"),
        consolidatedRole(role),
      ],
    );
    actors[role] = { id: uid, token: await issueSession(db, uid) };
  }
  await db.exec(
    "UPDATE users SET driver_available=true WHERE role='driver'; UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','payment.cod') AND scope='lagos'; UPDATE inventory SET quantity=50,price_kobo=350000,published=true WHERE product_id='hose'; UPDATE delivery_locations SET coverage='Synthetic fixture coverage only';",
  );
  const call = (role: string, action: string, input: any = {}) =>
    dispatch(action, actors[role].token, input, db);
  const snapshot = async (orderId: string) =>
    (await call("owner", "orders", { id: orderId }))[0];
  const make = async () =>
    call("customer", "checkout", {
      items: [{ productId: "hose", quantity: 1 }],
      address: {
        name: "Synthetic customer",
        phone: "08012345678",
        street: "12 Synthetic Street",
        zone: "Lekki",
      },
      date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      window: "14:00–18:00",
      paymentMethod: "cash_on_delivery",
      idempotencyKey: id(),
    });
  const transition = async (o: any, status: string, role = "owner") => {
    const current = await snapshot(o.id);
    return call(role, "order.transition", {
      id: o.id,
      status,
      note: "Isolated tracking test operation",
      version: current.tracking_version,
      operationKey: id(),
      ...(status === "assigned" ? { driverId: actors.driver.id } : {}),
    });
  };
  const assigned = async () => {
    const o = await make();
    for (const s of ["accepted", "preparing", "assigned"])
      await transition(o, s);
    return snapshot(o.id);
  };
  const pickup = async (o: any) => {
    const current = await snapshot(o.id);
    return call("driver", "delivery.pickup", {
      orderId: o.id,
      version: current.tracking_version,
      operationKey: id(),
      manifest: current.manifest,
      reason: "Synthetic complete quantities and serials checked",
    });
  };
  const ready = async () => {
    const o = await assigned();
    await pickup(o);
    await transition(o, "out_for_delivery", "driver");
    return snapshot(o.id);
  };
  return {
    db,
    actors,
    call,
    snapshot,
    make,
    transition,
    assigned,
    pickup,
    ready,
  };
}
