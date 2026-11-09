import { customerFundingBranch } from "../customer-funding-branch";
import {
  documentIdentity,
  newDocumentTemplateVersion,
} from "../document-identity";
import { z } from "zod";
import { one, type DB, type SQL } from "../db";
import { actor, allow, AppError, id, digest, type Actor } from "../auth";
import { invoiceBalance } from "../invoice-corrections";
import { audit, notify } from "../governance";
import { gatewayPolicy, type GatewayPolicy } from "./policy";
import { quotePaymentFee } from "../../../../packages/business-rules/src/payment-fees";
import {
  type PaymentProvider,
  PaymentProviderError,
} from "./paystack-provider";
export type PaymentRuntime = {
  provider: PaymentProvider;
  callbackOrigin: string;
};
const target = z
  .object({
    purpose: z.enum(["invoice", "service", "wallet", "order"]),
    invoiceId: z.string().uuid().optional(),
    orderId: z.string().uuid().optional(),
    bookingId: z.string().uuid().optional(),
    amountKobo: z.number().int().positive().max(100000000).optional(),
    requestKey: z.string().uuid(),
  })
  .strict();
async function customer(tx: SQL, token: string | null) {
  const u = await actor(tx, token);
  allow(u, ["customer", "commercial"]);
  return u;
}
export async function paymentPolicy(tx: SQL, branch: string) {
  const row = await one(
    tx,
    "SELECT value,version FROM settings WHERE key='payment.gateway' AND scope=$1",
    [branch],
  );
  if (!row)
    throw new AppError(503, "Payment gateway policy is not configured.");
  return {
    policy: gatewayPolicy.parse(row.value),
    version: Number(row.version),
  };
}
function enabled(p: GatewayPolicy) {
  if (!p.enabled || !p.fee)
    throw new AppError(503, "Sandbox online payments are not enabled.");
}
async function obligation(
  tx: SQL,
  user: Actor,
  d: {
    purpose: string;
    invoiceId?: string;
    orderId?: string;
    bookingId?: string;
    amountKobo?: number;
  },
  lock = false,
) {
  if (d.purpose !== "order" && d.orderId)
    throw new AppError(400, "Unexpected order payment target.");
  if (d.purpose === "order") {
    if (!d.orderId || d.invoiceId || d.bookingId)
      throw new AppError(400, "Choose a single card checkout order.");
    const order = await one(
      tx,
      "SELECT * FROM orders WHERE id=$1" + (lock ? " FOR UPDATE" : ""),
      [d.orderId],
    );
    if (!order || order.customer_id !== user.id)
      throw new AppError(404, "Order not found.");
    if (
      order.payment_method !== "card" ||
      ["cancelled", "failed", "returned", "delivered"].includes(order.status)
    )
      throw new AppError(409, "This order is not payable by card.");
    // Once finance issues an invoice, its corrections and payment workflow govern the balance.
    if (
      await one(tx, "SELECT id FROM customer_invoices WHERE order_id=$1", [
        order.id,
      ])
    )
      throw new AppError(
        409,
        "An invoice has been issued. Pay its reviewed balance from My Orders.",
      );
    const collected = Number(
      (await one(
        tx,
        "SELECT COALESCE(sum(amount_kobo),0) n FROM verified_payments WHERE order_id=$1",
        [order.id],
      ))!.n,
    );
    if (collected || order.payment_status === "verified")
      throw new AppError(
        409,
        "This order already has a payment; finance review is required.",
      );
    const base = Number(order.total_kobo);
    if (!Number.isSafeInteger(base) || base <= 0)
      throw new AppError(409, "Order amount is not payable.");
    if (d.amountKobo !== undefined && d.amountKobo !== base)
      throw new AppError(
        409,
        "Card checkout requires the full current order amount.",
      );
    return {
      branch: order.branch_id,
      base,
      version: `order:${order.id}:${base}`,
      orderId: order.id,
      bookingId: null,
    };
  }
  if (d.purpose === "invoice") {
    if (!d.invoiceId || d.bookingId)
      throw new AppError(400, "Choose an issued invoice.");
    const inv = await one(
      tx,
      // Issued invoices are immutable and the runtime intentionally has no UPDATE grant.
      // Serialize collections/corrections on the source order below instead.
      "SELECT * FROM customer_invoices WHERE id=$1",
      [d.invoiceId],
    );
    if (!inv || inv.customer_id !== user.id)
      throw new AppError(404, "Invoice not found.");
    if (inv.booking_id)
      throw new AppError(
        409,
        "Service invoice checkout is not enabled; use the existing service payment workflow.",
      );
    const order = await one(
      tx,
      "SELECT * FROM orders WHERE id=$1" + (lock ? " FOR UPDATE" : ""),
      [inv.order_id],
    );
    if (!order || ["cancelled", "failed", "returned"].includes(order.status))
      throw new AppError(
        409,
        "This order requires finance review before payment.",
      );
    const b = await invoiceBalance(tx, inv);
    if (b.notes.some((n: any) => n.state === "pending"))
      throw new AppError(
        409,
        "Invoice correction requires an independent decision before payment.",
      );
    if (b.voided || b.amountDueKobo <= 0)
      throw new AppError(409, "This invoice has no payable balance.");
    return {
      branch: inv.branch_id,
      base: b.amountDueKobo,
      version: "invoice:" + b.version,
      orderId: inv.order_id,
      bookingId: null,
    };
  }
  if (d.purpose === "service") {
    if (!d.bookingId || d.invoiceId)
      throw new AppError(400, "Choose a service booking.");
    const b = await one(
      tx,
      "SELECT * FROM service_bookings WHERE id=$1" +
        (lock ? " FOR UPDATE" : ""),
      [d.bookingId],
    );
    if (!b || b.customer_id !== user.id)
      throw new AppError(404, "Service not found.");
    if (["cancelled", "failed", "completed"].includes(b.status))
      throw new AppError(
        409,
        "This service requires finance review before payment.",
      );
    const q = await one(
      tx,
      "SELECT q.*,d.approved FROM service_quotes q LEFT JOIN service_quote_decisions d ON d.quote_id=q.id WHERE q.booking_id=$1 ORDER BY q.revision DESC LIMIT 1",
      [b.id],
    );
    if (
      !q?.approved ||
      (q.valid_until && +new Date(q.valid_until) <= Date.now()) ||
      !(await one(
        tx,
        "SELECT key FROM settings WHERE key=$1 AND scope=$2 AND value='true'::jsonb",
        ["service_quote." + q.id, b.branch_id],
      ))
    )
      throw new AppError(
        409,
        "Latest customer and independent quotation approvals are required.",
      );
    const paid = Number(
      (await one(
        tx,
        "SELECT COALESCE(sum(amount_kobo),0) n FROM verified_payments WHERE booking_id=$1",
        [b.id],
      ))!.n,
    );
    const base = Number(q.total_kobo) - paid;
    if (base <= 0)
      throw new AppError(409, "This service has no payable balance.");
    return {
      branch: b.branch_id,
      base,
      version: "quote:" + q.id,
      orderId: null,
      bookingId: b.id,
    };
  }
  if (d.invoiceId || d.bookingId || !d.amountKobo)
    throw new AppError(400, "Specify the intended wallet funding amount.");
  const branch = await customerFundingBranch(tx, user);
  if (!branch)
    throw new AppError(409, "Set a supported delivery address in account settings before topping up your wallet.");
  return {
    branch,
    base: d.amountKobo,
    version: "wallet",
    orderId: null,
    bookingId: null,
  };
}
function view(i: any, a: any) {
  return {
    id: i.id,
    purpose: i.purpose,
    status:
      i.status === "quoted" &&
      a?.state === "prepared" &&
      +new Date(i.expires_at) <= Date.now()
        ? "expired"
        : i.status,
    expiresAt: i.expires_at,
    quote: i.quote,
    attempt: a
      ? {
          id: a.id,
          state: a.state,
          reference: a.reference,
          checkoutUrl: a.checkout_url,
          environment: a.environment,
        }
      : null,
  };
}
export async function preparePayment(
  db: DB,
  token: string | null,
  input: unknown,
) {
  const d = target.parse(input);
  return db.transaction(async (tx) => {
    const u = await customer(tx, token);
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [u.id]);
    const hash = digest(JSON.stringify({ ...d, requestKey: undefined }));
    const old = await one(
      tx,
      "SELECT * FROM payment_intents WHERE customer_id=$1 AND request_key=$2",
      [u.id, d.requestKey],
    );
    if (old) {
      if (old.request_hash !== hash)
        throw new AppError(409, "Payment request key has different contents.");
      return view(
        old,
        await one(tx, "SELECT * FROM payment_attempts WHERE intent_id=$1", [
          old.id,
        ]),
      );
    }
    const unresolved = await one(
      tx,
      `SELECT i.* FROM payment_intents i JOIN payment_attempts a ON a.intent_id=i.id
      WHERE i.customer_id=$1 AND i.purpose=$2 AND i.invoice_id IS NOT DISTINCT FROM $3::text AND i.booking_id IS NOT DISTINCT FROM $4::text
      AND i.order_id IS NOT DISTINCT FROM $5::text AND a.state IN ('initializing','awaiting_customer','pending','under_review') ORDER BY i.created_at LIMIT 1`,
      [
        u.id,
        d.purpose,
        d.invoiceId ?? null,
        d.bookingId ?? null,
        d.orderId ?? null,
      ],
    );
    if (unresolved)
      return view(
        unresolved,
        await one(tx, "SELECT * FROM payment_attempts WHERE intent_id=$1", [
          unresolved.id,
        ]),
      );
    const o = await obligation(tx, u, d, true),
      { policy: p, version } = await paymentPolicy(tx, o.branch);
    enabled(p);
    if (d.purpose === "order" && !p.channels.includes("card"))
      throw new AppError(409, "Card checkout is not enabled.");
    if (
      !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
        o.branch,
      ]))
    )
      throw new AppError(409, "Branch is inactive.");
    let base = o.base;
    if (d.purpose === "wallet") {
      if (
        !p.walletFunding ||
        !p.channels.includes("card") ||
        base < p.walletMinimumKobo ||
        base > p.walletMaximumKobo
      )
        throw new AppError(409, "Wallet funding is outside approved limits.");
      const balance = Number(
        (await one(
          tx,
          "SELECT COALESCE(sum(amount_kobo),0) n FROM wallet_entries WHERE customer_id=$1",
          [u.id],
        ))!.n,
      );
      if (balance + base > p.walletMaximumKobo)
        throw new AppError(
          409,
          "Wallet funding would exceed the approved balance limit.",
        );
    } else if (d.amountKobo !== undefined) {
      if (!p.partialInvoices || d.amountKobo > base)
        throw new AppError(
          409,
          "Partial payment is not permitted or exceeds the balance.",
        );
      base = d.amountKobo;
    }
    if (!z.email().safeParse(u.email).success || u.email.endsWith(".invalid"))
      throw new AppError(
        409,
        "A real customer email is required for hosted checkout.",
      );
    const quote = {
      ...quotePaymentFee(base, { ...p.fee!, version }),
      gatewayPolicyVersion: version,
      documentSnapshot: {
        sourceReference: d.orderId
          ? (
              await one(tx, "SELECT reference FROM orders WHERE id=$1", [
                d.orderId,
              ])
            )?.reference
          : d.invoiceId
            ? (
                await one(
                  tx,
                  "SELECT invoice_number FROM customer_invoices WHERE id=$1",
                  [d.invoiceId],
                )
              )?.invoice_number
            : d.bookingId
              ? (
                  await one(
                    tx,
                    "SELECT reference FROM service_bookings WHERE id=$1",
                    [d.bookingId],
                  )
                )?.reference
              : "",
        business: await documentIdentity(tx, o.branch),
        customer: {
          name: u.name,
          public_customer_id: (
            await one(tx, "SELECT public_customer_id FROM users WHERE id=$1", [
              u.id,
            ])
          )?.public_customer_id,
        },
        documentTemplateVersion: newDocumentTemplateVersion(),
      },
      channels: ["wallet", "order"].includes(d.purpose) ? ["card"] : p.channels,
      walletMaximumKobo: p.walletMaximumKobo,
    };
    const iid = id(),
      aid = id(),
      reference = "EG." + aid,
      expires = new Date(
        Date.now() + p.quoteLifetimeSeconds * 1000,
      ).toISOString();
    const i = await one(
      tx,
      "INSERT INTO payment_intents(id,customer_id,branch_id,purpose,invoice_id,booking_id,request_key,request_hash,obligation_version,quote,email_snapshot,expires_at,order_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *",
      [
        iid,
        u.id,
        o.branch,
        d.purpose,
        d.invoiceId ?? null,
        d.bookingId ?? null,
        d.requestKey,
        hash,
        o.version,
        JSON.stringify(quote),
        u.email,
        expires,
        d.orderId ?? null,
      ],
    );
    const a = await one(
      tx,
      "INSERT INTO payment_attempts(id,intent_id,environment,reference) VALUES($1,$2,'test',$3) RETURNING *",
      [aid, iid, reference],
    );
    await audit(tx, u, "payment.quote_created", iid, "success", {
      purpose: d.purpose,
      baseKobo: base,
      grossKobo: quote.grossKobo,
      environment: "test",
    });
    return view(i, a);
  });
}
export async function readPayment(
  db: DB,
  token: string | null,
  intentId: string,
) {
  return db.transaction(async (tx) => {
    const u = await customer(tx, token);
    const i = await one(
      tx,
      "SELECT * FROM payment_intents WHERE id=$1 AND customer_id=$2",
      [intentId, u.id],
    );
    if (!i) throw new AppError(404, "Payment not found.");
    return view(
      i,
      await one(tx, "SELECT * FROM payment_attempts WHERE intent_id=$1", [
        i.id,
      ]),
    );
  });
}
export async function initializePayment(
  db: DB,
  token: string | null,
  input: unknown,
  runtime: PaymentRuntime,
) {
  const d = z
    .object({
      intentId: z.string().uuid(),
      acceptedGrossKobo: z.number().int().positive(),
      acceptedPolicyVersion: z.number().int().positive(),
    })
    .strict()
    .parse(input);
  const prepared = await db.transaction(async (tx) => {
    const u = await customer(tx, token);
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [u.id]);
    const i = await one(
      tx,
      "SELECT * FROM payment_intents WHERE id=$1 AND customer_id=$2 FOR UPDATE",
      [d.intentId, u.id],
    );
    if (!i) throw new AppError(404, "Payment not found.");
    const a = await one(
      tx,
      "SELECT * FROM payment_attempts WHERE intent_id=$1 FOR UPDATE",
      [i.id],
    );
    if (!a) throw new AppError(409, "Payment attempt unavailable.");
    const competing = await one(
      tx,
      `SELECT a.id FROM payment_attempts a JOIN payment_intents p ON p.id=a.intent_id
      WHERE p.customer_id=$1 AND p.purpose=$2 AND p.invoice_id IS NOT DISTINCT FROM $3::text AND p.booking_id IS NOT DISTINCT FROM $4::text
      AND p.order_id IS NOT DISTINCT FROM $6::text AND p.id<>$5 AND a.state IN ('initializing','awaiting_customer','pending','under_review') LIMIT 1`,
      [u.id, i.purpose, i.invoice_id, i.booking_id, i.id, i.order_id],
    );
    if (competing)
      throw new AppError(
        409,
        "An unresolved payment already exists for this purpose. Verify it before starting another charge.",
      );
    if (a.checkout_url) return { i, a, existing: true };
    if (a.state !== "prepared") return { i, a, pending: true };
    if (+new Date(i.expires_at) <= Date.now())
      throw new AppError(409, "Payment quote expired. Review a new quote.");
    if (
      d.acceptedGrossKobo !== Number(i.quote.grossKobo) ||
      d.acceptedPolicyVersion !== Number(i.quote.gatewayPolicyVersion)
    )
      throw new AppError(409, "Review and accept the exact fee quote.");
    const { policy: p } = await paymentPolicy(tx, i.branch_id);
    enabled(p);
    if (i.purpose === "order" && !p.channels.includes("card"))
      throw new AppError(409, "Card checkout is not enabled.");
    const o = await obligation(
      tx,
      u,
      {
        purpose: i.purpose,
        orderId: i.order_id,
        invoiceId: i.invoice_id,
        bookingId: i.booking_id,
        amountKobo: Number(i.quote.baseKobo),
      },
      true,
    );
    if (o.version !== i.obligation_version || o.base < Number(i.quote.baseKobo))
      throw new AppError(409, "The obligation changed. Review a new quote.");
    await tx.query(
      "UPDATE payment_attempts SET state='initializing',initialization_started_at=now(),reconcile_after=now()+interval '30 seconds' WHERE id=$1",
      [a.id],
    );
    await tx.query("UPDATE payment_intents SET status='pending' WHERE id=$1", [
      i.id,
    ]);
    return { i, a };
  });
  if (prepared.existing || prepared.pending)
    return {
      id: prepared.i.id,
      state: prepared.a.state,
      checkoutUrl: prepared.a.checkout_url ?? null,
      pending: !!prepared.pending,
    };
  try {
    const r = await runtime.provider.initialize({
      reference: prepared.a.reference,
      email: prepared.i.email_snapshot,
      amountKobo: Number(prepared.i.quote.grossKobo),
      callbackUrl:
        runtime.callbackOrigin + "/payment-return?intent=" + prepared.i.id,
      attemptId: prepared.a.id,
      channels: prepared.i.quote.channels,
    });
    await db.transaction(async (tx) => {
      await tx.query(
        "UPDATE payment_attempts SET state=CASE WHEN state='initializing' THEN 'awaiting_customer' ELSE state END,checkout_url=$1 WHERE id=$2",
        [r.checkoutUrl, prepared.a.id],
      );
    });
    return {
      id: prepared.i.id,
      state: "awaiting_customer",
      checkoutUrl: r.checkoutUrl,
      pending: false,
    };
  } catch {
    await db.query(
      "UPDATE payment_attempts SET reconcile_after=now()+interval '30 seconds' WHERE id=$1",
      [prepared.a.id],
    );
    return {
      id: prepared.i.id,
      state: "pending",
      checkoutUrl: null,
      pending: true,
      message:
        "Checkout initialization is uncertain. Verification will reuse this reference; do not create another charge.",
    };
  }
}
async function exception(tx: SQL, aid: string, category: string) {
  await tx.query(
    "INSERT INTO payment_exceptions(id,attempt_id,category,detail) VALUES($1,$2,$3,$4) ON CONFLICT(attempt_id,category) DO NOTHING",
    [
      id(),
      aid,
      category,
      "Review authenticated provider evidence against the immutable obligation. No automatic balancing entry was created.",
    ],
  );
}
export async function reconcilePayment(
  db: DB,
  reference: string,
  runtime: PaymentRuntime,
) {
  const a = await one(
    db,
    "SELECT a.*,i.customer_id FROM payment_attempts a JOIN payment_intents i ON i.id=a.intent_id WHERE a.reference=$1",
    [reference],
  );
  if (!a) throw new AppError(404, "Unknown payment reference.");
  const posted = await one(
    db,
    "SELECT id FROM payment_postings WHERE attempt_id=$1",
    [a.id],
  );
  if (posted) {
    await db.query(
      "UPDATE payment_provider_events SET state='processed',processed_at=now() WHERE attempt_id=$1 AND state='received'",
      [a.id],
    );
    return { status: "paid", replayed: true };
  }
  let p;
  try {
    p = await runtime.provider.verify(reference);
  } catch (e) {
    await db.transaction(async (tx) => {
      await exception(
        tx,
        a.id,
        e instanceof PaymentProviderError ? e.code : "verification_unavailable",
      );
      await tx.query(
        "UPDATE payment_attempts SET retry_count=retry_count+1,last_checked_at=now(),reconcile_after=now()+interval '5 minutes' WHERE id=$1",
        [a.id],
      );
    });
    return { status: "pending" };
  }
  return db.transaction(async (tx) => {
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
      a.customer_id,
    ]);
    const i = await one(
      tx,
      "SELECT * FROM payment_intents WHERE id=$1 FOR UPDATE",
      [a.intent_id],
    );
    const attempt = await one(
      tx,
      "SELECT * FROM payment_attempts WHERE id=$1 FOR UPDATE",
      [a.id],
    );
    if (
      await one(tx, "SELECT id FROM payment_postings WHERE intent_id=$1", [
        i!.id,
      ])
    )
      return { status: "paid", replayed: true };
    if (p.status !== "success") {
      if (["failed", "abandoned"].includes(p.status)) {
        await tx.query(
          "UPDATE payment_intents SET status='failed' WHERE id=$1",
          [i!.id],
        );
        await tx.query(
          "UPDATE payment_attempts SET state=$1,last_checked_at=now() WHERE id=$2",
          [p.status, a.id],
        );
      } else
        await tx.query(
          "UPDATE payment_attempts SET state='pending',last_checked_at=now(),reconcile_after=now()+interval '5 minutes' WHERE id=$1",
          [a.id],
        );
      return {
        status:
          p.status === "failed" || p.status === "abandoned"
            ? p.status
            : "pending",
      };
    }
    const user = await one(
      tx,
      "SELECT id,name,email,role,branch_id,active FROM users WHERE id=$1 FOR UPDATE",
      [i!.customer_id],
    );
    if (attempt?.state === "under_review") return { status: "under_review" };
    let mismatch =
      !attempt?.initialization_started_at ||
      p.environment !== "test" ||
      p.reference !== a.reference ||
      p.attemptId !== a.id ||
      p.currency !== "NGN" ||
      p.amountKobo !== Number(i!.quote.grossKobo) ||
      p.email.toLowerCase() !== i!.email_snapshot.toLowerCase() ||
      !user?.active;
    let o: any;
    try {
      o = await obligation(
        tx,
        user as Actor,
        {
          purpose: i!.purpose,
          orderId: i!.order_id,
          invoiceId: i!.invoice_id,
          bookingId: i!.booking_id,
          amountKobo: Number(i!.quote.baseKobo),
        },
        true,
      );
    } catch {
      mismatch = true;
    }
    if (
      o &&
      (o.branch !== i!.branch_id ||
        o.version !== i!.obligation_version ||
        o.base < Number(i!.quote.baseKobo))
    )
      mismatch = true;
    if (+new Date(i!.expires_at) < Date.now()) mismatch = true;
    if (i!.purpose === "wallet" && user) {
      const balance = Number(
        (await one(
          tx,
          "SELECT COALESCE(sum(amount_kobo),0) n FROM wallet_entries WHERE customer_id=$1",
          [user.id],
        ))!.n,
      );
      if (
        balance + Number(i!.quote.baseKobo) >
        Number(i!.quote.walletMaximumKobo)
      )
        mismatch = true;
    }
    if (mismatch) {
      await exception(tx, a.id, "payment_obligation_mismatch");
      await tx.query(
        "UPDATE payment_intents SET status='under_review' WHERE id=$1",
        [i!.id],
      );
      await tx.query(
        "UPDATE payment_attempts SET state='under_review',last_checked_at=now() WHERE id=$1",
        [a.id],
      );
      return { status: "under_review" };
    }
    const posting = id(),
      ledger = id();
    if (i!.purpose === "wallet")
      await tx.query(
        "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES($1,$2,$3,'paystack_funding',$4)",
        [ledger, i!.customer_id, i!.quote.baseKobo, "paystack:" + reference],
      );
    else {
      await tx.query(
        "INSERT INTO verified_payments(id,order_id,booking_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$3,$4,$5,'paystack_test',$6)",
        [
          ledger,
          o.orderId,
          o.bookingId,
          "paystack:" + reference,
          i!.quote.baseKobo,
          i!.customer_id,
        ],
      );
      if (o.orderId) {
        const paid = Number(
          (await one(
            tx,
            "SELECT COALESCE(sum(amount_kobo),0) n FROM verified_payments WHERE order_id=$1",
            [o.orderId],
          ))!.n,
        );
        const total = Number(
          (await one(tx, "SELECT total_kobo FROM orders WHERE id=$1", [
            o.orderId,
          ]))!.total_kobo,
        );
        if (paid >= total)
          await tx.query(
            "UPDATE orders SET payment_status='verified' WHERE id=$1",
            [o.orderId],
          );
      }
    }
    await tx.query(
      "INSERT INTO payment_postings(id,intent_id,attempt_id,provider_reference,base_kobo,customer_fee_kobo,gross_kobo,actual_fee_kobo,verified_payment_id,wallet_entry_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        posting,
        i!.id,
        a.id,
        reference,
        i!.quote.baseKobo,
        i!.quote.customerFeeKobo,
        i!.quote.grossKobo,
        p.feeKobo,
        i!.purpose === "wallet" ? null : ledger,
        i!.purpose === "wallet" ? ledger : null,
      ],
    );
    if (p.feeKobo === null) await exception(tx, a.id, "provider_fee_unknown");
    if (p.feeKobo !== null && p.feeKobo !== Number(i!.quote.estimatedFeeKobo))
      await exception(tx, a.id, "provider_fee_variance");
    await tx.query("UPDATE payment_intents SET status='paid' WHERE id=$1", [
      i!.id,
    ]);
    await tx.query(
      "UPDATE payment_attempts SET state='verified_paid',provider_id=$1,actual_fee_kobo=$2,last_checked_at=now() WHERE id=$3",
      [p.providerId, p.feeKobo, a.id],
    );
    await notify(
      tx,
      i!.customer_id,
      "Sandbox payment verified",
      "Test-mode payment was verified. This is not a live-money receipt.",
      i!.id,
    );
    await audit(tx, null, "payment.sandbox_posted", i!.id, "success", {
      environment: "test",
      principalKobo: i!.quote.baseKobo,
      postingId: posting,
    });
    await tx.query(
      "UPDATE payment_provider_events SET state='processed',processed_at=now() WHERE attempt_id=$1 AND state='received'",
      [a.id],
    );
    return { status: "paid", replayed: false };
  });
}
