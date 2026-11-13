import { consolidatedRole } from "../packages/business-rules/src/staff-roles";
import test from "node:test";
import { invoiceAction } from "../apps/web/lib/invoices";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import {
  preparePayment,
  initializePayment,
  reconcilePayment,
  readPayment,
} from "../apps/web/lib/payments/orchestrator";
import {
  receivePaystackEvent,
  receiveAndVerifyPaystackEvent,
  processPaystackInbox,
} from "../apps/web/lib/payments/webhooks";
import { paymentReceipt } from "../apps/web/lib/payments/documents";
import { paystackReport } from "../apps/web/lib/payments/reporting";
import { actor } from "../apps/web/lib/auth";
import { paystackRuntime } from "../apps/web/lib/payments/runtime";
async function fixture() {
  const db = await createDatabase("memory://");
  await migrate(db);
  const uid = id(),
    other = id(),
    driver = id();
  for (const [x, role] of [
    [uid, "customer"],
    [other, "customer"],
    [driver, "driver"],
  ])
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Synthetic payment fixture',$2,$3,$4,'lagos')",
      [x, x + "@example.test", hashPassword("Fixture-only123!"), consolidatedRole(role)],
    );
  const token = await issueSession(db, uid),
    otherToken = await issueSession(db, other),
    driverToken = await issueSession(db, driver);
  await db.query("UPDATE settings SET value=$1 WHERE key='payment.gateway'", [
    JSON.stringify({
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
      merchantApprovalReference: "MOCK-ONLY isolated fixture policy",
      quoteLifetimeSeconds: 600,
      walletFunding: true,
      walletMinimumKobo: 100,
      walletMaximumKobo: 1000000,
      partialInvoices: false,
    }),
  ]);
  let initializes = 0,
    unavailable = false,
    alter: any = {};
  const provider: any = {
    environment: "test",
    initialize: async () => {
      initializes++;
      if (unavailable)
        throw new Error("Simulated lost initialization response");
      return { checkoutUrl: "https://checkout.paystack.com/fixture" };
    },
    verify: async (reference: string) => {
      const a = await one(
        db,
        "SELECT a.*,i.quote,i.email_snapshot FROM payment_attempts a JOIN payment_intents i ON i.id=a.intent_id WHERE a.reference=$1",
        [reference],
      );
      return {
        reference,
        status: "success",
        currency: "NGN",
        amountKobo: a!.quote.grossKobo,
        environment: "test",
        providerId: "MOCK-" + a!.id,
        feeKobo: a!.quote.estimatedFeeKobo,
        email: a!.email_snapshot,
        attemptId: a!.id,
        ...alter,
      };
    },
  };
  return {
    db,
    uid,
    token,
    otherToken,
    driverToken,
    runtime: { provider, callbackOrigin: "http://127.0.0.1:3003" },
    setAlter: (v: any) => (alter = v),
    setUnavailable: () => (unavailable = true),
    initializes: () => initializes,
  };
}
test("PAY-POST: exact principal wallet credit, stable init, authenticated duplicate webhook and ledger immutability", async () => {
  const f = await fixture();
  try {
    const input = { purpose: "wallet", amountKobo: 20000, requestKey: id() };
    const q = await preparePayment(f.db, f.token, input);
    assert.equal((await preparePayment(f.db, f.token, input)).id, q.id);
    assert.ok(q.quote.grossKobo > 20000);
    await assert.rejects(
      () =>
        initializePayment(
          f.db,
          f.token,
          {
            intentId: q.id,
            acceptedGrossKobo: 20000,
            acceptedPolicyVersion: q.quote.gatewayPolicyVersion,
          },
          f.runtime,
        ),
      /exact fee quote/,
    );
    const accepted = {
      intentId: q.id,
      acceptedGrossKobo: q.quote.grossKobo,
      acceptedPolicyVersion: q.quote.gatewayPolicyVersion,
    };
    await initializePayment(f.db, f.token, accepted, f.runtime);
    await initializePayment(f.db, f.token, accepted, f.runtime);
    assert.equal(f.initializes(), 1);
    const raw = Buffer.from(
      JSON.stringify({
        event: "charge.success",
        data: { id: 123, reference: q.attempt.reference, domain: "test" },
      }),
    );
    const secret = "sk_test_fixture",
      headers = {
        legacy: createHmac("sha512", secret).update(raw).digest("hex"),
      },
      keys = { mode: "legacy" as const, secret };
    assert.equal(
      (await receivePaystackEvent(f.db, raw, headers, keys)).duplicate,
      false,
    );
    assert.equal(
      (await receivePaystackEvent(f.db, raw, headers, keys)).duplicate,
      true,
    );
    await processPaystackInbox(f.db, f.runtime);
    await reconcilePayment(f.db, q.attempt.reference, f.runtime);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT sum(amount_kobo) n FROM wallet_entries WHERE customer_id=$1",
          [f.uid],
        ))!.n,
      ),
      20000,
    );
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM payment_postings"))!.n),
      1,
    );
    assert.equal((await readPayment(f.db, f.token, q.id)).status, "paid");
    const user = await actor(f.db, f.token);
    const receipt = await paymentReceipt(f.db, user, q.id);
    assert.equal(receipt.principalKobo, 20000);
    assert.equal(receipt.customerFeeKobo, q.quote.customerFeeKobo);
    assert.equal(receipt.grossKobo, q.quote.grossKobo);
    assert.equal(receipt.documentKind, "sandbox_receipt");
    await assert.rejects(
      () => paymentReceipt(f.db, { ...user, id: f.otherToken }, q.id),
      /not found/,
    );
    await assert.rejects(
      () =>
        paystackReport(f.db, user, {
          from: "2020-01-01T00:00:00Z",
          to: "2020-02-01T00:00:00Z",
        }),
      /permission/,
    );
    const report = await paystackReport(
      f.db,
      { ...user, role: "finance" },
      {
        from: new Date(Date.now() - 86400000).toISOString(),
        to: new Date(Date.now() + 86400000).toISOString(),
      },
    );
    assert.equal(report.walletFundingLiabilityKobo, 20000);
    assert.equal(report.obligationCollectionsKobo, 0);
    assert.equal(report.actualSettlementKobo, null);
    const foreignReport = await paystackReport(
      f.db,
      { ...user, role: "finance", branch_id: "different-branch" },
      {
        from: new Date(Date.now() - 86400000).toISOString(),
        to: new Date(Date.now() + 86400000).toISOString(),
      },
    );
    assert.equal(foreignReport.grossCollectionsKobo, 0);
    assert.equal(foreignReport.rows.length, 0);
    assert.equal(report.grossCollectionsKobo, q.quote.grossKobo);

    await assert.rejects(
      () =>
        f.db.query("UPDATE payment_intents SET quote=$1 WHERE id=$2", [
          JSON.stringify({ grossKobo: 1 }),
          q.id,
        ]),
      /immutable/,
    );
    await assert.rejects(
      () => f.db.query("DELETE FROM payment_postings"),
      /Append-only/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("PAY-ZERO-EFFECT: forged events, wrong amount/currency/environment, cross-customer and driver requests never credit funds", async () => {
  const f = await fixture();
  try {
    await assert.rejects(
      () =>
        preparePayment(f.db, f.driverToken, {
          purpose: "wallet",
          amountKobo: 20000,
          requestKey: id(),
        }),
      /permission/,
    );
    const q = await preparePayment(f.db, f.token, {
      purpose: "wallet",
      amountKobo: 20000,
      requestKey: id(),
    });
    await assert.rejects(
      () => readPayment(f.db, f.otherToken, q.id),
      /not found/,
    );
    await assert.rejects(
      () =>
        receivePaystackEvent(
          f.db,
          Buffer.from("{}"),
          { legacy: "0".repeat(128) },
          { mode: "legacy", secret: "sk_test_fixture" },
        ),
      /signature/,
    );
    for (const v of [
      { amountKobo: 1 },
      { currency: "USD" },
      { environment: "live" },
      { attemptId: id() },
      { email: "another@example.test" },
    ]) {
      const caseFixture = await fixture();
      try {
        const q = await preparePayment(caseFixture.db, caseFixture.token, {
          purpose: "wallet",
          amountKobo: 20000,
          requestKey: id(),
        });
        await initializePayment(
          caseFixture.db,
          caseFixture.token,
          {
            intentId: q.id,
            acceptedGrossKobo: q.quote.grossKobo,
            acceptedPolicyVersion: q.quote.gatewayPolicyVersion,
          },
          caseFixture.runtime,
        );
        caseFixture.setAlter(v);
        assert.equal(
          (
            await reconcilePayment(
              caseFixture.db,
              q.attempt.reference,
              caseFixture.runtime,
            )
          ).status,
          "under_review",
        );
        assert.equal(
          Number(
            (await one(
              caseFixture.db,
              "SELECT count(*) n FROM wallet_entries",
            ))!.n,
          ),
          0,
        );
        assert.equal(
          Number(
            (await one(
              caseFixture.db,
              "SELECT count(*) n FROM payment_postings",
            ))!.n,
          ),
          0,
        );
      } finally {
        await caseFixture.db.close?.();
      }
    }
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM wallet_entries"))!.n),
      0,
    );
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM payment_postings"))!.n),
      0,
    );
    assert.equal(
      Number(
        (await one(f.db, "SELECT count(*) n FROM payment_provider_events"))!.n,
      ),
      0,
    );
    await assert.rejects(
      () => reconcilePayment(f.db, "EG.unknown-reference", f.runtime),
      /Unknown/,
    );
    assert.throws(
      () =>
        paystackRuntime({
          EASYGAS_PAYSTACK_ENABLED: "true",
          EASYGAS_PAYSTACK_MODE: "live",
          EASYGAS_PAYMENT_DATA_CLASS: "synthetic",
          PAYSTACK_TEST_SECRET_KEY: "sk_live_forbidden",
        }),
      /sandbox/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("PAY-RECOVERY: initialization timeout never launches a second charge; fee variance is separate from principal", async () => {
  const f = await fixture();
  try {
    const q = await preparePayment(f.db, f.token, {
      purpose: "wallet",
      amountKobo: 20000,
      requestKey: id(),
    });
    f.setUnavailable();
    const d = {
      intentId: q.id,
      acceptedGrossKobo: q.quote.grossKobo,
      acceptedPolicyVersion: q.quote.gatewayPolicyVersion,
    };
    assert.equal(
      (await initializePayment(f.db, f.token, d, f.runtime)).pending,
      true,
    );
    assert.equal(
      (await initializePayment(f.db, f.token, d, f.runtime)).pending,
      true,
    );
    assert.equal(f.initializes(), 1);
    f.setAlter({ feeKobo: 0 });
    assert.equal(
      (await reconcilePayment(f.db, q.attempt.reference, f.runtime)).status,
      "paid",
    );
    assert.equal(
      Number(
        (await one(f.db, "SELECT sum(amount_kobo) n FROM wallet_entries"))!.n,
      ),
      20000,
    );
    assert.ok(
      await one(
        f.db,
        "SELECT id FROM payment_exceptions WHERE category='provider_fee_variance'",
      ),
    );
  } finally {
    await f.db.close?.();
  }
});

test("PAY-RESUME: failed provider states persist without wallet effects", async () => {
  const f = await fixture();
  try {
    const q = await preparePayment(f.db, f.token, {
      purpose: "wallet",
      amountKobo: 20000,
      requestKey: id(),
    });
    const user = await actor(f.db, f.token);
    await assert.rejects(() => paymentReceipt(f.db, user, q.id), /not found/);
    await initializePayment(
      f.db,
      f.token,
      {
        intentId: q.id,
        acceptedGrossKobo: q.quote.grossKobo,
        acceptedPolicyVersion: q.quote.gatewayPolicyVersion,
      },
      f.runtime,
    );
    f.setAlter({ status: "abandoned" });
    assert.equal(
      (await reconcilePayment(f.db, q.attempt.reference, f.runtime)).status,
      "abandoned",
    );
    assert.equal((await readPayment(f.db, f.token, q.id)).status, "failed");
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM wallet_entries"))!.n),
      0,
    );
  } finally {
    await f.db.close?.();
  }
});

test("PAY-EXPIRY: prepared quote expiry is visible and cannot initialize", async () => {
  const f = await fixture();
  const now = Date.now;
  try {
    const q = await preparePayment(f.db, f.token, {
      purpose: "wallet",
      amountKobo: 20000,
      requestKey: id(),
    });
    Date.now = () => new Date(q.expiresAt).getTime() + 1000;
    assert.equal((await readPayment(f.db, f.token, q.id)).status, "expired");
    await assert.rejects(
      () =>
        initializePayment(
          f.db,
          f.token,
          {
            intentId: q.id,
            acceptedGrossKobo: q.quote.grossKobo,
            acceptedPolicyVersion: q.quote.gatewayPolicyVersion,
          },
          f.runtime,
        ),
      /expired/,
    );
    assert.equal(f.initializes(), 0);
  } finally {
    Date.now = now;
    await f.db.close?.();
  }
});

test("PAY-INVOICE: verified collection allocates principal to existing immutable invoice, never fees or duplicate revenue", async () => {
  const f = await fixture();
  // Model the deployed server role: invoices allow SELECT/INSERT, never UPDATE.
  // PostgreSQL also requires UPDATE privilege for SELECT ... FOR UPDATE.
  const transaction = f.db.transaction.bind(f.db);
  let sourceOrderLocks = 0;
  f.db.transaction = (fn) =>
    transaction((tx) =>
      fn({
        ...tx,
        query: (sql, params) => {
          if (/FROM customer_invoices[\s\S]*FOR UPDATE/i.test(sql))
            throw new Error("permission denied for table customer_invoices");
          if (/FROM orders WHERE id=\$1 FOR UPDATE/i.test(sql))
            sourceOrderLocks++;
          return tx.query(sql, params);
        },
      }),
    );
  try {
    const ownerId = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Synthetic invoice issuer',$2,$3,'owner','lagos')",
      [ownerId, ownerId + "@example.test", hashPassword("Fixture-only123!")],
    );
    const owner = {
      id: ownerId,
      name: "Fixture owner",
      email: ownerId + "@example.test",
      role: "owner",
      branch_id: "lagos",
      verified_at: new Date(),
      session_id: id(),
    } as any;
    const oid = id();
    await f.db.query(
      `INSERT INTO orders(id,reference,customer_id,branch_id,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash)
 VALUES($1,$1,$2,'lagos','fixture',now()+interval '1 day','cash',100000,500000,600000,'{"street":"Synthetic Road 10","zone":"Lekki"}','2026-12-01','AM',$1,'fixture')`,
      [oid, f.uid],
    );
    const inv = (
      await f.db.transaction((tx) =>
        invoiceAction(tx, owner, "invoice.issue", { orderId: oid }),
      )
    ).invoice!;
    const snapshot = JSON.stringify(inv.snapshot);
    await assert.rejects(
      () =>
        preparePayment(f.db, f.otherToken, {
          purpose: "invoice",
          invoiceId: inv.id,
          requestKey: id(),
        }),
      /not found/,
    );
    const q = await preparePayment(f.db, f.token, {
      purpose: "invoice",
      invoiceId: inv.id,
      requestKey: id(),
    });
    assert.equal(q.quote.baseKobo, 600000);
    await initializePayment(
      f.db,
      f.token,
      {
        intentId: q.id,
        acceptedGrossKobo: q.quote.grossKobo,
        acceptedPolicyVersion: q.quote.gatewayPolicyVersion,
      },
      f.runtime,
    );
    assert.equal(
      (await reconcilePayment(f.db, q.attempt.reference, f.runtime)).status,
      "paid",
    );
    await reconcilePayment(f.db, q.attempt.reference, f.runtime);
    const current = (
      await f.db.transaction(async (tx) =>
        invoiceAction(tx, await actor(tx, f.token), "invoice.order", {
          orderId: oid,
        }),
      )
    ).invoice!;
    assert.ok(
      sourceOrderLocks >= 3,
      "source order serializes invoice issue, quote and initialization",
    );
    assert.equal(current.amountDueKobo, 0);
    assert.equal(current.paidKobo, 600000);
    assert.equal(JSON.stringify(current.snapshot), snapshot);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT sum(amount_kobo) n FROM verified_payments WHERE order_id=$1",
          [oid],
        ))!.n,
      ),
      600000,
    );
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM wallet_entries"))!.n),
      0,
    );
    const receipt = await paymentReceipt(
      f.db,
      await actor(f.db, f.token),
      q.id,
    );
    assert.equal(receipt.grossKobo, q.quote.grossKobo);
    await assert.rejects(
      () =>
        preparePayment(f.db, f.token, {
          purpose: "invoice",
          invoiceId: inv.id,
          requestKey: id(),
        }),
      /no payable balance/,
    );
  } finally {
    await f.db.close?.();
  }
});

test("WALLET-CARD: wallet checkout restricts approved channels to card and rejects transfer-only policy", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "UPDATE settings SET value=jsonb_set(value,'{channels}','[\"card\",\"bank_transfer\"]') WHERE key='payment.gateway'",
    );
    const q = await preparePayment(f.db, f.token, {
      purpose: "wallet",
      amountKobo: 20000,
      requestKey: id(),
    });
    assert.deepEqual(q.quote.channels, ["card"]);
    await f.db.query(
      "UPDATE settings SET value=jsonb_set(value,'{channels}','[\"bank_transfer\"]') WHERE key='payment.gateway'",
    );
    await assert.rejects(
      () =>
        preparePayment(f.db, f.token, {
          purpose: "wallet",
          amountKobo: 20000,
          requestKey: id(),
        }),
      /outside approved limits/,
    );
  } finally {
    await f.db.close();
  }
});

test("WALLET-INSTANT: signed webhook verifies and credits card funding without waiting for worker or manual approval", async () => {
  const f = await fixture();
  try {
    const q = await preparePayment(f.db, f.token, {
      purpose: "wallet",
      amountKobo: 20000,
      requestKey: id(),
    });
    await initializePayment(
      f.db,
      f.token,
      {
        intentId: q.id,
        acceptedGrossKobo: q.quote.grossKobo,
        acceptedPolicyVersion: q.quote.gatewayPolicyVersion,
      },
      f.runtime,
    );
    const a = await one(
      f.db,
      "SELECT reference FROM payment_attempts WHERE intent_id=$1",
      [q.id],
    );
    const raw = Buffer.from(
      JSON.stringify({
        event: "charge.success",
        data: { id: 987654, reference: a!.reference, domain: "test" },
      }),
    );
    const secret = "sk_test_fixtureonly",
      headers = {
        legacy: createHmac("sha512", secret).update(raw).digest("hex"),
      };
    assert.equal(
      (
        (await receiveAndVerifyPaystackEvent(
          f.db,
          raw,
          headers,
          { mode: "legacy", secret },
          f.runtime,
        )) as any
      ).status,
      "paid",
    );
    await receiveAndVerifyPaystackEvent(
      f.db,
      raw,
      headers,
      { mode: "legacy", secret },
      f.runtime,
    );
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT sum(amount_kobo) n FROM wallet_entries WHERE customer_id=$1",
          [f.uid],
        ))!.n,
      ),
      20000,
    );
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT count(*) n FROM credit_requests WHERE customer_id=$1",
          [f.uid],
        ))!.n,
      ),
      0,
    );
  } finally {
    await f.db.close();
  }
});

test("DOC-POSTING-SNAPSHOT: new receipt preserves captured identity and customer despite later changes", async()=>{
 const f=await fixture(),old=process.env.EASYGAS_DOCUMENT_TEMPLATE_V2;process.env.EASYGAS_DOCUMENT_TEMPLATE_V2="true";
 try {
  await f.db.query("UPDATE settings SET version=2,value=$1 WHERE key='document.identity' AND scope='lagos'",[JSON.stringify({legalName:"Synthetic Verified Business",address:"Synthetic legal address",phone:"+2347011960720",email:"",website:"",registrationNumber:"SYNTHETIC-RC",taxId:"",verificationReference:"Synthetic test verification evidence"})]);
  const q=await preparePayment(f.db,f.token,{purpose:"wallet",amountKobo:20000,requestKey:id()});
  await initializePayment(f.db,f.token,{intentId:q.id,acceptedGrossKobo:q.quote.grossKobo,acceptedPolicyVersion:q.quote.gatewayPolicyVersion},f.runtime);
  const a=await one(f.db,"SELECT reference FROM payment_attempts WHERE intent_id=$1",[q.id]);
  await reconcilePayment(f.db,a!.reference,f.runtime);
  await f.db.query("UPDATE users SET name='Renamed after payment' WHERE id=$1",[f.uid]);
  await f.db.query("UPDATE settings SET value=jsonb_set(value,'{legalName}','\"Synthetic Changed Name\"') WHERE key='document.identity'");
  const customerActor=await actor(f.db,f.token);
  const saved=await paymentReceipt(f.db,customerActor,q.id);
  assert.equal(saved.snapshot.business.name,"Synthetic Verified Business");assert.equal(saved.snapshot.business.registrationNumber,"SYNTHETIC-RC");assert.equal(saved.snapshot.customer.name,"Synthetic payment fixture");assert.equal(saved.snapshot.documentTemplateVersion,2);
  assert.equal(saved.principalKobo,20000);
 }finally{if(old===undefined)delete process.env.EASYGAS_DOCUMENT_TEMPLATE_V2;else process.env.EASYGAS_DOCUMENT_TEMPLATE_V2=old;await f.db.close();}
});

test("MWEB-03: direct card orders retain server totals, ownership, fee consent and exactly-once ledger posting", async () => {
  const f = await fixture();
  try {
    const makeOrder = async () => {
      const oid = id();
      await f.db.query(`INSERT INTO orders(id,reference,customer_id,branch_id,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash)
        VALUES($1,$1,$2,'lagos','fixture',now()+interval '1 day','card',100000,500000,600000,'{"street":"Synthetic Road 10","zone":"Lekki"}','2026-12-01','AM',$1,'fixture')`, [oid, f.uid]);
      return oid;
    };
    const oid = await makeOrder();
    const input = { purpose: "order", orderId: oid, requestKey: id() };
    await assert.rejects(() => preparePayment(f.db, f.otherToken, input), /not found/);
    await assert.rejects(() => preparePayment(f.db, f.driverToken, input));
    await assert.rejects(() => preparePayment(f.db, f.token, {...input, amountKobo: 1}), /full current order amount/);
    await assert.rejects(() => preparePayment(f.db, f.token, {...input, invoiceId: id()}), /single card checkout order/);
    const q = await preparePayment(f.db, f.token, input);
    assert.equal(q.quote.baseKobo, 600000);
    assert.ok(q.quote.grossKobo > q.quote.baseKobo);
    assert.deepEqual(q.quote.channels, ["card"]);
    assert.equal((await preparePayment(f.db, f.token, input)).id, q.id);
    assert.equal((await one(f.db, "SELECT payment_status FROM orders WHERE id=$1",[oid]))!.payment_status,"unpaid");
    await assert.rejects(() => initializePayment(f.db, f.token, {intentId:q.id,acceptedGrossKobo:600000,acceptedPolicyVersion:q.quote.gatewayPolicyVersion},f.runtime), /exact fee quote/);
    await initializePayment(f.db,f.token,{intentId:q.id,acceptedGrossKobo:q.quote.grossKobo,acceptedPolicyVersion:q.quote.gatewayPolicyVersion},f.runtime);
    // Unresolved attempts are isolated per order, while this order reuses its attempt.
    assert.equal((await preparePayment(f.db,f.token,{...input,requestKey:id()})).id,q.id);
    const otherOrder = await makeOrder();
    assert.notEqual((await preparePayment(f.db,f.token,{purpose:"order",orderId:otherOrder,requestKey:id()})).id,q.id);
    assert.equal((await reconcilePayment(f.db,q.attempt.reference,f.runtime)).status,"paid");
    assert.equal((await reconcilePayment(f.db,q.attempt.reference,f.runtime)).status,"paid");
    assert.equal(Number((await one(f.db,"SELECT sum(amount_kobo) n FROM verified_payments WHERE order_id=$1",[oid]))!.n),600000);
    assert.equal(Number((await one(f.db,"SELECT count(*) n FROM verified_payments WHERE order_id=$1",[oid]))!.n),1);
    assert.equal((await one(f.db,"SELECT payment_status FROM orders WHERE id=$1",[oid]))!.payment_status,"verified");
    await assert.rejects(() => preparePayment(f.db,f.token,{...input,requestKey:id()}),/already has a payment/);
    const cancelled=await makeOrder();
    await f.db.query("UPDATE orders SET status='cancelled' WHERE id=$1",[cancelled]);
    await assert.rejects(() => preparePayment(f.db,f.token,{purpose:"order",orderId:cancelled,requestKey:id()}),/not payable/);
  } finally { await f.db.close(); }
});

test("WALLET-CARD-BRANCH: new unassigned customer can fund once in a single active branch; ambiguous context and forged branch are rejected",async()=>{
 const f=await fixture();try{
  await f.db.query("UPDATE users SET branch_id=null WHERE id=$1",[f.uid]);
  const q=await preparePayment(f.db,f.token,{purpose:"wallet",amountKobo:20000,requestKey:id()});
  await initializePayment(f.db,f.token,{intentId:q.id,acceptedGrossKobo:q.quote.grossKobo,acceptedPolicyVersion:q.quote.gatewayPolicyVersion},f.runtime);
  assert.equal((await reconcilePayment(f.db,q.attempt.reference,f.runtime)).status,"paid");
  assert.equal((await reconcilePayment(f.db,q.attempt.reference,f.runtime)).status,"paid");
  assert.equal(Number((await one(f.db,"SELECT sum(amount_kobo) n FROM wallet_entries WHERE customer_id=$1",[f.uid]))!.n),20000);
  assert.equal((await one(f.db,"SELECT branch_id FROM users WHERE id=$1",[f.uid]))!.branch_id,null);
  await f.db.query("INSERT INTO branches(id,name) VALUES('wallet-other-active','Synthetic second branch')");
  await assert.rejects(()=>preparePayment(f.db,f.token,{purpose:"wallet",amountKobo:20000,requestKey:id()}),/supported delivery address/);
  await assert.rejects(()=>preparePayment(f.db,f.token,{purpose:"wallet",amountKobo:20000,requestKey:id(),branchId:"lagos"}));
 }finally{await f.db.close();}
});

test("WALLET-CONFIG-SCOPE: missing wallet context is reported without disabling existing invoice/order card capability",async()=>{
 const f=await fixture();const g=globalThis as any;const previous=g.easygasDb,revision=g.easygasLocalVersion;
 const keys=["EASYGAS_BACKGROUND_JOBS","EASYGAS_PAYSTACK_ENABLED","EASYGAS_PAYSTACK_MODE","EASYGAS_PAYMENT_DATA_CLASS","PAYSTACK_TEST_SECRET_KEY"];
 const env=keys.map(k=>process.env[k]);
 try{
  await f.db.query("UPDATE users SET branch_id=null WHERE id=$1",[f.uid]);
  await f.db.query("INSERT INTO branches(id,name) VALUES('configuration-other','Synthetic second branch')");
  const {localSchemaRevision}=await import("../apps/web/lib/db");
  const {NextRequest}=await import("next/server");
  const {GET}=await import("../apps/web/app/api/payments/paystack/[operation]/route");
  g.easygasDb=Promise.resolve(f.db);g.easygasLocalVersion=localSchemaRevision;
  Object.assign(process.env,{EASYGAS_BACKGROUND_JOBS:"false",EASYGAS_PAYSTACK_ENABLED:"true",EASYGAS_PAYSTACK_MODE:"test",EASYGAS_PAYMENT_DATA_CLASS:"synthetic",PAYSTACK_TEST_SECRET_KEY:"sk_test_SyntheticConfigFixture"});
  const config=async(query:string)=>{
   const r=await GET(new NextRequest("http://localhost:3003/api/payments/paystack/configuration"+query,{headers:{authorization:"Bearer "+f.token}}),{params:Promise.resolve({operation:"configuration"})});assert.equal(r.status,200);assert.match(r.headers.get("cache-control")!,/no-store/);return r.json();
  };
  const wallet=await config("?purpose=wallet");assert.equal(wallet.available,false);assert.equal(wallet.branchRequired,true);
  const existing=await config("");assert.equal(existing.available,true);assert.deepEqual(existing.channels,["card"]);
 }finally{
  g.easygasDb=previous;g.easygasLocalVersion=revision;keys.forEach((k,i)=>{if(env[i]===undefined)delete process.env[k];else process.env[k]=env[i];});await f.db.close();
 }
});
