import "./environment";
import { writeFile, mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { getDb } from "../apps/web/lib/db";
import { encryptBackup, decryptBackup } from "../apps/web/lib/backups";
import { secret } from "./prompts";
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw new Error(
    "This command backs up local embedded PostgreSQL only. Managed PostgreSQL requires provider backups and a separately tested restore process.",
  );
const [mode, file, target] = process.argv.slice(2);
if (mode === "create") {
  const db = await getDb();
  if (!db.snapshot) throw new Error("Local snapshot support unavailable.");
  const password = await secret("Backup passphrase (16+ characters): "),
    confirm = await secret("Repeat backup passphrase: ");
  if (password !== confirm) throw new Error("Passphrases do not match.");
  await mkdir(".backups", { recursive: true, mode: 0o700 });
  const destination =
    file ??
    path.join(
      ".backups",
      `easygas-${new Date().toISOString().replaceAll(":", "-")}.egbackup`,
    );
  await writeFile(destination, encryptBackup(await db.snapshot(), password), {
    flag: "wx",
    mode: 0o600,
  });
  await db.close?.();
  console.log(`Encrypted local backup written to ${path.resolve(destination)}`);
} else if (mode === "verify") {
  if (!file) throw new Error("Supply the backup filename.");
  const password = await secret("Backup passphrase: "),
    data = decryptBackup(await readFile(file), password),
    pg = await PGlite.create({ loadDataDir: new Blob([new Uint8Array(data)]) });
  try {
    await pg.query("SELECT version FROM schema_migrations");
    const result = await pg.query("SELECT count(*)::int AS users FROM users");
    console.log(
      "Backup decrypted and opened successfully in an isolated in-memory database.",
      result.rows[0],
    );
  } finally {
    await pg.close();
  }
} else if (mode === "restore") {
  if (!file || !target)
    throw new Error("Supply a backup file and a new, empty restore directory.");
  const destination = path.resolve(target),
    allowed = path.resolve(".data/restores") + path.sep;
  if (!destination.startsWith(allowed))
    throw new Error(
      "Restore targets must be inside .data/restores/. Existing business databases are never overwritten.",
    );
  try {
    if ((await readdir(destination)).length)
      throw new Error("Restore directory is not empty.");
  } catch (error: any) {
    if (error.code !== "ENOENT") throw error;
  }
  const password = await secret("Backup passphrase: "),
    data = decryptBackup(await readFile(file), password);
  await mkdir(destination, { recursive: true, mode: 0o700 });
  const pg = await PGlite.create({
    dataDir: destination,
    loadDataDir: new Blob([new Uint8Array(data)]),
  });
  await pg.query("SELECT version FROM schema_migrations");
  await pg.close();
  console.log(
    `Restored a separate local database at ${destination}. It has not replaced the active database.`,
  );
} else
  throw new Error(
    "Usage: npm run backup -- create [file] | verify <file> | restore <file> .data/restores/<new-name>",
  );
process.exit(0);
