import { createHash } from "node:crypto";
import { z } from "zod";
import { id, AppError } from "../auth";
import { one, type DB } from "../db";
import { verifyPaystackSignature, type WebhookKeys } from "./paystack-provider";
import { reconcilePayment, type PaymentRuntime } from "./orchestrator";
export async function receivePaystackEvent(
  db: DB,
  raw: Uint8Array,
  headers: { current?: string | null; legacy?: string | null },
  keys: WebhookKeys,
) {
  if (!verifyPaystackSignature(raw, headers, keys))
    throw new AppError(401, "Invalid payment event signature.");
  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(raw).toString("utf8"));
  } catch {
    throw new AppError(400, "Malformed payment event.");
  }
  const event = z
    .object({
      event: z.string().max(80),
      data: z
        .object({
          id: z.union([
            z.number().int().positive(),
            z.string().min(1).max(100),
          ]),
          reference: z.string().regex(/^[A-Za-z0-9.=-]{10,100}$/),
          domain: z.literal("test"),
        })
        .passthrough(),
    })
    .passthrough()
    .parse(decoded);
  // Only charge-success can post. Other lifecycle types require their dedicated verified consumer.
  if (event.event !== "charge.success")
    throw new AppError(
      400,
      "Unsupported payment event; no financial effects were applied.",
    );
  const hash = createHash("sha256").update(raw).digest("hex"),
    eventKey = "test:" + event.event + ":" + event.data.id;
  return db.transaction(async (tx) => {
    const a = await one(
      tx,
      "SELECT id FROM payment_attempts WHERE reference=$1",
      [event.data.reference],
    );
    const result = await one(
      tx,
      "INSERT INTO payment_provider_events(id,digest,event_key,event_type,reference,attempt_id,signature_mode) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING RETURNING id",
      [
        id(),
        hash,
        eventKey,
        event.event,
        event.data.reference,
        a?.id ?? null,
        keys.mode,
      ],
    );
    return { received: true, duplicate: !result };
  });
}
export async function processPaystackInbox(
  db: DB,
  runtime: PaymentRuntime,
  limit = 20,
) {
  const rows = (
    await db.query(
      "SELECT e.id,e.reference,e.attempt_id FROM payment_provider_events e LEFT JOIN payment_attempts a ON a.id=e.attempt_id WHERE e.state='received' AND (a.id IS NULL OR a.reconcile_after<=now()) ORDER BY e.received_at,e.id LIMIT $1",
      [Math.min(100, Math.max(1, limit))],
    )
  ).rows;
  let processed = 0;
  for (const row of rows) {
    if (!row.attempt_id) {
      await db.query(
        "UPDATE payment_provider_events SET state='under_review',processed_at=now() WHERE id=$1",
        [row.id],
      );
      continue;
    }
    const result = await reconcilePayment(db, row.reference, runtime);
    if (result.status === "paid") processed++;
    else if (result.status === "under_review")
      await db.query(
        "UPDATE payment_provider_events SET state='under_review',processed_at=now() WHERE id=$1",
        [row.id],
      );
  }
  const pending = (
    await db.query(
      "SELECT reference FROM payment_attempts WHERE state IN ('initializing','awaiting_customer','pending') AND reconcile_after<=now() ORDER BY reconcile_after,id LIMIT $1",
      [Math.min(100, Math.max(1, limit))],
    )
  ).rows;
  for (const a of pending) await reconcilePayment(db, a.reference, runtime);
  return { received: rows.length, processed, pendingRechecked: pending.length };
}

// Acknowledge durably first, then verify this signed event immediately. The inbox
// remains the recovery authority if the provider is slow or temporarily unavailable.
export async function receiveAndVerifyPaystackEvent(
  db: DB,
  raw: Uint8Array,
  headers: { current?: string | null; legacy?: string | null },
  keys: WebhookKeys,
  runtime: PaymentRuntime,
) {
  const received = await receivePaystackEvent(db, raw, headers, keys);
  const event = JSON.parse(Buffer.from(raw).toString("utf8"));
  const attempt = await one(
    db,
    "SELECT id FROM payment_attempts WHERE reference=$1",
    [event.data.reference],
  );
  if (!attempt) return received;
  try {
    const verified = await reconcilePayment(db, event.data.reference, runtime);
    return { ...received, status: verified.status };
  } catch {
    // The committed inbox is retried by the existing worker; never credit from payload.
    return { ...received, status: "pending" };
  }
}
