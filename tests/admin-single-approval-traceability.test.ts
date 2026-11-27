import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
test("ASA-RTM: completion claims bind executed evidence, migration and exact deployed source; whole-suite gaps stay in the denominator", async () => {
  const read = async (path: string) => JSON.parse(await readFile(path, "utf8"));
  const matrix = await read("docs/traceability/admin-single-approval-rtm.json");
  assert.deepEqual(matrix.requirements.map((r: any) => r.id), ["ASA-01", "ASA-02", "ASA-03", "ASA-04", "ASA-05"]);
  assert.equal(matrix.coverage.verification.total, 5);
  assert.equal(matrix.coverage.verification.verified, 5);
  assert.equal(matrix.coverage.critical.total, 3);
  assert.equal(matrix.coverage.critical.verified, 3);
  assert.equal(matrix.requirements.at(-1).status, "VERIFIED_COMPLETE");
  assert.equal(matrix.gates.at(-1).status, "PASS");
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
  const release = await read("docs/admin-single-approval/evidence/release-source.json");
  assert.equal(release.allUploadedSha1Match,true);
  assert.equal(release.allCommittedSourceSha1Match,true);
  for (const row of source.paths)
    assert.equal(createHash("sha256").update(execFileSync("git",["show",release.sourceCommit+":"+row.path])).digest("hex"), row.sha256, row.path);
  const migration = await read("docs/admin-single-approval/evidence/shared-migration085.json");
  assert.equal(migration.status,"PASS");assert.equal(migration.canonicalTablesChecked,155);
  assert.equal(createHash("sha256").update(await readFile("docs/admin-single-approval/apply-migration085.sql")).digest("hex"),migration.sqlSha256);
  for(const mode of ["candidate","stable"]){const hosted=await read("docs/admin-single-approval/evidence/"+mode+"-hosted.json");assert.equal(hosted.status,"PASS");assert.equal(hosted.customerAndRewardsPreserved,true);assert.equal(hosted.oneAdminAcceptance.additionalColleagueApprovals,0);assert.equal(hosted.oneAdminAcceptance.adminAuditProofs,1);assert.equal(hosted.deploymentId,release.deploymentId);}
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
