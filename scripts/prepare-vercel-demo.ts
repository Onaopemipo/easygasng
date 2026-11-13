import { consolidatedRole } from "../packages/business-rules/src/staff-roles";
// Explicit temporary demo provisioning. Only the new dedicated Neon resource is allowed.
// Secret input/output are files outside the upload, never command arguments or logs.
import { readFile, writeFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { hashPassword, id } from "../apps/web/lib/auth";
const secretFile = process.env.EASYGAS_DEMO_ENV_FILE,
  output = process.env.EASYGAS_DEMO_CREDENTIAL_FILE;
if (
  !secretFile?.startsWith("/tmp/easygas-") ||
  !output?.startsWith("/tmp/easygas-") ||
  process.env.EASYGAS_DEMO_PROVISION !== "easygas-client-demo-db"
)
  throw Error("Explicit isolated demo provisioning required");
process.loadEnvFile(secretFile);
const adminUrl = new URL(
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!,
);
if (!adminUrl.hostname.endsWith(".neon.tech") || !process.env.NEON_PROJECT_ID)
  throw Error("Dedicated Neon demo required");
adminUrl.searchParams.set("sslmode", "verify-full");
adminUrl.searchParams.delete("channel_binding");
process.env.DATABASE_URL = String(adminUrl);
process.env.NODE_ENV = "production";
process.env.EASYGAS_BACKGROUND_JOBS = "false";
const db = await createDatabase();
try {
  const current = await one(
    db,
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name='easygas_private'",
  );
  if (current)
    throw Error(
      "Refusing to bootstrap an existing schema; inspect retained demo before rerunning",
    );
  await migrate(db);
  const accounts = [
    "owner",
    "manager",
    "finance",
    "inventory",
    "dispatcher",
    "sales",
    "driver",
    "technician",
    "service_manager",
    "safety_officer",
    "customer",
  ].map((role) => ({
    role,
    email: `${role}@demo.easygas.invalid`,
    password: "Eg!" + randomBytes(18).toString("base64url"),
  }));
  await db.transaction(async (tx) => {
    for (const a of accounts) {
      const uid = id();
      await tx.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id,verified) VALUES($1,$2,$3,$4,$5,'lagos',true)",
        [
          uid,
          `Demo ${a.role.replaceAll("_", " ")}`,
          a.email,
          hashPassword(a.password),
          consolidatedRole(a.role),
        ],
      );
      await tx.query(
        "INSERT INTO audit_events(id,action,target,outcome,detail) VALUES($1,'vercel_demo.account_created',$2,'success',$3)",
        [
          id(),
          uid,
          JSON.stringify({ synthetic: true, purpose: "temporary-client-demo" }),
        ],
      );
    }
  });
  const runtimePassword = randomBytes(32).toString("base64url");
  await db.exec(
    `CREATE ROLE easygas_demo_runtime LOGIN PASSWORD '${runtimePassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOBYPASSRLS`,
  );
  await db.exec(
    "GRANT easygas_server TO easygas_demo_runtime WITH INHERIT TRUE",
  );
  await db.exec("GRANT easygas_server TO easygas_demo_runtime WITH SET FALSE");
  // INHERIT is needed for the trusted server group policies; runtime never owns schemas/tables.
  await db.exec("ALTER ROLE easygas_demo_runtime INHERIT");
  const runtimeUrl = new URL(adminUrl);
  runtimeUrl.username = "easygas_demo_runtime";
  runtimeUrl.password = runtimePassword;
  const manifest = {
    purpose: "isolated-vercel-client-demo",
    project: "easygas-client-demo",
    neonProjectId: process.env.NEON_PROJECT_ID,
    accounts,
    runtimeUrl: String(runtimeUrl),
  };
  await writeFile(output, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  await chmod(output, 0o600);
  console.log(
    "Dedicated demo migrated; synthetic accounts created; restricted runtime configured. Credentials saved privately.",
  );
} finally {
  await db.close?.();
}
