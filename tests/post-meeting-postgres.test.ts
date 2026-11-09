import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { migrate, type DB } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, issueSession, hashPassword } from "../apps/web/lib/auth";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "PM-T47: independent PostgreSQL callers serialize provisional creation and invoice issuance without duplicate business effects",
  { skip: enabled ? false : "Disposable local PostgreSQL not enabled" },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw new Error("Disposable local database only");
    const schema = "easygas_test_" + id().replaceAll("-", "");
    const admin = new Pool({ connectionString: url.toString(), max: 1 });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: url.toString(),
      max: 6,
      options: `-c search_path=${schema},pg_catalog -c lock_timeout=10000`,
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
      const owner = id();
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Owner',$2,$3,'owner','lagos')",
        [owner, owner + "@test.invalid", hashPassword("Fixture-password-123!")],
      );
      const token = await issueSession(db, owner);
      await dispatch(
        "reauth",
        token,
        { password: "Fixture-password-123!" },
        db,
      );
      const input = {
        name: "Fixture caller",
        phone: "08021111118",
        branchId: "lagos",
      };
      const attempts = await Promise.allSettled([
        dispatch("customers.provisional", token, input, db),
        dispatch("customers.provisional", token, input, db),
      ]);
      assert.equal(attempts.filter((x) => x.status === "fulfilled").length, 1);
      const customer = (
        attempts.find(
          (x) => x.status === "fulfilled",
        ) as PromiseFulfilledResult<any>
      ).value;
      const oid = id();
      await db.query(
        "INSERT INTO orders(id,reference,customer_id,branch_id,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash) VALUES($1,$1,$2,'lagos','fixture',now()+interval '1 day','cash',100000,500000,600000,'{}','2026-01-01','AM',$1,'fixture')",
        [oid, customer.id],
      );
      const invoices = await Promise.all([
        dispatch("invoice.issue", token, { orderId: oid }, db),
        dispatch("invoice.issue", token, { orderId: oid }, db),
      ]);
      assert.equal(invoices[0].invoice.id, invoices[1].invoice.id);
      assert.equal(
        Number(
          (await db.query("SELECT count(*) AS n FROM customer_invoices"))
            .rows[0].n,
        ),
        1,
      );
      const publicId = customer.public_customer_id;
      await migrate(db);
      assert.equal(
        (
          await db.query("SELECT public_customer_id FROM users WHERE id=$1", [
            customer.id,
          ])
        ).rows[0].public_customer_id,
        publicId,
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
