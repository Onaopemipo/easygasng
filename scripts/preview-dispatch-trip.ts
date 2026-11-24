// Disposable loopback-only fixture; never uses a hosted database or real orders.
import next from "next";
import { createServer } from "node:http";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture } from "../tests/helpers/order-tracking-fixture";
import { hashPassword, id } from "../apps/web/lib/auth";
import { lagosDate } from "../packages/business-rules/src/dispatch-centre";
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw Error("Disposable local fixture only");
const dir = await mkdtemp(join(tmpdir(), "easygas-dispatch-trip-")),
  f = await fixture(),
  db = f.db;
const password = "Synthetic-setup-ui-only-123!";
for (const [role, actor] of Object.entries(f.actors))
  await db.query(
    "UPDATE users SET name=$1,email=$2,password_hash=$3,verified=true WHERE id=$4",
    [
      "Synthetic trip " + role,
      role + "@trip-ui.example.test",
      hashPassword(password),
      actor.id,
    ],
  );
await db.query("UPDATE sessions SET verified_at=now() WHERE user_id=$1", [
  f.actors.owner.id,
]);
const v = await f.call("owner", "fleet.vehicle.create", {
  branchId: "lagos",
  label: "SYNTHETIC SETUP VAN",
  capacityGrams: 50000,
  physicalCapacityGrams: 50000,
  lpgSuitable: true,
  operationKey: id(),
});
await db.query("UPDATE users SET driver_available=false WHERE id=$1", [
  f.actors.driver.id,
]);
const busyDriver = id(),
  busyVehicle = id();
await db.query(
  "INSERT INTO users(id,name,email,password_hash,role,branch_id,verified,driver_available) VALUES($1,'Synthetic existing trip driver',$2,$3,'driver','lagos',true,false)",
  [busyDriver, busyDriver + "@trip-ui.example.test", hashPassword(password)],
);
await db.query(
  "INSERT INTO driver_vehicles(id,branch_id,label,capacity_grams,lpg_suitable) VALUES($1,'lagos','SYNTHETIC BUSY VAN',30000,true)",
  [busyVehicle],
);
await db.query(
  "INSERT INTO driver_trips(id,driver_id,vehicle_id,branch_id,start_odometer,location_consent) VALUES($1,$2,$3,'lagos',100,false)",
  [id(), busyDriver, busyVehicle],
);
for (const name of ["A · Synthetic off duty", "B · Synthetic no trip"])
  await db.query(
    "INSERT INTO users(id,name,email,password_hash,role,branch_id,verified,driver_available) VALUES($1,$2,$3,$4,'driver','lagos',true,$5)",
    [
      id(),
      name,
      id() + "@trip-ui.example.test",
      hashPassword(password),
      name.startsWith("B"),
    ],
  );
await f.call("driver", "trip.start", {
  vehicleId: v.id,
  startOdometer: 100,
  locationConsent: false,
  operationKey: id(),
});
await f.call("owner", "fleet.vehicle.create", {
  branchId: "lagos",
  label: "SYNTHETIC REPLACEMENT VAN",
  capacityGrams: 50000,
  lpgSuitable: true,
  operationKey: id(),
});
const blockedTrip = (
  await db.query(
    "SELECT id FROM driver_trips WHERE driver_id=$1 AND ended_at IS NULL",
    [busyDriver],
  )
).rows[0].id;
await db.query(
  "INSERT INTO vehicle_product_loads(id,trip_id,branch_id,product_id,quantity,unit_weight_grams,available,issued_by,evidence) VALUES($1,$2,'lagos','hose',1,500,1,$3,'Synthetic outstanding manifest')",
  [id(), blockedTrip, f.actors.inventory.id],
);
const order = await f.make();
await f.transition(order, "accepted");
await f.transition(order, "preparing");
await db.query("UPDATE orders SET delivery_date=$1 WHERE id=$2", [
  lagosDate(),
  order.id,
]);
(globalThis as any).easygasDb = Promise.resolve(db);
(globalThis as any).easygasLocalVersion = 84;
process.env.EASYGAS_BACKGROUND_JOBS = "false";
process.env.EASYGAS_CLIENT_DEMO = "true";
const app = next({
  dev: true,
  hostname: "127.0.0.1",
  port: 3135,
  dir: "apps/web",
  conf: {
    distDir: ".next-dispatch-trip",
    serverExternalPackages: ["@electric-sql/pglite", "pg"],
  },
});
await app.prepare();
await writeFile(
  ".data/dispatch-trip-qa.json",
  JSON.stringify({
    dir,
    password,
    ownerEmail: "owner@trip-ui.example.test",
    managerEmail: "dispatcher@trip-ui.example.test",
    orderId: order.id,
  }),
  { mode: 0o600 },
);
createServer(app.getRequestHandler()).listen(3135, "127.0.0.1", () =>
  console.log(
    "Synthetic trip QA ready: http://127.0.0.1:3135/admin/deliveries",
  ),
);
