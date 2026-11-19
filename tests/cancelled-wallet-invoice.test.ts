import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDatabase } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";

test("ROLEACC-CANCEL-BALANCE: actual cancellation wallet credit reduces retained invoice settlement once, permits independent void and cannot create fictional excess refund", async () => {
  const db = await createDatabase("memory://");
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec("SET search_path TO easygas_private,pg_catalog");
    const tokens: Record<string, string> = {}, ids: Record<string, string> = {};
    const password = "Cancellation-invoice-fixture-123!";
    for (const role of ["owner", "finance", "customer"]) {
      ids[role] = id();
      await db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$2,'lagos')", [ids[role], role, ids[role] + "@cancel-invoice.example.test", hashPassword(password)]);
      tokens[role] = await issueSession(db, ids[role]);
    }
    await db.exec("UPDATE inventory SET quantity=10,price_kobo=20000,published=true WHERE product_id='hose'; UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','wallet.enabled'); UPDATE delivery_locations SET coverage='Synthetic cancellation invoice fixture';");
    await db.query("INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES($1,$2,5000000,'cash_funding',$1)", [id(), ids.customer]);
    await db.exec("SET ROLE easygas_server");
    const call = (role: string, action: string, input: any = {}) => dispatch(action, tokens[role], input, db);
    const make = () => call("customer", "checkout", { items: [{ productId: "hose", quantity: 1 }], address: { name: "Synthetic customer", phone: "08012345678", street: "12 Synthetic Street", zone: "Lekki" }, date: new Date(Date.now() + 86400000).toISOString().slice(0,10), window: "14:00–18:00", paymentMethod: "wallet", idempotencyKey: id() });
    await call("finance", "reauth", { password }); await call("owner", "reauth", { password });
    const before = (await call("customer", "wallet")).balanceKobo;
    const a: any = await make(); const original = (await call("finance", "invoice.issue", { orderId: a.id })).invoice;
    const other: any = await make(); const otherInvoice = (await call("finance", "invoice.issue", { orderId: other.id })).invoice;
    const cancel = { id: a.id, status: "cancelled", version: 1, note: "Synthetic customer cancellation before pickup", operationKey: id() };
    await call("customer", "order.transition", cancel); await call("customer", "order.transition", cancel);
    const cancelled = (await call("customer", "invoice.order", { orderId: a.id })).invoice;
    assert.equal(cancelled.status, "adjustment_required"); assert.equal(cancelled.amountDueKobo, null);
    assert.equal(cancelled.paidKobo, 0, "retained settlement excludes actual recorded cancellation refund");
    assert.equal((await call("customer", "invoice.order", { orderId: other.id })).invoice.paidKobo, Number(otherInvoice.total_kobo), "another order's cancellation cannot offset this settlement");
    const proposal: any = await call("finance", "invoice.correction.propose", { orderId: a.id, kind: "void", amountKobo: Number(original.total_kobo), reason: "Synthetic void after canonical wallet cancellation refund", operationKey: id() });
    await assert.rejects(() => call("finance", "invoice.correction.decide", { orderId: a.id, noteId: proposal.noteId, approve: true, operationKey: id() }), /Independent/);
    const approve = { orderId: a.id, noteId: proposal.noteId, approve: true, operationKey: id() };
    await call("owner", "invoice.correction.decide", approve); await call("owner", "invoice.correction.decide", approve);
    const after = (await call("customer", "invoice.order", { orderId: a.id })).invoice;
    assert.equal(after.status, "voided"); assert.equal(after.paidKobo, 0); assert.equal(after.overpaidKobo, 0); assert.equal(after.amountDueKobo, 0); assert.deepEqual(after.snapshot, original.snapshot);
    await assert.rejects(() => call("customer", "invoice.excess.request", { orderId: a.id, acceptWalletCredit: true, reason: "A cancellation refund must not permit a second excess credit", operationKey: id() }), /actual excess|pending fulfilment/);
    assert.equal((await call("customer", "wallet")).balanceKobo, before - Number(otherInvoice.total_kobo));
    assert.equal((await db.query("SELECT count(*)::int n FROM wallet_entries WHERE reference=$1", ["cancellation:"+a.id])).rows[0].n, 1);
  } finally { await db.close?.(); }
});
