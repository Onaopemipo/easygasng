import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const root = "docs/native-workflows/evidence/web-release/",
  json = async (p: string) => JSON.parse(await readFile(root + p, "utf8"));
test("NATIVE-WEB-SOURCE: exact committed cloud upload excludes native, private and prototype artifacts", async () => {
  const s = await json("source-integrity.json");
  assert.equal(s.projectId, "prj_cFSaJuN9r4x93RLov1LLVO3cdVA2");
  assert.equal(s.files.length, s.fileCount);
  assert.ok(s.fileCount > 400);
  for (const file of s.files) {
    assert.ok(
      !/^(?:apps\/mobile|prototypes|outputs|docs|tests|scripts|\.data|\.github|\.openai)(?:\/|$)/.test(
        file.path,
      ),
    );
    assert.ok(!file.path.split("/").some((p: string) => p.startsWith(".env")));
    assert.equal(
      createHash("sha256")
        .update(
          execFileSync("git", ["show", s.sourceCommit + ":" + file.path], {
            maxBuffer: 32 * 1024 * 1024,
          }),
        )
        .digest("hex"),
      file.sha256,
      file.path,
    );
  }
});
test("NATIVE-WEB-HOSTED: six-role hosted verification preserves canonical records and validates the new owner-only handler", async () => {
  const before = await json("before-hosted.json");
  for (const name of ["candidate", "stable"]) {
    const r = await json(name + "-hosted.json");
    assert.deepEqual(r.snapshot, before.snapshot);
    assert.equal(r.snapshot.readiness.recommendation, "NO-GO");
    for (const role of [
      "owner",
      "manager",
      "finance",
      "driver",
      "technician",
      "customer",
    ])
      assert.ok(
        r.checks.some(
          (c: any) =>
            c.name === role + " existing sign-in and own identity" &&
            c.result === "PASS",
        ),
      );
    for (const key of [
      "Readiness review authentication and mutation-method boundaries",
      "Readiness review requires recent verification",
      "New deployed readiness handler validates gate without creating a review",
      "Malformed review rejected by strict schema",
      "Post-verification state unchanged; NO-GO retained",
    ])
      assert.ok(
        r.checks.some((c: any) => c.name === key && c.result === "PASS"),
      );
  }
});
test("NATIVE-WEB-RELEASE: stable alias points at verified Ready candidate and all existing mobile binaries remain byte-identical", async () => {
  const c = await json("candidate-identity.json"),
    s = await json("stable-identity.json"),
    native = await json("native-artifacts-unchanged.json");
  assert.equal(s.id, c.id);
  assert.equal(s.readyState, "READY");
  assert.equal(s.sourceCommit, c.sourceCommit);
  assert.equal(s.projectId, c.projectId);
  assert.equal(s.stableAlias, "https://easygas-client-demo.vercel.app");
  assert.equal(native.newMobileBuilds, 0);
  assert.equal(native.artifacts.length, 3);
  for (const a of native.artifacts) {
    assert.equal(a.beforeSha256, a.afterSha256);
    assert.equal(a.beforeMtimeNs, a.afterMtimeNs);
  }
  const rtm = JSON.parse(
    await readFile("docs/traceability/native-workflows-rtm.json", "utf8"),
  );
  assert.match(rtm.productionDecision, /NO-GO.*actual-import hold.*retain-all/);
  assert.equal(
    rtm.gates.find((g: any) => g.id === "NATIVE-G06").status,
    "BLOCKED",
  );
  assert.equal(rtm.featureDenominator, 300);
  assert.equal(rtm.coverage.features.externalBlocksRetained, 14);
});
