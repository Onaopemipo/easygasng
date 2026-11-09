import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  PaystackProvider,
  verifyPaystackSignature,
} from "../apps/web/lib/payments/paystack-provider";
test("PAY-SIGNATURE: raw bytes, timestamp, rotation, malformed headers and no legacy downgrade", () => {
  const raw = Buffer.from(
      '{ "event": "charge.success", "data": {"amount":1.50}}',
    ),
    secret = "whsec_fixtureOnly",
    t = 1800000000,
    signature = createHmac("sha512", secret)
      .update(t + ".")
      .update(raw)
      .digest("hex"),
    header = `t=${t},v1=whk_fixture:${signature}`,
    keys = {
      mode: "timestamped" as const,
      secrets: ["whsec_oldFixture", secret],
    };
  assert.equal(
    verifyPaystackSignature(raw, { current: header }, keys, t),
    true,
  );
  for (const now of [t - 301, t + 301])
    assert.equal(
      verifyPaystackSignature(raw, { current: header }, keys, now),
      false,
    );
  assert.equal(
    verifyPaystackSignature(
      Buffer.from(JSON.stringify(JSON.parse(raw.toString()))),
      { current: header },
      keys,
      t,
    ),
    false,
  );
  assert.equal(
    verifyPaystackSignature(raw, { current: header + ",t=" + t }, keys, t),
    false,
  );
  assert.equal(
    verifyPaystackSignature(
      raw,
      {
        current: "invalid",
        legacy: createHmac("sha512", "sk_test_fixture")
          .update(raw)
          .digest("hex"),
      },
      { mode: "legacy", secret: "sk_test_fixture" },
      t,
    ),
    false,
  );
  assert.equal(
    verifyPaystackSignature(
      raw,
      {
        legacy: createHmac("sha512", "sk_test_fixture")
          .update(raw)
          .digest("hex"),
      },
      { mode: "legacy", secret: "sk_test_fixture" },
      t,
    ),
    true,
  );
});
test("PAY-ADAPTER: hosted callback, test key, amount/currency/environment identity and transport validation", async () => {
  assert.throws(
    () => new PaystackProvider("sk_live_forbidden", "http://127.0.0.1:3003"),
  );
  let body: any;
  const transport = async (url: any, options: any) => {
    assert.match(String(url), /^https:\/\/api.paystack.co\//);
    assert.equal(options.redirect, "error");
    body = options.body ? JSON.parse(options.body) : null;
    return new Response(
      JSON.stringify({
        status: true,
        data: body
          ? {
              reference: body.reference,
              authorization_url: "https://checkout.paystack.com/fixture",
            }
          : {
              reference: "EG.fixture-123456",
              domain: "test",
              currency: "NGN",
              amount: 1000,
              status: "success",
              id: 123,
              fees: 10,
              metadata: { easygas_attempt_id: "attempt" },
              customer: { email: "fixture@example.test" },
            },
      }),
      { status: 200 },
    );
  };
  const provider = new PaystackProvider(
    "sk_test_fixture",
    "http://127.0.0.1:3003",
    transport as any,
  );
  await provider.initialize({
    reference: "EG.fixture-123456",
    email: "fixture@example.test",
    amountKobo: 1000,
    callbackUrl: "http://127.0.0.1:3003/payment-return",
    attemptId: "attempt",
    channels: ["card"],
  });
  assert.equal(body.currency, "NGN");
  const verified = await provider.verify("EG.fixture-123456");
  assert.equal(verified.amountKobo, 1000);
  await assert.rejects(() =>
    provider.initialize({
      reference: "EG.fixture-123456",
      email: "fixture@example.test",
      amountKobo: 1000,
      callbackUrl: "https://untrusted.invalid/payment-return",
      attemptId: "attempt",
      channels: ["card"],
    }),
  );
  const invalid = new PaystackProvider(
    "sk_test_fixture",
    "http://127.0.0.1:3003",
    (async () =>
      new Response(
        JSON.stringify({
          status: true,
          data: { reference: "EG.fixture-123456", domain: "live" },
        }),
      )) as any,
  );
  await assert.rejects(() => invalid.verify("EG.fixture-123456"));
  const timeout = new PaystackProvider(
    "sk_test_fixture",
    "http://127.0.0.1:3003",
    (async () => {
      throw new Error("secret must never leak");
    }) as any,
  );
  await assert.rejects(
    () => timeout.verify("EG.fixture-123456"),
    (e) => e instanceof Error && !e.message.includes("secret"),
  );
});
