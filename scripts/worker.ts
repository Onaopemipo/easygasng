import { paystackRuntime } from "../apps/web/lib/payments/runtime";
import { processPaystackInbox } from "../apps/web/lib/payments/webhooks";
import { escalateUnacknowledgedDispatch } from "../apps/web/lib/dispatch-escalation";
import { purgeExpiredProof } from "../apps/web/lib/delivery-photos";
import {
  deliverChannels,
  providerAdapters,
  queueChannelNotices,
  type Channel,
} from "../apps/web/lib/channel-messaging";
import {
  deliverTransactionalMail,
  smtpTransport,
} from "../apps/web/lib/transactional-mail";
import "./environment";
import { getDb, one } from "../apps/web/lib/db";
import { runJobs } from "../apps/web/lib/refills";
import { recordFailure } from "../apps/web/lib/observability";
import type { Actor } from "../apps/web/lib/auth";
if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL)
  throw new Error("Production maintenance requires PostgreSQL.");
const once = process.argv.includes("--once"),
  watch = process.argv.includes("--watch");
if (once === watch)
  throw new Error(
    "Choose --once or --watch. Embedded PostgreSQL permits one process owner only.",
  );
process.env.EASYGAS_BACKGROUND_JOBS = "false";
const transport = smtpTransport(process.env);
const channels = providerAdapters(process.env);
const db = await getDb();
let stopping = false;
let wake: (() => void) | undefined;
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.once(signal, () => {
    stopping = true;
    wake?.();
  });
try {
  do {
    try {
      if (process.env.EASYGAS_PAYSTACK_ENABLED === "true")
        await processPaystackInbox(db, paystackRuntime());
      const operator = await one(
        db,
        "SELECT id,name,email,role,branch_id FROM users WHERE active=true AND role='owner' ORDER BY created_at LIMIT 1",
      );
      if (!operator) throw new Error("MissingWorkerAuthority");
      const result = await db.transaction((tx) =>
        runJobs(tx, {
          ...operator,
          session_id: "operator-maintenance",
          verified_at: null,
        } as Actor),
      );
      console.log(
        JSON.stringify({ job: result.id, status: "completed", ...result }),
      );
      await db.transaction((tx) =>
        escalateUnacknowledgedDispatch(tx, {
          ...operator,
          session_id: "operator-maintenance",
          verified_at: null,
        } as Actor),
      );
      await db.transaction((tx) =>
        purgeExpiredProof(tx, {
          ...operator,
          session_id: "operator-maintenance",
          verified_at: null,
        } as Actor),
      );
      await db.transaction((tx) =>
        queueChannelNotices(tx, Object.keys(channels) as Channel[]),
      );
      const channelResult = await deliverChannels(db, channels);
      if (Object.keys(channels).length)
        console.log(
          JSON.stringify({ job: "channel-messaging", ...channelResult }),
        );
      const mail = await deliverTransactionalMail(db, transport);
      if (transport)
        console.log(JSON.stringify({ job: "transactional-mail", ...mail }));
    } catch (error) {
      const type = error instanceof Error ? error.name : "unknown";
      await recordFailure(
        db,
        "maintenance_failure",
        new Date().toISOString().slice(0, 13),
        type,
      );
      console.error(
        JSON.stringify({ job: "maintenance", status: "failed", type }),
      );
      if (once) process.exitCode = 1;
    }
    if (watch && !stopping)
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          wake = undefined;
          resolve();
        }, 60000);
        wake = () => {
          clearTimeout(timer);
          wake = undefined;
          resolve();
        };
      });
  } while (watch && !stopping);
} finally {
  await db.close?.();
}
