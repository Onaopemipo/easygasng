import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDatabase } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";

test("ROLEACC-REFUND-RUNTIME: restricted server creates immutable partial refund atomically, approves once and still cannot rewrite its source", async () => {
  const db = await createDatabase("memory://");
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec("SET search_path TO easygas_private,pg_catalog");
    const tokens: Record<string, string> = {}, ids: Record<string, string> = {};
    const password = "Refund-runtime-fixture-only-123!";
    for (const role of ["owner", "finance", "customer"]) {
      ids[role] = id();
      await db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$2,'lagos')", [ids[role], role, ids[role] + "@refund-runtime.example.test", hashPassword(password)]);
      tokens[role] = await issueSession(db, ids[role]);
    }
    await db.exec("UPDATE inventory SET quantity=10,price_kobo=10000,published=true WHERE product_id='hose'; UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','wallet.enabled'); UPDATE delivery_locations SET coverage='Synthetic refund runtime fixture';");
    await db.query("INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES($1,$2,5000000,'cash_funding',$1)", [id(), ids.customer]);
    const order: any = await dispatch("checkout", tokens.customer, {
      items: [{ productId: "hose", quantity: 2 }], address: { name: "Synthetic customer", phone: "08012345678", street: "12 Synthetic Street", zone: "Lekki" },
      date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10), window: "14:00–18:00", paymentMethod: "wallet", idempotencyKey: id(),
    }, db);
    // Labelled local delivered fixture, not hosted fulfilment or physical evidence.
    await db.query("UPDATE orders SET status='delivered' WHERE id=$1", [order.id]);
    await db.exec("SET ROLE easygas_server");
    const call = (role: string, action: string, input: any = {}) => dispatch(action, tokens[role], input, db);
    const request = { orderId: order.id, lines: [{ source: "product:hose", quantity: 1 }], acceptWalletCredit: true, reason: "Synthetic restricted-role partial refund acceptance", idempotencyKey: id() };
    const made: any = await call("customer", "refund.request", request);
    assert.equal((await call("customer", "refund.request", request)).id, made.id);
    await assert.rejects(() => db.query("UPDATE credit_requests SET refund_lines='{}' WHERE id=$1", [made.id]), /permission denied/);
    await call("finance", "reauth", { password });
    const before = (await call("customer", "wallet")).balanceKobo;
    const decision = { id: made.id, decision: "approved", reason: "Independent synthetic refund review" };
    await call("finance", "credit.decide", decision); await call("finance", "credit.decide", decision);
    assert.equal((await call("customer", "wallet")).balanceKobo, before + 10000);
    assert.equal((await db.query("SELECT count(*)::int n FROM wallet_entries WHERE reference=$1", ["credit:" + made.id])).rows[0].n, 1);
    await assert.rejects(() => call("customer", "refund.request", { ...request, idempotencyKey: id(), lines: [{ source: "product:hose", quantity: 2 }] }), /exceeds.*remaining/i);
  } finally { await db.close?.(); }
});
