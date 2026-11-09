import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { type DB } from "../apps/web/lib/db";
import { id, actor } from "../apps/web/lib/auth";
import { bulkFixture } from "./helpers/bulk-lpg-fixture";
import { bulkLPG } from "../apps/web/lib/bulk-lpg";
import { applyBulkRecovery } from "../apps/web/lib/bulk-lpg-recovery";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "BULK-PG01: separate connections serialize duplicate vehicle loads and rollback preserves canonical reservations and custody history",
  { skip: enabled ? false : "Disposable PostgreSQL required" },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw new Error("Disposable local PostgreSQL only");
    const schema = "easygas_test_bulk_" + id().replaceAll("-", ""),
      admin = new Pool({ connectionString: String(url), max: 1 });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: String(url),
      max: 6,
      options: `-c search_path=${schema},pg_catalog -c statement_timeout=15000 -c lock_timeout=5000`,
    });
    const db: DB = {
      query: (q, p) => pool.query(q, p),
      exec: (q) => pool.query(q),
      transaction: async (fn) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const value = await fn({
            query: (q, p) => client.query(q, p),
            exec: (q) => client.query(q),
          });
          await client.query("COMMIT");
          return value;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
    };
    const before = process.env.EASYGAS_BULK_LPG_ENABLED;
    try {
      const f = await bulkFixture(db),
        user = await actor(db, f.actors.inventory.token);
      const input = {
        tripId: f.trip.id,
        meterId: f.meter.id,
        grams: 10000,
        meterReadingGrams: 100000,
        orderIds: [f.order.id],
        reason: "Synthetic forced rollback load",
      };
      await assert.rejects(
        () =>
          db.transaction(async (tx) => {
            await bulkLPG(tx, user, "bulk.load.issue", input);
            throw new Error(
              "forced abort after custody and reservation writes",
            );
          }),
        /forced abort/,
      );
      assert.equal(Number((await f.balance()).reserved_grams), 6000);
      assert.equal(
        Number(
          (await db.query("SELECT count(*) n FROM bulk_lpg_loads")).rows[0].n,
        ),
        0,
      );
      const results = await Promise.allSettled([f.issue(), f.issue()]);
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(Number((await f.balance()).reserved_grams), 10000);
      assert.equal(Number((await f.balance()).grams), 20000);
      assert.equal(
        Number(
          (await db.query("SELECT count(*) n FROM bulk_lpg_loads")).rows[0].n,
        ),
        1,
      );
      assert.equal(
        Number(
          (await db.query("SELECT count(*) n FROM bulk_lpg_allocations"))
            .rows[0].n,
        ),
        1,
      );
      assert.equal(
        Number(
          (
            await db.query(
              "SELECT count(*) n FROM bulk_lpg_events WHERE kind='load.issued'",
            )
          ).rows[0].n,
        ),
        1,
      );
      const collection = id();
      await db.query(
        "INSERT INTO cash_collections(id,order_id,collector_id,amount_kobo) SELECT $1,id,$2,total_kobo FROM orders WHERE id=$3",
        [collection, f.actors.driver.id, f.order.id],
      );
      await Promise.all([
        f.call("owner", "cash.reconcile", { id: collection }),
        f.call("owner", "cash.reconcile", { id: collection }),
      ]);
      assert.equal(
        Number(
          (
            await db.query(
              "SELECT count(*) n FROM verified_payments WHERE order_id=$1",
              [f.order.id],
            )
          ).rows[0].n,
        ),
        1,
      );
      await assert.rejects(
        () => db.query("DELETE FROM bulk_lpg_events"),
        /Append-only|immutable/,
      );
      const load = (await f.call("owner", "bulk.summary")).loads[0];
      await f.call("driver", "bulk.return.declare", {
        loadId: load.id,
        version: 1,
        returnGrams: 9000,
        reason: "Synthetic PostgreSQL mass discrepancy",
        operationKey: id(),
      });
      await f.call("inventory", "bulk.return.receive", {
        loadId: load.id,
        version: 2,
        returnGrams: 9000,
        reason: "Synthetic independent PostgreSQL measurement",
        operationKey: id(),
      });
      const recovery = await f.call("inventory", "bulk.recovery.request", {
        loadId: load.id,
        version: 3,
        returnGrams: 9000,
        observedAt: new Date().toISOString(),
        evidence: "Synthetic PostgreSQL fresh measurement certificate",
        reason: "Synthetic independently investigated variance",
        operationKey: id(),
      });
      const recoveryOp = (
        await db.query(
          "SELECT * FROM inventory_operations WHERE request_id=$1",
          [recovery.requestId],
        )
      ).rows[0];
      const reviewer = await actor(db, f.actors.owner.token);
      await assert.rejects(
        () =>
          db.transaction(async (tx) => {
            await applyBulkRecovery(tx, reviewer, recoveryOp);
            throw new Error(
              "forced recovery abort after ledger and custody writes",
            );
          }),
        /forced recovery abort/,
      );
      assert.equal(Number((await f.balance()).grams), 20000);
      assert.equal(Number((await f.balance()).reserved_grams), 10000);
      assert.equal(
        (await f.call("owner", "bulk.summary")).loads[0].state,
        "held",
      );
      const approvals = await Promise.allSettled(
        [1, 2].map(() =>
          f.call("owner", "approval.decide", {
            id: recovery.requestId,
            decision: "approve",
            reason: "Synthetic concurrent independent evidence review",
          }),
        ),
      );
      assert.equal(approvals.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(approvals.filter((r) => r.status === "rejected").length, 1);
      assert.equal(Number((await f.balance()).grams), 19000);
      assert.equal(Number((await f.balance()).reserved_grams), 6000);
      assert.equal(
        Number(
          (
            await db.query(
              "SELECT count(*) n FROM bulk_lpg_events WHERE kind='return.recovered'",
            )
          ).rows[0].n,
        ),
        1,
      );
      const counts = await db.query(
        "SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname=$1 AND tablename LIKE 'bulk_lpg_%'",
        [schema],
      );
      assert.equal(counts.rows.length, 4);
      assert.ok(counts.rows.every((row) => row.rowsecurity));
    } finally {
      if (before === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
      else process.env.EASYGAS_BULK_LPG_ENABLED = before;
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
