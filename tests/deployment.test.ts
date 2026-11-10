import { verifiedPickup } from "./helpers/tracking-fixture";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDatabase } from "../apps/web/lib/db";
test("Supabase migration creates an unexposed schema with RLS and a restricted server role", async () => {
  const db = await createDatabase("memory://");
  await db.exec(await readFile("database/bootstrap.sql", "utf8"));
  const tables = (
    await db.query(
      "SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='easygas_private' AND c.relkind='r'",
    )
  ).rows;
  assert.ok(tables.length >= 25);
  assert.ok(tables.every((t) => t.relrowsecurity));
  await db.exec(
    "CREATE ROLE easygas_anonymous NOLOGIN; SET ROLE easygas_anonymous",
  );
  await assert.rejects(
    () => db.query("SELECT * FROM easygas_private.users"),
    /permission denied/,
  );
  await db.exec("RESET ROLE; SET ROLE easygas_server");
  assert.equal(
    (await db.query("SELECT count(*)::int AS n FROM easygas_private.products"))
      .rows[0].n,
    12,
  );
  assert.equal((await db.query("SELECT count(*)::int AS n FROM easygas_private.order_additions")).rows[0].n, 0);
  await assert.rejects(() => db.query("UPDATE easygas_private.order_additions SET reason='forged reason'"), /permission denied/);
  await assert.rejects(
    () => db.query("DELETE FROM easygas_private.users"),
    /permission denied/,
  );
  await assert.rejects(
    () => db.query("UPDATE easygas_private.audit_events SET outcome='forged'"),
    /permission denied/,
  );
  await assert.rejects(
    () => db.query("UPDATE easygas_private.orders SET total_kobo=1"),
    /permission denied/,
  );
  await assert.rejects(
    () =>
      db.query(
        "UPDATE easygas_private.change_requests SET requester_id='forged'",
      ),
    /permission denied/,
  );
  await assert.rejects(
    () => db.query("UPDATE easygas_private.setting_definitions SET risk=1"),
    /permission denied/,
  );
  for (const [table, column] of [
    ["stock_receipts", "unit_cost_kobo"],
    ["expense_events", "amount_kobo"],
    ["stocktake_counts", "counted"],
    ["report_deliveries", "snapshot"],
    ["inventory_operations", "payload"],
  ])
    await assert.rejects(
      () => db.query(`UPDATE easygas_private.${table} SET ${column}=${column}`),
      /permission denied/,
    );
  await db.exec("RESET ROLE");
  assert.equal(
    (
      await db.query(
        "SELECT rolcreaterole,rolsuper,rolcanlogin FROM pg_roles WHERE rolname='easygas_server'",
      )
    ).rows[0].rolcanlogin,
    false,
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name='users'",
      )
    ).rows[0].n,
    0,
  );
});
test("the restricted trusted-server role can run the complete local order-to-cash workflow", async () => {
  const { dispatch } = await import("../apps/web/lib/service");
  const { id, hashPassword, issueSession } = await import(
    "../apps/web/lib/auth"
  );
  const db = await createDatabase("memory://");
  await db.exec(await readFile("database/bootstrap.sql", "utf8"));
  await db.exec("SET search_path TO easygas_private,pg_catalog");
  const password = "Private-schema-test-123!",
    hash = hashPassword(password),
    tokens: Record<string, string> = {},
    ids: Record<string, string> = {};
  for (const role of ["owner", "manager", "finance", "driver"]) {
    const uid = id();
    ids[role] = uid;
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,$2,$3,$4,$5,'lagos')",
      [uid, `Test ${role}`, `${uid}@example.test`, hash, role],
    );
    tokens[role] = await issueSession(db, uid);
  }
  await db.query("UPDATE users SET driver_available=true WHERE id=$1",[ids.driver]);
  await db.query("UPDATE settings SET value='100000' WHERE key='delivery.fee'");
  await db.query(
    "UPDATE delivery_locations SET coverage='Synthetic coverage verified for regression fixtures only'",
  );
  await db.exec("SET ROLE easygas_server");
  const call = (role: string, action: string, input: any = {}) =>
    dispatch(action, tokens[role], input, db);
  const register = await dispatch(
    "register",
    null,
    {
      name: "Private Schema Test Customer",
      email: "private-test@example.test",
      password,
    },
    db,
  );
  tokens.customer = register.token;
  await call("owner", "inventory.receive", {
    productId: "hose",
    quantity: 3,
    reason: "Private schema test receipt",
    reference: id(),
    branchId: "lagos",
  });
  for (const [key, value, requester] of [
    ["price.hose", 750000, "manager"],
    ["publish.hose", true, "manager"],
    ["delivery.enabled", true, "manager"],
    ["payment.cod", true, "finance"],
  ] as const) {
    const request = await call(requester, "setting.propose", {
      key,
      scope: "lagos",
      value,
      version: (
        await db.query(
          "SELECT version FROM settings WHERE key=$1 AND scope='lagos'",
          [key],
        )
      ).rows[0].version,
      reason: "Reviewed isolated deployment acceptance test",
    });
    await call("owner", "approval.decide", {
      id: request.id,
      decision: "approve",
      reason: "Independent test review",
    });
  }
  const order = await call("customer", "checkout", {
    items: [{ productId: "hose", quantity: 1 }],
    address: {
      name: "Test Customer",
      phone: "08012345678",
      street: "12 Private Schema Test Street",
      zone: "Lekki",
    },
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    window: "09:00–12:00",
    instructions: "Isolated test",
    idempotencyKey: id(),
  });
  for (const status of ["accepted", "preparing", "assigned"])
    await call("owner", "order.transition", {
      id: order.id,
      status,
      note: "Private schema workflow verification",
      ...(status === "assigned" ? { driverId: ids.driver } : {}),
    });
  await verifiedPickup(call, order.id);
  await call("driver", "order.transition", {
    id: order.id,
    status: "out_for_delivery",
    note: "Driver verified test pickup",
  });
  const code = (await call("customer", "orders"))[0].confirmation_code;
  await call("driver", "delivery.complete", {
    handover: true,
    orderId: order.id,
    code,
    collectedKobo: 850000,
  });
  const collection = (await call("finance", "cash.collections"))[0];
  await call("finance", "reauth", { password });
  await call("finance", "cash.reconcile", { id: collection.id });
  assert.equal(
    (await call("customer", "orders"))[0].payment_status,
    "verified",
  );
  assert.equal((await call("owner", "dashboard")).revenueKobo, 850000);
  await call("customer", "logout", {});
  await assert.rejects(
    () => call("customer", "me"),
    (error: any) => error.status === 401,
  );
  await db.exec("RESET ROLE");
});

test("the restricted runtime role supports new accounts, catalogue, purchasing, credit, support and maintenance without owner privileges", async () => {
  const { dispatch } = await import("../apps/web/lib/service");
  const { id, hashPassword, issueSession } = await import(
    "../apps/web/lib/auth"
  );
  const db = await createDatabase("memory://");
  await db.exec(await readFile("database/bootstrap.sql", "utf8"));
  await db.exec("SET search_path TO easygas_private,pg_catalog");
  const tokens: Record<string, string> = {},
    ids: Record<string, string> = {},
    password = "Runtime-workflow-test-123!";
  for (const role of ["owner", "manager", "inventory", "finance", "customer"]) {
    ids[role] = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,$2,$3,$4,$5,'lagos')",
      [
        ids[role],
        `Runtime ${role}`,
        `${role}@runtime.test`,
        hashPassword(password),
        role,
      ],
    );
    tokens[role] = await issueSession(db, ids[role]);
  }
  await db.exec("SET ROLE easygas_server");
  const call = (role: string, action: string, input: any = {}) =>
    dispatch(action, tokens[role], input, db);
  await call("customer", "address.save", {
    label: "Home",
    street: "12 Runtime Avenue",
    zone: "Lekki",
    phone: "08012345678",
  });
  assert.equal((await call("customer", "account.profile")).addresses.length, 1);
  await call("owner", "product.save", {
    id: "runtime-product",
    name: "Runtime accessory",
    description: "A test-only runtime product",
    category: "Accessories",
    sizeKg: null,
    asset: "hose",
    safety: "Follow documented safety instructions for this test product.",
  });
  assert.equal(
    (
      await db.query(
        "SELECT risk FROM setting_definitions WHERE key='price.runtime-product'",
      )
    ).rows[0].risk,
    3,
  );
  const supplier = await call("inventory", "supplier.create", {
      branchId: "lagos",
      name: "Runtime supplier",
      contact: "Test-only contact",
    }),
    purchase = await call("inventory", "purchase.create", {
      supplierId: supplier.id,
      productId: "runtime-product",
      quantity: 5,
      unitCostKobo: 10000,
    });
  await call("finance", "reauth", { password });
  await call("owner", "reauth", { password });
  await call("owner", "purchase.update", {
    id: purchase.id,
    status: "approved",
  });
  await call("inventory", "purchase.update", {
    id: purchase.id,
    status: "received",
    invoiceReference: "RUNTIME-INV-1",
  });
  await call("owner", "reauth", { password });
  const credit = await call("finance", "credit.request", {
    customerId: ids.customer,
    amountKobo: 100000,
    receiptReference: "RUNTIME-CREDIT-1",
    reason: "Test independently verified cash receipt",
  });
  await call("owner", "credit.decide", {
    id: credit.id,
    decision: "approved",
    reason: "Independent runtime verification test",
  });
  assert.equal((await call("customer", "wallet")).balanceKobo, 100000);
  await call("customer", "support.create", {
    subject: "Runtime support test",
    message: "Please verify the runtime support workflow.",
  });
  const ticket = (await call("customer", "support.list"))[0];
  await call("manager", "support.reply", {
    id: ticket.id,
    body: "Internal runtime staff-only comment",
    internal: true,
  });
  assert.equal((await call("customer", "support.list"))[0].messages.length, 0);
  await call("customer", "reauth", { password });
  const exported = await call("customer", "account.export");
  assert.equal(exported.profile.id, ids.customer);
  assert.ok(!JSON.stringify(exported).includes("password_hash"));
  await call("owner", "jobs.run");
  assert.equal((await call("owner", "jobs"))[0].status, "completed");
  for (const [table, column, value] of [
    ["support_messages", "body", "'forged'"],
    ["pos_items", "quantity", "999"],
    ["schedule_occurrences", "status", "'failed'"],
    ["reward_redemptions", "points", "999"],
  ])
    await assert.rejects(
      () => db.query(`UPDATE ${table} SET ${column}=${value}`),
      /permission denied|Append-only/,
    );
  await assert.rejects(
    () => db.query("UPDATE credit_requests SET amount_kobo=1"),
    /permission denied/,
  );
  await assert.rejects(
    () => db.query("UPDATE recurring_authorisations SET maximum_total_kobo=1"),
    /permission denied/,
  );
  await db.exec("RESET ROLE");
  await db.close?.();
});
