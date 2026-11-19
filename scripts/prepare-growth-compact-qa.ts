// Disposable local visual fixture only. No real payments, fulfilment, campaign delivery or publication.
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture } from "../tests/helpers/service-fixture";
import { id, issueSession } from "../apps/web/lib/auth";
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw new Error("Local synthetic QA only");
const dir = await mkdtemp(join(tmpdir(), "easygas-growth-compact-"));
const f = await fixture(join(dir, "db"));
try {
  await f.db.query(
    "UPDATE users SET name='Synthetic growth owner',email='owner@growth-qa.example.test',verified=true WHERE id=$1",
    [f.actors.owner.id],
  );
  for (let n = 0; n < 10; n++) {
    const customerId = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id,verified) SELECT $1,'Synthetic growth customer',$2,password_hash,'customer','lagos',true FROM users WHERE id=$3",
      [
        customerId,
        `${customerId}@growth-qa.example.test`,
        f.actors.customer.id,
      ],
    );
    f.actors.customer = {
      id: customerId,
      token: await issueSession(f.db, customerId),
    };
    await f.call("owner", "campaign.create", {
      branchId: "lagos",
      title: `Synthetic campaign ${n + 1}`,
      body: "Disposable synthetic campaign draft for layout review only. Do not deliver.",
      segment: n % 2 ? "inactive" : "all",
    });
    await f.call("service_manager", "recommendation.propose", {
      branchId: "lagos",
      productId: n % 2 ? "regulator" : "hose",
      serviceId: "cooker-servicing",
      relation: n % 3 === 0 ? "incompatible" : n % 2 ? "unknown" : "assessment",
      evidence:
        "Synthetic assessment evidence for layout review. No compatibility or physical service claim.",
    });
    const oid = id();
    await f.db.query(
      "INSERT INTO orders(id,reference,customer_id,branch_id,status,payment_status,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash) VALUES($1,$1,$2,'lagos','delivered','verified','synthetic',now()+interval '1 day','cash',1000,0,1000,'{}','2026-11-01','AM',$1,'synthetic')",
      [oid, f.actors.customer.id],
    );
    await f.db.query(
      "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,1000,'synthetic_test',$3)",
      [id(), oid, f.actors.finance.id],
    );
    let review = await f.call("customer", "testimonial.create", {
      orderId: oid,
      content: {
        rating: (n % 5) + 1,
        body: "Synthetic customer feedback for layout acceptance only. The team explained the process clearly and followed up on the request.",
        nameStyle: "custom",
        displayName: `Synthetic reviewer ${String.fromCharCode(65 + n)}`,
        consent: true,
      },
    });
    if (n !== 9)
      review = await f.call("customer", "testimonial.transition", {
        id: review.id,
        revision: review.revision,
        status: "PENDING_REVIEW",
      });
    if (n === 8)
      await f.call("owner", "testimonial.transition", {
        id: review.id,
        revision: review.revision,
        status: "APPROVED",
        reason:
          "Independent synthetic review; publication is deliberately not performed.",
      });
  }
  await writeFile(
    ".data/growth-compact-qa.json",
    JSON.stringify({
      db: join(dir, "db"),
      email: "owner@growth-qa.example.test",
      password: "Services-fixture-only-123!",
    }),
    { mode: 0o600 },
  );
  console.log(
    "Prepared isolated growth fixture. No campaign was approved/delivered; no testimonial was published.",
  );
} finally {
  await f.db.close?.();
}
