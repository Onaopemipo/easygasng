// Explicit, isolated local fixture; never provisions users in business/hosted data.
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, chmod, access } from "node:fs/promises";
import path from "node:path";
import { createDatabase, migrate, one, root } from "../apps/web/lib/db";
import { hashPassword, id, passwordMatches } from "../apps/web/lib/auth";
if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL)
  throw new Error(
    "Local demo only; hosted database configuration is forbidden.",
  );
const directory = path.join(root, ".data/mobile-demo-accounts");
const credentialsPath = path.join(root, ".data/mobile-demo-credentials.json");
const roles = [
  "owner",
  "manager",
  "finance",
  "sales",
  "inventory",
  "dispatcher",
  "driver",
  "technician",
  "customer",
];
let credentials: any;
try {
  credentials = JSON.parse(await readFile(credentialsPath, "utf8"));
} catch (e: any) {
  if (e.code !== "ENOENT") throw e;
}
if (
  credentials &&
  (credentials.purpose !== "isolated-mobile-demo" ||
    credentials.database !== directory)
)
  throw new Error("Unexpected credential manifest; no changes made.");
await mkdir(directory, { recursive: true, mode: 0o700 });
await chmod(directory, 0o700);
const db = await createDatabase(directory);
try {
  await migrate(db);
  if (credentials) {
    for (const a of credentials.accounts) {
      const u = await one(
        db,
        "SELECT role,password_hash FROM users WHERE email=$1",
        [a.email],
      );
      if (
        !u ||
        u.role !== a.role ||
        !passwordMatches(a.password, u.password_hash)
      )
        throw new Error(
          "Demo credentials no longer match. Existing passwords were not changed.",
        );
    }
  } else {
    if (Number((await one(db, "SELECT count(*) AS n FROM users"))!.n) !== 0)
      throw new Error(
        "Existing users found without a demo manifest. Refusing to reset or overwrite accounts.",
      );
    const accounts = roles.map((role) => ({
      role,
      email: `${role}@demo.easygas.invalid`,
      password: "Eg!" + randomBytes(18).toString("base64url"),
    }));
    await db.transaction(async (tx) => {
      for (const a of accounts) {
        const uid = id();
        await tx.query(
          "INSERT INTO users(id,name,email,password_hash,role,branch_id,verified) VALUES($1,$2,$3,$4,$5,'lagos',true)",
          [uid, `Demo ${a.role}`, a.email, hashPassword(a.password), a.role],
        );
        await tx.query(
          "INSERT INTO audit_events(id,action,target,outcome,detail) VALUES($1,'local_demo.account_created',$2,'success',$3)",
          [
            id(),
            uid,
            JSON.stringify({
              role: a.role,
              environment: "isolated local demo",
            }),
          ],
        );
      }
    });
    credentials = {
      purpose: "isolated-mobile-demo",
      database: directory,
      accounts,
    };
    await writeFile(
      credentialsPath,
      JSON.stringify(credentials, null, 2) + "\n",
      { mode: 0o600, flag: "wx" },
    );
    await chmod(credentialsPath, 0o600);
  }
  console.log(
    "Isolated demo accounts ready. Protected credentials: .data/mobile-demo-credentials.json. No business database or existing password was changed.",
  );
} finally {
  await db.close?.();
}
