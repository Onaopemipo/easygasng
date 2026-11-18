import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { id } from "../apps/web/lib/auth";
import type { DB, SQL } from "../apps/web/lib/db";
import { fixture } from "./helpers/order-tracking-fixture";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "DAN-PG01: concurrent assignment retries commit one driver notification and rolled-back writes publish none",
  {
    skip: enabled
      ? false
      : "Explicit disposable local PostgreSQL required; not concurrency evidence when skipped",
  },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname));
    assert.ok(url.pathname.startsWith("/easygas_test"));
    assert.ok(!process.env.DATABASE_URL);
    const schema = "easygas_test_" + id().replaceAll("-", ""),
      admin = new Pool({ connectionString: url.toString(), max: 1 });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: url.toString(),
      max: 6,
      options: `-c search_path=${schema},pg_catalog -c lock_timeout=5000`,
    });
    const wrap = (client: any): SQL => ({
      query: (q, p) => client.query(q, p),
      exec: (q) => client.query(q),
    });
    const db: DB = {
      ...wrap(pool),
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const r = await fn(wrap(c));
          await c.query("COMMIT");
          return r;
        } catch (e) {
          await c.query("ROLLBACK");
          throw e;
        } finally {
          c.release();
        }
      },
    };
    try {
      const f = await fixture(db),
        o = await f.make();
      await f.transition(o, "accepted");
      await f.transition(o, "preparing");
      const current = await f.snapshot(o.id);
      const request = {
        id: o.id,
        status: "assigned",
        driverId: f.actors.driver.id,
        version: current.tracking_version,
        note: "Synthetic concurrent assignment alert check",
        operationKey: id(),
      };
      const results = await Promise.all([
        f.call("owner", "order.transition", request),
        f.call("owner", "order.transition", request),
      ]);
      assert.ok(results.every((r) => r.ok));
      const notices = await db.query(
        "SELECT * FROM notifications WHERE user_id=$1 AND related_id=$2 AND title='Delivery assigned'",
        [f.actors.driver.id, o.id],
      );
      assert.equal(notices.rows.length, 1);
      assert.equal(
        (
          await db.query("SELECT id FROM delivery_attempts WHERE order_id=$1", [
            o.id,
          ])
        ).rows.length,
        1,
      );
      assert.equal((await f.call("driver", "notifications.list")).unread, 1);
      const second = await f.make();
      await f.transition(second, "accepted");
      await f.transition(second, "preparing");
      const state = await f.snapshot(second.id);
      const original = db.transaction;
      const failDb: DB = {
        ...db,
        transaction: (fn) =>
          original.call(db, (tx) =>
            fn({
              exec: tx.exec,
              query: async (q, p) => {
                if (q.startsWith("INSERT INTO order_events"))
                  throw new Error(
                    "Synthetic failure after notification insert",
                  );
                return tx.query(q, p);
              },
            }),
          ),
      };
      const { dispatch } = await import("../apps/web/lib/service");
      await assert.rejects(
        () =>
          dispatch(
            "order.transition",
            f.actors.owner.token,
            {
              id: second.id,
              status: "assigned",
              driverId: f.actors.driver.id,
              version: state.tracking_version,
              note: "Synthetic rollback after driver alert",
              operationKey: id(),
            },
            failDb,
          ),
        /Synthetic failure/,
      );
      assert.equal(
        (
          await db.query(
            "SELECT id FROM notifications WHERE user_id=$1 AND related_id=$2",
            [f.actors.driver.id, second.id],
          )
        ).rows.length,
        0,
      );
      assert.equal(
        (
          await db.query("SELECT id FROM delivery_attempts WHERE order_id=$1", [
            second.id,
          ])
        ).rows.length,
        0,
      );
      assert.equal((await f.snapshot(second.id)).status, "preparing");
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
