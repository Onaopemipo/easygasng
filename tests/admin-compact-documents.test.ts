import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { financialDocuments } from "../apps/web/lib/financial-documents";
import { actor } from "../apps/web/lib/auth";
test("ACMP-DOCS: compact document pages preserve canonical records, totals and status filtering and reject invalid page sizes", async () => {
  const f = await fixture();
  try {
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    for (let n = 0; n < 10; n++) {
      const o = await f.make();
      await f.call("owner", "invoice.issue", { orderId: o.id });
    }
    const user = await actor(f.db, f.actors.owner.token);
    const full = await financialDocuments(f.db, user, {});
    const first = await financialDocuments(f.db, user, { pageSize: 8 });
    const second = await financialDocuments(f.db, user, {
      pageSize: 8,
      page: 2,
    });
    assert.equal(first.rows.length, 8);
    assert.equal(second.rows.length, 2);
    assert.equal(first.total, 10);
    assert.equal(second.pageSize, 8);
    assert.deepEqual(
      [...first.rows, ...second.rows].map((r) => r.id),
      full.rows.map((r) => r.id),
    );
    const filtered = await financialDocuments(f.db, user, {
      pageSize: 8,
      status: "Unpaid invoice",
    });
    assert.equal(filtered.total, 10);
    assert.equal(filtered.rows.length, 8);
    for (const pageSize of [0, 21, -1, 1.5, "all"])
      await assert.rejects(() => financialDocuments(f.db, user, { pageSize }));
    const customer = await actor(f.db, f.actors.customer.token);
    await assert.rejects(
      () =>
        financialDocuments(f.db, customer, { pageSize: 8, branchId: "other" }),
      /authorised scope/,
    );
  } finally {
    await f.db.close?.();
  }
});
