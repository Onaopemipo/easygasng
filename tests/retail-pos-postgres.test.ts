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
  "POS-PG01: independent connections serialize till opening, sale replay, stock deduction and cash-up",
  { skip: enabled ? false : "Disposable PostgreSQL not enabled" },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw Error("Isolated PostgreSQL required");
    const schema = "easygas_test_pos_" + id().replaceAll("-", ""),
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
      const f = await fixture(db);
      const open = () => f.call("owner", "pos.open", { branchId: "lagos", openingKobo: 10005 });
      const shifts = await Promise.allSettled([open(), open()]);
      const opened = shifts.filter(s => s.status === "fulfilled");
      assert.equal(opened.length, 1);
      const shiftId = opened[0].value.id;
      const payload = { shiftId, items: [{ productId: "hose", quantity: 2 }], tenderedKobo: 800000, idempotencyKey: id() };
      const sale = () => f.call("owner", "pos.sale", payload);
      const sales = await Promise.all([sale(), sale()]);
      assert.equal(sales[0].id, sales[1].id);
      assert.equal(Number((await one(db, "SELECT quantity FROM inventory WHERE branch_id='lagos' AND product_id='hose'"))?.quantity), 48);
      assert.equal(Number((await one(db, "SELECT count(*) n FROM stock_movements WHERE kind='pos_sale'"))?.n), 1);
      const cashUp = { shiftId, countedKobo: 710005, note: "Synthetic exact count including float" };
      const closed = await Promise.all([f.call("owner", "pos.close", cashUp), f.call("owner", "pos.close", cashUp)]);
      assert.deepEqual(closed[0], closed[1]);
      assert.equal(closed[0].expectedKobo, 710005);
      assert.equal(closed[0].varianceKobo, 0);
      assert.equal(Number((await one(db, "SELECT count(*) n FROM audit_events WHERE target=$1 AND action='pos.shift_submitted'", [shiftId]))?.n), 1);
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
