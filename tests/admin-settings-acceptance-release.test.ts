import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
const read = async (p: string) =>
  JSON.parse(
    await readFile("docs/admin-settings-acceptance/evidence/" + p, "utf8"),
  );
test("ASACC-DEPLOY: exact reviewed web source, ready demo identity and safe upload boundaries", async () => {
  const identity = await read("release/candidate-identity.json"),
    upload = await read("release/upload-verified.json");
  assert.match(identity.sourceCommit, /^[0-9a-f]{40}$/);
  const css = execFileSync(
    "git",
    ["show", identity.sourceCommit + ":apps/web/app/globals.css"],
    { encoding: "utf8", maxBuffer: 2e6 },
  );
  assert.ok(
    css.includes("--sc-demo-space"),
    "Deployed source must include banner-aware dialog bounds",
  );
  assert.equal(identity.projectId, "prj_cFSaJuN9r4x93RLov1LLVO3cdVA2");
  assert.equal(identity.scope, "onaopemipos-projects");
  assert.equal(identity.readyState, "READY");
  assert.equal(identity.target, "production");
  assert.equal(identity.sourceMetadataConfirmed, true);
  assert.equal(upload.sourceCommit, identity.sourceCommit);
  assert.equal(upload.projectId, identity.projectId);
  assert.equal(upload.files.length, upload.fileCount);
  for (const file of upload.files) {
    assert.doesNotMatch(
      file.path,
      /(^|\/)(\.data|\.env[^/]*|docs|tests|scripts|prototypes|node_modules)(\/|$)|^apps\/mobile\//,
    );
    const source = execFileSync(
      "git",
      ["show", upload.sourceCommit + ":" + file.path],
      { maxBuffer: 32 * 1024 * 1024 },
    );
    assert.equal(
      createHash("sha256").update(source).digest("hex"),
      file.sha256,
      file.path,
    );
  }
  for (const path of [
    "apps/web/components/setting-change-form.tsx",
    "packages/business-rules/src/settings-categories.ts",
    "packages/business-rules/src/admin-settings-purpose.ts",
    "apps/web/components/setting-content-fields.tsx",
    "apps/web/components/setting-version-history.tsx",
  ])
    assert.ok(
      upload.files.some((f: any) => f.path === path),
      path,
    );
});
test("ASACC-HOSTED: candidate and stable six-role API checks pass without changing business state", async () => {
  const before = await read("release/before-hosted.json"),
    identity = await read("release/candidate-identity.json");
  for (const stage of ["candidate", "stable"]) {
    const r = await read("release/" + stage + "-hosted.json");
    assert.equal(r.sourceCommit, identity.sourceCommit);
    assert.equal(r.deploymentId, identity.id);
    assert.equal(
      r.base,
      stage === "candidate"
        ? "https://" + identity.url
        : "https://easygas-client-demo.vercel.app",
    );
    assert.ok(r.checks.every((c: any) => c.result === "PASS"));
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
          (c: any) => c.name === role + " existing sign-in and own identity",
        ),
      );
    for (const role of ["owner", "manager", "finance"])
      assert.ok(
        r.checks.some(
          (c: any) =>
            c.name ===
            role +
              " entire settings inventory mapped once with unchanged canonical authority",
        ),
      );
    assert.equal(r.snapshot.definitions.count, 77);
    assert.ok(r.snapshot.definitions.sha256);
    for (const role of ["owner", "manager", "finance"])
      assert.ok(
        r.checks.some(
          (c: any) =>
            c.name ===
            role +
              " payment-setting visibility and canonical definitions preserved",
        ),
      );
    for (const role of ["owner", "finance"])
      assert.ok(
        r.checks.some(
          (c: any) =>
            c.name ===
            role +
              " gateway policy readable with protected approvals and sandbox boundary",
        ),
      );
    for (const role of ["driver", "technician", "customer"])
      assert.ok(
        r.checks.some(
          (c: any) => c.name === role + " denied governed settings",
        ),
      );
    for (const role of ["finance", "driver", "technician", "customer"])
      assert.ok(
        r.checks.some((c: any) => c.name === role + " denied staff lookup"),
      );
    assert.ok(
      r.checks.some(
        (c: any) =>
          c.name ===
          "Missing, malformed, ambiguous and forged lookup inputs rejected",
      ),
    );
    assert.ok(
      r.checks.some(
        (c: any) =>
          c.name ===
          "Post-check settings, approvals, staff, orders, inventory, ledger, policies and NO-GO gates unchanged",
      ),
    );
  }
  const browser = await read("release/stable-browser.json");
  assert.equal(
    browser.base,
    "https://easygas-client-demo.vercel.app/admin/settings",
  );
  assert.equal(browser.sourceCommit, identity.sourceCommit);
  assert.equal(browser.deploymentId, identity.id);
  assert.equal(browser.bundleDeploymentId, identity.id);
  assert.ok(browser.checks.every((c: any) => c.result === "PASS"));
  const mapping = JSON.parse(
    await readFile(
      "docs/admin-settings-audit/evidence/purpose-mapping.json",
      "utf8",
    ),
  );
  assert.equal(browser.categories.length, 9);
  assert.equal(
    browser.categories.reduce((n: number, c: any) => n + c.labels.length, 0),
    77,
  );
  for (const c of browser.categories)
    assert.deepEqual(
      [...c.labels].sort(),
      mapping.mappings
        .filter((m: any) => m.category === c.category)
        .map((m: any) => m.label)
        .sort(),
      c.category,
    );
  assert.equal(browser.phone.overflow, false);
  assert.equal(browser.phone.categories.length, 9);
  assert.equal(browser.locked.editButtons, 0);
  assert.equal(browser.history.title, "Stock valuation method — history");
  const audit = await JSON.parse(
    await readFile(
      "docs/admin-settings-audit/evidence/definition-audit.json",
      "utf8",
    ),
  );
  const badgeCounts: Record<string, number> = {};
  for (const c of browser.categories) {
    assert.equal(c.badges.length, c.labels.length);
    for (const b of c.badges) {
      const m = mapping.mappings.find(
        (m: any) => m.category === c.category && m.label === b.label,
      );
      assert.ok(m, b.label);
      const d = audit.definitions.find((d: any) => d.key === m.key);
      assert.ok(d, m.key);
      const expected = !d.propose_roles.includes("owner")
        ? d.propose_roles.length
          ? "View only"
          : "Read only"
        : d.owner_auto_approval
          ? "Automatic approval"
          : d.risk === 1
            ? "Routine change"
            : d.risk === 4
              ? "2 approvals required"
              : "Approval required";
      assert.equal(b.badge, expected, m.key);
      assert.ok(b.detail);
      badgeCounts[b.badge] = (badgeCounts[b.badge] || 0) + 1;
    }
  }
  for (const stage of ["candidate", "stable"]) {
    const r = await read("release/" + stage + "-hosted.json");
    for (const role of ["owner", "manager", "finance"]) {
      const check = r.checks.find(
        (c: any) =>
          c.name ===
          role +
            " entire settings inventory mapped once with unchanged canonical authority",
      );
      assert.equal(
        Object.values(check.badges).reduce((n: number, v: any) => n + v, 0),
        check.settings,
      );
      if (role === "owner") assert.deepEqual(check.badges, badgeCounts);
      else assert.ok(check.badges["View only"] > 0);
    }
  }
  const stable = await read("release/stable-identity.json");
  assert.equal(stable.id, identity.id);
  assert.equal(stable.readyState, "READY");
  assert.equal(stable.sourceCommit, identity.sourceCommit);
});
test("ASACC-NO-MOBILE-BUILD: original native artifacts retained byte-for-byte with original modification times", async () => {
  const before = await read("native-artifacts-before.json"),
    after = await read("native-artifacts-after.json");
  assert.equal(after.unchanged, true);
  assert.deepEqual(after.artifacts, before.artifacts);
  assert.equal(Object.keys(before.artifacts).length, 4);
  const identity = await read("release/candidate-identity.json");
  const changed = execFileSync(
    "git",
    ["diff", "--name-only", "654ef19", identity.sourceCommit],
    { encoding: "utf8" },
  );
  assert.doesNotMatch(changed, /^apps\/mobile\//m);
});

test("ASACC-EVIDENCE: seven-role exhaustive coverage, all editor types and exact inactive browser drafts are recorded", async () => {
  const roles = await read("role-coverage.json"),
    editors = await read("editor-coverage.json"),
    browser = await read("local-browser.json"),
    drafts = await read("local-browser-drafts.json");
  assert.deepEqual(
    roles.roles.map((r: any) => r.role).sort(),
    [
      "owner",
      "manager",
      "finance",
      "driver",
      "technician",
      "customer",
      "commercial",
    ].sort(),
  );
  assert.equal(roles.definitions, 76);
  assert.equal(roles.allCurrentValuesAndVersionsUnchanged, true);
  assert.equal(editors.rendered, 70);
  assert.equal(editors.invalidProposalsRejected, 70);
  assert.equal(editors.types.length, 21);
  assert.equal(browser.roles.length, 7);
  assert.ok(browser.checks.every((c: any) => c.result === "PASS"));
  assert.equal(browser.phone.overflow, false);
  assert.equal(drafts.checks.length, 4);
  assert.ok(
    drafts.checks.every(
      (c: any) =>
        c.status === "draft" && c.activeVersion === 1 && c.result === "PASS",
    ),
  );
  assert.equal(drafts.canonicalMoneyAndDateConfirmed, true);
  assert.equal(drafts.noDraftActivated, true);
  const hosted = await read("release/stable-browser.json");
  assert.deepEqual(hosted.editors.service.tabs, [
    "Service",
    "Pricing",
    "Requirements",
    "Review",
  ]);
  assert.deepEqual(hosted.editors.legal.tabs, [
    "Content",
    "Publication",
    "Review",
  ]);
  assert.equal(hosted.editors.checklist.rawObject, false);
  assert.equal(hosted.editors.service.rawObject, false);
  assert.equal(hosted.editors.legal.rawObject, false);
});
