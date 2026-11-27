// Explicit synthetic provider settlement for historical same-visit journey fixtures.
// Runs the real private-link/profile/quote/initialize/verify handlers; never inserts a payment ledger row.
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { id } from "../../apps/web/lib/auth";
import { one } from "../../apps/web/lib/db";
import { phoneOrderHttp } from "../../apps/web/lib/phone-order-http";
export async function paySyntheticPhoneOrder(f: any, created: any) {
  const orderId = created.orderId ?? created.id,
    o = await one(f.db, "SELECT * FROM orders WHERE id=$1", [orderId]);
  const u = await one(f.db, "SELECT * FROM users WHERE id=$1", [
    o!.customer_id,
  ]);
  await f.db.query(
    "UPDATE settings SET value=$1 WHERE key='payment.gateway' AND scope=$2",
    [
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
        merchantApprovalReference: "SYNTHETIC regression provider fixture only",
        quoteLifetimeSeconds: 600,
        walletFunding: true,
        walletMinimumKobo: 100,
        walletMaximumKobo: 1000000,
        partialInvoices: false,
      }),
      o!.branch_id,
    ],
  );
  const link = new URL(created.paymentLink.url),
    [linkId, token] = link.hash.slice(1).split(":");
  let cookie = "";
  const runtime: any = {
    callbackOrigin: link.origin,
    provider: {
      environment: "test",
      initialize: async () => ({
        checkoutUrl: "https://checkout.paystack.com/synthetic-regression",
      }),
      verify: async (reference: string) => {
        const a = await one(
          f.db,
          "SELECT a.*,i.quote,i.email_snapshot FROM payment_attempts a JOIN payment_intents i ON i.id=a.intent_id WHERE a.reference=$1",
          [reference],
        );
        return {
          reference,
          status: "success",
          currency: "NGN",
          amountKobo: Number(a!.quote.grossKobo),
          environment: "test",
          providerId: "MOCK-" + a!.id,
          feeKobo: Number(a!.quote.estimatedFeeKobo),
          email: a!.email_snapshot,
          attemptId: a!.id,
        };
      },
    },
  };
  const call = async (op: string, input: any = {}) => {
    const r = await phoneOrderHttp(
      new NextRequest(link.origin + "/api/phone-orders/" + op, {
        method: "POST",
        headers: {
          origin: link.origin,
          "content-type": "application/json",
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify({ linkId, ...input }),
      }),
      { params: Promise.resolve({ operation: op }) },
      { getDb: async () => f.db, paystackRuntime: () => runtime },
    );
    if (r.headers.get("set-cookie"))
      cookie = r.headers.get("set-cookie")!.split(";")[0];
    const d = await r.json();
    assert.equal(r.status, 200, op + ": " + JSON.stringify(d));
    return d;
  };
  await call("view", { token });
  await call("profile", {
    profile: {
      name: o!.address.name,
      email: u!.email,
      phone: o!.address.phone,
      street: o!.address.street,
      confirmed: true,
    },
  });
  const q = await call("quote", { requestKey: id() });
  await call("initialize", {
    intentId: q.id,
    acceptedGrossKobo: q.quote.grossKobo,
    acceptedPolicyVersion: q.quote.gatewayPolicyVersion,
  });
  assert.equal((await call("verify", { intentId: q.id })).status, "paid");
  return f.snapshot(orderId);
}
