import { test } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { migrate, type DB } from "../apps/web/lib/db";
import { fixture, begin } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "TECH-T56 independent PostgreSQL connections serialize one paid work authorisation",
  {
    skip: enabled
      ? false
      : "No explicitly enabled disposable local PostgreSQL server; PGlite is not multi-connection evidence.",
  },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw new Error(
        "Only an isolated local easygas_test database with DATABASE_URL unset is permitted.",
      );
    const schema = "easygas_test_" + id().replaceAll("-", ""),
      admin = new Pool({ connectionString: url.toString(), max: 1 });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: url.toString(),
      max: 6,
      options: `-c search_path=${schema},pg_catalog`,
    });
    const db: DB = {
      query: async (q, p) => (await pool.query(q, p)) as any,
      exec: (q) => pool.query(q),
      transaction: async (fn) => {
        for (let attempt = 0; ; attempt++) {
          const c = await pool.connect();
          try {
            await c.query("BEGIN");
            const result = await fn({
              query: async (q, p) => (await c.query(q, p)) as any,
              exec: (q) => c.query(q),
            });
            await c.query("COMMIT");
            return result;
          } catch (e: any) {
            await c.query("ROLLBACK");
            if (!["40P01", "40001"].includes(e.code) || attempt >= 2) throw e;
          } finally {
            c.release();
          }
        }
      },
    };
    try {
      await migrate(db);
      const f = await fixture(db);
      const booking = await begin(f);
      let current = (await f.call("technician", "bookings"))[0];
      const denied = await Promise.allSettled(
        [1, 2].map(() =>
          f.call("technician", "booking.work.start", {
            bookingId: booking.id,
            version: current.version,
            reason: "Concurrent unpaid work must be denied",
            operationKey: id(),
          }),
        ),
      );
      assert.equal(denied.filter((r) => r.status === "rejected").length, 2);
      await f.call("technician", "booking.cash.record", {
        bookingId: booking.id,
        amountKobo: 120000,
        reference: "PG-PREWORK-" + id(),
      });
      const receipt = (
        await db.query(
          "SELECT id FROM service_cash_collections WHERE booking_id=$1",
          [booking.id],
        )
      ).rows[0];
      await f.call("finance", "booking.cash.verify", {
        bookingId: booking.id,
        collectionId: receipt.id,
      });
      current = (await f.call("technician", "bookings"))[0];
      const request = {
        bookingId: booking.id,
        version: current.version,
        reason: "Concurrent verified paid work start",
        operationKey: id(),
      };
      const committed = await Promise.all([
        f.call("technician", "booking.work.start", request),
        f.call("technician", "booking.work.start", request),
      ]);
      assert.equal(committed[0].ok, true);
      assert.equal(committed[1].ok, true);
      const events = await db.query(
        "SELECT count(*)::int n FROM service_booking_events WHERE booking_id=$1 AND note LIKE 'Chargeable work authorised%'",
        [booking.id],
      );
      assert.equal(events.rows[0].n, 1);
      await assert.rejects(
        () =>
          f.call("technician", "booking.work.start", {
            ...request,
            operationKey: id(),
          }),
        /Refresh/,
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
