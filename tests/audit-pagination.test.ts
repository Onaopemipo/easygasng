import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { dispatch } from "../apps/web/lib/service";
import { hashPassword, id, issueSession } from "../apps/web/lib/auth";
test("AUDIT-PAGE01: server pages beyond the legacy200 cap with stable ties, full-history literal search and no mutation", async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 215; i++)
      await f.db.query(
        "INSERT INTO audit_events(id,actor_id,action,target,outcome,detail,created_at) VALUES($1,$2,'pagination_fixture',$3,'success',$4,'2020-01-01T00:00:00Z')",
        [
          "page-fixture-" + String(i).padStart(3, "0"),
          f.actors.owner.id,
          i === 0 ? "literal%_\\needle" : "target-" + i,
          JSON.stringify({ fixture: i }),
        ],
      );
    const before = (
      await f.db.query(
        "SELECT * FROM audit_events WHERE action='pagination_fixture' AND id LIKE 'page-fixture-%' ORDER BY id",
      )
    ).rows;
    const seen = new Set<string>();
    for (let page = 1; page <= 9; page++) {
      const result = await f.call("owner", "audit", {
        view: "paged",
        q: "pagination_fixture",
        page,
        pageSize: 25,
      });
      assert.equal(result.total, 215);
      assert.equal(result.totalPages, 9);
      assert.equal(result.page, page);
      assert.ok(result.rows.length <= 25);
      for (const row of result.rows) {
        assert.ok(!seen.has(row.id));
        seen.add(row.id);
      }
    }
    assert.equal(seen.size, 215);
    const anchored = await f.call("owner", "audit", {
      view: "paged",
      q: "pagination_fixture",
      pageSize: 25,
    });
    await f.db.query(
      "INSERT INTO audit_events(id,action,target,outcome,created_at) VALUES('page-later','pagination_fixture','later','success',clock_timestamp())",
    );
    const stillAnchored = await f.call("owner", "audit", {
      view: "paged",
      q: "pagination_fixture",
      pageSize: 25,
      page: 2,
      snapshot: anchored.snapshot,
    });
    assert.equal(stillAnchored.total, 215);
    const fresh = await f.call("owner", "audit", {
      view: "paged",
      q: "pagination_fixture",
    });
    assert.equal(fresh.total, 216);

    const first = await f.call("owner", "audit", {
      view: "paged",
      q: "pagination_fixture",
      pageSize: 10,
      snapshot: anchored.snapshot,
    });
    assert.equal(first.rows[0].id, "page-fixture-214");
    assert.equal(first.rows.length, 10);
    const last = await f.call("owner", "audit", {
      view: "paged",
      q: "pagination_fixture",
      page: 999,
      pageSize: 100,
      snapshot: anchored.snapshot,
    });
    assert.equal(last.page, 3);
    assert.equal(last.rows.length, 15);
    const literal = await f.call("owner", "audit", {
      view: "paged",
      q: "%_\\needle",
    });
    assert.equal(literal.total, 1);
    assert.equal(literal.rows[0].id, "page-fixture-000");
    const empty = await f.call("owner", "audit", {
      view: "paged",
      q: "does-not-exist-audit-fixture",
      page: 999,
    });
    assert.equal(empty.total, 0);
    assert.equal(empty.page, 1);
    assert.equal(empty.totalPages, 1);
    // A transaction begun earlier can commit after the first page with an older timestamp.
    await f.db.query(
      "INSERT INTO audit_events(id,action,target,outcome,created_at) VALUES('page-late-commit','pagination_fixture','late commit','success',$1::timestamptz-interval '1 second')",
      [anchored.snapshot],
    );
    const cursorPage = await f.call("owner", "audit", {
      view: "paged",
      q: "pagination_fixture",
      page: 2,
      pageSize: 25,
      snapshot: anchored.snapshot,
      cursor: anchored.lastCursor,
    });
    assert.equal(cursorPage.rows.length, 25);
    assert.ok(
      cursorPage.rows.every(
        (r: any) => !anchored.rows.some((x: any) => x.id === r.id),
      ),
    );
    const backwards = await f.call("owner", "audit", {
      view: "paged",
      q: "pagination_fixture",
      page: 1,
      pageSize: 25,
      snapshot: anchored.snapshot,
      cursor: cursorPage.firstCursor,
      direction: "newer",
    });
    assert.deepEqual(
      backwards.rows.map((r: any) => r.id),
      anchored.rows.map((r: any) => r.id),
    );

    assert.ok(
      stillAnchored.rows.every(
        (r: any) => !anchored.rows.some((x: any) => x.id === r.id),
      ),
    );
    const legacy = await f.call("owner", "audit");
    assert.ok(Array.isArray(legacy));
    assert.equal(legacy.length, 200);
    assert.deepEqual(
      (
        await f.db.query(
          "SELECT * FROM audit_events WHERE action='pagination_fixture' AND id LIKE 'page-fixture-%' ORDER BY id",
        )
      ).rows,
      before,
    );
  } finally {
    await f.db.close?.();
  }
});
test("AUDIT-PAGE02: authorised administrator retains global read; customer/operational roles and invalid pagination are rejected", async () => {
  const f = await fixture();
  try {
    const uid = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Audit administrator',$2,$3,'administrator','lagos')",
      [
        uid,
        uid + "@audit.example.test",
        hashPassword("Audit-fixture-only-123!"),
      ],
    );
    const token = await issueSession(f.db, uid);
    const result = await dispatch(
      "audit",
      token,
      { view: "paged", pageSize: "10", page: "1" },
      f.db,
    );
    assert.ok(Array.isArray(result.rows));
    await assert.rejects(()=>dispatch("audit",null,{view:"paged"},f.db),e=>(e as any).status===401);
    for (const role of [
      "customer",
      "commercial",
      "driver",
      "dispatcher",
      "inventory",
    ])
      await assert.rejects(
        () => f.call(role, "audit", { view: "paged" }),
        (e) => (e as any).status === 403,
      );
    for (const input of [
      { page: 0 },
      { page: -1 },
      { pageSize: 101 },
      { pageSize: 1 },
      { pageSize: 10.5 },
      { page: "no" },
      { view: "other" },
      { q: "x".repeat(201) },
      { unknown: true },
      { snapshot: "not-a-date" },
      { cursor: "not-json" },
      { cursor: JSON.stringify({ at: "not-date", id: "x" }) },
      { direction: "sideways" },
    ])
      await assert.rejects(() =>
        f.call("owner", "audit", { view: "paged", ...input }),
      );
  } finally {
    await f.db.close?.();
  }
});
