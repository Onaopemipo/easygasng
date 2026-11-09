# Wallet repair delivery

[Requirements traceability](../traceability/wallet-repair-rtm.md)

Fixed missing branch context for new customers without assigning identities or hardcoding a branch. Reads remain usable; ambiguous/inactive context exposes setup/support guidance and writes fail closed. Generic order/invoice payment capability remains unchanged.

Top-up now has a visible Continue action. Transfer continues to bank instructions and an approval request; card continues to exact fee review and consent. Loading is bounded/cancellable with Retry. No unverified transfer credits a balance.

The default wallet contains a compact balance and transactions, with top-up on demand and invoices/receipts in a separate keyboard-accessible tab. Existing financial records and document routes are retained.

Verification: 47/47 targeted regression tests plus 1/1 real PostgreSQL concurrency/rollback test; web typecheck and production build pass. Local real wallet visually checked; component-only synthetic bank/card continuation checked. No real transfer or charge executed. Prior 592-test full-suite evidence belongs to the preceding phase and was not rerun in this wallet phase.

Not deployed. Hosted retest, verified receiving-bank settings, merchant Paystack and physical-device acceptance remain open. Production NO-GO and prior import/retention/native/server decisions remain.

Rollback: revert the scoped resolver/components and wallet-specific configuration changes together, restoring the matching reviewed source pin. No migration or customer data backfill is introduced by this phase.
