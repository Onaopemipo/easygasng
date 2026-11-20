/** Read-only business acceptance against the named client demo. Auth sessions and read audits are expected. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readVerifiedLedger, ledgerFingerprint } from "./lib/hosted-ledger.mjs";
const origin = "https://easygas-client-demo.vercel.app",
  out =
    process.argv[2] ??
    "docs/hosted-ledger-acceptance/evidence/hosted-results.json";
const staff = (
  await fs.readFile(".data/demo-staff-logins-qa-ac7e0495.md", "utf8")
)
  .split("\n")
  .filter((l) => l.startsWith("|") && l.includes("@"))
  .map((l) => l.split("|").map((x) => x.trim().replaceAll("`", "")));
const match = {
  owner: "Admin / Business Owner",
  finance: "Finance / Auditor / Inventory",
  manager: "Branch Manager / Sales Rep / Dispatcher / Service Manager",
  driver: "Delivery Driver",
  technician: "Service Technician",
};
const old = JSON.parse(
  await fs.readFile(".data/demo-test-logins-20261110.json", "utf8"),
).accounts;
const accounts = Object.entries(match)
  .map(([role, label]) => {
    const row = staff.find((r) => r[1] === label);
    assert.ok(row, "Named QA role missing");
    return { role, email: row[2], password: row[3] };
  })
  .concat(
    ["customer", "commercial"].map((role) => {
      const a = old.find((a) => a.role === role);
      assert.ok(a);
      return { role, email: a.email, password: a.password, id: a.id };
    }),
  );
const sessions = new Map(),
  results = {
    startedAt: new Date().toISOString(),
    origin,
    endpoint: "GET /api/finance.ledger",
    mode: "Hosted business reads only; temporary authentication/logout sessions and normal read audit records",
    roles: [],
    checks: [],
    pages: {},
    preservation: {},
    hostedCrossBranch: { status: "PENDING" },
  };
async function request(token, path, input) {
  const r = await fetch(origin + "/api/" + path, {
    method: input === undefined ? "GET" : "POST",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
    headers: {
      "content-type": "application/json",
      "x-easygas-client": "native",
      ...(token ? { authorization: "Bearer " + token } : {}),
    },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
  return {
    status: r.status,
    body: await r.json(),
    cacheControl: r.headers.get("cache-control"),
  };
}
function passed(id, detail) {
  results.checks.push({ id, status: "PASS", ...detail });
}
const hash = (x) =>
  createHash("sha256").update(JSON.stringify(x)).digest("hex");
async function business(token) {
  const data = {};
  for (const path of ["orders", "credits", "inventory"]) {
    const r = await request(token, path);
    assert.equal(r.status, 200);
    const stable = r.body
      .map((x) =>
        path === "orders"
          ? {
              id: x.id,
              status: x.status,
              payment_status: x.payment_status,
              total_kobo: x.total_kobo,
              tracking_version: x.tracking_version,
            }
          : path === "credits"
            ? { id: x.id, status: x.status, amount_kobo: x.amount_kobo }
            : x,
      )
      .sort((a, b) =>
        String(a.id ?? a.product_id ?? "").localeCompare(
          String(b.id ?? b.product_id ?? ""),
        ),
      );
    data[path] = { status: 200, count: stable.length, sha256: hash(stable) };
  }
  return data;
}
try {
  const anonymous = await request(null, "finance.ledger?limit=1");
  assert.equal(anonymous.status, 401);
  assert.ok(!("rows" in anonymous.body));
  passed("HLED-ANONYMOUS", { statusCode: anonymous.status });
  for (const account of accounts) {
    const login = await request(null, "login", {
      email: account.email,
      password: account.password,
    });
    assert.equal(login.status, 200, "QA login failed for " + account.role);
    assert.ok(login.body.token, "No native session returned");
    sessions.set(account.role, login.body.token);
    const identity = await request(login.body.token, "me");
    assert.equal(identity.status, 200);
    assert.equal(identity.body.user.role, account.role);
    assert.equal(identity.body.user.email, account.email);
    if (account.id) assert.equal(identity.body.user.id, account.id);
    results.roles.push({
      role: account.role,
      branch: identity.body.user.branchId ?? null,
      status: "AUTHENTICATED",
    });
  }
  const owner = sessions.get("owner"),
    finance = sessions.get("finance");
  results.preservation.before = await business(owner);
  const ownerLedger = await readVerifiedLedger((p) => request(owner, p), {
    limit: 1,
  });
  results.pages.owner = ownerLedger.pages;
  results.owner = {
    count: ownerLedger.count,
    sha256: ownerLedger.sha256,
    branches: [...new Set(ownerLedger.rows.map((r) => r.branch_id))],
  };
  passed("HLED-OWNER", {
    statusCode: 200,
    count: ownerLedger.count,
    pages: ownerLedger.pages.length,
  });
  const ownerLarge = await readVerifiedLedger((p) => request(owner, p), {
    limit: 500,
  });
  assert.equal(
    ownerLarge.sha256,
    ownerLedger.sha256,
    "Small/large page reads disagree",
  );
  passed("HLED-PAGINATION", {
    smallPageSize: 1,
    largePageSize: 500,
    rows: ownerLedger.count,
    stableFingerprint: true,
  });
  const financeLedger = await readVerifiedLedger((p) => request(finance, p), {
    limit: 1,
  });
  const branch = results.roles.find((r) => r.role === "finance").branch;
  assert.ok(branch, "Finance QA account must have its existing branch");
  assert.ok(
    financeLedger.rows.every((r) => r.branch_id === branch),
    "Finance exposed another branch",
  );
  const expected = ownerLedger.rows.filter((r) => r.branch_id === branch);
  assert.equal(
    ledgerFingerprint(expected),
    financeLedger.sha256,
    "Finance differs from owner branch subset",
  );
  results.pages.finance = financeLedger.pages;
  results.finance = {
    branch,
    count: financeLedger.count,
    sha256: financeLedger.sha256,
  };
  passed("HLED-FINANCE", {
    statusCode: 200,
    branch,
    count: financeLedger.count,
    exactOwnerBranchSubset: true,
  });
  for (const role of [
    "manager",
    "driver",
    "technician",
    "customer",
    "commercial",
  ]) {
    for (const path of [
      "finance.ledger?limit=1",
      "finance.ledger?after=not-a-uuid",
    ]) {
      const r = await request(sessions.get(role), path);
      assert.equal(
        r.status,
        403,
        "Non-finance role must be denied before input/data validation",
      );
      assert.ok(!("rows" in r.body));
    }
    passed("HLED-ROLE-DENIED", {
      role,
      statusCode: 403,
      validAndMalformedDenied: true,
    });
  }
  for (const role of ["owner", "finance"])
    for (const [label, path] of [
      ["zero-limit", "finance.ledger?limit=0"],
      ["oversize-limit", "finance.ledger?limit=501"],
      ["invalid-limit", "finance.ledger?limit=abc"],
      ["malformed-cursor", "finance.ledger?after=not-a-uuid"],
      [
        "unknown-cursor",
        "finance.ledger?after=00000000-0000-4000-8000-000000000000",
      ],
      ["branch-spoof", "finance.ledger?limit=1&branchId=other"],
      ["role-spoof", "finance.ledger?limit=1&role=owner"],
    ]) {
      const r = await request(sessions.get(role), path);
      assert.equal(
        r.status,
        400,
        role + " " + label + " must reject invalid query",
      );
      assert.ok(!("rows" in r.body));
      passed("HLED-INPUT-DENIED", { role, case: label, statusCode: r.status });
    }
  const wrongMethod = await request(owner, "finance.ledger", { limit: 1 });
  assert.equal(wrongMethod.status, 405);
  passed("HLED-READ-METHOD", { statusCode: 405 });
  const oldAlias = await request(owner, "ledger");
  assert.equal(oldAlias.status, 405);
  passed("HLED-OLD-ALIAS", {
    statusCode: 405,
    reason:
      "Old verification URL remains unsupported; no permissive alias introduced",
  });
  for (const role of ["driver", "technician"]) {
    const a = accounts.find((a) => a.role === role);
    const login = await request(null, role + ".login", {
      email: a.email,
      password: a.password,
    });
    assert.equal(login.status, 200);
    sessions.set(role + "-workspace", login.body.token);
    const r = await request(login.body.token, "finance.ledger?limit=1");
    assert.equal(r.status, 403);
    assert.ok(!("rows" in r.body));
    passed("HLED-WORKSPACE-DENIED", { role, statusCode: r.status });
  }
  const foreign = ownerLedger.rows.find((r) => r.branch_id !== branch);
  if (foreign) {
    const r = await request(
      finance,
      "finance.ledger?after=" + encodeURIComponent(foreign.id),
    );
    assert.equal(r.status, 400);
    passed("HLED-HOSTED-FOREIGN-CURSOR", { statusCode: 400 });
    results.hostedCrossBranch = { status: "PASS", foreignCursorRejected: true };
  } else
    results.hostedCrossBranch = {
      status: "UNTESTED_NO_FOREIGN_BRANCH_DATA",
      reason:
        "Hosted ledger contains no row outside finance QA branch; local real-dispatcher branch isolation test is required, no hosted role/data changes made",
    };
  if (ownerLedger.rows.length) {
    const terminal = await request(
      owner,
      "finance.ledger?limit=1&after=" +
        encodeURIComponent(ownerLedger.rows.at(-1).id),
    );
    assert.equal(terminal.status, 200);
    assert.equal(terminal.body.rows.length, 0);
    assert.equal(terminal.body.hasMore, false);
    assert.equal(terminal.body.nextCursor, null);
    passed("HLED-TERMINAL-CURSOR", { statusCode: 200, empty: true });
  }
  const repeated = await readVerifiedLedger((p) => request(owner, p), {
    limit: 500,
  });
  assert.equal(repeated.sha256, ownerLedger.sha256);
  results.preservation.ledgerUnchanged = true;
  results.preservation.after = await business(owner);
  assert.equal(
    hash(results.preservation.after),
    hash(results.preservation.before),
    "Business records changed during reads",
  );
  results.preservation.businessUnchanged = true;
  results.financialWrites = 0;
  passed("HLED-PRESERVATION", { ledgerAndBusinessUnchanged: true });
  results.status =
    results.hostedCrossBranch.status === "PASS"
      ? "PASS"
      : "PASS_HOSTED_WITH_EXPLICIT_BRANCH_DATA_LIMIT";
} catch (error) {
  results.status = "FAIL";
  results.failure = error.message;
  process.exitCode = 1;
} finally {
  results.sessionsRevoked = [];
  for (const [role, token] of sessions) {
    try {
      const r = await request(token, "logout", {});
      results.sessionsRevoked.push({ role, status: r.status });
      if (r.status !== 200) process.exitCode = 1;
    } catch {
      results.sessionsRevoked.push({ role, status: "FAILED" });
      process.exitCode = 1;
    }
  }
  if (!results.sessionsRevoked.every((r) => r.status === 200)) {
    results.status = "FAIL";
    results.failure = "Temporary session cleanup was not confirmed";
  }
  results.finishedAt = new Date().toISOString();
  await fs.writeFile(out, JSON.stringify(results, null, 2) + "\n");
  console.log(
    JSON.stringify({
      status: results.status,
      roles: results.roles.length,
      checks: results.checks.length,
      ledgerRows: results.owner?.count,
      financeRows: results.finance?.count,
      crossBranch: results.hostedCrossBranch.status,
      sessionsCleaned: results.sessionsRevoked.every((r) => r.status === 200),
    }),
  );
  if (results.failure) console.error(results.failure);
}
