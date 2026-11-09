import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { id } from "../apps/web/lib/auth";
import { type DB, one } from "../apps/web/lib/db";
import { fixture } from "./helpers/order-tracking-fixture";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "TRK-17: independent PostgreSQL connections serialize final-capacity assignment and duplicate proof",
  {
    skip: enabled
      ? false
      : "NOT_TESTED: no explicitly enabled disposable local PostgreSQL; Docker daemon unavailable. PGlite is not concurrency evidence.",
  },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw new Error("Disposable local easygas_test database required.");
    const schema = "easygas_test_" + id().replaceAll("-", "");
    const admin = new Pool({ connectionString: url.toString(), max: 1 });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: url.toString(),
      max: 6,
      options: `-c search_path=${schema},pg_catalog -c lock_timeout=5000`,
    });
    const db: DB = {
      query: async (q, p) => (await pool.query(q, p)) as any,
      exec: (q) => pool.query(q),
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const result = await fn({
            query: async (q, p) => (await c.query(q, p)) as any,
            exec: (q) => c.query(q),
          });
          await c.query("COMMIT");
          return result;
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
        a = await f.assigned(),
        b = await f.assigned();
      await f.transition(a, "delivery_failed");
      await f.transition(b, "delivery_failed");
      await db.query(
        "UPDATE settings SET value='1' WHERE key='delivery.capacity' AND scope='lagos'",
      );
      const results = await Promise.allSettled([
        f.transition(a, "assigned"),
        f.transition(b, "assigned"),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      const current = await one(
        db,
        "SELECT id FROM orders WHERE status='assigned'",
      );
      await f.pickup(current);
      await f.transition(current, "out_for_delivery", "driver");
      const o = await f.snapshot(current!.id);
      const code = (await f.call("customer", "orders", { id: o.id }))[0]
        .confirmation_code;
      const payload = {
        operationKey: id(),
        orderId: o.id,
        version: o.tracking_version,
        code,
        handover: true,
        collectedKobo: Number(o.total_kobo),
      };
      await Promise.all([
        f.call("driver", "delivery.complete", payload),
        f.call("driver", "delivery.complete", payload),
      ]);
      assert.equal(
        Number(
          (await one(
            db,
            "SELECT count(*) n FROM cash_collections WHERE order_id=$1",
            [o.id],
          ))!.n,
        ),
        1,
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
