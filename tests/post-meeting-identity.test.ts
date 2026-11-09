import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession, digest } from "../apps/web/lib/auth";
import { normaliseCustomerPhone } from "../packages/business-rules/src/customer-identity";
test("PM-T01: opaque immutable customer IDs, phone lookup, duplicate detection and branch privacy", async () => {
  const db = await createDatabase("memory://");
  await migrate(db);
  try {
    const tokens: Record<string, string> = {};
    for (const role of ["owner", "manager", "sales", "customer"]) {
      const uid = id();
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,'lagos')",
        [
          uid,
          role,
          uid + "@test.invalid",
          hashPassword("Fixture-password-123!"),
          role,
        ],
      );
      tokens[role] = await issueSession(db, uid);
    }
    const call = (role: string, action: string, input: any = {}) =>
      dispatch(action, tokens[role], input, db);
    assert.equal(normaliseCustomerPhone("0802 111 1118"), "+2348021111118");
    assert.equal(normaliseCustomerPhone("+1 2025550100"), null);
    const c = await call("sales", "customers.provisional", {
      name: "Fixture caller",
      phone: "08021111118",
      branchId: "lagos",
    });
    assert.match(c.public_customer_id, /^EGC-[A-F0-9]{32}$/);
    assert.equal(c.provisional, true);
    assert.equal(
      (await call("manager", "customers.lookup", { query: "+2348021111118" }))
        .customers[0].id,
      c.id,
    );
    assert.equal(
      (await call("owner", "customers.lookup", { query: c.public_customer_id }))
        .customers[0].id,
      c.id,
    );
    await assert.rejects(() =>
      call("customer", "customers.lookup", { query: "08021111118" }),
    );
    await assert.rejects(
      () =>
        call("sales", "customers.provisional", {
          name: "Duplicate",
          phone: "+2348021111118",
          branchId: "lagos",
        }),
      /already/,
    );
    await assert.rejects(
      () =>
        db.query(
          "UPDATE users SET public_customer_id='EGC-00000000000000000000000000000000' WHERE id=$1",
          [c.id],
        ),
      /immutable/,
    );
    const other = id();
    await db.query("INSERT INTO branches(id,name) VALUES('pm-other','Other')");
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id,contact_phone) VALUES($1,'Other',$2,'unusable','customer','pm-other','+2348031111111')",
      [other, other + "@test.invalid"],
    );
    assert.equal(
      (await call("manager", "customers.lookup", { query: "08031111111" }))
        .customers.length,
      0,
    );
    const legacy = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Legacy',$2,'unusable','customer','lagos')",
      [legacy, legacy + "@test.invalid"],
    );
    await db.query(
      "INSERT INTO account_addresses(id,customer_id,label,street,zone,phone) VALUES($1,$2,'Home','10 Fixture Road','Lekki','08021111118')",
      [id(), legacy],
    );
    const dup = await call("owner", "customers.lookup", {
      query: "08021111118",
    });
    assert.equal(dup.duplicate, true);
    assert.equal(dup.customers.length, 2);
    const before = (await one(db, "SELECT count(*) AS n FROM users"))!.n;
    await migrate(db);
    assert.equal((await one(db, "SELECT count(*) AS n FROM users"))!.n, before);
  } finally {
    await db.close?.();
  }
});
test("PM-T09: assisted checkout preserves customer identity, operator attribution, one fee, retry and failure rollback", async () => {
  const db = await createDatabase("memory://");
  await migrate(db);
  try {
    const ids: Record<string, string> = {},
      tokens: Record<string, string> = {};
    for (const role of ["owner", "manager", "sales", "customer"]) {
      ids[role] = id();
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,'unusable',$2,'lagos')",
        [ids[role], role, role + "@pm.test"],
      );
      tokens[role] = await issueSession(db, ids[role]);
    }
    const call = (role: string, action: string, input: any = {}) =>
      dispatch(action, tokens[role], input, db);
    await db.query(
      "UPDATE settings SET value='true'::jsonb WHERE key IN ('delivery.enabled','payment.cod')",
    );
    await db.query(
      "UPDATE delivery_locations SET coverage='Fixture approved delivery boundary, test only' WHERE branch_id='lagos'",
    );
    const p = (await one(
      db,
      "SELECT product_id FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.category NOT IN ('Gas refills','Empty cylinders') LIMIT 1",
    ))!;
    await db.query(
      "UPDATE inventory SET published=true,quantity=5,price_kobo=350000 WHERE branch_id='lagos' AND product_id=$1",
      [p.product_id],
    );
    const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const windows = (await one(
      db,
      "SELECT value FROM settings WHERE key='delivery.windows' AND scope='lagos'",
    ))!.value;
    const input = {
      customerId: ids.customer,
      reason: "Customer called and requested home delivery",
      checkout: {
        items: [{ productId: p.product_id, quantity: 2 }],
        address: {
          name: "Fixture customer",
          phone: "08021111118",
          street: "10 Fictional Road",
          zone: "Lekki",
        },
        date,
        window: String(windows).split(",")[0].trim(),
        paymentMethod: "cash_on_delivery",
        idempotencyKey: id(),
      },
    };
    const result = await call("sales", "order.assisted.create", input);
    assert.equal(result.customer_id, ids.customer);
    assert.equal(result.assisted_by, ids.sales);
    assert.equal(result.order_source, "PHONE_ASSISTED");
    assert.equal(result.delivery_code_hash, undefined);
    const fee = (await one(
      db,
      "SELECT value FROM settings WHERE key='delivery.fee' AND scope='lagos'",
    ))!.value;
    assert.equal(Number(result.delivery_kobo), Number(fee));
    assert.equal(
      (await call("sales", "order.assisted.create", input)).id,
      result.id,
    );
    await assert.rejects(
      () => call("manager", "order.assisted.create", input),
      /reference|cart/,
    );
    await assert.rejects(() =>
      call("customer", "order.assisted.create", input),
    );
    await assert.rejects(
      () =>
        call("sales", "order.assisted.create", {
          ...input,
          checkout: {
            ...input.checkout,
            idempotencyKey: id(),
            paymentMethod: "wallet",
          },
        }),
      /authorisation/,
    );
    await assert.rejects(
      () =>
        db.query("UPDATE orders SET order_source='WEB' WHERE id=$1", [
          result.id,
        ]),
      /immutable|constraint/,
    );
    await db.query("UPDATE branches SET active=false WHERE id='lagos'");
    await assert.rejects(
      () =>
        call("sales", "order.assisted.create", {
          ...input,
          checkout: { ...input.checkout, idempotencyKey: id() },
        }),
      /branch/,
    );
    assert.equal(
      Number((await one(db, "SELECT count(*) AS n FROM orders"))!.n),
      1,
    );
    assert.ok(
      await one(
        db,
        "SELECT * FROM audit_events WHERE action='order.phone_assisted'",
      ),
    );
  } finally {
    await db.close?.();
  }
});
test("PM-T08: legacy checkout retry fingerprints survive the added source metadata", async () => {
  const { checkoutSchema } = await import("../apps/web/lib/operations");
  const { digest } = await import("../apps/web/lib/auth");
  const db = await createDatabase("memory://");
  await migrate(db);
  try {
    const uid = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Legacy',$2,'unusable','customer','lagos')",
      [uid, uid + "@test.invalid"],
    );
    const token = await issueSession(db, uid),
      key = id(),
      oid = id();
    const original = {
      items: [{ productId: "hose", quantity: 1 }],
      address: {
        name: "Legacy customer",
        phone: "08021111118",
        street: "10 Fixture Road",
        zone: "Lekki",
      },
      date: "2026-11-06",
      window: "09:00–12:00",
      instructions: "",
      idempotencyKey: key,
    };
    const parsed = checkoutSchema.parse(original);
    const oldHash = digest(
      JSON.stringify({
        ...parsed,
        source: undefined,
        idempotencyKey: undefined,
      }),
    );
    await db.query(
      "INSERT INTO orders(id,reference,customer_id,branch_id,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash) VALUES($1,$1,$2,'lagos','fixture',now()+interval '1 day','cash',100000,500000,600000,'{}','2026-11-06','AM',$3,$4)",
      [oid, uid, key, oldHash],
    );
    const result = await dispatch(
      "checkout",
      token,
      { ...original, source: "MOBILE" },
      db,
    );
    assert.equal(result.id, oid);
    assert.equal(result.order_source, "LEGACY");
    assert.equal(
      Number((await one(db, "SELECT count(*) AS n FROM orders"))!.n),
      1,
    );
  } finally {
    await db.close?.();
  }
});
test("PM-T10: assisted product quote uses branch prices and one fee, rejects stale totals and never reserves during review", async () => {
  const { fixture } = await import("./helpers/order-tracking-fixture");
  const f = await fixture();
  try {
    const checkout = {
      items: [{ productId: "hose", quantity: 2 }],
      address: {
        name: "Fixture caller",
        phone: "08021111118",
        street: "10 Fixture Road",
        zone: "Lekki",
      },
      date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      window: "14:00–18:00",
      paymentMethod: "cash_on_delivery",
      idempotencyKey: id(),
    };
    const quote = await f.call("owner", "order.assisted.quote", checkout);
    assert.equal(quote.physicalSubtotalKobo, 700000);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
        ))!.reserved,
      ),
      0,
    );
    await assert.rejects(() =>
      f.call("customer", "order.assisted.quote", checkout),
    );
    const input = {
      customerId: f.actors.customer.id,
      reason: "Customer reviewed the phone quotation",
      checkout: {
        ...checkout,
        pricing: {
          priceVersion: quote.priceVersion,
          feeVersion: quote.feeVersion,
          policyVersion: quote.policyVersion,
          totalKobo: quote.physicalSubtotalKobo + quote.deliveryKobo,
        },
      },
    };
    await f.db.query(
      "UPDATE inventory SET price_kobo=400000 WHERE product_id='hose' AND branch_id='lagos'",
    );
    await assert.rejects(
      () => f.call("owner", "order.assisted.create", input),
      /quotation changed/i,
    );
    assert.equal(
      Number((await one(f.db, "SELECT count(*) AS n FROM orders"))!.n),
      0,
    );
    input.checkout.pricing.totalKobo = 800000 + quote.deliveryKobo;
    const order = await f.call("owner", "order.assisted.create", input);
    assert.equal(Number(order.delivery_kobo), quote.deliveryKobo);
    assert.equal(Number(order.subtotal_kobo), 800000);
  } finally {
    await f.db.close?.();
  }
});
