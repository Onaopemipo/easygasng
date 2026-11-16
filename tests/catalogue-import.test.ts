import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { seed } from "../apps/web/lib/seed";
import { dispatch } from "../apps/web/lib/service";
import { hashPassword, id } from "../apps/web/lib/auth";
const requested: Record<string, number> = {
  "cylinder-empty-6": 2600000,
  "cylinder-empty-12": 4200000,
  "cylinder-empty-25": 6000000,
  "cylinder-empty-50": 11000000,
  "refill-6": 900000,
  "refill-12": 1875000,
  "refill-25": 3750000,
  "refill-50": 7500000,
};
test("requested catalogue prices are exact, separate empty cylinders from refills and never invent stock", async () => {
  const db = await createDatabase("memory://");
  await migrate(db);
  const catalogue = await dispatch("catalogue", null, {}, db);
  assert.equal(catalogue.products.length, 12);
  for (const [pid, price] of Object.entries(requested)) {
    const p = catalogue.products.find((p: any) => p.id === pid);
    assert.equal(Number(p.price_kobo),p.category==='Gas refills'?Number(p.size_kg)*180000:price);
    assert.equal(p.available, 0);
    assert.equal(p.published, true);
    assert.equal(
      p.category,
      pid.startsWith("cylinder-empty-") ? "Empty cylinders" : "Gas refills",
    );
    assert.equal(
      (await one(
        db,
        "SELECT value FROM settings WHERE key=$1 AND scope='lagos'",
        [`price.${pid}`],
      ))!.value,
      price,
    );
  }
  assert.equal(catalogue.orderingEnabled, false);
  assert.equal(catalogue.codEnabled, false);
  assert.equal(
    (await one(
      db,
      "SELECT value FROM settings WHERE key='payment.integration' AND scope='lagos'",
    ))!.value,
    false,
  );
  await db.close?.();
});
test("CATALOGUE-UPGRADE01: upgrade preserves stock, reservations and confirmed order prices and only imports once", async () => {
  const db = await createDatabase("memory://");
  await db.exec(await readFile("database/migrations/001_initial.sql", "utf8"));
  await seed(db);
  for (const [version, file] of [
    ["002", "002_delivery_confirmation.sql"],
    ["004", "004_operations.sql"],
    ["005", "005_commerce.sql"],
    ["007", "007_scheduling.sql"],
    ["009", "009_delegation.sql"],
  ]) {
    await db.exec(await readFile(`database/migrations/${file}`, "utf8"));
    await db.query("INSERT INTO schema_migrations(version) VALUES ($1)", [
      version,
    ]);
  }
  await db.query("INSERT INTO schema_migrations(version) VALUES ('001')");
  await db.query(
    "UPDATE inventory SET quantity=5,price_kobo=700000,published=true WHERE branch_id='lagos' AND product_id='refill-6'",
  );
  await db.query(
    "UPDATE settings SET value='700000' WHERE key='price.refill-6' AND scope='lagos'",
  );
  await db.query(
    "UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','payment.cod','publish.refill-6') AND scope='lagos'",
  );
  // Set up historical records using their original schema. Current registration
  // creates a session using columns introduced after this upgrade starting point.
  const customerId = id();
  const order = { id: id() };
  await db.transaction(async (tx) => {
    await tx.query(
      "INSERT INTO users(id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,'customer')",
      [
        customerId,
        "Catalogue migration test",
        "catalogue-migration@example.test",
        hashPassword("Catalogue-test-only-123!"),
      ],
    );
    await tx.query(
      "INSERT INTO orders(id,reference,customer_id,branch_id,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash) VALUES ($1,$2,$3,'lagos','historical-test-hash',now()+interval '2 days','cash_on_delivery',700000,100000,800000,'{}','2026-10-30','14:00–18:00',$4,'historical-test-request')",
      [order.id, "HISTORICAL-" + order.id, customerId, id()],
    );
    await tx.query(
      "INSERT INTO order_items(order_id,product_id,name,quantity,unit_price_kobo) VALUES ($1,'refill-6','Historical 6kg refill',1,700000)",
      [order.id],
    );
    await tx.query(
      "UPDATE inventory SET reserved=1 WHERE branch_id='lagos' AND product_id='refill-6'",
    );
    await tx.query(
      "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reason,actor_id,reference) VALUES ($1,'lagos','refill-6',1,'reserved','Historical fixture reservation',$2,$3)",
      [id(), customerId, order.id + ":reserve"],
    );
  });
  await migrate(db);
  assert.equal(
    Number(
      (await one(db, "SELECT total_kobo FROM orders WHERE id=$1", [order.id]))!
        .total_kobo,
    ),
    800000,
  );
  assert.equal(
    Number(
      (await one(
        db,
        "SELECT unit_price_kobo FROM order_items WHERE order_id=$1",
        [order.id],
      ))!.unit_price_kobo,
    ),
    700000,
  );
  const stock = await one(
    db,
    "SELECT * FROM inventory WHERE branch_id='lagos' AND product_id='refill-6'",
  );
  assert.equal(stock!.quantity, 5);
  assert.equal(stock!.reserved, 1);
  assert.equal(Number(stock!.price_kobo), 900000);
  assert.equal(
    (await one(
      db,
      "SELECT version FROM settings WHERE key='price.refill-6' AND scope='lagos'",
    ))!.version,
    2,
  );
  await db.query(
    "UPDATE inventory SET price_kobo=950000 WHERE branch_id='lagos' AND product_id='refill-6'",
  );
  await migrate(db);
  assert.equal(
    Number(
      (await one(
        db,
        "SELECT price_kobo FROM inventory WHERE branch_id='lagos' AND product_id='refill-6'",
      ))!.price_kobo,
    ),
    950000,
  );
  assert.equal(
    Number(
      (await one(
        db,
        "SELECT count(*) AS n FROM audit_events WHERE action='catalogue.user_import'",
      ))!.n,
    ),
    1,
  );
  await db.close?.();
});
