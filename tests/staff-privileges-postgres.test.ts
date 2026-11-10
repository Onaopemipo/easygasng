import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { migrate, type DB } from "../apps/web/lib/db";
import { fixture } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "STAFF-PRIV-PG: concurrent administrators cannot overwrite privilege revisions; committed revocation blocks an existing session",
  {
    skip: enabled
      ? false
      : "Requires an explicitly enabled isolated local PostgreSQL test database.",
  },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw Error("Only disposable local PostgreSQL is permitted.");
    const schema = "easygas_test_" + id().replaceAll("-", ""),
      admin = new Pool({ connectionString: url.toString(), max: 1 });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: url.toString(),
      max: 4,
      options: `-c search_path=${schema},pg_catalog`,
    });
    const db: DB = {
      query: async (q, p) => (await pool.query(q, p)) as any,
      exec: (q) => pool.query(q),
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const result = await fn({
            query: async (q, p) => (await c.query(q, p)) as any,
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
      await migrate(db);
      const f = await fixture(db);
      await f.call("administrator", "reauth", {
        password: "Services-fixture-only-123!",
      });
      const body = {
        userId: f.actors.inventory.id,
        version: 0,
        changes: [{ privilege: "customers.view", effect: "grant" }],
        reason: "Concurrent isolated privilege test",
      };
      const r = await Promise.allSettled(
        ["owner", "administrator"].map((role) =>
          f.call(role, "staff.privileges.save", body),
        ),
      );
      assert.equal(r.filter((x) => x.status === "fulfilled").length, 1);
      assert.equal(r.filter((x) => x.status === "rejected").length, 1);
      assert.match(
        String(
          (r.find((x) => x.status === "rejected") as PromiseRejectedResult)
            .reason,
        ),
        /changed since/,
      );
      assert.ok((await f.call("inventory", "customers.manage")).customers);
      await f.call("owner", "staff.privileges.save", {
        ...body,
        version: 1,
        changes: [{ privilege: "customers.view", effect: "deny" }],
      });
      await assert.rejects(
        () => f.call("inventory", "customers.manage"),
        /revoked/,
      );
      assert.equal(
        Number(
          (
            await pool.query(
              "SELECT count(*) n FROM audit_events WHERE action='staff.privileges.changed'",
            )
          ).rows[0].n,
        ),
        2,
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
