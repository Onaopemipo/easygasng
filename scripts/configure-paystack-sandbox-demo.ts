// Explicitly authorised synthetic requester and governed Paystack demo policy.
// No real accounts, live keys, production policy overrides or approval-rule edits.
import { readFile, writeFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { createDatabase, one } from "../apps/web/lib/db";
import { hashPassword, id } from "../apps/web/lib/auth";
if (process.env.EASYGAS_SANDBOX_REQUESTER !== "authorised-20261109")
  throw Error("Explicit sandbox requester authorisation required");
const file = "/tmp/easygas-vercel-demo-credentials.json";
const manifest = JSON.parse(await readFile(file, "utf8"));
if (manifest.project !== "easygas-client-demo" || manifest.purpose !== "isolated-vercel-client-demo")
  throw Error("Isolated demo only");
const url = new URL(manifest.runtimeUrl);
if (!url.hostname.endsWith(".neon.tech") || url.username !== "easygas_demo_runtime")
  throw Error("Restricted isolated demo runtime required");
process.env.DATABASE_URL = manifest.runtimeUrl;
process.env.NODE_ENV = "production";
const db = await createDatabase();
try {
  let account = manifest.accounts.find((a: any) => a.role === "sandbox_finance_requester");
  if (!account) {
    account = { role: "sandbox_finance_requester", email: "sandbox-finance-requester@demo.easygas.invalid", password: "Eg!" + randomBytes(24).toString("base64url") };
    // Save privately first so interrupted execution cannot strand an unknown password.
    manifest.accounts.push(account);
    await writeFile(file, JSON.stringify(manifest, null, 2), { mode: 0o600 });
    await chmod(file, 0o600);
  }
  await db.transaction(async tx => {
    if (await one(tx, "SELECT id FROM users WHERE email=$1", [account.email])) return;
    const uid = id();
    await tx.query("INSERT INTO users(id,name,email,password_hash,role,branch_id,verified) VALUES($1,$2,$3,$4,'finance','lagos',true)", [uid, "SANDBOX ONLY — Finance requester", account.email, hashPassword(account.password)]);
    await tx.query("INSERT INTO audit_events(id,action,target,outcome,detail) VALUES($1,'vercel_demo.account_created',$2,'success',$3)", [id(), uid, JSON.stringify({synthetic:true,purpose:"user-authorised-paystack-sandbox-requester",authority:"User approved additional sandbox-only test account 2026-11-09",productionAccess:false})]);
  });
  console.log("PASS authorised labelled sandbox-only requester exists; credentials saved privately; no existing identities changed");
} finally { await db.close?.(); }
