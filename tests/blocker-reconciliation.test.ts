import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createDatabase, type DB, one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { hashPassword, id, issueSession, digest } from "../apps/web/lib/auth";
import { recordFailure } from "../apps/web/lib/observability";
import { requiredSchemaVersions } from "../apps/web/lib/release-checks";
const password = "Blocker-local-fixture-only-123!";
async function fixture() {
  const db = await createDatabase("memory://");
  await db.exec(await readFile("database/bootstrap.sql", "utf8"));
  await db.exec("SET search_path TO easygas_private,pg_catalog");
  const actors: Record<string, any> = {};
  await db.query(
    "INSERT INTO branches(id,name) VALUES('blocker-other','Other QA branch')",
  );
  for (const role of [
    "owner",
    "manager",
    "finance",
    "driver",
    "technician",
    "customer",
    "commercial",
  ]) {
    const uid = id(),
      email = uid + "@blocker.example.test";
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$2,'lagos')",
      [uid, role, email, hashPassword(password)],
    );
    actors[role] = { id: uid, email, token: await issueSession(db, uid) };
  }
  await db.exec("SET ROLE easygas_server");
  return {
    db,
    actors,
    call: (role: string, action: string, data: any = {}) =>
      dispatch(action, actors[role].token, data, db),
  };
}
test("PBR21-INCIDENTS: nine original failures remain counted and field sign-in repairs work without widening restricted session grants", async () => {
  const original = JSON.parse(
    await readFile(
      "docs/blocker-reconciliation/evidence/incidents-before.json",
      "utf8",
    ),
  );
  assert.equal(original.unresolvedHighCritical, 9);
  assert.equal(new Set(original.incidents.map((i: any) => i.id)).size, 9);
  assert.ok(
    original.incidents.every((i: any) => i.category === "operation_failure"),
  );
  const f = await fixture();
  try {
    for (const role of ["driver", "technician"]) {
      const a = f.actors[role];
      await assert.rejects(
        () =>
          f.db.query(
            "UPDATE sessions SET driver_delivery_only=true WHERE id=$1",
            [digest(a.token)],
          ),
        /permission denied/,
      );
      const login = await dispatch(
        role + ".login",
        null,
        { email: a.email, password },
        f.db,
      );
      assert.equal(login.role, role);
      for (let n = 0; n < 2; n++)
        await dispatch(role + ".restrict", login.token, {}, f.db);
      await dispatch(
        role === "driver" ? "driver.snapshot" : "technician.jobs",
        login.token,
        {},
        f.db,
      );
      await assert.rejects(
        () => dispatch("finance.ledger", login.token, {}, f.db),
        { status: 403 },
      );
      await dispatch("logout", login.token, {}, f.db);
    }
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM operational_incidents WHERE category='operation_failure'",
      ))!.n,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("PBR21-READINESS: scoped historical CI evidence corrects stale text without granting production, retention or demo worker acceptance", async () => {
  const f = await fixture();
  const keys = [
    "VERCEL",
    "APP_URL",
    "EASYGAS_CLIENT_DEMO",
    "EASYGAS_BACKGROUND_JOBS",
  ];
  const before = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  try {
    Object.assign(process.env, {
      VERCEL: "1",
      APP_URL: "https://easygas-client-demo.vercel.app",
      EASYGAS_CLIENT_DEMO: "true",
      EASYGAS_BACKGROUND_JOBS: "false",
    });
    const r = await f.call("owner", "production.readiness");
    assert.equal(r.recommendation, "NO-GO");
    assert.equal(r.gates.length, 20);
    assert.equal(r.environmentScope, "client_demo");
    assert.equal(r.gates.find((g: any) => g.id === 2).status, "partial");
    assert.match(
      r.gates.find((g: any) => g.id === 2).evidence,
      /1,137 tests passed/,
    );
    assert.match(r.recordedRelease.limitation, /does not certify later source/);
    assert.match(
      r.gates.find((g: any) => g.id === 4).evidence,
      new RegExp("through " + requiredSchemaVersions.at(-1)),
    );
    assert.match(
      r.gates.find((g: any) => g.id === 18).evidence,
      /intentionally disables/,
    );
    assert.equal(r.gates.find((g: any) => g.id === 19).status, "blocked");
    assert.match(r.gates.find((g: any) => g.id === 19).evidence, /retain-all/);
    assert.equal(r.gates.find((g: any) => g.id === 20).status, "blocked");
    process.env.APP_URL = "https://production.example.test";
    assert.doesNotMatch(
      (await f.call("owner", "production.readiness")).gates.find(
        (g: any) => g.id === 18,
      ).evidence,
      /intentionally disables/,
    );
    const review = {
      gateId: 2,
      evidence:
        "Synthetic QA reviewed historical CI, not production acceptance.",
      reason: "Review scoped evidence without changing release authority",
    };
    await f.call("owner", "reauth", { password });
    await f.call("owner", "readiness.review", review);
    assert.equal(
      (await f.call("owner", "production.readiness")).recommendation,
      "NO-GO",
    );
  } finally {
    for (const k of keys) {
      if (before[k] === undefined) delete process.env[k];
      else process.env[k] = before[k];
    }
    await f.db.close?.();
  }
});
test("PBR21-FIXES: repeated errors retain one diagnostic ID, reopen resolved failures and append safe immutable audit observations", async () => {
  const f = await fixture();
  try {
    const first = await recordFailure(
      f.db,
      "operation_failure",
      "catalogue:synthetic-hour",
      "error",
    );
    assert.equal(
      await recordFailure(
        f.db,
        "operation_failure",
        "catalogue:synthetic-hour",
        "error",
      ),
      first,
    );
    await f.call("owner", "incident.update", {
      id: first,
      status: "resolved",
      note: "Synthetic reviewed recovery evidence",
    });
    assert.equal(
      await recordFailure(
        f.db,
        "operation_failure",
        "catalogue:synthetic-hour",
        "password=never-log-this",
      ),
      first,
    );
    const row = await one(
      f.db,
      "SELECT * FROM operational_incidents WHERE id=$1",
      [first],
    );
    assert.equal(row!.status, "open");
    assert.match(row!.detail, new RegExp(first));
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM incident_events WHERE incident_id=$1",
        [first],
      ))!.n,
      1,
    );
    const observations = (
      await f.db.query(
        "SELECT * FROM audit_events WHERE target=$1 AND action='incident.failure_observed'",
        [first],
      )
    ).rows;
    assert.equal(observations.length, 3);
    assert.ok(!JSON.stringify(observations).includes("never-log-this"));
    await assert.rejects(
      () =>
        f.db.query("UPDATE audit_events SET outcome='denied' WHERE target=$1", [
          first,
        ]),
      /permission denied|immutable/,
    );
    await assert.rejects(
      () =>
        f.db.query(
          "UPDATE incident_events SET note='changed' WHERE incident_id=$1",
          [first],
        ),
      /permission denied|immutable/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("PBR21-SECURITY: incident history is paged and branch-scoped; readiness and response authority cannot be forged", async () => {
  const f = await fixture();
  try {
    const local = await recordFailure(
      f.db,
      "operation_failure",
      "local:fixture",
      "error",
      "lagos",
    );
    const other = await recordFailure(
      f.db,
      "operation_failure",
      "other:fixture",
      "error",
      "blocker-other",
    );
    const global = await recordFailure(
      f.db,
      "operation_failure",
      "global:fixture",
      "error",
    );
    for (let n = 0; n < 21; n++)
      await f.call("owner", "incident.update", {
        id: local,
        status: "acknowledged",
        note: "Synthetic response " + n,
      });
    const detail = (role: string, incident: string, page = 1) =>
      f.call(role, "incidents", { view: "detail", id: incident, page });
    const page = await detail("finance", local);
    assert.equal(page.total, 21);
    assert.equal(page.events.length, 20);
    const older = await detail("manager", local, 999);
    assert.equal(older.page, 2);
    assert.equal(older.events.length, 1);
    assert.equal(
      new Set([...page.events, ...older.events].map((e: any) => e.id)).size,
      21,
    );
    assert.equal((await detail("owner", other)).incident.id, other);
    for (const role of ["manager", "finance"])
      for (const target of [other, global])
        await assert.rejects(() => detail(role, target), { status: 404 });
    await f.db.exec("RESET ROLE");
    await f.db.query("UPDATE users SET branch_id=NULL WHERE id=$1", [
      f.actors.manager.id,
    ]);
    await f.db.exec("SET ROLE easygas_server");
    await assert.rejects(() => detail("manager", local), { status: 404 });
    for (const role of [
      "manager",
      "finance",
      "driver",
      "technician",
      "customer",
      "commercial",
    ])
      await assert.rejects(() => f.call(role, "production.readiness"), {
        status: 403,
      });
    for (const role of ["driver", "technician", "customer", "commercial"])
      await assert.rejects(() => detail(role, local), { status: 403 });
    await assert.rejects(
      () =>
        f.call("finance", "incident.update", {
          id: local,
          status: "resolved",
          note: "No finance response permission",
        }),
      { status: 403 },
    );
    await assert.rejects(() =>
      f.call("owner", "incidents", { view: "detail", id: local, page: 0 }),
    );
    await assert.rejects(() =>
      f.call("manager", "incidents", {
        view: "detail",
        id: other,
        role: "owner",
      }),
    );
  } finally {
    await f.db.close?.();
  }
});
test("PBR21-MATRIX: stable production IDs, original feature denominators and release holds are retained", async () => {
  for (const name of [
    "whole-app-production-audit",
    "production-end-to-end",
    "native-workflows",
  ]) {
    const p = "docs/traceability/" + name + "-rtm.json";
    const current = JSON.parse(await readFile(p, "utf8"));
    const old = JSON.parse(
      execFileSync("git", ["show", "ce3d915:" + p], { encoding: "utf8" }),
    );
    assert.deepEqual(
      current.requirements.map((r: any) => r.id),
      old.requirements.map((r: any) => r.id),
    );
    assert.deepEqual(
      current.gates.map((r: any) => r.id),
      old.gates.map((r: any) => r.id),
    );
  }
  const native = JSON.parse(
    await readFile("docs/traceability/native-workflows-rtm.json", "utf8"),
  );
  assert.equal(native.featureDenominator, 300);
  assert.equal(
    native.gates.find((g: any) => g.id === "NATIVE-G06").status,
    "BLOCKED",
  );
  const retention = await readFile(
    "docs/operations/record-retention.md",
    "utf8",
  );
  assert.match(retention, /All records must be retained/);
});
test("PBR21-RELEASE: historical baseline evidence is linked to immutable CI and exact application source rather than current production claims", async () => {
  const r = JSON.parse(
    await readFile("apps/web/lib/readiness-release-evidence.json", "utf8"),
  );
  const stats = JSON.parse(
    await readFile(
      "docs/deployment/20261121-web-api-publication/evidence/ci-test-summary.json",
      "utf8",
    ),
  );
  assert.equal(r.ciSource, stats.sourceCommit);
  assert.equal(r.ciTests.passed, stats.pass);
  assert.equal(r.ciTests.failed, 0);
  assert.equal(r.ciTests.skipped, 0);
  assert.equal(r.newMobileBinaries, 0);
  assert.equal(r.nativeExport, "skipped");
  assert.equal(r.kind, "historical_verified_client_demo_baseline");
  assert.match(r.limitation, /does not certify later source changes/);
  const manifest = JSON.parse(
    await readFile(
      "docs/deployment/20261121-web-api-publication/evidence/source-integrity.json",
      "utf8",
    ),
  );
  assert.equal(r.applicationSource, manifest.sourceCommit);
  assert.equal(manifest.fileCount, r.uploadedFilesVerified);
});

test('PBR21-SOURCE-CONTINUATION: historical web proofs extend only through explicit approved files and reject altered incoming hashes',async()=>{
 const {reviewedBlockerSourceHash}=await import('../scripts/lib/reviewed-blocker-source.mjs');
 const {reviewedAssignmentSourceHash}=await import('../scripts/lib/reviewed-assignment-source.mjs');
 const {createHash}=await import('node:crypto');const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
 const review=JSON.parse(await readFile('docs/blocker-reconciliation/reviewed-source-changes.json','utf8'));
 assert.deepEqual(Object.keys(review.files).sort(),['apps/web/app/product-ui.css','apps/web/components/operational-incidents.css','apps/web/components/operational-incidents.tsx','apps/web/components/readiness.tsx','apps/web/lib/observability.ts','apps/web/lib/professional-services.ts','apps/web/lib/readiness.ts','apps/web/lib/service.ts']);
 assert.ok(Object.keys(review.files).every(p=>p.startsWith('apps/web/')));
 for(const [file,hash]of Object.entries(review.files)){
  assert.equal(sha(await readFile(file)),await reviewedAssignmentSourceHash(file,hash));
  assert.equal(await reviewedBlockerSourceHash(file,review.baseline[file]),await reviewedAssignmentSourceHash(file,hash));
  await assert.rejects(()=>reviewedBlockerSourceHash(file,'0'.repeat(64)),/historical hash/);
 }
 for(const [file,hash]of Object.entries(review.addedFiles))assert.equal(sha(await readFile(file)),hash);
 assert.equal(await reviewedBlockerSourceHash('apps/mobile/unreviewed-surface.tsx','original-native-proof'),'original-native-proof');
});
