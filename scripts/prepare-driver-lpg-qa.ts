// Isolated, synthetic missing-custody scenario only. Never targets hosted data.
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bulkFixture } from "../tests/helpers/bulk-lpg-fixture";
import { createDatabase } from "../apps/web/lib/db";
import { id } from "../apps/web/lib/auth";
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw new Error("Local synthetic QA only");
const dir = await mkdtemp(join(tmpdir(), "easygas-driver-lpg-"));
const db = await createDatabase(join(dir, "db"));
const f = await bulkFixture(db);
try {
  for (const role of ["owner", "driver", "inventory", "customer"])
    await db.query(
      "UPDATE users SET email=$1,name=$2,verified=true WHERE id=$3",
      [role + "@lpg-qa.example.test", "Synthetic " + role, f.actors[role].id],
    );
  await db.exec(
    "UPDATE settings SET value=jsonb_set(value,'{requiresAddressConfirmation}','false') WHERE key LIKE 'location.%'",
  );
  await f.call("owner", "invoice.issue", { orderId: f.order.id });
  // Disposable legacy arrival replicates the old deployed workflow; it is not new physical evidence.
  await db.query(
    "UPDATE orders SET status='out_for_delivery',payment_method='card',payment_status='verified' WHERE id=$1",
    [f.order.id],
  );
  await db.query(
    "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) SELECT $1,id,$1,total_kobo,'synthetic_test',$2 FROM orders WHERE id=$3",
    [id(), f.actors.owner.id, f.order.id],
  );
  await db.query(
    "INSERT INTO delivery_attempts(id,order_id,driver_id,assignment_version,state,picked_up_at,arrived_at) VALUES($1,$2,$3,1,'arrived',now()-interval '5 minutes',now())",
    [id(), f.order.id, f.actors.driver.id],
  );
  await f.call("dispatcher", "technician.qualify", {
    userId: f.actors.owner.id,
    code: "cylinder_inspection",
    evidence: "Synthetic inspector qualification only",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  });
  const extra = await f.make();
  await f.transition(extra, "accepted");
  await f.transition(extra, "preparing");
  const line = id();
  await db.query(
    "INSERT INTO order_gas_lines(id,order_id,capacity_grams,grams,unit_price_kobo,subtotal_kobo,pricing_version) VALUES($1,$2,6000,6000,180000,1080000,1)",
    [line, extra.id],
  );
  const details = {
    db: join(dir, "db"),
    reference: f.order.reference,
    orderId: f.order.id,
    inspectionOrder: extra.reference,
    password: "Tracking-fixture-only-123!",
    driver: "driver@lpg-qa.example.test",
    owner: "owner@lpg-qa.example.test",
    finance: "inventory@lpg-qa.example.test",
  };
  await writeFile(
    ".data/driver-lpg-qa.json",
    JSON.stringify(details, null, 2) + "\n",
  );
  console.log("Prepared isolated driver LPG QA fixture at " + dir);
} finally {
  await db.close?.();
}
