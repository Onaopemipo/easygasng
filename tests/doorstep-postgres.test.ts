import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { type DB } from "../apps/web/lib/db";
import { id, actor } from "../apps/web/lib/auth";
import { doorstepFixture } from "./helpers/doorstep-fixture";
import { doorstepExecution } from "../apps/web/lib/doorstep-execution";

const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "DOOR-PG01: independent connections serialize reservation, cash verification and metered supplement; forced abort preserves stock and custody",
  { skip: enabled ? false : "Disposable PostgreSQL required" },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw new Error("Disposable local PostgreSQL only");
    const schema = "easygas_test_doorstep_" + id().replaceAll("-", ""),
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
    const env = { ...process.env };
    try {
      const f = await doorstepFixture(db);
      await f.consent();
      const reservations = await Promise.allSettled([f.prepare(), f.prepare()]);
      assert.equal(
        reservations.filter((r) => r.status === "fulfilled").length,
        1,
      );
      assert.equal(
        reservations.filter((r) => r.status === "rejected").length,
        1,
      );
      const p = (
        reservations.find(
          (r) => r.status === "fulfilled",
        ) as PromiseFulfilledResult<any>
      ).value;
      assert.equal(Number((await f.balance()).reserved_grams), 10000);
      assert.equal(
        Number((await f.call("driver", "bulk.summary")).loads[0].buffer_grams),
        2000,
      );
      await f.decide(p.noteId);
      await f.call("driver", "doorstep.collection.report", {
        ...f.context,
        amountKobo: p.amountKobo,
        operationKey: id(),
      });
      const verifications = await Promise.allSettled(
        [1, 2].map(() =>
          f.call("owner", "doorstep.collection.verify", {
            ...f.context,
            operationKey: id(),
          }),
        ),
      );
      assert.equal(
        verifications.filter((r) => r.status === "fulfilled").length,
        1,
      );
      assert.equal(
        Number(
          (
            await db.query(
              "SELECT count(*) n FROM verified_payments WHERE reference=$1",
              [`doorstep:${f.context.amendmentId}`],
            )
          ).rows[0].n,
        ),
        1,
      );
      const driver = await actor(db, f.actors.driver.token),
        input = { ...f.context, loadVersion: 3, meterReadingGrams: 102000 };
      await assert.rejects(
        () =>
          db.transaction(async (tx) => {
            await doorstepExecution(tx, driver, "doorstep.dispense", input);
            throw new Error("forced supplement abort after all effects");
          }),
        /forced supplement abort/,
      );
      assert.equal(Number((await f.balance()).grams), 20000);
      assert.equal(Number((await f.balance()).reserved_grams), 10000);
      assert.equal(
        (await db.query("SELECT state FROM doorstep_execution")).rows[0].state,
        "reserved",
      );
      assert.equal(
        Number(
          (await db.query("SELECT meter_reading_grams FROM bulk_lpg_loads"))
            .rows[0].meter_reading_grams,
        ),
        100000,
      );
      const dispenses = await Promise.allSettled(
        [1, 2].map(() =>
          f.call("driver", "doorstep.dispense", {
            ...input,
            operationKey: id(),
          }),
        ),
      );
      assert.equal(dispenses.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(dispenses.filter((r) => r.status === "rejected").length, 1);
      assert.equal(Number((await f.balance()).grams), 18000);
      assert.equal(Number((await f.balance()).reserved_grams), 8000);
      assert.equal(
        Number(
          (
            await db.query(
              "SELECT count(*) n FROM gas_stock_movements WHERE reference=$1",
              [`doorstep:${f.context.amendmentId}:fulfilled`],
            )
          ).rows[0].n,
        ),
        1,
      );
      await assert.rejects(
        () =>
          db.query("UPDATE doorstep_execution SET amount_kobo=amount_kobo+1"),
        /immutable/,
      );
      await assert.rejects(
        () => db.query("DELETE FROM doorstep_execution"),
        /immutable/,
      );
      const secured = (
        await db.query(
          "SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='doorstep_execution'::regclass",
        )
      ).rows[0];
      assert.ok(secured.relrowsecurity && secured.relforcerowsecurity);
    } finally {
      for (const k of [
        "EASYGAS_DOORSTEP_ENABLED",
        "EASYGAS_BULK_LPG_ENABLED",
      ]) {
        if (env[k] === undefined) delete process.env[k];
        else process.env[k] = env[k];
      }
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
