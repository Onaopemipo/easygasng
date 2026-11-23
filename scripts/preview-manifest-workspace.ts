// Disposable, loopback-only actual Next.js UI and API acceptance. Never uses hosted data.
import next from "next";
import { createServer } from "node:http";
import { mkdtemp, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDatabase } from "../apps/web/lib/db";
import { vehicleFixture } from "../tests/helpers/vehicle-products-fixture";
import { hashPassword, id, issueSession } from "../apps/web/lib/auth";
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw Error("Local synthetic fixture only");
const dir = await mkdtemp(join(tmpdir(), "easygas-manifest-ui-"));
const db = await createDatabase(join(dir, "db"));
const f = await vehicleFixture(db);
const password = "Synthetic-fleet-ui-only-123!";
for (const role of [
  "owner",
  "manager",
  "finance",
  "driver",
  "customer",
  "commercial",
  "technician",
]) {
  const existing = (
    await db.query("SELECT id FROM users WHERE role=$1 LIMIT 1", [role])
  ).rows[0];
  const uid = existing?.id ?? id();
  if (!existing)
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id,verified) VALUES($1,$2,$3,$4,$5,'lagos',true)",
      [
        uid,
        "Synthetic " + role,
        role + "@fleet-ui.example.test",
        hashPassword(password),
        role,
      ],
    );
  else
    await db.query(
      "UPDATE users SET name=$1,email=$2,password_hash=$3,verified=true WHERE id=$4",
      [
        "Synthetic " + role,
        role + "@fleet-ui.example.test",
        hashPassword(password),
        uid,
      ],
    );
  if (role === "owner")
    f.actors.owner = { id: uid, token: await issueSession(db, uid) };
  if (role === "driver")
    f.actors.driver = { id: uid, token: await issueSession(db, uid) };
}
await f.call("owner", "reauth", { password });
await db.query(
  "UPDATE inventory SET quantity=100,reserved=0,published=true WHERE product_id='hose' AND branch_id='lagos'",
);
for (let i = 0; i < 13; i++) {
  const load = await f.run("inventory", "manifest.issue", {
    tripId: f.trip.id,
    productId: "hose",
    quantity: 1,
    unitWeightGrams: 500,
    evidence: "Synthetic measured hose package only",
    reason: "Synthetic manifest layout acceptance",
  });
  if (i < 2)
    await f.run("driver", "manifest.acknowledge", {
      manifestId: load.id,
      version: 1,
      quantity: 1,
      serialIds: [],
      evidence: "Synthetic independent receipt counted",
      reason: "Synthetic manifest layout acceptance",
    });
  if (i === 0)
    await f.run("driver", "manifest.return.declare", {
      manifestId: load.id,
      version: 2,
      quantity: 1,
      serialIds: [],
      evidence: "Synthetic measured return count only",
      reason: "Synthetic manifest layout acceptance",
    });
}
await db.close?.();
await unlink(join(dir, "db.lock"));
process.env.EASYGAS_DATA_DIR = join(dir, "db");
process.env.EASYGAS_CLIENT_DEMO = "true";
const app = next({
  dev: true,
  hostname: "127.0.0.1",
  port: 3132,
  dir: "apps/web",
  conf: {
    distDir: ".next-manifest-ui",
    serverExternalPackages: ["@electric-sql/pglite", "pg"],
  },
});
await app.prepare();
if (process.env.DATABASE_URL) throw Error("Local fixture only");
await writeFile(
  ".data/manifest-ui-qa.json",
  JSON.stringify({ dir, password, email: "owner@fleet-ui.example.test" }),
  { mode: 0o600 },
);
createServer(app.getRequestHandler()).listen(3132, "127.0.0.1", () =>
  console.log("Synthetic fleet UI ready: http://127.0.0.1:3132/login"),
);
