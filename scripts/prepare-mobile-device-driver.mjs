import fs from "node:fs/promises";
import assert from "node:assert/strict";
const origin = "http://127.0.0.1:3107",
  tokens = {};
async function api(role, a, d) {
  const r = await fetch(origin + "/api/" + a, {
    method: d === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      "x-easygas-client": "native",
      ...(tokens[role] ? { authorization: "Bearer " + tokens[role] } : {}),
    },
    ...(d === undefined ? {} : { body: JSON.stringify(d) }),
  });
  const v = await r.json();
  assert.ok(r.ok, a + ":" + JSON.stringify(v));
  return v;
}
for (const role of ["owner", "driver", "customer"])
  tokens[role] = (
    await api(role, "login", {
      email: role + "@native.example.test",
      password: "Native-device-fixture-123!",
    })
  ).token;
assert.equal(
  (await (await fetch(origin + "/health")).json()).mode,
  "isolated-native-acceptance",
  "Refuse writes without disposable fixture identity",
);
const driver = (await api("driver", "me")).user;
const o = await api("customer", "checkout", {
  items: [{ productId: "hose", quantity: 1 }],
  address: {
    name: "Synthetic driver regression",
    phone: "08012345678",
    street: "12 Synthetic Driver Regression Street",
    zone: "Lekki",
  },
  date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  window: "14:00–18:00",
  paymentMethod: "cash_on_delivery",
  idempotencyKey: crypto.randomUUID(),
});
const get = async () => (await api("owner", "orders?id=" + o.id))[0];
for (const status of ["accepted", "preparing", "assigned"]) {
  const current = await get();
  await api("owner", "order.transition", {
    id: o.id,
    status,
    note: "Synthetic native evidence regression only",
    version: current.tracking_version,
    operationKey: crypto.randomUUID(),
    ...(status === "assigned" ? { driverId: driver.id } : {}),
  });
}
let current = await get();
await api("driver", "dispatch.respond", {
  orderId: o.id,
  version: current.tracking_version,
  decision: "acknowledged",
  reason: "Synthetic fixture acknowledgement",
  operationKey: crypto.randomUUID(),
});
current = await get();
await api("driver", "delivery.pickup", {
  orderId: o.id,
  version: current.tracking_version,
  manifest: current.manifest,
  reason: "Synthetic fixture pickup only; no physical fulfilment",
  operationKey: crypto.randomUUID(),
});
await fs.writeFile(
  "docs/mobile-device-acceptance/evidence/driver-regression-fixture.json",
  JSON.stringify(
    {
      id: o.id,
      reference: o.reference,
      mode: "Disposable synthetic fixture; no physical fulfilment",
      snapshot: await get(),
    },
    null,
    2,
  ),
);
for (const role of Object.keys(tokens)) await api(role, "logout", {});
console.log(o.reference);
