import { accountPassword } from "./password-policy";
import {appOrigin} from "./request-origin";
import { randomBytes, randomInt, createHmac } from "node:crypto";
import { z } from "zod";
import {
  allow,
  AppError,
  digest,
  hashPassword,
  id,
  issueSession,
  recentVerification,
  type Actor,
} from "./auth";
import { one, type SQL } from "./db";
import { audit } from "./governance";
import { enqueueChannel } from "./channel-messaging";
function otpDigest(value: string) {
  const secret = process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY;
  if (!secret || !/^[a-f0-9]{64}$/i.test(secret))
    throw new AppError(503, "Secure verification storage is not configured.");
  return createHmac("sha256", Buffer.from(secret, "hex"))
    .update(value)
    .digest("hex");
}
const token = z.string().regex(/^[a-f0-9]{64}$/);
export const publicPhoneActions = new Set([
  "phone.otp",
  "phone.review",
  "phone.complete",
]);
export async function phoneActivation(
  tx: SQL,
  user: Actor | null,
  action: string,
  input: unknown,
) {
  if (action === "phone.invite" || action === "phone.revoke") {
    if (!user) throw new AppError(401, "Sign in.");
    const d = z
      .object({
        orderId: z.string().uuid(),
        channel: z.enum(["sms", "whatsapp"]).default("sms"),
      })
      .strict()
      .parse(input);
    const o = await one(
      tx,
      "SELECT o.*,u.contact_phone,u.provisional FROM orders o JOIN users u ON u.id=o.customer_id WHERE o.id=$1 FOR UPDATE OF o",
      [d.orderId],
    );
    if (!o) throw new AppError(404, "Order not found.");
    allow(user, ["owner", "manager"], o.branch_id);
    recentVerification(user);
    await tx.query(
      "UPDATE phone_activations SET revoked_at=now() WHERE order_id=$1 AND consumed_at IS NULL AND revoked_at IS NULL",
      [o.id],
    );
    if (action === "phone.revoke") {
      await audit(tx, user, action, o.id);
      return { ok: true };
    }
    if (!o.provisional || !o.contact_phone)
      throw new AppError(
        409,
        "An unactivated provisional phone account is required.",
      );
    const recent = await one(
      tx,
      "SELECT count(*) AS n FROM phone_activations WHERE customer_id=$1 AND created_at>now()-interval '1 hour'",
      [o.customer_id],
    );
    if (Number(recent?.n) >= 3)
      throw new AppError(429, "Invitation limit reached. Use staff support.");
    const raw = randomBytes(32).toString("hex"),
      aid = id(),
      expires = new Date(Date.now() + 30 * 60000).toISOString();
    await tx.query(
      "INSERT INTO phone_activations(id,token_hash,order_id,customer_id,phone,expires_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        aid,
        digest(raw),
        o.id,
        o.customer_id,
        o.contact_phone,
        expires,
        user.id,
      ],
    );
    const origin = new URL(
      appOrigin(),
    );
    if (process.env.NODE_ENV === "production" && origin.protocol !== "https:")
      throw new AppError(503, "Secure public URL required.");
    const link = new URL("/activate", origin);
    link.hash = raw; // fragment is not sent in HTTP logs or referrers
    await enqueueChannel(tx, {
      userId: o.customer_id,
      channel: d.channel,
      purpose: "transactional",
      body: `Complete your EasyGas order securely: ${link}. Expires in 30 minutes.`,
      dedupe: `activation:${aid}`,
      template: process.env.META_ACTIVATION_TEMPLATE,
      expiresAt: expires,
    });
    await audit(tx, user, action, o.id);
    return { queued: true, expiresAt: expires };
  }
  const d = (
    action === "phone.complete"
      ? z.object({
          token,
          code: z.string().regex(/^\d{6}$/),
          password: accountPassword,
          termsAccepted: z.literal(true),
        })
      : action === "phone.review"
        ? z.object({ token, code: z.string().regex(/^\d{6}$/) })
        : z.object({
            token,
            channel: z.enum(["sms", "whatsapp"]).default("sms"),
          })
  )
    .strict()
    .parse(input);
  const a = await one(
    tx,
    "SELECT a.*,u.active,u.contact_phone,u.provisional,u.role FROM phone_activations a JOIN users u ON u.id=a.customer_id WHERE token_hash=$1 FOR UPDATE OF a,u",
    [digest(d.token)],
  );
  const invalid = {
    ok: false,
    message: "This link or code is unavailable. Request a new invitation.",
  };
  if (
    !a ||
    !a.active ||
    !a.provisional ||
    a.contact_phone !== a.phone ||
    a.revoked_at ||
    a.consumed_at ||
    new Date(a.expires_at).getTime() <= Date.now()
  )
    return invalid;
  if (action === "phone.otp") {
    const channel = (d as any).channel;
    if (
      process.env[
        channel === "sms" ? "EASYGAS_SMS_ENABLED" : "EASYGAS_WHATSAPP_ENABLED"
      ] !== "true"
    )
      return {
        ok: false,
        blocked: true,
        message:
          "Phone verification delivery is not configured. Please contact EasyGas.",
      };
    if (a.sent_at && Date.now() - new Date(a.sent_at).getTime() < 60000)
      return {
        ok: false,
        message: "Wait one minute before requesting another code.",
      };
    if (a.otp_attempts >= 5) return invalid;
    const code = String(randomInt(100000, 1000000));
    const expiry = new Date(Date.now() + 5 * 60000).toISOString();
    await tx.query(
      "UPDATE phone_activations SET otp_hash=$1,otp_expires_at=$2,sent_at=now(),otp_attempts=otp_attempts+1 WHERE id=$3",
      [otpDigest(`${a.id}:${code}`), expiry, a.id],
    );
    await enqueueChannel(tx, {
      userId: a.customer_id,
      channel,
      purpose: "otp",
      body: `Your EasyGas verification code is ${code}. Valid for 5 minutes. Do not share it with staff.`,
      dedupe: `otp:${a.id}:${id()}`,
      template: process.env.META_OTP_TEMPLATE,
      expiresAt: expiry,
    });
    return { ok: true, message: "Verification code queued." };
  }
  if (
    !a.otp_hash ||
    !a.otp_expires_at ||
    a.otp_attempts >= 10 ||
    new Date(a.otp_expires_at).getTime() <= Date.now()
  )
    return invalid;
  if (otpDigest(`${a.id}:${(d as any).code}`) !== a.otp_hash) {
    await tx.query(
      "UPDATE phone_activations SET otp_attempts=otp_attempts+1 WHERE id=$1",
      [a.id],
    );
    return invalid;
  } // Return, do not throw: failed-attempt counter must commit.
  if (action === "phone.review")
    return {
      ok: true,
      order: await one(
        tx,
        "SELECT reference,status,total_kobo,delivery_date,delivery_window,address FROM orders WHERE id=$1",
        [a.order_id],
      ),
    };
  await tx.query(
    "UPDATE phone_activations SET consumed_at=now(),verified_at=now(),otp_hash=NULL WHERE id=$1",
    [a.id],
  );
  await tx.query(
    "UPDATE users SET password_hash=$1,phone_verified_at=now(),onboarding_version=1,provisional=false WHERE id=$2",
    [hashPassword((d as any).password), a.customer_id],
  );
  await tx.query("UPDATE message_outbox SET status='cancelled' WHERE user_id=$1 AND status='pending' AND (dedupe_key LIKE 'activation:%' OR dedupe_key LIKE 'otp:%')",[a.customer_id]);
  await audit(tx,null,'phone.activated',a.customer_id,'success',{orderId:a.order_id,onboardingVersion:1});
  const session = await issueSession(tx, a.customer_id);
  return {
    ok: true,
    token: session,
    role: a.role,
    customerId: a.customer_id,
    orderId: a.order_id,
  };
}
