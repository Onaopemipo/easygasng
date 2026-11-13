import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
test("CRM-PAGE01: all follow-ups remain reachable with stable equal-date pagination and branch-private cursors", async () => {
  const f = await fixture();
  try {
    const sales = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Synthetic sales',$2,$3,'manager','lagos')",
      [sales, `${sales}@example.test`, hashPassword("Fixture-only-123!")],
    );
    f.actors.sales = { id: sales, token: await issueSession(f.db, sales) };
    const ids = [];
    for (let i = 0; i < 205; i++) {
      const fid = id();
      ids.push(fid);
      await f.db.query(
        "INSERT INTO crm_followups(id,customer_id,branch_id,owner_id,next_action,due_at,created_by) VALUES($1,$2,'lagos',$3,'Synthetic follow-up', '2026-11-10T12:00:00.123456Z',$3)",
        [fid, f.actors.customer.id, sales],
      );
    }
    let after: string | undefined;
    const seen: string[] = [];
    do {
      const page = await f.call("sales", "crm.followups", {
        limit: 100,
        ...(after ? { after } : {}),
      });
      seen.push(...page.followups.map((r: any) => r.id));
      after = page.nextCursor ?? undefined;
    } while (after);
    assert.equal(seen.length, 205);
    assert.equal(new Set(seen).size, 205);
    assert.deepEqual(seen, [...ids].sort());
    const summary = await f.call("sales", "crm.summary");
    assert.equal(summary.followups.length, 100);
    assert.equal(summary.followupsHasMore, true);
    await assert.rejects(
      () => f.call("customer", "crm.followups"),
      /permission/,
    );
    await assert.rejects(
      () => f.call("sales", "crm.followups", { after: id() }),
      /cursor/,
    );
    const foreign = id();
    await f.db.query(
      "INSERT INTO crm_followups(id,customer_id,branch_id,owner_id,next_action,due_at,created_by) VALUES($1,$2,'lagos',$3,'Synthetic foreign follow-up',now(),$3)",
      [foreign, f.actors.customer.id, sales],
    );
    await f.db.query("UPDATE users SET branch_id=NULL WHERE id=$1", [sales]);
    const hidden = await f.call("sales", "crm.followups");
    assert.equal(hidden.followups.length, 0);
    await assert.rejects(
      () => f.call("sales", "crm.followups", { after: foreign }),
      /cursor/,
    );
  } finally {
    await f.db.close?.();
  }
});
