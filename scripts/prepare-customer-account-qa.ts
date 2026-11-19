// Creates only isolated synthetic data. Does not send messages or fulfil orders.
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture } from "../tests/helpers/service-fixture";
import { id, issueSession } from "../apps/web/lib/auth";
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw new Error("Local synthetic QA only");
const dir = await mkdtemp(join(tmpdir(), "easygas-account-"));
const f = await fixture(join(dir, "db"));
try {
  await f.db.query(
    "UPDATE users SET name='Avery Morgan',email='customer@account-qa.example.test',verified=true,delivery_phone='+2348012345678' WHERE id=$1",
    [f.actors.customer.id],
  );
  const profile = await f.call("customer", "account.profile");
  const area = profile.deliveryLocations[0];
  for (const [label, street, building, isDefault] of [
    ["Home", "27 Synthetic Avenue", "27", true],
    ["Office", "8 Example Close", "8", false],
  ] as const)
    await f.call("customer", "address.save", {
      label,
      street,
      building,
      isDefault,
      locationId: area.id,
      phone: "08012345678",
      recipient: "Avery Morgan",
    });
  const orders: string[] = [];
  for (let n = 0; n < 2; n++) {
    const oid = id();
    orders.push(oid);
    await f.db.query(
      "INSERT INTO orders(id,reference,customer_id,branch_id,status,payment_status,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash) VALUES($1,$2,$3,'lagos','delivered','verified','synthetic',now()+interval '1 day','cash',1000,0,1000,'{}','2026-11-01','AM',$1,'synthetic')",
      [oid, `EG-ACCOUNT-QA-${n + 1}`, f.actors.customer.id],
    );
    await f.db.query(
      "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,1000,'cash',$3)",
      [id(), oid, f.actors.finance.id],
    );
  }
  await f.call("customer", "testimonial.create", {
    orderId: orders[0],
    content: {
      rating: 5,
      body: "The delivery was on time and the team made everything easy. Thank you for the helpful service.",
      nameStyle: "first",
      displayName: "Avery",
      consent: true,
    },
  });
  await issueSession(f.db, f.actors.customer.id, "Synthetic second browser");
  await writeFile(
    ".data/customer-account-qa.json",
    JSON.stringify({
      db: join(dir, "db"),
      email: "customer@account-qa.example.test",
      password: "Services-fixture-only-123!",
      orderId: orders[1],
    }),
    { mode: 0o600 },
  );
  console.log(
    "Created isolated account QA fixture; configuration in ignored .data/customer-account-qa.json",
  );
} finally {
  await f.db.close?.();
}
