import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
const base = "docs/mobile-device-acceptance/evidence/";
const json = async (p: string) => JSON.parse(await readFile(base + p, "utf8"));
test("MDEV-DEVICE-EVIDENCE: sequential native observations retain seven roles, exceptions, repaired findings and hosted/fixture boundaries", async () => {
  const observations = await json("device-observations.json");
  assert.deepEqual([...new Set(observations.map((o: any) => o.role))].sort(), [
    "commercial",
    "customer",
    "driver",
    "finance",
    "manager",
    "owner",
    "technician",
  ]);
  let previous = 0;
  for (const o of observations) {
    assert.ok(o.stage >= previous, "stage order retained");
    previous = o.stage;
    await access(base + o.screenshot);
    await access(base + o.state);
  }
  const raw = async (name: string) =>
    readFile(base + "screens/" + name + ".txt", "utf8");
  assert.match(
    await raw("customer-lookup-failure"),
    /Retry refundable quantities/,
  );
  assert.match(await raw("customer-consent-required"), /checkbox, unchecked/);
  assert.match(
    await raw("customer-uncertain-submit"),
    /Synthetic QA uncertain response/,
  );
  assert.match(
    await raw("customer-refund-pending"),
    /Request awaiting independent finance review/,
  );
  assert.match(
    await raw("commercial-refund-pending"),
    /button \(disabled\) Description: Request selected refund/,
  );
  assert.match(await raw("technician-jobs-failure"), /Retry Jobs/);
  assert.match(await raw("business-workspace-pagination"), /Page 2 of 2/);
  assert.match(
    await raw("service-material-states-native"),
    /Synthetic issued hose fixture/,
  );
  assert.match(
    await raw("driver-proof-camera-unavailable"),
    /Camera capture is unavailable/,
  );
  assert.match(await raw("native-money-label-fixed"), /Amount \(₦\)/);
  const verify = await raw("verification-feedback-fixed");
  assert.doesNotMatch(
    verify,
    /Verify your password again before this sensitive action/,
  );
  assert.match(verify, /Synthetic verification regression draft/);
  const failure = await raw("driver-failure-evidence-fixed");
  assert.match(
    failure,
    /button \(disabled\) Description: Report Failure to Dispatch/,
  );
  assert.doesNotMatch(
    failure.split("\n").find((x) => /text field.*Failure evidence/.test(x)) ??
      "",
    /Synthetic acknowledgement/,
  );
  assert.doesNotMatch(
    await raw("driver-picked-up-warning-fixed"),
    /Ask dispatch to renew this assignment/,
  );
  assert.match(await raw("legacy-required-field-fixed"), /Choose Vehicle\./);
  assert.doesNotMatch(
    await raw("older-record-bound-and-required-fixed"),
    /Record: Choose/,
  );
  const before = await json("stage1-before.json"),
    pending = await json("stage1-complete.json"),
    final = await json("final-fixture-readback.json");
  assert.equal(pending.refunds.length, 2);
  assert.ok(pending.refunds.every((r: any) => r.status === "pending"));
  assert.deepEqual(pending.balances, before.balances);
  assert.deepEqual(final.refunds.map((r: any) => r.status).sort(), [
    "approved",
    "rejected",
  ]);
  const approved = final.refunds.find((r: any) => r.status === "approved");
  const amounts = (v: any) =>
    Object.fromEntries(
      v.balances.map((r: any) => [r.customer_id, Number(r.balance)]),
    );
  const original = amounts(before),
    latest = amounts(final);
  for (const [id, amount] of Object.entries(original))
    assert.equal(
      latest[id] - Number(amount),
      id === approved.customer_id ? Number(approved.amount_kobo) : 0,
    );
  assert.equal(
    final.requests.filter(
      (r: any) =>
        r.action === "driver.complete" || r.action === "delivery.complete",
    ).length,
    0,
  );
  assert.ok(
    final.requests
      .filter((r: any) => r.action === "trip.start")
      .every((r: any) => r.status >= 400),
  );
  const findings = JSON.parse(
    await readFile("docs/mobile-device-acceptance/findings.json", "utf8"),
  );
  assert.equal(findings.length, 7);
  assert.ok(findings.every((f: any) => f.status === "RESOLVED"));
  for (const f of findings)
    for (const name of f.evidence)
      assert.ok(observations.some((o: any) => o.name === name));
  const hostedBefore = await json("hosted-before-restore.json"),
    hostedAfter = await json("hosted-after-restore.json");
  assert.deepEqual(hostedBefore.records, hostedAfter.records);
  assert.equal(hostedAfter.records.ledger.status, 405);
  assert.equal((await json("hosted-restoration.json")).financialWrites, 0);
  const artifacts = await json("artifact-preservation.json");
  assert.equal(artifacts.mobileBinaryBuilds, 0);
  assert.equal(artifacts.temporaryHarnessEntryRemoved, true);
  assert.equal(artifacts.mainEntry, "index.ts");
});
