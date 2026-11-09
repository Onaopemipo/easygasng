import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  adminNavigation,
  navigationItems,
  activeNavigation,
  roleNavigation,
  parseNavigationPreferences,
  badgeText,
  failedNavigationSnapshot,
  refreshingNavigationSnapshot,
} from "../packages/business-rules/src/admin-navigation";
import { fixture } from "./helpers/service-fixture";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
import { one } from "../apps/web/lib/db";
const password = "Services-fixture-only-123!";
test("RM-01–05,12,13: all 29 routes, exact groups/order, unique IDs and safe nested active matching", async () => {
  assert.equal(adminNavigation.length, 7);
  assert.deepEqual(
    adminNavigation.map((g) => g.items.length),
    [1, 4, 4, 5, 4, 3, 8],
  );
  assert.equal(navigationItems.length, 29);
  assert.equal(new Set(navigationItems.map((i) => i.id)).size, 29);
  assert.equal(new Set(navigationItems.map((i) => i.href)).size, 29);
  assert.deepEqual(
    adminNavigation.map((g) => g.label),
    [
      "Overview",
      "Sales & Customers",
      "Products & Stock",
      "Delivery & Services",
      "Finance & Performance",
      "Growth & Engagement",
      "Administration & Control",
    ],
  );
  const expected = [
    "dashboard",
    "orders",
    "pos",
    "customers",
    "support",
    "products",
    "inventory",
    "cylinders",
    "bundles",
    "deliveries",
    "bookings",
    "services",
    "technicians",
    "quotations",
    "finance",
    "reconciliation",
    "credits",
    "reports",
    "campaigns",
    "recommendations",
    "testimonials",
    "staff",
    "approvals",
    "settings",
    "operations",
    "incidents",
    "policies",
    "audit",
    "readiness",
  ];
  assert.deepEqual(
    navigationItems.map((i) => i.id),
    expected,
  );
  for (const item of navigationItems) {
    assert.equal(activeNavigation(item.href + "/")?.id, item.id);
    assert.equal(activeNavigation(item.href + "?test=1")?.id, item.id);
    assert.equal(activeNavigation(item.href + "#section")?.id, item.id);
    if (item.id !== "dashboard")
      assert.equal(activeNavigation(item.href + "/123/edit")?.id, item.id);
  }
  assert.equal(activeNavigation("/admin/products-archive"), undefined);
  assert.equal(activeNavigation("/admin/unknown"), undefined);
  assert.equal(activeNavigation("/administrator"), undefined);
  const page = await readFile(
    "apps/web/app/admin/[[...section]]/page.tsx",
    "utf8",
  );
  assert.match(page, /dispatch\(\s*"navigation\.access"/);
  assert.ok(page.includes("!access.allowed.includes(key)"));
  assert.ok(page.includes("notFound()"));
});
test("RM-06,08,09: mode-independent role visibility preserves dedicated assignment experiences", () => {
  for (const role of [
    "owner",
    "manager",
    "sales",
    "inventory",
    "finance",
    "dispatcher",
    "administrator",
    "service_manager",
    "safety_officer",
    "driver",
    "technician",
  ]) {
    const groups = roleNavigation(role, "lagos");
    assert.ok(groups.every((g) => g.items.length > 0));
    assert.ok(
      groups.flatMap((g) => g.items).every((i) => i.roles.includes(role)),
    );
  }
  assert.equal(
    roleNavigation("owner", "lagos").flatMap((g) => g.items).length,
    29,
  );
  assert.deepEqual(
    roleNavigation("driver", "lagos")
      .flatMap((g) => g.items)
      .map((i) => i.id),
    ["deliveries"],
  );
  assert.deepEqual(
    roleNavigation("technician", "lagos")
      .flatMap((g) => g.items)
      .map((i) => i.id),
    ["bookings", "services"],
  );
  assert.equal(roleNavigation("customer", "lagos").length, 0);
  assert.equal(roleNavigation("inventory", null).length, 0);
  assert.ok(
    !roleNavigation("administrator", "lagos")
      .flatMap((g) => g.items)
      .some((i) =>
        ["finance", "reconciliation", "credits", "readiness"].includes(i.id),
      ),
  );
});
test("navigation preferences reject corrupt storage and badge overflow remains bounded", () => {
  assert.equal(parseNavigationPreferences("broken"), null);
  assert.equal(
    parseNavigationPreferences('{"collapsed":"yes","groups":{}}'),
    null,
  );
  assert.deepEqual(
    parseNavigationPreferences(
      '{"collapsed":true,"groups":{"stock":false,"unknown":true}}',
    ),
    { collapsed: true, groups: { stock: false } },
  );
  assert.deepEqual([0, 1, 9, 10, 99, 100, 999].map(badgeText), [
    "0",
    "1",
    "9",
    "10",
    "99",
    "99+",
    "99+",
  ]);
});
test("RM-07,10,11: fresh authentication, branch scope, counter aggregates and role/session revocation", async () => {
  const f = await fixture();
  try {
    await assert.rejects(
      () => dispatch("navigation", null, {}, f.db),
      /sign in/,
    );
    await assert.rejects(
      () => f.call("customer", "navigation"),
      /administration workspace/,
    );
    await assert.rejects(
      () => f.call("inventory", "navigation", { branchId: "other" }),
      /authenticated workspace/,
    );
    const owner = await f.call("owner", "navigation");
    assert.equal(owner.allowed.length, 29);
    assert.ok(owner.generatedAt);
    assert.equal(owner.user.id, f.actors.owner.id);
    const tech = await f.call("technician", "navigation");
    assert.deepEqual(tech.allowed, ["bookings", "services"]);
    assert.deepEqual(tech.counters, {});
    const inv = await f.call("inventory", "navigation");
    assert.ok(!("reconciliation" in inv.counters));
    assert.ok(!inv.allowed.includes("reconciliation"));
    const other = "nav-other-branch";
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES($1,'Other Nav Test Branch')",
      [other],
    );
    const supportId = id();
    await f.db.query(
      "INSERT INTO support_requests(id,customer_id,subject,message,status,branch_id) VALUES($1,$2,'Navigation test','Synthetic fixture only','open',$3)",
      [supportId, f.actors.customer.id, other],
    );
    const staffId = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Nav Branch Manager',$2,$3,'manager','lagos')",
      [staffId, `${staffId}@example.test`, hashPassword(password)],
    );
    const managerToken = await issueSession(f.db, staffId);
    const before = await dispatch("navigation", managerToken, {}, f.db);
    assert.equal(before.counters.support, 0);
    assert.equal((await f.call("owner", "navigation")).counters.support, 1);
    await f.db.query(
      "UPDATE support_requests SET branch_id='lagos' WHERE id=$1",
      [supportId],
    );
    assert.equal(
      (await dispatch("navigation", managerToken, {}, f.db)).counters.support,
      1,
    );
    await f.db.query(
      "UPDATE support_requests SET status='resolved' WHERE id=$1",
      [supportId],
    );
    assert.equal(
      (await dispatch("navigation", managerToken, {}, f.db)).counters.support,
      0,
    );
    const booking = await f.call("customer", "booking.create", f.input());
    assert.equal((await f.call("owner", "navigation")).counters.bookings, 1);
    await f.call("service_manager", "booking.transition", {
      bookingId: booking.id,
      status: "confirmed",
      reason: "Synthetic appointment confirmation",
    });
    assert.equal((await f.call("owner", "navigation")).counters.bookings, 0);
    const incidentId = id();
    await f.db.query(
      "INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role) VALUES($1,'lagos','medium','navigation_test',$1,'Synthetic incident','owner')",
      [incidentId],
    );
    const incidentCount = (await f.call("owner", "navigation")).counters
      .incidents;
    assert.ok(incidentCount >= 1);
    await f.db.query(
      "UPDATE operational_incidents SET status='resolved' WHERE id=$1",
      [incidentId],
    );
    assert.equal(
      (await f.call("owner", "navigation")).counters.incidents,
      incidentCount - 1,
    );
    await f.db.query("UPDATE users SET role='inventory' WHERE id=$1", [
      staffId,
    ]);
    const changed = await dispatch("navigation", managerToken, {}, f.db);
    assert.ok(!changed.allowed.includes("support"));
    assert.ok(!("support" in changed.counters));
    await assert.rejects(
      () => dispatch("support.list", managerToken, {}, f.db),
      /permission/,
    );
    await f.db.query("UPDATE users SET active=false WHERE id=$1", [staffId]);
    await assert.rejects(
      () => dispatch("navigation", managerToken, {}, f.db),
      /expired/,
    );
    await f.call("administrator", "logout");
    await assert.rejects(
      () => f.call("administrator", "navigation"),
      /expired/,
    );
    await f.db.query(
      "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",
      [f.actors.finance.id],
    );
    await assert.rejects(() => f.call("finance", "navigation"), /expired/);
  } finally {
    await f.db.close?.();
  }
});
test("approval badge agrees with independent eligibility, excludes requester, recipient, expired and already-decided requests", async () => {
  const f = await fixture();
  try {
    const request = await f.call("owner", "staff.access.request", {
      userId: f.actors.technician.id,
      role: "inventory",
      branchId: "lagos",
      reason: "Synthetic access request for badge verification",
    });
    assert.equal((await f.call("owner", "navigation")).counters.approvals, 0);
    assert.equal((await f.call("finance", "navigation")).counters.approvals, 1);
    const visible = await f.call("finance", "approvals");
    assert.equal(visible.filter((r: any) => r.can_approve).length, 1);
    await f.call("finance", "approval.decide", {
      id: request.id,
      decision: "approve",
      reason: "Independent synthetic access review",
    });
    assert.equal((await f.call("finance", "navigation")).counters.approvals, 0);
    const pending = await f.call("owner", "staff.access.request", {
      userId: f.actors.inventory.id,
      role: "sales",
      branchId: "lagos",
      reason: "Second synthetic access review",
    });
    await f.db.query(
      "UPDATE change_requests SET expires_at=now()-interval '1 second' WHERE id=$1",
      [pending.id],
    );
    assert.equal((await f.call("finance", "navigation")).counters.approvals, 0);
  } finally {
    await f.db.close?.();
  }
});

test("counter accuracy covers actionable orders/deliveries, configured inventory thresholds and unresolved financial items", async () => {
  const f = await fixture();
  try {
    const makeOrder = async (status: string) => {
      const uid = id();
      await f.db.query(
        "INSERT INTO orders(id,reference,customer_id,branch_id,status,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash,delivery_code_hash,delivery_code_expires_at) VALUES($1,$1,$2,'lagos',$3,'cash',1000,0,1000,'{}','2026-10-30','test',$1,'test','test',now()+interval '1 day')",
        [uid, f.actors.customer.id, status],
      );
      return uid;
    };
    await makeOrder("placed");
    await makeOrder("preparing");
    const complete = await makeOrder("delivered");
    const current = await f.call("owner", "navigation");
    assert.equal(current.counters.orders, 1);
    assert.equal(current.counters.deliveries, 1);
    const physical = await one(
      f.db,
      "SELECT count(*) AS count FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.archived=false AND p.category<>'Gas refills' AND i.quantity-i.reserved<=i.threshold",
    );
    const gas = await one(
      f.db,
      "SELECT count(*) AS count FROM gas_stock WHERE threshold_grams IS NOT NULL AND grams-reserved_grams<=threshold_grams",
    );
    assert.equal(
      current.counters.inventory,
      Number(physical!.count) + Number(gas!.count),
    );
    const cash = id();
    await f.db.query(
      "INSERT INTO cash_collections(id,order_id,collector_id,amount_kobo) VALUES($1,$2,$3,1000)",
      [cash, complete, f.actors.owner.id],
    );
    assert.equal(
      (await f.call("finance", "navigation")).counters.reconciliation,
      1,
    );
    await f.db.query(
      "UPDATE cash_collections SET verified_by=$1,verified_at=now() WHERE id=$2",
      [f.actors.finance.id, cash],
    );
    assert.equal(
      (await f.call("finance", "navigation")).counters.reconciliation,
      0,
    );
    const shift = id();
    await f.db.query(
      "INSERT INTO pos_shifts(id,branch_id,cashier_id,opening_kobo,counted_kobo,expected_kobo,status) VALUES($1,'lagos',$2,0,100,200,'submitted')",
      [shift, f.actors.owner.id],
    );
    assert.equal(
      (await f.call("finance", "navigation")).counters.reconciliation,
      1,
    );
    await f.db.query(
      "UPDATE pos_shifts SET status='verified',verified_by=$1 WHERE id=$2",
      [f.actors.finance.id, shift],
    );
    assert.equal(
      (await f.call("finance", "navigation")).counters.reconciliation,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("bounded delegation is included in approval counters only while independently valid", async () => {
  const f = await fixture();
  try {
    const reviewer = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Independent Synthetic Owner',$2,$3,'owner','lagos')",
      [reviewer, `${reviewer}@example.test`, hashPassword(password)],
    );
    const setting = await one(
      f.db,
      "SELECT version FROM settings WHERE key='publish.hose' AND scope='lagos'",
    );
    const request = await f.call("owner", "setting.propose", {
      key: "publish.hose",
      scope: "lagos",
      version: setting!.version,
      value: true,
      reason: "Synthetic delegated navigation decision",
    });
    const grant = id();
    await f.db.query(
      "INSERT INTO approval_delegations(id,grantor_id,delegate_id,setting_key,scope,status,reason,starts_at,expires_at,reviewed_by) VALUES($1,$2,$3,'publish.hose','lagos','approved','Synthetic independently reviewed grant',now()-interval '1 minute',now()+interval '1 day',$4)",
      [grant, f.actors.owner.id, f.actors.inventory.id, reviewer],
    );
    // Grantor is the requester, so separation of duties excludes the delegation.
    assert.equal(
      (await f.call("inventory", "navigation")).counters.approvals,
      0,
    );
    await f.db.query(
      "UPDATE approval_delegations SET grantor_id=$1,reviewed_by=$2 WHERE id=$3",
      [reviewer, f.actors.owner.id, grant],
    );
    const snapshot = await f.call("inventory", "navigation"),
      approvalRows = await f.call("inventory", "approvals");
    assert.equal(snapshot.counters.approvals, 1);
    assert.ok(
      approvalRows.some((r: any) => r.id === request.id && r.can_approve),
    );
    await f.db.query(
      "UPDATE approval_delegations SET status='revoked' WHERE id=$1",
      [grant],
    );
    assert.equal(
      (await f.call("inventory", "navigation")).counters.approvals,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});

test("INV-BADGE-01: refresh and transient failure retain explicitly labelled confirmed counts without changing grants", () => {
  const previous = {
    allowed: ["orders"],
    counters: { orders: 99, approvals: 3 },
    generatedAt: "old timestamp",
    user: { id: "fixture-user" },
  };
  const failed = failedNavigationSnapshot(previous);
  const refreshing = refreshingNavigationSnapshot(previous);
  assert.deepEqual(refreshing.counters, previous.counters);
  assert.equal(refreshing.generatedAt, previous.generatedAt);
  assert.equal(refreshing.counterState, "loading");
  assert.deepEqual(failed.counters, previous.counters);
  assert.equal(failed.generatedAt, previous.generatedAt);
  assert.equal(failed.counterState, "stale");
  const noConfirmed = failedNavigationSnapshot({
    allowed: ["inventory"],
    counterState: "loading",
  });
  assert.deepEqual(noConfirmed.counters, {});
  assert.equal(noConfirmed.generatedAt, null);
  assert.equal(noConfirmed.counterState, "unavailable");
  assert.equal(refreshingNavigationSnapshot(null), null);
  assert.deepEqual(failed.allowed, ["orders"]);
  assert.equal(previous.counters.orders, 99);
  assert.equal(failedNavigationSnapshot(null), null);
});

test("permitted navigation maps actual backend read allowlists for every existing staff role", async () => {
  const f = await fixture();
  try {
    for (const role of ["manager", "sales", "dispatcher", "driver"]) {
      const uid = id();
      await f.db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Synthetic Navigation Role',$2,$3,$4,'lagos')",
        [uid, `${uid}@example.test`, hashPassword(password), role],
      );
      f.actors[role] = { id: uid, token: await issueSession(f.db, uid) };
    }
    for (const role of Object.keys(f.actors).filter(
      (r) => !["customer", "commercial"].includes(r),
    )) {
      const access = await f.call(role, "navigation.access");
      if (role === "sales")
        assert.ok(!("orders" in (await f.call(role, "navigation")).counters));
      const actions = new Set<string>();
      for (const key of access.allowed) {
        const item = navigationItems.find((i) => i.id === key)!;
        if (actions.has(item.readAction)) continue;
        actions.add(item.readAction);
        await assert.doesNotReject(
          () =>
            f.call(
              role,
              item.readAction,
              item.readAction === "settings" ? { scope: "lagos" } : {},
            ),
          `${role}: ${item.id} uses ${item.readAction}`,
        );
      }
    }
  } finally {
    await f.db.close?.();
  }
});

test("navigation aggregates run under the restricted private-schema runtime without new grants", async () => {
  const { createDatabase } = await import("../apps/web/lib/db");
  const db = await createDatabase("memory://");
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec(
      "SET search_path TO easygas_private,pg_catalog; SET ROLE easygas_server",
    );
    const f = await fixture(db);
    for (const role of [
      "owner",
      "finance",
      "administrator",
      "inventory",
      "technician",
    ])
      assert.ok((await f.call(role, "navigation")).allowed.length);
    const durations: number[] = [];
    for (let i = 0; i < 10; i++) {
      const start = performance.now();
      await f.call("owner", "navigation");
      durations.push(performance.now() - start);
    }
    const ordered = [...durations].sort((a, b) => a - b);
    console.log(
      "Navigation restricted PGlite fixture aggregate timings (ms):",
      JSON.stringify({
        samples: durations,
        median: ordered[5],
        max: ordered[9],
      }),
    );
  } finally {
    await db.close?.();
  }
});
