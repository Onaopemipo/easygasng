import test from "node:test";
import assert from "node:assert/strict";
import {
  environmentChecks,
  operationalHealth,
  requiredSchemaVersions,
} from "../apps/web/lib/release-checks";
import { fixture } from "./helpers/order-tracking-fixture";
const good = {
  EASYGAS_EMAIL_ENABLED: "true",
  SMTP_HOST: "smtp.example.test",
  SMTP_PORT: "587",
  SMTP_FROM: "sender@example.test",
  SMTP_USER: "fixture",
  SMTP_PASSWORD: "fixture-not-real",
  APP_URL: "https://easygasng.com",
  DATABASE_URL:
    "postgresql://runtime:private@example.test/easygas?sslmode=verify-full",
  EASYGAS_BACKGROUND_JOBS: "false",
  EASYGAS_RELEASE_SHA: "a".repeat(40),
};
test("PR-01: release configuration fails closed for missing origin, insecure TLS, QA builds and unreviewed revisions", () => {
  assert.ok(environmentChecks(good).every((c) => c.ok));
  for (const change of [
    { EASYGAS_EMAIL_ENABLED: "false" },
    { SMTP_PORT: "25" },
    { APP_URL: "http://easygasng.com" },
    { APP_URL: "https://easygasng.com/api" },
    { APP_URL: "https://secret:secret@easygasng.com" },
    {
      DATABASE_URL:
        "postgresql://runtime:private@example.test/easygas?sslmode=require",
    },
    { NODE_TLS_REJECT_UNAUTHORIZED: "0" },
    { EASYGAS_BACKGROUND_JOBS: "true" },
    { EASYGAS_RELEASE_SHA: "main" },
    { EASYGAS_PREVIEW: "true" },
  ]) {
    assert.ok(environmentChecks({ ...good, ...change }).some((c) => !c.ok));
  }
  const serialized = JSON.stringify(
    environmentChecks({
      ...good,
      DATABASE_URL: "postgresql://private:do-not-log@example.test/db",
    }),
  );
  assert.ok(!serialized.includes("do-not-log"));
});
test("PR-02: readiness rejects missing migrations, absent/stale worker and future heartbeat", async () => {
  const f = await fixture();
  try {
    const versions = (
      await f.db.query("SELECT version FROM schema_migrations")
    ).rows.map((r) => r.version);
    assert.deepEqual(
      requiredSchemaVersions.filter((v) => !versions.includes(v)),
      [
        "003",
        "006",
        "008",
        "010",
        "013",
        "015",
        "017",
        "019",
        "021",
        "022",
        "024",
        "029",
        "031",
        "037",
        "039",
      ],
    );
    // Embedded fixtures deliberately skip managed-role policies. Add only fixture
    // markers here to exercise heartbeat timing; real runtime policies have PG tests.
    for (const version of requiredSchemaVersions.filter(
      (v) => !versions.includes(v),
    ))
      await f.db.query("INSERT INTO schema_migrations(version) VALUES($1)", [
        version,
      ]);
    const now = Date.now();
    assert.equal(await operationalHealth(f.db, now), false);
    await f.db.query(
      "INSERT INTO job_runs(id,job,status,finished_at) VALUES('probe-fixture','maintenance','completed',$1)",
      [new Date(now)],
    );
    assert.equal(await operationalHealth(f.db, now), true);
    assert.equal(await operationalHealth(f.db, now + 300001), false);
    assert.equal(await operationalHealth(f.db, now - 60001), false);
    await f.db.query("DELETE FROM schema_migrations WHERE version='046'");
    assert.equal(await operationalHealth(f.db, now), false);
  } finally {
    await f.db.close?.();
  }
});

test("PR-07: signed native configuration refuses local API origins and unconfirmed identifiers", async () => {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const run = promisify(execFile);
  const evaluate = (extra: Record<string, string>) =>
    run(
      process.execPath,
      [
        "--import",
        "tsx",
        "--input-type=module",
        "-e",
        "await import('./apps/mobile/app.config.js')",
      ],
      {
        env: {
          ...process.env,
          EAS_BUILD_PROFILE: "production",
          EXPO_PUBLIC_API_URL: "https://easygasng.com",
          EASYGAS_NATIVE_IDENTIFIERS_CONFIRMED: "true",
          ...extra,
        },
        timeout: 10000,
      },
    );
  await evaluate({});
  await assert.rejects(() =>
    evaluate({ EXPO_PUBLIC_API_URL: "http://127.0.0.1:3003" }),
  );
  await assert.rejects(() =>
    evaluate({ EXPO_PUBLIC_API_URL: "https://easygasng.com/api" }),
  );
  await assert.rejects(() =>
    evaluate({ EASYGAS_NATIVE_IDENTIFIERS_CONFIRMED: "false" }),
  );
});
