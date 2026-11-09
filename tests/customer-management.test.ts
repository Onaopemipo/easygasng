import { test } from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate } from "../apps/web/lib/db";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
test("CM-01: customer creation, scoped management and privilege rejection", async () => {
  const db = await createDatabase("memory://");
  await migrate(db);
  const actors: Record<string, string> = {};
  for (const role of ["owner", "manager", "customer"]) {
    const uid = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,'lagos')",
      [
        uid,
        role,
        role + "@cm.test",
        hashPassword("Synthetic-only-password-123!"),
        role,
      ],
    );
    actors[role] = await issueSession(db, uid);
  }
  const call = (role: string, action: string, input: any = {}) =>
    dispatch(action, actors[role], input, db);
  await assert.rejects(call("customer", "customers.manage"));
  const created = await call("manager", "customers.create", {
    name: "Jane Customer",
    email: "jane@cm.test",
    branchId: "lagos",
  });
  const listing = await call("manager", "customers.manage");
  assert.ok(
    listing.customers.some(
      (c: any) =>
        c.id === created.id && c.orders === 0 && Number(c.spent_kobo) === 0,
    ),
  );
  await call("manager", "customers.update", {
    id: created.id,
    name: "Jane Updated",
  });
  const detail = await call("owner", "customers.detail", { id: created.id });
  assert.equal(detail.customer.name, "Jane Updated");
  assert.deepEqual(detail.orders, []);
  await assert.rejects(
    call("owner", "customers.create", {
      name: "Duplicate",
      email: "JANE@cm.test",
      branchId: "lagos",
    }),
  );
  await assert.rejects(
    call("owner", "customers.update", {
      id: created.id,
      name: "Escalate",
      role: "owner",
    }),
  );
  await db.query(
    "INSERT INTO branches(id,name,active) VALUES('cm-other','Other',true)",
  );
  const other = await call("owner", "customers.create", {
    name: "Other Customer",
    email: "other@cm.test",
    branchId: "cm-other",
  });
  await assert.rejects(call("manager", "customers.detail", { id: other.id }));
  await assert.rejects(
    call("manager", "customers.update", { id: other.id, name: "Forbidden" }),
  );
  await assert.rejects(
    call("manager", "customers.create", {
      name: "Forbidden",
      email: "forbidden@cm.test",
      branchId: "cm-other",
    }),
  );
  const remaining = await call("manager", "customers.manage");
  assert.ok(!remaining.customers.some((c: any) => c.id === other.id));
  const stored = (
    await db.query("SELECT role,verified FROM users WHERE id=$1", [created.id])
  ).rows[0];
  assert.equal(stored.role, "customer");
  assert.equal(stored.verified, false);
  const orderId = id();
  await db.query(
    "INSERT INTO orders(id,reference,customer_id,branch_id,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash) VALUES($1,$2,$3,'lagos','synthetic',now()+interval '1 day','cash',1000,0,1000,'{}','2026-11-01','AM',$1,'synthetic')",
    [orderId, "CM-" + orderId, created.id],
  );
  let financial = await call("owner", "customers.detail", { id: created.id });
  assert.equal(
    Number(financial.customer.spent_kobo),
    0,
    "Unpaid order must not count as spend",
  );
  const ownerId = (
    await db.query("SELECT id FROM users WHERE email='owner@cm.test'")
  ).rows[0].id;
  await db.query(
    "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$3,1000,'cash',$4)",
    [id(), orderId, "CM-payment-" + orderId, ownerId],
  );
  financial = await call("manager", "customers.detail", { id: created.id });
  assert.equal(Number(financial.customer.spent_kobo), 1000);
  assert.equal(financial.orders.length, 1);
  await assert.rejects(
    call("owner", "customers.update", {
      id: ownerId,
      name: "Do not edit staff",
    }),
  );
  await db.close();
});
