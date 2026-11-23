// Disposable, loopback-only actual Next.js UI and API acceptance. Never uses hosted data.
import next from "next";
import { createServer } from "node:http";
import { mkdtemp, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDatabase } from "../apps/web/lib/db";
import { fixture } from "../tests/helpers/order-tracking-fixture";
import { hashPassword, id, issueSession } from "../apps/web/lib/auth";
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw Error("Local synthetic fixture only");
const dir = await mkdtemp(join(tmpdir(), "easygas-fleet-ui-"));
const db = await createDatabase(join(dir, "db"));
const f = await fixture(db);
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
const vehicles = [];
for (let i = 1; i <= 3; i++)
  vehicles.push(
    await f.call("owner", "fleet.vehicle.create", {
      operationKey: id(),
      branchId: "lagos",
      label: `SYNTHETIC QA · VAN 0${i}`,
      capacityGrams: 200000,
      physicalCapacityGrams: 500000,
      lpgSuitable: i !== 3,
      estimatedLitresPer100km: 12,
    }),
  );
for (let i = 0; i < 14; i++) {
  const trip = await f.call("driver", "trip.start", {
    operationKey: id(),
    vehicleId: vehicles[i % 2].id,
    startOdometer: 100 + i * 20,
    locationConsent: false,
  });
  if (i === 0)
    await f.call("driver", "trip.sync", {
      operationKey: id(),
      tripId: trip.id,
      events: [
        {
          id: id(),
          sequence: 1,
          kind: "fuel",
          recordedAt: new Date().toISOString(),
          payload: {
            litres: 10,
            costKobo: 1100000,
            receipt: "SYNTHETIC-FUEL-001",
          },
        },
      ],
    });
  await f.call("driver", "trip.end", {
    operationKey: id(),
    tripId: trip.id,
    endOdometer: 115 + i * 20,
  });
}
await f.call("driver", "trip.start", {
  operationKey: id(),
  vehicleId: vehicles[0].id,
  startOdometer: 400,
  locationConsent: false,
});
await db.close?.();
await unlink(join(dir, "db.lock"));
process.env.EASYGAS_DATA_DIR = join(dir, "db");
process.env.EASYGAS_CLIENT_DEMO = "true";
const app = next({
  dev: true,
  hostname: "127.0.0.1",
  port: 3131,
  dir: "apps/web",
  conf: {
    distDir: ".next-fleet-ui",
    serverExternalPackages: ["@electric-sql/pglite", "pg"],
  },
});
await app.prepare();
if (process.env.DATABASE_URL) throw Error("Local fixture only");
await writeFile(
  ".data/fleet-ui-qa.json",
  JSON.stringify({ dir, password, email: "owner@fleet-ui.example.test" }),
  { mode: 0o600 },
);
createServer(app.getRequestHandler()).listen(3131, "127.0.0.1", () =>
  console.log("Synthetic fleet UI ready: http://127.0.0.1:3131/login"),
);
