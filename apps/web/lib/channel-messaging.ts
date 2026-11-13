import { retentionPolicy } from "./operations-schema";
import { appOrigin } from "./request-origin";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { z } from "zod";
import { one, type SQL, type DB } from "./db";
import { allow, AppError, id, type Actor } from "./auth";
import { audit } from "./governance";
export type Channel = "sms" | "whatsapp";
export type Purpose = "transactional" | "marketing" | "otp" | "refill";
function key() {
  const s = process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY;
  if (!s || !/^[a-f0-9]{64}$/i.test(s))
    throw new AppError(503, "Secure messaging storage is not configured.");
  return Buffer.from(s, "hex");
}
export function requireMessageEncryption() {
  key();
}
export function sealMessage(body: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(body, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("hex"),
    cipher.getAuthTag().toString("hex"),
    data.toString("hex"),
  ].join(":");
}
export function openMessage(value: string) {
  const [v, iv, tag, data] = value.split(":");
  if (v !== "v1") throw new Error("Unsealed channel message requires review");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "hex"));
  d.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([
    d.update(Buffer.from(data, "hex")),
    d.final(),
  ]).toString("utf8");
}
export async function enqueueChannel(
  tx: SQL,
  d: {
    userId: string;
    channel: Channel;
    purpose: Purpose;
    body: string;
    dedupe: string;
    template?: string;
    expiresAt?: string;
  },
) {
  const u = await one(
    tx,
    "SELECT active,contact_phone,phone_verified_at,provisional FROM users WHERE id=$1",
    [d.userId],
  );
  const c = await one(
    tx,
    "SELECT * FROM channel_consents WHERE user_id=$1 AND channel=$2 AND purpose=$3",
    [d.userId, d.channel, d.purpose],
  );
  if (!u?.active || !u.contact_phone || !c?.enabled)
    throw new AppError(
      409,
      "This channel requires a phone number and explicit purpose-specific consent.",
    );
  if (
    (d.purpose === "marketing" ||
      d.purpose === "refill" ||
      (d.purpose === "transactional" && !u.provisional)) &&
    !u.phone_verified_at
  )
    throw new AppError(
      409,
      "Verify phone possession before sending this purpose to the saved phone.",
    );
  const mid = id();
  await tx.query(
    "INSERT INTO message_outbox(id,user_id,channel,recipient,subject,body,dedupe_key,purpose,template_name,consent_version,expires_at) VALUES($1,$2,$3,$4,'EasyGas',$5,$6,$7,$8,$9,$10) ON CONFLICT(dedupe_key) DO NOTHING",
    [
      mid,
      d.userId,
      d.channel,
      u.contact_phone,
      sealMessage(d.body),
      d.dedupe,
      d.purpose,
      d.template ?? null,
      c.version,
      d.expiresAt ?? null,
    ],
  );
  const stored = await one(
    tx,
    "SELECT id,status,delivery_status FROM message_outbox WHERE dedupe_key=$1",
    [d.dedupe],
  );
  return {
    queued: stored?.status === "pending",
    messageId: stored?.id,
    status: stored?.status,
    deliveryStatus: stored?.delivery_status,
  };
}
export async function channelAction(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  if (action === "channels.preferences")
    return {
      consents: (
        await tx.query(
          "SELECT channel,purpose,enabled,version,updated_at FROM channel_consents WHERE user_id=$1 ORDER BY channel,purpose",
          [user.id],
        )
      ).rows,
    };
  if (action === "channels.status") {
    allow(user, ["owner", "manager", "finance"]);
    return {
      smsEnabled: process.env.EASYGAS_SMS_ENABLED === "true",
      whatsappEnabled: process.env.EASYGAS_WHATSAPP_ENABLED === "true",
      providers: { sms: "Termii", whatsapp: "Meta Cloud API" },
      counts: (
        await tx.query(
          "SELECT m.channel,m.status,m.delivery_status,count(*) FROM message_outbox m JOIN users u ON u.id=m.user_id WHERE m.channel IN ('sms','whatsapp') AND ($1::boolean OR u.branch_id=$2) GROUP BY m.channel,m.status,m.delivery_status",
          [user.role === "owner", user.branch_id],
        )
      ).rows,
    };
  }
  if (action !== "channels.consent")
    throw new AppError(404, "Unknown channel action.");
  const d = z
    .object({
      customerId: z.string().uuid().optional(),
      channel: z.enum(["sms", "whatsapp"]),
      purpose: z.enum(["transactional", "marketing", "otp", "refill"]),
      enabled: z.boolean(),
      evidence: z.string().trim().min(10).max(500),
    })
    .strict()
    .parse(input);
  const uid = d.customerId ?? user.id;
  if (uid !== user.id) {
    allow(user, ["owner", "manager"]);
    if (d.purpose === "marketing" || d.purpose === "refill")
      throw new AppError(
        403,
        "Customers must set their own marketing and refill preferences.",
      );
    const u = await one(
      tx,
      "SELECT branch_id,provisional FROM users WHERE id=$1",
      [uid],
    );
    if (!u?.provisional)
      throw new AppError(
        403,
        "Assisted consent recording is limited to provisional accounts.",
      );
    allow(user, ["owner", "manager"], u.branch_id);
  }
  await tx.query(
    "INSERT INTO channel_consents(user_id,channel,purpose,enabled,evidence) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,channel,purpose) DO UPDATE SET enabled=excluded.enabled,evidence=excluded.evidence,version=channel_consents.version+1,updated_at=now()",
    [uid, d.channel, d.purpose, d.enabled, d.evidence],
  );
  if (!d.enabled)
    await tx.query(
      "UPDATE message_outbox SET status='cancelled' WHERE user_id=$1 AND channel=$2 AND purpose=$3 AND status='pending'",
      [uid, d.channel, d.purpose],
    );
  await audit(tx, user, action, uid, "success", {
    channel: d.channel,
    purpose: d.purpose,
    enabled: d.enabled,
  });
  return { ok: true };
}
export class ProviderRateLimited extends Error {}
export interface ChannelTransport {
  send(m: {
    id: string;
    recipient: string;
    body: string;
    purpose: Purpose;
    template: string | null;
  }): Promise<{ providerId: string }>;
}
export function providerAdapters(
  env: NodeJS.ProcessEnv,
  send: typeof fetch = fetch,
): Partial<Record<Channel, ChannelTransport>> {
  const out: Partial<Record<Channel, ChannelTransport>> = {};
  if (env.EASYGAS_SMS_ENABLED === "true") {
    const base = new URL(z.url().parse(env.TERMII_BASE_URL));
    if (
      base.protocol !== "https:" ||
      !/(^|\.)termii\.(com|ai)$/.test(base.hostname) ||
      base.username ||
      base.password
    )
      throw new Error("Use your approved Termii HTTPS account base URL");
    const api = z.string().min(10).parse(env.TERMII_API_KEY),
      from = z.string().min(3).max(11).parse(env.TERMII_SENDER);
    out.sms = {
      async send(m) {
        const r = await send(new URL("/api/sms/send", base), {
          method: "POST",
          redirect: "error",
          signal: AbortSignal.timeout(15000),
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: api,
            to: m.recipient.replace(/^\+/, ""),
            from,
            sms: m.body,
            type: "plain",
            channel: m.purpose === "marketing" ? "generic" : "dnd",
          }),
        });
        if (r.status === 429)
          throw new ProviderRateLimited("Provider rate limit");
        if (!r.ok)
          throw new Error(
            "Provider acceptance uncertain; review before resend",
          );
        const v = await r.json();
        if (v.code !== "ok" || !(v.message_id_str ?? v.message_id))
          throw new Error(
            "Provider acceptance uncertain; review before resend",
          );
        return { providerId: String(v.message_id_str ?? v.message_id) };
      },
    };
  }
  if (env.EASYGAS_WHATSAPP_ENABLED === "true") {
    const version = z
        .string()
        .regex(/^v\d+\.\d+$/)
        .parse(env.META_GRAPH_VERSION),
      phone = z.string().regex(/^\d+$/).parse(env.META_PHONE_NUMBER_ID),
      token = z.string().min(20).parse(env.META_ACCESS_TOKEN);
    out.whatsapp = {
      async send(m) {
        if (!m.template) throw new Error("Approved WhatsApp template required");
        const r = await send(
          `https://graph.facebook.com/${version}/${phone}/messages`,
          {
            method: "POST",
            redirect: "error",
            signal: AbortSignal.timeout(15000),
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: m.recipient.replace(/^\+/, ""),
              type: "template",
              template: {
                name: m.template,
                language: { code: env.META_TEMPLATE_LANGUAGE ?? "en" },
                components: [
                  {
                    type: "body",
                    parameters: [{ type: "text", text: m.body }],
                  },
                ],
              },
            }),
          },
        );
        if (r.status === 429)
          throw new ProviderRateLimited("Provider rate limit");
        if (!r.ok)
          throw new Error(
            "Provider acceptance uncertain; review before resend",
          );
        const v = await r.json();
        if (!v.messages?.[0]?.id)
          throw new Error(
            "Provider acceptance uncertain; review before resend",
          );
        return { providerId: v.messages[0].id };
      },
    };
  }
  return out;
}
export function verifyMetaSignature(
  raw: string,
  signature: string,
  secret: string,
) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected =
    "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
export async function deliverChannels(
  db: DB,
  adapters: Partial<Record<Channel, ChannelTransport>>,
  limit = 10,
) {
  let accepted = 0,
    review = 0;
  const configured = Object.keys(adapters);
  if (!configured.length) return { accepted, review };
  // A crashed/ambiguous send is quarantined, never blindly retried: providers do not guarantee deduplication.
  await db.query(
    "UPDATE message_outbox SET status='failed',delivery_status='review_required' WHERE channel=ANY($1::text[]) AND status='pending' AND lease_until<now()",
    [configured],
  );
  for (let i = 0; i < Math.min(limit, 50); i++) {
    const m = await db.transaction(async (tx) => {
      const row = await one(
        tx,
        "SELECT m.*,u.contact_phone AS current_phone,u.phone_verified_at,u.provisional,u.branch_id AS current_branch FROM message_outbox m JOIN users u ON u.id=m.user_id AND u.active=true WHERE m.channel=ANY($1::text[]) AND m.status='pending' AND m.lease_until IS NULL AND m.next_attempt_at<=now() ORDER BY m.created_at LIMIT 1 FOR UPDATE OF m SKIP LOCKED",
        [configured],
      );
      if (!row) return null;
      await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
        row.user_id,
      ]);
      const c = await one(
        tx,
        "SELECT * FROM channel_consents WHERE user_id=$1 AND channel=$2 AND purpose=$3",
        [row.user_id, row.channel, row.purpose],
      );
      if (
        row.current_phone !== row.recipient ||
        ((row.purpose === "marketing" ||
          row.purpose === "refill" ||
          (row.purpose === "transactional" && !row.provisional)) &&
          !row.phone_verified_at) ||
        !c?.enabled ||
        c.version !== row.consent_version ||
        (row.expires_at && new Date(row.expires_at).getTime() <= Date.now())
      ) {
        await tx.query(
          "UPDATE message_outbox SET status='cancelled' WHERE id=$1",
          [row.id],
        );
        return { skip: true };
      }
      if (
        row.purpose === "marketing" &&
        row.dedupe_key.startsWith("winback:")
      ) {
        const setting = await one(
          tx,
          "SELECT value FROM settings WHERE key='crm.retention' AND scope=$1",
          [row.current_branch],
        );
        const policy = retentionPolicy.safeParse(setting?.value);
        const last = await one(
          tx,
          "SELECT max(a.completed_at) AS at FROM orders o JOIN delivery_attempts a ON a.order_id=o.id AND a.state='delivered' WHERE o.customer_id=$1 AND o.branch_id=$2 AND o.status='delivered' AND o.payment_status='verified' AND (SELECT COALESCE(sum(p.amount_kobo),0) FROM verified_payments p WHERE p.order_id=o.id)>=o.total_kobo AND NOT EXISTS(SELECT 1 FROM credit_requests cr WHERE cr.order_id=o.id AND cr.kind='refund' AND cr.status='approved')",
          [row.user_id, row.current_branch],
        );
        if (
          !policy.success ||
          !policy.data.enabled ||
          !last?.at ||
          Date.now() - new Date(last.at).getTime() <
            policy.data.atRiskDays * 86400000
        ) {
          await tx.query(
            "UPDATE message_outbox SET status='cancelled',delivery_status='retention_no_longer_eligible' WHERE id=$1",
            [row.id],
          );
          return { skip: true };
        }
      }
      if (!adapters[row.channel as Channel]) return null;
      if (row.purpose === "marketing" || row.purpose === "refill") {
        const pref = await one(
          tx,
          "SELECT * FROM communication_preferences WHERE user_id=$1",
          [row.user_id],
        );
        const hour = Number(
          new Intl.DateTimeFormat("en-GB", {
            hour: "numeric",
            hourCycle: "h23",
            timeZone: "Africa/Lagos",
          }).format(new Date()),
        );
        const start = pref?.quiet_start ?? 21,
          end = pref?.quiet_end ?? 8;
        const quiet =
          start === end ||
          (start < end
            ? hour >= start && hour < end
            : hour >= start || hour < end);
        const sent = await one(
          tx,
          "SELECT count(*) AS n FROM message_outbox WHERE user_id=$1 AND purpose IN ('marketing','refill') AND (status='sent' OR (status='pending' AND lease_until IS NOT NULL)) AND created_at>now()-interval '24 hours'",
          [row.user_id],
        );
        if (quiet || Number(sent?.n) > 0) {
          await tx.query(
            "UPDATE message_outbox SET next_attempt_at=now()+interval '1 hour' WHERE id=$1",
            [row.id],
          );
          return { skip: true };
        }
      }
      await tx.query(
        "UPDATE message_outbox SET lease_until=now()+interval '2 minutes',attempts=attempts+1 WHERE id=$1",
        [row.id],
      );
      return row;
    });
    if (!m) break;
    if (m.skip) continue;
    try {
      const r = await adapters[m.channel as Channel]!.send({
        id: m.id,
        recipient: m.recipient,
        body: openMessage(m.body),
        purpose: m.purpose,
        template: m.template_name,
      });
      await db.query(
        "UPDATE message_outbox SET status='sent',provider_message_id=$1,delivery_status='accepted',lease_until=NULL WHERE id=$2 AND status='pending'",
        [r.providerId, m.id],
      );
      accepted++;
    } catch (error) {
      if (error instanceof ProviderRateLimited && Number(m.attempts) < 4) {
        await db.query(
          "UPDATE message_outbox SET next_attempt_at=$1,lease_until=NULL,delivery_status='retry_scheduled' WHERE id=$2",
          [
            new Date(
              Date.now() + 30000 * 2 ** Number(m.attempts),
            ).toISOString(),
            m.id,
          ],
        );
      } else {
        await db.query(
          "UPDATE message_outbox SET status='failed',delivery_status=$1,lease_until=NULL WHERE id=$2",
          [
            error instanceof ProviderRateLimited
              ? "dead_letter"
              : "review_required",
            m.id,
          ],
        );
        review++;
      }
    }
  }
  return { accepted, review };
}
export async function queueChannelNotices(tx: SQL, channels: Channel[]) {
  for (const channel of channels) {
    const notices = (
      await tx.query(
        "SELECT n.id,n.user_id FROM notifications n JOIN channel_consents c ON c.user_id=n.user_id AND c.channel=$1 AND c.purpose='transactional' AND c.enabled=true WHERE n.created_at>now()-interval '24 hours' AND NOT EXISTS(SELECT 1 FROM message_outbox m WHERE m.dedupe_key='notice:'||n.id||':'||$1) ORDER BY n.created_at LIMIT 50",
        [channel],
      )
    ).rows;
    for (const n of notices)
      await enqueueChannel(tx, {
        userId: n.user_id,
        channel,
        purpose: "transactional",
        body: `There is an update in your EasyGas account. Sign in securely: ${appOrigin()}/account`,
        dedupe: `notice:${n.id}:${channel}`,
        template: process.env.META_ACCOUNT_UPDATE_TEMPLATE,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });
  }
}
export async function recordMetaWebhook(tx: SQL, body: any) {
  if (body.object !== "whatsapp_business_account")
    throw new AppError(400, "Unsupported webhook.");
  let count = 0;
  for (const entry of body.entry ?? [])
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      for (const status of value.statuses ?? []) {
        if (
          !["sent", "delivered", "read", "failed"].includes(status.status) ||
          typeof status.id !== "string"
        )
          continue;
        const event = `${status.id}:${status.status}:${status.timestamp}`;
        const inserted = await tx.query(
          "INSERT INTO channel_receipts(id,channel,provider_event_id,provider_message_id,status) VALUES($1,'whatsapp',$2,$3,$4) ON CONFLICT(channel,provider_event_id) DO NOTHING RETURNING id",
          [id(), event, status.id, status.status],
        );
        if (!inserted.rows.length) continue;
        await tx.query(
          "UPDATE message_outbox SET delivery_status=$1 WHERE channel='whatsapp' AND provider_message_id=$2 AND (delivery_status IS NULL OR delivery_status='accepted' OR delivery_status='sent' OR (delivery_status='delivered' AND $1='read'))",
          [status.status, status.id],
        );
        count++;
      }
      for (const m of value.messages ?? []) {
        if (
          m.type === "text" &&
          /^stop$/i.test(m.text?.body?.trim() ?? "") &&
          /^234[789][01][0-9]{8}$/.test(m.from ?? "")
        ) {
          const uid = await one(
            tx,
            "SELECT id FROM users WHERE contact_phone=$1 AND phone_verified_at IS NOT NULL",
            ["+" + m.from],
          );
          if (uid) {
            await tx.query(
              "UPDATE channel_consents SET enabled=false,version=version+1,updated_at=now() WHERE user_id=$1 AND channel='whatsapp' AND purpose IN ('marketing','refill')",
              [uid.id],
            );
            await tx.query(
              "UPDATE message_outbox SET status='cancelled' WHERE user_id=$1 AND channel='whatsapp' AND purpose IN ('marketing','refill') AND status='pending'",
              [uid.id],
            );
          }
        }
      }
    }
  return { received: true, statusEvents: count };
}
