import { dispatchJourneyFixture } from "./dispatch-journey-fixture";
import { one, type DB } from "../../apps/web/lib/db";
import { id } from "../../apps/web/lib/auth";
import { NextRequest } from "next/server";
import { phoneOrderHttp } from "../../apps/web/lib/phone-order-http";
export async function phonePaymentFixture(database?: DB) {
  process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY = "9".repeat(64);
  process.env.APP_URL = "http://127.0.0.1:3003";
  const f = await dispatchJourneyFixture(database);
  let initialized = 0,
    alter: any = {},
    callback = "";
  await f.db.query(
    "UPDATE settings SET value=$1 WHERE key='payment.gateway' AND scope='lagos'",
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
        merchantApprovalReference: "SYNTHETIC phone payment fixture only",
        quoteLifetimeSeconds: 600,
        walletFunding: true,
        walletMinimumKobo: 100,
        walletMaximumKobo: 1000000,
        partialInvoices: false,
      }),
    ],
  );
  const runtime: any = {
    callbackOrigin: "http://127.0.0.1:3003",
    provider: {
      environment: "test",
      initialize: async (d: any) => {
        initialized++;
        callback = d.callbackUrl;
        return {
          checkoutUrl: "https://checkout.paystack.com/synthetic-phone-order",
        };
      },
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
          ...alter,
        };
      },
    },
  };
  let cookie = "";
  const http = async (operation: string, body: any, headers: any = {}) => {
    const response = await phoneOrderHttp(
      new NextRequest("http://127.0.0.1:3003/api/phone-orders/" + operation, {
        method: "POST",
        headers: {
          origin: "http://127.0.0.1:3003",
          "content-type": "application/json",
          ...(cookie ? { cookie } : {}),
          ...headers,
        },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ operation }) },
      { getDb: async () => f.db, paystackRuntime: () => runtime },
    );
    if (response.headers.get("set-cookie"))
      cookie = response.headers.get("set-cookie")!.split(";")[0];
    return {
      status: response.status,
      body: await response.json(),
      headers: response.headers,
    };
  };
  const makePhone = async (firstTime = false) => {
    const customer = firstTime
      ? await f.call("owner", "customers.provisional", {
          name: "Synthetic new caller",
          phone: "08021111118",
          branchId: "lagos",
        })
      : { id: f.actors.customer.id };
    const q = await f.call("owner", "order.assisted.quote", {
      items: [],
      gasLines: [{ capacityKg: 6, kg: 6 }],
      address: {
        name: "Synthetic phone quote",
        phone: "08021111118",
        street: "12 Synthetic Phone Order Street",
        zone: "Lekki",
        locationId: "lekki",
      },
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      window: "14:00–18:00",
      idempotencyKey: id(),
      paymentMethod: "card",
    });
    const o = await f.call("owner", "order.assisted.create", {
      customerId: customer.id,
      reason: "Synthetic customer phone call for6000g gas",
      checkout: {
        items: [],
        gasLines: [{ capacityKg: 6, kg: 6 }],
        pricing: {
          priceVersion: q.priceVersion,
          feeVersion: q.feeVersion,
          policyVersion: q.policyVersion,
          totalKobo: q.subtotalKobo + q.physicalSubtotalKobo + q.deliveryKobo,
        },
        address: {
          name: firstTime
            ? "Synthetic new caller"
            : "Synthetic journey customer",
          phone: firstTime ? "08021111118" : "08012345678",
          street: "12 Synthetic Phone Order Street",
          zone: "Lekki",
          locationId: "lekki",
        },
        date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        window: "14:00–18:00",
        idempotencyKey: id(),
        paymentMethod: "card",
      },
    });
    const [linkId, token] = new URL(o.paymentLink.url).hash.slice(1).split(":");
    return { o, linkId, token, customer };
  };
  const confirm = async (p: any, extra: any = {}) => {
    const u = await one(f.db, "SELECT * FROM users WHERE id=$1", [
      p.o.customer_id,
    ]);
    return http("profile", {
      linkId: p.linkId,
      profile: {
        name: p.o.address.name,
        email: u!.email.endsWith(".invalid")
          ? "first-phone@example.test"
          : u!.email,
        phone: p.o.address.phone,
        street: p.o.address.street,
        confirmed: true,
        ...extra,
      },
    });
  };
  const pay = async (p: any) => {
    const q = await http("quote", { linkId: p.linkId, requestKey: id() });
    if (q.status !== 200) throw Error(JSON.stringify(q));
    const init = {
      linkId: p.linkId,
      intentId: q.body.id,
      acceptedGrossKobo: q.body.quote.grossKobo,
      acceptedPolicyVersion: q.body.quote.gatewayPolicyVersion,
    };
    const r = await http("initialize", init);
    if (r.status !== 200) throw Error(JSON.stringify(r));
    const v = await http("verify", { linkId: p.linkId, intentId: q.body.id });
    if (v.status !== 200) throw Error(JSON.stringify(v));
    return { q, init, r, v };
  };
  return {
    ...f,
    http,
    makePhone,
    confirm,
    pay,
    runtime,
    alter: (x: any) => (alter = x),
    initialized: () => initialized,
    callback: () => callback,
    clearCookie: () => (cookie = ""),
  };
}
