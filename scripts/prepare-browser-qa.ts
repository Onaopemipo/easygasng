// Explicitly isolated local browser test fixture. Never points at the business database.
import { createDatabase, migrate, one, root } from "../apps/web/lib/db";
import { hashPassword, id } from "../apps/web/lib/auth";
import path from "node:path";
if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL)
  throw new Error(
    "Browser QA must use its isolated local development database.",
  );
const db = await createDatabase(path.join(root, ".data/browser-qa"));
await migrate(db);
const email = "browser-qa@example.test";
if (!(await one(db, "SELECT id FROM users WHERE email=$1", [email])))
  await db.query(
    "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,'Browser QA Owner',$2,$3,'owner','lagos')",
    [id(), email, hashPassword("Browser-QA-only-123!")],
  );
console.log(
  "Isolated browser QA account prepared. No business database was modified.",
);
process.exit(0);
