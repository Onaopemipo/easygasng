import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase, one } from "../apps/web/lib/db";
import { setup } from "./helpers/daily-delivery-fixture";
import { Pool } from "pg";
import { id } from "../apps/web/lib/auth";
test("DAY-PG concurrent different-key refill requests debit physical stock once and same-key retries replay", async () => {
  assert(
    process.env.EASYGAS_TEST_POSTGRES_URL,
    "Use the disposable daily QA PostgreSQL database",
  );
  const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
  assert(
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
      url.pathname === "/easygas_daily_qa",
  );
  const adminURL = new URL(url);
  adminURL.pathname = "/postgres";
  const admin = new Pool({ connectionString: adminURL.toString() });
  const database = "easygas_daily_qa_" + Date.now();
  await admin.query("CREATE DATABASE " + database);
  url.pathname = "/" + database;
  await admin.query(
    "DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN CREATE ROLE easygas_server NOLOGIN; END IF; END $$",
  );
  process.env.DATABASE_URL = url.toString();
  process.env.NODE_ENV = "test";
  const db = await createDatabase();
  const reader = "daily_qa_reader_" + Date.now();
  await admin.query("CREATE ROLE " + reader + " NOLOGIN");
  const f = await setup(db);
  try {
    await f.start();
    const o = await f.make();
    await f.assign(o);
    let c = await f.arrive(o);
    const input = {
      orderId: o.id,
      version: c.tracking_version,
      readings: [{ beforeKg: 8, afterKg: 14 }],
      operationKey: id(),
    };
    const both = await Promise.allSettled([
      f.call("driver", "daily.refill.record", input),
      f.call("driver", "daily.refill.record", { ...input, operationKey: id() }),
    ]);
    assert.equal(both.filter((x) => x.status === "fulfilled").length, 1);
    assert.equal(both.filter((x) => x.status === "rejected").length, 1);
    const stock = await one(
      db,
      "SELECT grams,reserved_grams FROM gas_stock WHERE branch_id='lagos'",
    );
    assert.equal(Number(stock?.grams), 494000);
    assert.equal(Number(stock?.reserved_grams), 94000);
    assert.equal(
      Number(
        (
          await one(
            db,
            "SELECT count(*) n FROM daily_delivery_refills WHERE order_id=$1",
            [o.id],
          )
        )?.n,
      ),
      1,
    );
    const winning = both[0].status === "fulfilled" ? input : undefined;
    if (winning)
      assert.equal(
        (await f.call("driver", "daily.refill.record", winning)).replayed,
        true,
      );
    await db.exec(
      "GRANT USAGE ON SCHEMA easygas_private TO " +
        reader +
        "; GRANT SELECT ON daily_delivery_refills TO " +
        reader,
    );
    await db.transaction(async (tx) => {
      await tx.exec("SET LOCAL ROLE " + reader);
      assert.equal(
        (await tx.query("SELECT * FROM daily_delivery_refills")).rows.length,
        0,
      );
    });
    const flags = (
      await db.query(
        "SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class WHERE relname LIKE 'daily_delivery_%' AND relkind='r'",
      )
    ).rows;
    assert.equal(flags.length, 4);
    assert(flags.every((r) => r.relrowsecurity && r.relforcerowsecurity));
    await db.transaction(async (tx) => {
      await tx.exec("SET LOCAL ROLE easygas_server");
      const measured = await one(
        tx,
        "SELECT supplied_grams FROM daily_delivery_refills WHERE order_id=$1",
        [o.id],
      );
      assert.equal(Number(measured?.supplied_grams), 6000);
      await assert.rejects(
        () =>
          tx.query(
            "UPDATE daily_delivery_refills SET supplied_grams=1 WHERE order_id=$1",
            [o.id],
          ),
        /permission denied/,
      );
    });
    await assert.rejects(
      () =>
        db.query(
          "UPDATE daily_delivery_refills SET supplied_grams=1 WHERE order_id=$1",
          [o.id],
        ),
      /immutable|Append-only/,
    );
  } finally {
    await db.close?.();
    await admin.query("DROP DATABASE " + database);
    await admin.query("DROP ROLE " + reader);
    await admin.end();
  }
});
