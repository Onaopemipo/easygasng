import "./environment";
import { secret } from "./prompts";
import { readFile, stat } from "node:fs/promises";
import {
  createPostgresBackup,
  verifyPostgresBackup,
  restorePostgresBackup,
} from "../apps/web/lib/postgres-backup";
const [mode, file] = process.argv.slice(2);
if (!file || !["create", "verify", "restore"].includes(mode))
  throw new Error(
    "Usage: npm run backup:postgres -- create|verify|restore <file>. Restore requires EASYGAS_RESTORE_URL and EASYGAS_RESTORE_CONFIRM.",
  );
let passphrase: string;
if (process.env.EASYGAS_BACKUP_KEY_FILE) {
  const info = await stat(process.env.EASYGAS_BACKUP_KEY_FILE);
  if ((info.mode & 0o077) !== 0 || !info.isFile())
    throw new Error("Backup key file must be private (0600 or 0400).");
  passphrase = (
    await readFile(process.env.EASYGAS_BACKUP_KEY_FILE, "utf8")
  ).trim();
} else passphrase = await secret("Backup passphrase (16+ characters): ");
try {
  let result;
  if (mode === "create") {
    if (!process.env.DATABASE_URL)
      throw new Error("Configure a dedicated backup database identity.");
    result = await createPostgresBackup(
      process.env.DATABASE_URL,
      file,
      passphrase,
    );
  } else if (mode === "verify")
    result = await verifyPostgresBackup(file, passphrase);
  else
    result = await restorePostgresBackup(
      file,
      passphrase,
      process.env.EASYGAS_RESTORE_URL ?? "",
      process.env.EASYGAS_RESTORE_CONFIRM ?? "",
    );
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Backup operation failed.",
  );
  process.exitCode = 1;
}
