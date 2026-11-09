import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { type DB } from "../apps/web/lib/db";
import { fixture } from "./helpers/order-tracking-fixture";
import { id } from "../apps/web/lib/auth";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "ROUTE-PG01: independent connections serialize destination revisions and preserve immutable history",
  { skip: enabled ? false : "Disposable PostgreSQL required" },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw Error("Disposable local PostgreSQL only");
    const schema = "easygas_test_route_" + id().replaceAll("-", "");
    const admin = new Pool({ connectionString: String(url), max: 1 });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: String(url),
      max: 4,
      options: `-c search_path=${schema},pg_catalog -c statement_timeout=15000 -c lock_timeout=5000`,
    });
    const db: DB = {
      query: (q, p) => pool.query(q, p),
      exec: (q) => pool.query(q),
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const result = await fn({
            query: (q, p) => c.query(q, p),
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
      const f = await fixture(db);
      await f.call("owner", "reauth", {
        password: "Tracking-fixture-only-123!",
      });
      const o = await f.make();
      await f.transition(o, "accepted");
      const current = await f.snapshot(o.id);
      const input = {
        orderId: o.id,
        version: Number(current.tracking_version),
        revision: 0,
        latitude: 6.4,
        longitude: 3.4,
        evidence: "Synthetic independently confirmed pin only",
      };
      const results = await Promise.allSettled([
        f.call("owner", "dispatch.destination.confirm", {
          ...input,
          operationKey: id(),
        }),
        f.call("owner", "dispatch.destination.confirm", {
          ...input,
          operationKey: id(),
        }),
      ]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(
        results.filter(
          (r) => r.status === "rejected" && /changed/.test(String(r.reason)),
        ).length,
        1,
      );
      assert.equal(
        (await db.query("SELECT count(*)::int n FROM dispatch_destinations"))
          .rows[0].n,
        1,
      );
      await assert.rejects(
        () => db.query("DELETE FROM dispatch_destinations"),
        /immutable|append|mutation|deleted|modified/i,
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
