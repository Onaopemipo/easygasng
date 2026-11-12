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
