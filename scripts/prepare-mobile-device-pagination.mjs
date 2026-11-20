import fs from "node:fs/promises";
import assert from "node:assert/strict";
const origin = "http://127.0.0.1:3107";
assert.equal(
  (await (await fetch(origin + "/health")).json()).mode,
  "isolated-native-acceptance",
  "Refuse writes without disposable fixture identity",
);
const signed = await (
  await fetch(origin + "/api/login", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-easygas-client": "native",
    },
    body: JSON.stringify({
      email: "finance@native.example.test",
      password: "Native-device-fixture-123!",
    }),
  })
).json();
const headers = {
  "content-type": "application/json",
  "x-easygas-client": "native",
  authorization: "Bearer " + signed.token,
};
const before = await (await fetch(origin + "/qa/readback")).json();
const customer = before.refunds[0].customer_id;
assert.equal(
  (
    await fetch(origin + "/api/reauth", {
      method: "POST",
      headers,
      body: JSON.stringify({ password: "Native-device-fixture-123!" }),
    })
  ).status,
  200,
);
const results = [];
for (let i = 0; i < 22; i++) {
  const r = await fetch(origin + "/api/credit.request", {
    method: "POST",
    headers,
    body: JSON.stringify({
      customerId: customer,
      amountKobo: 100,
      receiptReference: "SYNTHETIC-DEVICE-PAGE-" + i,
      reason: "Synthetic pagination fixture only; no wallet credit approved",
    }),
  });
  assert.equal(r.status, 200);
  results.push({ index: i, status: r.status });
}
await fetch(origin + "/api/logout", { method: "POST", headers, body: "{}" });
const after = await (await fetch(origin + "/qa/readback")).json();
assert.deepEqual(after.balances, before.balances);
await fs.writeFile(
  "docs/mobile-device-acceptance/evidence/pagination-fixture.json",
  JSON.stringify(
    {
      records: results,
      walletsUnchanged: true,
      scope: "Disposable loopback pending credits only",
    },
    null,
    2,
  ),
);
console.log("22 pending pagination records prepared; wallets unchanged");
