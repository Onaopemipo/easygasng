import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fixture } from "./helpers/order-tracking-fixture";
import { one } from "../apps/web/lib/db";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
const draft = (o: any) => ({
  orderId: o.id,
  items: [{ productId: "hose", quantity: 2 }],
  gasLines: [],
});
const request = (d: any, q: any) => ({
  ...d,
  requestKey: id(),
  quoteHash: q.quoteHash,
  reason: "Customer requested additional items before dispatch",
});

test("ADD-01: staff addition reserves current stock once on the original order with unchanged delivery fee and immutable history", async () => {
  const f = await fixture();
  try {
    const o = await f.make(),
      d = draft(o),
      q = await f.call("owner", "order.addition.quote", d),
      r = request(d, q);
    assert.equal(q.additionalDeliveryKobo, 0);
    assert.equal(q.amountKobo, 700000);
    const before = await one(f.db, "SELECT * FROM orders WHERE id=$1", [o.id]);
    const result = await f.call("owner", "order.addition.create", r);
    const after = await one(f.db, "SELECT * FROM orders WHERE id=$1", [o.id]);
    assert.equal(Number(after!.delivery_kobo), Number(o.delivery_kobo));
    assert.equal(Number(after!.total_kobo), Number(o.total_kobo) + 700000);
    assert.equal((await one(f.db, "SELECT count(*) n FROM orders"))!.n, 1);
    assert.equal(
      (await one(f.db, "SELECT quantity FROM order_items WHERE order_id=$1", [
        o.id,
      ]))!.quantity,
      3,
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
      ))!.reserved,
      3,
    );
    assert.equal(after!.delivery_code_hash, before!.delivery_code_hash);
    assert.deepEqual(after!.address, before!.address);
    assert.equal(after!.customer_id,before!.customer_id);
    assert.equal(after!.delivery_date,before!.delivery_date);
    assert.equal(after!.delivery_window,before!.delivery_window);
    assert.equal(
      (await f.call("owner", "order.addition.create", r)).replayed,
      true,
    );
    await assert.rejects(
      () =>
        f.call("owner", "order.addition.create", {
          ...r,
          reason: "Changed request content",
        }),
      /different contents/,
    );
    await assert.rejects(
      () => f.call("owner", "order.addition.quote", d),
      /one permitted/,
    );
    const info = await f.call("owner", "order.additions", { orderId: o.id });
    assert.equal(info.history[0].id, result.id);
    assert.equal(info.eligible, false);
    await assert.rejects(
      () =>
        f.db.query("UPDATE order_additions SET reason='tamper' WHERE id=$1", [
          result.id,
        ]),
      /immutable/,
    );
    await f.transition(o, "cancelled");
    assert.equal(
      (await one(
        f.db,
        "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
      ))!.reserved,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ADD-02: customer, driver and cross-branch staff cannot quote or create additions", async () => {
  const f = await fixture();
  try {
    const o = await f.make(),
      d = draft(o);
    for (const role of [
      "customer",
      "commercial",
      "driver",
      "inventory",
    ])
      await assert.rejects(
        () => f.call(role, "order.addition.quote", d),
        /permission|allowed|authori|access/i,
      );
    const uid = id();
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('other','Other test branch')",
    );
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Other sales',$2,$3,'manager','other')",
      [uid, `${uid}@example.test`, hashPassword("Test-only-123!")],
    );
    const token = await issueSession(f.db, uid);
    await assert.rejects(
      () => dispatch("order.addition.quote", token, d, f.db),
      /branch|permission|access/i,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ADD-03: assignment/departure cutoff rejects stale quotes and preserves quantities", async () => {
  const f = await fixture();
  try {
    const o = await f.make(),
      d = draft(o),
      q = await f.call("owner", "order.addition.quote", d);
    for (const s of ["accepted", "preparing", "assigned"])
      await f.transition(o, s);
    await assert.rejects(
      () => f.call("owner", "order.addition.create", request(d, q)),
      /assignment|closed/i,
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT reserved FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
      ))!.reserved,
      1,
    );
    assert.equal(
      (await one(f.db, "SELECT count(*) n FROM order_additions"))!.n,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ADD-04: stale prices, insufficient stock, paid orders and forged financial/address fields cannot alter the order", async () => {
  const f = await fixture();
  try {
    const o = await f.make(),
      d = draft(o),
      q = await f.call("owner", "order.addition.quote", d);
    await f.db.query(
      "UPDATE inventory SET price_kobo=price_kobo+100 WHERE product_id='hose'",
    );
    await assert.rejects(
      () => f.call("owner", "order.addition.create", request(d, q)),
      /price.*changed/,
    );
    await f.db.query(
      "UPDATE inventory SET price_kobo=350000,quantity=1 WHERE product_id='hose'",
    );
    await assert.rejects(
      () => f.call("owner", "order.addition.create", request(d, q)),
      /stock/i,
    );
    await f.db.query(
      "UPDATE inventory SET quantity=50 WHERE product_id='hose'",
    );
    await assert.rejects(
      () =>
        f.call("owner", "order.addition.create", {
          ...request(d, q),
          deliveryKobo: 0,
          address: { street: "Other address" },
        }),
      /Unrecognized/,
    );
    await f.db.query(
      "UPDATE orders SET payment_status='verified' WHERE id=$1",
      [o.id],
    );
    await assert.rejects(
      () => f.call("owner", "order.addition.quote", d),
      /unpaid/,
    );
    assert.equal(
      (await one(f.db, "SELECT count(*) n FROM order_additions"))!.n,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ADD-05: gas additions use configured pricing and reservations and require fresh inspection before dispatch", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "UPDATE settings SET value=$1 WHERE key='gas.quantity_policy'",
      [
        JSON.stringify({
          minimumKg: 1,
          maximumKg: 25,
          incrementKg: 0.5,
          precision: 1,
          capacitiesKg: [6, 12.5, 25],
        }),
      ],
    );
    await f.db.query(
      "UPDATE gas_stock SET grams=100000,reserved_grams=0 WHERE branch_id='lagos'",
    );
    const o = await f.make(),
      d = { orderId: o.id, items: [], gasLines: [{ capacityKg: 6, kg: 3 }] },
      q = await f.call("owner", "order.addition.quote", d);
    await f.call("owner", "order.addition.create", request(d, q));
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT reserved_grams FROM gas_stock WHERE branch_id='lagos'",
        ))!.reserved_grams,
      ),
      3000,
    );
    const line = await one(
      f.db,
      "SELECT * FROM order_gas_lines WHERE order_id=$1",
      [o.id],
    );
    assert.equal(line!.inspected_at, null);
    assert.match(
      (await one(f.db, "SELECT operational_review FROM orders WHERE id=$1", [
        o.id,
      ]))!.operational_review,
      /inspection/,
    );
    for (const s of ["accepted", "preparing"]) await f.transition(o, s);
    await assert.rejects(
      () => f.transition(o, "assigned"),
      /inspection|coverage|cylinder|review/i,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ADD-UI: staff detail exposes quote/confirmation and history without customer or driver controls", async () => {
  const source = await readFile(
    "apps/web/components/order-additions.tsx",
    "utf8",
  );
  assert.match(source, /\["owner",\s*"manager"\]/);
  assert.match(source, /if\s*\(!allowed\)\s*return null/);
  assert.match(source, /order.addition.quote/);
  assert.match(source, /quoteHash:\s*quote.quoteHash/);
  assert.match(source, /Confirm addition with no extra delivery fee/);
  const admin = await readFile("apps/web/components/admin.tsx", "utf8");
  assert.match(admin, /section === "orders" && <OrderAdditions/);
});
test("ADD-06: invoicing, loading and any prior delivery attempt close additions even if a status is reset", async () => {
  const f = await fixture();
  try {
    const o = await f.assigned();
    await f.db.query(
      "UPDATE orders SET status='preparing',driver_id=NULL WHERE id=$1",
      [o.id],
    );
    await assert.rejects(
      () => f.call("owner", "order.addition.quote", draft(o)),
      /dispatch|loading|financial/,
    );
    const inv = await f.make();
    await f.db.query(
      "INSERT INTO customer_invoices(id,order_id,customer_id,branch_id,total_kobo,snapshot,issued_by) VALUES($1,$2,$3,'lagos',$4,'{}',$5)",
      [id(), inv.id, f.actors.customer.id, inv.total_kobo, f.actors.owner.id],
    );
    await assert.rejects(
      () => f.call("owner", "order.addition.quote", draft(inv)),
      /financial/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ADD-07: late failure rolls back added quantities, reservations, totals and history together", async () => {
  const f = await fixture();
  try {
    const o = await f.make(),
      d = draft(o),
      q = await f.call("owner", "order.addition.quote", d);
    await f.db.exec(
      "CREATE FUNCTION fail_addition_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic late commit failure'; END $$; CREATE TRIGGER fail_addition_fixture BEFORE INSERT ON order_additions FOR EACH ROW EXECUTE FUNCTION fail_addition_fixture();",
    );
    await assert.rejects(
      () => f.call("owner", "order.addition.create", request(d, q)),
      /Synthetic late/,
    );
    assert.equal(
      Number(
        (await one(f.db, "SELECT total_kobo FROM orders WHERE id=$1", [o.id]))!
          .total_kobo,
      ),
      Number(o.total_kobo),
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT reserved FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
      ))!.reserved,
      1,
    );
    assert.equal(
      (await one(f.db, "SELECT quantity FROM order_items WHERE order_id=$1", [
        o.id,
      ]))!.quantity,
      1,
    );
    assert.equal(
      (await one(f.db, "SELECT count(*) n FROM order_additions"))!.n,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ADD-08: unprepared unpaid card order can be extended without creating a charge, but any prepared payment closes additions", async () => {
  const f = await fixture();
  try {
    const o = await f.make();
    await f.db.query("UPDATE orders SET payment_method='card' WHERE id=$1", [
      o.id,
    ]);
    const d = draft(o),
      q = await f.call("owner", "order.addition.quote", d);
    assert.equal(q.paymentMethod, "card");
    await f.call("owner", "order.addition.create", request(d, q));
    assert.equal(
      (await one(f.db, "SELECT payment_status FROM orders WHERE id=$1", [
        o.id,
      ]))!.payment_status,
      "unpaid",
    );
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM payment_intents"))!.n),
      0,
    );
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM verified_payments"))!.n),
      0,
    );
    const second = await f.make();
    await f.db.query("UPDATE orders SET payment_method='card' WHERE id=$1", [
      second.id,
    ]);
    await f.db.query(
      "INSERT INTO payment_intents(id,customer_id,branch_id,purpose,order_id,request_key,request_hash,obligation_version,quote,email_snapshot,expires_at) VALUES($1,$2,'lagos','order',$3,$4,'hash','version','{}','test@example.test',now()+interval '10 minutes')",
      [id(), f.actors.customer.id, second.id, id()],
    );
    await assert.rejects(
      () => f.call("owner", "order.addition.quote", draft(second)),
      /financial/,
    );
  } finally {
    await f.db.close?.();
  }
});
