import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { migrate, one, type DB } from "../apps/web/lib/db";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import {
  preparePayment,
  initializePayment,
  reconcilePayment,
} from "../apps/web/lib/payments/orchestrator";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "PAY-PG-CONCURRENCY: separate connections post once; aborted posting rolls back wallet, audit and receipt",
  { skip: enabled ? false : "Disposable PostgreSQL not enabled" },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw new Error("Isolated local test database required");
    const schema = "easygas_test_pay_" + id().replaceAll("-", "");
    const admin = new Pool({ connectionString: String(url), max: 1 });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: String(url),
      max: 10,
      options: `-c search_path=${schema},pg_catalog -c statement_timeout=15000 -c lock_timeout=5000`,
    });
    let crash = false;
    const db: DB = {
      query: (q, p) => pool.query(q, p),
      exec: (q) => pool.query(q),
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const v = await fn({
            query: async (q, p) => {
              if (crash && q.startsWith("INSERT INTO payment_postings")) {
                crash = false;
                throw new Error(
                  "Injected process failure before posting commit",
                );
              }
              return c.query(q, p);
            },
            exec: (q) => c.query(q),
          });
          await c.query("COMMIT");
          return v;
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
      const uid = id();
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Synthetic PG fixture',$2,$3,'customer',NULL)",
        [uid, uid + "@example.test", hashPassword("Fixture-only-123!")],
      );
      const token = await issueSession(db, uid);
      const policy = {
        enabled: true,
        environment: "test",
        channels: ["card"],
        fee: {
          version: 1,
          currency: "NGN",
          percentageBps: 170,
          fixedKobo: 110,
          fixedWaivedBelowKobo: 2500,
          capKobo: 2000,
          rounding: "ceil",
          maximumGrossKobo: 10000000,
          bearer: "customer",
        },
        providerAutomaticFees: "off",
        passThroughApproved: true,
        merchantApprovalReference: "SYNTHETIC PG FIXTURE ONLY",
        quoteLifetimeSeconds: 600,
        walletFunding: true,
        walletMinimumKobo: 100,
        walletMaximumKobo: 1000000,
        partialInvoices: false,
      };
      await db.query(
        "UPDATE settings SET value=$1 WHERE key='payment.gateway'",
        [JSON.stringify(policy)],
      );
      let calls = 0;
      const runtime: any = {
        callbackOrigin: "http://127.0.0.1:3003",
        provider: {
          environment: "test",
          initialize: async () => {
            calls++;
            return { checkoutUrl: "https://checkout.paystack.com/fixture" };
          },
          verify: async (reference: string) => {
            const r = await one(
              db,
              "SELECT a.id,i.quote,i.email_snapshot FROM payment_attempts a JOIN payment_intents i ON i.id=a.intent_id WHERE a.reference=$1",
              [reference],
            );
            return {
              reference,
              status: "success",
              environment: "test",
              currency: "NGN",
              amountKobo: r!.quote.grossKobo,
              attemptId: r!.id,
              email: r!.email_snapshot,
              providerId: "PG-MOCK-" + r!.id,
              feeKobo: r!.quote.estimatedFeeKobo,
            };
          },
        },
      };
      const key = id();
      const repeated = await Promise.all(
        [1, 2, 3].map(() =>
          preparePayment(db, token, {
            purpose: "wallet",
            amountKobo: 20000,
            requestKey: key,
          }),
        ),
      );
      assert.equal(new Set(repeated.map((r) => r.id)).size, 1);
      const q = repeated[0],
        consent = {
          intentId: q.id,
          acceptedGrossKobo: q.quote.grossKobo,
          acceptedPolicyVersion: q.quote.gatewayPolicyVersion,
        };
      await Promise.all(
        [1, 2, 3].map(() => initializePayment(db, token, consent, runtime)),
      );
      assert.equal(calls, 1);
      crash = true;
      await assert.rejects(
        () => reconcilePayment(db, q.attempt.reference, runtime),
        /Injected/,
      );
      assert.equal(
        Number((await one(db, "SELECT count(*) n FROM wallet_entries"))!.n),
        0,
      );
      assert.equal(
        Number((await one(db, "SELECT count(*) n FROM payment_postings"))!.n),
        0,
      );
      const results = await Promise.all(
        [1, 2, 3, 4].map(() =>
          reconcilePayment(db, q.attempt.reference, runtime),
        ),
      );
      assert.ok(results.every((r) => r.status === "paid"));
      assert.equal(results.filter((r) => !r.replayed).length, 1);
      assert.equal(
        Number(
          (await one(
            db,
            "SELECT sum(amount_kobo) n FROM wallet_entries WHERE customer_id=$1",
            [uid],
          ))!.n,
        ),
        20000,
      );
      assert.equal(
        Number((await one(db, "SELECT count(*) n FROM payment_postings"))!.n),
        1,
      );
      assert.equal(
        Number(
          (await one(
            db,
            "SELECT count(*) n FROM audit_events WHERE action='payment.sandbox_posted'",
          ))!.n,
        ),
        1,
      );
      // The new order target shares the same real PostgreSQL locking and posting authority.
      const oid=id();
      await db.query(`INSERT INTO orders(id,reference,customer_id,branch_id,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash)
        VALUES($1,$1,$2,'lagos','fixture',now()+interval '1 day','card',100000,500000,600000,'{"street":"Synthetic Road 10","zone":"Lekki"}','2026-12-01','AM',$1,'fixture')`,[oid,uid]);
      const orderKey=id();
      const quotes=await Promise.all([1,2,3].map(()=>preparePayment(db,token,{purpose:"order",orderId:oid,requestKey:orderKey})));
      assert.equal(new Set(quotes.map(q=>q.id)).size,1);
      const oq=quotes[0];
      await Promise.all([1,2,3].map(()=>initializePayment(db,token,{intentId:oq.id,acceptedGrossKobo:oq.quote.grossKobo,acceptedPolicyVersion:oq.quote.gatewayPolicyVersion},runtime)));
      const posted=await Promise.all([1,2,3,4].map(()=>reconcilePayment(db,oq.attempt.reference,runtime)));
      assert.ok(posted.every(r=>r.status==="paid"));
      assert.equal(posted.filter(r=>!r.replayed).length,1);
      assert.equal(Number((await one(db,"SELECT count(*) n FROM verified_payments WHERE order_id=$1",[oid]))!.n),1);
      assert.equal(Number((await one(db,"SELECT sum(amount_kobo) n FROM verified_payments WHERE order_id=$1",[oid]))!.n),600000);
      assert.equal((await one(db,"SELECT payment_status FROM orders WHERE id=$1",[oid]))!.payment_status,"verified");
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
