import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const root = "docs/deployment/20261121-web-api-publication/evidence/";
const json = async (name: string) =>
  JSON.parse(await readFile(root + name, "utf8"));
test("PUB21-GIT: all 49 original commits are published without history rewriting and retained by the CI follow-up", async () => {
  const [plan, published, eq] = await Promise.all(
    [
      "publication-plan.json",
      "source-publication.json",
      "ci-source-equivalence.json",
    ].map(json),
  );
  assert.equal(plan.pendingCommitCount, 49);
  assert.equal(plan.commits.length, 49);
  assert.equal(new Set(plan.commits).size, 49);
  assert.equal(plan.commits.at(-1), plan.sourceCommit);
  assert.equal(published.sourceCommit, plan.sourceCommit);
  assert.equal(published.remoteHead, plan.sourceCommit);
  assert.equal(published.existingCommitsPublished, 49);
  assert.equal(published.forcePush, false);
  assert.equal(published.all49Published, true);
  execFileSync("git", [
    "merge-base",
    "--is-ancestor",
    plan.sourceCommit,
    eq.ciCommit,
  ]);
  assert.equal(eq.all435UploadedFilesIdentical, true);
  assert.deepEqual(eq.changedPaths, [
    ".github/workflows/release-validation.yml",
    "tests/customer-mobile.test.ts",
    "tests/dispatch-centre-safety.test.ts",
    "tests/helpers/reviewed-native-hash.ts",
    "tests/mobile-device-remediation.test.ts",
    "tests/mobile-orders-text.test.ts",
    "tests/native-order-authority.test.ts",
    "tests/native-renderer/package-lock.json",
    "tests/native-renderer/package.json",
  ]);
});
test("PUB21-SOURCE: Ready candidate contains only exact committed web/shared files and stable alias selects that candidate", async () => {
  const [s, c, live] = await Promise.all(
    [
      "source-integrity.json",
      "candidate-identity.json",
      "stable-identity.json",
    ].map(json),
  );
  assert.equal(s.fileCount, 435);
  assert.equal(s.files.length, s.fileCount);
  assert.equal(c.projectId, "prj_cFSaJuN9r4x93RLov1LLVO3cdVA2");
  assert.equal(c.sourceCommit, s.sourceCommit);
  assert.equal(c.sourceMetadataConfirmed, true);
  assert.equal(c.readyState, "READY");
  assert.equal(c.target, "production");
  assert.equal(live.id, c.id);
  assert.equal(live.readyState, "READY");
  assert.equal(live.sourceCommit, c.sourceCommit);
  assert.equal(live.stableAlias, "https://easygas-client-demo.vercel.app");
  for (const f of s.files) {
    assert.doesNotMatch(
      f.path,
      /^(apps\/mobile|prototypes|outputs|docs|tests|scripts|\.data|\.github|\.openai)(\/|$)/,
    );
    assert.ok(
      !f.path
        .split("/")
        .some(
          (p: string) =>
            p.startsWith(".env") ||
            ["node_modules", ".git", ".next"].includes(p),
        ),
    );
    const committed = execFileSync(
      "git",
      ["show", s.sourceCommit + ":" + f.path],
      { maxBuffer: 32 * 1024 * 1024 },
    );
    assert.equal(
      createHash("sha256").update(committed).digest("hex"),
      f.sha256,
      f.path,
    );
    assert.equal(
      createHash("sha256")
        .update(await readFile(f.path))
        .digest("hex"),
      f.sha256,
      "current application source " + f.path,
    );
  }
});
test("PUB21-HOSTED: candidate and live seven-role checks preserve business data, protected settings, scoped ledger and production gates", async () => {
  const before = await json("before-hosted.json");
  assert.equal(before.status, "PASS");
  for (const stage of ["candidate", "stable"]) {
    const r = await json(stage + "-hosted.json");
    assert.equal(r.status, "PASS");
    assert.deepEqual(r.snapshot, before.snapshot);
    assert.equal(r.snapshot.readiness.recommendation, "NO-GO");
    assert.equal(r.snapshot.ledger.count, 11);
    assert.equal(r.financialWrites, 0);
    assert.equal(r.businessMutations, 0);
    assert.ok(r.checks.every((c: any) => c.result === "PASS"));
    for (const role of [
      "owner",
      "manager",
      "finance",
      "driver",
      "technician",
      "customer",
      "commercial",
    ])
      assert.ok(
        r.checks.some(
          (c: any) => c.name === role + " existing sign-in and own identity",
        ),
      );
    for (const role of ["driver", "technician", "customer", "commercial"])
      assert.ok(
        r.checks.some(
          (c: any) => c.name === role + " denied governed settings",
        ),
      );
    assert.ok(
      r.checks.some(
        (c: any) =>
          c.name.includes("foreign cursor and five other roles denied") &&
          c.ownerRows === 11 &&
          c.financeRows === 10,
      ),
    );
    assert.ok(
      r.checks.some(
        (c: any) =>
          c.name === "Owner-only release readiness and NO-GO boundary retained",
      ),
    );
    assert.equal(r.sessionsRevoked.length, 7);
    assert.ok(r.sessionsRevoked.every((s: any) => s.status === 200));
  }
  const ui = await json("browser-observations.json");
  assert.equal(ui.status, "PASS");
  assert.equal(ui.stableOrigin, "https://easygas-client-demo.vercel.app");
  assert.equal(ui.businessWrites, 0);
  assert.ok(ui.observations.every((o: any) => o.status === "PASS"));
  for (const o of ui.observations) await readFile(o.screenshot);
  const cross = await json("ledger-cross-branch.json");
  assert.equal(cross.status, "PASS");
  assert.equal(cross.checks.length, 13);
  assert.equal(cross.owner.count, 11);
  assert.equal(cross.finance.count, 10);
  assert.equal(cross.preservation.existingLedgerUnchanged, true);
  assert.equal(cross.preservation.existingBusinessUnchanged, true);
  assert.ok(cross.sessionsRevoked.every((s: any) => s.status === 200));
});
test("PUB21-NATIVE: web CI succeeds, mobile export is skipped and retained native artifacts are unchanged", async () => {
  const [native, jobs, stats, eq] = await Promise.all(
    [
      "native-preservation.json",
      "ci-final-jobs.json",
      "ci-test-summary.json",
      "ci-source-equivalence.json",
    ].map(json),
  );
  assert.equal(native.newMobileBinaryBuilds, 0);
  assert.equal(native.mobileExports, 0);
  assert.equal(native.mobileInstalls, 0);
  assert.equal(native.artifacts.length, 3);
  for (const a of native.artifacts) {
    assert.equal(a.before.sha256, a.after.sha256);
    assert.equal(a.before.mtimeNs, a.after.mtimeNs);
  }
  assert.equal(jobs.sourceCommit, eq.ciCommit);
  assert.equal(jobs.jobs.length, 2);
  assert.ok(
    jobs.jobs.every(
      (j: any) => j.status === "completed" && j.conclusion === "success",
    ),
  );
  const n = jobs.jobs.find((j: any) => j.name === "native");
  assert.ok(
    n.steps.some(
      (s: any) => s.name.includes("expo export") && s.conclusion === "skipped",
    ),
  );
  assert.ok(
    !n.steps.some((s: any) => /eas build|gradlew|xcodebuild/.test(s.name)),
  );
  assert.equal(stats.fail, 0);
  assert.ok(stats.pass > 1000);
  assert.equal(stats.sourceCommit, eq.ciCommit);
  const old = JSON.parse(
    await readFile("docs/traceability/native-workflows-rtm.json", "utf8"),
  );
  assert.equal(old.featureDenominator, 300);
  assert.equal(
    old.gates.find((g: any) => g.id === "NATIVE-G06").status,
    "BLOCKED",
  );
  assert.match(old.productionDecision, /NO-GO/);
});
