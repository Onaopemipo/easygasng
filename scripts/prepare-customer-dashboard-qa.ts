import { access } from "node:fs/promises";
// Synthetic browser fixture only. No connection to business or hosted databases.
import { fixture } from "../tests/helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw new Error("Isolated local QA only.");
const directory = ".data/customer-dashboard-browser-qa-20261030-v2";
try {
  await access(directory);
  throw new Error(
    "QA fixture already exists. Reuse its isolated database rather than reseeding it.",
  );
} catch (e: any) {
  if (e.code !== "ENOENT") throw e;
}
const f = await fixture(directory);
for (const [role, a] of Object.entries(f.actors))
  await f.db.query("UPDATE users SET email=$1,name=$2 WHERE id=$3", [
    `${role}@customer-dashboard-qa.example.test`,
    role === "customer" ? "Philip QA Customer" : `QA ${role}`,
    a.id,
  ]);
await f.db.query(
  "UPDATE inventory SET quantity=10,reserved=0,published=true,price_kobo=350000 WHERE product_id='hose' AND branch_id='lagos'",
);
const uid = f.actors.customer.id;
for (const days of [35, 21, 7]) {
  const oid = id();
  await f.db.query(
    "INSERT INTO orders(id,reference,customer_id,branch_id,status,payment_status,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash,delivery_code_hash,delivery_code_expires_at,delivered_at,created_at) VALUES($1,$2,$3,'lagos','delivered','verified','cash',1000,0,1000,'{\"street\":\"12 Synthetic Avenue\",\"zone\":\"Ikoyi\"}','2026-10-30','Synthetic QA',$1,'qa','qa',now()+interval '1 day',now()-($4::int*interval '1 day'),now()-($4::int*interval '1 day'))",
    [oid, `QA-GAS-${days}`, uid, days],
  );
  await f.db.query(
    "INSERT INTO order_gas_lines(id,order_id,capacity_grams,grams,unit_price_kobo,subtotal_kobo,pricing_version) VALUES($1,$2,12500,12500,80,1000,1)",
    [id(), oid],
  );
  await f.db.query(
    "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,1000,'synthetic_qa',$3)",
    [id(), oid, f.actors.finance.id],
  );
}
await f.call("customer", "refill.profile.create", {
  productId: "refill-12",
  label: "QA Home Cylinder",
  householdSize: 3,
  cookingDays: 6,
});
await f.db.query(
  "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES($1,$2,856000,'synthetic_qa',$1)",
  [id(), uid],
);
await f.db.query(
  "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,1250,$1)",
  [id(), uid],
);
await f.db.query(
  "INSERT INTO refill_schedules(id,customer_id,product_id,interval_days,next_date) VALUES($1,$2,'refill-12',14,current_date+7)",
  [id(), uid],
);
const address = await f.call("customer", "address.save", {
  label: "QA Home",
  street: "12 Synthetic Avenue",
  zone: "Lekki",
  phone: "08012345678",
});
await f.call("customer", "address.default", { id: address.id });
await f.call("customer", "booking.create", f.input());
await f.db.query(
  "INSERT INTO notifications(id,user_id,title,body) VALUES($1,$2,'QA refill reminder','Synthetic browser QA reminder only.')",
  [id(), uid],
);
await f.db.close?.();
console.log("Isolated customer dashboard fixture prepared.");
