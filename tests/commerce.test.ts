import { preparePayment, initializePayment, reconcilePayment } from "../apps/web/lib/payments/orchestrator";
import { fulfilmentReady } from "../apps/web/lib/order-tracking";
import { verifiedPickup } from "./helpers/tracking-fixture";
import { before, test } from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one, type DB } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { nairaToKobo } from "../packages/business-rules/src/pos-money";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
let db: DB;
const tokens: Record<string, string> = {},
  ids: Record<string, string> = {};
const password = "Commerce-test-only-123!";
before(async () => {
  db = await createDatabase("memory://");
  await migrate(db);
  await db.query("UPDATE settings SET value='100000' WHERE key='delivery.fee'");
  await db.query(
    "UPDATE delivery_locations SET coverage='Synthetic coverage verified for regression fixtures only'",
  );
  const hash = hashPassword(password);
  for (const role of [
    "owner",
    "finance",
    "sales",
    "manager",
    "customer",
    "driver",
  ]) {
    ids[role] = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,$2,$3,$4,$5,'lagos')",
      [ids[role], `Test ${role}`, `${role}@commerce.test`, hash, role],
    );
    tokens[role] = await issueSession(db, ids[role]);
  }
  await db.query(
    "UPDATE inventory SET quantity=100,price_kobo=750000,published=true WHERE branch_id='lagos' AND product_id='hose'",
  );
  await db.query(
    "UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','payment.cod','wallet.enabled','loyalty.enabled') AND scope='lagos'",
  );
});
const call = (role: string, action: string, input: any = {}) =>
  dispatch(action, tokens[role], input, db);
const orderInput = () => ({
  items: [{ productId: "hose", quantity: 1 }],
  address: {
    name: "Test customer",
    phone: "08012345678",
    street: "12 Test Avenue",
    zone: "Lekki",
  },
  date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  window: "14:00–18:00",
  instructions: "Test only",
  idempotencyKey: id(),
  paymentMethod: "wallet",
});
test("purchase credit requires independent verification, is append-only and cannot replay funding", async () => {
  await call("finance", "reauth", { password });
  const request = await call("finance", "credit.request", {
    customerId: ids.customer,
    amountKobo: 5000000,
    receiptReference: "TEST-CASH-001",
    reason: "Test cash received with documented receipt",
  });
  await assert.rejects(
    () =>
      call("finance", "credit.decide", {
        id: request.id,
        decision: "approved",
        reason: "Attempting self verification",
      }),
    /different finance/,
  );
  await call("owner", "reauth", { password });
  await call("owner", "credit.decide", {
    id: request.id,
    decision: "approved",
    reason: "Independently verified test receipt",
  });
  await call("owner", "credit.decide", {
    id: request.id,
    decision: "approved",
    reason: "Safe replay of same verification",
  });
  assert.equal((await call("customer", "wallet")).balanceKobo, 5000000);
  await assert.rejects(
    () => db.query("UPDATE wallet_entries SET amount_kobo=1"),
    /Append-only/,
  );
});
test("wallet checkout debits once and cancellation restores exact purchase credit once", async () => {
  const input = orderInput();
  const order = await call("customer", "checkout", input);
  await call("customer", "checkout", input);
  assert.equal(order.payment_method, "wallet");
  assert.equal(order.payment_status, "verified");
  assert.equal((await call("customer", "wallet")).balanceKobo, 4150000);
  await call("customer", "order.transition", {
    id: order.id,
    status: "cancelled",
    note: "Test customer cancellation before acceptance",
  });
  assert.equal((await call("customer", "wallet")).balanceKobo, 5000000);
  assert.equal(
    (await one(db, "SELECT payment_status FROM orders WHERE id=$1", [
      order.id,
    ]))!.payment_status,
    "refunded",
  );
  await assert.rejects(() =>
    call("customer", "order.transition", {
      id: order.id,
      status: "cancelled",
      note: "Duplicate cancellation test",
    }),
  );
  assert.equal((await call("customer", "wallet")).balanceKobo, 5000000);
});
test("insufficient wallet funds cannot reserve stock or create a payment", async () => {
  const before = await one(
    db,
    "SELECT reserved FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
  );
  const input = orderInput();
  input.items[0].quantity = 20;
  await assert.rejects(
    () => call("customer", "checkout", input),
    /Insufficient/,
  );
  assert.equal(
    (await one(
      db,
      "SELECT reserved FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
    ))!.reserved,
    before!.reserved,
  );
  assert.equal(
    await one(db, "SELECT id FROM orders WHERE idempotency_key=$1", [
      input.idempotencyKey,
    ]),
    undefined,
  );
});
test("POS uses approved server prices, prevents overselling and verifies cash-up independently", async () => {
  const shift = await call("sales", "pos.open", {
    branchId: "lagos",
    openingKobo: 100000,
  });
  await assert.rejects(() => call("sales", "pos.open", { branchId: "lagos", openingKobo: 0 }), /Close your current shift/);
  await assert.rejects(() => call("driver", "pos"), /permission|delivery/i);
  const input = {
    shiftId: shift.id,
    items: [{ productId: "hose", quantity: 2 }],
    tenderedKobo: 2000000,
    idempotencyKey: id(),
  };
  const sale = await call("sales", "pos.sale", input);
  assert.equal(sale.total_kobo, 1500000);
  assert.equal(sale.change_kobo, 500000);
  const summary = await call("sales", "pos");
  assert.equal(Number(summary.today.sales_kobo), 1500000);
  assert.equal(Number(summary.today.receipts), 1);
  assert.equal(Number(summary.today.units), 2);
  assert.equal(Number(summary.ownShift.cash_in_till_kobo), 1600000);
  assert.equal((await call("manager", "pos")).ownShift, undefined);
  await assert.rejects(() => call("manager", "pos.sale", input), /Only the shift cashier/);
  await db.query("UPDATE branches SET active=false WHERE id='lagos'");
  try {
    await assert.rejects(() => call("sales", "pos.sale", { ...input, idempotencyKey: id() }), /not accepting sales/);
  } finally {
    await db.query("UPDATE branches SET active=true WHERE id='lagos'");
  }
  const repeated = await call("sales", "pos.sale", input);
  assert.equal(repeated.id, sale.id);
  await assert.rejects(
    () => call("sales", "pos.sale", { ...input, tenderedKobo: 3000000 }),
    /already used/,
  );
  await assert.rejects(
    () =>
      call("sales", "pos.sale", {
        ...input,
        idempotencyKey: id(),
        items: [{ productId: "hose", quantity: 100 }],
      }),
    /insufficient stock/,
  );
  const cashUp = {
    shiftId: shift.id,
    countedKobo: 1600000,
    note: "Test cash counted including opening float",
  };
  const closed = await call("sales", "pos.close", cashUp);
  assert.deepEqual(await call("sales", "pos.close", cashUp), closed);
  await assert.rejects(() => call("sales", "pos.close", { ...cashUp, countedKobo: 1 }), /already submitted/);
  await assert.rejects(
    () => call("sales", "pos.sale", { ...input, idempotencyKey: id() }),
    /closed/,
  );
  await call("finance", "reauth", { password });
  await call("finance", "pos.verify", { shiftId: shift.id });
  await call("finance", "pos.verify", { shiftId: shift.id });
  assert.equal(
    (await one(db, "SELECT status FROM pos_shifts WHERE id=$1", [shift.id]))!
      .status,
    "verified",
  );
});
test("refund credit requires customer consent and cannot exceed the original verified order", async () => {
  const order = await call("customer", "checkout", orderInput());
  await db.query("UPDATE orders SET status='delivered' WHERE id=$1", [
    order.id,
  ]);
  await assert.rejects(() =>
    call("customer", "refund.request", {
      orderId: order.id,
      reason: "Test refund without explicit consent",
      acceptWalletCredit: false,
    }),
  );
  const request = await call("customer", "refund.request", {
    orderId: order.id,
    reason: "Customer requests test refund as wallet credit",
    acceptWalletCredit: true,
  });
  await call("finance", "reauth", { password });
  await call("finance", "credit.decide", {
    id: request.id,
    decision: "approved",
    reason: "Independent review of refund evidence",
  });
  assert.equal(
    (await one(db, "SELECT payment_status FROM orders WHERE id=$1", [
      order.id,
    ]))!.payment_status,
    "refunded",
  );
  await call("finance", "credit.decide", {
    id: request.id,
    decision: "approved",
    reason: "Replay does not create more credit",
  });
  assert.equal(
    Number(
      (await one(
        db,
        "SELECT count(*) AS n FROM wallet_entries WHERE reference=$1",
        [`credit:${request.id}`],
      ))!.n,
    ),
    1,
  );
});
test("new point-to-wallet conversions are closed while historical outcomes remain replayable", async () => {
  await db.query(
    "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES ($1,$2,100,$3)",
    [id(), ids.customer, "TEST verified historical points"],
  );
  const input = { points: 40, idempotencyKey: id() };
  await assert.rejects(
    () => call("customer", "rewards.redeem", input),
    /conversion is closed/,
  );
  assert.equal((await call("customer", "wallet")).points, 100);
  await db.query(
    "INSERT INTO reward_redemptions(id,customer_id,points,credit_kobo,idempotency_key) VALUES($1,$2,40,4000,$3)",
    [id(), ids.customer, input.idempotencyKey],
  );
  const replay = await call("customer", "rewards.redeem", input);
  assert.equal(replay.legacy, true);
  assert.equal(replay.creditKobo, 4000);
  await assert.rejects(
    () => call("customer", "rewards.redeem", { ...input, points: 41 }),
    /another amount/,
  );
  await assert.rejects(
    () => db.query("UPDATE reward_entries SET points=1000"),
    /Append-only/,
  );
});

test("concurrent wallet checkouts cannot overdraw the same purchase-credit balance", async () => {
  const uid = id();
  await db.query(
    "INSERT INTO users(id,name,email,password_hash,role) VALUES ($1,'Concurrent wallet test',$2,$3,'customer')",
    [uid, `${uid}@commerce.test`, hashPassword(password)],
  );
  const token = await issueSession(db, uid);
  await db.query(
    "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES ($1,$2,1000000,'test_fixture',$3)",
    [id(), uid, `TEST-${uid}`],
  );
  const results = await Promise.allSettled([
    dispatch("checkout", token, orderInput(), db),
    dispatch("checkout", token, orderInput(), db),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    Number(
      (await one(
        db,
        "SELECT sum(amount_kobo) AS n FROM wallet_entries WHERE customer_id=$1",
        [uid],
      ))!.n,
    ),
    150000,
  );
});

test("prepaid wallet delivery collects no cash and cannot earn from unapproved seeded economics", async () => {
  if (!ids.driver) {
    ids.driver = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,'Wallet delivery driver',$2,$3,'driver','lagos')",
      [ids.driver, `${ids.driver}@commerce.test`, hashPassword(password)],
    );
    tokens.driver = await issueSession(db, ids.driver);
  }
  await db.query("UPDATE users SET driver_available=true WHERE id=$1",[ids.driver]);
  const pointsBefore = (await call("customer", "wallet")).points;
  const o = await call("customer", "checkout", orderInput());
  await call("owner", "order.transition", {
    id: o.id,
    status: "accepted",
    note: "Test order accepted by operations",
  });
  await call("owner", "order.transition", {
    id: o.id,
    status: "preparing",
    note: "Test order prepared for dispatch",
  });
  await call("owner", "order.transition", {
    id: o.id,
    status: "assigned",
    driverId: ids.driver,
    note: "Test driver assignment recorded",
  });
  await verifiedPickup(call, o.id);
  await call("driver", "order.transition", {
    id: o.id,
    status: "out_for_delivery",
    note: "Test driver confirmed collection",
  });
  const code = (await call("customer", "orders")).find(
    (x: any) => x.id === o.id,
  ).confirmation_code;
  await call("driver", "delivery.complete", {
    handover: true,
    orderId: o.id,
    code,
    collectedKobo: 0,
  });
  await call("driver", "delivery.complete", {
    handover: true,
    orderId: o.id,
    code,
    collectedKobo: 0,
  });
  assert.equal(
    Number(
      (await one(
        db,
        "SELECT count(*) AS n FROM cash_collections WHERE order_id=$1",
        [o.id],
      ))!.n,
    ),
    0,
  );
  assert.equal((await call("customer", "wallet")).points - pointsBefore, 0);
  const request = await call("customer", "refund.request", {
    orderId: o.id,
    reason: "Test full refund of actual delivered wallet order",
    acceptWalletCredit: true,
  });
  await call("finance", "reauth", { password });
  await call("finance", "credit.decide", {
    id: request.id,
    decision: "approved",
    reason: "Independent test review of delivered order refund",
  });
  assert.equal((await call("customer", "wallet")).points, pointsBefore);
});

test("MWEB-03-GATE: disabled card checkout cannot reserve stock; enabled sandbox card remains unpaid and cannot dispatch", async () => {
  const input = {...orderInput(), paymentMethod:"card"};
  const before = await one(db,"SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'");
  await assert.rejects(() => call("customer","checkout",input),/currently unavailable/);
  assert.equal((await one(db,"SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'"))!.reserved,before!.reserved);
  const keys=["EASYGAS_PAYSTACK_ENABLED","EASYGAS_PAYSTACK_MODE","EASYGAS_PAYMENT_DATA_CLASS","PAYSTACK_TEST_SECRET_KEY"];
  const env=keys.map(k=>process.env[k]);
  const policy=await one(db,"SELECT value FROM settings WHERE key='payment.gateway' AND scope='lagos'");
  try {
    Object.assign(process.env,{EASYGAS_PAYSTACK_ENABLED:"true",EASYGAS_PAYSTACK_MODE:"test",EASYGAS_PAYMENT_DATA_CLASS:"synthetic",PAYSTACK_TEST_SECRET_KEY:"sk_test_MockFixtureOnly"});
    await db.query("UPDATE settings SET value=$1 WHERE key='payment.gateway' AND scope='lagos'",[JSON.stringify({enabled:true,environment:"test",channels:["card"],fee:{version:1,currency:"NGN",percentageBps:150,fixedKobo:0,fixedWaivedBelowKobo:0,capKobo:200000,rounding:"ceil",maximumGrossKobo:100000000,bearer:"customer"},providerAutomaticFees:"off",passThroughApproved:true,merchantApprovalReference:"Synthetic isolated regression approval",quoteLifetimeSeconds:600,walletFunding:false,walletMinimumKobo:100,walletMaximumKobo:10000000,partialInvoices:false})]);
    await assert.rejects(() => call("owner","checkout",{...input,idempotencyKey:id()}),/permission/);
    const order=await call("customer","checkout",input);
    assert.equal(order.payment_method,"card");
    assert.equal(order.payment_status,"unpaid");
    assert.equal((await call("customer","checkout",input)).id,order.id);
    assert.equal(Number((await one(db,"SELECT count(*) n FROM verified_payments WHERE order_id=$1",[order.id]))!.n),0);
    await assert.rejects(()=>db.transaction(tx=>fulfilmentReady(tx,order)),/payment|Payment|verified/i);
    const q=await preparePayment(db,tokens.customer,{purpose:"order",orderId:order.id,requestKey:id()});
    const runtime:any={callbackOrigin:"http://127.0.0.1:3003",provider:{environment:"test",initialize:async()=>({checkoutUrl:"https://checkout.paystack.com/fixture"}),verify:async(reference:string)=>{
      const row=await one(db,"SELECT a.id,i.email_snapshot,i.quote FROM payment_attempts a JOIN payment_intents i ON i.id=a.intent_id WHERE a.reference=$1",[reference]);
      return {reference,status:"success",currency:"NGN",environment:"test",amountKobo:row!.quote.grossKobo,attemptId:row!.id,email:row!.email_snapshot,providerId:"MOCK-"+row!.id,feeKobo:row!.quote.estimatedFeeKobo};
    }}};
    await initializePayment(db,tokens.customer,{intentId:q.id,acceptedGrossKobo:q.quote.grossKobo,acceptedPolicyVersion:q.quote.gatewayPolicyVersion},runtime);
    assert.equal((await reconcilePayment(db,q.attempt.reference,runtime)).status,"paid");
    await db.query("UPDATE users SET driver_available=true WHERE id=$1",[ids.driver]);
    for(const status of ["accepted","preparing","assigned"])
      await call("owner","order.transition",{id:order.id,status,...(status==="assigned"?{driverId:ids.driver}:{}),note:"Synthetic verified card delivery regression"});
    await verifiedPickup(call,order.id);
    await call("driver","order.transition",{id:order.id,status:"out_for_delivery",note:"Synthetic physical pickup regression"});
    const code=(await call("customer","orders")).find((o:any)=>o.id===order.id).confirmation_code;
    await assert.rejects(()=>call("driver","delivery.complete",{handover:true,orderId:order.id,code,collectedKobo:Number(order.total_kobo)}),/cash amount|collected|cash-on-delivery/i);
    await call("driver","delivery.complete",{handover:true,orderId:order.id,code,collectedKobo:0});
    await call("driver","delivery.complete",{handover:true,orderId:order.id,code,collectedKobo:0});
    assert.equal((await one(db,"SELECT status FROM orders WHERE id=$1",[order.id]))!.status,"delivered");
    assert.equal(Number((await one(db,"SELECT count(*) n FROM cash_collections WHERE order_id=$1",[order.id]))!.n),0);

  } finally {
    keys.forEach((k,i)=>{if(env[i]===undefined)delete process.env[k];else process.env[k]=env[i];});
    await db.query("UPDATE settings SET value=$1 WHERE key='payment.gateway' AND scope='lagos'",[JSON.stringify(policy!.value)]);
  }
});

test("POS-MONEY01: naira input is converted exactly and rejects excess precision and exponents", () => {
  assert.equal(nairaToKobo("1.01"), 101);
  assert.equal(nairaToKobo("0"), 0);
  for (const amount of ["", "1.001", "-1", "1e3", "10000001"])
    assert.throws(() => nairaToKobo(amount));
});

test("credits workspace pages the full scoped history and hides maker decisions", async () => {
  await db.query("INSERT INTO branches(id,name) VALUES ('credits-other','Other credit branch')");
  await db.query(`INSERT INTO credit_requests(id,branch_id,customer_id,amount_kobo,kind,requested_by,reason,receipt_reference)
    SELECT gen_random_uuid()::text, 'lagos', $1, 100, 'cash_funding', $2, 'Synthetic evidence', 'CREDIT-PAGE-' || n
    FROM generate_series(1,25) n`, [ids.customer, ids.finance]);
  await db.query(`INSERT INTO credit_requests(id,branch_id,customer_id,amount_kobo,kind,requested_by,reason,receipt_reference)
    VALUES($1,'credits-other',$2,100,'cash_funding',$3,'Synthetic evidence','CREDIT-PAGE-OTHER')`, [id(), ids.customer, ids.finance]);
  const input = { view: "workspace", q: "CREDIT-PAGE-", tab: "pending" };
  const first = await call("finance", "credits", input);
  const second = await call("finance", "credits", { ...input, page: 2 });
  assert.equal(first.total, 25);
  assert.equal(first.rows.length, 20);
  assert.equal(second.rows.length, 5);
  assert.equal(new Set([...first.rows, ...second.rows].map(row => row.id)).size, 25);
  assert.ok(first.rows.every(row => !row.can_decide && row.amount_kobo === "100"));
  assert.ok((await call("owner", "credits", input)).rows.every(row => row.can_decide));
  await assert.rejects(call("customer", "credits", input), /permission/);
  assert.ok(Array.isArray(await call("customer", "credits")));
});
