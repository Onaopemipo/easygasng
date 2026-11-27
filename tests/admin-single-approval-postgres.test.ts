import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import { one, type DB } from "../apps/web/lib/db";
import {dispatch} from "../apps/web/lib/service";
import { fixture } from "./helpers/order-tracking-fixture";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "ASA-PG: concurrent final Admin decisions serialize one high-risk approval and activation",
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
      await f.call("inventory","reauth",{password:"Tracking-fixture-only-123!"});
      const other=id();await db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Synthetic Admin',$2,$3,'owner','lagos')",[other,other+'@test.invalid',hashPassword('Synthetic-PG-Admin-123!')]);const otherToken=await issueSession(db,other);await dispatch('reauth',otherToken,{password:'Synthetic-PG-Admin-123!'},db);
      const r=await f.call("inventory","setting.propose",{key:"payment.settlement",scope:"lagos",version:1,value:{bank:"Synthetic",account:"0123456789",name:"Synthetic QA"},reason:"Synthetic exact high-risk setting"});
      const decision={id:r.id,decision:"approve",reason:"Admin final approval"};const outcomes=await Promise.allSettled([f.call("owner","approval.decide",decision),dispatch("approval.decide",otherToken,decision,db)]);
      assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.filter(x=>x.status==='rejected').length,1);
      assert.equal(Number((await one(db,"SELECT count(*) n FROM approval_decisions WHERE request_id=$1",[r.id]))!.n),1);
      assert.equal(Number((await one(db,"SELECT count(*) n FROM setting_versions WHERE request_id=$1",[r.id]))!.n),1);
      assert.equal((await one(db,"SELECT version FROM settings WHERE key='payment.settlement' AND scope='lagos'"))!.version,2);
    } finally {
      if(priorPolicy===undefined) delete process.env.EASYGAS_OWNER_AUTO_APPROVAL; else process.env.EASYGAS_OWNER_AUTO_APPROVAL=priorPolicy;
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
