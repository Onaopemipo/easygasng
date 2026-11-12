import assert from "node:assert/strict";
import test from "node:test";
import { Pool } from "pg";
import { id } from "../apps/web/lib/auth";
import { type DB } from "../apps/web/lib/db";
import { fixture } from "./helpers/order-tracking-fixture";

const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;

test(
  "CGP-PG: independent PostgreSQL transactions reject concurrent duplicate profiles and stale supply writes",
  { skip: enabled ? false : "Requires disposable local PostgreSQL." },
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
      max: 4,
      options: `-c search_path=${schema},pg_catalog -c lock_timeout=5000`,
    });
    const db: DB = {
      query: async (query, params) => (await pool.query(query, params)) as any,
      exec: (query) => pool.query(query),
      transaction: async (work) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const result = await work({
            query: async (query, params) =>
              (await client.query(query, params)) as any,
            exec: (query) => client.query(query),
          });
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
    };
    try {
      const f = await fixture(db);
      const input = {
        label: "Concurrent refill",
        productId: "refill-12",
        householdSize: 2,
        cookingDays: 7,
      };
      const creates = await Promise.allSettled([
        f.call("customer", "refill.profile.create", input),
        f.call("customer", "refill.profile.create", input),
      ]);
      const profiles = await f.call("customer", "refill.profiles");
      assert.equal(profiles.length, 1);
      assert.equal(
        creates.filter((result) => result.status === "fulfilled").length,
        1,
      );
      assert.ok(
        creates.some(
          (result) =>
            result.status === "rejected" && result.reason.status === 409,
        ),
      );

      const reports = await Promise.allSettled(
        ["low", "empty"].map((state) =>
          f.call("customer", "refill.feedback", {
            profileId: profiles[0].id,
            state,
            expectedFeedbackId: null,
          }),
        ),
      );
      assert.equal(
        reports.filter((result) => result.status === "fulfilled").length,
        1,
      );
      assert.ok(
        reports.some(
          (result) =>
            result.status === "rejected" &&
            result.reason.code === "REFILL_FEEDBACK_CONFLICT",
        ),
      );
      assert.equal(
        (await f.call("customer", "refill.profiles"))[0].feedback.length,
        1,
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
