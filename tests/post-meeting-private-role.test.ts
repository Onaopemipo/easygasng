import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDatabase, migrate } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
test("PM-T18: restricted private-schema runtime can create customer IDs and invoices while anonymous reads and invoice edits fail", async () => {
  const db = await createDatabase("memory://");
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec("SET search_path TO easygas_private,pg_catalog");
    const uid = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Owner',$2,$3,'owner','lagos')",
      [uid, uid + "@test.invalid", hashPassword("Fixture-password-123!")],
    );
    const token = await issueSession(db, uid);
    await db.exec("SET ROLE easygas_server");
    await dispatch("reauth", token, { password: "Fixture-password-123!" }, db);
    const customer = await dispatch(
      "customers.provisional",
      token,
      { name: "Private caller", phone: "08021111118", branchId: "lagos" },
      db,
    );
    assert.match(customer.public_customer_id, /^EGC-/);
    const oid = id();
    await db.query(
      "INSERT INTO orders(id,reference,customer_id,branch_id,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash) VALUES($1,$1,$2,'lagos','fixture',now()+interval '1 day','cash',100000,500000,600000,'{}','2026-01-01','AM',$1,'fixture')",
      [oid, customer.id],
    );
    const result = await dispatch("invoice.issue", token, { orderId: oid }, db);
    assert.match(result.invoice.invoice_number, /EGI-/);
    await assert.rejects(
      () => db.query("UPDATE customer_invoices SET total_kobo=1"),
      /permission denied|immutable/,
    );
    await db.exec(
      "RESET ROLE;CREATE ROLE pm_anonymous NOLOGIN;SET ROLE pm_anonymous",
    );
    await assert.rejects(
      () => db.query("SELECT * FROM easygas_private.customer_invoices"),
      /permission denied/,
    );
    await db.exec(
      "RESET ROLE;DROP POLICY customer_invoice_trusted_server ON customer_invoices;ALTER TABLE customer_invoices DISABLE ROW LEVEL SECURITY;DELETE FROM schema_migrations WHERE version='049'",
    );
    await migrate(db);
    assert.equal(
      (
        await db.query(
          "SELECT relrowsecurity FROM pg_class WHERE oid='customer_invoices'::regclass",
        )
      ).rows[0].relrowsecurity,
      true,
    );
    assert.equal(
      (await db.query("SELECT count(*)::int AS n FROM customer_invoices"))
        .rows[0].n,
      1,
    );
    await migrate(db);
  } finally {
    await db.close?.();
  }
});
