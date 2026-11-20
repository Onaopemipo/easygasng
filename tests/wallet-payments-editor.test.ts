import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Editor from "../apps/web/components/payment-gateway-policy";
import {
  paymentDecimal,
  paymentUnits,
  paymentFieldLabel,
  paymentReviewValue,
} from "../packages/business-rules/src/payment-editor";
import { quotePaymentFee } from "../packages/business-rules/src/payment-fees";
import { gatewayPolicy } from "../apps/web/lib/payments/policy";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { hashPassword, id, issueSession } from "../apps/web/lib/auth";
export const policy = {
  enabled: true,
  environment: "test",
  channels: ["card", "ussd", "bank", "bank_transfer"],
  fee: {
    version: 1,
    currency: "NGN",
    percentageBps: 150,
    fixedKobo: 10000,
    fixedWaivedBelowKobo: 250000,
    capKobo: 200000,
    rounding: "ceil",
    maximumGrossKobo: 10000000,
    bearer: "customer",
  },
  providerAutomaticFees: "off",
  passThroughApproved: true,
  merchantApprovalReference: "Synthetic QA only; no live approval.",
  quoteLifetimeSeconds: 600,
  walletFunding: true,
  walletMinimumKobo: 10000,
  walletMaximumKobo: 10000000,
  partialInvoices: true,
};
test("WPAY-UNITS: exact naira/percentage round trips, null versus zero, malformed and range rejection", () => {
  for (const n of [
    0, 1, 150, 199, 10000, 9999, 250000, 100000000, 1000000000000,
  ])
    assert.equal(paymentUnits(paymentDecimal(n)), n);
  for (const s of [
    "",
    "1e2",
    "1.001",
    "-1",
    "Infinity",
    " 1",
    "1.",
    "0x10",
    "90071992547410",
  ])
    assert.throws(() => paymentUnits(s));
  assert.equal(paymentUnits("", 0, 1e12, true), null);
  assert.equal(paymentUnits("0", 0, 1e12, true), 0);
  assert.throws(() => paymentUnits("100", 0, 9999));
  assert.throws(() => paymentUnits("0", 1));
  assert.equal(paymentUnits("1.50"), 150);
  assert.equal(paymentUnits("100.29"), 10029);
  const p = gatewayPolicy.parse(policy),
    next = structuredClone(p);
  for (const k of [
    "fixedKobo",
    "fixedWaivedBelowKobo",
    "maximumGrossKobo",
    "percentageBps",
    "capKobo",
  ] as const)
    next.fee![k] = paymentUnits(paymentDecimal(p.fee![k])) as never;
  assert.deepEqual(next, p);
  assert.deepEqual(
    quotePaymentFee(1000000, next.fee!),
    quotePaymentFee(1000000, p.fee!),
  );
  assert.equal(paymentFieldLabel("fee.percentageBps"), "Percentage fee");
  assert.equal(paymentReviewValue("fee.percentageBps", 150), "1.5%");
  assert.equal(paymentReviewValue("fee.capKobo", null), "No cap");
  assert.match(paymentReviewValue("fee.fixedKobo", 10000), /100.00/);
  assert.equal(paymentReviewValue("quoteLifetimeSeconds", 600), "10 minutes");
});
test("WPAY-RENDER: focused sections, human units, optional rules and no internal submit buttons", () => {
  const render = (section: any, value: any = policy) =>
    renderToStaticMarkup(
      React.createElement(Editor, { section, value, setValue() {} }),
    );
  const checkout = render("checkout"),
    fees = render("fees"),
    wallet = render("wallet");
  assert.match(checkout, /Merchant approval reference/);
  assert.match(checkout, /Quote timing/);
  assert.match(checkout, /maxLength="200"/i);
  assert.ok(!checkout.includes("Percentage fee"));
  assert.ok(!fees.includes("Merchant approval reference"));
  assert.ok(!wallet.includes("Provider rounding"));
  for (const s of [
    "Percentage fee",
    'value="1.50"',
    'value="100.00"',
    "Advanced fee rules",
    "Customer pays",
    "Paystack automatic fees",
  ])
    assert.ok(fees.includes(s), s);
  for (const html of [checkout, fees, wallet]) {
    assert.ok(!html.includes("<form"));
    assert.ok(!html.includes("<button"));
    assert.ok(!html.includes("basis points"));
    assert.ok(!html.includes("Current:"));
  }
  assert.match(wallet, /value="100000.00"/);
  assert.match(render("fees", { ...policy, fee: null }), /Configure fees/);
});
test("WPAY-SECURITY: real six-role dispatch rejects invalid/live/stale/forged policies; drafts cannot activate or self-approve", async () => {
  const db = await createDatabase("memory://");
  await migrate(db);
  try {
    const actors: Record<string, any> = {};
    for (const role of [
      "owner",
      "manager",
      "finance",
      "driver",
      "technician",
      "customer",
    ]) {
      const uid = id();
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id,active) VALUES($1,$2,$3,$4,$5,$6,true)",
        [
          uid,
          "Synthetic " + role,
          role + "@wallet.example.test",
          hashPassword("Synthetic-wallet-only-123!"),
          role,
          "lagos",
        ],
      );
      actors[role] = { id: uid, token: await issueSession(db, uid) };
    }
    const call = (role: string, action: string, input: any) =>
      dispatch(action, actors[role].token, input, db);
    const current = (await one(
      db,
      "SELECT * FROM settings WHERE key='payment.gateway' AND scope='lagos'",
    ))!;
    const body = {
      key: "payment.gateway",
      scope: "lagos",
      version: current.version,
      value: policy,
      reason: "Synthetic QA only; do not activate",
      draft: true,
    };
    for (const role of ["manager", "driver", "technician", "customer"])
      await assert.rejects(() => call(role, "setting.propose", body));
    for (const patch of [
      { environment: "live" },
      { walletMinimumKobo: 20000000 },
      { channels: [] },
      { providerAutomaticFees: "unknown" },
      { passThroughApproved: false },
      { fee: { ...policy.fee, percentageBps: 10000 } },
    ])
      await assert.rejects(() =>
        call("owner", "setting.propose", {
          ...body,
          value: { ...policy, ...patch },
        }),
      );
    await assert.rejects(
      () => call("owner", "setting.propose", { ...body, version: 999 }),
      { code: "VERSION_CONFLICT" },
    );
    await assert.rejects(() =>
      call("owner", "setting.propose", { ...body, approvals: 2 }),
    );
    for (const role of ["owner", "finance"]) {
      const draft = await call(role, "setting.propose", body);
      assert.equal(draft.status, "draft");
    }
    const request = await call("finance", "setting.propose", {
      ...body,
      draft: false,
    });
    assert.equal(request.status, "pending_approval");
    await call("finance", "reauth", { password: "Synthetic-wallet-only-123!" });
    await assert.rejects(() =>
      call("finance", "approval.decide", {
        id: request.id,
        decision: "approve",
        reason: "Synthetic self approval denial",
      }),
    );
    await db.query("UPDATE sessions SET verified_at=NULL WHERE user_id=$1", [
      actors.owner.id,
    ]);
    await assert.rejects(
      () =>
        call("owner", "approval.decide", {
          id: request.id,
          decision: "approve",
          reason: "Synthetic identity required",
        }),
      { code: "REAUTH_REQUIRED" },
    );
    assert.deepEqual(
      await one(
        db,
        "SELECT value,version FROM settings WHERE key='payment.gateway' AND scope='lagos'",
      ),
      { value: current.value, version: current.version },
    );
  } finally {
    await db.close();
  }
});
