import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { dispatch } from "../apps/web/lib/service";
import { id, issueSession, hashPassword } from "../apps/web/lib/auth";
const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
async function account(f: any, role: string, branch = "lagos") {
  const uid = id();
  await f.db.query(
    "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,$6)",
    [
      uid,
      "Isolated " + role,
      uid + "@admin.example.test",
      hashPassword("Admin-tests-only-123!"),
      role,
      branch,
    ],
  );
  return { id: uid, token: await issueSession(f.db, uid) };
}
test("ADM-BIZ01: dashboard uses canonical scoped records, real statuses and zero-data states", async () => {
  const f = await fixture();
  try {
    const o = await f.make();
    const result = await f.call("owner", "admin.dashboard", {
      from: today(),
      to: today(),
    });
    assert.deepEqual(result.errors, {});
    assert.equal(result.orders.count, 1);
    assert.deepEqual(result.orders.statuses, [{ status: "placed", count: 1 }]);
    assert.equal(result.customers, 1);
    assert.equal(result.services, 0);
    assert.equal(result.revenue, 0);
    assert.equal(result.recent.rows[0].id, o.id);
    assert.equal(result.recent.rows[0].customer, "customer");
    assert.equal(result.trend[0].date, today());
    assert.equal(result.trend[0].count, 1);
    const empty = await f.call("owner", "admin.dashboard", {
      from: "2000-01-01",
      to: "2000-01-02",
    });
    assert.equal(empty.orders.count, 0);
    assert.equal(empty.revenue, 0);
    assert.equal(empty.trend.length, 0);
  } finally {
    await f.db.close?.();
  }
});
test("ADM-AUTH03: dashboard and search reject customer, forged role and cross-branch scope", async () => {
  const f = await fixture();
  try {
    await f.make();
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('admin-other','Isolated other branch')",
    );
    const manager = await account(f, "manager", "admin-other");
    const result = await dispatch(
      "admin.dashboard",
      manager.token,
      { from: today(), to: today() },
      f.db,
    );
    assert.equal(result.orders.count, 0);
    assert.equal(result.revenue, null);
    assert.equal(result.recent.rows.length, 0);
    assert.equal(
      (await dispatch("admin.search", manager.token, { q: "customer" }, f.db))
        .results.length,
      0,
    );
    await assert.rejects(
      () =>
        dispatch(
          "admin.dashboard",
          manager.token,
          { from: today(), to: today(), branchId: "lagos" },
          f.db,
        ),
      /another branch/,
    );
    await assert.rejects(
      () =>
        f.call("customer", "admin.dashboard", { from: today(), to: today() }),
      /administration|dashboard/,
    );
    await assert.rejects(
      () => f.call("customer", "admin.search", { q: "customer" }),
      /administration/,
    );
    await assert.rejects(() =>
      f.call("owner", "admin.dashboard", {
        from: today(),
        to: today(),
        role: "owner",
      }),
    );
    await f.db.query("UPDATE branches SET active=false WHERE id='admin-other'");
    await assert.rejects(
      () =>
        dispatch(
          "admin.dashboard",
          manager.token,
          { from: today(), to: today() },
          f.db,
        ),
      /active/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ADM-SEARCH12: search returns permitted records only and treats wildcards/injection as literal input", async () => {
  const f = await fixture();
  try {
    const o = await f.make();
    const own = await f.call("owner", "admin.search", { q: o.reference });
    assert.equal(own.results[0].id, o.id);
    assert.equal(own.results[0].href, "/admin/orders?orderId=" + o.id);
    const inventory = await f.call("inventory", "admin.search", {
      q: "customer",
    });
    assert.ok(
      inventory.results.every(
        (r: any) => !["Customer", "Order", "Staff"].includes(r.type),
      ),
    );
    for (const q of ["%_", "' OR true --"])
      assert.equal(
        (await f.call("owner", "admin.search", { q })).results.length,
        0,
      );
    await assert.rejects(() => f.call("owner", "admin.search", { q: "x" }));
    await assert.rejects(() =>
      f.call("owner", "admin.search", { q: "customer", branchId: "other" }),
    );
  } finally {
    await f.db.close?.();
  }
});
test("ADM-REL01: failed order widget is isolated without discarding other canonical widgets", async () => {
  const f = await fixture();
  try {
    await f.make();
    const broken: any = {
      ...f.db,
      transaction: (fn: any) =>
        f.db.transaction((tx) =>
          fn({
            ...tx,
            query: (q: string, p: any[]) => {
              if (q.includes("GROUP BY o.status"))
                throw new Error("Isolated test read failure");
              return tx.query(q, p);
            },
          }),
        ),
    };
    const result = await dispatch(
      "admin.dashboard",
      f.actors.owner.token,
      { from: today(), to: today() },
      broken,
    );
    assert.equal(result.orders, null);
    assert.ok(result.errors.orders);
    assert.equal(result.customers, 1);
    assert.equal(result.recent.rows.length, 1);
    assert.equal(result.revenue, 0);
  } finally {
    await f.db.close?.();
  }
});
test("ADM-FILTER03: invalid dates, oversized ranges and excessive pages are rejected", async () => {
  const f = await fixture();
  try {
    for (const value of [
      { from: "2026-11-05", to: "2026-01-01" },
      { from: "2000-01-01", to: "2026-01-01" },
      { from: today(), to: today(), page: 1001 },
    ])
      await assert.rejects(() => f.call("owner", "admin.dashboard", value));
  } finally {
    await f.db.close?.();
  }
});
test("ADM-BIZ02: receipts exclude unverified collections and match the existing finance definition after reconciliation", async () => {
  const f = await fixture();
  try {
    const o = await f.ready();
    const code = (await f.call("customer", "orders", { id: o.id }))[0]
      .confirmation_code;
    await f.call("driver", "delivery.complete", {
      orderId: o.id,
      version: o.tracking_version,
      code,
      collectedKobo: Number(o.total_kobo),
      handover: true,
    });
    const filters = { from: today(), to: today() };
    assert.equal(
      (await f.call("owner", "admin.dashboard", filters)).revenue,
      0,
    );
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    const cash = (await f.call("owner", "cash.collections"))[0];
    await f.call("owner", "cash.reconcile", { id: cash.id });
    const dashboard = await f.call("owner", "admin.dashboard", filters),
      finance = await f.call("owner", "finance.summary");
    assert.equal(dashboard.revenue, Number(o.total_kobo));
    assert.equal(dashboard.revenue, finance.totalVerifiedCompletedRevenueKobo);
  } finally {
    await f.db.close?.();
  }
});
test("ADM-AUTH01: single canonical login returns actual role, never accepts a requested privilege", async () => {
  const f = await fixture();
  try {
    for (const role of ["owner", "administrator", "sales"]) {
      const a = role === "owner" ? f.actors.owner : await account(f, role);
      const row = (
        await f.db.query("SELECT email FROM users WHERE id=$1", [a.id])
      ).rows[0];
      const password =
        role === "owner"
          ? "Tracking-fixture-only-123!"
          : "Admin-tests-only-123!";
      const result = await dispatch(
        "login",
        null,
        { email: row.email, password },
        f.db,
      );
      assert.equal(result.role, role);
      assert.ok(result.token);
      await assert.rejects(() =>
        dispatch(
          "login",
          null,
          { email: row.email, password, role: "owner" },
          f.db,
        ),
      );
      const snapshot = await dispatch(
        "navigation.access",
        result.token,
        {},
        f.db,
      );
      assert.equal(snapshot.user.role, role);
      if (role === "sales")
        assert.equal(snapshot.allowed.includes("staff"), false);
    }
  } finally {
    await f.db.close?.();
  }
});
test("ADM-NOTIFY12: unread totals are not limited to display rows and links recheck branch and module access", async () => {
  const f = await fixture();
  try {
    const o = await f.make();
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('notify-other','Other test branch')",
    );
    const manager = await account(f, "manager", "notify-other");
    for (let i = 0; i < 32; i++)
      await f.db.query(
        "INSERT INTO notifications(id,user_id,title,body,related_id) VALUES($1,$2,'Order update','Isolated notification',$3)",
        [id(), manager.id, o.id],
      );
    const other = await dispatch("navigation", manager.token, {}, f.db);
    assert.equal(other.unreadNotifications, 32);
    assert.equal(other.notifications.length, 30);
    assert.ok(other.notifications.every((n: any) => n.href === null));
    await f.db.query(
      "INSERT INTO notifications(id,user_id,title,body,related_id) VALUES($1,$2,'Order update','Isolated notification',$3)",
      [id(), f.actors.owner.id, o.id],
    );
    const own = await f.call("owner", "navigation");
    assert.ok(
      own.notifications.some(
        (n: any) => n.href === "/admin/orders?orderId=" + o.id,
      ),
    );
  } finally {
    await f.db.close?.();
  }
});
