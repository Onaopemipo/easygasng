# Existing financial flow map

Public/native/staff order → server catalogue/quantity/coverage/stock/cylinder/capacity validation → canonical orders/order_items/order_gas_lines and existing reservations → manual/COD or closed-loop wallet → verified_payments → fulfilment readiness. Paystack must post into the same verified_payments path without bypassing remaining dispatch checks.

Order → invoice.issue → immutable customer_invoices → independent invoice_notes adjustments → invoiceBalance derives amount due from existing verified payments/refunds. A Paystack quote must snapshot this obligation/version, never replace invoice totals.

Service booking → assessment → latest quotation → customer + independent business approval → existing verified service payment → backend booking.work.start guard → checklist/material/proof/report/customer acknowledgement. Provider settlement must not itself begin work or claim safety clearance.

Purchase credit: finance funding request → different approver → wallet_entries; spending uses negative immutable ledger events. Online funding must credit exactly principal once, not gross including gateway fees. Existing credit refunds are not provider refunds and must not be double-posted.

Phone assistance uses assisted-ordering.ts/phone-activation.ts and existing identity completion/invoice requests. Driver amendment uses doorstep-amendments.ts; driver cannot mark paid or independently issue sales. Notifications use existing outbox and consent; no new account/invoice/wallet systems.
