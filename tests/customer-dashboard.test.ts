import { before, test } from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one, type DB } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession, digest } from "../apps/web/lib/auth";
import {
  customerNavigation,
  customerGroups,
  customerRoute,
  safeCustomerReturn,
  parseShoppingCart,
} from "../packages/business-rules/src/customer-navigation";
let db: DB;
const actors: Record<string, { id: string; token: string }> = {};
before(async () => {
  db = await createDatabase("memory://");
  await migrate(db);
  for (const role of ["a", "b", "owner"]) {
    const uid = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)",
      [
        uid,
        role,
        `${role}@customer-dashboard.test`,
        hashPassword("Customer-dashboard-test-only-123!"),
        role === "owner" ? "owner" : "customer",
      ],
    );
    actors[role] = { id: uid, token: await issueSession(db, uid) };
  }
});
const call = (who: string, action: string, input: any = {}) =>
  dispatch(action, actors[who]?.token ?? null, input, db);
async function order(
  who: string,
  status: string,
  payment = "unpaid",
  days = 0,
) {
  const oid = id();
  await db.query(
    "INSERT INTO orders(id,reference,customer_id,branch_id,status,payment_status,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash,delivery_code_hash,delivery_code_expires_at,delivered_at) VALUES($1,$1,$2,'lagos',$3,$4,'cash',1000,0,1000,'{}','2026-10-30','test',$1,'test','test',now()+interval '1 day',CASE WHEN $3='delivered' THEN now()-($5::int*interval '1 day') ELSE NULL END)",
    [oid, actors[who].id, status, payment, days],
  );
  return oid;
}
test("CD-R: all 15 customer routes are unique and grouped; service descendants and tracking match safely", () => {
  assert.equal(customerNavigation.length, 15);
  assert.equal(new Set(customerNavigation.map((i) => i.href)).size, 15);
  for (const i of customerNavigation) {
    assert.ok(customerGroups.some((g) => g.id === i.group));
    assert.equal(customerRoute(i.href)?.href, i.href);
  }
  assert.equal(customerRoute("/services/cooker-servicing")?.href, "/services");
  assert.equal(customerRoute("/services-evil"), undefined);
  assert.equal(customerRoute("/track")?.href, "/orders");
});
test("CD-D: safe login return rejects external, encoded, admin and malformed destinations", () => {
  for (const v of [
    null,
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/%2f%2fevil.test",
    "/orders\n",
    "/admin",
    "/login",
    "/orders#x",
    "/orders/other",
  ]) {
    assert.equal(safeCustomerReturn(v), "/account");
  }
  assert.equal(
    safeCustomerReturn("/orders?ref=EG-123&redirect=https://evil.test"),
    "/orders?ref=EG-123",
  );
  assert.equal(safeCustomerReturn("/checkout"), "/checkout");
});
test("CD-G,H: shared cart roundtrip preserves quantities through public/account/login navigation without duplicate products", () => {
  const cart = parseShoppingCart(
    '[{"productId":"hose","quantity":2},{"productId":"hose","quantity":4},{"productId":"bad","quantity":0},null]',
  );
  assert.deepEqual(cart, [{ productId: "hose", quantity: 2 }]);
  assert.deepEqual(parseShoppingCart(JSON.stringify(cart)), cart);
  assert.deepEqual(parseShoppingCart("broken"), []);
});
test("CD-J: empty dashboard has zero actual counts and no fabricated records", async () => {
  assert.deepEqual(
    (await call("a", "customer.dashboard", { widget: "orders" })).counts,
    [],
  );
  for (const widget of ["activity", "history"])
    assert.deepEqual(await call("a", "customer.dashboard", { widget }), []);
  const nav = await call("a", "customer.dashboard", { widget: "navigation" });
  assert.deepEqual(nav.counts, {
    notifications: 0,
    orders: 0,
    bookings: 0,
    support: 0,
  });
  assert.equal(nav.address, null);
  const wallet = await call("a", "wallet");
  assert.equal(wallet.balanceKobo, 0);
  assert.equal(wallet.points, 0);
  assert.deepEqual(await call("a", "schedules"), []);
});
test("CD-I,K,V,Z: order summary, actual unread counts, activity and strict identity ownership", async () => {
  await order("a", "placed");
  await order("a", "delivered");
  await order("a", "cancelled");
  await order("b", "preparing");
  const note = id();
  await db.query(
    "INSERT INTO notifications(id,user_id,title,body) VALUES($1,$2,'Test notice','Owned notification')",
    [note, actors.a.id],
  );
  await db.query(
    "INSERT INTO notifications(id,user_id,title,body) VALUES($1,$2,'Other customer','Private')",
    [id(), actors.b.id],
  );
  const r = await call("a", "customer.dashboard", { widget: "orders" });
  assert.equal(
    r.counts.reduce((n: number, r: any) => n + r.count, 0),
    3,
  );
  assert.equal(
    r.counts.some((r: any) => r.status === "preparing"),
    false,
  );
  const nav = await call("a", "customer.dashboard", { widget: "navigation" });
  assert.equal(nav.counts.notifications, 1);
  assert.equal(nav.counts.orders, 1);
  await call("b", "notifications.read", { id: note });
  assert.equal(
    (await call("a", "customer.dashboard", { widget: "navigation" })).counts
      .notifications,
    1,
  );
  await call("a", "notifications.read", { id: note });
  assert.equal(
    (await call("a", "customer.dashboard", { widget: "navigation" })).counts
      .notifications,
    0,
  );
  const activity = await call("a", "customer.dashboard", {
    widget: "activity",
  });
  assert.equal(activity.length, 3);
  assert.equal(new Set(activity.map((a: any) => a.id)).size, 3);
  assert.ok(activity.every((a: any) => a.href === "/orders"));
  for (const widget of ["orders", "history", "activity", "navigation"]) {
    await assert.rejects(() =>
      call("a", "customer.dashboard", { widget, customerId: actors.b.id }),
    );
    await assert.rejects(() => call("owner", "customer.dashboard", { widget }));
    await assert.rejects(() =>
      call("absent", "customer.dashboard", { widget }),
    );
  }
});
test("CD-L,M,Z: authoritative wallet/reward entries include reversals and remain customer-owned", async () => {
  const entry = id();
  await db.query(
    "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES($1,$2,10000,'test',$1)",
    [entry, actors.a.id],
  );
  await db.query(
    "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference,reversal_of) VALUES($1,$2,-4000,'test',$1,$3)",
    [id(), actors.a.id, entry],
  );
  await db.query(
    "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES($1,$2,900000,'test',$1)",
    [id(), actors.b.id],
  );
  for (const points of [20, -5])
    await db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,$3,$1)",
      [id(), actors.a.id, points],
    );
  const result = await call("a", "wallet");
  assert.equal(result.balanceKobo, 6000);
  assert.equal(result.points, 15);
  assert.ok(result.entries.every((r: any) => r.customer_id === actors.a.id));
});
test("CD-O,Q: verified delivered history excludes unpaid/cancelled/other accounts and counts each gas line once", async () => {
  for (const [who, status, payment, verified] of [
    ["a", "delivered", "verified", true],
    ["a", "delivered", "verified", false],
    ["a", "cancelled", "verified", true],
    ["b", "delivered", "verified", true],
  ] as const) {
    const oid = await order(who, status, payment);
    await db.query(
      "INSERT INTO order_gas_lines(id,order_id,capacity_grams,grams,unit_price_kobo,subtotal_kobo,pricing_version) VALUES($1,$2,12500,6000,100,600,1)",
      [id(), oid],
    );
    if (verified)
      await db.query(
        "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,1000,'cash',$3)",
        [id(), oid, actors.owner.id],
      );
  }
  const history = await call("a", "customer.dashboard", { widget: "history" });
  assert.equal(history.length, 1);
  assert.equal(Number(history[0].kg), 6);
  assert.ok(history[0].date);
  const before = await call("a", "customer.dashboard", { widget: "activity" });
  await db.query(
    "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,1,$1)",
    [id(), actors.a.id],
  );
  const after = await call("a", "customer.dashboard", { widget: "activity" });
  assert.ok(after.some((a: any) => a.title === "Reward points earned"));
  assert.ok(
    after.every(
      (a: any, i: number) =>
        i === 0 || new Date(after[i - 1].created_at) >= new Date(a.created_at),
    ),
  );
  assert.ok(before.length);
});
test("CD-U,Z: default address comes only from active owned backend locations", async () => {
  const a = await call("a", "address.save", {
    label: "QA Home",
    street: "12 Synthetic Test Road",
    zone: "Lekki",
    phone: "08012345678",
    isDefault: true,
  });
  await call("a", "address.default", { id: a.id });
  let nav = await call("a", "customer.dashboard", { widget: "navigation" });
  assert.equal(nav.address.id, a.id);
  assert.equal(
    (await call("b", "customer.dashboard", { widget: "navigation" })).address,
    null,
  );
  await assert.rejects(() => call("b", "address.default", { id: a.id }));
  await db.query("UPDATE delivery_locations SET active=false WHERE id=$1", [
    nav.address.location_id,
  ]);
  assert.equal(
    (await call("a", "customer.dashboard", { widget: "navigation" })).address,
    null,
  );
});
test("CD-E,F: revoked and expired sessions cannot retrieve any dashboard source", async () => {
  const token = await issueSession(db, actors.a.id);
  await db.query(
    "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE id=$1",
    [digest(token)],
  );
  await assert.rejects(() =>
    dispatch("customer.dashboard", token, { widget: "orders" }, db),
  );
  const revoked = await issueSession(db, actors.a.id);
  await dispatch("logout", revoked, {}, db);
  for (const action of [
    "me",
    "wallet",
    "orders",
    "schedules",
    "refill.profiles",
    "customer.dashboard",
  ])
    await assert.rejects(() =>
      dispatch(action, revoked, { widget: "orders" }, db),
    );
});
test("CD-Y: refill source failure does not prevent independent orders, wallet or history responses", async () => {
  const failing: DB = {
    ...db,
    query: db.query.bind(db),
    exec: db.exec.bind(db),
    transaction: (fn) =>
      db.transaction((tx) =>
        fn({
          ...tx,
          query: (sql, params) => {
            if (sql.includes("FROM consumption_profiles"))
              throw new Error("Synthetic refill outage");
            return tx.query(sql, params);
          },
          exec: tx.exec.bind(tx),
        }),
      ),
  };
  await assert.rejects(
    () => dispatch("refill.profiles", actors.a.token, {}, failing),
    /Synthetic refill outage/,
  );
  assert.ok(await dispatch("wallet", actors.a.token, {}, failing));
  assert.ok(
    await dispatch(
      "customer.dashboard",
      actors.a.token,
      { widget: "orders" },
      failing,
    ),
  );
  assert.ok(
    Array.isArray(
      await dispatch(
        "customer.dashboard",
        actors.a.token,
        { widget: "history" },
        failing,
      ),
    ),
  );
});
test("CD-Z: browser-supplied customer IDs cannot widen existing customer API reads", async () => {
  for (const action of [
    "orders",
    "wallet",
    "schedules",
    "refill.profiles",
    "account.profile",
    "support.list",
    "bookings",
  ]) {
    const own = await call("a", action);
    try {
      const tampered = await call("a", action, { customerId: actors.b.id });
      assert.deepEqual(tampered, own);
    } catch (e: any) {
      assert.notEqual(e.name, "AssertionError");
      assert.ok(e.status === 400 || e.name === "ZodError");
    }
  }
  const me = await call("a", "me");
  assert.equal(me.user.id, actors.a.id);
  assert.ok(me.notifications.every((n: any) => n.user_id === actors.a.id));
});
test("CD-63: customer overview query timing is measured on isolated local database", async () => {
  const samples = [];
  for (let i = 0; i < 10; i++) {
    const start = performance.now();
    await call("a", "customer.dashboard", { widget: "orders" });
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      measurement: "local PGlite order summary milliseconds",
      samples: 10,
      median: samples[5],
      max: samples[9],
    }),
  );
  assert.equal(samples.length, 10);
});
test("CD-N: all five feedback states are owned; snooze and self-reports suppress obsolete reminders without manufacturing purchases", async () => {
  async function profile(who: string, history = false) {
    const uid = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role) VALUES($1,'Feedback QA',$2,$3,'customer')",
      [
        uid,
        `${uid}@feedback.test`,
        hashPassword("Customer-dashboard-test-only-123!"),
      ],
    );
    actors[who] = { id: uid, token: await issueSession(db, uid) };
    await call(who, "preferences.save", {
      marketing: false,
      refillReminders: true,
      quietStart: 0,
      quietEnd: 0,
    });
    if (history) for (const days of [42, 28, 14]) await verified(who, days);
    return call(who, "refill.profile.create", {
      productId: "refill-12",
      label: "Test cylinder",
      householdSize: 2,
      cookingDays: 7,
    });
  }
  async function verified(who: string, days: number) {
    const oid = await order(who, "delivered", "verified", days);
    await db.query(
      "INSERT INTO order_gas_lines(id,order_id,capacity_grams,grams,unit_price_kobo,subtotal_kobo,pricing_version) VALUES($1,$2,12500,12500,80,1000,1)",
      [id(), oid],
    );
    await db.query(
      "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,1000,'test',$3)",
      [id(), oid, actors.owner.id],
    );
  }
  const c = await profile("c", true);
  let p = (await call("c", "refill.profiles"))[0];
  assert.equal(p.forecast.available, true);
  assert.equal(p.forecast.daysLeft, 0);
  assert.equal(p.history.length, 3);
  await assert.rejects(() =>
    call("b", "refill.feedback", {
      profileId: c.id,
      state: "already_refilled",
    }),
  );
  await call("c", "refill.feedback", {
    profileId: c.id,
    state: "remind_later",
  });
  p = (await call("c", "refill.profiles"))[0];
  assert.equal(p.reminderState.suppressReminder, true);
  assert.equal(p.forecast.available, true);
  await assert.rejects(
    () =>
      call("c", "refill.feedback", {
        profileId: c.id,
        state: "already_refilled",
      }),
    /wait an hour/,
  );
  await call("owner", "reauth", {
    password: "Customer-dashboard-test-only-123!",
  });
  await call("owner", "jobs.run");
  assert.equal(
    Number(
      (
        await one(
          db,
          "SELECT count(*) AS n FROM notifications WHERE user_id=$1 AND title='Estimated refill approaching'",
          [actors.c.id],
        )
      )?.n,
    ),
    0,
  );
  const d = await profile("d", true);
  await db.query(
    "INSERT INTO consumption_feedback(id,profile_id,state,created_at) VALUES($1,$2,'remind_later',now()-interval '25 hours')",
    [id(), d.id],
  );
  await call("owner", "jobs.run");
  assert.equal(
    Number(
      (
        await one(
          db,
          "SELECT count(*) AS n FROM notifications WHERE user_id=$1 AND title='Estimated refill approaching' AND read_at IS NULL",
          [actors.d.id],
        )
      )?.n,
    ),
    1,
  );
  await call("d", "refill.feedback", {
    profileId: d.id,
    state: "already_refilled",
  });
  p = (await call("d", "refill.profiles"))[0];
  assert.equal(p.forecast.available, false);
  assert.equal(p.reminderState.suppressPrediction, true);
  assert.equal(p.history.length, 3);
  assert.equal((await call("d", "wallet")).balanceKobo, 0);
  assert.equal(
    Number(
      (
        await one(
          db,
          "SELECT count(*) AS n FROM notifications WHERE user_id=$1 AND title='Estimated refill approaching' AND read_at IS NULL",
          [actors.d.id],
        )
      )?.n,
    ),
    0,
  );
  await verified("d", 0);
  p = (await call("d", "refill.profiles"))[0];
  assert.equal(p.history.length, 4);
  assert.equal(p.reminderState.suppressPrediction, false);
  assert.equal(p.forecast.available, true);
  for (const state of ["still_available", "low", "empty"]) {
    const fresh = await profile(state);
    await call(state, "refill.feedback", { profileId: fresh.id, state });
    assert.equal(
      (await call(state, "refill.profiles"))[0].feedback[0].state,
      state,
    );
  }
  await assert.rejects(() =>
    call("c", "refill.feedback", { profileId: c.id, state: "invented" }),
  );
});
