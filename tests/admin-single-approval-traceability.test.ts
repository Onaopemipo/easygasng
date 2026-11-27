import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
test("ASA-RTM: local completion claims bind executed evidence and exact reviewed source; unpublished and whole-suite gaps stay in the denominator", async () => {
  const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
  const matrix = await read("docs/traceability/admin-single-approval-rtm.json");
  assert.deepEqual(matrix.requirements.map((r: any) => r.id), ["ASA-01", "ASA-02", "ASA-03", "ASA-04", "ASA-05"]);
  assert.equal(matrix.coverage.verification.total, 5);
  assert.equal(matrix.coverage.verification.verified, 4);
  assert.equal(matrix.coverage.critical.total, 3);
  assert.equal(matrix.coverage.critical.verified, 3);
  assert.equal(matrix.requirements.at(-1).status, "PARTIAL");
  assert.equal(matrix.gates.at(-1).status, "OPEN");
  assert.match(matrix.releaseDecision, /NO-GO/);
  for (const r of matrix.requirements) {
    for (const key of ["dataSource", "securityControl", "reason", "outstandingWork", "acceptanceGate"])
      assert.ok(r[key], r.id + ": " + key);
    for (const path of [...r.implementationFiles, ...r.testFiles, ...r.evidence]) await access(path);
    if (r.status === "VERIFIED_COMPLETE") {
      const logs = (await Promise.all(r.evidence.filter((p: string) => p.endsWith(".txt")).map((p: string) => readFile(p, "utf8")))).join("\n");
      assert.match(logs, /ℹ fail 0/);
      assert.doesNotMatch(logs, /ℹ fail [1-9]/);
      for (const id of r.testIds) assert.ok(logs.includes("✔ " + id + ":"), id);
    }
  }
  const evidence = await read("docs/admin-single-approval/evidence/executed-tests.json");
  assert.equal(evidence.uniquePassingTestNames, 191);
  for (const run of evidence.runs) assert.equal(run.failed, 0);
  const source = await read("docs/admin-single-approval/evidence/reviewed-source.json");
  for (const row of source.paths)
    assert.equal(createHash("sha256").update(await readFile(row.path)).digest("hex"), row.sha256, row.path);
  const dry = await read("docs/admin-single-approval/evidence/release-dry-run.json");
  assert.equal(dry.reviewedFileCount, 492);
  assert.equal(dry.uploaded, false);
  assert.equal(dry.sharedDatabaseChanged, false);
  assert.equal(dry.allSourceHashesMatch, true);
  const browser = await read("docs/admin-single-approval/evidence/browser-result.json");
  assert.equal(browser.requiredApprovals, 1);
  assert.equal(browser.additionalColleagueDecisions, 0);
  assert.equal(browser.policyMetadataConfirmed, true);
  assert.match(await readFile("docs/admin-single-approval/evidence/migration085.txt", "utf8"), /preserved; Admin-only review guards installed\s*\|\s*155/);
  assert.deepEqual(matrix.coverage.wholeSuiteInitial.total, 1447);
  assert.equal(matrix.coverage.wholeSuiteInitial.failed, 58);
  assert.equal(matrix.coverage.wholeSuiteInitial.skipped, 36);
});
