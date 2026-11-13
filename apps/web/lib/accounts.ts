import { accountPassword } from "./password-policy";
import { appOrigin } from "./request-origin";
import { latestDeliveryPhoto } from "./delivery-photos";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { type SQL, one } from "./db";
import {
  type Actor,
  id,
  digest,
  AppError,
  hashPassword,
  passwordMatches,
  recentVerification,
  allow,
} from "./auth";
import { audit, notify } from "./governance";
import { sealMessage, requireMessageEncryption } from "./channel-messaging";
const email = z
  .email()
  .max(200)
  .transform((v) => v.trim().toLowerCase());
const password = accountPassword;
export const publicAccountActions = new Set([
  "account.recover",
  "account.reset",
  "account.verify",
  "invitation.accept",
]);
const invitationCredentials = () => ({
  token: randomBytes(32).toString("hex"),
  password: generateTemporaryPassword(),
});
export async function accountAction(
  tx: SQL,
  action: string,
  user: Actor | null,
  input: unknown,
): Promise<any> {
  if (action === "account.recover") {
    const d = z.object({ email }).strict().parse(input);
    requireMessageEncryption();
    appOrigin();
    // Increment atomically so concurrent requests share one per-account limit.
    const key = digest(`recovery:${d.email}`);
    const recent = await one(
      tx,
      "INSERT INTO auth_attempts(key,attempts,reset_at) VALUES ($1,1,now()+interval '1 hour') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.reset_at<=now() THEN 1 ELSE LEAST(auth_attempts.attempts+1,4) END,reset_at=CASE WHEN auth_attempts.reset_at<=now() THEN now()+interval '1 hour' ELSE auth_attempts.reset_at END RETURNING attempts",
      [key],
    );
    if (Number(recent?.attempts) <= 3) {
      const u = await one(
        tx,
        "SELECT id,email FROM users WHERE email=$1 AND active=true AND provisional=false FOR UPDATE",
        [d.email],
      );
      if (u) await challenge(tx, { id: u.id, email: u.email }, "reset");
    }
    return {
      ok: true,
      message:
        "If this email matches an active EasyGas account, you’ll receive a password reset link. Check your inbox and spam folder.",
    };
  }
  if (action === "account.reset" || action === "account.verify") {
    const d = (
      action === "account.reset"
        ? z.object({ token: z.string().regex(/^[a-f0-9]{64}$/), password })
        : z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
    )
      .strict()
      .parse(input);
    const purpose = action === "account.reset" ? "reset" : "verify";
    const challengeOwner = await one(
      tx,
      "SELECT user_id FROM account_challenges WHERE token_hash=$1 AND purpose=$2",
      [digest(d.token), purpose],
    );
    const account = challengeOwner && await one(
      tx,
      "SELECT active,provisional,password_hash,temporary_password_expires_at FROM users WHERE id=$1 FOR UPDATE",
      [challengeOwner.user_id],
    );
    const c = account?.active && !account.provisional ? await one(
      tx,
      "SELECT * FROM account_challenges WHERE token_hash=$1 AND purpose=$2 FOR UPDATE",
      [digest(d.token), purpose],
    ) : null;
    if (
      !c ||
      c.consumed_at ||
      new Date(c.expires_at).getTime() <= Date.now()
    )
      throw new AppError(
        400,
        "This link has expired or has already been used. Request a new link.",
      );
    if ("password" in d && typeof d.password === "string") {
      if (account!.temporary_password_expires_at && passwordMatches(d.password, account!.password_hash))
        throw new AppError(400, "Choose a password different from your temporary password.");
      await tx.query("UPDATE users SET password_hash=$1,verified=(verified OR temporary_password_expires_at IS NOT NULL),temporary_password_expires_at=NULL WHERE id=$2", [
        hashPassword(d.password),
        c.user_id,
      ]);
      await tx.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1", [
        c.user_id,
      ]);
    } else
      await tx.query("UPDATE users SET verified=true WHERE id=$1", [c.user_id]);
    await tx.query(
      "UPDATE account_challenges SET consumed_at=now() WHERE user_id=$1 AND purpose=$2 AND consumed_at IS NULL",
      [c.user_id, purpose],
    );
    if (purpose === "reset" && account?.temporary_password_expires_at)
      await tx.query("UPDATE account_challenges SET consumed_at=now() WHERE user_id=$1 AND purpose='verify' AND consumed_at IS NULL", [c.user_id]);
    await audit(tx, null, action, c.user_id);
    await notify(
      tx,
      c.user_id,
      purpose === "reset" ? "Password changed" : "Email verified",
      purpose === "reset"
        ? "Your password changed. All existing sessions were signed out."
        : "Your email address has been verified.",
    );
    return { ok: true, message: purpose === "reset" ? "Password reset. Sign in with your new password." : "Your email address is verified." };
  }
  if (action === "invitation.accept") {
    const d = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password })
      .strict()
      .parse(input);
    const invitation = await one(
      tx,
      "SELECT i.*,u.active,u.role,u.branch_id AS inviter_branch_id,b.active AS branch_active FROM staff_invitations i JOIN users u ON u.id=i.invited_by JOIN branches b ON b.id=i.branch_id WHERE token_hash=$1 FOR UPDATE OF i",
      [digest(d.token)],
    );
    if (
      !invitation ||
      invitation.accepted_at ||
      new Date(invitation.expires_at).getTime() <= Date.now() ||
      !invitation.active ||
      !invitation.branch_active ||
      invitation.role !== "owner"
    )
      throw new AppError(400, "This invitation is no longer valid.");
    if (invitation.temporary_password_hash && !passwordMatches(d.password, invitation.temporary_password_hash))
      throw new AppError(400, "The temporary password does not match this invitation.");
    // Invitations create an unprivileged account. Staff access still requires the existing independent dual approval.
    const uid = id();
    const created = await one(tx,
      "INSERT INTO users(id,name,email,password_hash,role,branch_id,verified,temporary_password_expires_at) VALUES ($1,$2,$3,$4,'customer',$5,true,$6) ON CONFLICT(email) DO NOTHING RETURNING id",
      [
        uid,
        invitation.name,
        invitation.email,
        invitation.temporary_password_hash ?? hashPassword(d.password),
        invitation.branch_id,
        invitation.temporary_password_hash ? invitation.expires_at : null,
      ],
    );
    if (!created)
      throw new AppError(409, "This email already has an account. Ask your administrator to use the staff access workflow.");
    await tx.query(
      "UPDATE staff_invitations SET accepted_at=now() WHERE id=$1",
      [invitation.id],
    );
    await audit(tx, null, "invitation.accepted", uid);
    await notify(
      tx,
      invitation.invited_by,
      "Invitation accepted",
      `${invitation.name} accepted the invitation. Submit a staff access request for independent approval.`,
      uid,
    );
    return {
      ok: true,
      message: invitation.temporary_password_hash
        ? "Invitation accepted. Sign in with your temporary password, then choose a new password."
        : "Invitation accepted. Sign in with the password you just set.",
    };
  }
  if (!user) throw new AppError(401, "Please sign in.");
  if (action === "account.profile")
    return {
      user: await one(
        tx,
        "SELECT id,name,email,verified,public_customer_id,contact_phone,phone_verified_at,onboarding_version,provisional FROM users WHERE id=$1",
        [user.id],
      ),
      latestDeliveryPhoto: ["customer", "commercial"].includes(user.role)
        ? await latestDeliveryPhoto(tx, user)
        : null,
      deliveryLocations: (
        await tx.query(
          "SELECT l.id,l.name FROM delivery_locations l JOIN branches b ON b.id=l.branch_id WHERE l.active=true AND l.visible=true AND l.archived=false AND b.active=true ORDER BY l.display_order,l.name",
        )
      ).rows,
      addresses: (
        await tx.query(
          "SELECT a.*,COALESCE(l.active AND l.visible AND NOT l.archived AND b.active,false) AS location_available FROM account_addresses a LEFT JOIN delivery_locations l ON l.id=a.location_id LEFT JOIN branches b ON b.id=l.branch_id WHERE a.customer_id=$1 AND a.archived=false ORDER BY a.created_at",
          [user.id],
        )
      ).rows,
      preferences: (await one(
        tx,
        "SELECT marketing,refill_reminders,service_reminders,quiet_start,quiet_end FROM communication_preferences WHERE user_id=$1",
        [user.id],
      )) ?? {
        marketing: false,
        refill_reminders: true,
        quiet_start: 21,
        quiet_end: 8,
      },
      sessions: (
        await tx.query(
          "SELECT id,label,created_at,expires_at FROM sessions WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC",
          [user.id],
        )
      ).rows.map((s) => ({ ...s, current: s.id === user.session_id })),
      privacyRequests: (
        await tx.query(
          "SELECT * FROM privacy_requests WHERE user_id=$1 ORDER BY created_at DESC",
          [user.id],
        )
      ).rows,
    };
  if (action === "account.export") {
    z.object({}).strict().parse(input);
    recentVerification(user);
    const profile = await one(
      tx,
      "SELECT id,name,email,role,verified,created_at FROM users WHERE id=$1",
      [user.id],
    );
    const addresses = (
      await tx.query(
        "SELECT label,street,zone,phone,archived,created_at FROM account_addresses WHERE customer_id=$1",
        [user.id],
      )
    ).rows;
    const orders = (
      await tx.query(
        "SELECT id,reference,status,payment_status,total_kobo,address,delivery_date,created_at FROM orders WHERE customer_id=$1",
        [user.id],
      )
    ).rows;
    for (const order of orders)
      order.items = (
        await tx.query(
          "SELECT name,quantity,unit_price_kobo FROM order_items WHERE order_id=$1",
          [order.id],
        )
      ).rows;
    const support = (
      await tx.query(
        "SELECT id,subject,message,status,created_at FROM support_requests WHERE customer_id=$1",
        [user.id],
      )
    ).rows;
    for (const ticket of support)
      ticket.messages = (
        await tx.query(
          "SELECT body,created_at FROM support_messages WHERE request_id=$1 AND internal=false",
          [ticket.id],
        )
      ).rows;
    const testimonials = (
      await tx.query(
        "SELECT id,status,revision,current_version,created_at,updated_at,published_at FROM customer_testimonials WHERE customer_id=$1 ORDER BY created_at",
        [user.id],
      )
    ).rows;
    for (const testimonial of testimonials) {
      testimonial.versions = (
        await tx.query(
          "SELECT version,rating,body,display_name,name_style,public_location,consent,consent_at,image_id,photo_consent,created_at FROM testimonial_versions WHERE testimonial_id=$1 ORDER BY version",
          [testimonial.id],
        )
      ).rows;
      testimonial.events = (
        await tx.query(
          "SELECT action,from_status,to_status,revision,reason,created_at FROM testimonial_events WHERE testimonial_id=$1 ORDER BY created_at,revision",
          [testimonial.id],
        )
      ).rows;
    }
    await tx.query(
      "UPDATE privacy_requests SET status='completed' WHERE user_id=$1 AND kind='export' AND status='pending'",
      [user.id],
    );
    await audit(tx, user, "privacy.data_exported", user.id);
    return {
      exportedAt: new Date().toISOString(),
      issuedInvoices: (
        await tx.query(
          "SELECT id,invoice_number,order_id,booking_id,total_kobo,snapshot,issued_at FROM customer_invoices WHERE customer_id=$1 ORDER BY issued_at,id",
          [user.id],
        )
      ).rows,
      channelConsents: (
        await tx.query(
          "SELECT channel,purpose,enabled,version,evidence,updated_at FROM channel_consents WHERE user_id=$1",
          [user.id],
        )
      ).rows,
      deliveryPhotos: (
        await tx.query(
          "SELECT p.id,p.order_id,p.alt,p.captured_at,p.created_at,p.retain_until FROM delivery_photos p JOIN orders o ON o.id=p.order_id WHERE o.customer_id=$1",
          [user.id],
        )
      ).rows,
      driverTrips: (
        await tx.query(
          "SELECT id,vehicle_id,start_odometer,end_odometer,started_at,ended_at,location_consent FROM driver_trips WHERE driver_id=$1",
          [user.id],
        )
      ).rows,
      driverTripEvents: (
        await tx.query(
          "SELECT e.id,e.trip_id,e.sequence,e.kind,e.recorded_at,e.payload FROM trip_events e JOIN driver_trips t ON t.id=e.trip_id WHERE t.driver_id=$1",
          [user.id],
        )
      ).rows,

      profile,
      testimonials,
      addresses,
      orders,
      support,
      serviceBookings: (
        await tx.query(
          "SELECT id,reference,service_id,status,snapshot,checklist,checklist_version,address,equipment,notes,created_at FROM service_bookings WHERE customer_id=$1 ORDER BY created_at",
          [user.id],
        )
      ).rows,
      serviceReports: (
        await tx.query(
          "SELECT r.body,r.created_at FROM service_reports r JOIN service_bookings b ON b.id=r.booking_id WHERE b.customer_id=$1 ORDER BY r.created_at",
          [user.id],
        )
      ).rows,
      servicePayments: (
        await tx.query(
          "SELECT v.reference,v.amount_kobo,v.method,v.created_at FROM verified_payments v JOIN service_bookings b ON b.id=v.booking_id WHERE b.customer_id=$1 ORDER BY v.created_at",
          [user.id],
        )
      ).rows,
      serviceFollowups: (
        await tx.query(
          "SELECT id,booking_id,due_date,reason,dismissed_at,rebooked_id FROM service_followups WHERE customer_id=$1",
          [user.id],
        )
      ).rows,
      serviceImages: (
        await tx.query(
          "SELECT m.id,m.alt,m.created_at FROM media_assets m JOIN service_bookings b ON b.id=m.booking_id WHERE b.customer_id=$1 AND m.archived=false",
          [user.id],
        )
      ).rows,
      preferences: await one(
        tx,
        "SELECT marketing,refill_reminders,service_reminders,quiet_start,quiet_end FROM communication_preferences WHERE user_id=$1",
        [user.id],
      ),
      wallet: (
        await tx.query(
          "SELECT amount_kobo,kind,reference,created_at FROM wallet_entries WHERE customer_id=$1",
          [user.id],
        )
      ).rows,
      rewards: (
        await tx.query(
          "SELECT points,reference,created_at FROM reward_entries WHERE customer_id=$1",
          [user.id],
        )
      ).rows,
    };
  }
  if (action === "account.update") {
    const d = z
      .object({ name: z.string().trim().min(2).max(100) })
      .strict()
      .parse(input);
    await tx.query("UPDATE users SET name=$1 WHERE id=$2", [d.name, user.id]);
    await audit(tx, user, "account.updated", user.id);
    return { ok: true };
  }
  if (action === "account.password") {
    const d = z
      .object({ currentPassword: z.string().max(128), newPassword: password })
      .strict()
      .parse(input);
    const row = await one(
      tx,
      "SELECT password_hash FROM users WHERE id=$1 FOR UPDATE",
      [user.id],
    );
    if (!passwordMatches(d.currentPassword, row!.password_hash))
      throw new AppError(
        403,
        "Password verification failed.",
        "REAUTH_INVALID",
      );
    await tx.query("UPDATE users SET password_hash=$1 WHERE id=$2", [
      hashPassword(d.newPassword),
      user.id,
    ]);
    await tx.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1", [
      user.id,
    ]);
    await tx.query("UPDATE account_challenges SET consumed_at=now() WHERE user_id=$1 AND purpose='reset' AND consumed_at IS NULL", [user.id]);
    await audit(tx, user, "account.password_changed", user.id);
    return { ok: true, signedOut: true };
  }
  if (action === "account.verification.send") {
    const row = await one(tx, "SELECT verified,email FROM users WHERE id=$1 FOR UPDATE", [
      user.id,
    ]);
    if (row!.verified) return { ok: true };
    const existing = await one(
      tx,
      "SELECT id FROM account_challenges WHERE user_id=$1 AND purpose='verify' AND created_at>now()-interval '5 minutes'",
      [user.id],
    );
    if (existing)
      throw new AppError(
        429,
        "Wait five minutes before requesting another verification message.",
      );
    await challenge(tx, { id: user.id, email: user.email }, "verify");
    return { ok: true };
  }
  if (action === "account.session.revoke") {
    const d = z
      .object({ id: z.string().regex(/^[a-f0-9]{64}$/) })
      .strict()
      .parse(input);
    await tx.query(
      "UPDATE sessions SET revoked_at=now() WHERE id=$1 AND user_id=$2",
      [d.id, user.id],
    );
    await audit(tx, user, "account.session_revoked", d.id);
    return { ok: true, signedOut: d.id === user.session_id };
  }
  if (action === "address.save") {
    const d = z
      .object({
        id: z.string().uuid().optional(),
        isDefault: z.boolean().optional(),
        locationId: z.string().max(100).optional(),
        building: z.string().max(100).optional(),
        landmark: z.string().max(250).optional(),
        directions: z.string().max(500).optional(),
        recipient: z.string().max(100).optional(),
        label: z.string().trim().min(2).max(40),
        street: z.string().trim().min(5).max(250),
        zone: z.string().trim().max(100).default(""),
        phone: z.string().regex(/^(?:\+234|0)[789][01]\d{8}$/),
      })
      .strict()
      .parse(input);
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
    const location = await one(
      tx,
      "SELECT l.id,l.name FROM delivery_locations l JOIN branches b ON b.id=l.branch_id WHERE l.active=true AND l.visible=true AND l.archived=false AND b.active=true AND (($1::text IS NOT NULL AND l.id=$1) OR ($1::text IS NULL AND lower(l.name)=lower($2)))",
      [d.locationId ?? null, d.zone],
    );
    if (!location)
      throw new AppError(400, "Choose an active supported delivery location.");
    d.zone = location.name;
    const aid = d.id ?? id();
    if (d.id) {
      const a = await one(
        tx,
        "UPDATE account_addresses SET label=$1,street=$2,zone=$3,phone=$4 WHERE id=$5 AND customer_id=$6 AND archived=false RETURNING id",
        [d.label, d.street, d.zone, d.phone, aid, user.id],
      );
      if (!a) throw new AppError(404, "Address not found.");
    } else {
      if (
        Number(
          (await one(
            tx,
            "SELECT count(*) AS n FROM account_addresses WHERE customer_id=$1 AND archived=false",
            [user.id],
          ))!.n,
        ) >= 20
      )
        throw new AppError(400, "You can save up to 20 addresses.");
      await tx.query(
        "INSERT INTO account_addresses(id,customer_id,label,street,zone,phone) VALUES ($1,$2,$3,$4,$5,$6)",
        [aid, user.id, d.label, d.street, d.zone, d.phone],
      );
    }
    await tx.query(
      "UPDATE account_addresses SET location_id=$1,details=$2 WHERE id=$3 AND customer_id=$4",
      [
        location.id,
        JSON.stringify({
          building: d.building,
          landmark: d.landmark,
          directions: d.directions,
          recipient: d.recipient,
        }),
        aid,
        user.id,
      ],
    );
    if (d.isDefault) {
      await tx.query(
        "UPDATE account_addresses SET is_default=false WHERE customer_id=$1",
        [user.id],
      );
      await tx.query(
        "UPDATE account_addresses SET is_default=true WHERE id=$1 AND customer_id=$2",
        [aid, user.id],
      );
    }
    return { id: aid };
  }
  if (action === "address.default") {
    const d = z.object({ id: z.string().uuid() }).strict().parse(input);
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
    const a = await one(
      tx,
      "SELECT a.id FROM account_addresses a JOIN delivery_locations l ON l.id=a.location_id JOIN branches b ON b.id=l.branch_id WHERE b.active=true AND a.id=$1 AND a.customer_id=$2 AND NOT a.archived AND l.active AND l.visible AND NOT l.archived",
      [d.id, user.id],
    );
    if (!a) throw new AppError(404, "Available saved address not found.");
    await tx.query(
      "UPDATE account_addresses SET is_default=false WHERE customer_id=$1",
      [user.id],
    );
    await tx.query("UPDATE account_addresses SET is_default=true WHERE id=$1", [
      d.id,
    ]);
    return { ok: true };
  }
  if (action === "address.archive") {
    const d = z.object({ id: z.string().uuid() }).strict().parse(input);
    await tx.query(
      "UPDATE account_addresses SET archived=true WHERE id=$1 AND customer_id=$2",
      [d.id, user.id],
    );
    return { ok: true };
  }
  if (action === "preferences.save") {
    const d = z
      .object({
        marketing: z.boolean(),
        refillReminders: z.boolean(),
        serviceReminders: z.boolean().optional(),
        quietStart: z.number().int().min(0).max(23),
        quietEnd: z.number().int().min(0).max(23),
      })
      .strict()
      .parse(input);
    await tx.query(
      "INSERT INTO communication_preferences(user_id,marketing,refill_reminders,quiet_start,quiet_end,service_reminders) VALUES ($1,$2,$3,$4,$5,COALESCE($6,true)) ON CONFLICT(user_id) DO UPDATE SET marketing=$2,refill_reminders=$3,quiet_start=$4,quiet_end=$5,service_reminders=COALESCE($6,communication_preferences.service_reminders),updated_at=now()",
      [
        user.id,
        d.marketing,
        d.refillReminders,
        d.quietStart,
        d.quietEnd,
        d.serviceReminders ?? null,
      ],
    );
    await audit(tx, user, "communication.preferences_changed", user.id);
    return { ok: true };
  }
  if (action === "privacy.request") {
    const d = z
      .object({
        kind: z.enum(["deletion", "export"]),
        reason: z.string().trim().min(5).max(1000),
      })
      .strict()
      .parse(input);
    recentVerification(user);
    if (d.kind === "deletion") {
      await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
      const prior = await one(
        tx,
        "SELECT id,status FROM privacy_requests WHERE user_id=$1 AND kind='deletion' AND status IN ('pending','retained') ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
        [user.id],
      );
      if (prior?.status === "retained")
        return {
          ok: true,
          status: "retained",
          message:
            "EasyGas retains all records under its current business retention policy. Your records have not been deleted. You can export your personal data.",
        };
      const requestId = prior?.id ?? id();
      if (prior)
        await tx.query(
          "UPDATE privacy_requests SET status='retained' WHERE id=$1",
          [requestId],
        );
      else
        await tx.query(
          "INSERT INTO privacy_requests(id,user_id,kind,reason,status) VALUES($1,$2,'deletion',$3,'retained')",
          [requestId, user.id, d.reason],
        );
      await audit(tx, user, "privacy.retention_applied", requestId, "success", {
        policy: "retain-all-20261108",
        deletionPerformed: false,
      });
      return {
        ok: true,
        status: "retained",
        message:
          "EasyGas retains all records under its current business retention policy. Your records have not been deleted. You can export your personal data.",
      };
    }
    if (
      await one(
        tx,
        "SELECT id FROM privacy_requests WHERE user_id=$1 AND kind=$2 AND status='pending'",
        [user.id, d.kind],
      )
    )
      return { ok: true };
    const rid = id();
    await tx.query(
      "INSERT INTO privacy_requests(id,user_id,kind,reason) VALUES ($1,$2,$3,$4)",
      [rid, user.id, d.kind, d.reason],
    );
    await audit(tx, user, "privacy.requested", rid);
    return { ok: true };
  }
  if (action === "notifications.read") {
    const d = z.object({ id: z.string().uuid() }).strict().parse(input);
    await tx.query(
      "UPDATE notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND user_id=$2",
      [d.id, user.id],
    );
    return { ok: true };
  }
  if (action === "staff.invite") {
    allow(user, ["owner"]);
    recentVerification(user);
    const d = z
      .object({
        email,
        name: z.string().trim().min(2).max(100),
        branchId: z.string().min(1).max(100),
      })
      .strict()
      .parse(input);
    if (
      !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
        d.branchId,
      ]))
    )
      throw new AppError(400, "Choose an active branch.");
    allow(user, ["owner"], d.branchId);
    await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      "staff-invite:" + d.email,
    ]);
    if (await one(tx, "SELECT id FROM users WHERE email=$1", [d.email]))
      throw new AppError(
        409,
        "This account already exists. Use the governed access workflow.",
      );
    if (
      await one(
        tx,
        "SELECT id FROM staff_invitations WHERE email=$1 AND accepted_at IS NULL AND expires_at>now()",
        [d.email],
      )
    )
      throw new AppError(
        409,
        "An active invitation already exists. Resend or revoke it from Staff Management.",
      );
    const { token, password: temporaryPassword } = invitationCredentials();
    const iid = id();
    await tx.query(
      "INSERT INTO staff_invitations(id,email,name,branch_id,invited_by,token_hash,expires_at,temporary_password_hash) VALUES ($1,$2,$3,$4,$5,$6,now()+interval '48 hours',$7)",
      [iid, d.email, d.name, d.branchId, user.id, digest(token), hashPassword(temporaryPassword)],
    );
    await queueMessage(
      tx,
      user.id,
      d.email,
      "EasyGas invitation",
      staffInvitationBody(token, temporaryPassword),
      `invite:${iid}:${digest(token)}`,
      true,
    );
    await audit(tx, user, "staff.invited", iid);
    return {
      ok: true,
      invitationId: iid,
      message: "Invitation email queued. The recipient has 48 hours to accept and use their temporary password.",
    };
  }
  if (
    action === "staff.invitation.revoke" ||
    action === "staff.invitation.resend"
  ) {
    allow(user, ["owner"]);
    recentVerification(user);
    const d = z.object({ id: z.string().uuid() }).strict().parse(input);
    const i = await one(
      tx,
      "SELECT * FROM staff_invitations WHERE id=$1 FOR UPDATE",
      [d.id],
    );
    if (!i) throw new AppError(404, "Invitation not found.");
    allow(user, ["owner"], i.branch_id);
    if (i.accepted_at)
      throw new AppError(
        409,
        "This invitation has already been accepted. Manage the staff account instead.",
      );
    if (action === "staff.invitation.revoke") {
      await tx.query(
        "UPDATE staff_invitations SET expires_at=now()-interval '1 second' WHERE id=$1",
        [i.id],
      );
      await tx.query(
        "UPDATE message_outbox SET status='cancelled' WHERE dedupe_key LIKE $1 AND status IN ('pending','failed')",
        ["invite:" + i.id + "%"],
      );
      await audit(tx, user, "staff.invitation_revoked", i.id);
      return { ok: true };
    }
    await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["staff-invite:" + i.email]);
    if (
      !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
        i.branch_id,
      ]))
    )
      throw new AppError(409, "The invitation branch is inactive.");
    if (await one(tx, "SELECT id FROM users WHERE email=$1", [i.email]))
      throw new AppError(
        409,
        "This account already exists. Use its access request controls.",
      );
    if (await one(tx, "SELECT id FROM staff_invitations WHERE email=$1 AND id<>$2 AND accepted_at IS NULL AND expires_at>now()", [i.email, i.id]))
      throw new AppError(409, "A newer invitation already exists for this email. Resend that invitation instead.");
    const { token, password: temporaryPassword } = invitationCredentials();
    await tx.query(
      "UPDATE staff_invitations SET token_hash=$1,expires_at=now()+interval '48 hours',invited_by=$2,temporary_password_hash=$3 WHERE id=$4",
      [digest(token), user.id, hashPassword(temporaryPassword), i.id],
    );
    await tx.query(
      "UPDATE message_outbox SET status='cancelled' WHERE dedupe_key LIKE $1 AND status IN ('pending','failed')",
      ["invite:" + i.id + "%"],
    );
    await queueMessage(
      tx,
      user.id,
      i.email,
      "EasyGas invitation",
      staffInvitationBody(token, temporaryPassword),
      `invite:${i.id}:${digest(token)}`,
      true,
    );
    await audit(tx, user, "staff.invitation_resent", i.id);
    return { ok: true, message: "A new invitation email is queued. The previous link and temporary password have been replaced." };
  }
  if (action === "staff.suspend") {
    allow(user, ["owner"]);
    recentVerification(user);
    const d = z
      .object({
        userId: z.string().uuid(),
        reason: z.string().min(10).max(1000),
      })
      .strict()
      .parse(input);
    const target = await one(
      tx,
      "SELECT role FROM users WHERE id=$1 FOR UPDATE",
      [d.userId],
    );
    if (!target || target.role === "owner" || d.userId === user.id)
      throw new AppError(403, "Owner and self suspension are prohibited.");
    if (["customer", "commercial"].includes(target.role))
      throw new AppError(400, "Use the customer account review process.");
    await tx.query("UPDATE users SET active=false WHERE id=$1", [d.userId]);
    await tx.query("UPDATE sessions SET revoked_at=now() WHERE user_id=$1", [
      d.userId,
    ]);
    await audit(tx, user, "staff.suspended", d.userId, "success", {
      reason: d.reason,
    });
    return { ok: true };
  }
  return undefined;
}
export function generateTemporaryPassword() {
  return randomBytes(24).toString("base64url");
}
function staffInvitationBody(token: string, temporaryPassword: string) {
  return [
    "You’ve been invited to join EasyGas.",
    `Temporary password: ${temporaryPassword}`,
    `Accept your invitation: ${appOrigin()}/accept-invitation#token=${token}&setup=temporary`,
    "Use the temporary password to accept. Then sign in and choose a new password. The invitation and temporary password expire after 48 hours.",
  ].join("\n\n");
}
export async function queueMessage(
  tx: SQL,
  userId: string,
  recipient: string,
  subject: string,
  body: string,
  key: string,
  confidential = false,
) {
  await tx.query(
    "INSERT INTO message_outbox(id,user_id,channel,recipient,subject,body,dedupe_key) VALUES ($1,$2,'email',$3,$4,$5,$6) ON CONFLICT(dedupe_key) DO NOTHING",
    [id(), userId, recipient, subject, confidential ? sealMessage(body) : body, key],
  );
}
export async function challenge(
  tx: SQL,
  u: { id: string; email: string },
  purpose: "reset" | "verify",
  temporaryPassword?: string,
) {
  const token = randomBytes(32).toString("hex"),
    cid = id();
  await tx.query(
    "UPDATE account_challenges SET consumed_at=now() WHERE user_id=$1 AND purpose=$2 AND consumed_at IS NULL",
    [u.id, purpose],
  );
  await tx.query(
    "INSERT INTO account_challenges(id,user_id,purpose,token_hash,expires_at) VALUES ($1,$2,$3,$4,now()+CASE WHEN $5::boolean THEN interval '48 hours' ELSE interval '30 minutes' END)",
    [cid, u.id, purpose, digest(token), Boolean(temporaryPassword)],
  );
  await queueMessage(
    tx,
    u.id,
    u.email,
    temporaryPassword
      ? "Accept your EasyGas account"
      : purpose === "reset"
      ? "Reset your EasyGas password"
      : "Verify your EasyGas email",
    temporaryPassword
      ? `Your EasyGas account is ready to accept.\n\nTemporary password: ${temporaryPassword}\n\nAccept your account: ${appOrigin()}/verify-email#token=${token}\n\nSign in with your temporary password and choose a new one. The link and temporary password expire after 48 hours.`
      : purpose === "reset"
      ? `Use this link to choose a new password for your EasyGas account. It expires in 30 minutes.\n\n${appOrigin()}/reset-password#token=${token}\n\nIf you didn’t request a reset, you can ignore this email.`
      : `${appOrigin()}/verify-email#token=${token}`,
    `challenge:${cid}`,
    Boolean(temporaryPassword) || purpose === "reset",
  );
}
