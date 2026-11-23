import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const json = async (p: string) => JSON.parse(await fs.readFile(p, "utf8"));
test("MOBUX23-TRACEABILITY: stable requirements, every canonical feature and open native gates remain in scope", async () => {
  const matrix = await json("docs/traceability/mobile-ux-20261123-rtm.json");
  assert.equal(matrix.requirements.length, 8);
  assert.equal(matrix.gates.length, 8);
  assert.equal(matrix.featureDenominator, 300);
  assert.equal(matrix.familyDenominator, 36);
  assert.equal(matrix.historicalScreenDenominator, 117);
  assert.match(matrix.productionDecision, /NO-GO/);
  for (let i = 0; i < 8; i++) {
    const r = matrix.requirements[i];
    assert.equal(r.id, "MOBUX23-R0" + (i + 1));
    assert.equal(r.acceptanceGate, "MOBUX23-G0" + (i + 1));
    assert.ok(
      r.reason && r.outstandingWork && r.securityControl && r.dataSource,
    );
    assert.ok(r.testFiles.length && r.testIds.length && r.evidence.length);
    for (const p of [...r.implementationFiles, ...r.testFiles, ...r.evidence])
      await fs.access(p);
  }
  assert.equal(
    matrix.requirements.filter((r: any) => r.status === "VERIFIED_COMPLETE")
      .length,
    4,
  );
  for (const id of ["MOBUX23-R02", "MOBUX23-R03", "MOBUX23-R04", "MOBUX23-R06"])
    assert.equal(
      matrix.requirements.find((r: any) => r.id === id).status,
      "PARTIAL",
    );
  const current = await json("docs/mobile-ux-20261123/feature-coverage.json"),
    original = await json("docs/mobile-prototype/feature-coverage.json");
  assert.equal(current.length, 36);
  assert.equal(
    current.reduce((n: number, f: any) => n + f.items.length, 0),
    300,
  );
  assert.deepEqual(
    current.map((f: any) => ({
      id: f.id,
      items: f.items.map((i: any) => i.name),
    })),
    original.map((f: any) => ({
      id: f.id,
      items: f.items.map((i: any) => i.name),
    })),
  );
  assert.ok(
    current
      .flatMap((f: any) => f.items)
      .every((i: any) => i.testStatus === "NOT_INDIVIDUALLY_ACCEPTED"),
  );
  const inventory = await json(
    "docs/mobile-ux-20261123/evidence/native-inventory.json",
  );
  assert.equal(inventory.modules.length, 58);
  const deploy = await json(
    "docs/mobile-ux-20261123/evidence/private-deployment.json",
  );
  assert.equal(deploy.status, "succeeded");
  assert.equal(deploy.access_mode, "owner-only");
  assert.equal(deploy.mobileBinariesBuilt, 0);
  assert.equal(
    deploy.project_id,
    (await json("prototypes/easygas-mobile-next/.openai/hosting.json"))
      .project_id,
  );
});
test("MOBUX23-SOURCE: all prior bytes and every new source transition remain verifiable and reject tampering", async () => {
  const review = await json(
    "docs/mobile-ux-20261123/reviewed-source-changes.json",
  );
  const { reviewedNativeUxSourceHash } = await import(
    "../scripts/lib/reviewed-native-ux-source.mjs"
  );
  assert.equal(Object.keys(review.files).length, 9);
  for (const [file, expected] of Object.entries(review.files)) {
    assert.equal(
      createHash("sha256")
        .update(execFileSync("git", ["show", review.baseCommit + ":" + file]))
        .digest("hex"),
      review.baseline[file],
    );
    assert.equal(
      createHash("sha256")
        .update(await fs.readFile(file))
        .digest("hex"),
      expected,
    );
    assert.equal(
      await reviewedNativeUxSourceHash(file, review.baseline[file]),
      expected,
    );
    await assert.rejects(
      () => reviewedNativeUxSourceHash(file, "tampered"),
      /source chain/,
    );
  }
  for (const [file, expected] of Object.entries(review.newFiles))
    assert.equal(
      createHash("sha256")
        .update(await fs.readFile(file))
        .digest("hex"),
      expected,
    );
  const manifest = await json(
    "prototypes/easygas-mobile-next/source-manifest.json",
  );
  assert.equal(manifest.sources.length, 10);
  for (const source of manifest.sources)
    assert.equal(
      createHash("sha256")
        .update(await fs.readFile(source.path))
        .digest("hex"),
      source.sha256,
    );
  for (const file of [
    "prototypes/easygas-mobile/source-manifest.json",
    "prototypes/easygas-mobile/dist/app.js",
    "prototypes/easygas-experience/source-manifest.json",
  ])
    assert.deepEqual(
      await fs.readFile(file),
      execFileSync("git", ["show", review.baseCommit + ":" + file], {
        maxBuffer: 32 * 1024 * 1024,
      }),
    );
});
