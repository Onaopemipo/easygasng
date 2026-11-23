import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { reviewedNativeNextSourceHash } from "../scripts/lib/reviewed-native-next-source.mjs";
const json = async (p: string) => JSON.parse(await fs.readFile(p, "utf8"));
test("NXT-TRACEABILITY: all approved requirements, gates and 300 stable feature leaves retain actual sources and honest acceptance limits", async () => {
  const m = await json("docs/traceability/mobile-native-next-rtm.json"),
    leaves = await json("docs/mobile-native-next/feature-acceptance.json"),
    original = await json("docs/native-workflows/feature-acceptance.json");
  assert.equal(m.requirements.length, 10);
  assert.equal(new Set(m.requirements.map((r: any) => r.id)).size, 10);
  assert.equal(m.gates.length, 10);
  assert.equal(leaves.length, 300);
  assert.equal(new Set(leaves.map((r: any) => r.family)).size, 36);
  assert.deepEqual(
    leaves.map((r: any) => r.id),
    original.map((r: any) => r.id),
  );
  assert.equal(m.historicalScreenDenominator, 117);
  assert.match(m.productionDecision, /NO-GO/);
  for (const r of m.requirements) {
    assert.ok(m.gates.some((g: any) => g.id === r.acceptanceGate));
    assert.ok(
      r.dataSource &&
        r.securityControl &&
        r.reason &&
        r.outstandingWork &&
        r.testIds.length,
    );
    for (const p of [...r.implementationFiles, ...r.evidence])
      await fs.access(p);
    assert.ok(!["UI_ONLY", "NOT_APPLICABLE"].includes(r.status));
  }
  for (const r of leaves) {
    assert.equal(r.deviceAcceptance, "NOT_INDIVIDUALLY_ACCEPTED");
    assert.equal(r.status, original.find((x:any)=>x.id===r.id).status);
    assert.ok(r.adoptionFiles.length);
    for (const p of r.adoptionFiles) await fs.access(p);
  }
  assert.equal(m.coverage.total, 10);
  assert.equal(m.coverage.excluded, 0);
  assert.equal(m.coverage.individuallyAcceptedNativeFeatures, 0);
});
test("NXT-NATIVE-BOUNDARY: committed baselines and exact reviewed native changes remain verifiable; shipped code cannot import the prototype engine", async () => {
  const review = await json(
    "docs/mobile-native-next/reviewed-source-changes.json",
  );
  assert.equal(review.baseCommit, "f52bf9bdd6eef3e0d057207491ffde4a80a3f6f2");
  for (const [file, hash] of Object.entries(review.files)) {
    const base = createHash("sha256")
      .update(
        execFileSync("git", ["show", review.baseCommit + ":" + file], {
          maxBuffer: 16 * 1024 * 1024,
        }),
      )
      .digest("hex");
    assert.equal(base, review.baseline[file]);
    assert.equal(await reviewedNativeNextSourceHash(file, base), hash);
    assert.equal(
      createHash("sha256")
        .update(await fs.readFile(file))
        .digest("hex"),
      hash,
    );
    await assert.rejects(
      () => reviewedNativeNextSourceHash(file, "tampered"),
      /source chain/,
    );
  }
  for (const [file, hash] of Object.entries(review.newFiles))
    assert.equal(
      createHash("sha256")
        .update(await fs.readFile(file))
        .digest("hex"),
      hash,
      file,
    );
  for (const name of await fs.readdir("apps/mobile"))
    if (name.endsWith(".tsx") || name.endsWith(".ts"))
      assert.doesNotMatch(
        await fs.readFile("apps/mobile/" + name, "utf8"),
        /from\s+["'][^"']*prototypes\/|require\(["'][^"']*prototypes\//,
        name,
      );
  assert.equal((await json("apps/mobile/package.json")).main, "index.ts");
  assert.match(await fs.readFile("apps/mobile/App.tsx", "utf8"), /<GasOrder/);
  assert.match(
    await fs.readFile("apps/mobile/HostedPayment.tsx", "utf8"),
    /payments\/paystack\/verify/,
  );
});
