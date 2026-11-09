# Approved completion execution — 9 November 2026

The user authorised completion of all retained features. Implementation extends the existing platform; it does not authorise fabricated operational acceptance, live-provider credentials, historical import or silent removal of earlier holds. Stable E2E-01–11 and prior matrices/gates remain. All records are retained. Mobile builds and server deployment remain deferred. Production remains NO-GO.

## Implemented continuation

- **064 / E2E-01:** multiple independently inspected cylinders beneath the original doorstep amendment; exact per-cylinder metering, partial cancellation credit for unfilled lines only, remaining vehicle mass recovery and immutable completed lines. Legacy one-cylinder execution remains supported.
- **065 / E2E-01/02:** owning-customer consent and independent finance approval of actual invoice excess into the existing purchase-credit ledger. Sale status, original receipts, rewards and delivery fee are not rewritten.
- **066–067 / E2E-01:** measured physical-product payload, branch-inclusive vehicle reservations, exact serialized-cylinder custody, independent driver receipt, original-order physical doorstep quotation/consent/debit/verified cash/code handover, and actual return/loss/quarantine reconciliation. Losses and inactive-driver supervised returns require exact independent owner and finance approval. Physical proposals are atomic handovers; deliverable subsets must be separately requoted and consented before handover. Mixing gas and physical goods in a single proposal is rejected; sequential proposals share the original visit/invoice/fee.
- **068 / E2E-02:** stopped/failed/declined work reports preserve the unsuccessful outcome. The charge ceiling excludes unapproved labour. A service-manager proposal, independent owner and finance approval, and explicit customer agreement are required for collectible settlement. Issued invoices need the existing separate credit/void/review path; no report rewrite, automatic refund or work authorisation follows settlement.
- **069 / E2E-02:** expired/stopped material custody can be independently reconciled using actual used, safely returned, damaged, actually returned damaged and missing quantities. Existing inventory, holds and shared approvals are reused; no guessed acquisition costs, customer charge or new work authority.
- Finance dashboards use approved order invoice notes and actual net verified receipts so supplementary fulfilment/excess refunds are not omitted or counted twice. Customer report exports strip acquisition costs; unsuccessful reports identify a review ceiling rather than an automatically collectible final invoice.
- Existing web forms and mobile source controls were extended. No native build/export/signing was performed. Admin navigation and the canonical customer/order/booking systems remain intact.

## Verification boundaries

Evidence logs are under `evidence/approved-completion-*`. Targeted tests exercise real dispatch/API handlers, ownership, restricted-driver permissions, shared independent approvals, exact receipts, stale/duplicate operations, immutable histories and PostgreSQL independent-connection capacity/rollback. The full regression result and final build/type results are recorded in the companion matrix after execution. Tests use isolated synthetic fixtures; no real stock or payment data was invented.

Local browser `MANIFEST-UI01`: existing authenticated demo owner opened Inventory and expanded manifests. Authoritative inventory and the new controls loaded with the existing sidebar. There were no active demo trips, so receipt/return or physical handover browser acceptance was **not** inferred. Automated fixture journeys cover those operations separately.

## Outstanding work and dependencies

| Task | Depends on | Remaining acceptance / work |
|---|---|---|
| AC-01 all-role operational journeys | Current implementation, actual approved operating policy and representative isolated scenarios | Complete browser journeys for multiple cylinders, physical handover, discrepancy approval, changed/stopped service and credit/void/refund variants; independent business/safety acceptance. Current bounded tests are not 100% acceptance. |
| AC-02 provider acceptance | Chosen/configured SMS gateway, official WhatsApp Business account/templates, road-routing provider and secure credentials | Actual provider contract and receipt tests, approved rates/privacy/consent and operational activation. Question pending; no external customer messages sent. |
| AC-03 field-device acceptance | User resumes native builds and supplies test phones | Airplane mode, background/lock/process death, storage failure, photos/GPS/trip/fuel recovery and reconnect validation on installed build. Last-known offline location is never represented as live. |
| AC-04 historical data | Customer confirms ambiguous payments, stock balances, historical fees and identity matches | Existing preview only; actual import remains held. |
| AC-05 deployment/release | User resumes server work, VPS/SSH/domain/secrets, reviewed source/CI | Staging/TLS/worker/load/backup restore/rollback and independent release sign-off. No server provisioned or release activated. |

AC-01 can continue locally while AC-02–05 prerequisites are unavailable. No denominator is reduced by these blockers. Full request is PARTIAL; production NO-GO is preserved. Do not describe it as 100% complete based on automated passes.

## Operating and rollback notes

Apply additive migrations 064–069 through the existing migrator after taking a verified backup. Bootstrap/readiness lists include all six; old histories are not rewritten. Feature switches stay fail-closed for production. Stop new operational writes with existing release switches on an incident; retain outstanding load/amendment/settlement/history records. Reconcile custody and actual receipts through governed actions before restarting; never delete evidence or roll database balances back underneath committed payments or physical handover. Provider-funded refunds continue through their dedicated existing controls; this continuation does not enable live payments.

## Executed result

PASS: 434/434 broad regression with actual disposable PostgreSQL enabled; 0 failures/skips. Subsequent final targeted 13/13 passes include actual restricted-driver HTTP, independent PostgreSQL capacity/replay/forced rollback, multi-cylinder credit/financial basis, physical manifest/serial handover, service settlement/recovery and customer document privacy. Focused tests overlap broad tests and are not additional whole-scope coverage. Web production build and web/native source types pass. MANIFEST-UI01 verifies inventory controls/product choices only; no active demo trip or full operational/device/provider acceptance claimed.
