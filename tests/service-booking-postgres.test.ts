import { test } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { migrate, type DB } from "../apps/web/lib/db";
import { fixture } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "EO-PG: independent PostgreSQL connections serialize duplicate operations and final-slot competition",
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
      const request = { ...f.input(), operationKey: id() };
      const results = await Promise.all([
        f.call("customer", "booking.create", request),
        f.call("customer", "booking.create", request),
      ]);
      assert.equal(results[0].id, results[1].id);
      const slot = await f.createSlot(3);
      await assert.rejects(() => f.createSlot(3.5), /overlaps an existing appointment/);
      // Simulate an overlapping slot retained from before availability validation.
      const overlap = { id: id() };
      await db.query(
        `INSERT INTO service_slots(id,service_id,branch_id,technician_id,starts_at,ends_at,capacity)
         SELECT $1,service_id,branch_id,technician_id,starts_at+interval '30 minutes',ends_at+interval '30 minutes',1
         FROM service_slots WHERE id=$2`,
        [overlap.id, slot.id],
      );
      const race = await Promise.allSettled([
        f.call("customer", "booking.create", {
          ...f.input(slot.id),
          operationKey: id(),
        }),
        f.call("commercial", "booking.create", {
          ...f.input(overlap.id),
          operationKey: id(),
        }),
      ]);
      assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
      const b = (await f.call("customer", "bookings")).find(
          (b: any) => b.id === results[0].id,
        ),
        next = await f.createSlot(8);
      const conflict = await Promise.allSettled([
        f.call("customer", "booking.cancel", {
          bookingId: b.id,
          version: b.version,
          reason: "Concurrent customer cancellation",
          operationKey: id(),
        }),
        f.call("customer", "booking.reschedule", {
          bookingId: b.id,
          version: b.version,
          slotId: next.id,
          reason: "Concurrent customer rescheduling",
          operationKey: id(),
        }),
      ]);
      assert.equal(conflict.filter((r) => r.status === "fulfilled").length, 1);
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
