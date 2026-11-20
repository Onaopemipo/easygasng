import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { readVerifiedLedger } from "./lib/hosted-ledger.mjs";
const origin = "https://easygas-client-demo.vercel.app";
const line = (
  await fs.readFile(".data/demo-staff-logins-qa-ac7e0495.md", "utf8")
)
  .split("\n")
  .find((x) => x.includes("owner.qa-ac7e0495@"));
assert.ok(line);
const cols = line.split("|").map((x) => x.trim().replaceAll("`", ""));
const login = await fetch(origin + "/api/login", {
  method: "POST",
  headers: { "content-type": "application/json", "x-easygas-client": "native" },
  body: JSON.stringify({ email: cols[2], password: cols[3] }),
});
const data = await login.json();
assert.equal(login.status, 200);
const headers = {
  authorization: "Bearer " + data.token,
  "x-easygas-client": "native",
};
const records = {};
try {
  for (const action of ["orders", "credits", "inventory"]) {
    const r = await fetch(origin + "/api/" + action, { headers });
    assert.equal(r.status, 200, action + " must succeed");
    const d = await r.json();
    assert.ok(Array.isArray(d));
    const stable = Array.isArray(d)
      ? d
          .map((x) =>
            action === "orders"
              ? {
                  id: x.id,
                  status: x.status,
                  payment_status: x.payment_status,
                  total_kobo: x.total_kobo,
                  tracking_version: x.tracking_version,
                }
              : action === "credits"
                ? { id: x.id, status: x.status, amount_kobo: x.amount_kobo }
                : x,
          )
          .sort((a, b) =>
            String(a.id ?? a.product_id ?? "").localeCompare(
              String(b.id ?? b.product_id ?? ""),
            ),
          )
      : d;
    records[action] = {
      status: r.status,
      count: Array.isArray(d) ? d.length : null,
      sha256: createHash("sha256").update(JSON.stringify(stable)).digest("hex"),
    };
  }
  const ledger = await readVerifiedLedger(async (path) => {
    const response = await fetch(origin + "/api/" + path, {
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    return {
      status: response.status,
      body: await response.json(),
      cacheControl: response.headers.get("cache-control"),
    };
  });
  records.ledger = {
    endpoint: "GET /api/finance.ledger",
    status: 200,
    count: ledger.count,
    sha256: ledger.sha256,
    pages: ledger.pages,
    complete: true,
  };
} finally {
  const logout = await fetch(origin + "/api/logout", {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(logout.status, 200, "Own temporary session must be revoked");
}
await fs.writeFile(
  process.argv[2],
  JSON.stringify(
    {
      origin,
      mode: "Read-only hosted business endpoints; temporary own auth session signed out",
      records,
    },
    null,
    2,
  ),
);
console.log(
  "Hosted read-only snapshot recorded; credentials and token omitted",
);
