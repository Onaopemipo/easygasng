// Isolated synthetic UI fixture. Never connects to a working or hosted database.
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDatabase } from "../apps/web/lib/db";
import { fixture } from "../tests/helpers/order-tracking-fixture";
import { id } from "../apps/web/lib/auth";
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw new Error("Local QA only");
const dir = await mkdtemp(join(tmpdir(), "easygas-customer-orders-"));
const f = await fixture(await createDatabase(join(dir, "db")));
try {
  await f.db.query(
    "UPDATE users SET name='Orders QA customer',email='customer@orders-qa.example.test' WHERE id=$1",
    [f.actors.customer.id],
  );
  await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
  const states = [
    "placed",
    "out_for_delivery",
    "delivered",
    "cancelled",
    "preparing",
    "delivered",
    "placed",
    "accepted",
  ];
  for (const [index, status] of states.entries()) {
    const order = await f.make();
    // Deliberate direct fixture states; no claim of executing physical fulfilment.
    await f.db.query(
      "UPDATE orders SET reference=$1,status=$2,payment_status=$3,delivery_date=$4,delivery_window='09:00–12:00' WHERE id=$5",
      [
        `EG-2026-QA${String(index + 1).padStart(6, "0")}`,
        status,
        index === 0 ? "unpaid" : "verified",
        index === 1 ? "2026-11-18" : "2026-11-21",
        order.id,
      ],
    );
    await f.db.query(
      "INSERT INTO order_gas_lines(id,order_id,capacity_grams,grams,unit_price_kobo,subtotal_kobo,pricing_version) VALUES($1,$2,12500,6000,80,480000,1)",
      [id(), order.id],
    );
    await f.db.query(
      "UPDATE orders SET subtotal_kobo=subtotal_kobo+480000,total_kobo=total_kobo+480000 WHERE id=$1",
      [order.id],
    );
    if (index !== 0)
      await f.db.query(
        "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) SELECT $1,id,$1,total_kobo,'synthetic_qa',$3 FROM orders WHERE id=$2",
        [id(), order.id, f.actors.owner.id],
      );
    await f.db.query(
      "INSERT INTO order_events(id,order_id,status,note,actor_id) VALUES($1,$2,$3,'Synthetic UI fixture',$4)",
      [id(), order.id, status, f.actors.owner.id],
    );
    if (status !== "cancelled")
      await f.call("owner", "invoice.issue", { orderId: order.id });
  }
  await writeFile(
    ".data/customer-orders-qa.json",
    JSON.stringify({
      db: join(dir, "db"),
      email: "customer@orders-qa.example.test",
      password: "Tracking-fixture-only-123!",
    }),
  );
  console.log(
    "Prepared 8 synthetic customer orders, invoices and states. Private fixture config in .data/customer-orders-qa.json.",
  );
} finally {
  await f.db.close?.();
}
