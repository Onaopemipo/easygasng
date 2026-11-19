// Disposable local-only presentation fixture. Never modifies a hosted or business database.
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture } from "../tests/helpers/service-fixture";
import { fixture as orderFixture } from "../tests/helpers/order-tracking-fixture";
import { id } from "../apps/web/lib/auth";
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw new Error("Local synthetic QA only");
const dir = await mkdtemp(join(tmpdir(), "easygas-admin-compact-"));
const f = await fixture(join(dir, "db"));
try {
  for (const role of ["owner", "finance", "customer"])
    await f.db.query(
      "UPDATE users SET email=$1,name=$2,verified=true WHERE id=$3",
      [
        `${role}@admin-compact.example.test`,
        `Synthetic ${role}`,
        f.actors[role].id,
      ],
    );
  for (let n = 0; n < 12; n++) {
    const { slotId, ...input } = f.input();
    await f.call("customer", "booking.create", {
      ...input,
      preferredStart: new Date(Date.now() + (n + 2) * 86400000).toISOString(),
      idempotencyKey: id(),
    });
    await f.call("customer", "support.create", {
      subject: `Synthetic service question ${n + 1}`,
      message:
        "Synthetic conversation for compact inbox acceptance. No customer contact.",
    });
    await f.call("finance", "credit.request", {
      customerId: f.actors.customer.id,
      amountKobo: 10000,
      receiptReference: `SYNTHETIC-COMPACT-${n + 1}`,
      reason:
        "Disposable synthetic request for visual pagination; no actual cash received.",
    });
  }
  const g = await orderFixture(f.db);
  await g.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
  for (let n = 0; n < 10; n++) {
    const order = await g.make();
    await g.call("owner", "invoice.issue", { orderId: order.id });
  }
  await writeFile(
    ".data/admin-compact-qa.json",
    JSON.stringify({
      db: join(dir, "db"),
      email: "owner@admin-compact.example.test",
      password: "Services-fixture-only-123!",
    }),
    { mode: 0o600 },
  );
  console.log(
    "Prepared disposable admin compact fixture. Private configuration: .data/admin-compact-qa.json",
  );
} finally {
  await f.db.close?.();
}
