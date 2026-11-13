import nodemailer from "nodemailer";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { root } from "./db";
import { brandedMailHtml, documentBrand } from "./document-brand";
import { z } from "zod";
import { type DB, type SQL, one } from "./db";
import { allow, recentVerification, type Actor, AppError } from "./auth";
import { audit } from "./governance";
import { recordFailure } from "./observability";
import { openMessage } from "./channel-messaging";
export type MailTransport = {
  send(message: {
    id: string;
    recipient: string;
    subject: string;
    body: string;
  }): Promise<void>;
};
export function smtpTransport(env: NodeJS.ProcessEnv): MailTransport | null {
  if (env.EASYGAS_EMAIL_ENABLED !== "true") return null;
  const host = z
    .string()
    .regex(/^[a-z0-9.-]+$/i)
    .parse(env.SMTP_HOST);
  const port = z.coerce
    .number()
    .refine((v) => v === 465 || v === 587)
    .parse(env.SMTP_PORT);
  const from = z.email().parse(env.SMTP_FROM);
  const user = z.string().min(1).parse(env.SMTP_USER),
    pass = z.string().min(1).parse(env.SMTP_PASSWORD);
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: true,
    tls: { rejectUnauthorized: true, servername: host },
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });
  return {
    async send(m) {
      const result = await transport.sendMail({
        from,
        to: z.email().parse(m.recipient),
        subject: m.subject,
        text: m.body,
        html: brandedMailHtml(m.subject, m.body),
        attachments: [
          {
            filename: "easygas-logo.png",
            content: await readFile(
              path.join(root, "apps/web/public", documentBrand.logo),
            ),
            contentType: "image/png",
            cid: documentBrand.logoCid,
            contentDisposition: "inline",
          },
        ],
        messageId: `<easygas-${m.id.replace(/[^a-z0-9-]/gi, "")}@${from.split("@")[1]}>`,
      });
      if (!result.accepted?.length || result.rejected?.length)
        throw Object.assign(new Error("SMTP rejected recipient"), {
          responseCode: 550,
        });
    },
  };
}
export async function deliverTransactionalMail(
  db: DB,
  transport: MailTransport | null,
  limit = 10,
) {
  if (!transport) return { accepted: 0, review: 0, retry: 0 };
  const result = { accepted: 0, review: 0, retry: 0 };
  for (let i = 0; i < Math.min(Math.max(limit, 0), 50); i++) {
    const message = await db.transaction(async (tx) => {
      const row = await one(
        tx,
        "SELECT m.* FROM message_outbox m JOIN users u ON u.id=m.user_id WHERE m.channel='email' AND m.status='pending' AND m.next_attempt_at<=now() AND m.attempts<5 AND u.active=true ORDER BY m.created_at,m.id LIMIT 1 FOR UPDATE OF m SKIP LOCKED",
      );
      if (!row) return null;
      if (row.dedupe_key.startsWith("challenge:")) {
        const challenge = await one(
          tx,
          "SELECT id FROM account_challenges WHERE id=$1 AND consumed_at IS NULL AND expires_at>now()",
          [row.dedupe_key.slice(10)],
        );
        if (!challenge) {
          await tx.query(
            "UPDATE message_outbox SET status='cancelled' WHERE id=$1",
            [row.id],
          );
          return { cancelled: true as const };
        }
      }
      if (row.dedupe_key.startsWith("invite:")) {
        const [, invitationId, tokenHash] = row.dedupe_key.split(":");
        const invitation = await one(tx,
          "SELECT i.id FROM staff_invitations i JOIN users u ON u.id=i.invited_by JOIN branches b ON b.id=i.branch_id WHERE i.id=$1 AND i.email=$2 AND i.invited_by=$3 AND (i.temporary_password_hash IS NULL OR i.token_hash=$4) AND i.accepted_at IS NULL AND i.expires_at>now() AND u.active=true AND b.active=true AND (u.role='owner' OR (u.role='owner' AND u.branch_id=i.branch_id))",
          [invitationId, row.recipient, row.user_id, tokenHash ?? null],
        );
        if (!invitation) {
          await tx.query("UPDATE message_outbox SET status='cancelled' WHERE id=$1", [row.id]);
          return { cancelled: true as const };
        }
      }
      // Durable fail-closed claim BEFORE external I/O. A crash/timeout is an
      // uncertain send, never an invitation to automatically send twice.
      await tx.query(
        "UPDATE message_outbox SET status='failed',attempts=attempts+1,lease_until=now()+interval '2 minutes',delivery_status='sending' WHERE id=$1",
        [row.id],
      );
      await recordFailure(
        tx,
        "mail_delivery_review",
        row.id,
        "UncertainDelivery",
      );
      return {
        id: String(row.id),
        recipient: String(row.recipient),
        subject: String(row.subject),
        body: String(row.body),
        attempts: Number(row.attempts) + 1,
        cancelled: false as const,
      };
    });
    if (!message) break;
    if (message.cancelled) continue;
    try {
      await transport.send({
        id: message.id,
        recipient: message.recipient,
        subject: message.subject,
        body: message.body.startsWith("v1:") ? openMessage(message.body) : message.body,
      });
      await db.transaction(async (tx) => {
        await tx.query(
          "UPDATE message_outbox SET status='sent',lease_until=NULL,delivery_status='accepted' WHERE id=$1 AND status='failed' AND attempts=$2",
          [message.id, message.attempts],
        );
        await tx.query(
          "UPDATE operational_incidents SET status='resolved' WHERE category='mail_delivery_review' AND target=$1",
          [message.id],
        );
      });
      result.accepted++;
    } catch (error: any) {
      // Only an explicit SMTP 4xx rejection proves the server declined the send.
      const rejected =
        Number(error?.responseCode) >= 400 && Number(error?.responseCode) < 500;
      if (rejected && message.attempts < 5) {
        await db.query(
          "UPDATE message_outbox SET status='pending',next_attempt_at=now()+interval '5 minutes',lease_until=NULL,delivery_status='rejected' WHERE id=$1 AND status='failed' AND attempts=$2",
          [message.id, message.attempts],
        );
        result.retry++;
      } else {
        await db.query(
          "UPDATE message_outbox SET lease_until=NULL,delivery_status='review_required' WHERE id=$1 AND status='failed' AND attempts=$2",
          [message.id, message.attempts],
        );
        result.review++;
      }
    }
  }
  return result;
}
export async function mailAction(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
) {
  if (!["mail.status", "mail.retry", "mail.reconcile"].includes(action)) return;
  allow(user, ["owner"]);
  if (action === "mail.status")
    return {
      enabled: process.env.EASYGAS_EMAIL_ENABLED === "true",
      messages: (
        await tx.query(
          "SELECT id,channel,status,attempts,created_at,next_attempt_at,lease_until,delivery_status FROM message_outbox WHERE channel='email' ORDER BY created_at DESC LIMIT 100",
        )
      ).rows,
    };
  recentVerification(user);
  if (action === "mail.reconcile") {
    const d = z
      .object({
        id: z.string().uuid(),
        reason: z.string().trim().min(20).max(1000),
        workerStopped: z.literal(true),
        providerOutcome: z.enum(["accepted", "not_accepted", "unknown"]),
      })
      .strict()
      .parse(input);
    const row = await one(
      tx,
      "SELECT * FROM message_outbox WHERE id=$1 AND channel='email' FOR UPDATE",
      [d.id],
    );
    if (!row || row.status !== "failed" || row.delivery_status !== "sending")
      throw new AppError(
        409,
        "Only an interrupted SMTP claim can be reconciled.",
      );
    if (!row.lease_until || new Date(row.lease_until).getTime() > Date.now())
      throw new AppError(
        409,
        "The send lease is still active. Stop the original worker and wait before reconciliation.",
      );
    await tx.query(
      "UPDATE message_outbox SET status=$1,lease_until=NULL,delivery_status=$2 WHERE id=$3",
      [
        d.providerOutcome === "accepted" ? "sent" : "failed",
        d.providerOutcome === "accepted"
          ? "accepted"
          : d.providerOutcome === "not_accepted"
            ? "rejected"
            : "review_required",
        row.id,
      ],
    );
    await audit(tx, user, "mail.reconciled", row.id, "success", {
      reason: d.reason,
      providerOutcome: d.providerOutcome,
      workerStopped: true,
    });
    if (d.providerOutcome === "accepted")
      await tx.query(
        "UPDATE operational_incidents SET status='resolved' WHERE category='mail_delivery_review' AND target=$1",
        [row.id],
      );
    return { ok: true, retryAuthorised: false };
  }
  const d = z
    .object({
      id: z.string().uuid(),
      reason: z.string().trim().min(10).max(1000),
      acknowledgePossibleDuplicate: z.literal(true),
    })
    .strict()
    .parse(input);
  const row = await one(
    tx,
    "SELECT * FROM message_outbox WHERE id=$1 AND channel='email' FOR UPDATE",
    [d.id],
  );
  if (!row || row.status !== "failed")
    throw new AppError(409, "Only a failed message can be reviewed for retry.");
  if (row.delivery_status === "sending" || row.lease_until)
    throw new AppError(
      409,
      "Delivery is in flight or its worker stopped unexpectedly. Reconcile the original send before retrying.",
    );
  if (Number(row.attempts) >= 5)
    throw new AppError(
      409,
      "Attempt limit reached. Fix delivery configuration and request a fresh customer recovery link where applicable.",
    );
  await tx.query(
    "UPDATE message_outbox SET status='pending',next_attempt_at=now() WHERE id=$1",
    [row.id],
  );
  await audit(tx, user, "mail.retry_authorised", row.id, "success", {
    reason: d.reason,
    acknowledgePossibleDuplicate: true,
  });
  return { ok: true };
}
