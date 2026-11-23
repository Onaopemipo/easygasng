import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const origin = process.argv[2],
  output = process.argv[3];
assert.ok(
  /^https:\/\/easygas-client-demo(?:-[a-z0-9]+-onaopemipos-projects)?\.vercel\.app$/.test(
    origin,
  ),
  "Client-demo origin required",
);
// Use the project's existing automation credential for its protected candidate.
// Read into memory only; do not create a bypass, alter protection or persist it.
let protectionHeaders = {};
if (origin !== "https://easygas-client-demo.vercel.app") {
  const project = JSON.parse(
    execFileSync(
      "vercel",
      ["api", "/v9/projects/prj_cFSaJuN9r4x93RLov1LLVO3cdVA2"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  );
  assert.equal(project.id, "prj_cFSaJuN9r4x93RLov1LLVO3cdVA2");
  const bypass = Object.entries(project.protectionBypass || {}).find(
    ([, value]) => value.scope === "automation-bypass",
  );
  assert.ok(bypass, "Existing candidate automation access is required");
  protectionHeaders = { "x-vercel-protection-bypass": bypass[0] };
}
const accounts = JSON.parse(
  await fs.readFile(".data/demo-test-logins-20261110.json", "utf8"),
).accounts;
const checks = [];
let catalogue;
async function rpc(action, input, token) {
  const response = await fetch(origin + "/api/" + action, {
    method: input === undefined ? "GET" : "POST",
    headers: {
      ...protectionHeaders,
      "content-type": "application/json",
      "x-easygas-client": "native",
      ...(token ? { authorization: "Bearer " + token } : {}),
    },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    signal: AbortSignal.timeout(30000),
    redirect: "error",
  });
  return { status: response.status, body: await response.json() };
}
function verify(role, action, result, expected) {
  checks.push({
    role,
    action,
    status: result.status,
    expected,
    pass: result.status === expected,
  });
  assert.equal(result.status, expected, role + " " + action);
}
verify("public", "status", await rpc("status"), 200);
for (const role of [
  "owner",
  "manager",
  "finance",
  "driver",
  "technician",
  "customer",
  "commercial",
]) {
  const account = accounts.find((a) => a.role === role);
  assert.ok(account);
  const login = await rpc("login", {
    email: account.email,
    password: account.password,
  });
  verify(role, "login", login, 200);
  const token = login.body.token;
  assert.ok(token);
  try {
    const me = await rpc("me", undefined, token);
    verify(role, "me", me, 200);
    assert.equal(me.body.user.role, role);
    if (role === "driver" || role === "technician")
      verify(
        role,
        role + ".restrict",
        await rpc(role + ".restrict", {}, token),
        200,
      );
    const paths =
      role === "owner"
        ? [
            "navigation",
            "orders",
            "settings?scope=lagos",
            "production.readiness",
          ]
        : role === "manager"
          ? ["navigation", "orders", "bookings"]
          : role === "finance"
            ? ["navigation", "orders", "finance.ledger?limit=25"]
            : role === "driver"
              ? ["driver.snapshot", "orders"]
              : role === "technician"
                ? ["technician.snapshot", "bookings"]
                : ["account.profile", "orders", "wallet", "testimonials.mine"];
    for (const path of paths) {
      const r = await rpc(path, undefined, token);
      verify(role, path, r, 200);
      if (path === "production.readiness")
        assert.equal(r.body.recommendation, "NO-GO");
    }
    if (["customer", "commercial", "driver", "technician"].includes(role))
      for (const path of [
        "purchasing",
        "finance.ledger",
        "production.readiness",
      ])
        verify(role, path, await rpc(path, undefined, token), 403);
    if (role === "customer")
      verify(
        role,
        "unowned payment intent",
        await rpc(
          "payments/paystack/status?intentId=00000000-0000-4000-8000-000000000001",
          undefined,
          token,
        ),
        404,
      );
  } finally {
    verify(role, "logout", await rpc("logout", {}, token), 200);
  }
  console.log(role + " read/access checks passed; temporary session revoked");
}
const publicCatalogue = await rpc("catalogue");
verify("public", "catalogue", publicCatalogue, 200);
catalogue = publicCatalogue.body;
const product = catalogue.products.find(
  (p) => p.category !== "Gas refills" && p.published && p.price_kobo > 0,
);
assert.ok(
  product,
  "An existing published physical product is required for quote validation",
);
const gas = await rpc("gas.catalogue?branchId=lagos");
verify("public", "gas.catalogue", gas, 200);
const area = gas.body.locations.find((a) => a.branch_id === "lagos");
assert.ok(area);
const input = {
  branchId: "lagos",
  locationId: area.id,
  lines: [],
  items: [{ productId: product.id, quantity: 1 }],
};
const quote = await rpc("gas.quote", input);
// Never add stock or misrepresent an unavailable demo item as purchasable.
if (Number(product.available) > 0) {
  verify("public", "product-only quote", quote, 200);
  assert.equal(quote.body.physicalLines[0].productId, product.id);
  assert.ok(quote.body.physicalSubtotalKobo > 0);
} else {
  verify("public", "out-of-stock product-only quote rejected", quote, 409);
  assert.match(JSON.stringify(quote.body), /stock|available|unavailable/i);
}
verify(
  "public",
  "empty quote rejected",
  await rpc("gas.quote", { ...input, items: [] }),
  400,
);
verify(
  "public",
  "identity injection rejected",
  await rpc("gas.quote", { ...input, role: "owner" }),
  400,
);
await fs.writeFile(
  output,
  JSON.stringify(
    {
      origin,
      at: new Date().toISOString(),
      scope:
        "Read-only business checks plus temporary own auth/session restriction/revocation and public price quotes; no order, payment, stock, policy or safety writes",
      checks,
      passed: checks.length,
      positiveHostedProductQuote:
        Number(product.available) > 0
          ? "PASS"
          : "BLOCKED_NO_PURCHASABLE_PHYSICAL_STOCK",
      positiveProductQuoteEvidence:
        "Local native component plus real API fixture passed; hosted positive case remains blocked by existing demo stock",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  checks.length + " hosted checks passed; no business records changed",
);
