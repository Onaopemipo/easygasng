import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { id } from "../apps/web/lib/auth";
import { one, type DB } from "../apps/web/lib/db";
import { fixture } from "./helpers/order-tracking-fixture";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "ADD-PG: concurrent addition retries post once and assignment competes on the same locked order",
  { skip: enabled ? false : "Disposable PostgreSQL not enabled" },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw Error("Isolated PostgreSQL required");
    const schema = "easygas_test_add_" + id().replaceAll("-", ""),
      admin = new Pool({ connectionString: String(url) });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: String(url),
      max: 8,
      options: `-c search_path=${schema},pg_catalog -c statement_timeout=15000 -c lock_timeout=5000`,
    });
    const db: DB = {
      query: (q, p) => pool.query(q, p),
      exec: (q) => pool.query(q),
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const r = await fn({
            query: (q, p) => c.query(q, p),
            exec: (q) => c.query(q),
          });
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
        o = await f.make(),
        d = {
          orderId: o.id,
          items: [{ productId: "hose", quantity: 1 }],
          gasLines: [],
        };
      const q = await f.call("owner", "order.addition.quote", d),
        r = {
          ...d,
          quoteHash: q.quoteHash,
          requestKey: id(),
          reason: "Synthetic requested addition before assignment",
        };
      const results = await Promise.all([
        f.call("owner", "order.addition.create", r),
        f.call("owner", "order.addition.create", r),
      ]);
      assert.equal(results[0].id, results[1].id);
      assert.equal(
        Number(
          (await one(
            db,
            "SELECT count(*) n FROM order_additions WHERE order_id=$1",
            [o.id],
          ))!.n,
        ),
        1,
      );
      const race = await f.make();
      for (const s of ["accepted", "preparing"]) await f.transition(race, s);
      const rd = { ...d, orderId: race.id },
        rq = await f.call("owner", "order.addition.quote", rd);
      const outcomes = await Promise.allSettled([
        f.call("owner", "order.addition.create", {
          ...r,
          ...rd,
          requestKey: id(),
          quoteHash: rq.quoteHash,
        }),
        f.transition(race, "assigned"),
      ]);
      assert.ok(outcomes.some((r) => r.status === "fulfilled"));
      const final = await one(db, "SELECT * FROM orders WHERE id=$1", [
        race.id,
      ]);
      const added = Number(
        (await one(
          db,
          "SELECT count(*) n FROM order_additions WHERE order_id=$1",
          [race.id],
        ))!.n,
      );
      if (outcomes[0].status === "rejected") {
        assert.equal(added, 0);
        assert.equal(final!.status, "assigned");
      } else {
        assert.equal(added, 1);
        if (outcomes[1].status === "fulfilled") {
          // Assignment may legitimately start after the addition commits and reads its new version.
          const events = (
            await db.query(
              "SELECT status,note,version FROM order_events WHERE order_id=$1 ORDER BY version",
              [race.id],
            )
          ).rows;
          const addition = events.find((e) =>
            e.note.startsWith("Supplementary request"),
          );
          const assigned = events.find((e) => e.status === "assigned");
          assert.ok(
            addition && assigned && addition.version < assigned.version,
          );
        } else assert.equal(final!.status, "preparing");
      }
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
