import { consolidatedRole } from "../packages/business-rules/src/staff-roles";
import { verifiedPickup } from "./helpers/tracking-fixture";
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one, type DB } from "../apps/web/lib/db";
import {
  id,
  hashPassword,
  issueSession,
  digest,
  AppError,
} from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
import { forecast } from "../packages/business-rules/src/forecast";
let db: DB;
const password = "Acceptance-test-only-123!";
const passwordHash = hashPassword(password);
before(async () => {
  db = await createDatabase("memory://");
  await migrate(db);
});
async function fixture() {
  const branch = `branch-${id()}`;
  await db.query("INSERT INTO branches(id,name) VALUES ($1,$2)", [
    branch,
    "Test branch",
  ]);
  await db.query(
    "INSERT INTO settings(key,scope,value) SELECT key,$1,value FROM settings WHERE scope='lagos'",
    [branch],
  );
  await db.query(
    "INSERT INTO inventory(branch_id,product_id) SELECT $1,id FROM products",
    [branch],
  );
  // Governance fixtures start with draft/unpriced branch stock independently of the live catalogue.
  await db.query(
    "UPDATE settings SET value='null'::jsonb WHERE scope=$1 AND key LIKE 'price.%'",
    [branch],
  );
  await db.query(
    "UPDATE settings SET value='false'::jsonb WHERE scope=$1 AND key LIKE 'publish.%'",
    [branch],
  );
  await db.query("UPDATE settings SET value='100000' WHERE key='delivery.fee'");
  await db.query(
    "UPDATE delivery_locations SET coverage='Synthetic coverage verified for regression fixtures only'",
  );
  const users: Record<string, { id: string; token: string }> = {};
  for (const role of [
    "owner",
    "manager",
    "sales",
    "finance",
    "administrator",
    "customer",
    "driver",
    "inventory",
  ]) {
    const uid = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,$2,$3,$4,$5,$6)",
      [uid, `Test ${role}`, `${uid}@example.test`, passwordHash, consolidatedRole(role), branch],
    );
    const token = await issueSession(db, uid);
    users[role] = { id: uid, token };
  }
  const call = (role: string, action: string, input: any = {}) =>
    dispatch(action, users[role].token, input, db);
  const value = (key: string) =>
    one(db, "SELECT * FROM settings WHERE key=$1 AND scope=$2", [key, branch]);
  const proposal = async (role: string, key: string, value: any) =>
    call(role, "setting.propose", {
      key,
      scope: branch,
      value,
      version: (await one(
        db,
        "SELECT version FROM settings WHERE key=$1 AND scope=$2",
        [key, branch],
      ))!.version,
      reason: "Acceptance test business requirement",
    });
  return { branch, users, call, value, proposal };
}
const denied = (fn: () => Promise<any>, status = 403) =>
  assert.rejects(fn, (e: any) => e.status === status);
test("A: routine opening hours save immediately, persist and create a version and audit event", async () => {
  const f = await fixture();
  const r = await f.proposal("manager", "business.hours", "09:00–17:00");
  assert.equal(r.status, "active");
  assert.equal((await f.value("business.hours"))!.value, "09:00–17:00");
  assert.equal(
    (await one(
      db,
      "SELECT count(*)::int AS n FROM setting_versions WHERE request_id=$1",
      [r.id],
    ))!.n,
    1,
  );
  assert.ok(
    await one(
      db,
      "SELECT id FROM audit_events WHERE target=$1 AND action='setting.activated'",
      [r.id],
    ),
  );
});
test("B: price proposal retains current price until an independent manager approves", async () => {
  const f = await fixture();
  const r = await f.proposal("sales", "price.hose", 750000);
  assert.equal((await f.value("price.hose"))!.value, null);
  await f.call("manager", "approval.decide", {
    id: r.id,
    decision: "approve",
    reason: "Price verified",
  });
  assert.equal((await f.value("price.hose"))!.value, 750000);
  assert.equal(
    Number(
      (await one(
        db,
        "SELECT price_kobo FROM inventory WHERE branch_id=$1 AND product_id=$2",
        [f.branch, "hose"],
      ))!.price_kobo,
    ),
    750000,
  );
});
test("C: settlement changes require verification and two distinct independent owner/finance approvers", async () => {
  const f = await fixture();
  const r = await f.proposal("finance", "payment.settlement", {
    bank: "Test Bank",
    account: "1234567890",
    name: "Test Business",
  });
  await denied(() =>
    f.call("owner", "approval.decide", {
      id: r.id,
      decision: "approve",
      reason: "",
    }),
  );
  await f.call("owner", "reauth", { password });
  await f.call("owner", "approval.decide", {
    id: r.id,
    decision: "approve",
    reason: "Verified bank metadata",
  });
  assert.equal((await f.value("payment.settlement"))!.version, 1);
  await denied(
    () =>
      f.call("owner", "approval.decide", {
        id: r.id,
        decision: "approve",
        reason: "",
      }),
    409,
  );
  const second = id();
  await db.query(
    "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,'Independent finance',$2,$3,'finance',$4)",
    [second, `${second}@example.test`, passwordHash, f.branch],
  );
  const token = await issueSession(db, second);
  await dispatch("reauth", token, { password }, db);
  await dispatch(
    "approval.decide",
    token,
    {
      id: r.id,
      decision: "approve",
      reason: "Independent verification complete",
    },
    db,
  );
  assert.equal((await f.value("payment.settlement"))!.version, 2);
});
test("D: self-approval fails without changing request, settings or decisions", async () => {
  const f = await fixture();
  const r = await f.proposal("manager", "delivery.fee", 200000);
  await denied(() =>
    f.call("manager", "approval.decide", {
      id: r.id,
      decision: "approve",
      reason: "",
    }),
  );
  assert.equal((await f.value("delivery.fee"))!.value, 100000);
  assert.equal(
    (await one(
      db,
      "SELECT count(*)::int AS n FROM approval_decisions WHERE request_id=$1",
      [r.id],
    ))!.n,
    0,
  );
});
test("E: revoked authority takes effect on existing sessions immediately", async () => {
  const f = await fixture();
  const r = await f.proposal("sales", "price.hose", 800000);
  await db.query("UPDATE users SET role='driver' WHERE id=$1", [
    f.users.manager.id,
  ]);
  await denied(() =>
    f.call("manager", "approval.decide", {
      id: r.id,
      decision: "approve",
      reason: "",
    }),
  );
  assert.equal((await f.value("price.hose"))!.version, 1);
});
test("F: concurrent setting proposals cannot overwrite a newer activated version", async () => {
  const f = await fixture();
  const [a, b] = await Promise.all([
    f.proposal("sales", "price.hose", 750000),
    f.proposal("sales", "price.hose", 800000),
  ]);
  await f.call("manager", "approval.decide", {
    id: a.id,
    decision: "approve",
    reason: "",
  });
  await denied(
    () =>
      f.call("manager", "approval.decide", {
        id: b.id,
        decision: "approve",
        reason: "",
      }),
    409,
  );
  assert.equal((await f.value("price.hose"))!.value, 750000);
});
test("G: rejecting wallet policy preserves its active value and records the rejection", async () => {
  const f = await fixture();
  const r = await f.proposal("finance", "wallet.maximum", 60000000);
  await f.call("owner", "approval.decide", {
    id: r.id,
    decision: "reject",
    reason: "Funding limit is not authorised",
  });
  assert.equal((await f.value("wallet.maximum"))!.value, 50000000);
  assert.equal(
    (await one(db, "SELECT status FROM change_requests WHERE id=$1", [r.id]))!
      .status,
    "rejected",
  );
});
test("H: rollback creates a new governed version without rewriting history", async () => {
  const f = await fixture();
  await f.call("owner", "reauth", { password });
  const r = await f.proposal("manager", "delivery.fee", 200000);
  await f.call("owner", "approval.decide", {
    id: r.id,
    decision: "approve",
    reason: "",
  });
  const v = await one(
    db,
    "SELECT id FROM setting_versions WHERE request_id=$1",
    [r.id],
  );
  const rollback = await f.call("manager", "setting.rollback", {
    versionId: v!.id,
    reason: "Restore prior approved delivery fee",
  });
  assert.equal((await f.value("delivery.fee"))!.value, 200000);
  await f.call("owner", "approval.decide", {
    id: rollback.id,
    decision: "approve",
    reason: "",
  });
  assert.equal((await f.value("delivery.fee"))!.value, 100000);
  assert.equal((await f.value("delivery.fee"))!.version, 3);
  assert.equal(
    (await one(
      db,
      "SELECT count(*)::int AS n FROM setting_versions WHERE key=$1 AND scope=$2",
      ["delivery.fee", f.branch],
    ))!.n,
    2,
  );
});
test("I: emergency disable requires verification, an allowlisted protective action, and owner notification", async () => {
  const f = await fixture();
  await f.call("administrator", "reauth", { password });
  await f.call("administrator", "emergency.disable", {
    key: "payment.integration",
    scope: f.branch,
    reason: "Incident: compromised provider connection",
  });
  assert.equal((await f.value("payment.integration"))!.value, false);
  assert.ok(
    await one(
      db,
      "SELECT id FROM audit_events WHERE action='emergency.disabled' AND actor_id=$1",
      [f.users.administrator.id],
    ),
  );
  assert.ok(
    await one(
      db,
      "SELECT id FROM notifications WHERE user_id=$1 AND title LIKE 'Emergency%'",
      [f.users.owner.id],
    ),
  );
  await denied(() =>
    f.call("administrator", "emergency.disable", {
      key: "payment.settlement",
      scope: f.branch,
      reason: "Attempt to replace settlement destination",
    }),
  );
});
test("J1: sales cannot read protected financial settings or infer bank metadata", async () => {
  const f = await fixture();
  const settings = await f.call("sales", "settings", { scope: f.branch });
  assert.ok(!settings.some((s: any) => s.key === "payment.settlement"));
  await denied(() =>
    f.call("sales", "setting.history", {
      key: "payment.settlement",
      scope: f.branch,
    }),
  );
});
test("J2: client-provided roles, approval levels and requester identities are rejected", async () => {
  const f = await fixture();
  await assert.rejects(() =>
    f.call("sales", "setting.propose", {
      key: "payment.settlement",
      scope: f.branch,
      value: { bank: "Test", account: "1234567890", name: "Fake" },
      version: 1,
      reason: "Spoofed role request",
      role: "owner",
      risk: 1,
      requesterId: f.users.owner.id,
    }),
  );
  assert.equal((await f.value("payment.settlement"))!.version, 1);
});
test("J3: staff cannot request their own promotion, including owners", async () => {
  const f = await fixture();
  await denied(() =>
    f.proposal("manager", "security.permissions", {
      userId: f.users.manager.id,
      role: "owner",
      branchId: f.branch,
    }),
  );
});
test("J4: direct approval calls without authority are refused", async () => {
  const f = await fixture();
  const r = await f.proposal("finance", "wallet.maximum", 60000000);
  await denied(() =>
    f.call("sales", "approval.decide", {
      id: r.id,
      decision: "approve",
      reason: "",
    }),
  );
});
test("J5: approval classification cannot be downgraded through policy settings", async () => {
  const f = await fixture();
  await denied(() =>
    f.proposal("owner", "security.policy", { dualApproval: false }),
  );
});
test("J6: Branch Managers can request finance access but cannot approve it", async () => {
  const f = await fixture();
  const request = await f.proposal("sales", "security.permissions", {
      userId: f.users.driver.id,
      role: "finance",
      branchId: f.branch,
  });
  await denied(() => f.call("sales", "approval.decide", { id: request.id, decision: "approve", reason: "" }));
});
test("J7: managers cannot read or propose changes across branches", async () => {
  const f = await fixture();
  await denied(() => f.call("manager", "settings", { scope: "lagos" }));
  await denied(() =>
    f.call("manager", "setting.propose", {
      key: "delivery.fee",
      scope: "lagos",
      value: 300000,
      version: 1,
      reason: "Cross branch fee change",
    }),
  );
});
test("J8: invalid, expired and revoked sessions cannot authorise operations", async () => {
  const f = await fixture();
  await denied(
    () => dispatch("settings", "invented-token", { scope: f.branch }, db),
    401,
  );
  await db.query(
    "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE id=$1",
    [digest(f.users.manager.token)],
  );
  await denied(() => f.call("manager", "settings", { scope: f.branch }), 401);
  await f.call("sales", "logout", {});
  await denied(() => f.call("sales", "me"), 401);
});
test("J9: suspended accounts lose authority without waiting for session expiry", async () => {
  const f = await fixture();
  await db.query("UPDATE users SET active=false WHERE id=$1", [
    f.users.manager.id,
  ]);
  await denied(() => f.call("manager", "settings", { scope: f.branch }), 401);
});
test("J10: branch operational staff cannot approve protected financial decisions", async () => {
  const f = await fixture();
  const r = await f.proposal("finance", "wallet.maximum", 70000000);
  await denied(() =>
    f.call("manager", "approval.decide", {
      id: r.id,
      decision: "approve",
      reason: "",
    }),
  );
});
test("J11: rejected protected operations create persistent security audit events", async () => {
  const f = await fixture();
  await denied(() => f.call("sales", "audit"));
  assert.ok(
    await one(
      db,
      "SELECT id FROM audit_events WHERE actor_id=$1 AND action='security.denied' AND outcome='denied'",
      [f.users.sales.id],
    ),
  );
});
test("approvals, version history and financial ledgers reject UPDATE and DELETE", async () => {
  const f = await fixture();
  const r = await f.proposal("manager", "business.hours", "10:00–18:00");
  const v = await one(
    db,
    "SELECT id FROM setting_versions WHERE request_id=$1",
    [r.id],
  );
  await assert.rejects(
    () => db.query("DELETE FROM setting_versions WHERE id=$1", [v!.id]),
    /Append-only/,
  );
  const a = await one(db, "SELECT id FROM audit_events LIMIT 1");
  await assert.rejects(
    () =>
      db.query("UPDATE audit_events SET outcome='changed' WHERE id=$1", [
        a!.id,
      ]),
    /Append-only/,
  );
});
test("failed product activation retains independent decisions and records FAILED without changing the live value", async () => {
  const f = await fixture();
  const r = await f.proposal("inventory", "publish.hose", true);
  await f.call("manager", "approval.decide", {
    id: r.id,
    decision: "approve",
    reason: "Independent publication review",
  });
  assert.equal((await f.value("publish.hose"))!.value, false);
  assert.equal(
    (await one(db, "SELECT status FROM change_requests WHERE id=$1", [r.id]))!
      .status,
    "failed",
  );
  assert.equal(
    (await one(
      db,
      "SELECT count(*)::int n FROM approval_decisions WHERE request_id=$1",
      [r.id],
    ))!.n,
    1,
  );
});
test("material revisions invalidate old decisions and return to a new draft revision", async () => {
  const f = await fixture();
  const r = await f.proposal("sales", "price.hose", 900000);
  await f.call("manager", "approval.decide", {
    id: r.id,
    decision: "request_changes",
    reason: "Review the proposed selling price",
  });
  await f.call("sales", "approval.revise", {
    id: r.id,
    value: 850000,
    reason: "Revised after manager price review",
  });
  const revised = await one(
    db,
    "SELECT status,revision FROM change_requests WHERE id=$1",
    [r.id],
  );
  assert.equal(revised!.status, "draft");
  assert.equal(revised!.revision, 2);
  assert.equal(
    (await one(
      db,
      "SELECT count(*)::int n FROM approval_decisions WHERE request_id=$1 AND revision=2",
      [r.id],
    ))!.n,
    0,
  );
});
test("expired requests cannot be approved", async () => {
  const f = await fixture();
  const r = await f.proposal("sales", "price.hose", 750000);
  await db.query(
    "UPDATE change_requests SET expires_at=now()-interval '1 second' WHERE id=$1",
    [r.id],
  );
  await denied(
    () =>
      f.call("manager", "approval.decide", {
        id: r.id,
        decision: "approve",
        reason: "",
      }),
    409,
  );
});
test("invalid configuration values do not create a request or modify state", async () => {
  const f = await fixture();
  await denied(() => f.proposal("manager", "delivery.fee", -100), 400);
  assert.equal((await f.value("delivery.fee"))!.version, 1);
});
test("stock receipts are idempotent and conflicting receipt replays are rejected", async () => {
  const f = await fixture();
  const input = {
    productId: "hose",
    quantity: 10,
    reason: "Verified goods receipt",
    reference: id(),
    branchId: f.branch,
  };
  await f.call("inventory", "inventory.receive", input);
  await f.call("inventory", "inventory.receive", input);
  assert.equal(
    (await one(
      db,
      "SELECT quantity FROM inventory WHERE branch_id=$1 AND product_id=$2",
      [f.branch, "hose"],
    ))!.quantity,
    10,
  );
  await denied(
    () => f.call("inventory", "inventory.receive", { ...input, quantity: 11 }),
    409,
  );
});
test("checkout uses server prices, reserves once, prevents overselling and preserves agreed order prices", async () => {
  const f = await fixture();
  await db.query(
    "UPDATE settings SET value='true' WHERE scope='lagos' AND key IN ('delivery.enabled','payment.cod')",
  );
  await db.query(
    "UPDATE inventory SET price_kobo=750000,published=true,quantity=2,reserved=0 WHERE branch_id='lagos' AND product_id='hose'",
  );
  const d = {
    items: [{ productId: "hose", quantity: 2 }],
    address: {
      name: "Test Customer",
      phone: "08012345678",
      street: "12 Acceptance Test Street",
      zone: "Lekki",
    },
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    window: "09:00–12:00",
    instructions: "Test only",
    idempotencyKey: id(),
  };
  const [a, b] = await Promise.all([
    f.call("customer", "checkout", d),
    f.call("customer", "checkout", d),
  ]);
  assert.equal(a.id, b.id);
  assert.equal(Number(a.total_kobo), 1600000);
  assert.equal(a.payment_status, "unpaid");
  assert.equal(
    (await one(
      db,
      "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
    ))!.reserved,
    2,
  );
  await denied(
    () =>
      f.call("customer", "checkout", {
        ...d,
        idempotencyKey: id(),
        items: [{ productId: "hose", quantity: 1 }],
      }),
    409,
  );
  await db.query(
    "UPDATE inventory SET price_kobo=900000 WHERE branch_id='lagos' AND product_id='hose'",
  );
  assert.equal(
    Number(
      (await one(
        db,
        "SELECT unit_price_kobo FROM order_items WHERE order_id=$1",
        [a.id],
      ))!.unit_price_kobo,
    ),
    750000,
  );
  await f.call("customer", "order.transition", {
    id: a.id,
    status: "cancelled",
    note: "Cancel test order before acceptance",
  });
  assert.equal(
    (await one(
      db,
      "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
    ))!.reserved,
    0,
  );
  await denied(
    () =>
      f.call("customer", "order.transition", {
        id: a.id,
        status: "cancelled",
        note: "Try duplicate release",
      }),
    403,
  );
});
test("checkout refuses out-of-coverage addresses and forged totals", async () => {
  const f = await fixture();
  const input = {
    items: [{ productId: "hose", quantity: 1 }],
    address: {
      name: "Test Customer",
      phone: "08012345678",
      street: "12 Test Street",
      zone: "Unsupported",
    },
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    window: "09:00–12:00",
    instructions: "",
    idempotencyKey: id(),
  };
  await denied(() => f.call("customer", "checkout", input), 400);
  await assert.rejects(() =>
    f.call("customer", "checkout", { ...input, totalKobo: 1 }),
  );
});
test("customers cannot view another customer order history or staff reports", async () => {
  const f = await fixture();
  assert.deepEqual(await f.call("customer", "orders"), []);
  await denied(() => f.call("customer", "finance"));
  await denied(() => f.call("customer", "dashboard"));
});
test("forecasts require verified cylinder-specific history and never invent sensor readings", () => {
  assert.equal(forecast([], "c1").available, false);
  const records = ["2026-01-01", "2026-02-01", "2026-03-01"].map((date) => ({
    date,
    kg: 12.5,
    verified: true,
    cylinderId: "c1",
  }));
  const result = forecast(records, "c1", new Date("2026-03-15"));
  assert.equal(result.available, true);
  assert.ok(result.reason.includes("not a sensor"));
  assert.equal(forecast(records, "other").available, false);
});
test("verified customer code completes delivery once; independent finance reconciliation recognises revenue once", async () => {
  const f = await fixture();
  await db.query("UPDATE users SET branch_id='lagos',driver_available=true WHERE id=$1", [
    f.users.driver.id,
  ]);
  await db.query(
    "UPDATE inventory SET quantity=3,reserved=0,price_kobo=750000,published=true WHERE branch_id='lagos' AND product_id='hose'",
  );
  await db.query(
    "UPDATE settings SET value='true' WHERE scope='lagos' AND key IN ('delivery.enabled','payment.cod')",
  );
  const input = {
    items: [{ productId: "hose", quantity: 1 }],
    address: {
      name: "Test Customer",
      phone: "08012345678",
      street: "12 Delivery Test Street",
      zone: "Lekki",
    },
    date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    window: "09:00–12:00",
    instructions: "Test delivery",
    idempotencyKey: id(),
  };
  const o = await f.call("customer", "checkout", input);
  assert.equal(o.delivery_code_hash, undefined);
  for (const status of ["accepted", "preparing", "assigned"])
    await f.call("owner", "order.transition", {
      id: o.id,
      status,
      note: "Acceptance test state transition",
      ...(status === "assigned" ? { driverId: f.users.driver.id } : {}),
    });
  await verifiedPickup(f.call, o.id);
  await f.call("driver", "order.transition", {
    id: o.id,
    status: "out_for_delivery",
    note: "Driver confirmed pickup of test order",
  });
  const customerOrders = await f.call("customer", "orders");
  const code = customerOrders.find((r: any) => r.id === o.id).confirmation_code;
  assert.match(code, /^\d{6}$/);
  const driverOrders = await f.call("driver", "orders");
  assert.equal(
    driverOrders.find((r: any) => r.id === o.id).confirmation_code,
    undefined,
  );
  assert.equal(
    driverOrders.find((r: any) => r.id === o.id).delivery_code_hash,
    undefined,
  );
  await denied(
    () =>
      f.call("driver", "delivery.complete", {
        handover: true,
        orderId: o.id,
        code: code === "111111" ? "222222" : "111111",
        collectedKobo: 850000,
      }),
    400,
  );
  assert.equal(
    (await one(db, "SELECT status FROM orders WHERE id=$1", [o.id]))!.status,
    "out_for_delivery",
  );
  await f.call("driver", "delivery.complete", {
    handover: true,
    orderId: o.id,
    code,
    collectedKobo: 850000,
  });
  assert.equal(
    (
      await f.call("driver", "delivery.complete", {
        handover: true,
        orderId: o.id,
        code,
        collectedKobo: 850000,
      })
    ).replayed,
    true,
  );
  await denied(
    () =>
      f.call("driver", "delivery.complete", {
        handover: true,
        orderId: o.id,
        code,
        collectedKobo: 1,
      }),
    409,
  );
  assert.equal(
    (await one(
      db,
      "SELECT quantity FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
    ))!.quantity,
    2,
  );
  assert.equal(
    (await one(db, "SELECT payment_status FROM orders WHERE id=$1", [o.id]))!
      .payment_status,
    "collected",
  );
  const c = await one(db, "SELECT id FROM cash_collections WHERE order_id=$1", [
    o.id,
  ]);
  await denied(() => f.call("driver", "cash.reconcile", { id: c!.id }));
  await denied(() => f.call("owner", "cash.reconcile", { id: c!.id }));
  await f.call("owner", "reauth", { password });
  await f.call("owner", "cash.reconcile", { id: c!.id });
  await f.call("owner", "cash.reconcile", { id: c!.id });
  assert.equal(
    (await one(db, "SELECT payment_status FROM orders WHERE id=$1", [o.id]))!
      .payment_status,
    "verified",
  );
  assert.equal(
    (await one(
      db,
      "SELECT count(*)::int AS n FROM verified_payments WHERE order_id=$1",
      [o.id],
    ))!.n,
    1,
  );
});
test("scheduled changes remain inactive until explicitly revalidated at their effective date", async () => {
  const f = await fixture();
  await f.call("owner", "reauth", { password });
  const r = await f.call("manager", "setting.propose", {
    key: "delivery.fee",
    scope: f.branch,
    value: 150000,
    version: 1,
    reason: "Schedule a reviewed future delivery fee",
    effectiveAt: new Date(Date.now() + 3600000).toISOString(),
  });
  await f.call("owner", "approval.decide", {
    id: r.id,
    decision: "approve",
    reason: "Approved future change",
  });
  assert.equal((await f.value("delivery.fee"))!.value, 100000);
  assert.equal(
    (await one(db, "SELECT status FROM change_requests WHERE id=$1", [r.id]))!
      .status,
    "scheduled",
  );
  await db.query(
    "UPDATE change_requests SET effective_at=now()-interval '1 second' WHERE id=$1",
    [r.id],
  );
  await f.call("owner", "approval.activate", { id: r.id });
  assert.equal((await f.value("delivery.fee"))!.value, 150000);
});
test("protected staff changes require independent approvals and revoke the target sessions", async () => {
  const f = await fixture();
  const r = await f.proposal("manager", "security.permissions", {
    userId: f.users.sales.id,
    role: "finance",
    branchId: f.branch,
  });
  await f.call("owner", "reauth", { password });
  await f.call("finance", "reauth", { password });
  await f.call("owner", "approval.decide", {
    id: r.id,
    decision: "approve",
    reason: "Access reviewed by owner",
  });
  assert.equal(
    (await one(db, "SELECT role FROM users WHERE id=$1", [f.users.sales.id]))!
      .role,
    "manager",
  );
  await f.call("finance", "approval.decide", {
    id: r.id,
    decision: "approve",
    reason: "Independent access review complete",
  });
  assert.equal(
    (await one(db, "SELECT role FROM users WHERE id=$1", [f.users.sales.id]))!
      .role,
    "finance",
  );
  await denied(() => f.call("sales", "inventory"), 401);
  const login = await dispatch(
    "login",
    null,
    { email: `${f.users.sales.id}@example.test`, password },
    db,
  );
  assert.ok((await dispatch("inventory", login.token, {}, db)).length > 0);
});
test("requester authority is rechecked before activation", async () => {
  const f = await fixture();
  const r = await f.proposal("sales", "price.hose", 950000);
  await db.query("UPDATE users SET role='customer' WHERE id=$1", [
    f.users.sales.id,
  ]);
  await f.call("manager", "approval.decide", {
    id: r.id,
    decision: "approve",
    reason: "Attempt after requester authority changed",
  });
  assert.equal((await f.value("price.hose"))!.version, 1);
  assert.equal(
    (await one(db, "SELECT status FROM change_requests WHERE id=$1", [r.id]))!
      .status,
    "failed",
  );
});
test("branch permission changes cannot move a target through a forged request scope", async () => {
  const f = await fixture();
  await denied(() =>
    f.proposal("manager", "security.permissions", {
      userId: f.users.sales.id,
      role: "manager",
      branchId: "lagos",
    }),
  );
});
test("recent-password verification throttles failed attempts persistently", async () => {
  const f = await fixture();
  for (let i = 0; i < 5; i++)
    await denied(() =>
      f.call("owner", "reauth", { password: "Wrong-test-password!" }),
    );
  await denied(() => f.call("owner", "reauth", { password }), 429);
});
test("delivery and business-hour settings reject invalid or empty configuration", async () => {
  const f = await fixture();
  await denied(
    () => f.proposal("manager", "business.hours", "not an opening time"),
    400,
  );
  await denied(() => f.proposal("manager", "delivery.zones", "Lekki, "), 403);
  await denied(
    () => f.proposal("manager", "delivery.windows", "18:00–09:00"),
    400,
  );
  assert.equal((await f.value("business.hours"))!.version, 1);
});
test("production publication settings hide drafts while authorised staff can still manage them", async () => {
  const f = await fixture();
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const catalogue = await dispatch("catalogue", null, {}, db);
    assert.ok(catalogue.products.every((p: any) => p.published));
    assert.equal(
      (await f.call("owner", "products.manage")).products.length,
      12,
    );
    await denied(() => f.call("customer", "products.manage"));
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
  }
});
test("successful sign-in rotates and revokes the previously supplied browser session", async () => {
  const f = await fixture();
  const result = await dispatch(
    "login",
    f.users.customer.token,
    { email: `${f.users.customer.id}@example.test`, password },
    db,
  );
  await denied(() => f.call("customer", "me"), 401);
  assert.equal(
    (await dispatch("me", result.token, {}, db)).user.id,
    f.users.customer.id,
  );
});
