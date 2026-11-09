import { before, test } from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one, type DB } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
let db: DB;
const tokens: Record<string, string> = {},
  ids: Record<string, string> = {};
const password = "Workflows-test-only-123!";
before(async () => {
  db = await createDatabase("memory://");
  await migrate(db);
  const hash = hashPassword(password);
  for (const role of [
    "owner",
    "manager",
    "inventory",
    "sales",
    "finance",
    "customer",
    "other",
  ]) {
    const uid = id();
    ids[role] = uid;
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,$2,$3,$4,$5,'lagos')",
      [
        uid,
        `Test ${role}`,
        `${role}@workflow.test`,
        hash,
        role === "other" ? "customer" : role,
      ],
    );
    tokens[role] = await issueSession(db, uid);
  }
});
const call = (role: string, action: string, data: any = {}) =>
  dispatch(action, tokens[role] ?? null, data, db);
test("addresses, preferences and sessions are customer-owned", async () => {
  const a = await call("customer", "address.save", {
    label: "Home",
    street: "12 Test Avenue",
    zone: "Lekki",
    phone: "08012345678",
  });
  await call("other", "address.archive", { id: a.id });
  let profile = await call("customer", "account.profile");
  assert.equal(profile.addresses.length, 1);
  await call("customer", "preferences.save", {
    marketing: false,
    refillReminders: false,
    quietStart: 22,
    quietEnd: 7,
  });
  profile = await call("customer", "account.profile");
  assert.equal(profile.preferences.refill_reminders, false);
  await call("other", "account.session.revoke", { id: profile.sessions[0].id });
  assert.equal((await call("customer", "me")).user.id, ids.customer);
  await call("customer", "address.archive", { id: a.id });
  assert.equal((await call("customer", "account.profile")).addresses.length, 0);
});
test("recovery is non-enumerating, single-use, expires and revokes sessions", async () => {
  const uid = id(),
    email = `${uid}@workflow.test`;
  await db.query(
    "INSERT INTO users(id,name,email,password_hash,role) VALUES ($1,'Recovery test',$2,$3,'customer')",
    [uid, email, hashPassword(password)],
  );
  const token = await issueSession(db, uid);
  assert.deepEqual(
    await dispatch("account.recover", null, { email }, db),
    await dispatch(
      "account.recover",
      null,
      { email: "absent@workflow.test" },
      db,
    ),
  );
  const message = await one(
    db,
    "SELECT body FROM message_outbox WHERE recipient=$1 ORDER BY created_at DESC",
    [email],
  );
  const secret = message!.body.split("#token=")[1];
  assert.equal(
    (await one(
      db,
      "SELECT token_hash FROM account_challenges WHERE user_id=$1",
      [uid],
    ))!.token_hash === secret,
    false,
  );
  await dispatch(
    "account.reset",
    null,
    { token: secret, password: "New-test-password-123!" },
    db,
  );
  await assert.rejects(() => dispatch("me", token, {}, db), /expired/);
  await assert.rejects(
    () => dispatch("account.reset", null, { token: secret, password }, db),
    /already been used/,
  );
  const login = await dispatch(
    "login",
    null,
    { email, password: "New-test-password-123!" },
    db,
  );
  assert.ok(login.token);
});
test("verification cannot be forged, reused or consumed for password reset", async () => {
  await call("customer", "account.verification.send");
  const m = await one(
      db,
      "SELECT body FROM message_outbox WHERE recipient='customer@workflow.test' ORDER BY created_at DESC LIMIT 1",
    ),
    secret = m!.body.split("#token=")[1];
  await assert.rejects(
    () => dispatch("account.reset", null, { token: secret, password }, db),
    /expired/,
  );
  await dispatch("account.verify", null, { token: secret }, db);
  assert.equal((await call("customer", "account.profile")).user.verified, true);
  await assert.rejects(
    () => dispatch("account.verify", null, { token: secret }, db),
    /already been used/,
  );
});
test("support persists replies, hides staff notes and rejects cross-customer access", async () => {
  await call("customer", "support.create", {
    subject: "Test delivery question",
    message: "Please help with my delivery arrangements.",
  });
  const t = (await call("customer", "support.list"))[0];
  await assert.rejects(
    () =>
      call("other", "support.reply", {
        id: t.id,
        body: "Forged other customer message",
      }),
    /not found/,
  );
  await assert.rejects(
    () =>
      call("customer", "support.reply", {
        id: t.id,
        body: "Attempting internal message",
        internal: true,
      }),
    /Internal notes/,
  );
  await call("sales", "support.reply", {
    id: t.id,
    body: "Internal operational notes only",
    internal: true,
  });
  await call("sales", "support.reply", {
    id: t.id,
    body: "Your request is being reviewed.",
  });
  assert.equal((await call("customer", "support.list"))[0].messages.length, 1);
  assert.equal((await call("sales", "support.list"))[0].messages.length, 2);
  await call("sales", "support.update", {
    id: t.id,
    status: "resolved",
    assigneeId: ids.sales,
  });
  await call("sales", "support.update", { id: t.id, status: "closed" });
  await assert.rejects(
    () =>
      call("customer", "support.reply", {
        id: t.id,
        body: "Reply to closed conversation",
      }),
    /Reopen/,
  );
});
test("new products remain unpriced and unpublished with approval definitions", async () => {
  const input = {
    id: "test-new-cylinder",
    name: "Test 9kg refill",
    description: "A test-only product definition",
    category: "Gas refills",
    sizeKg: 9,
    asset: "cylinder",
    safety: "Keep upright and follow documented safety instructions.",
  };
  await assert.rejects(
    () => call("inventory", "product.save", input),
    /Only the owner/,
  );
  await call("owner", "product.save", input);
  const inventory = await one(
    db,
    "SELECT * FROM inventory WHERE product_id=$1",
    [input.id],
  );
  assert.equal(inventory!.published, false);
  assert.equal(inventory!.price_kobo, null);
  assert.equal(inventory!.quantity, 0);
  assert.equal(
    (await one(
      db,
      "SELECT risk FROM setting_definitions WHERE key='price.test-new-cylinder'",
    ))!.risk,
    3,
  );
});
test("supplier purchasing requires independent approval and receives stock once", async () => {
  const supplier = await call("inventory", "supplier.create", {
    branchId: "lagos",
    name: "Test LPG Supplier",
    contact: "Testing contact only",
  });
  const purchase = await call("inventory", "purchase.create", {
    supplierId: supplier.id,
    productId: "hose",
    quantity: 12,
    unitCostKobo: 500000,
  });
  await call("inventory", "reauth", { password });
  await assert.rejects(() =>
    call("inventory", "purchase.update", {
      id: purchase.id,
      status: "approved",
    }),
  );
  await call("owner", "reauth", { password });
  await call("owner", "purchase.update", {
    id: purchase.id,
    status: "approved",
  });
  await call("inventory", "purchase.update", {
    id: purchase.id,
    status: "received",
    invoiceReference: "TEST-INVOICE-001",
  });
  await call("inventory", "purchase.update", {
    id: purchase.id,
    status: "received",
    invoiceReference: "TEST-INVOICE-001",
  });
  assert.equal(
    (await one(
      db,
      "SELECT quantity FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
    ))!.quantity,
    12,
  );
  assert.equal(
    Number(
      (await one(
        db,
        "SELECT count(*) AS n FROM stock_movements WHERE reference=$1",
        [`purchase:${purchase.id}`],
      ))!.n,
    ),
    1,
  );
});
test("cylinder inspections quarantine failures and prevent unsafe filling or custody", async () => {
  const cid = id();
  await db.query(
    "INSERT INTO cylinders(id,branch_id,serial,size_kg,ownership,status,test_due) VALUES ($1,'lagos',$2,6,'company','empty',CURRENT_DATE+30)",
    [cid, `TEST-${cid}`],
  );
  const nextDue = new Date(Date.now() + 365 * 86400000)
    .toISOString()
    .slice(0, 10);
  await call("inventory", "cylinder.inspect", {
    id: cid,
    passed: false,
    notes: "Documented valve fault found during inspection",
    nextDue,
  });
  await assert.rejects(
    () =>
      call("inventory", "cylinder.fill", {
        id: cid,
        reason: "Attempt to fill failed cylinder",
      }),
    /current inspection/,
  );
  await call("owner", "technician.qualify", {
    userId: ids.inventory,
    code: "cylinder_inspection",
    evidence: "Synthetic documented inspector qualification",
    expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
  });
  await call("inventory", "reauth", { password });
  await call("inventory", "cylinder.inspect", {
    id: cid,
    passed: true,
    notes: "Documented retest passed after repair by qualified inspector",
    nextDue,
  });
  await call("inventory", "cylinder.fill", {
    id: cid,
    reason: "Recorded filling by qualified test operator",
  });
  await call("inventory", "cylinder.custody", {
    id: cid,
    customerId: ids.customer,
    reason: "Customer custody handover recorded",
  });
  assert.equal(
    (await one(db, "SELECT customer_id FROM cylinders WHERE id=$1", [cid]))!
      .customer_id,
    ids.customer,
  );
});
test("branch transfers remove source stock and destination receipt is independent and idempotent", async () => {
  await call("owner", "reauth", { password });
  await call("owner", "branch.create", {
    id: "test-branch",
    name: "Test Branch",
  });
  assert.equal(
    (await one(
      db,
      "SELECT value FROM settings WHERE scope='test-branch' AND key='delivery.enabled'",
    ))!.value,
    false,
  );
  const t = await call("owner", "transfer.create", {
    sourceBranch: "lagos",
    destinationBranch: "test-branch",
    productId: "hose",
    quantity: 3,
  });
  const independent = id();
  await db.query(
    "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Independent owner',$2,$3,'owner','lagos')",
    [independent, independent + "@example.test", hashPassword(password)],
  );
  const independentToken = await issueSession(db, independent);
  await dispatch("reauth", independentToken, { password }, db);
  await dispatch(
    "approval.decide",
    independentToken,
    {
      id: t.requestId,
      decision: "approve",
      reason: "Independent transfer review",
    },
    db,
  );
  await call("owner", "transfer.dispatch", {
    id: t.id,
    reason: "Documented physical dispatch",
  });
  await assert.rejects(
    () => call("inventory", "transfer.receive", { id: t.id }),
    /another branch/,
  );
  await assert.rejects(
    () => call("owner", "transfer.receive", { id: t.id }),
    /different receiving/,
  );
  const uid = id();
  await db.query(
    "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,'Receiving tester',$2,$3,'inventory','test-branch')",
    [uid, `${uid}@workflow.test`, hashPassword(password)],
  );
  const token = await issueSession(db, uid);
  await dispatch("reauth", token, { password }, db);
  await dispatch("transfer.receive", token, { id: t.id }, db);
  await dispatch("transfer.receive", token, { id: t.id }, db);
  assert.equal(
    (await one(
      db,
      "SELECT quantity FROM inventory WHERE branch_id='test-branch' AND product_id='hose'",
    ))!.quantity,
    3,
  );
});
test("refill profiles require owned eligible data and report insufficient history honestly", async () => {
  const p = await call("customer", "refill.profile.create", {
    productId: "refill-6",
    label: "Home kitchen",
    householdSize: 3,
    cookingDays: 7,
  });
  await assert.rejects(
    () => call("other", "refill.feedback", { profileId: p.id, state: "empty" }),
    /not found/,
  );
  await call("customer", "refill.feedback", { profileId: p.id, state: "low" });
  const profiles = await call("customer", "refill.profiles");
  assert.equal(profiles[0].forecast.available, false);
  assert.equal(profiles[0].feedback[0].state, "low");
  await assert.rejects(
    () =>
      call("customer", "refill.profile.create", {
        productId: "refill-6",
        label: "Duplicate cylinder",
        householdSize: 3,
        cookingDays: 7,
      }),
    /already uses/,
  );
});
test("staff invitation acceptance cannot grant privileges and suspension revokes live sessions", async () => {
  await call("owner", "reauth", { password });
  await call("owner", "staff.invite", {
    email: "invited@workflow.test",
    name: "Invited test colleague",
    branchId: "lagos",
  });
  const m = await one(
      db,
      "SELECT body FROM message_outbox WHERE recipient='invited@workflow.test'",
    ),
    secret = m!.body.split("#token=")[1];
  await dispatch("invitation.accept", null, { token: secret, password }, db);
  assert.equal(
    (await one(
      db,
      "SELECT role FROM users WHERE email='invited@workflow.test'",
    ))!.role,
    "customer",
  );
  await assert.rejects(
    () => dispatch("invitation.accept", null, { token: secret, password }, db),
    /no longer valid/,
  );
  await call("owner", "staff.suspend", {
    userId: ids.sales,
    reason: "Test suspension with documented approval",
  });
  await assert.rejects(() => call("sales", "me"), /expired/);
  await assert.rejects(
    () =>
      call("owner", "staff.suspend", {
        userId: ids.owner,
        reason: "Attempted self suspension is prohibited",
      }),
    /self suspension/,
  );
});
test("maintenance expires requests, activates scheduled routine values and flags overdue cylinders once", async () => {
  const change = await call("manager", "setting.propose", {
    key: "business.hours",
    scope: "lagos",
    value: "09:00–16:00",
    version: 1,
    reason: "Scheduled test change",
    effectiveAt: new Date(Date.now() + 60000).toISOString(),
  });
  await db.query(
    "UPDATE change_requests SET effective_at=now()-interval '1 minute' WHERE id=$1",
    [change.id],
  );
  await call("owner", "reauth", { password });
  const run = await call("owner", "jobs.run");
  assert.equal(run.activated, 1);
  assert.equal(
    (await one(
      db,
      "SELECT value FROM settings WHERE key='business.hours' AND scope='lagos'",
    ))!.value,
    "09:00–16:00",
  );
  assert.equal((await call("owner", "jobs.run")).activated, 0);
  await assert.rejects(() => call("customer", "jobs.run"));
});

test("product import creates protected drafts and cannot overwrite existing catalogue records", async () => {
  await call("owner", "reauth", { password });
  const input = {
    id: "import-only-test",
    name: "Imported Test Hose",
    description: "Synthetic imported product for regression verification",
    category: "Accessories",
    sizeKg: null,
    asset: "hose",
    safety: "Test safety evidence for synthetic catalogue product.",
  };
  await assert.rejects(
    () => call("inventory", "product.import", input),
    /permission/,
  );
  await call("owner", "product.import", input);
  const stock = await one(db, "SELECT * FROM inventory WHERE product_id=$1", [
    input.id,
  ]);
  assert.equal(stock!.published, false);
  assert.equal(stock!.price_kobo, null);
  assert.equal(stock!.quantity, 0);
  await assert.rejects(
    () =>
      call("owner", "product.import", {
        ...input,
        name: "Should not replace original",
      }),
    /already exists/,
  );
  assert.equal(
    (await one(db, "SELECT name FROM products WHERE id=$1", [input.id]))!.name,
    input.name,
  );
  await assert.rejects(
    () =>
      call("owner", "product.import", {
        ...input,
        id: "import-price-attempt",
        price_kobo: 1,
      }),
    /Unrecognized|unrecognized/,
  );
});

test("catalogue branch browsing enforces current user scope", async () => {
  const scoped = await call("inventory", "products.manage", {});
  assert.deepEqual(
    scoped.branches.map((b: any) => b.id),
    ["lagos"],
  );
  await assert.rejects(
    () => call("inventory", "products.manage", { branchId: "other-branch" }),
    /another branch/,
  );
  const ownerCatalogue = await call("owner", "products.manage", {
    branchId: "lagos",
  });
  assert.ok(ownerCatalogue.products.length > 0);
});
