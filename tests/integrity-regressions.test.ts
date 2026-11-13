import { consolidatedRole } from "../packages/business-rules/src/staff-roles";
import { verifiedPickup } from "./helpers/tracking-fixture";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
async function fixture() {
  const db = await createDatabase("memory://");
  await migrate(db);
  const actors: Record<string, any> = {};
  for (const role of ["owner", "sales", "customer", "driver"]) {
    const uid = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,$2,$3,$4,$5,'lagos')",
      [
        uid,
        role,
        `${uid}@example.test`,
        hashPassword("Integrity-fixture-only-123!"),
        consolidatedRole(role),
      ],
    );
    actors[role] = { id: uid, token: await issueSession(db, uid) };
  }
  await db.query("UPDATE users SET driver_available=true WHERE id=$1",[actors.driver.id]);
  await db.query(
    "UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','payment.cod') AND scope='lagos'",
  );
  await db.query("UPDATE inventory SET quantity=20 WHERE branch_id='lagos'");
  await db.query(
    "UPDATE inventory SET price_kobo=750000,published=true WHERE product_id='hose'",
  );
  await db.query(
    "UPDATE delivery_locations SET coverage='Synthetic coverage verified for regression fixtures only'",
  );
  const call = (role: string, action: string, input: any = {}) =>
    dispatch(action, actors[role].token, input, db);
  const input = (productId = "hose") => ({
    items: [{ productId, quantity: 1 }],
    address: {
      name: "Test customer",
      phone: "08012345678",
      street: "12 Test Avenue",
      zone: "Lekki",
    },
    date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    window: "14:00–18:00",
    paymentMethod: "cash_on_delivery",
    idempotencyKey: id(),
  });
  return { db, actors, call, input };
}
test("inactive branch and cross-branch staff checkout fail before any reservation", async () => {
  const { db, actors, call, input } = await fixture();
  try {
    await db.query("UPDATE branches SET active=false WHERE id='lagos'");
    await assert.rejects(
      () => call("customer", "checkout", input()),
      /not accepting/,
    );
    await db.query("UPDATE branches SET active=true WHERE id='lagos'");
    await db.query("INSERT INTO branches(id,name) VALUES ('other','Other')");
    await db.query("UPDATE users SET branch_id='other' WHERE id=$1", [
      actors.sales.id,
    ]);
    await assert.rejects(
      () => call("sales", "checkout", input()),
      /another branch/,
    );
    assert.equal((await one(db, "SELECT count(*)::int n FROM orders"))!.n, 0);
    assert.equal(
      (await one(db, "SELECT sum(reserved)::int n FROM inventory"))!.n,
      0,
    );
  } finally {
    await db.close?.();
  }
});
test("cylinder sales require eligible serials, preserve reservation and transfer actual ownership once", async () => {
  const { db, actors, call, input } = await fixture();
  try {
    await assert.rejects(
      () => call("customer", "checkout", input("cylinder-empty-6")),
      /inspected empty cylinders/,
    );
    assert.equal((await one(db, "SELECT count(*)::int n FROM orders"))!.n, 0);
    await call("owner", "cylinder.create", {
      serial: "TEST-SAFE-EMPTY",
      branchId: "lagos",
      sizeKg: 6,
      ownership: "company",
      status: "empty",
      testDue: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    });
    const o = await call("customer", "checkout", input("cylinder-empty-6"));
    await assert.rejects(
      () => call("customer", "checkout", input("cylinder-empty-6")),
      /inspected empty cylinders/,
    );
    await db.query(
      "UPDATE products SET category='Accessories',name='Renamed catalogue item' WHERE id='cylinder-empty-6'",
    );
    for (const status of ["accepted", "preparing", "assigned"])
      await call("owner", "order.transition", {
        id: o.id,
        status,
        note: "Test complete allocation flow",
        ...(status === "assigned" ? { driverId: actors.driver.id } : {}),
      });
    await verifiedPickup(call, o.id);
    await call("driver", "order.transition", {
      id: o.id,
      status: "out_for_delivery",
      note: "Test dispatch",
    });
    const code = (await call("customer", "orders"))[0].confirmation_code;
    await call("driver", "delivery.complete", {
      handover: true,
      orderId: o.id,
      code,
      collectedKobo: Number(o.total_kobo),
    });
    await call("driver", "delivery.complete", {
      handover: true,
      orderId: o.id,
      code,
      collectedKobo: Number(o.total_kobo),
    });
    const c = await one(
      db,
      "SELECT * FROM cylinders WHERE serial='TEST-SAFE-EMPTY'",
    );
    assert.equal(c!.status, "sold");
    assert.equal(c!.customer_id, actors.customer.id);
    assert.equal(
      (await one(
        db,
        "SELECT count(*)::int n FROM cylinder_events WHERE status='sold'",
      ))!.n,
      1,
    );
  } finally {
    await db.close?.();
  }
});
test("cancellation releases serial allocation; second custody issue requires a return", async () => {
  const { db, actors, call, input } = await fixture();
  try {
    await call("owner", "cylinder.create", {
      serial: "TEST-RETURN-EMPTY",
      branchId: "lagos",
      sizeKg: 6,
      ownership: "company",
      status: "empty",
      testDue: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    });
    const o = await call("customer", "checkout", input("cylinder-empty-6"));
    await call("customer", "order.transition", {
      id: o.id,
      status: "cancelled",
      note: "Cancel test reservation",
    });
    await call("customer", "checkout", input("cylinder-empty-6"));
    await call("owner", "cylinder.create", {
      serial: "TEST-CUSTODY-FILLED",
      branchId: "lagos",
      sizeKg: 6,
      ownership: "company",
      status: "filled",
      testDue: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    });
    const c = await one(
      db,
      "SELECT id FROM cylinders WHERE serial='TEST-CUSTODY-FILLED'",
    );
    await call("owner", "cylinder.custody", {
      id: c!.id,
      customerId: actors.customer.id,
      reason: "Test first custody",
    });
    const other = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role) VALUES ($1,'Other',$2,$3,'customer')",
      [
        other,
        `${other}@example.test`,
        hashPassword("Integrity-fixture-only-123!"),
      ],
    );
    await assert.rejects(
      () =>
        call("owner", "cylinder.custody", {
          id: c!.id,
          customerId: other,
          reason: "Invalid second issue",
        }),
      /return before/,
    );
  } finally {
    await db.close?.();
  }
});
test("failed-delivery reassignment cannot overbook an occupied window", async () => {
  const { db, actors, call, input } = await fixture();
  try {
    await db.query(
      "UPDATE settings SET value='1' WHERE key='delivery.capacity' AND scope='lagos'",
    );
    const a = await call("customer", "checkout", input());
    for (const status of ["accepted", "preparing", "assigned"])
      await call("owner", "order.transition", {
        id: a.id,
        status,
        note: "Capacity test transition",
        ...(status === "assigned" ? { driverId: actors.driver.id } : {}),
      });
    await verifiedPickup(call, a.id);
    for (const status of ["out_for_delivery", "delivery_failed"])
      await call("driver", "order.transition", {
        id: a.id,
        status,
        note: "Capacity test failure",
      });
    await call("customer", "checkout", input());
    await assert.rejects(
      () =>
        call("owner", "order.transition", {
          id: a.id,
          status: "assigned",
          driverId: actors.driver.id,
          note: "Invalid overcapacity reassignment",
        }),
      /fully booked/,
    );
  } finally {
    await db.close?.();
  }
});
test("refill history uses fulfilment dates and ignores unproven delivery timestamps", async () => {
  const { db, call, input } = await fixture();
  try {
    const o = await call("customer", "checkout", input());
    await db.query(
      "UPDATE orders SET status='delivered',payment_status='verified',delivered_at=now()-interval '5 days' WHERE id=$1",
      [o.id],
    );
    const uid = (await one(db, "SELECT id FROM users WHERE role='owner'"))!.id;
    await db.query(
      "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES ($1,$2,$3,$4,'cash',$5)",
      [id(), o.id, id(), o.total_kobo, uid],
    );
    await db.query(
      "INSERT INTO order_items(order_id,product_id,name,quantity,unit_price_kobo) VALUES ($1,'refill-6','Historical fixed refill',1,750000)",
      [o.id],
    );
    const p = await call("customer", "refill.profile.create", {
      productId: "refill-6",
      label: "Actual refill",
      householdSize: 2,
      cookingDays: 5,
    });
    await call("customer", "refill.profiles");
    const h = await one(
      db,
      "SELECT h.refilled_at=o.delivered_at AS correct FROM refill_history h JOIN orders o ON o.id=h.order_id WHERE profile_id=$1",
      [p.id],
    );
    assert.equal(h!.correct, true);
  } finally {
    await db.close?.();
  }
});
