// Synthetic local inbox only; never touches working/hosted data or sends messages.
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDatabase } from "../apps/web/lib/db";
import { fixture } from "../tests/helpers/order-tracking-fixture";
import { id } from "../apps/web/lib/auth";
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw new Error("Isolated local QA only");
const dir = await mkdtemp(join(tmpdir(), "easygas-notifications-"));
const f = await fixture(await createDatabase(join(dir, "db")));
try {
  await f.db.query(
    "UPDATE users SET name='Notifications QA Customer',email='customer@notifications-qa.example.test' WHERE id=$1",
    [f.actors.customer.id],
  );
  const order = await f.make();
  const samples = [
    [
      "Order received",
      `${order.reference} has been received. Your delivery window is confirmed on your order.`,
      order.id,
    ],
    [
      "Delivery confirmation code",
      "Your delivery confirmation code is 654321. Share it only after receiving all items.",
      order.id,
    ],
    [
      "Sandbox payment verified",
      "Test-mode payment was verified. This is not a live-money receipt.",
      null,
    ],
    [
      "Support replied",
      "Your support request has a new reply. Open your conversation to review the update.",
      null,
    ],
    [
      "Refill reminder",
      "Review your gas supply and plan your next refill when you are ready.",
      null,
    ],
    [
      "Account updated",
      "Your account preferences were saved successfully.",
      null,
    ],
    [
      "Delivery scheduled",
      `${order.reference} is scheduled. Check your order for the delivery date and window.`,
      order.id,
    ],
    [
      "Refund request received",
      "Your synthetic refund request is awaiting independent finance review.",
      null,
    ],
    [
      "Payment receipt ready",
      "Your synthetic payment document is available in Invoices & receipts.",
      null,
    ],
  ];
  for (let i = 0; i < 18; i++) {
    const [title, body, related] = samples[i % samples.length];
    await f.db.query(
      "INSERT INTO notifications(id,user_id,title,body,related_id,read_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        id(),
        f.actors.customer.id,
        title,
        body,
        related,
        i % 4 === 0 ? new Date().toISOString() : null,
        new Date(Date.now() - i * 52 * 60000).toISOString(),
      ],
    );
  }
  await writeFile(
    ".data/customer-notifications-qa.json",
    JSON.stringify({
      db: join(dir, "db"),
      email: "customer@notifications-qa.example.test",
      password: "Tracking-fixture-only-123!",
      orderId: order.id,
    }),
  );
  console.log(
    "Prepared isolated synthetic customer inbox. Private config in ignored .data/customer-notifications-qa.json. No provider actions.",
  );
} finally {
  await f.db.close?.();
}
