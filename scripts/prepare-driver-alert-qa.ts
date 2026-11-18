import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture } from "../tests/helpers/order-tracking-fixture";
import { createDatabase } from "../apps/web/lib/db";
import { id } from "../apps/web/lib/auth";
const dir = await mkdtemp(join(tmpdir(), "easygas-driver-alert-"));
const f = await fixture(await createDatabase(join(dir, "db")));
try {
  for (const [role, a] of Object.entries(f.actors))
    await f.db.query("UPDATE users SET name=$1,email=$2 WHERE id=$3", [
      "Alert QA " + role,
      role + "@driver-alert.example.test",
      a.id,
    ]);
  await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
  const vehicle = await f.call("owner", "fleet.vehicle.create", {
    branchId: "lagos",
    label: "SYNTHETIC ALERT QA VEHICLE",
    capacityGrams: 50000,
    lpgSuitable: true,
    operationKey: id(),
  });
  await f.call("driver", "trip.start", {
    vehicleId: vehicle.id,
    startOdometer: 10,
    locationConsent: false,
    operationKey: id(),
  });
  const o = await f.make();
  await f.transition(o, "accepted");
  await f.transition(o, "preparing");
  await writeFile(
    ".data/driver-alert-qa.json",
    JSON.stringify({
      db: join(dir, "db"),
      orderId: o.id,
      reference: o.reference,
      ownerEmail: "owner@driver-alert.example.test",
      driverEmail: "driver@driver-alert.example.test",
      password: "Tracking-fixture-only-123!",
    }),
  );
  console.log(
    "Prepared isolated synthetic assignment alert fixture. Private account details in ignored .data/driver-alert-qa.json. Order remains Preparing for an actual owner UI assignment.",
  );
} finally {
  await f.db.close?.();
}
