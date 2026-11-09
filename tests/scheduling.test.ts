import { before, test } from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one, type DB } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
let db: DB;
const tokens: Record<string, string> = {},
  ids: Record<string, string> = {};
const password = "Scheduling-test-only-123!";
before(async () => {
  db = await createDatabase("memory://");
  await migrate(db);
  await db.query("UPDATE delivery_locations SET coverage='Synthetic district boundary confirmed for test fixtures only'");
  await db.query("UPDATE settings SET value=$1 WHERE key='gas.quantity_policy'",[JSON.stringify({minimumKg:0.5,maximumKg:50,incrementKg:0.5,precision:1,capacitiesKg:[3,6,12.5,25,50]})]);
  await db.query("UPDATE gas_stock SET grams=600000");
  const hash = hashPassword(password);
  for (const role of ["owner", "manager", "customer"]) {
    ids[role] = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,$2,$3,$4,$5,'lagos')",
      [ids[role], `Test ${role}`, `${role}@scheduling.test`, hash, role],
    );
    tokens[role] = await issueSession(db, ids[role]);
  }
  await db.query(
    "UPDATE inventory SET quantity=100,price_kobo=750000,published=true WHERE branch_id='lagos' AND product_id='refill-6'",
  );
  await db.query(
    "UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','payment.cod','subscription.enabled') AND scope='lagos'",
  );
  await db.query(
    "UPDATE settings SET value=$1 WHERE key='delivery.windows' AND scope='lagos'",
    [JSON.stringify("00:00–23:59")],
  );
});
const call = (role: string, action: string, input: any = {}) =>
  dispatch(action, tokens[role], input, db);
async function plan(max = 2000000) {
  const s = await call("customer", "schedule.create", {
    productId: "refill-6",
    intervalDays: 28,
    nextDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  });
  await call("customer", "reauth", { password });
  await call("customer", "schedule.authorise", {
    scheduleId: s.id,
    address: {
      name: "Test person",
      phone: "08012345678",
      street: "12 Test Avenue",
      zone: "Lekki",
    },
    window: "00:00–23:59",
    quantity: 1,
    maximumTotalKobo: max,
    consent: true,
  });
  await db.query(
    "UPDATE refill_schedules SET next_date=(now() AT TIME ZONE 'Africa/Lagos')::date WHERE id=$1",
    [s.id],
  );
  return s;
}
test("authorised recurring COD creates a real order once and advances the plan", async () => {
  const p = await plan();
  await call("owner", "reauth", { password });
  const r = await call("owner", "jobs.run");
  assert.equal(r.recurringCreated, 1);
  assert.equal((await call("owner", "jobs.run")).recurringCreated, 0);
  const occurrence = await one(
    db,
    "SELECT * FROM schedule_occurrences WHERE schedule_id=$1",
    [p.id],
  );
  assert.equal(occurrence!.status, "created");
  const order = await one(db, "SELECT * FROM orders WHERE id=$1", [
    occurrence!.order_id,
  ]);
  assert.equal(order!.payment_method, "cash_on_delivery");
  assert.equal(order!.payment_status, "unpaid");
  assert.equal(Number(order!.total_kobo), 1580000);
});
test("price ceiling failure does not reserve stock or create a payment and does not repeat endlessly", async () => {
  const p = await plan(500000),
    before = await one(
      db,
      "SELECT reserved FROM inventory WHERE product_id='refill-6' AND branch_id='lagos'",
    );
  const r = await call("owner", "jobs.run");
  assert.equal(r.recurringFailed, 1);
  assert.equal(
    (await one(
      db,
      "SELECT status FROM schedule_occurrences WHERE schedule_id=$1",
      [p.id],
    ))!.status,
    "failed",
  );
  assert.equal(
    (await one(
      db,
      "SELECT reserved FROM inventory WHERE product_id='refill-6' AND branch_id='lagos'",
    ))!.reserved,
    before!.reserved,
  );
  assert.equal((await call("owner", "jobs.run")).recurringFailed, 0);
});
test("revocation prevents future automatic orders", async () => {
  const p = await plan(),
    a = (await call("customer", "schedule.authorisations")).find(
      (a: any) => a.schedule_id === p.id,
    );
  await call("customer", "schedule.revoke", { id: a.id });
  assert.equal((await call("owner", "jobs.run")).recurringCreated, 0);
  assert.equal(
    await one(db, "SELECT id FROM schedule_occurrences WHERE schedule_id=$1", [
      p.id,
    ]),
    undefined,
  );
});
test("delivery capacity rejects overbooking before additional stock reservations", async () => {
  await db.query(
    "UPDATE settings SET value='1' WHERE key='delivery.capacity' AND scope='lagos'",
  );
  await db.query("UPDATE inventory SET published=true,price_kobo=750000,quantity=100 WHERE product_id='hose'");
  const input = {
    items: [{ productId: "hose", quantity: 1 }],
    address: {
      name: "Test person",
      phone: "08012345678",
      street: "12 Test Avenue",
      zone: "Lekki",
    },
    date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    window: "00:00–23:59",
    idempotencyKey: id(),
  };
  await call("customer", "checkout", input);
  await assert.rejects(
    () => call("customer", "checkout", { ...input, idempotencyKey: id() }),
    /fully booked/,
  );
});
test("campaigns require independent approval, consent at delivery and deduplicate in-app delivery", async () => {
  await call("customer", "preferences.save", {
    marketing: true,
    refillReminders: true,
    quietStart: 0,
    quietEnd: 0,
  });
  const c = await call("manager", "campaign.create", {
    branchId: "lagos",
    title: "Test opted-in offer",
    body: "A test-only campaign for opted-in customers.",
    segment: "all",
  });
  await call("manager", "reauth", { password });
  await assert.rejects(
    () =>
      call("manager", "campaign.decide", { id: c.id, decision: "approved" }),
    /different authorised/,
  );
  await call("owner", "reauth", { password });
  await call("owner", "campaign.decide", { id: c.id, decision: "approved" });
  await call("owner", "jobs.run");
  await call("owner", "jobs.run");
  assert.equal(
    Number(
      (await one(
        db,
        "SELECT count(*) AS n FROM notifications WHERE related_id=$1 AND user_id=$2",
        [c.id, ids.customer],
      ))!.n,
    ),
    1,
  );
  const withdrawn = await call("manager", "campaign.create", {
    branchId: "lagos",
    title: "Test withdrawal of consent",
    body: "This message must not be delivered after opt-out.",
    segment: "all",
  });
  await call("owner", "campaign.decide", {
    id: withdrawn.id,
    decision: "approved",
  });
  await call("customer", "preferences.save", {
    marketing: false,
    refillReminders: true,
    quietStart: 0,
    quietEnd: 0,
  });
  await call("owner", "jobs.run");
  assert.equal(
    Number(
      (await one(
        db,
        "SELECT count(*) AS n FROM notifications WHERE related_id=$1",
        [withdrawn.id],
      ))!.n,
    ),
    0,
  );
});
