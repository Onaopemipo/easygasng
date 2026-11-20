import fs from "node:fs/promises";
import assert from "node:assert/strict";
const origin = "http://127.0.0.1:3107";
const findings = [];
const tokens = {};
assert.equal(
  (await (await fetch(origin + "/health")).json()).mode,
  "isolated-native-acceptance",
  "Refuse writes without disposable fixture identity",
);
async function request(role, action, input) {
  const r = await fetch(origin + "/api/" + action, {
    method: input === undefined ? "GET" : "POST",
    headers: {
      "content-type": "application/json",
      "x-easygas-client": "native",
      ...(tokens[role] ? { authorization: "Bearer " + tokens[role] } : {}),
    },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
  const d = await r.json();
  return { status: r.status, data: d };
}
for (const role of [
  "owner",
  "finance",
  "manager",
  "driver",
  "technician",
  "customer",
  "commercial",
]) {
  const r = await request(role, "login", {
    email: role + "@native.example.test",
    password: "Native-device-fixture-123!",
  });
  assert.equal(r.status, 200);
  tokens[role] = r.data.token;
}
const readback = await (await fetch(origin + "/qa/readback")).json();
for (const role of [
  "manager",
  "driver",
  "technician",
  "customer",
  "commercial",
]) {
  const r = await request(role, "credits?view=workspace");
  assert.equal(r.status, 403);
  const w = await request(role, "credit.decide", {
    id: readback.refunds[0].id,
    decision: "approved",
    reason: "Synthetic forbidden review attempt",
  });
  assert.equal(w.status, 403);
  findings.push({
    id: "MDEV-STAFF-DENIAL",
    role,
    read: r.status,
    write: w.status,
  });
}
for (const role of ["finance", "owner"]) {
  assert.equal(
    (await request(role, "reauth", { password: "Native-device-fixture-123!" }))
      .status,
    200,
  );
}
const fixture = JSON.parse(
  await fs.readFile(
    "docs/mobile-device-acceptance/evidence/fixture.json",
    "utf8",
  ),
);
const customer = readback.refunds.find(
  (r) => r.order_id === fixture.refundOrders.customer.id,
).customer_id;
const own = await request("finance", "credit.request", {
  customerId: customer,
  amountKobo: 100,
  receiptReference: "SYNTHETIC-DEVICE-SELF-REVIEW",
  reason: "Synthetic own request self-review denial",
});
assert.equal(own.status, 200);
const denied = await request("finance", "credit.decide", {
  id: own.data.id,
  decision: "approved",
  reason: "Synthetic forbidden same requester review",
});
assert.equal(denied.status, 403);
findings.push({ id: "MDEV-INDEPENDENCE", selfReviewStatus: denied.status });
const approved = readback.refunds.find((r) => r.status === "approved");
const replay = await request("finance", "credit.decide", {
  id: approved.id,
  decision: "approved",
  reason: "Synthetic independent finance approval for device acceptance",
});
assert.equal(replay.status, 200);
const after = await (await fetch(origin + "/qa/readback")).json();
assert.deepEqual(after.balances, readback.balances);
findings.push({
  id: "MDEV-REVIEW-REPLAY",
  status: replay.status,
  balancesUnchanged: true,
});
for (const role of Object.keys(tokens)) await request(role, "logout", {});
await fs.writeFile(
  "docs/mobile-device-acceptance/evidence/stage2-api-checks.json",
  JSON.stringify(findings, null, 2),
);
console.log(
  "PASS 5 role read/write denials, self-review denial and replay without duplicate credit",
);
