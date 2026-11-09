import { z } from "zod";
import { one, type SQL } from "../db";
import { allow, AppError, type Actor } from "../auth";
import { audit } from "../governance";
/** Receipts read a committed posting; pending intents and browser callbacks cannot issue one. */
export async function paymentReceipt(tx: SQL, user: Actor, intentId: string) {
  z.string().uuid().parse(intentId);
  const p = await one(
    tx,
    `SELECT p.*,i.customer_id,i.branch_id,i.purpose,i.quote,i.invoice_id,i.booking_id,
    u.name,u.public_customer_id FROM payment_postings p JOIN payment_intents i ON i.id=p.intent_id
    JOIN users u ON u.id=i.customer_id WHERE i.id=$1`,
    [intentId],
  );
  if (!p) throw new AppError(404, "Verified receipt not found.");
  if (["customer", "commercial"].includes(user.role)) {
    if (p.customer_id !== user.id)
      throw new AppError(404, "Verified receipt not found.");
  } else allow(user, ["owner", "finance"], p.branch_id);
  await audit(tx, user, "payment.receipt_viewed", p.id);
  return {
    id: p.id,
    intentId,
    environment: "test",
    reference: p.provider_reference,
    purpose: p.purpose,
    principalKobo: Number(p.base_kobo),
    customerFeeKobo: Number(p.customer_fee_kobo),
    grossKobo: Number(p.gross_kobo),
    actualProviderFeeKobo:
      p.actual_fee_kobo === null ? null : Number(p.actual_fee_kobo),
    policyVersion: p.quote.gatewayPolicyVersion,
    createdAt: p.created_at,
    documentKind: "sandbox_receipt",
    verifiedPostingId: p.id,
    ledgerPostingId: p.verified_payment_id ?? p.wallet_entry_id,
    invoice_number: "TEST-" + p.id,
    issued_at: p.created_at,
    status: "verified_test_payment",
    total_kobo: Number(p.gross_kobo),
    paidKobo: Number(p.gross_kobo),
    amountDueKobo: 0,
    snapshot: {
      business: p.quote.documentSnapshot?.business ?? {
        name: "EasyGas Energy Solutions",
        address: "",
        phone: "",
        identityWarning:
          "Historical receipt has no captured business identity; current settings were not substituted.",
      },
      documentTemplateVersion:
        p.quote.documentSnapshot?.documentTemplateVersion ?? 1,
      customer: p.quote.documentSnapshot?.customer ?? {
        name: "Not recorded",
        public_customer_id: p.public_customer_id,
      },
      address: {},
      dueDate: "Paid in sandbox",
      orderReference:
        p.quote.documentSnapshot?.sourceReference || p.provider_reference,
      paymentReference: p.provider_reference,
      products: [
        {
          name:
            p.purpose === "wallet"
              ? "Closed-loop wallet funding principal"
              : "Verified obligation principal",
          quantity: 1,
          unit_price_kobo: Number(p.base_kobo),
        },
        {
          name: "Payment processing charge",
          quantity: 1,
          unit_price_kobo: Number(p.customer_fee_kobo),
        },
      ],
      gas: [],
      subtotalKobo: Number(p.gross_kobo),
      deliveryKobo: 0,
      discountKobo: 0,
      taxNote: `Sandbox only. No live funds. Fee policy version ${p.quote.gatewayPolicyVersion}. Processing charge is separate from principal; wallet funding is not sales revenue.`,
    },
  };
}
