import assert from "node:assert/strict";
import test from "node:test";
import { id } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
import { fixture } from "./helpers/service-fixture";

test("NOTIF-SCOPE: paginated filters and bulk reads stay recipient-scoped and preserve first read timestamps", async () => {
  const f = await fixture();
  try {
    const owner = await f.call("owner", "me");
    const customer = await f.call("customer", "me");
    const foreign = id();
    for (let index = 0; index < 18; index++) {
      await f.db.query(
        "INSERT INTO notifications(id,user_id,title,body,created_at) VALUES($1,$2,$3,'Fixture','2026-11-01T00:00:00Z')",
        [id(), owner.user.id, `Notice ${index}`],
      );
    }
    await f.db.query(
      "INSERT INTO notifications(id,user_id,title,body) VALUES($1,$2,'Private notice','Fixture')",
      [foreign, customer.user.id],
    );
    await assert.rejects(
      () => dispatch("notifications.list", null, {}, f.db),
      /sign in/i,
    );
    const first = await f.call("owner", "notifications.list", {
      filter: "unread",
    });
    const next = await f.call("owner", "notifications.list", {
      filter: "unread",
      page: "2",
    });
    assert.ok(first.unread >= 18);
    assert.equal(first.items.length, 8);
    assert.equal(next.items.length, 8);
    assert.ok(
      next.items.every(
        (item: { id: string }) =>
          !first.items.some((row: { id: string }) => row.id === item.id),
      ),
    );
    const selected = first.items[0].id;
    await f.call("owner", "notifications.read.bulk", {
      ids: [selected, foreign],
    });
    const readAt = async (notificationId: string) =>
      (
        await f.db.query("SELECT read_at FROM notifications WHERE id=$1", [
          notificationId,
        ])
      ).rows[0].read_at;
    const timestamp = await readAt(selected);
    assert.ok(timestamp);
    assert.equal(await readAt(foreign), null);
    await f.call("owner", "notifications.read", { id: selected });
    await f.call("owner", "notifications.read.bulk", { all: true });
    assert.deepEqual(await readAt(selected), timestamp);
    assert.equal(await readAt(foreign), null);
    const empty = await f.call("owner", "notifications.list", {
      filter: "unread",
      page: 3,
    });
    assert.equal(empty.unread, 0);
    assert.equal(empty.page, 1);
    assert.deepEqual(empty.items, []);
    await f.call("technician", "technician.restrict");
    assert.deepEqual(
      (await f.call("technician", "notifications.list")).items,
      [],
    );
  } finally {
    await f.db.close?.();
  }
});

test("CNIN-API01: customer search is global, literal, bounded and recipient-scoped with canonical totals and pages", async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 10; i++)
      await f.db.query(
        "INSERT INTO notifications(id,user_id,title,body,read_at,created_at) VALUES($1,$2,$3,$4,$5,$6)",
        [
          id(),
          f.actors.customer.id,
          i % 2 ? "Payment update" : "Delivery update",
          i === 9 ? "Needle 100% literal" : "Needle search fixture",
          i < 2 ? new Date().toISOString() : null,
          new Date(Date.now() - i * 60000).toISOString(),
        ],
      );
    await f.db.query(
      "INSERT INTO notifications(id,user_id,title,body) VALUES($1,$2,'Delivery update','Needle foreign private notice')",
      [id(), f.actors.technician.id],
    );
    const all = await f.call("customer", "notifications.list", {
      search: " needle ",
    });
    assert.equal(all.total, 10);
    assert.equal(all.unread, 8);
    assert.equal(all.filteredTotal, 10);
    assert.equal(all.items.length, 8);
    const page = await f.call("customer", "notifications.list", {
      search: "needle",
      page: 999,
    });
    assert.equal(page.page, 2);
    assert.equal(page.items.length, 2);
    assert.ok(
      page.items.every((n: any) => !all.items.some((p: any) => p.id === n.id)),
    );
    const filtered = await f.call("customer", "notifications.list", {
      search: "DELIVERY",
      filter: "unread",
    });
    assert.equal(filtered.filteredTotal, 4);
    assert.equal(filtered.total, 10);
    assert.ok(filtered.items.every((n: any) => !n.read_at));
    assert.equal(
      (await f.call("customer", "notifications.list", { search: "%" }))
        .filteredTotal,
      1,
    );
    assert.equal(
      (
        await f.call("customer", "notifications.list", {
          search: "not-found",
          page: 9,
        })
      ).page,
      1,
    );
    await assert.rejects(() =>
      f.call("customer", "notifications.list", { search: "x".repeat(101) }),
    );
  } finally {
    await f.db.close?.();
  }
});

test("CNIN-API02: customer order destinations require ownership even when an own notification references another customer's order", async () => {
  const f = await fixture();
  try {
    const own = id(),
      foreign = id();
    for (const [oid, uid] of [
      [own, f.actors.customer.id],
      [foreign, f.actors.technician.id],
    ])
      await f.db.query(
        "INSERT INTO orders(id,reference,customer_id,branch_id,status,payment_status,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash,delivery_code_hash,delivery_code_expires_at) VALUES($1,$1,$2,'lagos','placed','unpaid','cash',1000,0,1000,'{}',current_date,'09:00–12:00',$1,'qa','qa',now()+interval '1 day')",
        [oid, uid],
      );
    for (const oid of [own, foreign])
      await f.db.query(
        "INSERT INTO notifications(id,user_id,title,body,related_id) VALUES($1,$2,'Order update','Synthetic fixture',$3)",
        [id(), f.actors.customer.id, oid],
      );
    const result = await f.call("customer", "notifications.list");
    assert.equal(
      result.items.find((n: any) => n.related_id === own).href,
      `/orders?orderId=${own}`,
    );
    assert.equal(
      result.items.find((n: any) => n.related_id === foreign).href,
      null,
    );
  } finally {
    await f.db.close?.();
  }
});
