import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  createPostgresBackup,
  verifyPostgresBackup,
  restorePostgresBackup,
} from "../apps/web/lib/postgres-backup";
import { id } from "../apps/web/lib/auth";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "PR-03: encrypted PostgreSQL backup restores to an isolated empty target and rejects overwrite, tampering and wrong keys",
  { skip: enabled ? false : "Disposable local PostgreSQL required" },
  async () => {
    const base = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    assert.ok(
      ["127.0.0.1", "localhost", "[::1]"].includes(base.hostname) &&
        base.pathname.startsWith("/easygas_test") &&
        !process.env.DATABASE_URL,
    );
    const suffix = id().replaceAll("-", ""),
      sourceName = "easygas_test_backup_" + suffix,
      targetName = "easygas_restore_" + suffix;
    const admin = new Pool({ connectionString: base.toString(), max: 1 });
    const dir = await mkdtemp(path.join(os.tmpdir(), "easygas-backup-test-")),
      file = path.join(dir, "fixture.egbackup"),
      key = "Synthetic-backup-passphrase-only-123";
    const source = new URL(base);
    source.pathname = "/" + sourceName;
    const target = new URL(base);
    target.pathname = "/" + targetName;
    let db: Pool | undefined, restored: Pool | undefined;
    try {
      await admin.query(`CREATE DATABASE ${sourceName}`);
      await admin.query(`CREATE DATABASE ${targetName}`);
      db = new Pool({ connectionString: source.toString(), max: 1 });
      await db.query(
        "CREATE SCHEMA easygas_private; CREATE TABLE easygas_private.schema_migrations(version text PRIMARY KEY); INSERT INTO easygas_private.schema_migrations VALUES('046'); CREATE TABLE easygas_private.fixture_ledger(id text PRIMARY KEY,amount bigint); INSERT INTO easygas_private.fixture_ledger VALUES('committed',123456)",
      );
      await createPostgresBackup(source.toString(), file, key);
      assert.ok(!(await readFile(file)).includes(Buffer.from("committed")));
      await assert.rejects(
        () => createPostgresBackup(source.toString(), file, key),
        /exist/i,
      );
      assert.equal(
        (await verifyPostgresBackup(file, key)).archiveReadable,
        true,
      );
      await assert.rejects(
        () => verifyPostgresBackup(file, "Wrong-passphrase-123456"),
        /authentication/i,
      );
      await assert.rejects(
        () => restorePostgresBackup(file, key, source.toString(), sourceName),
        /dedicated/i,
      );
      await assert.rejects(
        () => restorePostgresBackup(file, key, target.toString(), "wrong"),
        /Confirm/i,
      );
      assert.deepEqual(
        (await restorePostgresBackup(file, key, target.toString(), targetName))
          .versions,
        ["046"],
      );
      restored = new Pool({ connectionString: target.toString(), max: 1 });
      assert.equal(
        (
          await restored.query(
            "SELECT amount FROM easygas_private.fixture_ledger",
          )
        ).rows[0].amount,
        "123456",
      );
      await assert.rejects(
        () => restorePostgresBackup(file, key, target.toString(), targetName),
        /not empty/i,
      );
      const data = await readFile(file);
      data[data.length - 1] ^= 1;
      const { writeFile } = await import("node:fs/promises");
      await writeFile(path.join(dir, "tampered"), data);
      await assert.rejects(
        () => verifyPostgresBackup(path.join(dir, "tampered"), key),
        /authentication/i,
      );
    } finally {
      await db?.end();
      await restored?.end();
      await admin.query(`DROP DATABASE IF EXISTS ${sourceName}`);
      await admin.query(`DROP DATABASE IF EXISTS ${targetName}`);
      await admin.end();
      await rm(dir, { recursive: true, force: true });
    }
  },
);

test(
  "PR-04: release audit rejects privileged owners and detects missing RLS and public grants under the actual runtime role",
  { skip: enabled ? false : "Disposable local PostgreSQL required" },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    assert.ok(
      ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
        url.pathname.startsWith("/easygas_test") &&
        !process.env.DATABASE_URL,
    );
    const admin = new Pool({ connectionString: url.toString(), max: 1 }),
      name = "easygas_test_release_" + id().replaceAll("-", "");
    await admin.query(`CREATE DATABASE ${name}`);
    url.pathname = "/" + name;
    const pool = new Pool({
      connectionString: url.toString(),
      max: 1,
      options: "-c search_path=easygas_private,pg_catalog",
    });
    const { databaseChecks } = await import("../apps/web/lib/release-checks");
    const wrap = {
      query: async (q: string, p?: any[]) => (await pool.query(q, p)) as any,
      exec: (q: string) => pool.query(q),
    };
    try {
      await pool.query(await readFile("database/bootstrap.sql", "utf8"));
      const ownerChecks = await databaseChecks(wrap);
      assert.equal(ownerChecks.find((c) => c.id === "runtime-role")?.ok, false);
      await pool.query("BEGIN; SET LOCAL ROLE easygas_server");
      const checks = await databaseChecks(wrap);
      assert.equal(checks.find((c) => c.id === "schema")?.ok, true);
      assert.equal(checks.find((c) => c.id === "runtime-role")?.ok, true);
      assert.equal(checks.find((c) => c.id === "private-schema")?.ok, true);
      assert.equal(checks.find((c) => c.id === "connection-tls")?.ok, false); // local fixture has no TLS
      await pool.query("ROLLBACK");
      await pool.query(
        "ALTER TABLE easygas_private.reward_entries DISABLE ROW LEVEL SECURITY",
      );
      assert.equal(
        (await databaseChecks(wrap)).find((c) => c.id === "private-schema")?.ok,
        false,
      );
      await pool.query(
        "ALTER TABLE easygas_private.reward_entries ENABLE ROW LEVEL SECURITY; GRANT SELECT ON easygas_private.reward_entries TO PUBLIC",
      );
      assert.equal(
        (await databaseChecks(wrap)).find((c) => c.id === "private-schema")?.ok,
        false,
      );
    } finally {
      await pool.query("ROLLBACK");
      await pool.end();
      await admin.query(`DROP DATABASE ${name}`);
      await admin.end();
    }
  },
);

test(
  "PR-08: supervised worker completes a real maintenance transaction and exits cleanly on SIGTERM",
  { skip: enabled ? false : "Disposable local PostgreSQL required" },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    assert.ok(
      ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
        url.pathname.startsWith("/easygas_test") &&
        !process.env.DATABASE_URL,
    );
    const name = "easygas_test_worker_" + id().replaceAll("-", ""),
      admin = new Pool({ connectionString: url.toString(), max: 1 });
    await admin.query(`CREATE DATABASE ${name}`);
    url.pathname = "/" + name;
    const pool = new Pool({
      connectionString: url.toString(),
      max: 1,
      options: "-c search_path=easygas_private,pg_catalog",
    });
    const { spawn } = await import("node:child_process");
    let child: ReturnType<typeof spawn> | undefined;
    try {
      await pool.query(await readFile("database/bootstrap.sql", "utf8"));
      await pool.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Fixture Worker Owner',$2,'invalid-non-login-fixture','owner','lagos')",
        [id(), id() + "@fixture.example.test"],
      );
      child = spawn(
        process.execPath,
        ["--import", "tsx", "scripts/worker.ts", "--watch"],
        {
          env: {
            ...process.env,
            DATABASE_URL: url.toString(),
            EASYGAS_BACKGROUND_JOBS: "false",
            EASYGAS_EMAIL_ENABLED: "false",
            EASYGAS_REWARDS_ISSUANCE_ENABLED: "false",
            EASYGAS_REWARDS_REDEMPTION_ENABLED: "false",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      const exit = new Promise<number | null>((resolve, reject) => {
        child!.once("exit", resolve);
        child!.once("error", reject);
      });
      let completed = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        if (
          (
            await pool.query(
              "SELECT count(*)::int n FROM job_runs WHERE status='completed'",
            )
          ).rows[0].n
        ) {
          completed = true;
          break;
        }
        if (child.exitCode !== null) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.equal(completed, true);
      child.kill("SIGTERM");
      const code = await Promise.race([
        exit,
        new Promise((_, reject) => {
          const timer = setTimeout(
            () => reject(new Error("Worker did not shut down")),
            5000,
          );
          timer.unref();
        }),
      ]);
      assert.equal(code, 0);
      assert.equal(
        (
          await pool.query(
            "SELECT count(*)::int n FROM job_runs WHERE status='completed'",
          )
        ).rows[0].n,
        1,
      );
    } finally {
      if (child && child.exitCode === null) {
        child.kill("SIGKILL");
        await new Promise((r) => child!.once("exit", r));
      }
      await pool.end();
      await admin.query(`DROP DATABASE ${name}`);
      await admin.end();
    }
  },
);
