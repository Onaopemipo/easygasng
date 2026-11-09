import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { id } from "../apps/web/lib/auth";
test("CRM-RETURN-01: campaign return reporting requires paid delivered purchase, real completion time and no refund; branch reads stay scoped", async () => {
  const f = await fixture();
  try {
    const cid = id(),
      oid = (await f.make()).id;
    await f.db.query(
      "UPDATE orders SET status='delivered',payment_status='verified',created_at=now()-interval '3 days' WHERE id=$1",
      [oid],
    );
    await f.db.query(
      "INSERT INTO campaigns(id,branch_id,title,body,segment,status,requested_by,approved_by,created_at) VALUES($1,'lagos','Synthetic return test','Synthetic evidence only','all','completed',$2,$2,now()-interval '3 days')",
      [cid, f.actors.owner.id],
    );
    await f.db.query(
      "INSERT INTO campaign_recipients(campaign_id,user_id,status,sent_at) VALUES($1,$2,'sent',now()-interval '2 days')",
      [cid, f.actors.customer.id],
    );
    await f.db.query(
      "INSERT INTO delivery_attempts(id,order_id,driver_id,assignment_version,state,completed_at) VALUES($1,$2,$3,1,'delivered',now()-interval '1 day')",
      [id(), oid, f.actors.driver.id],
    );
    const metric = async () =>
      Number(
        (await f.call("owner", "campaigns")).find((c: any) => c.id === cid)
          .returning_customers_30d,
      );
    assert.equal(await metric(), 0);
    const total = (
      await f.db.query("SELECT total_kobo FROM orders WHERE id=$1", [oid])
    ).rows[0].total_kobo;
    await f.db.query(
      "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,$3,'cash',$4)",
      [id(), oid, total, f.actors.owner.id],
    );
    assert.equal(await metric(), 1);
    await f.db.query("UPDATE orders SET status='cancelled' WHERE id=$1", [oid]);
    assert.equal(await metric(), 0);
    await f.db.query("UPDATE orders SET status='delivered' WHERE id=$1", [oid]);
    await assert.rejects(() => f.call("customer", "campaigns"), /permission/);
    await f.db.query(
      "UPDATE delivery_attempts SET completed_at=now()+interval '1 day' WHERE order_id=$1",
      [oid],
    );
    assert.equal(await metric(), 0);
    await f.db.query(
      "UPDATE delivery_attempts SET completed_at=NULL WHERE order_id=$1",
      [oid],
    );
    assert.equal(await metric(), 0);
    await f.db.query(
      "UPDATE delivery_attempts SET completed_at=now()-interval '1 day' WHERE order_id=$1",
      [oid],
    );
    assert.equal(await metric(), 1);
    await f.db.query(
      "INSERT INTO credit_requests(id,branch_id,customer_id,order_id,amount_kobo,kind,status,requested_by,reason) VALUES($1,'lagos',$2,$3,100,'refund','approved',$4,'Synthetic approved refund evidence')",
      [id(), f.actors.customer.id, oid, f.actors.owner.id],
    );
    assert.equal(await metric(), 0);
    const before = Number(
      (await f.db.query("SELECT count(*) n FROM verified_payments")).rows[0].n,
    );
    await metric();
    assert.equal(
      Number(
        (await f.db.query("SELECT count(*) n FROM verified_payments")).rows[0]
          .n,
      ),
      before,
    );
  } finally {
    await f.db.close?.();
  }
});
test("CRM-BRANCH-01: moved customers are excluded from new campaign audiences", async () => {
  const f = await fixture();
  try {
    await f.make();
    await f.call("customer", "preferences.save", {
      marketing: true,
      refillReminders: true,
      quietStart: 0,
      quietEnd: 0,
    });
    await f.db.query(
      "INSERT INTO branches(id,name,active) VALUES('crm-other','Synthetic other branch',true)",
    );
    await f.db.query("UPDATE users SET branch_id='crm-other' WHERE id=$1", [
      f.actors.customer.id,
    ]);
    const c = await f.call("owner", "campaign.create", {
      branchId: "lagos",
      title: "Synthetic moved account",
      body: "Synthetic branch scope acceptance",
      segment: "all",
    });
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM campaign_recipients WHERE campaign_id=$1",
            [c.id],
          )
        ).rows[0].n,
      ),
      0,
    );
  } finally {
    await f.db.close?.();
  }
});

test("CRM-PAGE-01: bounded search pages retain every scoped customer and targeted follow-ups are not limited to the first page", async () => {
  const f = await fixture();
  try {
    const hash = (
      await f.db.query("SELECT password_hash FROM users WHERE id=$1", [
        f.actors.customer.id,
      ])
    ).rows[0].password_hash;
    const ids: string[] = [];
    for (let n = 0; n < 51; n++) {
      const uid = id();
      ids.push(uid);
      await f.db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,'customer','lagos')",
        [uid, "Paging fixture " + n, uid + "@example.test", hash],
      );
    }
    const seen = new Set<string>();
    let after: string | undefined;
    do {
      const page = await f.call("owner", "crm.summary", {
        q: "Paging fixture",
        limit: 20,
        ...(after ? { after } : {}),
      });
      assert.ok(page.customers.length <= 20);
      for (const c of page.customers) {
        assert.equal(seen.has(c.id), false);
        seen.add(c.id);
      }
      after = page.nextCursor ?? undefined;
    } while (after);
    assert.equal(seen.size, 51);
    const last = ids.sort().at(-1)!;
    const followup = await f.call("owner", "crm.followup.create", {
      customerId: last,
      ownerId: f.actors.owner.id,
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      nextAction: "Review actual fixture purchase history",
      operationKey: id(),
    });
    assert.ok(followup.id);
    const injection = await f.call("owner", "crm.summary", {
      q: "%' OR 1=1 --",
      limit: 20,
    });
    assert.equal(injection.customers.length, 0);
    await assert.rejects(
      () => f.call("owner", "crm.summary", { after: id(), limit: 20 }),
      /cursor/,
    );
    await assert.rejects(() => f.call("customer", "crm.summary"), /permission/);
  } finally {
    await f.db.close?.();
  }
});
