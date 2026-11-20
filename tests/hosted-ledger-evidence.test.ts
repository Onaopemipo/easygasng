import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const dir = "docs/hosted-ledger-acceptance/evidence/";
const json = async (name: string) =>
  JSON.parse(await readFile(dir + name, "utf8"));
test("HLED-HOSTED: recorded HTTPS acceptance covers seven identities, denied roles, pagination, validation and unchanged business records", async () => {
  const r = await json("hosted-results.json");
  assert.equal(r.origin, "https://easygas-client-demo.vercel.app");
  assert.equal(r.endpoint, "GET /api/finance.ledger");
  assert.ok(
    ["PASS", "PASS_HOSTED_WITH_EXPLICIT_BRANCH_DATA_LIMIT"].includes(r.status),
  );
  assert.deepEqual(
    r.roles.map((r: any) => r.role),
    [
      "owner",
      "finance",
      "manager",
      "driver",
      "technician",
      "customer",
      "commercial",
    ],
  );
  assert.ok(
    r.roles.every((r: any) => r.status === "AUTHENTICATED" && r.branch),
  );
  assert.equal(
    r.checks.filter(
      (r: any) =>
        r.id === "HLED-ROLE-DENIED" &&
        r.statusCode === 403 &&
        r.validAndMalformedDenied,
    ).length,
    5,
  );
  assert.equal(
    r.checks.filter(
      (r: any) => r.id === "HLED-WORKSPACE-DENIED" && r.statusCode === 403,
    ).length,
    2,
  );
  assert.equal(
    r.checks.filter(
      (r: any) => r.id === "HLED-INPUT-DENIED" && r.statusCode === 400,
    ).length,
    14,
  );
  for (const id of [
    "HLED-ANONYMOUS",
    "HLED-OWNER",
    "HLED-PAGINATION",
    "HLED-FINANCE",
    "HLED-READ-METHOD",
    "HLED-OLD-ALIAS",
    "HLED-TERMINAL-CURSOR",
    "HLED-PRESERVATION",
  ])
    assert.ok(r.checks.some((c: any) => c.id === id && c.status === "PASS"));
  assert.ok(r.checks.every((c: any) => c.status === "PASS"));
  assert.equal(
    r.owner.count,
    r.pages.owner.reduce((n: number, p: any) => n + p.rows, 0),
  );
  assert.ok(r.pages.owner.every((p: any) => p.status === 200 && p.noStore));
  assert.equal(r.pages.owner.at(-1).hasMore, false);
  assert.ok(r.finance.branch);
  assert.deepEqual(r.preservation.before, r.preservation.after);
  assert.equal(r.preservation.ledgerUnchanged, true);
  assert.equal(r.preservation.businessUnchanged, true);
  assert.equal(r.financialWrites, 0);
  assert.equal(r.sessionsRevoked.length, 9);
  assert.ok(r.sessionsRevoked.every((s: any) => s.status === 200));
  assert.ok(
    ["PASS", "UNTESTED_NO_FOREIGN_BRANCH_DATA"].includes(
      r.hostedCrossBranch.status,
    ),
  );
  if (r.hostedCrossBranch.status !== "PASS")
    assert.ok(r.hostedCrossBranch.reason.includes("no row outside"));
  assert.ok(Date.parse(r.finishedAt) >= Date.parse(r.startedAt));
});
test("HLED-SNAPSHOT: repaired earlier verifier independently reads the complete ledger and matches hosted sweep", async () => {
  const [r, s] = await Promise.all([
    json("hosted-results.json"),
    json("corrected-snapshot.json"),
  ]);
  assert.equal(s.origin, r.origin);
  for (const key of ["orders", "credits", "inventory", "ledger"])
    assert.equal(s.records[key].status, 200);
  assert.equal(s.records.ledger.endpoint, "GET /api/finance.ledger");
  assert.equal(s.records.ledger.complete, true);
  assert.equal(s.records.ledger.count, r.owner.count);
  assert.equal(s.records.ledger.sha256, r.owner.sha256);
  for (const key of ["orders", "credits", "inventory"])
    assert.deepEqual(s.records[key], r.preservation.after[key]);
  const source = await readFile(
    "scripts/verify-mobile-device-hosted.mjs",
    "utf8",
  );
  assert.ok(source.includes("readVerifiedLedger"));
  assert.doesNotMatch(source, /\["orders", "credits", "ledger"/);
});
