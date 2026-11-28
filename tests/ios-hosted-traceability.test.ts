import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
test("DIO-HOSTED-MATRIX retains historical simulator requirements, hosted native evidence, security negatives and explicit gallery/signed-device limits", () => {
  const m = JSON.parse(
    readFileSync("docs/traceability/daily-ios-rtm.json", "utf8"),
  );
  assert.deepEqual(
    m.requirements.map((r: any) => r.id),
    ["DIO-01", "DIO-02", "DIO-03", "DIO-04", "DIO-05"],
  );
  assert.match(m.productionDecision, /NO-GO/);
  assert.equal(m.coverage.requirements, 5);
  assert.equal(m.coverage.verified, 5);
  assert.equal(m.coverage.gatesPassed, 5);
  assert.equal(m.coverage.excluded, 0);
  for (const r of m.requirements) {
    assert(
      r.dataSource &&
        r.securityControl &&
        r.testIds.length &&
        r.reason &&
        r.outstandingWork,
    );
    assert.equal(r.status, "VERIFIED_COMPLETE");
    assert.equal(
      m.gates.find((g: any) => g.id === r.acceptanceGate).status,
      "PASSED",
    );
    for (const file of [
      ...r.implementationFiles,
      ...r.testFiles,
      ...r.evidence,
    ])
      assert(existsSync(file), file);
  }
  const r = JSON.parse(
    readFileSync(
      "docs/daily-delivery/evidence/ios-hosted/results.json",
      "utf8",
    ),
  );
  assert.equal(r.nativeSteps.visibleFinalHeading, "Delivery Completed");
  assert.equal(r.nativeSteps.serverOrderStatus, "delivered");
  assert.equal(r.nativeSteps.customerOrderStatus, "delivered");
  assert.equal(r.nativeSteps.nativeMultipartUploadStatus, 200);
  assert.equal(r.nativeSteps.suppliedGrams, 12500);
  assert.equal(r.stock.varianceGrams, 0);
  assert.equal(r.photo.count, 1);
  assert.deepEqual(
    r.photo.accessChecks.map((x: any) => x.status),
    [200, 200, 200, 404, 401],
  );
  assert(
    r.negativeChecks.some(
      (x: any) =>
        x.name === "duplicate completion with new identity" && x.status === 409,
    ),
  );
  assert(
    r.negativeChecks.some(
      (x: any) => x.name === "photo without consent" && x.status === 400,
    ),
  );
  assert.equal(r.duplicateCompletionStockUnchanged, true);
  for (const count of Object.values(r.auditCounts)) assert.equal(count, 1);
  assert.equal(r.preservation.originalOrdersChecked, 32);
  assert.deepEqual(r.preservation.changedOrders, []);
  assert.equal(r.preservation.otherBranchStockHashesMatch, true);
  assert.equal(r.preservation.lagosSettingsMatch, true);
  assert.equal(r.cleanup.testDriverAccessSuspended, true);
  assert.equal(r.simulatorAdaptation.galleryPolicyOnDeployedDemo, false);
  assert.equal(r.simulatorAdaptation.productionPolicyChanged, false);
  assert.equal(r.simulatorAdaptation.physicalCameraTested, false);
  assert.equal(r.simulatorAdaptation.adapterStopped, true);
  assert.equal(r.finalVerification.newSignedBinary, false);
  const sync = readFileSync(
    "docs/daily-delivery/evidence/ios-hosted/11-final-sync-observation.txt",
    "utf8",
  );
  assert.match(sync, /Delivery records are up to date/);
  assert.equal(
    r.finalVerification.finalNativeSyncMessage,
    "Delivery records are up to date.",
  );
});
