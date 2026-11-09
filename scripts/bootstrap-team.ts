import "./environment";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { hashPassword, id } from "../apps/web/lib/auth";
import { prompt, secret } from "./prompts";
// Installation trust boundary: this command can run once, before any staff account exists.
// It is not an alternative route for later staff permission changes.
console.log(
  "Initial EasyGas team setup. Use three distinct authorised people: owner, branch manager and finance officer. Existing staff installations must use the governed access workflow.",
);
const records: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
}[] = [];
for (const role of ["owner", "manager", "finance"]) {
  console.log(`\n${role.toUpperCase()} ACCOUNT`);
  const name = (await prompt("Full name: ")).trim(),
    email = (await prompt("Email: ")).trim().toLowerCase(),
    password = await secret("Password (hidden, at least 12 characters): ");
  if (
    name.length < 2 ||
    !/^\S+@\S+\.\S+$/.test(email) ||
    password.length < 12 ||
    password.length > 128
  )
    throw new Error("Invalid account details. No accounts were created.");
  records.push({
    id: id(),
    name,
    email,
    passwordHash: hashPassword(password),
    role,
  });
}
if (new Set(records.map((r) => r.email)).size !== 3)
  throw new Error("The initial team must use three distinct accounts.");
const db = await createDatabase();
await migrate(db);
await db.transaction(async (tx) => {
  await tx.query("LOCK TABLE users IN EXCLUSIVE MODE");
  if (
    await one(
      tx,
      "SELECT id FROM users WHERE role NOT IN ('customer','commercial')",
    )
  )
    throw new Error(
      "Staff already exist. Initial setup is closed; use the governed access workflow.",
    );
  for (const r of records) {
    if (await one(tx, "SELECT id FROM users WHERE email=$1", [r.email]))
      throw new Error(
        "An account with this email already exists. No accounts were created.",
      );
    await tx.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id,verified) VALUES ($1,$2,$3,$4,$5,'lagos',true)",
      [r.id, r.name, r.email, r.passwordHash, r.role],
    );
    await tx.query(
      "INSERT INTO audit_events(id,actor_id,action,target,outcome,detail) VALUES ($1,NULL,'installation.staff_provisioned',$2,'success',$3)",
      [
        id(),
        r.id,
        JSON.stringify({
          role: r.role,
          method: "trusted installation operator",
        }),
      ],
    );
  }
});
console.log(
  "Initial team created. Each person can sign in with their own account. Restricted changes continue to require two independent approvers.",
);
process.exit(0);
