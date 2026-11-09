import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { id } from "../apps/web/lib/auth";
import { type DB, one } from "../apps/web/lib/db";
import { rewardsFixture } from "./helpers/rewards-fixture";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "ER-11: independent PostgreSQL connections cannot spend the same points across simultaneous checkouts",
  {
    skip: enabled
      ? false
      : "NOT_TESTED: an explicitly enabled disposable local PostgreSQL target is unavailable; PGlite is not independent-connection evidence.",
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
          const r = await fn({
            query: async (q, p) => (await c.query(q, p)) as any,
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
    const old = process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED;
    process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED = "true";
    try {
      const f = await rewardsFixture(db);
      await f.approve();
      await db.query(
        "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,100,$1)",
        [id(), f.actors.customer.id],
      );
      const payload = () => ({
        items: [{ productId: "hose", quantity: 1 }],
        address: {
          name: "Synthetic customer",
          phone: "08012345678",
          street: "12 Synthetic Street",
          zone: "Lekki",
        },
        date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        window: "14:00–18:00",
        paymentMethod: "cash_on_delivery",
        rewardPoints: 100,
        idempotencyKey: id(),
      });
      const result = await Promise.allSettled([
        f.call("customer", "checkout", payload()),
        f.call("customer", "checkout", payload()),
      ]);
      assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(
        Number(
          (await one(
            db,
            "SELECT sum(points) n FROM reward_entries WHERE customer_id=$1",
            [f.actors.customer.id],
          ))!.n,
        ),
        0,
      );
      assert.equal(
        Number(
          (await one(db, "SELECT count(*) n FROM reward_order_discounts"))!.n,
        ),
        1,
      );
    } finally {
      if (old === undefined)
        delete process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED;
      else process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED = old;
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
