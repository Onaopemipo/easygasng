# Customer wallet top-ups traceability

Overall PARTIAL; production NO-GO unchanged. All4 requirements and2 gates retained. No hosted migration/deployment, native build or live payment performed.

## WALLET-TOPUP-01 — Dashboard button and bank/card top-up method selection with truthful availability

Status: PARTIAL. Canonical bank/card flows implemented with executed bounded automated evidence; actual bank configuration, browser and official merchant acceptance remain open. Live-money runtime is still prohibited.

Routes: /account, /wallet, /admin/credits, /payment-return. Data: Existing authenticated users/branches, settings, credit_requests, append-only wallet_entries, payment_intents/attempts/postings, verified provider API and signed inbox. Bank destination deployment configuration only.

Controls: Authenticated customer identity, branch scope, recent finance verification, independent approver, locked requests/customer, unique normalized receipt and ledger references, verified provider exact principal, no live activation.

Implementation: `apps/web/lib/wallet-funding.ts`, `apps/web/lib/commerce.ts`, `apps/web/components/hosted-payment.tsx`, `apps/web/components/customer-dashboard.tsx`, `apps/web/components/workflows.tsx`, `database/migrations/071_wallet_bank_transfers.sql`, `apps/web/lib/payments/orchestrator.ts`, `apps/web/lib/payments/webhooks.ts`, `apps/web/lib/payments/runtime.ts`, `apps/web/app/api/payments/paystack/[operation]/route.ts`, `apps/web/app/api/[action]/route.ts`, `apps/web/lib/service.ts`, `apps/web/lib/db.ts`, `scripts/export-bootstrap.ts`, `database/bootstrap.sql`

Executed evidence: `docs/wallet-topups/evidence/baseline.txt`, `docs/wallet-topups/evidence/targeted.txt`, `docs/wallet-topups/evidence/ui.txt`, `docs/wallet-topups/evidence/types.txt`, `docs/wallet-topups/evidence/build.txt`

PASS:27 backend/payment/HTTP regression tests plus4 rendering/password checks; web typecheck and production build passed. Not a browser or real merchant payment acceptance. Outstanding: Actual bank destination configuration; browser business/customer acceptance; official merchant sandbox walkthrough; live activation gates remain open.

## WALLET-TOPUP-02 — Customer bank transfer request remains pending until independent business approval, with rejection and scoped history

Status: PARTIAL. Canonical bank/card flows implemented with executed bounded automated evidence; actual bank configuration, browser and official merchant acceptance remain open. Live-money runtime is still prohibited.

Routes: /account, /wallet, /admin/credits, /payment-return. Data: Existing authenticated users/branches, settings, credit_requests, append-only wallet_entries, payment_intents/attempts/postings, verified provider API and signed inbox. Bank destination deployment configuration only.

Controls: Authenticated customer identity, branch scope, recent finance verification, independent approver, locked requests/customer, unique normalized receipt and ledger references, verified provider exact principal, no live activation.

Implementation: `apps/web/lib/wallet-funding.ts`, `apps/web/lib/commerce.ts`, `apps/web/components/hosted-payment.tsx`, `apps/web/components/customer-dashboard.tsx`, `apps/web/components/workflows.tsx`, `database/migrations/071_wallet_bank_transfers.sql`, `apps/web/lib/payments/orchestrator.ts`, `apps/web/lib/payments/webhooks.ts`, `apps/web/lib/payments/runtime.ts`, `apps/web/app/api/payments/paystack/[operation]/route.ts`, `apps/web/app/api/[action]/route.ts`, `apps/web/lib/service.ts`, `apps/web/lib/db.ts`, `scripts/export-bootstrap.ts`, `database/bootstrap.sql`

Executed evidence: `docs/wallet-topups/evidence/baseline.txt`, `docs/wallet-topups/evidence/targeted.txt`, `docs/wallet-topups/evidence/ui.txt`, `docs/wallet-topups/evidence/types.txt`, `docs/wallet-topups/evidence/build.txt`

PASS:27 backend/payment/HTTP regression tests plus4 rendering/password checks; web typecheck and production build passed. Not a browser or real merchant payment acceptance. Outstanding: Actual bank destination configuration; browser business/customer acceptance; official merchant sandbox walkthrough; live activation gates remain open.

## WALLET-TOPUP-03 — Card principal credited automatically once after authenticated backend verification without manual approval

Status: PARTIAL. Canonical bank/card flows implemented with executed bounded automated evidence; actual bank configuration, browser and official merchant acceptance remain open. Live-money runtime is still prohibited.

Routes: /account, /wallet, /admin/credits, /payment-return. Data: Existing authenticated users/branches, settings, credit_requests, append-only wallet_entries, payment_intents/attempts/postings, verified provider API and signed inbox. Bank destination deployment configuration only.

Controls: Authenticated customer identity, branch scope, recent finance verification, independent approver, locked requests/customer, unique normalized receipt and ledger references, verified provider exact principal, no live activation.

Implementation: `apps/web/lib/wallet-funding.ts`, `apps/web/lib/commerce.ts`, `apps/web/components/hosted-payment.tsx`, `apps/web/components/customer-dashboard.tsx`, `apps/web/components/workflows.tsx`, `database/migrations/071_wallet_bank_transfers.sql`, `apps/web/lib/payments/orchestrator.ts`, `apps/web/lib/payments/webhooks.ts`, `apps/web/lib/payments/runtime.ts`, `apps/web/app/api/payments/paystack/[operation]/route.ts`, `apps/web/app/api/[action]/route.ts`, `apps/web/lib/service.ts`, `apps/web/lib/db.ts`, `scripts/export-bootstrap.ts`, `database/bootstrap.sql`

Executed evidence: `docs/wallet-topups/evidence/baseline.txt`, `docs/wallet-topups/evidence/targeted.txt`, `docs/wallet-topups/evidence/ui.txt`, `docs/wallet-topups/evidence/types.txt`, `docs/wallet-topups/evidence/build.txt`

PASS:27 backend/payment/HTTP regression tests plus4 rendering/password checks; web typecheck and production build passed. Not a browser or real merchant payment acceptance. Outstanding: Actual bank destination configuration; browser business/customer acceptance; official merchant sandbox walkthrough; live activation gates remain open.

## WALLET-TOPUP-04 — Preserve wallet ledger, payment fees, limits, branch/security controls and existing production restrictions

Status: PARTIAL. Canonical bank/card flows implemented with executed bounded automated evidence; actual bank configuration, browser and official merchant acceptance remain open. Live-money runtime is still prohibited.

Routes: /account, /wallet, /admin/credits, /payment-return. Data: Existing authenticated users/branches, settings, credit_requests, append-only wallet_entries, payment_intents/attempts/postings, verified provider API and signed inbox. Bank destination deployment configuration only.

Controls: Authenticated customer identity, branch scope, recent finance verification, independent approver, locked requests/customer, unique normalized receipt and ledger references, verified provider exact principal, no live activation.

Implementation: `apps/web/lib/wallet-funding.ts`, `apps/web/lib/commerce.ts`, `apps/web/components/hosted-payment.tsx`, `apps/web/components/customer-dashboard.tsx`, `apps/web/components/workflows.tsx`, `database/migrations/071_wallet_bank_transfers.sql`, `apps/web/lib/payments/orchestrator.ts`, `apps/web/lib/payments/webhooks.ts`, `apps/web/lib/payments/runtime.ts`, `apps/web/app/api/payments/paystack/[operation]/route.ts`, `apps/web/app/api/[action]/route.ts`, `apps/web/lib/service.ts`, `apps/web/lib/db.ts`, `scripts/export-bootstrap.ts`, `database/bootstrap.sql`

Executed evidence: `docs/wallet-topups/evidence/baseline.txt`, `docs/wallet-topups/evidence/targeted.txt`, `docs/wallet-topups/evidence/ui.txt`, `docs/wallet-topups/evidence/types.txt`, `docs/wallet-topups/evidence/build.txt`

PASS:27 backend/payment/HTTP regression tests plus4 rendering/password checks; web typecheck and production build passed. Not a browser or real merchant payment acceptance. Outstanding: Actual bank destination configuration; browser business/customer acceptance; official merchant sandbox walkthrough; live activation gates remain open.

## Gates

WALLET-G1 OPEN: automated tests pass; actual browser customer/finance acceptance remains open.

WALLET-G2 OPEN: business bank destination not supplied, official merchant sandbox walkthrough and separate live activation not accepted.

[Configuration and operating guide](../wallet-topups/README.md).
