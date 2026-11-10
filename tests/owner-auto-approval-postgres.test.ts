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
  "OWNER-AUTO-PG: independent PostgreSQL owner submissions and repeated applications serialize one version and one authorisation",
  { skip: enabled ? false : "Disposable PostgreSQL not enabled" },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw Error("Isolated PostgreSQL required");
    const schema = "easygas_test_owner_" + id().replaceAll("-", ""),
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
    const priorPolicy = process.env.EASYGAS_OWNER_AUTO_APPROVAL;
    try {
      const f = await fixture(db);
      await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
      process.env.EASYGAS_OWNER_AUTO_APPROVAL = "true";
      const original = await one(db, "SELECT version FROM settings WHERE key='gas.price_per_kg' AND scope='lagos'");
      const input = {key:"gas.price_per_kg",scope:"lagos",version:original!.version,value:180500,reason:"Synthetic concurrent owner policy request"};
      const outcomes = await Promise.allSettled([f.call("owner","setting.propose",input),f.call("owner","setting.propose",{...input,value:181000})]);
      assert.equal(outcomes.filter(x=>x.status==="fulfilled").length,1);
      assert.equal(outcomes.filter(x=>x.status==="rejected").length,1);
      const accepted = outcomes.find(x=>x.status==="fulfilled") as PromiseFulfilledResult<any>;
      assert.equal(accepted.value.status,"active");
      const repeat = await Promise.all([f.call("owner","approval.owner_apply",{id:accepted.value.id,reason:"Repeat owner activation"}),f.call("owner","approval.owner_apply",{id:accepted.value.id,reason:"Repeat owner activation"})]);
      assert.ok(repeat.every(x=>x.status==="active"));
      assert.equal(Number((await one(db,"SELECT count(*) n FROM setting_versions WHERE request_id=$1",[accepted.value.id]))!.n),1);
      assert.equal(Number((await one(db,"SELECT count(*) n FROM audit_events WHERE target=$1 AND action='approval.owner_auto_approved'",[accepted.value.id]))!.n),1);
      assert.equal((await one(db,"SELECT version FROM settings WHERE key='gas.price_per_kg' AND scope='lagos'"))!.version,original!.version+1);
    } finally {
      if(priorPolicy===undefined) delete process.env.EASYGAS_OWNER_AUTO_APPROVAL; else process.env.EASYGAS_OWNER_AUTO_APPROVAL=priorPolicy;
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
