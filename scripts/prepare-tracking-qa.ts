// Isolated browser fixture only; never opens the working or production database.
import { createDatabase, migrate } from "../apps/web/lib/db";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
const db = await createDatabase(".data/order-tracking-browser-qa-20261102");
try {
  await migrate(db);
  const tokens: Record<string, string> = {},
    ids: Record<string, string> = {};
  for (const role of ["owner", "customer", "driver", "inventory"]) {
    const uid = id();
    ids[role] = uid;
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,'lagos')",
      [
        uid,
        `Tracking QA ${role}`,
        `${role}@tracking-qa.example.test`,
        hashPassword("Tracking-fixture-only-123!"),
        role,
      ],
    );
    tokens[role] = await issueSession(db, uid);
  }
  await db.exec(
    "UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','payment.cod') AND scope='lagos'; UPDATE inventory SET quantity=30,price_kobo=350000,published=true WHERE product_id='hose'; UPDATE delivery_locations SET coverage='Isolated synthetic QA only';",
  );
  const call = (role: string, action: string, input: any = {}) =>
    dispatch(action, tokens[role], input, db);
  for (const state of ["placed", "assigned", "out_for_delivery"]) {
    const o = await call("customer", "checkout", {
      items: [{ productId: "hose", quantity: 1 }],
      address: {
        name: "Synthetic Tracking Customer",
        phone: "08012345678",
        street: "12 Synthetic QA Street",
        zone: "Lekki",
      },
      date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      window: "14:00–18:00",
      paymentMethod: "cash_on_delivery",
      idempotencyKey: id(),
    });
    if (state !== "placed")
      for (const status of ["accepted", "preparing", "assigned"])
        await call("owner", "order.transition", {
          id: o.id,
          status,
          note: "Isolated browser fixture",
          ...(status === "assigned" ? { driverId: ids.driver } : {}),
        });
    if (state === "out_for_delivery") {
      const current = (await call("driver", "orders", { id: o.id }))[0];
      await call("driver", "delivery.pickup", {
        orderId: o.id,
        version: current.tracking_version,
        manifest: current.manifest,
        reason: "Synthetic physical pickup checked",
      });
      await call("driver", "order.transition", {
        id: o.id,
        status: "out_for_delivery",
        note: "Synthetic dispatched delivery",
      });
    }
  }
  console.log(
    "Prepared isolated tracking QA with 3 synthetic orders; no external messages or payments.",
  );
} finally {
  await db.close?.();
}
