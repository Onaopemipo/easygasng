# Architecture and data authority

Status: sandbox foundations, PARTIAL; production NO-GO unchanged.

Existing users, orders/order items/gas lines, customer_invoices/invoice_notes, service_bookings/service_quotes/decisions, verified_payments and wallet_entries remain authoritative. Migration057 is additive; no historical row is backfilled or marked paid. No parallel customer or wallet model is introduced.

Relationships: users→payment_intents→one payment_attempt; intent references an existing invoice OR booking OR exact wallet principal. Attempts→durable provider events and exceptions. A committed immutable payment_posting references exactly one existing verified_payment OR wallet_entry. Unique intent, attempt and provider reference posting keys enforce one ledger effect. Quote and attempt identities cannot be edited/deleted.

State: quoted/prepared→initializing (committed before network call)→awaiting_customer/pending→verified_paid+paid only after authenticated verification and atomic posting. Failed/abandoned do not post. Under-review mismatches remain held. Expired unsubmitted quotes cannot initialize. A provider success after expiry is held for review rather than silently lost or falsely refunded. Unknown initialization never automatically initiates another reference.

API `/api/payments/paystack/[operation]`: GET configuration (nonsecret availability), POST quote (customer-owned issued invoice/approved service/exact wallet principal + UUID requestKey), POST initialize (intentId + acceptedGrossKobo + acceptedPolicyVersion), GET status?intentId, POST verify, POST webhook (raw authenticated bytes), GET receipt?intentId[&format=pdf]. Customer auth applies to every monetary request; receipt also permits branch-authorised finance/owner. Runtime requires explicit synthetic/test flags and server-only test key. Live keys unsupported.

Network calls occur outside transaction closures. Reconciliation then locks intent/attempt, customer and canonical obligation, rechecks identity/branch/amount/version and writes principal, posting, audit and notification in one transaction. Actual fee variance is an exception; it cannot change principal or debit a wallet. Webhook acknowledgement follows durable inbox receipt; worker verifies before effects.

Known gaps: no automatic order invoice/Paystack selection at original checkout yet; customer can pay an already issued invoice. Services currently reference the approved quote/booking, not a new service invoice. Provider refunds/settlements/reversals and committed doorstep obligations are not implemented. One attempt per intent is a deliberate bounded implementation; failed intent may be explicitly requoted, unresolved attempts must remain pending. See all retained requirements/scenarios.
