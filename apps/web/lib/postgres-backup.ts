import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdtemp,
  chmod,
  readFile,
  writeFile,
  rm,
  stat,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { encryptBackup, decryptBackup } from "./backups";
const exec = promisify(execFile);
const maxArchiveBytes = 512 * 1024 * 1024;
export function postgresTarget(value: string) {
  const url = new URL(value);
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.pathname.length < 2 ||
    url.hash
  )
    throw new Error("A PostgreSQL database URL is required.");
  return { url, name: decodeURIComponent(url.pathname.slice(1)) };
}
async function temporary<T>(fn: (archive: string) => Promise<T>) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "easygas-backup-"));
  await chmod(dir, 0o700);
  try {
    return await fn(path.join(dir, "archive.dump"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
async function pgTool(tool: string, args: string[], databaseUrl?: string) {
  const connection: Record<string, string | undefined> = {};
  if (databaseUrl) {
    const { url, name } = postgresTarget(databaseUrl);
    Object.assign(connection, {
      PGHOST: url.hostname.replace(/^\[|\]$/g, ""),
      PGPORT: url.port || "5432",
      PGDATABASE: name,
      PGCONNECT_TIMEOUT: "5",
    });
    if (url.username) connection.PGUSER = decodeURIComponent(url.username);
    if (url.password) connection.PGPASSWORD = decodeURIComponent(url.password);
    for (const [param, variable] of Object.entries({
      sslmode: "PGSSLMODE",
      sslrootcert: "PGSSLROOTCERT",
      sslcert: "PGSSLCERT",
      sslkey: "PGSSLKEY",
    }))
      if (url.searchParams.has(param))
        connection[variable] = url.searchParams.get(param)!;
  }
  try {
    // Credentials stay in child environment, never in argv/logs. No shell is invoked.
    await exec(
      tool,
      tool === "pg_restore" && databaseUrl
        ? ["--dbname", postgresTarget(databaseUrl).name, ...args]
        : args,
      {
        env: {
          ...process.env,
          ...connection,
        },
        timeout: 300000,
        maxBuffer: 1024 * 1024,
      },
    );
  } catch {
    throw new Error(
      "PostgreSQL backup tool failed. Check tool compatibility and protected database configuration; credentials are not logged.",
    );
  }
}
export async function createPostgresBackup(
  databaseUrl: string,
  destination: string,
  passphrase: string,
) {
  const { name } = postgresTarget(databaseUrl);
  return temporary(async (archive) => {
    await pgTool(
      "pg_dump",
      [
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--schema=easygas_private",
        "--file",
        archive,
      ],
      databaseUrl,
    );
    if ((await stat(archive)).size > maxArchiveBytes)
      throw new Error(
        "Backup exceeds the bounded local archive size; use managed streaming backup tooling.",
      );
    const bytes = await readFile(archive);
    const envelope = Buffer.from(
      JSON.stringify({
        format: "easygas-postgres-v1",
        sourceDatabase: name,
        createdAt: new Date().toISOString(),
        sha256: createHash("sha256").update(bytes).digest("hex"),
        archive: bytes.toString("base64"),
      }),
    );
    await writeFile(destination, encryptBackup(envelope, passphrase), {
      flag: "wx",
      mode: 0o600,
    });
    return { bytes: bytes.length, created: true };
  });
}
async function openBackup(file: string, passphrase: string) {
  if ((await stat(file)).size > maxArchiveBytes * 1.5)
    throw new Error("Backup exceeds size limit.");
  const envelope = JSON.parse(
    decryptBackup(await readFile(file), passphrase).toString(),
  );
  if (
    envelope.format !== "easygas-postgres-v1" ||
    typeof envelope.sourceDatabase !== "string" ||
    typeof envelope.archive !== "string"
  )
    throw new Error("Unsupported backup format.");
  const archive = Buffer.from(envelope.archive, "base64");
  if (
    !archive.length ||
    createHash("sha256").update(archive).digest("hex") !== envelope.sha256
  )
    throw new Error("Backup integrity check failed.");
  return { archive, sourceDatabase: envelope.sourceDatabase };
}
export async function verifyPostgresBackup(file: string, passphrase: string) {
  const data = await openBackup(file, passphrase);
  return temporary(async (archive) => {
    await writeFile(archive, data.archive, { mode: 0o600 });
    await pgTool("pg_restore", ["--list", archive]);
    return { authenticated: true, archiveReadable: true, restored: false };
  });
}
export async function restorePostgresBackup(
  file: string,
  passphrase: string,
  targetUrl: string,
  confirmation: string,
) {
  const { name } = postgresTarget(targetUrl);
  if (!/^easygas_restore_[a-z0-9_]+$/.test(name) || confirmation !== name)
    throw new Error(
      "Confirm a dedicated easygas_restore_* target database. Active databases are never overwritten.",
    );
  const data = await openBackup(file, passphrase);
  if (name === data.sourceDatabase)
    throw new Error("Restore target must differ from source database.");
  const pool = new Pool({
    connectionString: targetUrl,
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  try {
    const result = await pool.query(
      "SELECT count(*)::int n FROM pg_namespace WHERE nspname NOT IN ('public','information_schema') AND nspname NOT LIKE 'pg_%'",
    );
    const objects = await pool.query(
      "SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'",
    );
    if (Number(result.rows[0].n) || Number(objects.rows[0].n))
      throw new Error("Restore target is not empty.");
    await temporary(async (archive) => {
      await writeFile(archive, data.archive, { mode: 0o600 });
      await pgTool(
        "pg_restore",
        [
          "--exit-on-error",
          "--single-transaction",
          "--no-owner",
          "--no-privileges",
          archive,
        ],
        targetUrl,
      );
    });
    const versions = (
      await pool.query(
        "SELECT version FROM easygas_private.schema_migrations ORDER BY version",
      )
    ).rows.map((r) => r.version);
    return {
      restored: true,
      versions,
      note: "Isolated restore only. Runtime grants and reconciliation require separate acceptance before use.",
    };
  } finally {
    await pool.end();
  }
}
