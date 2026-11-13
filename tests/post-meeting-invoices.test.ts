import { consolidatedRole } from "../packages/business-rules/src/staff-roles";
import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, issueSession, hashPassword } from "../apps/web/lib/auth";
test("PM-T11: invoice issue is immutable, numbered, ownership-scoped and derives settlement only from verified ledger", async () => {
  const db = await createDatabase("memory://");
  await migrate(db);
  try {
    const ids: Record<string, string> = {},
      tokens: Record<string, string> = {};
    for (const role of ["owner", "finance", "manager", "customer", "sales"]) {
      ids[role] = id();
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,'lagos')",
        [ids[role], role, role + "@invoice.test", hashPassword("Fixture-password-123!"), consolidatedRole(role)],
      );
      tokens[role] = await issueSession(db, ids[role]);
    }
    const call = (role: string, action: string, input: any = {}) =>
      dispatch(action, tokens[role], input, db);
    const oid = id();
    await db.query(
      "INSERT INTO orders(id,reference,customer_id,branch_id,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash) VALUES($1,$2,$3,'lagos','fixture',now()+interval '1 day','cash',100000,500000,600000,$4,'2026-01-01','AM',$1,'fixture')",
      [
        oid,
        "PM-" + oid,
        ids.customer,
        JSON.stringify({ street: "10 Fixture Road", zone: "Lekki" }),
      ],
    );
    await assert.rejects(
      () => call("finance", "invoice.issue", { orderId: oid }),
      /verif/i,
    );
    await call("finance", "reauth", { password: "Fixture-password-123!" });
    const first = await call("finance", "invoice.issue", { orderId: oid });
    assert.match(first.invoice.invoice_number, /^EGI-\d{10}$/);
    assert.equal(first.invoice.status, "issued");
    assert.equal(first.invoice.overdue, true);
    assert.equal(first.paymentRequests.enabled, false);
    assert.equal(
      (await call("finance", "invoice.issue", { orderId: oid })).invoice.id,
      first.invoice.id,
    );
    assert.equal((await call("sales", "invoice.order", { orderId: oid })).invoice.id, first.invoice.id);
    await assert.rejects(() =>
      call("customer", "invoice.issue", { orderId: oid }),
    );
    assert.equal(
      (
        await call("customer", "invoice.order", { orderId: oid })
      ).invoice.snapshot.customer.public_customer_id.startsWith("EGC-"),
      true,
    );
    await assert.rejects(
      () =>
        db.query("UPDATE customer_invoices SET total_kobo=1 WHERE id=$1", [
          first.invoice.id,
        ]),
      /immutable/,
    );
    await assert.rejects(
      () =>
        db.query("DELETE FROM customer_invoices WHERE id=$1", [
          first.invoice.id,
        ]),
      /immutable/,
    );
    await db.query(
      "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,200000,'cash',$3)",
      [id(), oid, ids.finance],
    );
    assert.equal(
      (await call("customer", "invoice.order", { orderId: oid })).invoice
        .status,
      "partially_paid",
    );
    await db.query(
      "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,400000,'cash',$3)",
      [id(), oid, ids.finance],
    );
    assert.equal(
      (await call("customer", "invoice.order", { orderId: oid })).invoice
        .status,
      "paid",
    );
    const other = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role) VALUES($1,'Other',$2,'unusable','customer')",
      [other, other + "@test.invalid"],
    );
    const otherToken = await issueSession(db, other);
    await assert.rejects(() =>
      dispatch("invoice.order", otherToken, { orderId: oid }, db),
    );
    await db.query("UPDATE orders SET status='cancelled' WHERE id=$1", [oid]);
    const changed = (await call("customer", "invoice.order", { orderId: oid }))
      .invoice;
    assert.equal(changed.status, "adjustment_required");
    assert.equal(changed.amountDueKobo, null);
  } finally {
    await db.close?.();
  }
});
