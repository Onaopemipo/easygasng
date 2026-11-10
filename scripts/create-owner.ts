import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from "../packages/business-rules/src/password-policy";
import "./environment";
import { prompt, secret } from "./prompts";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { hashPassword, id } from "../apps/web/lib/auth";
// Password is accepted through stdin only; never pass it in shell arguments.
const name = await prompt("Owner name: "),
  email = (await prompt("Owner email: ")).trim().toLowerCase();
const password = await secret(`Password (hidden, at least ${PASSWORD_MIN_LENGTH} characters): `);
if (
  !name.trim() ||
  !/^\S+@\S+\.\S+$/.test(email) ||
  password.length < PASSWORD_MIN_LENGTH ||
  password.length > PASSWORD_MAX_LENGTH
)
  throw new Error("Invalid account details.");
const db = await createDatabase();
await migrate(db);
await db.transaction(async (tx) => {
  await tx.query("LOCK TABLE users IN EXCLUSIVE MODE");
  if (await one(tx, "SELECT id FROM users WHERE role='owner'"))
    throw new Error(
      "An owner already exists. Use the governed staff access workflow.",
    );
  await tx.query(
    "INSERT INTO users(id,name,email,password_hash,role,branch_id,verified) VALUES ($1,$2,$3,$4,'owner','lagos',true)",
    [id(), name, email, hashPassword(password)],
  );
});
console.log("Owner account created. Sign in to configure your business.");
process.exit(0);
