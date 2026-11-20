/** Uses existing demo identities and read APIs only; seed is a separately reviewed SQL operation. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { readVerifiedLedger, ledgerFingerprint } from "./lib/hosted-ledger.mjs";
const origin = "https://easygas-client-demo.vercel.app";
const phase = process.argv[2];
assert.ok(["baseline", "verify"].includes(phase));
const root = "docs/hosted-ledger-acceptance/cross-branch/evidence";
await fs.mkdir(root, { recursive: true });
const fixture = {
  branch: "qa-ledger-cross-branch",
  customerId: "637fe876-4424-4d52-8c70-141078af81ec",
  orderId: "1e9e700b-a268-47d1-a448-ae57c688d640",
  paymentId: "d9c2340e-845e-4eec-84bd-b9316386f0af",
  reference: "SYNTHETIC-QA-HLED-PAY-20261121",
  amountKobo: 1,
};
const privateBaseline = ".data/hosted-ledger-cross-branch-baseline.json";
const hash = (x) =>
  createHash("sha256").update(JSON.stringify(x)).digest("hex");
const staff = (
  await fs.readFile(".data/demo-staff-logins-qa-ac7e0495.md", "utf8")
)
  .split("\n")
  .filter((x) => x.startsWith("|") && x.includes("@"))
  .map((x) => x.split("|").map((x) => x.trim().replaceAll("`", "")));
const tokens = new Map();
const result = {
  phase,
  origin,
  startedAt: new Date().toISOString(),
  fixture,
  checks: [],
  sessionsRevoked: [],
  financialWrites: 0,
};
async function request(role, path, input) {
  const r = await fetch(origin + "/api/" + path, {
    method: input === undefined ? "GET" : "POST",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
    headers: {
      "content-type": "application/json",
      "x-easygas-client": "native",
      ...(tokens.has(role)
        ? { authorization: "Bearer " + tokens.get(role) }
        : {}),
    },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
  return {
    status: r.status,
    body: await r.json(),
    cacheControl: r.headers.get("cache-control"),
  };
}
const pass = (id, detail = {}) =>
  result.checks.push({ id, status: "PASS", ...detail });
async function business() {
  const value = {};
  for (const path of ["orders", "credits", "inventory"]) {
    const r = await request("owner", path);
    assert.equal(r.status, 200);
    assert.ok(Array.isArray(r.body));
    const rows = r.body
      .filter((x) => x.id !== fixture.orderId)
      .sort((a, b) =>
        String(a.id ?? a.product_id ?? "").localeCompare(
          String(b.id ?? b.product_id ?? ""),
        ),
      );
    value[path] = { count: rows.length, sha256: hash(rows) };
  }
  return value;
}
try {
  const status = await request(null, "status");
  assert.equal(status.status, 200);
  assert.deepEqual(status.body, { status: "ready", scope: "demo" });
  result.identities = [];
  for (const [role, label] of [
    ["owner", "Admin / Business Owner"],
    ["finance", "Finance / Auditor / Inventory"],
  ]) {
    const a = staff.find((x) => x[1] === label);
    assert.ok(a);
    const login = await request(null, "login", { email: a[2], password: a[3] });
    assert.equal(login.status, 200);
    assert.ok(login.body.token);
    tokens.set(role, login.body.token);
    const me = await request(role, "me");
    assert.equal(me.status, 200);
    assert.equal(me.body.user.role, role);
    assert.equal(me.body.user.email, a[2]);
    assert.ok(me.body.user.branchId);
    result.identities.push({
      id: me.body.user.id,
      role,
      branch: me.body.user.branchId,
    });
  }
  const read = (role, limit = 1) =>
    readVerifiedLedger((path) => request(role, path), { limit });
  const before = await read("owner"),
    finance = await read("finance");
  const financeBranch = result.identities.find(
    (x) => x.role === "finance",
  ).branch;
  const sources = await business();
  result.owner = {
    count: before.count,
    sha256: before.sha256,
    pages: before.pages,
  };
  result.finance = {
    count: finance.count,
    sha256: finance.sha256,
    pages: finance.pages,
    branch: financeBranch,
  };
  if (phase === "baseline") {
    assert.ok(!before.rows.some((x) => x.id === fixture.paymentId));
    assert.ok(!before.rows.some((x) => x.branch_id === fixture.branch));
    await fs.writeFile(
      privateBaseline,
      JSON.stringify(
        {
          origin,
          fixture,
          identities: result.identities,
          rows: before.rows,
          financeSha256: finance.sha256,
          sources,
        },
        null,
        2,
      ),
      { mode: 0o600, flag: "wx" },
    );
    pass("HLED-X-BASELINE", {
      ownerRows: before.count,
      financeRows: finance.count,
      fixtureAbsent: true,
    });
  } else {
    const baseline = JSON.parse(await fs.readFile(privateBaseline, "utf8"));
    assert.equal(baseline.origin, origin);
    assert.deepEqual(baseline.fixture, fixture);
    assert.deepEqual(baseline.identities, result.identities);
    const foreign = before.rows.filter((x) => x.id === fixture.paymentId);
    assert.equal(foreign.length, 1);
    assert.equal(foreign[0].branch_id, fixture.branch);
    assert.equal(foreign[0].reference, fixture.reference);
    assert.equal(Number(foreign[0].amount_kobo), 1);
    assert.equal(foreign[0].method, "synthetic_qa");
    assert.notEqual(financeBranch, fixture.branch);
    pass("HLED-X-OWNER", {
      statusCode: 200,
      fixtureVisible: true,
      rows: before.count,
    });
    assert.ok(finance.rows.every((x) => x.branch_id === financeBranch));
    assert.ok(
      !finance.rows.some(
        (x) => x.id === fixture.paymentId || x.branch_id === fixture.branch,
      ),
    );
    assert.equal(finance.sha256, baseline.financeSha256);
    assert.equal(
      finance.sha256,
      ledgerFingerprint(
        before.rows.filter((x) => x.branch_id === financeBranch),
      ),
    );
    pass("HLED-X-FINANCE", {
      statusCode: 200,
      fixtureHidden: true,
      exactBranchSubset: true,
      unchanged: true,
      rows: finance.count,
    });
    for (const limit of [1, 500]) {
      const r = await request(
        "finance",
        `finance.ledger?limit=${limit}&after=${fixture.paymentId}`,
      );
      assert.equal(r.status, 400);
      assert.equal(r.body.error, "Choose a valid report cursor.");
      assert.ok(!("rows" in r.body));
      pass("HLED-X-CURSOR", { limit, statusCode: r.status, noRows: true });
    }
    const unknown = await request(
      "finance",
      "finance.ledger?after=00000000-0000-4000-8000-000000000000",
    );
    assert.equal(unknown.status, 400);
    assert.equal(
      unknown.body.error,
      (await request("finance", "finance.ledger?after=" + fixture.paymentId))
        .body.error,
    );
    pass("HLED-X-NONDISCLOSURE", {
      unknownAndForeignIndistinguishable: true,
      statusCode: 400,
    });
    for (const query of [
      `branchId=${fixture.branch}`,
      `branch_id=${fixture.branch}`,
      "role=owner",
      `id=${fixture.paymentId}`,
    ]) {
      const r = await request("finance", "finance.ledger?limit=1&" + query);
      assert.equal(r.status, 400);
      assert.ok(!("rows" in r.body));
      pass("HLED-X-SPOOF", { parameter: query.split("=")[0], statusCode: 400 });
    }
    const cursor = await request(
      "owner",
      "finance.ledger?after=" + fixture.paymentId,
    );
    assert.equal(cursor.status, 200);
    assert.ok(Array.isArray(cursor.body.rows));
    pass("HLED-X-OWNER-CURSOR", { statusCode: 200 });
    const order = await request("finance", "orders?id=" + fixture.orderId);
    assert.equal(order.status, 200);
    assert.deepEqual(order.body, []);
    pass("HLED-X-ORDER", { statusCode: 200, empty: true });
    const branch = await request("owner", "branches");
    assert.equal(branch.status, 200);
    assert.equal(
      branch.body.find((b) => b.id === fixture.branch)?.active,
      false,
    );
    const ownerOrder = await request("owner", "orders?id=" + fixture.orderId);
    assert.equal(ownerOrder.status, 200);
    assert.equal(ownerOrder.body.length, 1);
    assert.equal(ownerOrder.body[0].status, "cancelled");
    assert.equal(ownerOrder.body[0].driver_id, null);
    pass("HLED-X-INERT", {
      branchInactive: true,
      orderCancelled: true,
      driverUnassigned: true,
    });
    assert.equal(
      ledgerFingerprint(before.rows.filter((x) => x.id !== fixture.paymentId)),
      ledgerFingerprint(baseline.rows),
    );
    assert.equal(before.count, baseline.rows.length + 1);
    assert.deepEqual(sources, baseline.sources);
    assert.equal((await read("owner", 500)).sha256, before.sha256);
    assert.equal((await read("finance", 500)).sha256, finance.sha256);
    result.preservation = {
      existingLedgerCount: baseline.rows.length,
      existingLedgerUnchanged: true,
      existingBusinessUnchanged: true,
      identitiesAndBranchesUnchanged: true,
      business: sources,
      exactlyOneSyntheticPayment: true,
    };
    pass("HLED-X-PRESERVATION");
  }
  result.status = "PASS";
} catch (e) {
  result.status = "FAIL";
  result.failure = e.message;
  process.exitCode = 1;
} finally {
  for (const [role] of tokens) {
    try {
      const r = await request(role, "logout", {});
      result.sessionsRevoked.push({ role, status: r.status });
      if (r.status !== 200) process.exitCode = 1;
    } catch {
      result.sessionsRevoked.push({ role, status: "FAILED" });
      process.exitCode = 1;
    }
  }
  if (!result.sessionsRevoked.every((s) => s.status === 200)) {
    result.status = "FAIL";
    result.failure = "Session cleanup not confirmed";
  }
  result.finishedAt = new Date().toISOString();
  await fs.writeFile(
    root + "/" + phase + "-results.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      status: result.status,
      phase,
      checks: result.checks.length,
      ownerRows: result.owner?.count,
      financeRows: result.finance?.count,
      ownSessionsRevoked: result.sessionsRevoked.every((s) => s.status === 200),
    }),
  );
  if (result.failure) console.error(result.failure);
}
