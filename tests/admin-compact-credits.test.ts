import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/service-fixture";
test("ACMP-CREDITS: one server pager retains all scoped credit requests and rejects invalid size, role and branch access", async () => {
  const f = await fixture();
  try {
    for (let n = 0; n < 25; n++)
      await f.call("finance", "credit.request", {
        customerId: f.actors.customer.id,
        amountKobo: 10000,
        receiptReference: `COMPACT-CREDIT-${String(n).padStart(2, "0")}`,
        reason:
          "Disposable synthetic pagination request; no actual cash received.",
      });
    const canonical = [] as any[],
      small = [] as any[];
    for (const page of [1, 2]) {
      const r = await f.call("owner", "credits", { view: "workspace", page });
      assert.equal(r.pageSize, 20);
      canonical.push(...r.rows);
    }
    for (const page of [1, 2, 3, 4]) {
      const r = await f.call("owner", "credits", {
        view: "workspace",
        page,
        pageSize: 8,
      });
      assert.equal(r.total, 25);
      assert.equal(r.pageSize, 8);
      assert.ok(r.rows.length <= 8);
      small.push(...r.rows);
    }
    assert.deepEqual(
      small.map((r) => r.id),
      canonical.map((r) => r.id),
    );
    assert.equal(new Set(small.map((r) => r.id)).size, 25);
    for (const pageSize of [0, 21, -1, 1.5, "all"])
      await assert.rejects(() =>
        f.call("owner", "credits", { view: "workspace", pageSize }),
      );
    await assert.rejects(
      () => f.call("technician", "credits", { view: "workspace", pageSize: 8 }),
      /permission|authori|access/i,
    );
    await f.db.exec(
      "INSERT INTO branches(id,name) VALUES('other','Other synthetic branch')",
    );
    await f.db.query("UPDATE users SET branch_id='other' WHERE id=$1", [
      f.actors.finance.id,
    ]);
    const foreign = await f.call("finance", "credits", {
      view: "workspace",
      pageSize: 8,
    });
    assert.equal(foreign.total, 0);
    assert.deepEqual(foreign.rows, []);
  } finally {
    await f.db.close?.();
  }
});
