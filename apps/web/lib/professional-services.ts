import { serviceDocument } from "../../../packages/business-rules/src/service-document";
import { serviceMaterialRecoveryAction } from "./service-material-recovery";
import { serviceSettlementSource } from "./service-settlement-source";
import { serviceSettlements } from "./service-settlements";
import { invoiceBalance } from "./invoice-corrections";
import { serviceRefundAllowance } from "./service-refunds";
import { technicianSummary } from "./technician-mobile";
import { enqueueServiceReward } from "./reward-services";
import { nextServiceMessageAt } from "../../../packages/business-rules/src/quiet-hours";
import { z } from "zod";
import { one, type SQL, type Row } from "./db";
import {
  allow,
  recentVerification,
  AppError,
  id,
  digest,
  type Actor,
} from "./auth";
import { audit, notify, propose } from "./governance";
import { serviceConfig, checklistConfig } from "./service-schema";
const uuid = z.string().uuid(),
  reason = z.string().trim().min(5).max(2000),
  scope = z.string().min(1).max(100);
const managers = ["owner", "service_manager"];
const terminal = ["completed", "cancelled", "failed"];
const money = z.number().int().min(0).max(100000000);
export const bookingInput = z
  .object({
    serviceId: scope,
    branchId: scope.default("lagos"),
    serviceVersion: z.number().int().positive(),
    slotId: uuid,
    address: z
      .object({
        street: z.string().min(8).max(250),
        zone: z.string().min(2).max(100),
        phone: z.string().regex(/^(?:\+234|0)[789][01]\d{8}$/),
      })
      .strict(),
    equipment: z
      .object({
        brand: z.string().max(100),
        type: z.string().min(2).max(100),
        burners: z.number().int().min(0).max(20),
        newEquipment: z.boolean(),
        supplyPresent: z.boolean(),
        concerns: z.string().min(5).max(2000),
      })
      .strict(),
    notes: z.string().max(2000).default(""),
    idempotencyKey: uuid,
    recommendationId: uuid.optional(),
    followupId: uuid.optional(),
  })
  .strict();
async function eligible(
  tx: SQL,
  uid: string,
  branch: string,
  qualification: string,
) {
  const u = await one(
    tx,
    "SELECT id FROM users WHERE id=$1 AND active=true AND role='technician' AND branch_id=$2",
    [uid, branch],
  );
  const q = await one(
    tx,
    "SELECT q.id FROM technician_qualifications q JOIN users v ON v.id=q.verified_by WHERE q.user_id=$1 AND q.code=$2 AND q.expires_at>now() AND v.active=true AND v.role IN ('owner','safety_officer') AND (v.role='owner' OR v.branch_id=$3)",
    [uid, qualification, branch],
  );
  if (!u || !q)
    throw new AppError(
      409,
      "The technician lacks a current independently verified qualification for this branch and service.",
    );
}
async function booking(tx: SQL, user: Actor, bid: string, write = false) {
  const b = await one(
    tx,
    `SELECT b.*,s.starts_at,s.ends_at FROM service_bookings b JOIN service_slots s ON s.id=b.slot_id WHERE b.id=$1 ${write ? "FOR UPDATE OF b" : ""}`,
    [bid],
  );
  if (!b) throw new AppError(404, "Booking not found.");
  if (["customer", "commercial"].includes(user.role)) {
    if (b.customer_id !== user.id)
      throw new AppError(404, "Booking not found.");
  } else if (user.role === "technician") {
    allow(user, ["technician"], b.branch_id);
    if (b.technician_id !== user.id)
      throw new AppError(
        403,
        "This appointment is assigned to another technician.",
      );
  } else
    allow(
      user,
      [...managers, "finance", "inventory", "safety_officer"],
      b.branch_id,
    );
  if (user.role === "technician" && user.technician_service_only)
    await eligible(tx, user.id, b.branch_id, b.snapshot.qualification);
  return b;
}
async function technician(tx: SQL, user: Actor, b: Row) {
  allow(user, ["technician"], b.branch_id);
  if (b.technician_id !== user.id)
    throw new AppError(
      403,
      "Only the assigned technician may perform this action.",
    );
  if (
    !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
      b.branch_id,
    ]))
  )
    throw new AppError(409, "This service branch is inactive.");
  await eligible(tx, user.id, b.branch_id, b.snapshot.qualification);
}
async function event(
  tx: SQL,
  user: Actor,
  b: Row,
  status: string,
  note: string,
) {
  await tx.query(
    "UPDATE service_bookings SET status=$1,version=version+1 WHERE id=$2",
    [status, b.id],
  );
  const eventId = id();
  await tx.query(
    "INSERT INTO service_booking_events(id,booking_id,actor_id,status,note) VALUES ($1,$2,$3,$4,$5)",
    [eventId, b.id, user.id, status, note],
  );
  await notify(
    tx,
    b.customer_id,
    "Service booking update",
    `${b.reference}: ${status.replaceAll("_", " ")}. ${note}`,
    b.id,
  );
  const preference = await one(
    tx,
    "SELECT u.email,u.active,COALESCE(p.service_reminders,true) AS enabled,COALESCE(p.quiet_start,21) AS start,COALESCE(p.quiet_end,8) AS finish FROM users u LEFT JOIN communication_preferences p ON p.user_id=u.id WHERE u.id=$1",
    [b.customer_id],
  );
  if (preference?.active && preference.enabled)
    await tx.query(
      "INSERT INTO message_outbox(id,user_id,channel,recipient,subject,body,dedupe_key,next_attempt_at) VALUES($1,$2,'email',$3,'Service booking update',$4,$5,$6) ON CONFLICT(dedupe_key) DO NOTHING",
      [
        id(),
        b.customer_id,
        preference.email,
        `${b.reference}: ${status.replaceAll("_", " ")}. Open My Bookings for details.`,
        `service-event:${eventId}`,
        nextServiceMessageAt(
          new Date(),
          preference.start,
          preference.finish,
        ).toISOString(),
      ],
    );
  if (b.technician_id && b.technician_id !== user.id)
    await notify(
      tx,
      b.technician_id,
      "Service appointment update",
      `${b.reference}: ${status.replaceAll("_", " ")}.`,
      b.id,
    );
  await audit(tx, user, "service." + status, b.id);
}
async function latestQuote(tx: SQL, bid: string) {
  return one(
    tx,
    "SELECT q.*,d.approved FROM service_quotes q LEFT JOIN service_quote_decisions d ON d.quote_id=q.id WHERE q.booking_id=$1 ORDER BY q.revision DESC LIMIT 1",
    [bid],
  );
}
async function balance(tx: SQL, b: Row) {
  const q = await latestQuote(tx, b.id);
  const report = await one(
    tx,
    "SELECT body FROM service_reports WHERE booking_id=$1",
    [b.id],
  );
  const exception = ["failed", "cancelled"].includes(b.status);
  const settlement = exception ? await serviceSettlementSource(tx, b) : null;
  const total = exception
    ? (settlement?.totalKobo ?? null)
    : report
      ? Number(report.body.invoiceTotalKobo)
      : q?.approved
        ? Number(q.total_kobo)
        : b.snapshot.pricingModel === "fixed"
          ? Number(b.snapshot.priceKobo) + Number(b.snapshot.calloutKobo)
          : null;
  const paid = Number(
    (await one(
      tx,
      "SELECT COALESCE(sum(amount_kobo),0) AS n FROM verified_payments WHERE booking_id=$1",
      [b.id],
    ))!.n,
  );
  const refundState = await one(
    tx,
    "SELECT COALESCE(sum(amount_kobo),0) AS n,COALESCE(bool_or(service_refund_scope='service'),false) AS review FROM credit_requests WHERE booking_id=$1 AND status='approved' AND kind='refund'",
    [b.id],
  );
  const refunded = Number(refundState!.n);
  const paymentReviewRequired =
    refundState!.review === true ||
    Boolean(
      await one(
        tx,
        "SELECT id FROM operational_incidents WHERE category='service_dispute' AND target=$1 AND status<>'resolved'",
        [b.id],
      ),
    );
  return {
    walletEnabled: Boolean(
      await one(
        tx,
        "SELECT key FROM settings WHERE key='wallet.enabled' AND scope=$1 AND value='true'::jsonb",
        [b.branch_id],
      ),
    ),
    totalKobo: total,
    paidKobo: paid,
    refundedKobo: refunded,
    paymentReviewRequired,
    dueKobo:
      total === null || paymentReviewRequired
        ? null
        : Math.max(0, total - paid + refunded),
    overpaidKobo: total === null ? 0 : Math.max(0, paid - refunded - total),
  };
}
// One guard for all chargeable effects. Never infer payment from client fields.
export async function serviceWorkAuthority(
  tx: SQL,
  b: Row,
  requireStarted = true,
) {
  const active = await one(
    tx,
    "SELECT id FROM branches WHERE id=$1 AND active=true FOR UPDATE",
    [b.branch_id],
  );
  if (!active) throw new AppError(409, "This service branch is inactive.");
  await eligible(tx, b.technician_id, b.branch_id, b.snapshot.qualification);
  const q = await latestQuote(tx, b.id);
  if (q) {
    if (!q.approved)
      throw new AppError(
        409,
        "Customer approval of the latest quotation is required before chargeable work.",
      );
    if (q.valid_until && Date.parse(q.valid_until) <= Date.now())
      throw new AppError(
        409,
        "The quotation has expired; request a revised quotation.",
      );
    const approval = await one(
      tx,
      "SELECT key FROM settings WHERE key=$1 AND scope=$2 AND value='true'::jsonb",
      ["service_quote." + q.id, b.branch_id],
    );
    if (!approval)
      throw new AppError(
        409,
        "Independent business approval of this quotation is required before chargeable work.",
      );
  } else if (b.snapshot.pricingModel !== "fixed")
    throw new AppError(
      409,
      "An approved quotation is required before chargeable work.",
    );
  const billing = await balance(tx, b);
  const invoice = await one(
    tx,
    "SELECT * FROM customer_invoices WHERE booking_id=$1",
    [b.id],
  );
  if (invoice) {
    const invoiceState = await invoiceBalance(tx, invoice);
    if (
      invoiceState.voided ||
      invoiceState.notes.some((n) => n.state === "pending") ||
      invoiceState.totalKobo !== billing.totalKobo
    )
      throw new AppError(
        409,
        "Reconcile the service invoice and current approved scope before chargeable work.",
      );
  }

  if (billing.dueKobo === null || billing.dueKobo > 0)
    throw new AppError(
      409,
      "Verified payment of the authorised scope is required before chargeable work.",
    );
  if (
    requireStarted &&
    (b.work_phase !== "authorised" || (q?.id ?? null) !== b.work_quote_id)
  )
    throw new AppError(
      409,
      "Start the currently authorised service work first.",
    );
  return { quoteId: q?.id ?? null, billing };
}
async function validateSlot(
  tx: SQL,
  sid: string,
  serviceId: string,
  branch: string,
  ignore?: string,
) {
  const slot = await one(
    tx,
    "SELECT * FROM service_slots WHERE id=$1 FOR UPDATE",
    [sid],
  );
  if (
    !slot ||
    slot.service_id !== serviceId ||
    slot.branch_id !== branch ||
    slot.blocked ||
    Date.parse(slot.starts_at) <= Date.now()
  )
    throw new AppError(409, "This appointment is no longer available.");
  const config = (
    await one(
      tx,
      "SELECT config FROM service_catalogue WHERE id=$1 AND branch_id=$2",
      [serviceId, branch],
    )
  )?.config;
  if (!config?.active)
    throw new AppError(409, "Service booking is not enabled.");
  await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
    slot.technician_id,
  ]);
  await eligible(tx, slot.technician_id, branch, config.qualification);
  if (
    Date.parse(slot.ends_at) - Date.parse(slot.starts_at) !==
      config.durationMinutes * 60000 ||
    !(await one(
      tx,
      "SELECT id FROM technician_qualifications WHERE user_id=$1 AND code=$2 AND expires_at>$3",
      [slot.technician_id, config.qualification, slot.ends_at],
    ))
  )
    throw new AppError(
      409,
      "The appointment duration or qualification changed. Choose another time.",
    );
  const overlap = await one(
    tx,
    "SELECT b.id FROM service_bookings b JOIN service_slots s ON s.id=b.slot_id WHERE b.technician_id=$1 AND b.status NOT IN ('completed','cancelled','failed') AND ($4::text IS NULL OR b.id<>$4) AND s.starts_at<$3 AND s.ends_at>$2 LIMIT 1",
    [slot.technician_id, slot.starts_at, slot.ends_at, ignore ?? null],
  );
  if (overlap)
    throw new AppError(
      409,
      "That technician is already booked during this appointment. Choose another time.",
    );
  return slot;
}
export async function professionalServiceAction(
  tx: SQL,
  action: string,
  user: Actor | null,
  input: unknown,
): Promise<any> {
  if (action === "technician.restrict") {
    if (!user) throw new AppError(401, "Sign in first.");
    allow(user, ["technician"]);
    z.object({}).strict().parse(input);
    await tx.query(
      "UPDATE sessions SET technician_service_only=true WHERE id=$1 AND user_id=$2",
      [user.session_id, user.id],
    );
    return { ok: true };
  }
  if (["technician.snapshot", "technician.availability"].includes(action)) {
    if (!user) throw new AppError(401, "Sign in first.");
    allow(user, ["technician"]);
    const branch = await one(
      tx,
      "SELECT id FROM branches WHERE id=$1 AND active=true",
      [user.branch_id],
    );
    if (!branch) throw new AppError(409, "Your branch is inactive.");
    if (action === "technician.availability") {
      const d = z.object({ available: z.boolean() }).strict().parse(input);
      await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
      if (
        !d.available &&
        (await one(
          tx,
          "SELECT id FROM service_bookings WHERE technician_id=$1 AND status IN ('en_route','in_progress','awaiting_customer_approval') LIMIT 1",
          [user.id],
        ))
      )
        throw new AppError(
          409,
          "Reconcile active visits with operations before going unavailable.",
        );
      await tx.query(
        "UPDATE users SET technician_available=$1,technician_availability_updated_at=now() WHERE id=$2",
        [d.available, user.id],
      );
      await audit(tx, user, "technician.availability", user.id, "success", {
        available: d.available,
      });
      return { available: d.available };
    }
    return {
      ...(await technicianSummary(tx, user)),
      profile: await one(
        tx,
        "SELECT id,name,email,branch_id,technician_available,active,created_at FROM users WHERE id=$1",
        [user.id],
      ),
      qualifications: (
        await tx.query(
          "SELECT code,expires_at FROM technician_qualifications WHERE user_id=$1",
          [user.id],
        )
      ).rows,
    };
  }
  if (action === "services.catalogue") {
    const d = z
      .object({ branch: scope.default("lagos") })
      .strict()
      .parse(input);
    return (
      await tx.query(
        "SELECT s.id,s.branch_id,s.name,s.config,s.version,(SELECT id FROM media_assets m WHERE m.service_id=s.id AND m.branch_id=s.branch_id AND m.archived=false ORDER BY position,created_at LIMIT 1) AS image_id FROM service_catalogue s WHERE branch_id=$1 AND (config->>'active')::boolean=true ORDER BY name",
        [d.branch],
      )
    ).rows;
  }
  if (action === "services.slots") {
    const d = z
      .object({ serviceId: scope, branchId: scope.default("lagos") })
      .strict()
      .parse(input);
    const service = await one(
      tx,
      "SELECT config FROM service_catalogue WHERE id=$1 AND branch_id=$2 AND (config->>'active')::boolean=true",
      [d.serviceId, d.branchId],
    );
    if (!service) return [];
    return (
      await tx.query(
        "SELECT s.id,s.starts_at,s.ends_at FROM service_slots s JOIN users u ON u.id=s.technician_id JOIN branches b ON b.id=s.branch_id WHERE s.service_id=$1 AND s.branch_id=$2 AND s.blocked=false AND b.active=true AND u.active=true AND u.role='technician' AND u.branch_id=s.branch_id AND s.starts_at>now() AND s.starts_at<now()+interval '60 days' AND EXISTS(SELECT 1 FROM technician_qualifications q JOIN users v ON v.id=q.verified_by WHERE q.user_id=u.id AND q.code=$3 AND q.expires_at>s.ends_at AND v.active=true AND v.role IN ('owner','safety_officer') AND (v.role='owner' OR v.branch_id=s.branch_id)) AND NOT EXISTS(SELECT 1 FROM service_bookings x JOIN service_slots y ON y.id=x.slot_id WHERE x.technician_id=u.id AND x.status NOT IN ('completed','cancelled','failed') AND y.starts_at<s.ends_at AND y.ends_at>s.starts_at) ORDER BY s.starts_at LIMIT 100",
        [d.serviceId, d.branchId, service.config.qualification],
      )
    ).rows;
  }
  if (!user) throw new AppError(401, "Please sign in.");
  if (action === "services.manage") {
    allow(user, [
      ...managers,
      "safety_officer",
      "technician",
      "inventory",
      "finance",
    ]);
    const branch = user.branch_id ?? "lagos";
    return {
      services: (
        await tx.query(
          "SELECT * FROM service_catalogue WHERE branch_id=$1 ORDER BY name",
          [branch],
        )
      ).rows,
      staff: (
        await tx.query(
          "SELECT id,name,role FROM users WHERE active=true AND branch_id=$1 AND role IN ('technician','safety_officer') ORDER BY name",
          [branch],
        )
      ).rows,
      qualifications: (
        await tx.query(
          "SELECT q.id,q.user_id,q.code,q.evidence,q.expires_at,q.verified_by FROM technician_qualifications q JOIN users u ON u.id=q.user_id WHERE u.branch_id=$1",
          [branch],
        )
      ).rows,
      slots: (
        await tx.query(
          "SELECT * FROM service_slots WHERE branch_id=$1 AND ends_at>now() ORDER BY starts_at LIMIT 100",
          [branch],
        )
      ).rows,
    };
  }
  if (action === "services.propose") {
    const d = z
      .object({
        serviceId: scope,
        branchId: scope,
        version: z.number().int().positive(),
        config: serviceConfig,
        reason,
      })
      .strict()
      .parse(input);
    return propose(tx, user, {
      key: "service." + d.serviceId,
      scope: d.branchId,
      version: d.version,
      value: d.config,
      reason: d.reason,
    });
  }
  if (action === "services.checklist.propose") {
    const d = z
      .object({
        serviceId: scope,
        branchId: scope,
        version: z.number().int().positive(),
        checks: checklistConfig,
        reason,
      })
      .strict()
      .parse(input);
    return propose(tx, user, {
      key: "checklist." + d.serviceId,
      scope: d.branchId,
      version: d.version,
      value: d.checks,
      reason: d.reason,
    });
  }
  if (action === "technician.qualify") {
    const d = z
      .object({
        userId: uuid,
        code: z.string().regex(/^[a-z][a-z0-9_]{2,60}$/),
        evidence: reason,
        expiresAt: z.iso.datetime(),
      })
      .strict()
      .parse(input);
    const target = await one(
      tx,
      "SELECT role,branch_id FROM users WHERE id=$1 AND active=true",
      [d.userId],
    );
    if (
      !target ||
      !(
        [
          "technician",
          "safety_officer",
          "inventory",
          "manager",
          "owner",
        ].includes(target.role) ||
        (target.role === "driver" && d.code === "bulk_lpg_dispensing")
      )
    )
      throw new AppError(
        400,
        "Choose an active inspection employee, or a driver for bulk LPG dispensing verification.",
      );
    allow(user, ["owner", "safety_officer"], target.branch_id);
    recentVerification(user);
    if (user.id === d.userId)
      throw new AppError(
        403,
        "Qualifications require independent verification.",
      );
    if (
      Date.parse(d.expiresAt) <= Date.now() ||
      Date.parse(d.expiresAt) > Date.now() + 10 * 366 * 86400000
    )
      throw new AppError(
        400,
        "Enter a documented future qualification expiry within ten years.",
      );
    const previous = await one(
      tx,
      "SELECT * FROM technician_qualifications WHERE user_id=$1 AND code=$2",
      [d.userId, d.code],
    );
    if (previous && Date.parse(previous.expires_at) > Date.now())
      throw new AppError(
        409,
        "Revoke the current verification before issuing a replacement.",
      );
    await tx.query(
      "INSERT INTO technician_qualifications(id,user_id,code,evidence,expires_at,verified_by) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id,code) DO UPDATE SET evidence=$4,expires_at=$5,verified_by=$6,created_at=now()",
      [id(), d.userId, d.code, d.evidence, d.expiresAt, user.id],
    );
    await audit(
      tx,
      user,
      "technician.qualification_verified",
      d.userId,
      "success",
      { code: d.code, evidence: d.evidence, previous: previous ?? null },
    );
    return { ok: true };
  }
  if (action === "services.slot.create") {
    const d = z
      .object({
        serviceId: scope,
        branchId: scope,
        technicianId: uuid,
        startsAt: z.iso.datetime(),
        endsAt: z.iso.datetime(),
      })
      .strict()
      .parse(input);
    allow(user, managers, d.branchId);
    const service = await one(
      tx,
      "SELECT config FROM service_catalogue WHERE id=$1 AND branch_id=$2",
      [d.serviceId, d.branchId],
    );
    if (!service) throw new AppError(404, "Service not found.");
    await eligible(
      tx,
      d.technicianId,
      d.branchId,
      service.config.qualification,
    );
    const start = Date.parse(d.startsAt),
      end = Date.parse(d.endsAt);
    if (
      start <= Date.now() ||
      start > Date.now() + 60 * 86400000 ||
      end - start !== service.config.durationMinutes * 60000
    )
      throw new AppError(
        400,
        "Choose a future appointment within sixty days matching the configured duration.",
      );
    if (
      !(await one(
        tx,
        "SELECT id FROM technician_qualifications WHERE user_id=$1 AND code=$2 AND expires_at>$3",
        [d.technicianId, service.config.qualification, d.endsAt],
      ))
    )
      throw new AppError(
        409,
        "Qualification expires before the appointment finishes.",
      );
    const sid = id();
    await tx.query(
      "INSERT INTO service_slots(id,service_id,branch_id,technician_id,starts_at,ends_at,capacity) VALUES ($1,$2,$3,$4,$5,$6,1)",
      [sid, d.serviceId, d.branchId, d.technicianId, d.startsAt, d.endsAt],
    );
    await audit(tx, user, "service.availability_created", sid);
    return { id: sid };
  }
  if (action === "services.slot.block") {
    const d = z
      .object({ id: uuid, blocked: z.boolean(), reason })
      .strict()
      .parse(input);
    const s = await one(
      tx,
      "SELECT * FROM service_slots WHERE id=$1 FOR UPDATE",
      [d.id],
    );
    if (!s) throw new AppError(404, "Appointment not found.");
    allow(user, managers, s.branch_id);
    if (
      d.blocked &&
      (await one(
        tx,
        "SELECT id FROM service_bookings WHERE slot_id=$1 AND status NOT IN ('completed','cancelled','failed')",
        [s.id],
      ))
    )
      throw new AppError(
        409,
        "Reschedule the active booking with the customer first.",
      );
    await tx.query("UPDATE service_slots SET blocked=$1 WHERE id=$2", [
      d.blocked,
      s.id,
    ]);
    await audit(tx, user, "service.availability_changed", s.id, "success", {
      reason: d.reason,
    });
    return { ok: true };
  }
  if (action === "incidents") {
    allow(user, [
      "owner",
      "administrator",
      "service_manager",
      "safety_officer",
      "finance",
    ]);
    return (
      await tx.query(
        `SELECT * FROM operational_incidents WHERE ${user.role === "owner" ? "true" : "branch_id=$1"} ORDER BY created_at DESC LIMIT 100`,
        user.role === "owner" ? [] : [user.branch_id],
      )
    ).rows;
  }
  if (action === "incident.update") {
    const d = z
      .object({
        id: uuid,
        status: z.enum(["acknowledged", "resolved"]),
        note: reason,
      })
      .strict()
      .parse(input);
    const incident = await one(
      tx,
      "SELECT * FROM operational_incidents WHERE id=$1 FOR UPDATE",
      [d.id],
    );
    if (!incident) throw new AppError(404, "Incident not found.");
    allow(
      user,
      ["owner", "safety_officer", "service_manager", "administrator"],
      incident.branch_id,
    );
    if (
      d.status === "resolved" &&
      incident.category === "service_safety" &&
      !["owner", "safety_officer"].includes(user.role)
    )
      throw new AppError(
        403,
        "Safety incidents require authorised safety review.",
      );
    if (incident.category === "service_dispute") {
      allow(user, ["owner", "service_manager"], incident.branch_id);
      recentVerification(user);
      const report = await one(
        tx,
        "SELECT technician_id FROM service_reports WHERE booking_id=$1",
        [incident.target],
      );
      if (report?.technician_id === user.id)
        throw new AppError(
          403,
          "The service author cannot resolve their own dispute.",
        );
    }
    await tx.query("UPDATE operational_incidents SET status=$1 WHERE id=$2", [
      d.status,
      incident.id,
    ]);
    await tx.query(
      "INSERT INTO incident_events(id,incident_id,actor_id,status,note) VALUES ($1,$2,$3,$4,$5)",
      [id(), incident.id, user.id, d.status, d.note],
    );
    await audit(tx, user, "incident." + d.status, incident.id);
    return { ok: true };
  }
  if (action === "technician.revoke") {
    const d = z.object({ id: uuid, reason }).strict().parse(input);
    const q = await one(
      tx,
      "SELECT q.*,u.branch_id FROM technician_qualifications q JOIN users u ON u.id=q.user_id WHERE q.id=$1 FOR UPDATE OF q",
      [d.id],
    );
    if (!q) throw new AppError(404, "Qualification not found.");
    allow(user, ["owner", "safety_officer"], q.branch_id);
    recentVerification(user);
    if (q.user_id === user.id)
      throw new AppError(
        403,
        "Qualification changes require independent review.",
      );
    await tx.query(
      "UPDATE technician_qualifications SET expires_at=now() WHERE id=$1",
      [q.id],
    );
    await audit(tx, user, "technician.qualification_revoked", q.id, "success", {
      reason: d.reason,
      previousExpiry: q.expires_at,
    });
    return { ok: true };
  }
  if (action === "booking.create") {
    allow(user, ["customer", "commercial"]);
    const d = bookingInput.parse(input);
    const hash = digest(JSON.stringify({ ...d, idempotencyKey: undefined }));
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
    const old = await one(
      tx,
      "SELECT * FROM service_bookings WHERE customer_id=$1 AND idempotency_key=$2",
      [user.id, d.idempotencyKey],
    );
    if (old) {
      if (old.request_hash !== hash)
        throw new AppError(
          409,
          "Booking reference reused for different details.",
        );
      return { id: old.id, reference: old.reference, replayed: true };
    }
    if (
      !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
        d.branchId,
      ]))
    )
      throw new AppError(409, "This branch is not accepting bookings.");
    const s = await one(
      tx,
      "SELECT * FROM service_catalogue WHERE id=$1 AND branch_id=$2 FOR UPDATE",
      [d.serviceId, d.branchId],
    );
    if (
      !s ||
      !s.config.active ||
      s.version !== d.serviceVersion ||
      !s.checklist_version
    )
      throw new AppError(
        409,
        "Service details changed or booking is unavailable. Review the service again.",
      );
    if (
      !s.config.zones
        .map((x: string) => x.toLowerCase())
        .includes(d.address.zone.toLowerCase())
    )
      throw new AppError(400, "This address is outside the service area.");
    if (
      d.recommendationId &&
      !(await one(
        tx,
        "SELECT r.id FROM recommendation_rules r JOIN users u ON u.id=r.reviewed_by WHERE r.id=$1 AND r.service_id=$2 AND r.branch_id=$3 AND r.active=true AND u.active=true AND r.relation IN ('assessment','unknown')",
        [d.recommendationId, d.serviceId, d.branchId],
      ))
    )
      throw new AppError(
        409,
        "The selected recommendation is no longer available.",
      );
    const slot = await validateSlot(tx, d.slotId, d.serviceId, d.branchId),
      bid = id(),
      ref = "EGS-" + bid.slice(0, 8).toUpperCase();
    await tx.query(
      "INSERT INTO service_bookings(id,reference,service_id,branch_id,customer_id,slot_id,technician_id,snapshot,checklist,checklist_version,address,equipment,notes,status,idempotency_key,request_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending_confirmation',$14,$15)",
      [
        bid,
        ref,
        d.serviceId,
        d.branchId,
        user.id,
        slot.id,
        slot.technician_id,
        JSON.stringify(s.config),
        JSON.stringify(s.checklist),
        s.checklist_version,
        JSON.stringify(d.address),
        JSON.stringify(d.equipment),
        d.notes,
        d.idempotencyKey,
        hash,
      ],
    );
    if (d.recommendationId)
      await tx.query(
        "INSERT INTO recommendation_events(id,rule_id,customer_id,kind,booking_id) VALUES ($1,$2,$3,'booked',$4) ON CONFLICT DO NOTHING",
        [id(), d.recommendationId, user.id, bid],
      );
    if (d.followupId) {
      const f = await one(
        tx,
        "SELECT f.id FROM service_followups f JOIN service_bookings b ON b.id=f.booking_id WHERE f.id=$1 AND f.customer_id=$2 AND f.dismissed_at IS NULL AND f.rebooked_id IS NULL AND b.service_id=$3 AND b.branch_id=$4 FOR UPDATE OF f",
        [d.followupId, user.id, d.serviceId, d.branchId],
      );
      if (!f)
        throw new AppError(
          409,
          "This follow-up is no longer eligible for rebooking.",
        );
      await tx.query(
        "UPDATE service_followups SET rebooked_id=$1 WHERE id=$2",
        [bid, f.id],
      );
    }
    const b = {
      id: bid,
      reference: ref,
      customer_id: user.id,
      technician_id: slot.technician_id,
    };
    await event(
      tx,
      user,
      b,
      "pending_confirmation",
      "Appointment requested. Payment and safety clearance have not been confirmed.",
    );
    return { id: bid, reference: ref };
  }
  if (action === "bookings") {
    const selector = z.object({ id: uuid.optional() }).strict().parse(input);
    const customer = ["customer", "commercial"].includes(user.role);
    if (!customer)
      allow(user, [
        ...managers,
        "technician",
        "finance",
        "inventory",
        "safety_officer",
      ]);
    const filter = customer
      ? "customer_id=$1"
      : user.role === "owner"
        ? "true"
        : user.role === "technician"
          ? "technician_id=$1"
          : "branch_id=$1";
    const rows = (
      await tx.query(
        `SELECT id FROM service_bookings WHERE ${user.role === "owner" ? "($1::text IS NULL OR id=$1)" : "(" + filter + ") AND ($2::text IS NULL OR id=$2)"} ORDER BY created_at DESC LIMIT 100`,
        user.role === "owner"
          ? [selector.id ?? null]
          : [
              customer || user.role === "technician" ? user.id : user.branch_id,
              selector.id ?? null,
            ],
      )
    ).rows;
    const result = [];
    for (const r of rows) {
      const b = await booking(tx, user, r.id);
      b.events = (
        await tx.query(
          "SELECT status,note,created_at FROM service_booking_events WHERE booking_id=$1 ORDER BY created_at",
          [b.id],
        )
      ).rows;
      b.quotes = (
        await tx.query(
          "SELECT q.*,d.approved FROM service_quotes q LEFT JOIN service_quote_decisions d ON d.quote_id=q.id WHERE q.booking_id=$1 ORDER BY revision DESC",
          [b.id],
        )
      ).rows;
      b.materials = (
        await tx.query(
          "SELECT m.*,p.name FROM service_materials m JOIN products p ON p.id=m.product_id WHERE booking_id=$1",
          [b.id],
        )
      ).rows;
      b.report = await one(
        tx,
        "SELECT * FROM service_reports WHERE booking_id=$1",
        [b.id],
      );
      b.images = (
        await tx.query(
          "SELECT id,alt FROM media_assets WHERE booking_id=$1 AND archived=false AND (service_retain_until IS NULL OR service_retain_until>now()) ORDER BY created_at",
          [b.id],
        )
      ).rows;
      b.technician = b.technician_id
        ? await one(tx, "SELECT name FROM users WHERE id=$1", [b.technician_id])
        : null;
      b.billing = await balance(tx, b);
      b.settlements = (
        await tx.query(
          "SELECT s.*,c.accepted,c.notes AS customer_notes,COALESCE((SELECT value='true'::jsonb FROM settings WHERE key='service_settlement.'||s.id AND scope=$2),false) AS business_approved FROM service_exception_settlements s LEFT JOIN service_settlement_consents c ON c.settlement_id=s.id WHERE s.booking_id=$1 ORDER BY s.revision DESC",
          [b.id, b.branch_id],
        )
      ).rows;
      b.dispute = await one(
        tx,
        "SELECT id,status,created_at FROM operational_incidents WHERE category='service_dispute' AND target=$1",
        [b.id],
      );
      b.cashCollections = (
        await tx.query(
          "SELECT id,amount_kobo,reference,collector_id,verified_at FROM service_cash_collections WHERE booking_id=$1",
          [b.id],
        )
      ).rows;
      if (user.role === "technician" || customer) {
        if (user.role === "technician") delete b.cashCollections;
        if (b.report)
          b.report = { ...b.report, body: serviceDocument(b.report.body) };
        b.materials = b.materials.map(({ unit_cost_kobo, ...m }: Row) => m);
      }
      if (customer) {
        delete b.request_hash;
        delete b.idempotency_key;
        delete b.technician_id;
        b.quotes = b.quotes.map(({ created_by, ...q }: Row) => q);
        b.materials = b.materials.map(({ unit_cost_kobo, ...m }: Row) => m);
        b.cashCollections = b.cashCollections.map(
          ({ collector_id, ...c }: Row) => c,
        );
        if (b.report) {
          b.report = {
            ...b.report,
            body: {
              ...b.report.body,
              materials: (b.report.body.materials ?? []).map(
                ({ unit_cost_kobo, ...m }: Row) => m,
              ),
            },
          };
          delete b.report.technician_id;
          delete b.report.body.technicianId;
        }
      }
      result.push(b);
    }
    return result;
  }
  // All remaining operations lock and authorize the specific booking first.
  const data = input as Record<string, unknown>;
  if (!action.startsWith("booking.") && !action.startsWith("service.material."))
    return undefined;
  if (typeof data?.bookingId !== "string")
    throw new AppError(400, "Choose a booking.");
  const b = await booking(tx, user, uuid.parse(data.bookingId), true);
  if (
    [
      "service.material.recovery.request",
      "service.material.recovery.execute",
    ].includes(action)
  )
    return serviceMaterialRecoveryAction(tx, user, b, action, input);
  if (
    ["booking.settlement.propose", "booking.settlement.consent"].includes(
      action,
    )
  )
    return serviceSettlements(tx, user, b, action, input);
  if (action === "booking.dispute") {
    const d = z.object({ bookingId: uuid, reason }).strict().parse(input);
    if (b.customer_id !== user.id)
      throw new AppError(403, "Only the customer may raise a service dispute.");
    if (
      !(await one(tx, "SELECT id FROM service_reports WHERE booking_id=$1", [
        b.id,
      ]))
    )
      throw new AppError(
        409,
        "A documented service report is required. Contact support for appointment concerns.",
      );
    return openServiceDispute(tx, user, b, d.reason);
  }
  if (action === "booking.assignment.respond") {
    const d = z
      .object({
        bookingId: uuid,
        version: z.number().int(),
        decision: z.enum(["acknowledged", "declined"]),
        reason,
      })
      .strict()
      .parse(input);
    await technician(tx, user, b);
    if (b.assignment_response !== "pending") {
      if (
        b.assignment_response === d.decision &&
        b.assignment_response_reason === d.reason
      )
        return { ok: true, replayed: true };
      throw new AppError(
        409,
        "The assignment response is already recorded; contact operations.",
      );
    }
    if (b.status !== "assigned" || b.version !== d.version)
      throw new AppError(
        409,
        "Refresh the current assignment before responding.",
      );
    await tx.query(
      "UPDATE service_bookings SET assignment_response=$1,assignment_response_reason=$2 WHERE id=$3",
      [d.decision, d.reason, b.id],
    );
    await event(
      tx,
      user,
      b,
      b.status,
      "Technician " + d.decision + " assignment: " + d.reason,
    );
    if (d.decision === "declined")
      for (const manager of (
        await tx.query(
          "SELECT id FROM users WHERE active=true AND (role='owner' OR (role='service_manager' AND branch_id=$1))",
          [b.branch_id],
        )
      ).rows)
        await notify(
          tx,
          manager.id,
          "Service assignment declined",
          b.reference + ": operations review and reassignment required.",
          b.id,
        );
    return { ok: true };
  }
  if (action === "booking.assessment.save") {
    const d = z
      .object({ bookingId: uuid, version: z.number().int(), reason })
      .strict()
      .parse(input);
    await technician(tx, user, b);
    if (
      d.version !== b.version ||
      !["in_progress", "awaiting_customer_approval"].includes(b.status)
    )
      throw new AppError(409, "Refresh the on-site assessment first.");
    await event(
      tx,
      user,
      b,
      b.status,
      "Assessment findings (not authorisation to work): " + d.reason,
    );
    return { ok: true };
  }
  if (action === "booking.work.start") {
    const d = z
      .object({ bookingId: uuid, version: z.number().int(), reason })
      .strict()
      .parse(input);
    await technician(tx, user, b);
    if (
      d.version !== b.version ||
      !["in_progress", "awaiting_customer_approval"].includes(b.status)
    )
      throw new AppError(
        409,
        "Refresh the current on-site assessment before starting work.",
      );
    const authority = await serviceWorkAuthority(tx, b, false);
    if (
      b.work_started_at &&
      b.work_phase === "authorised" &&
      b.work_quote_id === authority.quoteId
    )
      return { ok: true, replayed: true };
    const terms = authority.quoteId
      ? await one(
          tx,
          "SELECT labour_kobo,callout_kobo FROM service_quotes WHERE id=$1",
          [authority.quoteId],
        )
      : {
          labour_kobo: Number(b.snapshot.priceKobo),
          callout_kobo: Number(b.snapshot.calloutKobo),
        };
    await tx.query(
      "INSERT INTO service_work_authority_history(id,booking_id,booking_version,quote_id,snapshot,started_by) VALUES($1,$2,$3,$4,$5,$6)",
      [
        id(),
        b.id,
        b.version,
        authority.quoteId,
        JSON.stringify({
          labourKobo: Number(terms!.labour_kobo),
          calloutKobo: Number(terms!.callout_kobo),
          authorisedTotalKobo: authority.billing.totalKobo,
        }),
        user.id,
      ],
    );
    await tx.query(
      "UPDATE service_bookings SET work_phase='authorised',work_quote_id=$1,work_started_at=now() WHERE id=$2",
      [authority.quoteId, b.id],
    );
    await event(
      tx,
      user,
      b,
      "in_progress",
      "Chargeable work authorised after quotation and verified payment checks. " +
        d.reason,
    );
    return { ok: true };
  }
  if (action === "booking.quote.request_review") {
    const d = z
      .object({ bookingId: uuid, quoteId: uuid, reason })
      .strict()
      .parse(input);
    await technician(tx, user, b);
    const q = await latestQuote(tx, b.id);
    if (!q || q.id !== d.quoteId)
      throw new AppError(
        409,
        "Submit the latest quotation revision for review.",
      );
    const key = "service_quote." + q.id;
    await tx.query(
      "INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) VALUES($1,$2,'Professional Services','Independent review of immutable quotation scope and charges.','owner',3,'boolean','[\"technician\"]','[\"owner\"]','[\"owner\",\"service_manager\",\"technician\",\"finance\"]','[]',true) ON CONFLICT(key) DO NOTHING",
      [key, b.reference + " quotation " + q.revision],
    );
    await tx.query(
      "INSERT INTO settings(key,scope,value) VALUES($1,$2,'false'::jsonb) ON CONFLICT DO NOTHING",
      [key, b.branch_id],
    );
    // Reauthentication and no-self-approval remain governed by the shared workflow.
    return propose(tx, user, {
      key,
      scope: b.branch_id,
      version: 1,
      value: true,
      reason: d.reason,
    });
  }
  if (action === "booking.transition") {
    const d = z
      .object({
        bookingId: uuid,
        status: z.enum([
          "confirmed",
          "assigned",
          "en_route",
          "in_progress",
          "failed",
        ]),
        reason,
      })
      .strict()
      .parse(input);
    if (
      user.role === "technician" &&
      user.technician_service_only &&
      d.status !== "failed" &&
      b.assignment_response !== "acknowledged"
    )
      throw new AppError(
        409,
        "Acknowledge the current assignment before visit progression.",
      );
    const next: Record<string, string[]> = {
      pending_confirmation: ["confirmed", "failed"],
      confirmed: ["assigned", "failed"],
      assigned: ["en_route", "failed"],
      en_route: ["in_progress", "failed"],
      in_progress: [],
    };
    if (!next[b.status]?.includes(d.status))
      throw new AppError(409, "This booking transition is not allowed.");
    if (["confirmed", "assigned"].includes(d.status))
      allow(user, managers, b.branch_id);
    else await technician(tx, user, b);
    await eligible(tx, b.technician_id, b.branch_id, b.snapshot.qualification);
    if (d.status === "in_progress" && b.snapshot.bundleId) {
      const linked = await one(
        tx,
        "SELECT o.status FROM checkout_fulfilments f JOIN checkout_fulfilments p ON p.checkout_id=f.checkout_id JOIN orders o ON o.id=p.order_id WHERE f.booking_id=$1 FOR UPDATE OF o",
        [b.id],
      );
      if (linked?.status !== "delivered")
        throw new AppError(
          409,
          "Bundle service work requires its linked products to be delivered first. Reschedule or request cancellation if delivery is unavailable.",
        );
    }
    await event(tx, user, b, d.status, d.reason);
    return { ok: true };
  }
  if (action === "booking.reschedule") {
    const d = z
      .object({
        bookingId: uuid,
        slotId: uuid,
        version: z.number().int(),
        reason,
      })
      .strict()
      .parse(input);
    if (b.customer_id !== user.id) allow(user, managers, b.branch_id);
    if (
      b.version !== d.version ||
      !["pending_confirmation", "confirmed", "assigned"].includes(b.status)
    )
      throw new AppError(409, "Refresh the booking before rescheduling.");
    if (
      Date.parse(b.starts_at) - Date.now() <
      b.snapshot.cancellationHours * 3600000
    )
      throw new AppError(
        409,
        "The self-service rescheduling period has ended. Contact support.",
      );
    const slot = await validateSlot(
      tx,
      d.slotId,
      b.service_id,
      b.branch_id,
      b.id,
    );
    await tx.query(
      "UPDATE service_bookings SET slot_id=$1,technician_id=$2,assignment_response='pending',assignment_response_reason=NULL WHERE id=$3",
      [slot.id, slot.technician_id, b.id],
    );
    await event(tx, user, b, "pending_confirmation", d.reason);
    return { ok: true };
  }
  if (
    ["booking.cancel.request_review", "booking.cancel.execute_review"].includes(
      action,
    )
  ) {
    const d = z
      .object({ bookingId: uuid, version: z.number().int().positive(), reason })
      .strict()
      .parse(input);
    allow(user, managers, b.branch_id);
    recentVerification(user);
    if (d.version !== Number(b.version))
      throw new AppError(
        409,
        "Booking changed. Request a fresh cancellation review.",
      );
    if (
      terminal.includes(b.status) ||
      b.work_started_at ||
      b.work_phase === "authorised" ||
      (await one(
        tx,
        "SELECT id FROM service_booking_events WHERE booking_id=$1 AND note LIKE 'Chargeable work authorised%' LIMIT 1",
        [b.id],
      )) ||
      (await one(tx, "SELECT id FROM service_reports WHERE booking_id=$1", [
        b.id,
      ]))
    )
      throw new AppError(
        409,
        "Chargeable or documented work requires service-outcome and financial reconciliation, not a pre-work cancellation.",
      );
    if (
      await one(
        tx,
        "SELECT id FROM service_materials WHERE booking_id=$1 AND state IN ('issued','usage_recorded','reconciled') LIMIT 1",
        [b.id],
      )
    )
      throw new AppError(
        409,
        "Resolve issued material custody before cancellation review.",
      );
    const key = "service_cancellation." + b.id + "." + b.version;
    if (action === "booking.cancel.request_review") {
      await tx.query(
        "INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) VALUES($1,$2,'Professional Services','One-time pre-work cancellation review bound to the exact booking revision; payments and invoices retained.','owner',3,'boolean','[\"owner\",\"service_manager\"]','[\"owner\",\"finance\"]','[\"owner\",\"service_manager\",\"finance\"]','[\"finance\"]',true) ON CONFLICT(key) DO NOTHING",
        [key, b.reference + " cancellation revision " + b.version],
      );
      await tx.query(
        "INSERT INTO settings(key,scope,value) VALUES($1,$2,'false'::jsonb) ON CONFLICT DO NOTHING",
        [key, b.branch_id],
      );
      const setting = await one(
        tx,
        "SELECT version FROM settings WHERE key=$1 AND scope=$2",
        [key, b.branch_id],
      );
      return propose(tx, user, {
        key,
        scope: b.branch_id,
        version: setting!.version,
        value: true,
        reason: d.reason,
      });
    }
    if (
      !(await one(
        tx,
        "SELECT key FROM settings WHERE key=$1 AND scope=$2 AND value='true'::jsonb",
        [key, b.branch_id],
      ))
    )
      throw new AppError(
        409,
        "Independent finance approval of this exact cancellation revision is required.",
      );
    await releaseMaterials(tx, b);
    await event(
      tx,
      user,
      b,
      "cancelled",
      "Independently reviewed pre-work cancellation. " +
        d.reason +
        " Existing invoices, verified payments and refund review remain separate and unchanged.",
    );
    await audit(tx, user, action, b.id, "success", {
      approvalKey: key,
      bookingVersion: b.version,
    });
    return { ok: true, financialReconciliationRequired: true };
  }
  if (action === "booking.cancel") {
    const d = z
      .object({ bookingId: uuid, reason, version: z.number().int().optional() })
      .strict()
      .parse(input);
    if (b.customer_id !== user.id) allow(user, managers, b.branch_id);
    if (b.status === "cancelled") return { ok: true, replayed: true };
    if (d.version !== undefined && d.version !== b.version)
      throw new AppError(409, "Refresh the booking before cancelling.");
    if (
      !["pending_confirmation", "confirmed", "assigned"].includes(b.status) ||
      Date.parse(b.starts_at) - Date.now() <
        b.snapshot.cancellationHours * 3600000
    )
      throw new AppError(409, "Contact support to review this cancellation.");
    await releaseMaterials(tx, b);
    await event(
      tx,
      user,
      b,
      "cancelled",
      d.reason +
        " Verified payments remain recorded; request a separately reviewed refund where applicable.",
    );
    return { ok: true };
  }
  if (action === "booking.quote") {
    const d = z
      .object({
        bookingId: uuid,
        validUntil: z.iso.datetime().optional(),
        labourKobo: money,
        lines: z
          .array(
            z
              .object({
                productId: scope,
                quantity: z.number().int().min(1).max(100),
              })
              .strict(),
          )
          .max(20),
        notes: reason,
      })
      .strict()
      .parse(input);
    if (d.validUntil && Date.parse(d.validUntil) <= Date.now())
      throw new AppError(400, "Quotation validity must be in the future.");
    await technician(tx, user, b);
    if (!["in_progress", "awaiting_customer_approval"].includes(b.status))
      throw new AppError(409, "Assess the job before proposing a quotation.");
    if (
      await one(
        tx,
        "SELECT id FROM service_materials WHERE booking_id=$1 AND state IN ('issued','usage_recorded','reconciled')",
        [b.id],
      )
    )
      throw new AppError(
        409,
        "Materials have been issued; resolve the current approved work before revising it.",
      );
    if (new Set(d.lines.map((x) => x.productId)).size !== d.lines.length)
      throw new AppError(400, "Combine repeated materials.");
    await releaseMaterials(tx, b);
    let total = d.labourKobo + Number(b.snapshot.calloutKobo),
      lines = [];
    for (const line of [...d.lines].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    )) {
      const p = await one(
        tx,
        "SELECT p.name,p.category,i.price_kobo,i.published FROM products p JOIN inventory i ON i.product_id=p.id WHERE p.id=$1 AND i.branch_id=$2",
        [line.productId, b.branch_id],
      );
      if (
        !p?.published ||
        !p.price_kobo ||
        ["Gas refills", "Empty cylinders", "Bundles"].includes(p.category)
      )
        throw new AppError(
          400,
          "Select a published, priced service accessory.",
        );
      total += Number(p.price_kobo) * line.quantity;
      lines.push({
        ...line,
        name: p.name,
        unitPriceKobo: Number(p.price_kobo),
      });
    }
    if (!Number.isSafeInteger(total) || total > 100000000)
      throw new AppError(400, "Quotation total exceeds the supported limit.");
    await tx.query(
      "UPDATE service_bookings SET work_phase='paused',work_quote_id=NULL,work_started_at=NULL WHERE id=$1",
      [b.id],
    );
    const old = await latestQuote(tx, b.id),
      qid = id();
    await tx.query(
      "INSERT INTO service_quotes(id,booking_id,revision,labour_kobo,callout_kobo,total_kobo,lines,notes,created_by,valid_until) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        qid,
        b.id,
        (old?.revision ?? 0) + 1,
        d.labourKobo,
        b.snapshot.calloutKobo,
        total,
        JSON.stringify(lines),
        d.notes,
        user.id,
        d.validUntil ?? null,
      ],
    );
    await event(
      tx,
      user,
      b,
      "awaiting_customer_approval",
      "Review the new quotation before additional work proceeds.",
    );
    return { id: qid, totalKobo: total };
  }
  if (action === "booking.quote.decide") {
    const d = z
      .object({ bookingId: uuid, quoteId: uuid, approved: z.boolean() })
      .strict()
      .parse(input);
    if (user.id !== b.customer_id)
      throw new AppError(403, "Only the customer may decide their quotation.");
    const q = await latestQuote(tx, b.id);
    if (!q || q.id !== d.quoteId)
      throw new AppError(409, "Review the latest quotation revision.");
    const prior = await one(
      tx,
      "SELECT approved FROM service_quote_decisions WHERE quote_id=$1",
      [q.id],
    );
    if (prior) {
      if (prior.approved === d.approved) return { ok: true, replayed: true };
      throw new AppError(
        409,
        "This quotation already has a recorded decision.",
      );
    }
    if (q.valid_until && Date.parse(q.valid_until) <= Date.now())
      throw new AppError(
        409,
        "This quotation has expired. Request a revised quotation.",
      );
    if (b.status !== "awaiting_customer_approval")
      throw new AppError(409, "Quotation is not awaiting approval.");
    if (d.approved)
      for (const line of q.lines) {
        const stock = await one(
          tx,
          "UPDATE inventory SET reserved=reserved+$1 WHERE branch_id=$2 AND product_id=$3 AND quantity-reserved>=$1 RETURNING product_id",
          [line.quantity, b.branch_id, line.productId],
        );
        if (!stock)
          throw new AppError(
            409,
            "A quoted material is unavailable. Ask for a revised quotation.",
          );
        await tx.query(
          "INSERT INTO service_materials(id,booking_id,quote_id,product_id,quantity,unit_price_kobo,state) VALUES ($1,$2,$3,$4,$5,$6,'reserved')",
          [id(), b.id, q.id, line.productId, line.quantity, line.unitPriceKobo],
        );
      }
    await tx.query(
      "INSERT INTO service_quote_decisions(id,quote_id,customer_id,approved) VALUES ($1,$2,$3,$4)",
      [id(), q.id, user.id, d.approved],
    );
    await event(
      tx,
      user,
      b,
      d.approved ? "in_progress" : "awaiting_customer_approval",
      d.approved
        ? "Customer approved the quoted scope and maximum charges."
        : "Customer declined. No additional charge or work is authorised.",
    );
    return { ok: true };
  }
  if (action === "service.material.issue") {
    const d = z
      .object({ bookingId: uuid, materialId: uuid, unitCostKobo: money })
      .strict()
      .parse(input);
    allow(user, ["owner", "inventory", "service_manager"], b.branch_id);
    const m = await one(
      tx,
      "SELECT * FROM service_materials WHERE id=$1 AND booking_id=$2 FOR UPDATE",
      [d.materialId, b.id],
    );
    if (!m) throw new AppError(404, "Material not found.");
    if (m.state === "issued") {
      if (Number(m.unit_cost_kobo) !== d.unitCostKobo)
        throw new AppError(
          409,
          "Material issue already recorded with another cost.",
        );
      return { ok: true };
    }
    await serviceWorkAuthority(tx, b);
    if (m.state !== "reserved" || b.status !== "in_progress")
      throw new AppError(
        409,
        "Only approved reserved materials can be issued.",
      );
    await tx.query(
      "UPDATE inventory SET quantity=quantity-$1,reserved=reserved-$1 WHERE branch_id=$2 AND product_id=$3",
      [m.quantity, b.branch_id, m.product_id],
    );
    await tx.query(
      "UPDATE service_materials SET state='issued',unit_cost_kobo=$1 WHERE id=$2",
      [d.unitCostKobo, m.id],
    );
    await movement(tx, user, b, m, -m.quantity, "service_issued");
    return { ok: true };
  }
  if (action === "service.material.usage") {
    const d = z
      .object({
        bookingId: uuid,
        materialId: uuid,
        used: z.number().int().min(0),
        damaged: z.number().int().min(0),
      })
      .strict()
      .parse(input);
    await technician(tx, user, b);
    await serviceWorkAuthority(tx, b);
    const m = await one(
      tx,
      "SELECT * FROM service_materials WHERE id=$1 AND booking_id=$2 FOR UPDATE",
      [d.materialId, b.id],
    );
    if (
      m &&
      ["usage_recorded", "reconciled"].includes(m.state) &&
      m.used === d.used &&
      m.damaged === d.damaged
    )
      return { ok: true, replayed: true };
    if (!m || m.state !== "issued" || d.used + d.damaged > m.quantity)
      throw new AppError(409, "Usage must match the materials issued.");
    await tx.query(
      "UPDATE service_materials SET state='usage_recorded',used=$1,damaged=$2 WHERE id=$3",
      [d.used, d.damaged, m.id],
    );
    await audit(tx, user, "service.material_usage_recorded", m.id);
    return { ok: true };
  }
  if (action === "service.material.return") {
    const d = z
      .object({
        bookingId: uuid,
        materialId: uuid,
        returned: z.number().int().min(0),
        reason,
      })
      .strict()
      .parse(input);
    allow(user, ["owner", "inventory", "service_manager"], b.branch_id);
    const m = await one(
      tx,
      "SELECT * FROM service_materials WHERE id=$1 AND booking_id=$2 FOR UPDATE",
      [d.materialId, b.id],
    );
    if (!m) throw new AppError(404, "Material not found.");
    if (m.state === "reconciled") {
      if (d.returned !== m.quantity - m.used - m.damaged - m.missing)
        throw new AppError(
          409,
          "Return already reconciled with another quantity.",
        );
      return { ok: true };
    }
    if (
      m.state !== "usage_recorded" ||
      d.returned !== m.quantity - m.used - m.damaged - m.missing
    )
      throw new AppError(
        409,
        "Record actual use and verify the exact unused quantity returned.",
      );
    await tx.query(
      "UPDATE inventory SET quantity=quantity+$1 WHERE branch_id=$2 AND product_id=$3",
      [d.returned, b.branch_id, m.product_id],
    );
    if (d.returned)
      await movement(tx, user, b, m, d.returned, "service_returned");
    await tx.query(
      "UPDATE service_materials SET state='reconciled' WHERE id=$1",
      [m.id],
    );
    await audit(tx, user, "service.material_reconciled", m.id, "success", {
      reason: d.reason,
      returned: d.returned,
    });
    return { ok: true };
  }
  if (action === "booking.report") {
    const d = z
      .object({
        bookingId: uuid,
        outcome: z.enum([
          "success",
          "recommendations",
          "further_assessment",
          "unsafe",
          "unable",
        ]),
        responses: z
          .array(
            z
              .object({
                id: scope,
                passed: z.boolean(),
                notes: z.string().max(1000),
              })
              .strict(),
          )
          .max(40),
        findings: reason,
        workPerformed: reason,
        recommendations: z.string().max(2000),
      })
      .strict()
      .parse(input);
    await technician(tx, user, b);
    const successful = ["success", "recommendations"].includes(d.outcome);
    if (
      successful
        ? b.status !== "in_progress"
        : ![
            "assigned",
            "en_route",
            "in_progress",
            "awaiting_customer_approval",
          ].includes(b.status)
    )
      throw new AppError(
        409,
        "Record an actual current visit outcome; successful work requires an in progress authorised service.",
      );
    if (
      await one(tx, "SELECT id FROM service_reports WHERE booking_id=$1", [
        b.id,
      ])
    )
      throw new AppError(409, "A submitted report cannot be rewritten.");
    if (!Array.isArray(b.checklist) || !b.checklist.length)
      throw new AppError(409, "An approved checklist is required.");
    if (
      new Set(d.responses.map((x) => x.id)).size !== d.responses.length ||
      d.responses.some((x) => !b.checklist.some((c: Row) => c.id === x.id))
    )
      throw new AppError(400, "Use the exact approved checklist.");
    for (const check of b.checklist)
      if (
        check.required &&
        !d.responses.some(
          (x) => x.id === check.id && x.notes.trim().length >= 5,
        )
      )
        throw new AppError(400, "Record every required inspection step.");
    const unsafe = d.responses.some((x) => !x.passed);
    if (unsafe && ["success", "recommendations"].includes(d.outcome))
      throw new AppError(
        409,
        "Failed inspection steps cannot be represented as successful safety clearance.",
      );
    if (["success", "recommendations"].includes(d.outcome))
      await serviceWorkAuthority(tx, b);
    if (
      ["success", "recommendations"].includes(d.outcome) &&
      !(await one(
        tx,
        "SELECT id FROM media_assets WHERE booking_id=$1 AND owner_id=$2 AND service_photo_consent=true AND service_retain_until>now() AND created_at>=$3 AND archived=false AND octet_length(data)>0 LIMIT 1",
        [b.id, user.id, b.work_started_at],
      ))
    )
      throw new AppError(
        409,
        "Upload consented proof from the currently authorised service visit before successful completion.",
      );
    const q = await latestQuote(tx, b.id);
    if (
      successful &&
      ((q && !q.approved) || (!q && b.snapshot.pricingModel !== "fixed"))
    )
      throw new AppError(
        409,
        "Obtain customer approval of the final quotation first.",
      );
    if (!successful) await releaseMaterials(tx, b);
    const materials = (
      await tx.query(
        "SELECT * FROM service_materials WHERE booking_id=$1 AND state<>'released'",
        [b.id],
      )
    ).rows;
    if (materials.some((m) => m.state !== "reconciled"))
      throw new AppError(
        409,
        "Reconcile issued and unused materials before finalising the report.",
      );
    const previousAuthority = !successful
      ? await one(
          tx,
          "SELECT snapshot FROM service_work_authority_history WHERE booking_id=$1 ORDER BY started_at DESC,id DESC LIMIT 1",
          [b.id],
        )
      : null;
    const legacyAuthority =
      !successful &&
      b.work_started_at &&
      b.work_quote_id === q?.id &&
      q?.approved
        ? q
        : null;
    const labour = successful
      ? q
        ? Number(q.labour_kobo)
        : Number(b.snapshot.priceKobo)
      : previousAuthority
        ? Number(previousAuthority.snapshot.labourKobo)
        : Number(legacyAuthority?.labour_kobo ?? 0);
    const callout = successful
      ? q
        ? Number(q.callout_kobo)
        : Number(b.snapshot.calloutKobo)
      : previousAuthority
        ? Number(previousAuthority.snapshot.calloutKobo)
        : Number(legacyAuthority?.callout_kobo ?? b.snapshot.calloutKobo);
    const total =
      labour +
      callout +
      materials.reduce((n, m) => n + Number(m.unit_price_kobo) * m.used, 0);
    const customer = await one(tx, "SELECT name FROM users WHERE id=$1", [
      b.customer_id,
    ]);
    const body = {
      customerName: customer?.name,
      technicianName: user.name,
      reference: b.reference,
      service: b.snapshot.name,
      customerId: b.customer_id,
      address: b.address,
      equipment: b.equipment,
      checklistVersion: b.checklist_version,
      checklist: b.checklist,
      ...d,
      materials: serviceDocument({ materials }).materials,
      invoiceTotalKobo: total,
      currency: "NGN",
      completedAt: new Date().toISOString(),
      technicianId: user.id,
      regulatoryCertification: false,
    };
    const rid = id();
    await tx.query(
      "INSERT INTO service_reports(id,booking_id,technician_id,outcome,body) VALUES ($1,$2,$3,$4,$5)",
      [rid, b.id, user.id, d.outcome, JSON.stringify(body)],
    );
    const failed = ["unsafe", "unable", "further_assessment"].includes(
      d.outcome,
    );
    if (failed)
      await tx.query(
        "INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role) VALUES ($1,$2,$3,'service_safety',$4,$5,'safety_officer') ON CONFLICT(category,target) DO NOTHING",
        [
          id(),
          b.branch_id,
          d.outcome === "unsafe" ? "critical" : "high",
          b.id,
          d.findings,
        ],
      );
    await event(
      tx,
      user,
      b,
      failed ? "failed" : "awaiting_acknowledgement",
      failed
        ? "The service was not certified successful. Findings require supervisor review."
        : "The service report is ready for customer acknowledgement.",
    );
    return { id: rid };
  }
  if (action === "booking.acknowledge") {
    const d = z
      .object({ bookingId: uuid, accepted: z.boolean(), notes: reason })
      .strict()
      .parse(input);
    if (user.id !== b.customer_id)
      throw new AppError(403, "Only the customer may acknowledge the service.");
    if (
      d.accepted &&
      (await one(
        tx,
        "SELECT id FROM operational_incidents WHERE category='service_dispute' AND target=$1 AND status<>'resolved'",
        [b.id],
      ))
    )
      throw new AppError(
        409,
        "Resolve the open service dispute with operations before acknowledging completion.",
      );
    const r = await one(
      tx,
      "SELECT * FROM service_reports WHERE booking_id=$1",
      [b.id],
    );
    if (
      !r ||
      !["success", "recommendations"].includes(r.outcome) ||
      !["awaiting_acknowledgement", "completed"].includes(b.status)
    )
      throw new AppError(
        409,
        "Only a successful documented service can be acknowledged.",
      );
    const old = await one(
      tx,
      "SELECT accepted FROM service_acknowledgements WHERE report_id=$1",
      [r.id],
    );
    if (old) {
      if (old.accepted === d.accepted) return { ok: true };
      throw new AppError(409, "An acknowledgement is already recorded.");
    }
    await tx.query(
      "INSERT INTO service_acknowledgements(id,report_id,customer_id,accepted,notes) VALUES ($1,$2,$3,$4,$5)",
      [id(), r.id, user.id, d.accepted, d.notes],
    );
    if (d.accepted)
      await tx.query(
        "INSERT INTO recommendation_events(id,rule_id,customer_id,kind,booking_id) SELECT $1,rule_id,$2,'completed',$3 FROM recommendation_events WHERE booking_id=$3 AND kind='booked' ON CONFLICT DO NOTHING",
        [id(), user.id, b.id],
      );
    await event(tx, user, b, d.accepted ? "completed" : "failed", d.notes);
    if (!d.accepted) await openServiceDispute(tx, user, b, d.notes);
    if (d.accepted) await enqueueServiceReward(tx, b.id);
    return { ok: true };
  }
  if (action === "booking.wallet.pay") {
    const d = z
      .object({
        bookingId: uuid,
        amountKobo: money.refine((n) => n > 0),
        idempotencyKey: uuid,
      })
      .strict()
      .parse(input);
    if (user.id !== b.customer_id)
      throw new AppError(
        403,
        "Only the customer may authorise their purchase-credit debit.",
      );
    if (
      ["cancelled", "failed"].includes(b.status) &&
      !(await serviceSettlementSource(tx, b))
    )
      throw new AppError(
        409,
        "This booking is not accepting payments without an approved customer-agreed exception settlement.",
      );
    const key = "service-wallet:" + d.idempotencyKey;
    const old = await one(
      tx,
      "SELECT * FROM verified_payments WHERE reference=$1",
      [key],
    );
    if (old) {
      if (old.booking_id !== b.id || Number(old.amount_kobo) !== d.amountKobo)
        throw new AppError(409, "Payment reference already used.");
      return { ok: true, replayed: true };
    }
    if (
      !(await one(
        tx,
        "SELECT key FROM settings WHERE key='wallet.enabled' AND scope=$1 AND value='true'::jsonb",
        [b.branch_id],
      ))
    )
      throw new AppError(409, "Purchase-credit spending is not enabled.");
    const due = await balance(tx, b);
    const pendingCash = Number(
      (await one(
        tx,
        "SELECT COALESCE(sum(amount_kobo),0) AS n FROM service_cash_collections WHERE booking_id=$1 AND verified_at IS NULL",
        [b.id],
      ))!.n,
    );
    if (due.dueKobo === null || d.amountKobo > due.dueKobo - pendingCash)
      throw new AppError(409, "Only approved, unpaid charges can be paid.");
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
    const available = Number(
      (await one(
        tx,
        "SELECT COALESCE(sum(amount_kobo),0) AS n FROM wallet_entries WHERE customer_id=$1",
        [user.id],
      ))!.n,
    );
    if (available < d.amountKobo)
      throw new AppError(409, "Insufficient purchase credit.");
    await tx.query(
      "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES ($1,$2,$3,'service_payment',$4)",
      [id(), user.id, -d.amountKobo, key],
    );
    await tx.query(
      "INSERT INTO verified_payments(id,booking_id,reference,amount_kobo,method,verified_by) VALUES ($1,$2,$3,$4,'wallet',$5)",
      [id(), b.id, key, d.amountKobo, user.id],
    );
    await enqueueServiceReward(tx, b.id);
    await audit(tx, user, "service.payment_verified", b.id);
    await event(
      tx,
      user,
      b,
      b.status,
      "Verified purchase-credit payment recorded.",
    );
    return { ok: true };
  }
  if (action === "booking.cash.record") {
    const d = z
      .object({
        bookingId: uuid,
        amountKobo: money.refine((n) => n > 0),
        reference: reason,
      })
      .strict()
      .parse(input);
    await technician(tx, user, b);
    const due = await balance(tx, b);
    const old = await one(
      tx,
      "SELECT * FROM service_cash_collections WHERE reference=$1",
      [d.reference],
    );
    if (old) {
      if (
        old.booking_id === b.id &&
        Number(old.amount_kobo) === d.amountKobo &&
        old.collector_id === user.id
      )
        return { ok: true };
      throw new AppError(409, "Cash reference already used.");
    }
    const pending = Number(
      (await one(
        tx,
        "SELECT COALESCE(sum(amount_kobo),0) AS n FROM service_cash_collections WHERE booking_id=$1 AND verified_at IS NULL",
        [b.id],
      ))!.n,
    );
    if (
      due.dueKobo === null ||
      d.amountKobo > due.dueKobo - pending ||
      (["cancelled", "failed"].includes(b.status) &&
        !(await serviceSettlementSource(tx, b)))
    )
      throw new AppError(
        409,
        "Cash must not exceed the approved unpaid total.",
      );
    await tx.query(
      "INSERT INTO service_cash_collections(id,booking_id,amount_kobo,reference,collector_id) VALUES ($1,$2,$3,$4,$5)",
      [id(), b.id, d.amountKobo, d.reference, user.id],
    );
    await audit(tx, user, "service.cash_collected", b.id);
    return { ok: true };
  }
  if (action === "booking.cash.verify") {
    const d = z
      .object({ bookingId: uuid, collectionId: uuid })
      .strict()
      .parse(input);
    allow(user, ["owner", "finance"], b.branch_id);
    recentVerification(user);
    const c = await one(
      tx,
      "SELECT * FROM service_cash_collections WHERE id=$1 AND booking_id=$2 FOR UPDATE",
      [d.collectionId, b.id],
    );
    if (!c) throw new AppError(404, "Collection not found.");
    if (c.collector_id === user.id)
      throw new AppError(403, "Independent finance verification is required.");
    if (c.verified_at) return { ok: true };
    const due = await balance(tx, b);
    if (due.dueKobo === null || Number(c.amount_kobo) > due.dueKobo)
      throw new AppError(409, "Collection exceeds unpaid approved charges.");
    await tx.query(
      "INSERT INTO verified_payments(id,booking_id,reference,amount_kobo,method,verified_by) VALUES ($1,$2,$3,$4,'service_cash',$5)",
      [id(), b.id, "service-cash:" + c.id, c.amount_kobo, user.id],
    );
    await tx.query(
      "UPDATE service_cash_collections SET verified_by=$1,verified_at=now() WHERE id=$2",
      [user.id, c.id],
    );
    await enqueueServiceReward(tx, b.id);
    await audit(tx, user, "service.cash_verified", b.id);
    return { ok: true };
  }
  if (action === "booking.refund.request") {
    const d = z
      .object({
        bookingId: uuid,
        acceptWalletCredit: z.literal(true),
        reason,
        refundScope: z.enum(["service", "excess"]).default("service"),
      })
      .strict()
      .parse(input);
    if (user.id !== b.customer_id)
      throw new AppError(403, "Only the customer may request their refund.");
    if (!["cancelled", "failed", "completed"].includes(b.status))
      throw new AppError(409, "Complete cancellation or service review first.");
    const refundable = await serviceRefundAllowance(
      tx,
      {
        id: b.id,
        status: b.status,
      },
      d.refundScope,
    );
    if (refundable <= 0)
      throw new AppError(
        409,
        "No verified payment is available for the selected refund scope; excess refunds require a reconciled completed service.",
      );
    const old = await one(
      tx,
      "SELECT id,service_refund_scope FROM credit_requests WHERE booking_id=$1 AND kind='refund' AND status='pending'",
      [b.id],
    );
    if (old) {
      if (old.service_refund_scope !== d.refundScope)
        throw new AppError(
          409,
          "Resolve the pending refund before changing its scope.",
        );
      return { id: old.id };
    }
    const rid = id();
    await tx.query(
      "INSERT INTO credit_requests(id,branch_id,customer_id,booking_id,amount_kobo,kind,requested_by,reason,service_refund_scope) VALUES ($1,$2,$3,$4,$5,'refund',$3,$6,$7)",
      [rid, b.branch_id, user.id, b.id, refundable, d.reason, d.refundScope],
    );
    await audit(tx, user, "service.refund_requested", rid);
    return { id: rid };
  }
  if (action === "booking.feedback") {
    const d = z
      .object({
        bookingId: uuid,
        rating: z.number().int().min(1).max(5),
        body: reason,
      })
      .strict()
      .parse(input);
    if (user.id !== b.customer_id || b.status !== "completed")
      throw new AppError(
        403,
        "Only a customer with a completed booking may leave a verified review.",
      );
    const previous = await one(
      tx,
      "SELECT rating,body FROM service_feedback WHERE booking_id=$1",
      [b.id],
    );
    if (previous) {
      if (Number(previous.rating) !== d.rating || previous.body !== d.body)
        throw new AppError(
          409,
          "Feedback is already recorded; contact support to request a correction.",
        );
      return { ok: true, replayed: true };
    }
    await tx.query(
      "INSERT INTO service_feedback(id,booking_id,customer_id,rating,body) VALUES ($1,$2,$3,$4,$5)",
      [id(), b.id, user.id, d.rating, d.body],
    );
    return { ok: true };
  }
  return undefined;
}
async function movement(
  tx: SQL,
  user: Actor,
  b: Row,
  m: Row,
  quantity: number,
  kind: string,
) {
  await tx.query(
    "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reason,actor_id,reference) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
    [
      id(),
      b.branch_id,
      m.product_id,
      quantity,
      kind,
      b.reference,
      user.id,
      m.id + ":" + kind,
    ],
  );
}
async function releaseMaterials(tx: SQL, b: Row) {
  const materials = (
    await tx.query(
      "SELECT * FROM service_materials WHERE booking_id=$1 AND state='reserved' ORDER BY product_id FOR UPDATE",
      [b.id],
    )
  ).rows;
  for (const m of materials) {
    await tx.query(
      "UPDATE inventory SET reserved=reserved-$1 WHERE product_id=$2 AND branch_id=$3",
      [m.quantity, m.product_id, b.branch_id],
    );
    await tx.query(
      "UPDATE service_materials SET state='released' WHERE id=$1",
      [m.id],
    );
  }
}

// The canonical operational incident is a hold/review record, never a replacement report or financial posting.
async function openServiceDispute(
  tx: SQL,
  user: Actor,
  b: Row,
  reason: string,
) {
  const existing = await one(
    tx,
    "SELECT id,status FROM operational_incidents WHERE category='service_dispute' AND target=$1 FOR UPDATE",
    [b.id],
  );
  if (existing && existing.status !== "resolved")
    return { ok: true, incidentId: existing.id, alreadyOpen: true };
  const incidentId = existing?.id ?? id();
  if (existing)
    await tx.query(
      "UPDATE operational_incidents SET status='open' WHERE id=$1",
      [incidentId],
    );
  else
    await tx.query(
      "INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role) VALUES($1,$2,'high','service_dispute',$3,$4,'service_manager')",
      [incidentId, b.branch_id, b.id, reason],
    );
  await tx.query(
    "INSERT INTO incident_events(id,incident_id,actor_id,status,note) VALUES($1,$2,$3,'open',$4)",
    [id(), incidentId, user.id, reason],
  );
  await audit(tx, user, "service.dispute_opened", b.id, "success", {
    incidentId,
    reason,
  });
  return { ok: true, incidentId };
}
