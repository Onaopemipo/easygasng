# Payment settings category audit

The live owner settings API returned six relevant definitions. Three similarly named categories originated in different implementation phases; they are not three separate wallets. A legacy integration flag was separately listed under Integrations.

| Stored key | Previous location/name | New location/name | Actual purpose / source |
| --- | --- | --- | --- |
| payment.gateway | Wallet & Payments / Payment Gateway & Fees | Payments & Wallet → Online payments / Online payments & fees | Shared Paystack sandbox policy, fees, channels, card wallet top-up limits and partial invoice collections; payments/runtime.ts and payments/orchestrator.ts |
| wallet.enabled | Wallet / Purchase credit spending enabled | Payments & Wallet → Customer wallet / Wallet access | Verified credit spending and bank-transfer request availability; checkout-payments.ts and wallet-funding.ts |
| wallet.maximum | Payments & Wallet / Maximum purchase credit funding | Payments & Wallet → Customer wallet / Cash & bank-transfer wallet limit | Cash/bank funding cap; bank approval also checks resulting balance; commerce.ts and wallet-funding.ts. Distinct from card top-up limits. |
| payment.cod | Payments & Wallet / Payment on delivery | Payments & Wallet → Cash & settlement / Cash on delivery | Checkout eligibility; does not verify received cash; checkout-payments.ts and order-tracking.ts |
| payment.settlement | Payments & Wallet / Settlement account | Payments & Wallet → Cash & settlement / Settlement bank details | Governed bank metadata; does not configure customer bank-transfer instructions or provider secrets |
| payment.integration | Integrations / Payment integration enabled | Payments & Wallet → Advanced controls / Legacy payment integration | Legacy switch cannot enable Paystack. Existing UI handoff to the gateway editor and protective disable remain; governance.ts |

Consolidation is presentation-only, using stable keys and aliases. Stored categories are referenced by existing delegation guards, so renaming database categories could accidentally change security semantics. No database migration, policy update, setting activation, deletion or permission change is needed. Original DTO categories, values, versions and rights are retained; only display labels/descriptions are overlaid when opening the existing editor/history.

The UI groups only records already returned by the role-filtered API. Managers see the controls they could previously view; grouping does not expose owner/finance-only settings. Old names and category aliases remain searchable, including the legacy flag. Advanced controls are collapsed during browsing and automatically exposed when they match a search. Unknown future settings are retained in an Other payment controls section rather than dropped.

The main Finance navigation entry remains Wallet & Payments because it opens operational balances/payments, not Settings. This phase consolidates the nested Admin Settings categories requested by the user.

Production NO-GO, actual-import hold, retain-all and unrelated acceptance gates remain. No mobile binary builds or hosted business writes are part of verification.
