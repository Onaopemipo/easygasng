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
  "TAV-PG: independent PostgreSQL connections serialize competing availability without duplicate slots",
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
      const initial = (await f.call("owner", "technicians.workspace"))
        .schedule[0];
      const start = new Date(new Date(initial.ends_at).getTime() + 3600000);
      const input = {
        serviceId: initial.service_id,
        branchId: "lagos",
        technicianId: initial.technician_id,
        startsAt: start.toISOString(),
        endsAt: new Date(+start + 3600000).toISOString(),
      };
      const outcomes = await Promise.allSettled(
        [1, 2].map(() =>
          f.call("service_manager", "services.slot.create", input),
        ),
      );
      assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(outcomes.filter((r) => r.status === "rejected").length, 1);
      assert.match(
        String(
          (
            outcomes.find(
              (r) => r.status === "rejected",
            ) as PromiseRejectedResult
          ).reason,
        ),
        /overlap/,
      );
      assert.equal(
        Number(
          (
            await db.query(
              "SELECT count(*)::int n FROM service_slots WHERE technician_id=$1 AND starts_at=$2",
              [initial.technician_id, input.startsAt],
            )
          ).rows[0].n,
        ),
        1,
      );
      // Preserve legacy overlapping availability and test two independent customer
      // transactions against the canonical reservation lock, not only slot creation.
      const first=(outcomes.find(r=>r.status==="fulfilled") as PromiseFulfilledResult<any>).value.id;
      const legacy=id();
      await db.query("INSERT INTO service_slots(id,technician_id,service_id,branch_id,starts_at,ends_at,capacity) VALUES($1,$2,$3,$4,$5,$6,1)",[legacy,input.technicianId,input.serviceId,input.branchId,new Date(+start+1800000).toISOString(),new Date(+start+5400000).toISOString()]);
      const reservations=await Promise.allSettled([f.call("customer","booking.create",f.input(first)),f.call("commercial","booking.create",f.input(legacy))]);
      assert.equal(reservations.filter(r=>r.status==="fulfilled").length,1);
      assert.equal(reservations.filter(r=>r.status==="rejected").length,1);
      assert.match(String((reservations.find(r=>r.status==="rejected") as PromiseRejectedResult).reason),/already booked/);
      assert.equal(Number((await db.query("SELECT count(*)::int n FROM service_bookings")).rows[0].n),1);
      await assert.rejects(
        () => f.call("technician", "technicians.workspace"),
        /permission|access|authori/i,
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
