import {confirmedDeliveryPin} from "../../../packages/business-rules/src/delivery-pin";
import {
  customerDeliveryPinSchema,
  validateCustomerDeliveryPin,
  recordCustomerDeliveryPin,
} from "./customer-delivery-pin";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { allow, AppError, digest, id, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { audit } from "./governance";
import { appOrigin } from "./request-origin";
import { sealMessage, openMessage, enqueueChannel } from "./channel-messaging";
import { queueMessage } from "./accounts";
import { normaliseCustomerPhone } from "../../../packages/business-rules/src/customer-identity";
import { paystackAvailability } from "./payments/runtime";
import { phoneOrderFingerprint } from "./phone-order-payment-state";

export const phoneLinkTarget = z
  .object({
    linkId: z.string().uuid(),
    token: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  })
  .strict();
const urlFor = (l: any, raw: string) => {
  const u = new URL("/phone-order", appOrigin());
  u.hash = l.id + ":" + raw;
  return String(u);
};
export async function createPhonePaymentLink(
  tx: SQL,
  user: Actor,
  orderId: string,
) {
  const owner = await one(tx, "SELECT customer_id FROM orders WHERE id=$1", [
    orderId,
  ]);
  if (owner)
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
      owner.customer_id,
    ]);
  const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
    orderId,
  ]);
  if (!o || o.order_source !== "PHONE_ASSISTED")
    throw new AppError(404, "Phone order not found.");
  allow(user, ["owner", "manager"], o.branch_id);
  if (
    ["delivered", "cancelled", "delivery_failed"].includes(o.status) ||
    o.payment_status === "verified"
  )
    throw new AppError(409, "This order does not need a new payment link.");
  if (o.payment_method === "cash_on_delivery") {
    if (
      await one(
        tx,
        "SELECT id FROM verified_payments WHERE order_id=$1 UNION ALL SELECT id FROM cash_collections WHERE order_id=$1 LIMIT 1",
        [o.id],
      )
    )
      throw new AppError(
        409,
        "A collection or payment already exists. Finance must review it before sending another payment request.",
      );
    await tx.query("UPDATE orders SET payment_method='card' WHERE id=$1", [
      o.id,
    ]);
    o.payment_method = "card";
    await audit(tx, user, "phone_order.prepayment_requested", o.id);
  }
  const recipient = await one(tx, "SELECT email FROM users WHERE id=$1", [
    o.customer_id,
  ]);
  const shareRecipient={phone:o.address.phone,email:recipient?.email?.endsWith(".invalid")?null:recipient?.email};
  const old = await one(
    tx,
    "SELECT * FROM phone_order_payment_links WHERE order_id=$1 AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC LIMIT 1",
    [o.id],
  );
  if (old && old.order_fingerprint === phoneOrderFingerprint(o))
    return {
      id: old.id,
      url: urlFor(old, openMessage(old.sealed_token)),
      expiresAt: old.expires_at,
      recipient: shareRecipient,
    };
  const raw = randomBytes(32).toString("hex"),
    sealed = sealMessage(raw),
    lid = id();
  await tx.query(
    "UPDATE phone_order_payment_links SET revoked_at=now() WHERE order_id=$1 AND revoked_at IS NULL",
    [o.id],
  );
  const l = await one(
    tx,
    `INSERT INTO phone_order_payment_links(id,order_id,customer_id,created_by,token_hash,sealed_token,order_fingerprint,expires_at)
  VALUES($1,$2,$3,$4,$5,$6,$7,now()+interval '24 hours') RETURNING *`,
    [
      lid,
      o.id,
      o.customer_id,
      user.id,
      digest(raw),
      sealed,
      phoneOrderFingerprint(o),
    ],
  );
  await audit(tx, user, "phone_order.payment_link_created", lid, "success", {
    orderId: o.id,
  });
  return {
    id: lid,
    url: urlFor(l, raw),
    expiresAt: l!.expires_at,
    recipient: shareRecipient,
  };
}

export async function phoneLink(
  tx: SQL,
  linkId: string,
  raw: string,
  forPayment = false,
) {
  const l = await one(
    tx,
    `SELECT l.* FROM phone_order_payment_links l
  JOIN users c ON c.id=l.customer_id AND c.active AND c.role IN ('customer','commercial')
  JOIN users s ON s.id=l.created_by AND s.active AND s.role IN ('owner','manager')
  JOIN orders o ON o.id=l.order_id JOIN branches b ON b.id=o.branch_id AND b.active
  WHERE l.id=$1 AND l.token_hash=$2 AND l.revoked_at IS NULL AND l.expires_at>now()
   AND (s.role='owner' OR s.branch_id=o.branch_id)`,
    [linkId, digest(raw)],
  );
  if (!l)
    throw new AppError(
      404,
      "This private payment link is unavailable or expired. Ask the business for a new link.",
    );
  const u = await one(
    tx,
    "SELECT id,name,email,contact_phone,provisional,role,branch_id FROM users WHERE id=$1 FOR UPDATE",
    [l.customer_id],
  );
  const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
    l.order_id,
  ]);
  const current = await one(
    tx,
    "SELECT * FROM phone_order_payment_links WHERE id=$1 AND revoked_at IS NULL AND expires_at>now() FOR UPDATE",
    [l.id],
  );
  if (!current)
    throw new AppError(
      404,
      "This private payment link is unavailable or expired.",
    );
  if (
    !o ||
    ["cancelled", "delivery_failed"].includes(o.status) ||
    l.order_fingerprint !== phoneOrderFingerprint(o)
  )
    throw new AppError(
      409,
      "This order changed. Ask the business to review it and send a new link.",
    );
  if (forPayment && !l.profile_completed_at)
    throw new AppError(
      409,
      "Confirm your basic details and complete delivery address before payment.",
    );
  return { l: current, o, u: u! };
}

export async function viewPhonePayment(tx: SQL, linkId: string, raw: string) {
  const { l, o, u } = await phoneLink(tx, linkId, raw);
  const saved = await one(tx,"SELECT details FROM account_addresses WHERE customer_id=$1 AND archived=false AND street=$2 AND zone=$3 ORDER BY is_default DESC,id LIMIT 1",[u.id,o.address.street,o.address.zone]);
  // A saved pin is a convenience for this scoped customer, not a new order destination.
  // Only explicit profile confirmation records the current order's destination.
  const suggestedPin=confirmedDeliveryPin(o.address.deliveryPin,o.address.street,o.address.zone) ?? confirmedDeliveryPin(saved?.details?.deliveryPin,o.address.street,o.address.zone);
  return {
    linkId: l.id,
    orderId: o.id,
    reference: o.reference,
    orderSource: "PHONE_ASSISTED",
    status: o.status,
    paymentStatus: o.payment_status,
    totalKobo: Number(o.total_kobo),
    deliveryKobo: Number(o.delivery_kobo),
    firstTime: u.provisional,
    sameVisit: !!(await one(
      tx,
      "SELECT order_id FROM order_visit_links WHERE order_id=$1",
      [o.id],
    )),
    profileConfirmed: !!l.profile_completed_at,
    profile: {
      name: o.address.name,
      phone: o.address.phone,
      email: u.email.endsWith(".invalid") ? "" : u.email,
      street: o.address.street,
      zone: o.address.zone,
      ...(suggestedPin ? { deliveryPin: suggestedPin } : {}),
    },
    gas: (
      await tx.query("SELECT grams FROM order_gas_lines WHERE order_id=$1", [
        o.id,
      ])
    ).rows,
    configuration: await paystackAvailability(tx, o.branch_id),
    expiresAt: l.expires_at,
  };
}

export const phoneProfile = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z
      .email()
      .max(200)
      .transform((v) => v.toLowerCase()),
    phone: z.string().max(40),
    street: z.string().trim().min(8).max(250),
    confirmed: z.literal(true),
    deliveryPin: customerDeliveryPinSchema.optional(),
  })
  .strict();
export async function completePhoneProfile(
  tx: SQL,
  linkId: string,
  raw: string,
  input: unknown,
) {
  const d = phoneProfile.parse(input),
    { l, o, u } = await phoneLink(tx, linkId, raw);
  validateCustomerDeliveryPin({
    ...o.address,
    street: d.street,
    deliveryPin: d.deliveryPin,
  });
  const phone = normaliseCustomerPhone(d.phone),
    original = normaliseCustomerPhone(o.address.phone);
  if (!phone || phone !== original)
    throw new AppError(
      409,
      "Use the phone number given when this order was placed. Contact the business to change it.",
    );
  if (
    (u.provisional === false && d.email !== u.email.toLowerCase()) ||
    d.email.endsWith(".invalid")
  )
    throw new AppError(
      409,
      "Use the email already on this customer profile, or ask the business to review the contact details.",
    );
  const hash = digest(JSON.stringify(d));
  if (l.profile_hash === hash) return viewPhonePayment(tx, linkId, raw);
  if (
    o.payment_status === "verified" ||
    (await one(tx, "SELECT id FROM payment_intents WHERE order_id=$1", [o.id]))
  )
    throw new AppError(
      409,
      "Payment has already started. Contact the business before changing these details.",
    );
  if (
    await one(tx, "SELECT order_id FROM order_visit_links WHERE order_id=$1", [
      o.id,
    ])
  ) {
    if (
      d.deliveryPin &&
      (d.deliveryPin.latitude !== o.address.deliveryPin?.latitude || d.deliveryPin.longitude !== o.address.deliveryPin?.longitude || d.deliveryPin.addressKey !== o.address.deliveryPin?.addressKey)
    )
      throw new AppError(
        409,
        "An extra order uses the original visit’s confirmed location. Contact the business to change it.",
      );
    if (d.street !== o.address.street || d.name !== o.address.name)
      throw new AppError(
        409,
        "An extra order must keep the existing customer and address. Contact the business for a different delivery.",
      );
  }
  if (
    (d.street !== o.address.street || d.name !== o.address.name) &&
    (await one(tx, "SELECT id FROM customer_invoices WHERE order_id=$1", [
      o.id,
    ]))
  )
    throw new AppError(
      409,
      "An invoice is already issued. Ask the business to review the address before changing it.",
    );
  if (u.provisional) {
    await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      "phone-profile-email:" + d.email,
    ]);
    if (
      await one(tx, "SELECT id FROM users WHERE lower(email)=$1 AND id<>$2", [
        d.email,
        u.id,
      ])
    )
      throw new AppError(
        409,
        "This email already belongs to another account. Ask the business to select the correct customer; profiles have not been merged.",
      );
    await tx.query(
      "UPDATE users SET name=$1,email=$2,contact_phone=$3,onboarding_version=onboarding_version+1 WHERE id=$4",
      [d.name, d.email, phone, u.id],
    );
    const saved = await one(
      tx,
      "SELECT id FROM account_addresses WHERE customer_id=$1 AND archived=false AND label='Phone order' LIMIT 1",
      [u.id],
    );
    if (saved)
      await tx.query(
        "UPDATE account_addresses SET street=$1,zone=$2,phone=$3,location_id=$4,details=$5 WHERE id=$6",
        [
          d.street,
          o.address.zone,
          phone,
          o.location_id,
          JSON.stringify({ recipient: d.name, deliveryPin: d.deliveryPin }),
          saved.id,
        ],
      );
    else if (
      !(await one(
        tx,
        "SELECT id FROM account_addresses WHERE customer_id=$1 AND archived=false",
        [u.id],
      ))
    )
      await tx.query(
        "INSERT INTO account_addresses(id,customer_id,label,street,zone,phone,location_id,details) VALUES($1,$2,'Phone order',$3,$4,$5,$6,$7)",
        [
          id(),
          u.id,
          d.street,
          o.address.zone,
          phone,
          o.location_id,
          JSON.stringify({ recipient: d.name, deliveryPin: d.deliveryPin }),
        ],
      );
  }
  const streetChanged = d.street !== o.address.street;
  if (streetChanged) {
    await audit(tx, null, "phone_order.address_changed", o.id);
    await tx.query(
      "UPDATE orders SET operational_review='Confirm the customer-updated street address against approved delivery coverage before dispatch.' WHERE id=$1",
      [o.id],
    );
  }
  const address = {
    ...o.address,
    name: d.name,
    street: d.street,
    ...(d.deliveryPin ? { deliveryPin: d.deliveryPin } : {}),
  };
  if (streetChanged && !d.deliveryPin) delete address.deliveryPin;
  validateCustomerDeliveryPin(address);
  await tx.query("UPDATE orders SET address=$1 WHERE id=$2", [
    JSON.stringify(address),
    o.id,
  ]);
  // Hash the authoritative JSONB representation, including any newly added pin keys.
  o.address = (await one(tx, "SELECT address FROM orders WHERE id=$1", [
    o.id,
  ]))!.address;
  await recordCustomerDeliveryPin(tx, o.id, u.id, "private order link");
  if (d.deliveryPin)
    await tx.query(
      "UPDATE account_addresses SET details=details || jsonb_build_object('deliveryPin',$1::jsonb) WHERE customer_id=$2 AND archived=false AND street=$3 AND zone=$4",
      [JSON.stringify(d.deliveryPin), u.id, d.street, o.address.zone],
    );
  await tx.query(
    "UPDATE phone_order_payment_links SET profile_completed_at=now(),profile_hash=$1,order_fingerprint=$2 WHERE id=$3",
    [hash, phoneOrderFingerprint(o), l.id],
  );
  await audit(tx, null, "phone_order.profile_confirmed", o.id, "success", {
    linkId: l.id,
    firstTime: u.provisional,
  });
  return viewPhonePayment(tx, linkId, raw);
}

export async function phonePaymentStaffAction(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  const d = z
    .object({
      orderId: z.string().uuid(),
      channel: z.enum(["email", "whatsapp"]).optional(),
      consent: z.literal(true).optional(),
    })
    .strict()
    .parse(input);
  const owner = await one(tx, "SELECT customer_id FROM orders WHERE id=$1", [
    d.orderId,
  ]);
  if (owner)
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
      owner.customer_id,
    ]);
  const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
    d.orderId,
  ]);
  if (!o || o.order_source !== "PHONE_ASSISTED")
    throw new AppError(404, "Phone order not found.");
  allow(user, ["owner", "manager"], o.branch_id);
  if (action === "order.phone.payment.revoke") {
    await tx.query(
      "UPDATE phone_order_payment_links SET revoked_at=now() WHERE order_id=$1 AND revoked_at IS NULL",
      [o.id],
    );
    await audit(tx, user, action, o.id);
    return { revoked: true };
  }
  const link = await createPhonePaymentLink(tx, user, o.id);
  if (action !== "order.phone.payment.send") return link;
  if (!d.channel || d.consent !== true)
    throw new AppError(
      400,
      "Choose email or WhatsApp and confirm the customer requested this order message.",
    );
  const u = await one(tx, "SELECT email,provisional FROM users WHERE id=$1", [
    o.customer_id,
  ]);
  const body = `Your EasyGas phone order ${o.reference} is awaiting payment. Complete or confirm your basic details and delivery address, then review and pay: ${link.url}\nKeep this link private. The order is confirmed only after payment is verified.`;
  const dedupe = `phone-order-payment:${link.id}:${d.channel}`;
  if (d.channel === "email") {
    if (!z.email().safeParse(u!.email).success || u!.email.endsWith(".invalid"))
      throw new AppError(
        409,
        "Add the customer email while taking the phone order, or use their requested WhatsApp channel.",
      );
    await queueMessage(
      tx,
      o.customer_id,
      u!.email,
      "Complete and pay for your EasyGas phone order",
      body,
      dedupe,
      true,
    );
    await tx.query(
      "UPDATE message_outbox SET expires_at=$1 WHERE dedupe_key=$2",
      [link.expiresAt, dedupe],
    );
  } else {
    // Caller consent is transactional only. Existing customers keep their own channel preferences.
    if (
      u!.provisional &&
      !(await one(tx, "SELECT id FROM message_outbox WHERE dedupe_key=$1", [
        dedupe,
      ]))
    )
      await tx.query(
        "INSERT INTO channel_consents(user_id,channel,purpose,enabled,evidence) VALUES($1,'whatsapp','transactional',true,'Customer explicitly requested this phone-order payment link') ON CONFLICT(user_id,channel,purpose) DO UPDATE SET enabled=true,evidence=excluded.evidence,version=channel_consents.version+1,updated_at=now()",
        [o.customer_id],
      );
    await enqueueChannel(tx, {
      userId: o.customer_id,
      channel: "whatsapp",
      purpose: "transactional",
      body,
      dedupe,
      template: process.env.META_INVOICE_TEMPLATE,
      expiresAt: new Date(link.expiresAt).toISOString(),
    });
  }
  const message = await one(
    tx,
    "SELECT status,delivery_status FROM message_outbox WHERE dedupe_key=$1",
    [dedupe],
  );
  await audit(tx, user, action, o.id, "success", {
    channel: d.channel,
    linkId: link.id,
  });
  const enabled =
    d.channel === "email"
      ? process.env.EASYGAS_EMAIL_ENABLED === "true"
      : process.env.EASYGAS_WHATSAPP_ENABLED === "true";
  return {
    ...link,
    channel: d.channel,
    queueStatus: message!.status,
    deliveryStatus: message!.delivery_status,
    providerEnabled: enabled,
    message: enabled
      ? "Queued for delivery. This is not a sent confirmation."
      : "Link queued, but this messaging provider is disabled. It has not been sent.",
  };
}
